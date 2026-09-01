async function updateAuthButton() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const authBtn = document.getElementById("logout-btn");

    if (session) {
        authBtn.textContent = "Logout";
        authBtn.onclick = handleLogout;
    } else {
        authBtn.textContent = "Login";
        authBtn.onclick = () => {
            window.location.href = "login.html";
        };
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showToast("Error logging out: " + error.message, "error");
        return;
    }

    window.location.href = "login.html";
}

updateAuthButton();

supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthButton();
});

async function updateNavAvatar() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const navAvatarImg = document.querySelector(".user img");

    if (!navAvatarImg) return; // page might not have this element

    if (!session) {
        return; // leave default placeholder for logged-out state
    }

    const { data: userRow, error } = await supabaseClient
        .from("users")
        .select("avatar_url")
        .eq("id", session.user.id)
        .single();

    if (error) {
        console.error("Failed to load nav avatar:", error);
        return;
    }

    if (userRow.avatar_url) {
        navAvatarImg.src = userRow.avatar_url;
    }
}

updateNavAvatar();