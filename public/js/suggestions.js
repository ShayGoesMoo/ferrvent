document.getElementById("suggestion-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        showToast("You need to be logged in to submit a suggestion.", "error");
        return;
    }

    const issueText = document.getElementById("issue-text").value.trim();
    const statusEl = document.getElementById("suggestions-status");

    // grab the user's current display name to attach to the suggestion
    const { data: userRow, error: userError } = await supabaseClient
        .from("users")
        .select("display_name")
        .eq("id", session.user.id)
        .single();

    if (userError) {
        statusEl.textContent = "Failed to load your profile info.";
        return;
    }

    const { error: insertError } = await supabaseClient
        .from("suggestions")
        .insert([
            {
                user_id: session.user.id,
                display_name: userRow.display_name,
                issue_text: issueText,
            },
        ]);

    if (insertError) {
        statusEl.textContent = "Failed to submit: " + insertError.message;
        return;
    }

    statusEl.textContent = "Thanks! Your suggestion has been submitted.";
    e.target.reset();
});