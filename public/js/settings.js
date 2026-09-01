let currentUser = null;

async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return;
    }

    currentUser = session.user;

    const { data: userRow, error } = await supabaseClient
        .from("users")
        .select("display_name, username, avatar_url")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Failed to load user data:", error);
        return;
    }

    document.getElementById("display-name-input").value = userRow.display_name || "";
    document.getElementById("username-input").value = userRow.username || "";
    document.getElementById("bio-input").value = userRow.bio || "";

    if (userRow.avatar_url) {
        document.getElementById("current-avatar").src = userRow.avatar_url;
    }

    loadArchivedPosts(); // now currentUser is guaranteed to be set
    loadPrivatePosts();
}

// --- Display name ---
document.getElementById("display-name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = document.getElementById("display-name-input").value.trim();

    const { error } = await supabaseClient
        .from("users")
        .update({ display_name: newName })
        .eq("id", currentUser.id);

    if (error) {
        showToast("Failed to update display name: " + error.message, "error");
        return;
    }

    showToast("Display name updated.", "success");
});

// --- Username ---
document.getElementById("username-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById("username-input").value.trim();
    const statusEl = document.getElementById("username-status");

    const { error } = await supabaseClient
        .from("users")
        .update({ username: newUsername })
        .eq("id", currentUser.id);

    if (error) {
        // unique constraint violation shows up as a specific error code
        if (error.code === "23505") {
            statusEl.textContent = "That username is already taken.";
        } else {
            statusEl.textContent = "Failed to update username: " + error.message;
        }
        return;
    }

    statusEl.textContent = "Username updated.";
});

// new form handler
document.getElementById("bio-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newBio = document.getElementById("bio-input").value.trim();

    const { error } = await supabaseClient
        .from("users")
        .update({ bio: newBio })
        .eq("id", currentUser.id);

    if (error) {
        showToast("Failed to update bio: " + error.message, "error");
        return;
    }

    showToast("Bio updated.", "success");
});

// --- Password ---
document.getElementById("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("new-password-input").value;
    const confirmPassword = document.getElementById("confirm-password-input").value;

    if (newPassword !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
        showToast("Failed to update password: " + error.message, "error");
        return;
    }

    showToast("Password updated.", "success");
    e.target.reset();
});

// --- Profile picture ---
document.getElementById("avatar-btn").addEventListener("click", () => {
    document.getElementById("avatar-input").click();
});

document.getElementById("avatar-input").addEventListener("change", async () => {
    const file = document.getElementById("avatar-input").files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast("Image must be under 5MB.", "error");
        return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${currentUser.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        showToast("Failed to upload picture: " + uploadError.message, "error");
        return;
    }

    const { data: urlData } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(filePath);

    // cache-bust so the new image shows immediately instead of a stale cached version
    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabaseClient
        .from("users")
        .update({ avatar_url: freshUrl })
        .eq("id", currentUser.id);

    if (updateError) {
        showToast("Failed to save picture: " + updateError.message, "error");
        return;
    }

    document.getElementById("current-avatar").src = freshUrl;
});

async function loadArchivedPosts() {
    const list = document.getElementById("archived-posts-list");
    if (!list) return;

    list.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, title, caption, media_type, thumbnail_url, media_url")
        .eq("user_id", currentUser.id)
        .eq("visibility", "archived")
        .order("created_at", { ascending: false });

    if (error) {
        list.innerHTML = `<p class="settings-hint">Couldn't load archived posts.</p>`;
        return;
    }

    if (posts.length === 0) {
        list.innerHTML = `<p class="settings-hint">No archived posts.</p>`;
        return;
    }

    list.innerHTML = "";

    posts.forEach((post) => {
        const item = document.createElement("div");
        item.className = "archived-post-item";
        item.innerHTML = `
            <span class="archived-post-title">${post.title || post.caption || "Untitled"}</span>
            <button type="button" class="unarchive-btn" data-post-id="${post.id}">Unarchive</button>
        `;
        list.appendChild(item);
    });

    document.querySelectorAll(".unarchive-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const { error } = await supabaseClient
                .from("posts")
                .update({ visibility: "public" })
                .eq("id", btn.dataset.postId);

            if (error) {
                showToast("Failed to unarchive: " + error.message, "error");
                return;
            }

            showToast("Post unarchived", "success");
            loadArchivedPosts();
        });
    });
}

async function loadPrivatePosts() {
    const list = document.getElementById("private-posts-list");
    if (!list) return;

    list.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, title, caption, media_type, thumbnail_url, media_url")
        .eq("user_id", currentUser.id)
        .eq("visibility", "private")
        .order("created_at", { ascending: false });

    if (error) {
        list.innerHTML = `<p class="settings-hint">Couldn't load private posts.</p>`;
        return;
    }

    if (posts.length === 0) {
        list.innerHTML = `<p class="settings-hint">No private posts.</p>`;
        return;
    }

    list.innerHTML = "";

    posts.forEach((post) => {
        const item = document.createElement("div");
        item.className = "archived-post-item"; // reuse the same styling
        item.innerHTML = `
            <span class="archived-post-title">${post.title || post.caption || "Untitled"}</span>
            <button type="button" class="make-public-btn" data-post-id="${post.id}">Make public</button>
        `;
        list.appendChild(item);
    });

    document.querySelectorAll(".make-public-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const { error } = await supabaseClient
                .from("posts")
                .update({ visibility: "public" })
                .eq("id", btn.dataset.postId);

            if (error) {
                showToast("Failed to update post: " + error.message, "error");
                return;
            }

            showToast("Post made public", "success");
            loadPrivatePosts();
        });
    });
}

// --- Delete account ---
document.getElementById("delete-account-btn").addEventListener("click", async () => {
    const confirmed = confirm("Are you sure you want to permanently delete your account? This cannot be undone.");
    if (!confirmed) return;

    const doubleConfirmed = confirm("This is your last chance. Delete your account and all your posts permanently?");
    if (!doubleConfirmed) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.access_token}`,
        },
    });

    const result = await response.json();

    if (!response.ok) {
        showToast("Failed to delete account: " + result.error, "error");
        return;
    }

    showToast("Your account has been deleted.", "success");
    window.location.href = "index.html";
});

init();
