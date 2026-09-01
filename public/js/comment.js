document.querySelector(".comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = e.target.querySelector("input[type='text']");
    const commentText = input.value.trim();

    if (!commentText) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        alert("You need to be logged in to comment.");
        return;
    }

    const { error } = await supabaseClient
        .from("comments")
        .insert([
            {
                post_id: postId,
                user_id: session.user.id,
                comment_text: commentText,
            },
        ]);

    if (error) {
        alert("Failed to post comment: " + error.message);
        return;
    }

    input.value = "";
    loadComments(); // refresh the list to show the new comment
});
