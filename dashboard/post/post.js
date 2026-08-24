const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

async function loadPost() {
    const container = document.querySelector(".timeline");

    if (!postId) {
        container.innerHTML = `<div class="empty-state"><div class="empty-title">No post specified</div></div>`;
        return;
    }

    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Getting everything ready...
        </div>
    `;

    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUserId = session?.user?.id || null;

    const { data: post, error } = await supabaseClient
        .from("posts")
        .select("id, user_id, media_url, thumbnail_url, title, caption, created_at, edited_at, visibility, users!posts_user_id_fkey(username, avatar_url)")
        .eq("id", postId)
        .single();

    if (error || !post) {
        commentPanel.innerHTML = `
            <div class="comment-panel-header">
                <span>Comments</span>
                <button type="button" class="comment-panel-close" aria-label="Close">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="comment-panel-list"></div>
            <form class="comment-panel-form">
                <input type="text" placeholder="Add a comment..." autocomplete="off">
                <button type="submit">Post</button>
            </form>
        `;
        return;
    }

    container.innerHTML = "";

    const avatarSrc = post.users.avatar_url || "/assets/pfp.png";
    const uploadedText = formatUploaded(post.created_at);
    const isOwner = currentUserId && currentUserId === post.user_id;
    const editedText = post.edited_at ? " (edited)" : "";

    const timelineItem = document.createElement("div");
    timelineItem.style = "border-radius: 8px 8px 0 0";
    timelineItem.className = "timeline-item";
    timelineItem.innerHTML = `
            <div class="item-info">
                <div class="item-header">
                     class="item-header">
                    <a href="/profile/?id=${post.user_id}"><img class="item-avatar" src="${avatarSrc}" alt=""></a>
                    <div class="item-header-text">
                        <span class="item-username">
                            <a href="/profile/?id=${post.user_id}">${post.users.display_name || post.users.username}</a>
                        </span>
                        <span class="item-date">${uploadedText}${editedText}</span>
                    </div>
                    ${!isOwner ? `<button type="button" class="item-follow follow-button-slot" data-user-id="${post.user_id}">Follow</button>` : ""}
                    ${isOwner ? `
                        <button type="button" class="item-more" data-post-id="${post.id}">
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
                    ` : ""}
                </div>

                <div class="item-body">
                    <p class="item-caption">
                        ${post.caption || ""}
                    </p>
                </div>
                ${post.media_url ? `<img class="item-media" src="${post.media_url}" alt="">` : ""}

                <div class="item-actions" aria-label="Like">
                    <button class="interaction" id="like-btn" data-post-id="${post.id}">
                        <svg class="like-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                            <path fill="hidden" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>
                        </svg>
                        <span class="like-count">0</span>
                    </button>
                    <button class="interaction" id="comment-btn" aria-label="Comment" data-post-id="${post.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.891 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1"/>
                        </svg>
                        <span class="comment-count">0</span>
                    </button>
                    <button class="interaction" id="share-btn" aria-label="Share" data-post-id="${post.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v13m4-9l-4-4l-4 4m-4 6v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

    const commentPanel = document.createElement("div");
    commentPanel.className = "comment-panel";
    commentPanel.innerHTML = `
            <div class="comment-panel-header">
                <span>Comments</span>
                <button type="button" class="comment-panel-close" aria-label="Close">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="comment-panel-list"></div>
            <form class="comment-panel-form">
                <input type="text" placeholder="Add a comment..." autocomplete="off">
                <button type="submit">Post</button>
            </form>
        `;

    container.appendChild(timelineItem);
    container.appendChild(commentPanel);

    showFollow(post.user_id, timelineItem);
    loadLikes(post.id, post.user_id, timelineItem);
    openComments(post.id, timelineItem, commentPanel);
    loadComments(post.id, timelineItem, commentPanel);
    allowShare(post.id, timelineItem);
    if (isOwner) postVisibility(timelineItem);
}

// fetch the likes
async function loadLikes(postId, postOwnerId, cardElement) {
    const likeBtn = cardElement.querySelector("#like-btn");
    const likeIcon = cardElement.querySelector(".like-icon");
    const likeCount = cardElement.querySelector(".like-count");

    if (!likeBtn || !postId) return;

    const { count } = await supabaseClient
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
    likeCount.textContent = count ?? 0;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        likeBtn.addEventListener("click", () => {
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

    likeBtn.addEventListener("click", async () => {
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

            // x - 1 = count
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

            // x + 1 = count
            isLiked = true;
            likeBtn.classList.add("liked");
            likeCount.textContent = parseInt(likeCount.textContent) + 1;

            if (postOwnerId && postOwnerId !== session.user.id) {
                await supabaseClient.from("notifications").insert([
                    {
                        recipient_id: postOwnerId,
                        actor_id: session.user.id,
                        type: "like",
                        post_id: postId,
                    },
                ]);
            }
        }

        likeBtn.disabled = false;
    });
}

// open the comment panel
async function openComments(postId, timelineItem, commentPanel) {
    const commentBtn = timelineItem.querySelector("#comment-btn");

    commentBtn.addEventListener("click", () => {
        const isOpen = commentPanel.style.display !== "none";
        timelineItem.classList.toggle("comments-open", !isOpen);

        if (isOpen) {
            loadComments(postId, timelineItem, commentPanel);
        }
    });

    commentPanel.querySelector(".comment-panel-close").addEventListener("click", () => {
        commentPanel.style.display = "none";
    });

    commentPanel.querySelector(".comment-panel-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = e.target.querySelector("input[type='text']");
        const text = input.value.trim();
        if (!text) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            alert("You need to be logged in to comment.");
            return;
        }

        const { error } = await supabaseClient
            .from("comments")
            .insert([{ post_id: postId, user_id: session.user.id, comment_text: text }]);

        if (error) {
            alert("Failed to post comment: " + error.message);
            return;
        }

        input.value = "";
        loadComments(postId, timelineItem, commentPanel);
    });
}

