document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault(); // stops the page from reloading

    // --- Step 1: run all format validations ---
    const usernameValid = validateUsername();
    const passwordValid = validatePassword();
    const confirmValid = validateConfirmPassword();

    if (!usernameValid || !passwordValid || !confirmValid) {
        return; // hints are already showing the specific problem, nothing more to do
    }

    const name = document.getElementById("display_name").value;
    const username = usernameInput.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // --- Step 2: final authoritative availability check right before signup ---
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

    // --- Step 3: create the auth user ---
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        if (error.message.includes("already registered") || error.status === 422) {
            showToast("This email is already registered. Please log in or use a different email.", "error");
        } else {
            showToast("Error creating account: " + error.message, "error");
        }
        return;
    }

    // --- Step 4: insert the user into the users table ---
    const { error: insertError } = await supabaseClient.from("users").insert([
        {
            id: data.user.id,
            display_name: name,
            username: username,
            email_address: email,
        },
    ]);

    if (insertError) {
        showToast("Account created, but user save failed: " + insertError.message, "error");
        return;
    }

    showToast("Registration successful!", "success");
    window.location.href = "../html/index.html";
});