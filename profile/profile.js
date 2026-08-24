async function loadProfile() {
    const params = new URLSearchParams(window.location.search);
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../auth/";
        return;
    }

    const currentUserId = session.user.id;
    const profileId = params.get("id") || currentUserId;
    const isOwnProfile = profileId === currentUserId;

    // 1. load the profile's user row
    const { data: profileUser, error: userError } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url, bio")
        .eq("id", profileId)
        .single();

    if (userError || !profileUser) {
        console.error("Failed to load profile:", userError?.message);
        return;
    }

    document.getElementById("profile-avatar").src = profileUser.avatar_url || "/assets/pfp.png";
    document.getElementById("profile-display-name").textContent = profileUser.display_name || profileUser.username;
    document.getElementById("profile-username").textContent = `@${profileUser.username}`;
    document.getElementById("profile-bio").textContent = profileUser.bio || "No bio yet.";

    // 2. show edit or follow button depending on whose profile this is
    if (isOwnProfile) {
        document.getElementById("profile-edit-btn").style.display = "inline-flex";
    } else {
        const followBtn = document.getElementById("profile-follow-btn");
        followBtn.style.display = "inline-flex";

        const { data: existingFollow } = await supabaseClient
            .from("follows")
            .select("follower_id")
            .eq("follower_id", currentUserId)
            .eq("following_id", profileId)
            .maybeSingle();

        let isFollowing = !!existingFollow;
        followBtn.textContent = isFollowing ? "Following" : "Follow";

        followBtn.addEventListener("click", async () => {
            if (isFollowing) {
                await supabaseClient
                    .from("follows")
                    .delete()
                    .eq("follower_id", currentUserId)
                    .eq("following_id", profileId);
                isFollowing = false;
                followBtn.textContent = "Follow";
            } else {
                await supabaseClient
                    .from("follows")
                    .insert([{ follower_id: currentUserId, following_id: profileId }]);
                isFollowing = true;
                followBtn.textContent = "Following";
            }
            loadStats(profileId);
        });
    }

    // 3. stats
    loadStats(profileId);

    // 4. posts grid
    const { data: posts, error: postsError } = await supabaseClient
        .from("posts")
        .select("id, media_url, media_type")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

    if (postsError) {
        console.error("Failed to load posts:", postsError.message);
        return;
    }

    const gridEl = document.getElementById("profile-post-grid");
    const emptyEl = document.getElementById("profile-empty");
    const emptyText = document.getElementById("profile-empty-text");
    const mediaPosts = posts.filter(post => post.media_url);

    if (mediaPosts.length === 0) {
        gridEl.style.display = "none";
        emptyEl.style.display = "flex";
        emptyText.textContent = isOwnProfile ? "You haven't posted anything yet" : "No posts yet";
    } else {
        gridEl.style.display = "grid";
        emptyEl.style.display = "none";
        gridEl.innerHTML = mediaPosts
            .map(post => `<img src="${post.media_url}" alt="" onclick="window.location.href='/dashboard/post/?id=${post.id}'">`)
            .join("");
    }
}

async function loadStats(profileId) {
    const { count: postCount } = await supabaseClient
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId);

    const { count: followerCount } = await supabaseClient
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profileId);

    const { count: followingCount } = await supabaseClient
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", profileId);

    document.getElementById("profile-post-count").textContent = postCount ?? 0;
    document.getElementById("profile-follower-count").textContent = followerCount ?? 0;
    document.getElementById("profile-following-count").textContent = followingCount ?? 0;
    document.getElementById("stat-followers").addEventListener("click", () => openFollowModal(profileId, "followers"));
    document.getElementById("stat-following").addEventListener("click", () => openFollowModal(profileId, "following"));
}

const followModal = document.getElementById("follow-modal");
const followModalTitle = document.getElementById("follow-modal-title");
const followModalList = document.getElementById("follow-modal-list");
const followModalClose = document.getElementById("follow-modal-close");

async function openFollowModal(profileId, mode) {
    followModalTitle.textContent = mode === "followers" ? "Followers" : "Following";
    followModalList.innerHTML = `<div class="follow-modal-empty">Loading...</div>`;
    followModal.classList.add("open");

    const column = mode === "followers" ? "following_id" : "follower_id";
    const idColumn = mode === "followers" ? "follower_id" : "following_id";

    const { data: rows, error } = await supabaseClient
        .from("follows")
        .select(idColumn)
        .eq(column, profileId);

    if (error) {
        followModalList.innerHTML = `<div class="follow-modal-empty">Failed to load</div>`;
        return;
    }

    if (!rows || rows.length === 0) {
        followModalList.innerHTML = `<div class="follow-modal-empty">${mode === "followers" ? "No followers yet" : "Not following anyone yet"}</div>`;
        return;
    }

    const userIds = rows.map(r => r[idColumn]);

    const { data: users, error: usersError } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

    if (usersError || !users) {
        followModalList.innerHTML = `<div class="follow-modal-empty">Failed to load</div>`;
        return;
    }

    followModalList.innerHTML = users.map(user => `
        <a href="/profile/?id=${user.id}" class="search-result-item">
            <img class="search-result-avatar" src="${user.avatar_url || '/assets/pfp.png'}" alt="">
            <div class="search-result-name">
                <span class="search-result-display">${user.display_name || user.username}</span>
                <span class="search-result-username">@${user.username}</span>
            </div>
        </a>
    `).join("");
}

followModalClose.addEventListener("click", () => {
    followModal.classList.remove("open");
});

followModal.addEventListener("click", (e) => {
    if (e.target === followModal) {
        followModal.classList.remove("open");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && followModal.classList.contains("open")) {
        followModal.classList.remove("open");
    }
});

loadProfile();