async function loadTimeline() {
    const timeline = document.querySelector(".timeline");

    timeline.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Loading posts...
        </div>
    `;

    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUserId = session?.user?.id || null;

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, user_id, media_url, media_type, thumbnail_url, title, caption, created_at, edited_at, visibility, users!posts_user_id_fkey(username, avatar_url)")
        .not("visibility", "in", "(archived,private)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to load timeline:", error.message, error);
        timeline.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">Something went wrong</div>
                <div class="empty-subtext">Try refreshing the page</div>
            </div>
        `;
        return;
    }

    if (posts.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 4h16v16H4z"/>
                    <path d="M4 15l4-4 4 4 6-6"/>
                </svg>
                <div class="empty-title">No posts yet</div>
                <div class="empty-subtext">Be the first to share something</div>
            </div>
        `;
        return;
    }

    const postIds = posts.map(p => p.id);
    const { data: viewRows, error: viewsError } = await supabaseClient
        .from("post_views")
        .select("post_id")
        .in("post_id", postIds);

    const viewCounts = {};
    if (!viewsError) {
        viewRows.forEach(row => {
            viewCounts[row.post_id] = (viewCounts[row.post_id] || 0) + 1;
        });
    }

    timeline.innerHTML = "";

    posts.forEach((post) => {
        const item = document.createElement("div");
        item.className = "timeline-item";
        item.style.cursor = "pointer";

        let mediaHTML;

        if (post.media_type === "text") {
            mediaHTML = `
                <div class="text-thumb-placeholder">
                    <span class="text-thumb-title">${""}</span>
                </div>
            `;
        } else if (post.media_type === "video") {
            mediaHTML = post.thumbnail_url
                ? `<img src="${post.thumbnail_url}" alt="">`
                : `<div class="video-placeholder-thumb">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 3l14 9-14 9V3z"/>
                    </svg>
                </div>`;
        } else {
            mediaHTML = `<img src="${post.media_url}" alt="">`;
        }

        const avatarSrc = post.users.avatar_url || "../assets/default profile picture.png";
        const viewsText = formatViews(viewCounts[post.id] || 0);
        const uploadedText = formatUploaded(post.created_at);
        const isOwner = currentUserId && currentUserId === post.user_id;
        const editedText = post.edited_at ? " (edited)" : "";

        item.innerHTML = `
            ${isOwner ? `
                <button type="button" class="item-menu-btn" data-post-id="${post.id}" aria-label="Post options">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5"/>
                        <circle cx="12" cy="12" r="1.5"/>
                        <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                </button>
                <div class="item-menu-dropdown" data-post-id="${post.id}">
                    <button type="button" class="edit-post-btn" data-post-id="${post.id}">Edit post</button>
                    <button type="button" class="visibility-btn" data-post-id="${post.id}" data-set="${post.visibility === 'private' ? 'public' : 'private'}">
                        ${post.visibility === 'private' ? 'Make public' : 'Make private'}
                    </button>
                    <button type="button" class="archive-post-btn" data-post-id="${post.id}" data-set="${post.visibility === 'archived' ? 'public' : 'archived'}">
                        ${post.visibility === 'archived' ? 'Unarchive' : 'Archive post'}
                    </button>
                    <button type="button" class="delete-post-btn" data-post-id="${post.id}">Delete post</button>
                </div>
            ` : ""}
            <div class="thumbnail">
                ${mediaHTML}
                <span class="media-type">${post.media_type}</span>
            </div>
            <div class="item-info">
                <div class="item-text">
                    <span class="item-title">${post.title || ""}</span>
                    <span class="item-caption">${post.caption}</span>
                    <span class="item-meta">
                        <a href="profile.html?id=${post.user_id}" class="item-meta-link">@${post.users.username}</a>
                        posted this ${uploadedText}${editedText}
                    </span>
                </div>
            </div>
        `;

        item.addEventListener("click", (e) => {
            if (
                e.target.closest(".item-menu-btn") ||
                e.target.closest(".item-menu-dropdown") ||
                e.target.closest(".item-meta-link")
            ) {
                return;
            }
            sessionStorage.setItem("timelineScroll", window.scrollY);
            window.location.href = `post.html?id=${post.id}`;
        });

        timeline.appendChild(item);
    });

    document.querySelectorAll(".item-menu-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = document.querySelector(`.item-menu-dropdown[data-post-id="${btn.dataset.postId}"]`);
            document.querySelectorAll(".item-menu-dropdown").forEach((d) => {
                if (d !== dropdown) d.classList.remove("active");
            });
            dropdown.classList.toggle("active");
        });
    });

    document.querySelectorAll(".delete-post-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const confirmed = confirm("Delete this post permanently? This cannot be undone.");
            if (!confirmed) return;

            const { error } = await supabaseClient
                .from("posts")
                .delete()
                .eq("id", btn.dataset.postId);

            if (error) {
                showToast("Failed to delete post: " + error.message, "error");
                return;
            }

            btn.closest(".timeline-item").remove();
        });
    });

    document.querySelectorAll(".edit-post-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `create-post.html?edit=${btn.dataset.postId}`;
        });
    });

    document.querySelectorAll(".visibility-btn, .archive-post-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const newVisibility = btn.dataset.set;

            const { error } = await supabaseClient
                .from("posts")
                .update({ visibility: newVisibility })
                .eq("id", btn.dataset.postId);

            if (error) {
                showToast("Failed to update post: " + error.message, "error");
                return;
            }

            showToast(`Post ${newVisibility === "archived" ? "archived" : newVisibility === "private" ? "set to private" : "made public"}`, "success");

            if (newVisibility !== "public") {
                btn.closest(".timeline-item").remove();
            }
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".item-menu-dropdown").forEach((d) => d.classList.remove("active"));
    });
}

function formatViews(count) {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M views";
    if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K views";
    return count + " views";
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

loadTimeline();