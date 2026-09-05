let activeTab = "discover";

async function loadTimeline() {
    const board = document.getElementById("timeline-board");

    board.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Getting everything ready...
        </div>
    `;

    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUserId = session?.user?.id || null;

    let query = supabaseClient
        .from("posts")
        .select("id, user_id, media_url, media_urls, thumbnail_url, title, caption, media_type, created_at, edited_at, visibility, users!posts_user_id_fkey(username, avatar_url, display_name)")
        .not("visibility", "in", "(archived,private)")
        .order("created_at", { ascending: false });

    if (activeTab === "following") {
        if (!currentUserId) {
            board.innerHTML = `<div class="empty-state"><div class="empty-title">Log in to see who you follow</div></div>`;
            return;
        }

        const { data: following } = await supabaseClient
            .from("follows")
            .select("following_id")
            .eq("follower_id", currentUserId);

        const followingIds = (following || []).map(f => f.following_id);

        if (followingIds.length === 0) {
            board.innerHTML = `<div class="empty-state"><div class="empty-title">You're not following anyone yet</div><div class="empty-subtext">Posts from people you follow will show up here</div></div>`;
            return;
        }

        query = query.in("user_id", followingIds);
    }

    const { data: posts, error } = await query;

    if (error) {
        console.error("Failed to load timeline:", error.message, error);
        board.innerHTML = `<div class="empty-state"><div class="empty-title">Something went wrong</div><div class="empty-subtext">Try refreshing the page</div></div>`;
        return;
    }

    if (posts.length === 0) {
        board.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 4h16v16H4z"/>
                    <path d="M4 15l4-4 4 4 6-6"/>
                </svg>
                <div class="empty-title">Posts? Nope. Nothing to see here.</div>
                <div class="empty-subtext">Be the first to share something!</div>
            </div>
        `;
        return;
    }

    board.innerHTML = "";
    posts.forEach((post, index) => {
        const avatarSrc = post.users.avatar_url || "/assets/pfp.png";
        const uploadedText = formatUploaded(post.created_at);
        const isOwner = currentUserId && currentUserId === post.user_id;
        const editedText = post.edited_at ? " (edited)" : "";

        const postBox = document.createElement("div");
        postBox.className = "t-box";
        postBox.innerHTML = `
            <div class="t-box-head">
                <a href="/profile/?user=${post.users.username}"><img class="t-avatar" src="${avatarSrc}" alt=""></a>
                <div class="t-head-text">
                    <a href="/profile/?user=${post.users.username}" class="t-handle-link">${post.users.display_name || post.users.username}</a>
                    <span class="t-time-row">${uploadedText}${editedText}</span>
                </div>
                ${!isOwner ? `<button type="button" class="edit-link follow-button-slot" data-user-id="${post.user_id}" style="display:none;">Follow</button>` : `
                    <button type="button" class="post-more item-more" data-post-id="${post.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                            <path fill="currentColor" d="M3 9.5a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3"/>
                        </svg>
                    </button>
                    <div class="item-menu-dropdown" data-post-id="${post.id}">
                        <button type="button" class="visibility-btn" data-post-id="${post.id}" data-set="${post.visibility === 'private' ? 'public' : 'private'}">
                            ${post.visibility === 'private' ? 'Make public' : 'Make private'}
                        </button>
                        <button type="button" class="delete-post-btn" data-post-id="${post.id}">Delete post</button>
                    </div>
                `}
            </div>

            ${post.media_type === "story" ? `
                <div class="t-box-body">
                    <h4 class="story-title">${post.title}</h4>
                    <p class="item-caption"><strong class="caption-username">${post.users.username}</strong> ${escapeHtml(post.caption || "")}</p>
                </div>
            ` : `
                ${renderMediaBlock(post)}
                <div class="t-box-body">
                    <p class="item-caption"><strong class="caption-username">${post.users.username}</strong> ${escapeHtml(post.caption || "")}</p>
                </div>
            `}

            <div class="t-meta">
                <button class="t-meta-action like-btn" data-post-id="${post.id}">
                    <svg class="like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>
                    </svg>
                    Like (<span class="like-count">0</span>)
                </button>
                <button class="t-meta-action comment-btn" data-post-id="${post.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.891 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1"/>
                    </svg>
                    Comment (<span class="comment-count">0</span>)
                </button>
                <button class="t-meta-action share-btn" data-post-id="${post.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v13m4-9l-4-4l-4 4m-4 6v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    </svg>
                    Share
                </button>
            </div>
        `;

        board.appendChild(postBox);

        // whole card navigates to the expanded post — except real interactive controls, which stop the click from bubbling
        postBox.addEventListener("click", (e) => {
            if (e.target.closest("a, button, .item-menu-dropdown")) return;
            window.location.href = `/dashboard/post/?id=${post.id}`;
        });

        showFollow(post.user_id, postBox);
        loadLikes(post.id, post.user_id, postBox);
        loadCommentCount(post.id, postBox);
        setupCommentNav(post.id, postBox);
        allowShare(post.id, postBox);
        if (isOwner) postVisibility(postBox);
    });

    loadSuggestion(board, currentUserId);
}

// drops one "who to follow" suggestion box into a column
async function loadSuggestion(board, currentUserId) {
    if (!currentUserId) return;

    const { data: following } = await supabaseClient
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

    const excludeIds = [currentUserId, ...(following || []).map(f => f.following_id)];

    const { data: candidates } = await supabaseClient
        .from("users")
        .select("id, username, display_name, avatar_url")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(1);

    if (!candidates || candidates.length === 0) return;

    const person = candidates[0];
    const box = document.createElement("div");
    box.className = "t-box suggest-box";
    box.innerHTML = `
        <div class="t-box-head">
            <img class="t-avatar" src="${person.avatar_url || '/assets/pfp.png'}" alt="">
            <div class="t-head-text">
                <span class="t-handle-link">${person.display_name || person.username}</span>
                <span class="t-time-row">@${person.username}</span>
            </div>
            <button type="button" class="edit-link follow-button-slot" data-user-id="${person.id}">Follow</button>
        </div>
    `;

    board.insertBefore(box, board.children[Math.min(2, board.children.length)]);
    showFollow(person.id, box);
}

document.querySelectorAll("#timeline-tabs .tabs-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector("#timeline-tabs .tabs-btn.active").classList.remove("active");
        btn.classList.add("active");
        activeTab = btn.dataset.tab;
        loadTimeline();
    });
});

// fetch the likes
async function loadLikes(postId, postOwnerId, cardElement) {
    const likeBtn = cardElement.querySelector(".like-btn");
    const likeCount = cardElement.querySelector(".like-count");

    if (!likeBtn || !postId) return;

    const { count } = await supabaseClient
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
    likeCount.textContent = count ?? 0;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        likeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            alert("You need to be logged in to like posts.");
        });
        return;
    }

    const { data: existingLike } = await supabaseClient
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", session.user.id)
        .maybeSingle();

    let isLiked = !!existingLike;
    if (isLiked) likeBtn.classList.add("liked");

    likeBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // liking shouldn't navigate to the expanded post
        likeBtn.disabled = true;

        if (isLiked) {
            const { error } = await supabaseClient
                .from("post_likes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", session.user.id);

            if (error) {
                alert("Failed to unlike: " + error.message);
                likeBtn.disabled = false;
                return;
            }

            isLiked = false;
            likeBtn.classList.remove("liked");
            likeCount.textContent = Math.max(0, parseInt(likeCount.textContent) - 1);
        } else {
            const { error } = await supabaseClient
                .from("post_likes")
                .insert([{ post_id: postId, user_id: session.user.id }]);

            if (error) {
                alert("Failed to like: " + error.message);
                likeBtn.disabled = false;
                return;
            }

            isLiked = true;
            likeBtn.classList.add("liked");
            likeCount.textContent = parseInt(likeCount.textContent) + 1;

            if (postOwnerId && postOwnerId !== session.user.id) {
                await supabaseClient.from("notifications").insert([
                    { recipient_id: postOwnerId, actor_id: session.user.id, type: "like", post_id: postId },
                ]);
            }
        }

        likeBtn.disabled = false;
    });
}

// read-only comment count — clicking it (or anywhere else on the card) opens the expanded post,
// where commenting actually happens now
async function loadCommentCount(postId, cardElement) {
    const commentCountEl = cardElement.querySelector(".comment-count");
    if (!commentCountEl) return;

    const { count } = await supabaseClient
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);

    commentCountEl.textContent = count ?? 0;
}

// follow button logic
async function showFollow(profileUserId, cardElement) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || session.user.id === profileUserId) return;

    const btn = cardElement.querySelector(".follow-button-slot");
    if (!btn) return;

    const currentUserId = session.user.id;

    async function getStatus() {
        const { data: iFollow } = await supabaseClient
            .from("follows")
            .select("follower_id")
            .eq("follower_id", currentUserId)
            .eq("following_id", profileUserId)
            .maybeSingle();

        const { data: theyFollow } = await supabaseClient
            .from("follows")
            .select("follower_id")
            .eq("follower_id", profileUserId)
            .eq("following_id", currentUserId)
            .maybeSingle();

        return { iFollow: !!iFollow, theyFollow: !!theyFollow };
    }

    function render(status) {
        btn.style.display = "inline-flex";
        if (status.iFollow && status.theyFollow) {
            btn.textContent = "Friends";
        } else if (status.iFollow) {
            btn.textContent = "Following";
        } else {
            btn.textContent = "Follow";
        }
    }

    let status = await getStatus();
    render(status);

    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        btn.disabled = true;

        if (status.iFollow) {
            const { error } = await supabaseClient
                .from("follows")
                .delete()
                .eq("follower_id", currentUserId)
                .eq("following_id", profileUserId);
            if (error) { alert("Failed to unfollow: " + error.message); btn.disabled = false; return; }
        } else {
            const { error } = await supabaseClient
                .from("follows")
                .insert([{ follower_id: currentUserId, following_id: profileUserId }]);
            if (error) { alert("Failed to follow: " + error.message); btn.disabled = false; return; }
        }

        status = await getStatus();
        render(status);
        btn.disabled = false;
    });
}

// post visibility
function postVisibility(cardElement) {
    const moreBtn = cardElement.querySelector(".item-more");
    const dropdown = cardElement.querySelector(".item-menu-dropdown");

    if (!moreBtn || !dropdown) return;

    moreBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll(".item-menu-dropdown.active").forEach((d) => {
            if (d !== dropdown) d.classList.remove("active");
        });
        dropdown.classList.toggle("active");
    });

    dropdown.querySelector(".delete-post-btn")?.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = confirm("Delete this post permanently? This cannot be undone.");
        if (!confirmed) return;

        const { error } = await supabaseClient
            .from("posts")
            .delete()
            .eq("id", dropdown.dataset.postId);

        if (error) {
            alert("Failed to delete post: " + error.message);
            return;
        }

        cardElement.remove();
    });

    dropdown.querySelector(".visibility-btn")?.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const btn = e.currentTarget;
        const newVisibility = btn.dataset.set;

        const { error } = await supabaseClient
            .from("posts")
            .update({ visibility: newVisibility })
            .eq("id", btn.dataset.postId);

        if (error) {
            alert("Failed to update post: " + error.message);
            return;
        }

        if (newVisibility !== "public") {
            cardElement.remove();
        } else {
            btn.textContent = "Make private";
            btn.dataset.set = "private";
        }
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".item-menu-dropdown.active").forEach((d) => d.classList.remove("active"));
});

// share button logic
function allowShare(postId, cardElement) {
    const shareBtn = cardElement.querySelector(".share-btn");
    if (!shareBtn) return;

    shareBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/dashboard/post/?id=${postId}`;

        if (navigator.share) {
            try {
                await navigator.share({ url });
            } catch (err) {
                // user cancelled — not an error
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            alert("Link copied to clipboard");
        } catch (err) {
            alert("Couldn't copy link");
        }
    });
}

// date format
function formatUploaded(dateStr) {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffSeconds < 60) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffHours < 48) return "yesterday";
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? "" : "s"} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? "" : "s"} ago`;
}

function getWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function getExcerpt(text, maxWords = 40) {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return escapeHtml(text);
    return escapeHtml(words.slice(0, maxWords).join(" ")) + "…";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function setupCommentNav(postId, cardElement) {
    const commentBtn = cardElement.querySelector(".comment-btn");
    if (!commentBtn) return;

    commentBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `/dashboard/post/?id=${postId}`;
    });
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".keep-reading-btn");
    if (!btn) return;
    e.stopPropagation(); // expand the caption in place, don't navigate away
    const caption = btn.closest(".story-caption");
    caption.textContent = caption.dataset.fullText;
});

loadTimeline();