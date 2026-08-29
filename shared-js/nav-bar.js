// Dropdown toggle
const trigger = document.querySelector('.profile-trigger');
const menu = document.querySelector('.dropdown-menu');

trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
    trigger.classList.toggle('open');
});

document.addEventListener('click', () => {
    menu.classList.remove('open');
    trigger.classList.remove('open');
});

// Default site banner (falls back to the site's own image on every page)
const siteBannerImg = document.getElementById('site-banner-img');
if (siteBannerImg && !siteBannerImg.getAttribute('src')) {
    siteBannerImg.src = '/assets/remi.png';
}

async function loadNavAvatar() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: currentUser } = await supabaseClient
        .from("users")
        .select("display_name, username, avatar_url")
        .eq("id", session.user.id)
        .single();

    if (!currentUser) return;

    const navAvatar = document.getElementById("nav-avatar");
    const navName = document.querySelector(".profile-name");
    const profileLink = document.getElementById("profile-link");

    if (navAvatar) navAvatar.src = currentUser.avatar_url || "/assets/pfp.png";
    if (navName) navName.textContent = currentUser.display_name || currentUser.username;
    if (profileLink) profileLink.href = `../profile/?user=${currentUser.username}`;
}

loadNavAvatar();