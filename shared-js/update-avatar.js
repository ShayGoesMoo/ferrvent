async function updateAvatar() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const avatarImg = document.querySelector(".profile-avatar");
    const profileName = document.querySelector(".profile-name");
    const profileBlog = document.querySelector(".profile-blog");

    if (!avatarImg) return; // page might not have this element

    if (!session) {
        return; // leave default placeholder for logged-out state
    }

    const { data: userRow, error } = await supabaseClient
        .from("users")
        .select("avatar_url, display_name, username")
        .eq("id", session.user.id)
        .single();

    if (error) {
        console.error("Failed to load:", error);
        return;
    }

    if (userRow.avatar_url) {
        avatarImg.src = userRow.avatar_url;
    }

    if (profileName) {
        profileName.textContent = userRow
            ? `${userRow.display_name || userRow.username}`
            : "Guest";
        profileBlog.textContent = "@" + userRow.username || "Guest";
    }
}

updateAvatar();