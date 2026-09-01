async function loadNotifications() {
    const list = document.getElementById("notifications-list");
    list.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading...</div>`;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
        return;
    }

    const { data: notifs, error } = await supabaseClient
        .from("notifications")
        .select("id, type, post_id, is_read, created_at, users!notifications_actor_id_fkey(username, avatar_url), posts(title, caption)")
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false });

    if (error) {
        list.innerHTML = `<div class="empty-state"><div class="empty-title">Something went wrong</div></div>`;
        return;
    }

    if (notifs.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-title">No notifications yet</div></div>`;
        return;
    }

    list.innerHTML = "";

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

    notifs.forEach((n) => {
        const item = document.createElement(n.post_id ? "a" : "div");
        if (n.post_id) item.href = `post.html?id=${n.post_id}`;
        item.className = "notif-item" + (n.is_read ? "" : " unread");

        const avatarSrc = n.users.avatar_url || "../assets/default profile picture.png";
        const snippet = buildNotifSnippet(n.posts);

        let message;
        if (n.type === "like") message = `liked your post${snippet}`;
        else if (n.type === "follow") message = "started following you";
        else if (n.type === "comment") message = `commented on your post${snippet}`;

        item.innerHTML = `
            <img class="notif-avatar" src="${avatarSrc}" alt="">
            <div class="notif-text">
                <span><b>${n.users.username}</b> ${message}</span>
                <span class="notif-time">${formatUploaded(n.created_at)}</span>
            </div>
        `;

        list.appendChild(item);
    });

    // mark all as read now that they've been viewed
    await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", session.user.id)
        .eq("is_read", false);
}

function formatUploaded(dateStr) {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

loadNotifications();