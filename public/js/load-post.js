const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

let currentPostOwnerId = null;

async function loadPost() {
    if (!postId) {
        console.error("No post id in URL");
        return;
    }

    const { data: post, error } = await supabaseClient
        .from("posts")
        .select("id, user_id, title, media_url, caption, media_type, thumbnail_url, created_at, edited_at, users!posts_user_id_fkey(display_name, username, avatar_url)")
        .eq("id", postId)
        .single();

    if (error || !post) {
        console.error("Failed to load post:", error);
        return;
    }

    currentPostOwnerId = post.user_id; // set this so the comment handler can use it later

    document.getElementById("post-view").style.visibility = "visible";

    document.getElementById("post-view").style.visibility = "visible"; // reveal only once we know what to show

    if (post.media_type === "text") {
        loadTextPost(post);
        return;
    }

    if (post.media_type === "image" || post.media_type === "gif") {
        loadImagePost(post);
        return;
    }

    const mediaContainer = document.querySelector(".post-media");
    const existingImg = document.getElementById("post-image");
    const fullscreenBtn = document.getElementById("fullscreen-btn");

    if (post.media_type === "video") {
        document.querySelector(".post-view").classList.add("video-post-layout");

        existingImg.remove();

        const video = document.createElement("video");
        video.id = "post-image";
        video.src = post.media_url;
        video.playsInline = true;
        video.preload = "metadata";
        video.autoplay = true;
        video.play().catch((err) => {
            console.warn("Autoplay failed or video not ready yet:", err);
        });

        mediaContainer.insertBefore(video, mediaContainer.firstChild);

        document.getElementById("video-title-overlay").style.display = "block";
        document.getElementById("video-title-overlay").textContent = post.title ?? "";
        document.getElementById("video-controls").style.display = "block";
        fullscreenBtn.style.display = "flex";

        setupCustomControls(video);

        const avatarSrc = post.users.avatar_url || "../assets/default profile picture.png";
        const uploadedText = formatUploaded(post.created_at);
        const editedText = post.edited_at ? " (edited)" : "";

        // fetch the view count before building the details HTML
        const { count: viewCount } = await supabaseClient
            .from("post_views")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId);

        document.querySelector(".post-details").innerHTML = `
            <div class="video-post-details">
                <div class="video-post-title">${post.title ?? ""}</div>
                <div class="video-post-header">
                    <div class="video-post-header-left">
                        <a href="profile.html?id=${post.user_id}">
                            <img class="video-post-avatar" src="${avatarSrc}" alt="">
                        </a>
                        <div class="video-post-header-text">
                            <a href="profile.html?id=${post.user_id}" class="video-post-username-link">
                                <span class="video-post-username">@${post.users.username}</span>
                            </a>
                            <span class="video-post-meta">${viewCount ?? 0} views &middot; ${formatExactDateTime(post.created_at)}${editedText}</span>
                        </div>
                    </div>
                    <span id="video-follow-slot"></span>
                </div>
                ${post.caption ? `<div class="video-post-caption">${post.caption}</div>` : ""}
            </div>
        `;
    }

    setupFollowButton(post.user_id, "#video-follow-slot");
    recordView(postId);
    loadComments();
    loadRecommended();
}

async function recordView(postId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: existing } = await supabaseClient
        .from("post_views")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (existing) return; // already viewed, nothing to do

    const { error } = await supabaseClient
        .from("post_views")
        .insert([{ post_id: postId, user_id: session.user.id }]);

    if (error) {
        console.error("Failed to record view:", error);
    }
}

async function loadViewCount(postId) {
    const { count, error } = await supabaseClient
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

    if (error) {
        console.error("Failed to load view count:", error);
        return;
    }

    const viewsEl = document.querySelector(".uploader-info .media-type"); // or wherever you want to display it
    // adjust the selector/target based on where you actually want views shown on post.html
}

loadPost();

