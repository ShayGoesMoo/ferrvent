const params = new URLSearchParams(window.location.search);
const postId = params.get("id");
let replyingToId = null;

async function loadPost() {
    const postContainer = document.getElementById("post-container");

    if (!postId) {
        postContainer.innerHTML = `<div class="t-box-body"><p>No post specified.</p></div>`;
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUserId = session?.user?.id || null;

    const { data: post, error } = await supabaseClient
        .from("posts")
        .select("id, user_id, media_url, media_urls, thumbnail_url, title, caption, media_type, created_at, edited_at, visibility, users!posts_user_id_fkey(username, avatar_url, display_name)")
        .eq("id", postId)
        .single();

    if (error || !post) {
        postContainer.innerHTML = `<div class="t-box-body"><p>Post not found.</p></div>`;
        return;
    }

    const avatarSrc = post.users.avatar_url || "/assets/pfp.png";
    const uploadedText = formatUploaded(post.created_at);
    const isOwner = currentUserId && currentUserId === post.user_id;
    const editedText = post.edited_at ? " (edited)" : "";

    postContainer.innerHTML = `
        <div class="t-box-head">
            <a href="/profile/?user=${post.users.username}"><img class="t-avatar" src="${avatarSrc}" alt=""></a>
            <div class="t-head-text">
                <a href="/profile/?user=${post.users.username}" class="t-handle-link">${post.users.display_name || post.users.username}</a>
                <span class="t-time-row">${uploadedText}${editedText}</span>
            </div>
            ${!isOwner ? `<button type="button" class="edit-link follow-button-slot" data-user-id="${post.user_id}" style="display:none;">Follow</button>` : `
                <button type="button" class="item-more" data-post-id="${post.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M3 9.5a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3"/></svg>
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
            <button class="t-meta-action like-btn" data-post-id="${post.id}"><svg class="like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>Like (<span class="like-count">0</span>)</button>
            <button class="t-meta-action comment-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.891 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1"/></svg>Comment (<span class="comment-count">0</span>)</button>
            <button class="t-meta-action share-btn" data-post-id="${post.id}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v13m4-9l-4-4l-4 4m-4 6v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>Share</button>
        </div>
    `;

    showFollow(post.user_id, postContainer);
    loadLikes(post.id, post.user_id, postContainer);
    loadComments(postId, postContainer);
    allowShare(post.id, postContainer);
    if (isOwner) postVisibility(postContainer);

    // comment-form submit handler
    document.getElementById("comment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("comment-input");
        const text = input.value.trim();
        if (!text) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { alert("You need to be logged in to comment."); return; }

        const { error } = await supabaseClient
            .from("comments")
            .insert([{
                post_id: postId,
                user_id: session.user.id,
                comment_text: text,
                parent_id: replyingToId, // null for a top-level comment
            }]);

        if (error) { alert("Failed to post comment: " + error.message); return; }

        input.value = "";
        replyingToId = null; // reset after posting
        loadComments(postId, document.getElementById("post-container"));
    });

    if (!isOwner) {
        supabaseClient.rpc("increment_view_count", { target_post_id: post.id });
    }

    const titleSnippet = post.title || (post.caption ? post.caption.slice(0, 40) : "Post");
    document.title = `${titleSnippet} — @${post.users.username} | Ferrvent`;
}

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
        likeBtn.addEventListener("click", () => alert("You need to be logged in to like posts."));
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
            const { error } = await supabaseClient.from("post_likes").delete().eq("post_id", postId).eq("user_id", session.user.id);
            if (error) { alert("Failed to unlike: " + error.message); likeBtn.disabled = false; return; }
            isLiked = false;
            likeBtn.classList.remove("liked");
            likeCount.textContent = Math.max(0, parseInt(likeCount.textContent) - 1);
        } else {
            const { error } = await supabaseClient.from("post_likes").insert([{ post_id: postId, user_id: session.user.id }]);
            if (error) { alert("Failed to like: " + error.message); likeBtn.disabled = false; return; }
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

async function loadComments(postId, postContainer) {
    const { data: comments, error } = await supabaseClient
        .from("comments")
        .select("id, comment_text, gif_url, created_at, edited_at, user_id, parent_id, users!comments_user_id_fkey(username, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (error) { console.error("Failed to load comments:", error); return; }

    const commentList = document.getElementById("comment-list");
    const commentCountEl = postContainer.querySelector(".comment-count");
    if (commentCountEl) commentCountEl.textContent = comments.length;

    commentList.innerHTML = "";

    if (comments.length === 0) {
        commentList.innerHTML = `<p class="no-comments">Comments? You probably ate them all...</p>`;
        return;
    }

    const topLevel = comments.filter(c => !c.parent_id);
    const repliesByParent = {};
    comments.filter(c => c.parent_id).forEach(c => {
        (repliesByParent[c.parent_id] ||= []).push(c);
    });

    function renderComment(comment, isReply) {
        const avatarSrc = comment.users.avatar_url || "/assets/pfp.png";
        const editedTag = comment.edited_at ? " (edited)" : "";
        const timeText = formatUploaded(comment.created_at);

        const div = document.createElement("div");
        div.className = isReply ? "comment reply" : "comment";
        div.innerHTML = `
            <a href="/profile/?user=${comment.users.username}"><img class="comment-avatar" src="${avatarSrc}" alt=""></a>
            <div class="comment-body">
                <div class="comment-head">
                    <a href="/profile/?user=${comment.users.username}" class="comment-handle">@${comment.users.username}</a>
                    <span class="comment-time">${timeText}${editedTag}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.comment_text || "")}</p>
                ${comment.gif_url ? `<img class="comment-gif" src="${comment.gif_url}" alt="">` : ""}
                <button type="button" class="comment-reply" data-reply-id="${comment.id}" data-username="${comment.users.username}">Reply</button>
            </div>
        `;
        commentList.appendChild(div);
    }

    topLevel.forEach((comment) => {
        renderComment(comment, false);
        (repliesByParent[comment.id] || []).forEach((reply) => {
            renderComment(reply, true); // always indented exactly one level
        });
    });

    commentList.querySelectorAll(".comment-reply").forEach((btn) => {
        btn.addEventListener("click", () => {
            replyingToId = btn.dataset.replyId;
            const input = document.getElementById("comment-input");
            input.value = `@${btn.dataset.username} `;
            input.focus();
        });
    });
}

async function showFollow(profileUserId, cardElement) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || session.user.id === profileUserId) return;

    const btn = cardElement.querySelector(".follow-button-slot");
    if (!btn) return;

    const currentUserId = session.user.id;

    async function getStatus() {
        const { data: iFollow } = await supabaseClient.from("follows").select("follower_id").eq("follower_id", currentUserId).eq("following_id", profileUserId).maybeSingle();
        const { data: theyFollow } = await supabaseClient.from("follows").select("follower_id").eq("follower_id", profileUserId).eq("following_id", currentUserId).maybeSingle();
        return { iFollow: !!iFollow, theyFollow: !!theyFollow };
    }

    function render(status) {
        btn.style.display = "inline-flex";
        if (status.iFollow && status.theyFollow) btn.textContent = "Friends";
        else if (status.iFollow) btn.textContent = "Following";
        else btn.textContent = "Follow";
    }

    let status = await getStatus();
    render(status);

    btn.addEventListener("click", async () => {
        btn.disabled = true;
        if (status.iFollow) {
            const { error } = await supabaseClient.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profileUserId);
            if (error) { alert("Failed to unfollow: " + error.message); btn.disabled = false; return; }
        } else {
            const { error } = await supabaseClient.from("follows").insert([{ follower_id: currentUserId, following_id: profileUserId }]);
            if (error) { alert("Failed to follow: " + error.message); btn.disabled = false; return; }
        }
        status = await getStatus();
        render(status);
        btn.disabled = false;
    });
}

function postVisibility(cardElement) {
    const moreBtn = cardElement.querySelector(".item-more");
    const dropdown = cardElement.querySelector(".item-menu-dropdown");
    if (!moreBtn || !dropdown) return;

    moreBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle("active");
    });

    dropdown.querySelector(".delete-post-btn")?.addEventListener("click", async (e) => {
        e.preventDefault();
        const confirmed = confirm("Delete this post permanently? This cannot be undone.");
        if (!confirmed) return;

        const { error } = await supabaseClient.from("posts").delete().eq("id", dropdown.dataset.postId);
        if (error) { alert("Failed to delete post: " + error.message); return; }
        window.location.href = "/dashboard/";
    });

    dropdown.querySelector(".visibility-btn")?.addEventListener("click", async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        const newVisibility = btn.dataset.set;

        const { error } = await supabaseClient.from("posts").update({ visibility: newVisibility }).eq("id", btn.dataset.postId);
        if (error) { alert("Failed to update post: " + error.message); return; }

        btn.textContent = newVisibility === "private" ? "Make public" : "Make private";
        btn.dataset.set = newVisibility === "private" ? "public" : "private";
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".item-menu-dropdown.active").forEach((d) => d.classList.remove("active"));
});

function allowShare(postId, cardElement) {
    const shareBtn = cardElement.querySelector(".share-btn");
    if (!shareBtn) return;

    shareBtn.addEventListener("click", async () => {
        const url = `${window.location.origin}/dashboard/post/?id=${postId}`;
        if (navigator.share) {
            try { await navigator.share({ url }); } catch (err) {}
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

// replace the whole image-modal block at the bottom of post.js with this
const imageModal = document.getElementById("image-modal");
const imageModalImg = document.getElementById("image-modal-img");
const imageModalClose = document.getElementById("image-modal-close");
const imageModalPrev = document.getElementById("image-modal-prev");
const imageModalNext = document.getElementById("image-modal-next");
const imageModalCounter = document.getElementById("image-modal-counter");

let modalGallery = [];
let modalIndex = 0;

function showModalImage() {
    imageModalImg.src = modalGallery[modalIndex];
    const multiple = modalGallery.length > 1;
    imageModalPrev.style.display = multiple ? "flex" : "none";
    imageModalNext.style.display = multiple ? "flex" : "none";
    imageModalCounter.textContent = multiple ? `${modalIndex + 1} / ${modalGallery.length}` : "";
}

document.addEventListener("click", (e) => {
    const target = e.target.closest(".item-media");
    if (!target) return;

    try {
        modalGallery = JSON.parse(target.dataset.gallery || "[]");
    } catch {
        modalGallery = [target.src];
    }
    if (modalGallery.length === 0) modalGallery = [target.src];

    modalIndex = parseInt(target.dataset.index || "0", 10);
    showModalImage();
    imageModal.classList.add("open");
});

imageModalPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    modalIndex = (modalIndex - 1 + modalGallery.length) % modalGallery.length;
    showModalImage();
});

imageModalNext.addEventListener("click", (e) => {
    e.stopPropagation();
    modalIndex = (modalIndex + 1) % modalGallery.length;
    showModalImage();
});

imageModalClose.addEventListener("click", () => {
    imageModal.classList.remove("open");
    imageModalImg.src = "";
});

imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove("open");
        imageModalImg.src = "";
    }
});

document.addEventListener("keydown", (e) => {
    if (!imageModal.classList.contains("open")) return;

    if (e.key === "Escape") {
        imageModal.classList.remove("open");
        imageModalImg.src = "";
    } else if (e.key === "ArrowLeft" && modalGallery.length > 1) {
        modalIndex = (modalIndex - 1 + modalGallery.length) % modalGallery.length;
        showModalImage();
    } else if (e.key === "ArrowRight" && modalGallery.length > 1) {
        modalIndex = (modalIndex + 1) % modalGallery.length;
        showModalImage();
    }
});

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}