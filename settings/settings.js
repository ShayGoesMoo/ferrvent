let currentUser = null;
let selectedInterests = [];

async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../auth/";
        return;
    }

    currentUser = session.user;

    const { data: userRow, error } = await supabaseClient
        .from("users")
        .select("display_name, username, bio, avatar_url, interests")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Failed to load user data:", error);
        return;
    }

    document.getElementById("display-name-input").value = userRow.display_name || "";
    document.getElementById("username-input").value = userRow.username || "";
    document.getElementById("bio-input").value = userRow.bio || "";
    document.getElementById("email-input").value = currentUser.email || "";

    if (userRow.avatar_url) {
        document.getElementById("current-avatar").src = userRow.avatar_url;
    }

    selectedInterests = userRow.interests || [];
    renderInterestPicker();
}

function renderInterestPicker() {
    document.querySelectorAll("#interests-picker .tag-option").forEach(btn => {
        btn.classList.toggle("selected", selectedInterests.includes(btn.dataset.tag));
    });
}

document.querySelectorAll("#interests-picker .tag-option").forEach(btn => {
    btn.addEventListener("click", () => {
        const tag = btn.dataset.tag;
        if (selectedInterests.includes(tag)) {
            selectedInterests = selectedInterests.filter(t => t !== tag);
        } else {
            selectedInterests.push(tag);
        }
        renderInterestPicker();
    });
});

document.getElementById("interests-save-btn").addEventListener("click", async () => {
    const { error } = await supabaseClient
        .from("users")
        .update({ interests: selectedInterests })
        .eq("id", currentUser.id);

    if (error) {
        alert("Failed to update interests: " + error.message, "error");
        return;
    }

    alert("Interests updated.", "success");
});


/* ============================
   TAB SWITCHING
   ============================ */
document.querySelectorAll(".settings-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelector(".settings-tab.active").classList.remove("active");
        tab.classList.add("active");

        document.querySelector(".settings-panel.active").classList.remove("active");
        document.getElementById(`panel-${tab.dataset.panel}`).classList.add("active");
    });
});

function activateTab(panelName) {
    const targetTab = document.querySelector(`.settings-tab[data-panel="${panelName}"]`);
    const targetPanel = document.getElementById(`panel-${panelName}`);

    if (!targetTab || !targetPanel) return;

    document.querySelector(".settings-tab.active")?.classList.remove("active");
    targetTab.classList.add("active");

    document.querySelector(".settings-panel.active")?.classList.remove("active");
    targetPanel.classList.add("active");
}

// on page load, check the URL for a requested tab
const params = new URLSearchParams(window.location.search);
const requestedTab = params.get("tab");

if (requestedTab) {
    activateTab(requestedTab);
}


/* ============================
   ACCOUNT — display name
   ============================ */
document.getElementById("display-name-save-btn").addEventListener("click", async () => {
    const newName = document.getElementById("display-name-input").value.trim();

    const { error } = await supabaseClient
        .from("users")
        .update({ display_name: newName })
        .eq("id", currentUser.id);

    if (error) {
        alert("Failed to update display name: " + error.message, "error");
        return;
    }

    alert("Display name updated.", "success");
});


/* ============================
   ACCOUNT — username
   ============================ */
document.getElementById("username-save-btn").addEventListener("click", async () => {
    const newUsername = document.getElementById("username-input").value.trim();
    const statusEl = document.getElementById("username-status");

    const { error } = await supabaseClient
        .from("users")
        .update({ username: newUsername })
        .eq("id", currentUser.id);

    if (error) {
        statusEl.textContent = error.code === "23505"
            ? "That username is already taken."
            : "Failed to update username: " + error.message;
        return;
    }

    statusEl.textContent = "Username updated.";
});


/* ============================
   ACCOUNT — email
   ============================ */
document.getElementById("email-save-btn").addEventListener("click", async () => {
    const newEmail = document.getElementById("email-input").value.trim();
    const statusEl = document.getElementById("email-status");

    const { error } = await supabaseClient.auth.updateUser({ email: newEmail });

    if (error) {
        statusEl.textContent = "Failed to update email: " + error.message;
        return;
    }

    statusEl.textContent = "Check your new email inbox to confirm the change.";
});


/* ============================
   ACCOUNT — password
   ============================ */
document.getElementById("password-save-btn").addEventListener("click", async () => {
    const newPassword = document.getElementById("new-password-input").value;
    const confirmPassword = document.getElementById("confirm-password-input").value;

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match.", "error");
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
        alert("Failed to update password: " + error.message, "error");
        return;
    }

    alert("Password updated.", "success");
    document.getElementById("new-password-input").value = "";
    document.getElementById("confirm-password-input").value = "";
});


/* ============================
   PROFILE — bio
   ============================ */
document.getElementById("bio-save-btn").addEventListener("click", async () => {
    const newBio = document.getElementById("bio-input").value.trim();

    const { error } = await supabaseClient
        .from("users")
        .update({ bio: newBio })
        .eq("id", currentUser.id);

    if (error) {
        alert("Failed to update bio: " + error.message, "error");
        return;
    }

    alert("Bio updated.", "success");
});


/* ============================
   PROFILE — avatar upload
   ============================ */
document.getElementById("avatar-btn").addEventListener("click", () => {
    document.getElementById("avatar-input").click();
});

document.getElementById("avatar-input").addEventListener("change", async () => {
    const file = document.getElementById("avatar-input").files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5MB.", "error");
        return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${currentUser.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        alert("Failed to upload picture: " + uploadError.message, "error");
        return;
    }

    const { data: urlData } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(filePath);

    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabaseClient
        .from("users")
        .update({ avatar_url: freshUrl })
        .eq("id", currentUser.id);

    if (updateError) {
        alert("Failed to save picture: " + updateError.message, "error");
        return;
    }

    document.getElementById("current-avatar").src = freshUrl;
    alert("Profile picture updated.", "success");
});


/* ============================
   ACCOUNT — delete account
   ============================ */
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
        alert("Failed to delete account: " + result.error, "error");
        return;
    }

    alert("Your account has been deleted.", "success");
    window.location.href = "../";
});

init();