async function loadComments() {
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

    const commentList = document.getElementById("comment-list");
    commentList.innerHTML = "";

    const countEl = document.getElementById("tweet-comment-count");
    if (countEl) countEl.textContent = comments.length;

    if (comments.length === 0) {
        commentList.innerHTML = `<p class="no-comments">It's kinda dry in here...</p>`;
        return;
    }

    comments.forEach((comment) => {
        const div = document.createElement("div");
        div.className = "comment";

        const avatarSrc = comment.users.avatar_url || "../assets/default profile picture.png";
        const isOwner = currentUserId === comment.user_id;
        const editedTag = comment.edited_at ? " (edited)" : "";
        const timeText = formatUploaded(comment.created_at);

        div.innerHTML = `
            <a href="profile.html?id=${comment.user_id}">
                <img class="comment-avatar" src="${avatarSrc}" alt="">
            </a>
            <div class="comment-body">
                <div class="comment-header">
                    <a href="profile.html?id=${comment.user_id}" class="comment-username-link">${comment.users.username}</a>
                    <span class="comment-timestamp">${timeText}${editedTag}</span>
                </div>
                <div class="comment-text-display">${comment.comment_text || ""}</div>
                ${comment.gif_url ? `<img class="comment-gif" src="${comment.gif_url}" alt="">` : ""}
                ${isOwner ? `
                    <div class="comment-actions">
                        <button type="button" class="comment-action-link edit-comment-btn" data-comment-id="${comment.id}">Edit</button>
                        <button type="button" class="comment-action-link delete-comment-btn" data-comment-id="${comment.id}">Delete</button>
                    </div>
                ` : ""}
            </div>
        `;

        commentList.appendChild(div);
    });

    // wire up edit
    document.querySelectorAll(".edit-comment-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const commentDiv = btn.closest(".comment");
            const textDisplay = commentDiv.querySelector(".comment-text-display");
            const currentText = textDisplay.textContent;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "comment-edit-input";
            input.value = currentText;

            textDisplay.replaceWith(input);
            input.focus();

            const saveEdit = async () => {
                const newText = input.value.trim();
                if (!newText) return;

                const { error } = await supabaseClient
                    .from("comments")
                    .update({ comment_text: newText, edited_at: new Date().toISOString() })
                    .eq("id", btn.dataset.commentId);

                if (error) {
                    showToast("Failed to update comment: " + error.message, "error");
                    return;
                }

                loadComments();
            };

            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") loadComments();
            });

            input.addEventListener("blur", saveEdit);
        });
    });

    // wire up delete
    document.querySelectorAll(".delete-comment-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const confirmed = confirm("Delete this comment?");
            if (!confirmed) return;

            const { error } = await supabaseClient
                .from("comments")
                .delete()
                .eq("id", btn.dataset.commentId);

            if (error) {
                showToast("Failed to delete comment: " + error.message, "error");
                return;
            }

            loadComments();
        });
    });
}

async function loadRecommended() {
    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, title, media_url, caption, media_type, thumbnail_url, users!posts_user_id_fkey(username)")
        .eq("media_type", "video")
        .neq("id", postId)
        .order("created_at", { ascending: false })
        .limit(15);

    if (error) {
        console.error("Failed to load recommended posts:", error);
        return;
    }

    const panel = document.getElementById("recommended-panel");
    panel.innerHTML = "";

    posts.forEach((post) => {
        const item = document.createElement("a");
        item.href = `post.html?id=${post.id}`;
        item.className = "recommended-item";

        const thumbSrc = post.thumbnail_url || post.media_url;
        const title = truncateText(post.title ?? post.users.username, 60);
        const caption = truncateText(post.caption ?? "", 80);

        item.innerHTML = `
            <div class="recommended-thumb">
                <img src="${thumbSrc}" alt="">
            </div>
            <div class="recommended-info">
                <div class="rec-title">${title}</div>
                <div class="rec-caption">${caption}</div>
            </div>
        `;

        panel.appendChild(item);
    });
}

