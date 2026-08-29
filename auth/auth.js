document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        document.getElementById("login-form").style.display = tab.dataset.tab === "login" ? "flex" : "none";
        document.getElementById("register-form").style.display = tab.dataset.tab === "register" ? "flex" : "none";
    });
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginForm = document.getElementById("login-form");
    loginUser(loginForm);
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const registerForm = document.getElementById("register-form");
    registerUser(registerForm);
});

async function resolveLoginEmail(identifier) {
    // if it already looks like an email, just use it directly
    if (identifier.includes("@")) {
        return identifier;
    }

    const { data, error } = await supabaseClient.rpc("get_email_for_login", { identifier });

    if (error || !data) {
        return null; // username not found
    }

    return data;
}

async function loginUser(loginForm) {
    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;

    const email = await resolveLoginEmail(identifier);

    if (!email) {
        alert("No account found with that username.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Login failed: " + error.message);
        return;
    }

    window.location.href = "/dashboard/";
}

async function registerUser(registerForm) {
    // --- unchanged, keep exactly as-is ---
    const usernameValid = validateUsername();
    const passwordValid = validatePassword();
    const confirmValid = validateConfirmPassword();

    if (!usernameValid || !passwordValid || !confirmValid) {
        return;
    }

    const username = usernameInput.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { data: existingUsername } = await supabaseClient
        .from("users")
        .select("username")
        .ilike("username", username)
        .maybeSingle();

    if (existingUsername) {
        setState(usernameInput, usernameHint, false, "That username is already taken");
        return;
    }

    const { data: existingEmail } = await supabaseClient
        .from("users")
        .select("email_address")
        .ilike("email_address", email)
        .maybeSingle();

    if (existingEmail) {
        setState(emailInput, emailHint, false, "An account with this email already exists");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        if (error.message.includes("already registered") || error.status === 422) {
            alert("This email is already registered. Please log in or use a different email.");
        } else {
            alert("Error creating account: " + error.message);
        }
        return;
    }

    const { error: insertError } = await supabaseClient.from("users").insert([
        {
            id: data.user.id,
            username: username,
            email_address: email,
        },
    ]);

    if (insertError) {
        alert("Account created, but user save failed: " + insertError.message);
        return;
    }

    window.location.href = "/dashboard/";
}