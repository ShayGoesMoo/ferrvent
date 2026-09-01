document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;

    let email = identifier;

    // if it doesn't look like an email, treat it as a username and fetch the corresponding email from the database
    if (!identifier.includes("@")) {
        const { data: userRow, error: lookupError } = await supabaseClient
            .from("public_lookup")
            .select("email_address")
            .eq("username", identifier)
            .single();
        
        if (lookupError || !userRow) {
            showToast("No account found with that username.");
            return;
        }

        email = userRow.email_address;
    }

    // sign in with whichever email we resolved
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showToast("Login failed: " + error.message);
        return;
    }

    showToast("Login successful!");
    window.location.href = "/dashboard/"; // redirect to the index page after successful login
});