async function setupFollowButton(profileUserId, containerSelector) {
    const { data: { session } } = await supabaseClient.auth.getSession();

    // don't show a follow button on your own post, or if not logged in
    if (!session || session.user.id === profileUserId) return;

    const container = document.querySelector(containerSelector);
    if (!container) return;

    const { data: existingFollow } = await supabaseClient
        .from("follows")
        .select("follower_id")
        .eq("follower_id", session.user.id)
        .eq("following_id", profileUserId)
        .maybeSingle();

    let isFollowing = !!existingFollow;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "follow-btn" + (isFollowing ? " following" : "");
    btn.innerHTML = `<span class="follow-btn-text">${isFollowing ? "Following" : "Follow"}</span>`;

    btn.addEventListener("click", async () => {
        btn.disabled = true;

        if (isFollowing) {
            const { error } = await supabaseClient
                .from("follows")
                .delete()
                .eq("follower_id", session.user.id)
                .eq("following_id", profileUserId);

            if (error) {
                showToast("Failed to unfollow: " + error.message, "error");
                btn.disabled = false;
                return;
            }

            isFollowing = false;
            btn.classList.remove("following");
            btn.innerHTML = `<span class="follow-btn-text">Follow</span>`;
        } else {
            const { error } = await supabaseClient
            .from("follows")
            .insert([{ follower_id: session.user.id, following_id: profileUserId }]);

        if (error) {
            showToast("Failed to follow: " + error.message, "error");
            btn.disabled = false;
            return;
        }

        isFollowing = true;
        btn.classList.add("following");
        btn.innerHTML = `<span class="follow-btn-text">Following</span>`;

        await supabaseClient.from("notifications").insert([
            {
                recipient_id: profileUserId,
                actor_id: session.user.id,
                type: "follow",
            },
        ]);
        }

        btn.disabled = false;
    });

    container.appendChild(btn);
}