// load the comments
async function loadComments(postId, timelineItem, commentPanel) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUserId = session?.user?.id || null;

    const { data: comments, error } = await supabaseClient
        .from("comments")
        .select("id, comment_text, gif_url, created_at, edited_at, user_id, users!comments_user_id_fkey(username, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Failed to load comments:", error);
        return;
    }

    const commentList = commentPanel.querySelector(".comment-panel-list");    
    commentList.innerHTML = "";

    const commentCount = timelineItem.querySelector(".comment-count");
    if (commentCount) commentCount.textContent = comments.length;
    if (comments.length === 0) {
        commentList.innerHTML = `<p class="no-comments">Comments? You probably ate them all...</p>`;
        return;
    }

    comments.forEach((comment) => {
        const divComment = document.createElement("div");
        divComment.className = "panel-comment";

        const avatarSrc = comment.users.avatar_url || "/assets/pfp.png";
        const isOwner = currentUserId === comment.user_id;
        const editedTag = comment.edited_at ? " (edited)" : "";
        const timeText = formatUploaded(comment.created_at);
        divComment.innerHTML = `
            <img class="comment-avatar" src="${avatarSrc}" alt="">
            <div class="comment-body">
                <div class="comment-header">
                    <a href="/profile/?id=${comment.user_id}" class="comment-username-link">${comment.users.username}</a>
                    <span class="comment-timestamp">${timeText}${editedTag}</span>
                </div>
                <div class="comment-text-display">${comment.comment_text || ""}</div>
                ${comment.gif_url ? `<img class="comment-gif" src="${comment.gif_url}" alt="">` : ""}
            </div>
        `;

        commentList.appendChild(divComment);
    });
}

// follow button logic
async function showFollow(profileUserId, cardElement) {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || session.user.id === profileUserId) return;

    const btn = cardElement.querySelector(".follow-button-slot");
    if (!btn) return;

    const { data: existingFollow } = await supabaseClient
        .from("follows")
        .select("follower_id")
        .eq("follower_id", session.user.id)
        .eq("following_id", profileUserId)
        .maybeSingle();

    let isFollowing = !!existingFollow;
    btn.textContent = isFollowing ? "Following" : "Follow";
    if (isFollowing) btn.classList.add("following");

    btn.addEventListener("click", async () => {
        btn.disabled = true;

        if (isFollowing) {
            const { error } = await supabaseClient
                .from("follows")
                .delete()
                .eq("follower_id", session.user.id)
                .eq("following_id", profileUserId);

            if (error) {
                alert("Failed to unfollow: " + error.message);
                btn.disabled = false;
                return;
            }

            isFollowing = false;
            btn.classList.remove("following");
            btn.textContent = "Follow";
        } else {
            const { error } = await supabaseClient
                .from("follows")
                .insert([{ follower_id: session.user.id, following_id: profileUserId }]);

            if (error) {
                alert("Failed to follow: " + error.message);
                btn.disabled = false;
                return;
            }

            isFollowing = true;
            btn.classList.add("following");
            btn.textContent = "Following";
        }

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
        // close any other open dropdowns first
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
        cardElement.nextElementSibling?.classList.contains("comment-panel") && cardElement.nextElementSibling.remove();
        // ^ also removes the associated comment panel sitting right after it, if present
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

// close any open dropdown when clicking anywhere else on the page
document.addEventListener("click", () => {
    document.querySelectorAll(".item-menu-dropdown.active").forEach((d) => d.classList.remove("active"));
});

// share button logic
function allowShare(postId, cardElement) {
    const shareBtn = cardElement.querySelector("#share-btn");
    if (!shareBtn) return;

    shareBtn.addEventListener("click", async () => {
        const url = `${window.location.origin}/dashboard/post/?id=${postId}`;
        if (navigator.share) {
            try {
                await navigator.share({ url });
            } catch (err) {
                // user cancelled the share sheet — not an error worth showing
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            alert("Link copied to clipboard");
        } catch (err) {
            alert("Couldn't copy link");
        }
    })
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

loadPost();

const imageModal = document.getElementById("image-modal");
const imageModalImg = document.getElementById("image-modal-img");
const imageModalClose = document.getElementById("image-modal-close");

// event delegation - works for posts loaded/rendered dynamically
document.addEventListener("click", (e) => {
    const target = e.target.closest(".item-media");
    if (!target) return;
    imageModalImg.src = target.src;
    imageModal.classList.add("open");
});

imageModalClose.addEventListener("click", () => {
    imageModal.classList.remove("open");
    imageModalImg.src = "";
});

// click outside the image (on the dark backdrop) to close
imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove("open");
        imageModalImg.src = "";
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageModal.classList.contains("open")) {
        imageModal.classList.remove("open");
        imageModalImg.src = "";
    }
});