async function updateAuthButton() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const authLink = document.getElementById("auth-link");
    const authLinkText = document.getElementById("auth-link-text");

    if (session) {
        authLinkText.textContent = "Log Out";
        authLink.href = "#";
        authLink.onclick = (e) => {
            e.preventDefault();
            authLinkText.textContent = "Logging out...";
            handleLogout();
        };
    } else {
        authLinkText.textContent = "Log in";
        authLink.href = "../auth/";
        authLink.onclick = null;
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showToast("Error logging out: " + error.message, "error");
        return;
    }

    window.location.href = "/auth/";
}

updateAuthButton();

supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthButton();
});