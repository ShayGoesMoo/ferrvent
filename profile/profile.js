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

    // 1. profile info
    const { data: profileUser, error: userError } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url, banner_url, bio, created_at")
        .eq("id", profileId)
        .single();

    if (userError || !profileUser) {
        console.error("Failed to load profile:", userError?.message);
        return;
    }

    document.getElementById("profile-avatar").src = profileUser.avatar_url || "/assets/pfp.png";
    document.getElementById("header-img").src = profileUser.banner_url || "/assets/bnr.png";
    document.getElementById("profile-display-name").textContent = profileUser.display_name || profileUser.username;
    document.getElementById("profile-username").textContent = `@${profileUser.username}`;
    document.getElementById("profile-bio").textContent = profileUser.bio || "No bio yet.";
    document.getElementById("profile-joindate").textContent = `Member since ${formatDate(profileUser.created_at)}`;

    if (isOwnProfile) {
        document.getElementById("profile-edit-btn").style.display = "inline-flex";
    } else {
        setupFollowButton(currentUserId, profileId);
    }

    // 2. posts
    loadPosts(profileId);

    // 3. best friends
    loadBestFriends(profileId);

    // 4. stats
    loadStats(profileId);
}

function formatDate(isoString) {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

let allPosts = [];
let activeTab = "photos";

async function loadPosts(profileId) {
    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, media_url, media_type, caption, title, created_at")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to load posts:", error.message);
        return;
    }

    allPosts = posts;
    renderPosts();
}

function renderPosts() {
    const contentEl = document.getElementById("posts-grid-content");

    const filtered = allPosts.filter(post =>
        activeTab === "photos" ? post.media_type !== "story" : post.media_type === "story"
    );

    contentEl.classList.toggle("list-mode", activeTab === "text");

    if (filtered.length === 0) {
        contentEl.innerHTML = `<p class="posts-empty">Nothing here yet.</p>`;
        return;
    }

    if (activeTab === "photos") {
        contentEl.innerHTML = filtered.map(post => `
            <div class="post-card" onclick="window.location.href='/dashboard/post/?id=${post.id}'">
                <img class="post-thumb" src="${post.media_url}" alt="">
                <span class="post-caption">${truncate(post.title || post.caption || "", 24)}</span>
                <span class="post-date">${formatDate(post.created_at)}</span>
            </div>
        `).join("");
    } else {
        contentEl.innerHTML = filtered.map(post => `
            <div class="text-post-row" onclick="window.location.href='/dashboard/post/?id=${post.id}'">
                <span class="text-post-title">${post.title || post.caption || "Untitled"}</span>
                <span class="text-post-date">${formatDate(post.created_at)}</span>
            </div>
        `).join("");
    }
}

document.querySelectorAll(".tabs-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".tabs-btn.active").classList.remove("active");
        btn.classList.add("active");
        activeTab = btn.dataset.tab;
        renderPosts();
    });
});

async function loadBestFriends(profileId) {
    const { data: following, error: followingError } = await supabaseClient
        .from("follows")
        .select("following_id")
        .eq("follower_id", profileId);

    if (followingError) {
        console.error("Failed to load following:", followingError.message);
        return;
    }

    const followingIds = following.map(row => row.following_id);

    if (followingIds.length === 0) {
        renderFriendsEmpty();
        return;
    }

    const { data: mutuals, error: mutualsError } = await supabaseClient
        .from("follows")
        .select("follower_id")
        .eq("following_id", profileId)
        .in("follower_id", followingIds)
        .limit(5);

    if (mutualsError) {
        console.error("Failed to load mutuals:", mutualsError.message);
        return;
    }

    const friendIds = mutuals.map(row => row.follower_id);

    if (friendIds.length === 0) {
        renderFriendsEmpty();
        return;
    }

    const { data: friends } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url")
        .in("id", friendIds);

    document.getElementById("friends-list").innerHTML = friends.map(friend => `
        <a href="/profile/?id=${friend.id}" class="friend-item">
            <img class="friend-avatar" src="${friend.avatar_url || '/assets/pfp.png'}" alt="">
            <span class="friend-name">${friend.display_name || friend.username}</span>
        </a>
    `).join("");
}

function renderFriendsEmpty() {
    document.getElementById("friends-list").innerHTML = `
        <p class="friends-empty">No friends yet.</p>
    `;
}

async function getFriendCount(profileId) {
    const { data: following } = await supabaseClient
        .from("follows")
        .select("following_id")
        .eq("follower_id", profileId);

    const followingIds = (following || []).map(row => row.following_id);
    if (followingIds.length === 0) return 0;

    const { count } = await supabaseClient
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profileId)
        .in("follower_id", followingIds);

    return count || 0;
}

async function getTotalLikes(profileId) {
    const { data: userPosts } = await supabaseClient
        .from("posts")
        .select("id")
        .eq("user_id", profileId);

    const postIds = (userPosts || []).map(p => p.id);
    if (postIds.length === 0) return 0;

    const { count } = await supabaseClient
        .from("post_likes")
        .select("post_id", { count: "exact", head: true })
        .in("post_id", postIds);

    return count || 0;
}

async function loadStats(profileId) {
    const { count: postCount } = await supabaseClient
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId);

    const friendCount = await getFriendCount(profileId);
    const likeCount = await getTotalLikes(profileId);

    document.getElementById("stat-posts").textContent = postCount ?? 0;
    document.getElementById("stat-friends").textContent = friendCount ?? 0;
    document.getElementById("stat-likes").textContent = likeCount;
}

function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "…";
}

async function setupFollowButton(currentUserId, profileId) {
    const followBtn = document.getElementById("profile-follow-btn");
    followBtn.style.display = "inline-flex";

    async function getStatus() {
        const { data: iFollow } = await supabaseClient
            .from("follows")
            .select("follower_id")
            .eq("follower_id", currentUserId)
            .eq("following_id", profileId)
            .maybeSingle();

        const { data: theyFollow } = await supabaseClient
            .from("follows")
            .select("follower_id")
            .eq("follower_id", profileId)
            .eq("following_id", currentUserId)
            .maybeSingle();

        return { iFollow: !!iFollow, theyFollow: !!theyFollow };
    }

    function renderLabel(status) {
        if (status.iFollow && status.theyFollow) {
            followBtn.textContent = "Friends";
        } else if (status.iFollow) {
            followBtn.textContent = "Following";
        } else {
            followBtn.textContent = "Follow";
        }
    }

    let status = await getStatus();
    renderLabel(status);

    followBtn.addEventListener("click", async () => {
        if (status.iFollow) {
            // unfollow
            await supabaseClient
                .from("follows")
                .delete()
                .eq("follower_id", currentUserId)
                .eq("following_id", profileId);
        } else {
            // follow
            await supabaseClient
                .from("follows")
                .insert([{ follower_id: currentUserId, following_id: profileId }]);
        }

        status = await getStatus();
        renderLabel(status);
        loadStats(profileId); // refresh friend count in case mutual status changed
    });
}

loadProfile();