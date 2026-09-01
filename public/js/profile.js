const params = new URLSearchParams(window.location.search);
const profileUserId = params.get("id");

async function loadProfile() {
    if (!profileUserId) {
        window.location.href = "index.html";
        return;
    }

    const { data: profileUser, error } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url, bio")
        .eq("id", profileUserId)
        .single();

    if (error || !profileUser) {
        document.querySelector(".profile-view").innerHTML = `
            <div class="empty-state">
                <div class="empty-title">User not found</div>
            </div>
        `;
        return;
    }

    document.getElementById("profile-avatar").src = profileUser.avatar_url || "../assets/default profile picture.png";
    document.getElementById("profile-display-name").textContent = profileUser.display_name || profileUser.username;
    document.getElementById("profile-username").textContent = "@" + profileUser.username;
    document.getElementById("profile-bio").textContent = profileUser.bio || "";

    const { data: { session } } = await supabaseClient.auth.getSession();
    const isOwnProfile = session && session.user.id === profileUserId;

    if (isOwnProfile) {
        const editSlot = document.getElementById("profile-edit-slot");
        editSlot.innerHTML = `<button type="button" class="edit-profile-btn" id="edit-profile-btn">Edit Profile</button>`;
        document.getElementById("edit-profile-btn").addEventListener("click", () => {
            window.location.href = "settings.html";
        });
    }

    loadFollowCounts();
    loadProfilePosts(isOwnProfile);
}

async function loadFollowCounts() {
    const { count: followingCount } = await supabaseClient
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileUserId);

    const { count: followerCount } = await supabaseClient
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileUserId);

    document.getElementById("profile-following-count").textContent = followingCount ?? 0;
    document.getElementById("profile-follower-count").textContent = followerCount ?? 0;
}

async function loadProfilePosts(isOwnProfile) {
    const timeline = document.getElementById("profile-timeline");
    timeline.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    let query = supabaseClient
        .from("posts")
        .select("id, media_url, media_type, thumbnail_url, title, caption, created_at, visibility")
        .eq("user_id", profileUserId)
        .order("created_at", { ascending: false });

    // visitors only see public posts; owners see everything except archived (archived stays in Settings)
    if (!isOwnProfile) {
        query = query.eq("visibility", "public");
    } else {
        query = query.neq("visibility", "archived");
    }

    const { data: posts, error } = await query;

    if (error) {
        timeline.innerHTML = `<div class="empty-state"><div class="empty-title">Couldn't load posts</div></div>`;
        return;
    }

    if (posts.length === 0) {
        timeline.innerHTML = `<div class="empty-state"><div class="empty-title">No posts yet</div></div>`;
        return;
    }

    timeline.innerHTML = "";

    posts.forEach((post) => {
        const item = document.createElement("a");
        item.href = `post.html?id=${post.id}`;
        item.className = "timeline-item";

        let mediaHTML;
        if (post.media_type === "text") {
            mediaHTML = `<div class="text-thumb-placeholder"></div>`;
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

        item.innerHTML = `
            <div class="thumbnail">
                ${mediaHTML}
                <span class="media-type">${post.media_type}</span>
            </div>
            <div class="item-info">
                <div class="item-text">
                    <span class="item-title">${post.title || ""}</span>
                    <span class="item-caption">${post.caption || ""}</span>
                </div>
            </div>
        `;

        timeline.appendChild(item);
    });
}

loadProfile();

document.getElementById("following-stat").addEventListener("click", () => {
    openFollowModal("Following", "follower_id", profileUserId, "following_id");
});

document.getElementById("follower-stat").addEventListener("click", () => {
    openFollowModal("Followers", "following_id", profileUserId, "follower_id");
});

document.getElementById("follow-modal-close").addEventListener("click", closeFollowModal);
document.getElementById("follow-modal").addEventListener("click", (e) => {
    if (e.target.id === "follow-modal") closeFollowModal();
});

function closeFollowModal() {
    document.getElementById("follow-modal").classList.remove("active");
}

async function openFollowModal(title, filterColumn, filterValue, targetColumn) {
    const modal = document.getElementById("follow-modal");
    const list = document.getElementById("follow-modal-list");
    const titleEl = document.getElementById("follow-modal-title");

    titleEl.textContent = title;
    list.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    modal.classList.add("active");

    // fetch the follow rows, then the target column tells us which user id to look up (the *other* person)
    const { data: rows, error } = await supabaseClient
        .from("follows")
        .select(targetColumn)
        .eq(filterColumn, filterValue);

    if (error || !rows || rows.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-title">No ${title.toLowerCase()} yet</div></div>`;
        return;
    }

    const userIds = rows.map((r) => r[targetColumn]);

    const { data: users, error: usersError } = await supabaseClient
        .from("users")
        .select("id, username, avatar_url")
        .in("id", userIds);

    if (usersError || !users) {
        list.innerHTML = `<div class="empty-state"><div class="empty-title">Couldn't load list</div></div>`;
        return;
    }

    list.innerHTML = "";

    users.forEach((u) => {
        const item = document.createElement("a");
        item.href = `profile.html?id=${u.id}`;
        item.className = "follow-list-item";
        item.innerHTML = `
            <img class="follow-list-avatar" src="${u.avatar_url || '../assets/default profile picture.png'}" alt="">
            <span class="follow-list-username">@${u.username}</span>
        `;
        list.appendChild(item);
    });
}