function setupShareButton(postId) {
    const shareBtn = document.getElementById("share-btn");
    if (!shareBtn) return;

    shareBtn.addEventListener("click", async () => {
        const url = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}post.html?id=${postId}`;

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
            showToast("Link copied to clipboard", "success");
        } catch (err) {
            showToast("Couldn't copy link", "error");
        }
    });
}

function loadTextPost(post) {
    const postView = document.querySelector(".post-view");
    postView.classList.add("text-post-layout");

    document.getElementById("post-media").style.display = "none";

    const recommendedPanel = document.getElementById("recommended-panel");
    if (recommendedPanel) recommendedPanel.style.display = "none";

    const avatarSrc = post.users.avatar_url || "../assets/default profile picture.png";
    const uploadedText = formatUploaded(post.created_at);
    const editedText = post.edited_at ? " (edited)" : "";

    const postDetails = document.querySelector(".post-details");
    postDetails.innerHTML = `
        <div class="tweet-card">
            <div class="tweet-header">
                <div class="tweet-header-left">
                    <a href="profile.html?id=${post.user_id}">
                        <img class="tweet-avatar" src="${avatarSrc}" alt="">
                    </a>
                    <div class="tweet-header-text">
                        <a href="profile.html?id=${post.user_id}" class="tweet-username-link">
                            <span class="tweet-username">${post.users.display_name}</span>
                        </a>
                        <a href="profile.html?id=${post.user_id}" class="tweet-handle-link">
                            <span class="tweet-handle">@${post.users.username}</span>
                        </a>
                    </div>
                </div>
                <span id="tweet-follow-slot"></span>
            </div>

            ${post.title ? `<div class="tweet-title">${post.title}</div>` : ""}
            <div class="tweet-content">${post.caption ?? ""}</div>

            <div class="tweet-meta">${formatExactDateTime(post.created_at)}${editedText}</div>

            <div class="tweet-actions">
                <button type="button" class="tweet-action-btn" id="like-btn" aria-label="Like">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" id="like-icon">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>
                    </svg>
                    <span id="like-count">0</span>
                </button>

                <button type="button" class="tweet-action-btn" aria-label="Comment">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span id="tweet-comment-count">0</span>
                </button>

                <button type="button" class="tweet-action-btn" aria-label="Views">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span id="tweet-view-count">0</span>
                </button>

                <button type="button" class="tweet-action-btn" id="share-btn" aria-label="Share">
                    <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                        <g id="SVGRepo_tracerCarrier" 
                            stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> 
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M3.5 5.00006C3.22386 5.00006 3 
                            5.22392 3 5.50006L3 11.5001C3 11.7762 3.22386 12.0001 3.5 12.0001L11.5 
                            12.0001C11.7761 12.0001 12 11.7762 12 11.5001L12 5.50006C12 5.22392 11.7761 
                            5.00006 11.5 5.00006L10.25 5.00006C9.97386 5.00006 9.75 4.7762 9.75 4.50006C9.75 
                            4.22392 9.97386 4.00006 10.25 4.00006L11.5 4.00006C12.3284 4.00006 13 4.67163 13 
                            5.50006L13 11.5001C13 12.3285 12.3284 13.0001 11.5 13.0001L3.5 13.0001C2.67157 
                            13.0001 2 12.3285 2 11.5001L2 5.50006C2 4.67163 2.67157 4.00006 3.5 4.00006L4.75 
                            4.00006C5.02614 4.00006 5.25 4.22392 5.25 4.50006C5.25 4.7762 5.02614 5.00006 4.75 
                            5.00006L3.5 5.00006ZM7 1.6364L5.5682 3.0682C5.39246 3.24393 5.10754 3.24393 4.9318 
                            3.0682C4.75607 2.89246 4.75607 2.60754 4.9318 2.4318L7.1818 0.181802C7.26619 0.09741 
                            7.38065 0.049999 7.5 0.049999C7.61935 0.049999 7.73381 0.09741 7.8182 0.181802L10.0682 
                            2.4318C10.2439 2.60754 10.2439 2.89246 10.0682 3.0682C9.89246 3.24393 9.60754 3.24393 
                            9.4318 3.0682L8 1.6364L8 8.5C8 8.77614 7.77614 9 7.5 9C7.22386 9 7 8.77614 7 8.5L7 
                            1.6364Z" fill="currentColor"></path> 
                        </g>
                    </svg>
                </button>
            </div>
        </div>
    `;

    setupFollowButton(post.user_id, "#tweet-follow-slot");
    setupLikeButton(postId, post.user_id);
    setupShareButton(postId);

    recordView(postId);
    loadComments();
    loadTweetViewCount(postId);
}

async function loadTweetViewCount(postId) {
    const { count, error } = await supabaseClient
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

    if (!error) {
        const el = document.getElementById("tweet-view-count");
        if (el) el.textContent = count;
    }
}

async function setupLikeButton(postId, postOwnerId) {
    const likeBtn = document.getElementById("like-btn");
    const likeIcon = document.getElementById("like-icon");
    const likeCountEl = document.getElementById("like-count");

    if (!likeBtn) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    // load current like count regardless of login state
    const { count } = await supabaseClient
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

    likeCountEl.textContent = count ?? 0;

    if (!session) {
        // not logged in — button still visible, but clicking prompts login instead of liking
        likeBtn.addEventListener("click", () => {
            showToast("You need to be logged in to like posts.", "error");
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
                showToast("Failed to unlike: " + error.message, "error");
                likeBtn.disabled = false;
                return;
            }

            isLiked = false;
            likeBtn.classList.remove("liked");
            likeCountEl.textContent = Math.max(0, parseInt(likeCountEl.textContent) - 1);
        } else {
            const { error } = await supabaseClient
                .from("post_likes")
                .insert([{ post_id: postId, user_id: session.user.id }]);

            if (error) {
                showToast("Failed to like: " + error.message, "error");
                likeBtn.disabled = false;
                return;
            }

            isLiked = true;
            likeBtn.classList.add("liked");
            likeCountEl.textContent = parseInt(likeCountEl.textContent) + 1;

            // notify the post's owner, unless they liked their own post
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

function loadImagePost(post) {
    const postView = document.querySelector(".post-view");
    postView.classList.add("text-post-layout"); // reuse the same centered single-column layout

    document.getElementById("post-media").style.display = "none"; // hide the old dedicated media box — media now lives inside the card

    const recommendedPanel = document.getElementById("recommended-panel");
    if (recommendedPanel) recommendedPanel.style.display = "none";

    const avatarSrc = post.users.avatar_url || "../assets/default profile picture.png";
    const uploadedText = formatUploaded(post.created_at);
    const editedText = post.edited_at ? " (edited)" : "";

    const postDetails = document.querySelector(".post-details");
    postDetails.innerHTML = `
        <div class="tweet-card">
            <div class="tweet-header">
                <div class="tweet-header-left">
                    <a href="profile.html?id=${post.user_id}">
                        <img class="tweet-avatar" src="${avatarSrc}" alt="">
                    </a>
                    <div class="tweet-header-text">
                        <a href="profile.html?id=${post.user_id}" class="tweet-username-link">
                            <span class="tweet-username">${post.users.display_name}</span>
                        </a>
                        <a href="profile.html?id=${post.user_id}" class="tweet-handle-link">
                            <span class="tweet-handle">@${post.users.username}</span>
                        </a>
                    </div>
                </div>
                <span id="tweet-follow-slot"></span>
            </div>

            ${post.title ? `<div class="tweet-title">${post.title}</div>` : ""}
            ${post.caption ? `<div class="tweet-content">${post.caption}</div>` : ""}

            <div class="tweet-media">
                <img src="${post.media_url}" alt="">
            </div>

            <div class="tweet-meta">${formatExactDateTime(post.created_at)}${editedText}</div>

            <div class="tweet-actions">
                <button type="button" class="tweet-action-btn" id="like-btn" aria-label="Like">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" id="like-icon">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>
                    </svg>
                    <span id="like-count">0</span>
                </button>

                <button type="button" class="tweet-action-btn" aria-label="Comment">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span id="tweet-comment-count">0</span>
                </button>

                <button type="button" class="tweet-action-btn" aria-label="Views">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span id="tweet-view-count">0</span>
                </button>

                <button type="button" class="tweet-action-btn" id="share-btn" aria-label="Share">
                    <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                        <g id="SVGRepo_tracerCarrier" 
                            stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> 
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M3.5 5.00006C3.22386 5.00006 3 
                            5.22392 3 5.50006L3 11.5001C3 11.7762 3.22386 12.0001 3.5 12.0001L11.5 
                            12.0001C11.7761 12.0001 12 11.7762 12 11.5001L12 5.50006C12 5.22392 11.7761 
                            5.00006 11.5 5.00006L10.25 5.00006C9.97386 5.00006 9.75 4.7762 9.75 4.50006C9.75 
                            4.22392 9.97386 4.00006 10.25 4.00006L11.5 4.00006C12.3284 4.00006 13 4.67163 13 
                            5.50006L13 11.5001C13 12.3285 12.3284 13.0001 11.5 13.0001L3.5 13.0001C2.67157 
                            13.0001 2 12.3285 2 11.5001L2 5.50006C2 4.67163 2.67157 4.00006 3.5 4.00006L4.75 
                            4.00006C5.02614 4.00006 5.25 4.22392 5.25 4.50006C5.25 4.7762 5.02614 5.00006 4.75 
                            5.00006L3.5 5.00006ZM7 1.6364L5.5682 3.0682C5.39246 3.24393 5.10754 3.24393 4.9318 
                            3.0682C4.75607 2.89246 4.75607 2.60754 4.9318 2.4318L7.1818 0.181802C7.26619 0.09741 
                            7.38065 0.049999 7.5 0.049999C7.61935 0.049999 7.73381 0.09741 7.8182 0.181802L10.0682 
                            2.4318C10.2439 2.60754 10.2439 2.89246 10.0682 3.0682C9.89246 3.24393 9.60754 3.24393 
                            9.4318 3.0682L8 1.6364L8 8.5C8 8.77614 7.77614 9 7.5 9C7.22386 9 7 8.77614 7 8.5L7 
                            1.6364Z" fill="currentColor"></path> 
                        </g>
                    </svg>
                </button>
            </div>
        </div>
    `;

    setupFollowButton(post.user_id, "#tweet-follow-slot");
    setupLikeButton(postId, post.user_id);
    setupShareButton(postId);

    recordView(postId);
    loadComments();
    loadTweetViewCount(postId);
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

function truncateText(text, maxLength) {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength).trim() + "…" : text;
}

function formatExactDateTime(dateStr) {
    const date = new Date(dateStr);

    const datePart = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const timePart = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return `${timePart} · ${datePart}`;
}

let selectedGifUrl = null;

document.getElementById("comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.getElementById("comment-text-input");
    const commentText = input.value.trim();

    if (!commentText && !selectedGifUrl) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        showToast("You need to be logged in to comment.", "error");
        return;
    }

    const { error } = await supabaseClient
        .from("comments")
        .insert([
            {
                post_id: postId,
                user_id: session.user.id,
                comment_text: commentText || "",
                gif_url: selectedGifUrl,
            },
        ]);

    if (error) {
        showToast("Failed to post comment: " + error.message, "error");
        return;
    }

    if (currentPostOwnerId && currentPostOwnerId !== session.user.id) {
        await supabaseClient.from("notifications").insert([
            { recipient_id: currentPostOwnerId, actor_id: session.user.id, type: "comment", post_id: postId },
        ]);
    }

    input.value = "";
    selectedGifUrl = null;
    document.getElementById("comment-gif-preview").style.display = "none";
    document.getElementById("gif-picker").style.display = "none";
    loadComments();
});

const gifPickerBtn = document.getElementById("gif-picker-btn");
const gifPicker = document.getElementById("gif-picker");
const gifSearchInput = document.getElementById("gif-search-input");
const gifResults = document.getElementById("gif-results");
let gifMode = "gifs";

gifPickerBtn.addEventListener("click", () => {
    const isHidden = gifPicker.style.display === "none";

    if (isHidden) {
        gifPicker.style.display = "flex";
        if (!gifSearchInput.value.trim()) loadTrending();
    } else {
        gifPicker.style.display = "none";
    }
});

document.addEventListener("click", (e) => {
    if (
        gifPicker.style.display !== "none" &&
        !gifPicker.contains(e.target) &&
        e.target !== gifPickerBtn &&
        !gifPickerBtn.contains(e.target)
    ) {
        gifPicker.style.display = "none";
    }
});

document.querySelectorAll(".gif-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".gif-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        gifMode = tab.dataset.mode;
        
        if (gifSearchInput.value.trim()) {
            runGifSearch(gifSearchInput.value.trim());
        } else {
            loadTrending;
        }
    });
});

let gifSearchTimer;
gifSearchInput.addEventListener("input", () => {
    clearTimeout(gifSearchTimer);
    gifSearchTimer = setTimeout(() => runGifSearch(gifSearchInput.value.trim()), 400);
});

async function runGifSearch(query) {
    if (!query) return;
    const results = gifMode === "gifs" ? await searchGifs(query) : await searchStickers(query);
}

function renderGifResults(results) {
    gifResults.innerHTML = "";
    results.forEach((gif) => {
        const img = document.createElement("img");
        img.src = gif.preview;
        img.addEventListener("click", () => {
            selectedGifUrl = gif.full;
            const previewSlot = document.getElementById("comment-gif-preview");
            const previewImg = document.getElementById("comment-gif-preview-img");
            previewImg.src = gif.preview;
            previewSlot.style.display = "flex";

            gifPicker.style.display = "none";
            document.getElementById("comment-text-input").focus();
        });
        gifResults.appendChild(img);
    });
}

async function loadTrending() {
    const results = await getTrendingGifs();
    renderGifResults(results);
}

document.getElementById("remove-gif-btn").addEventListener("click", () => {
    selectedGifUrl = null;
    document.getElementById("comment-gif-preview").style.display = "none";
});

loadPost();