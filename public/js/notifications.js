async function updateUnreadBadge() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const badge = document.getElementById("notif-badge");
    if (!session || !badge) return;

    const { count } = await supabaseClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", session.user.id)
        .eq("is_read", false);

    if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "flex";
    } else {
        badge.style.display = "none";
    }
}

let lastCheckedTime = new Date().toISOString();

async function pollForNewNotifications() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: newNotifs, error } = await supabaseClient
        .from("notifications")
        .select("id, type, post_id, actor_id, created_at, users!notifications_actor_id_fkey(username), posts(title, caption)")
        .eq("recipient_id", session.user.id)
        .gt("created_at", lastCheckedTime)
        .order("created_at", { ascending: true });

    if (error || !newNotifs || newNotifs.length === 0) return;

    function truncateText(text, maxLength) {
        if (!text) return "";
        return text.length > maxLength ? text.slice(0, maxLength).trim() + "…" : text;
    }

    function buildNotifSnippet(post) {
        if (!post) return "";
        const text = post.title || post.caption || "";
        if (!text) return "";
        return `: "${truncateText(text, 40)}"`;
    }

    newNotifs.forEach((notif) => {
        const snippet = buildNotifSnippet(notif.posts);
        let message;

        if (notif.type === "like") {
            message = `${notif.users?.username ?? "Someone"} liked your post${snippet}`;
        } else if (notif.type === "follow") {
            message = `${notif.users?.username ?? "Someone"} started following you`;
        } else if (notif.type === "comment") {
            message = `${notif.users?.username ?? "Someone"} commented on your post${snippet}`;
        }

        showNotificationToast(message, notif);
    });

    lastCheckedTime = newNotifs[newNotifs.length - 1].created_at;
    updateUnreadBadge();
}

function startNotificationPolling() {
    pollForNewNotifications();
    setInterval(pollForNewNotifications, 20000);
}

const notificationSound = new Audio("../assets/sounds/incoming.m4a");

function showNotificationToast(message, notif) {
    const toast = document.createElement("div");
    toast.className = "notif-toast";

    const icon = notif.type === "like" ? "❤" : notif.type === "comment" ? "💬" : "＋";

    toast.innerHTML = `
        <div class="notif-toast-icon">${icon}</div>
        <div class="notif-toast-text">${message}</div>
    `;

    toast.addEventListener("click", () => {
        if (notif.post_id) {
            window.location.href = `post.html?id=${notif.post_id}`;
        } else {
            window.location.href = "notifications.html";
        }
    });

    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    notificationSound.currentTime = 0;
    notificationSound.play().catch(err => {
        console.warn("Sound blocked (likely no user interaction yet):", err);
    })

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 5000);
}

document.getElementById("notifications-btn")?.addEventListener("click", () => {
    window.location.href = "notifications.html";
});

updateUnreadBadge();
startNotificationPolling();