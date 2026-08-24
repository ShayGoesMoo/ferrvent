async function loadWhoToFollow() {
    const listEl = document.getElementById("who-to-follow-list");

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const currentUserId = session.user.id;

    // 1. get people the user already follows
    const { data: existingFollows, error: followsError } = await supabaseClient
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

    if (followsError) {
        console.error("Failed to load follows:", followsError.message);
        return;
    }

    const followingIds = new Set(existingFollows.map(f => f.following_id));

    // 2. get a pool of users, excluding self
    const { data: users, error: usersError } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url")
        .neq("id", currentUserId)
        .limit(50); // pool to shuffle from

    if (usersError) {
        console.error("Failed to load users:", usersError.message);
        return;
    }

    // 3. filter out already-followed, shuffle, take 5
    const eligible = users.filter(u => !followingIds.has(u.id));

    for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }

    const picks = eligible.slice(0, 5);

    if (picks.length === 0) {
        listEl.innerHTML = "";
        return;
    }

    listEl.innerHTML = picks.map(user => `
        <a href="/profile/?id=${user.id}" class="who-to-follow-item">
            <img class="who-to-follow-avatar" src="${user.avatar_url || '/assets/pfp.png'}" alt="">
            <div class="who-to-follow-name">
                <span class="who-to-follow-display">${user.display_name || user.username}</span>
                <span class="who-to-follow-username">@${user.username}</span>
            </div>
        </a>
    `).join("");
}

loadWhoToFollow();