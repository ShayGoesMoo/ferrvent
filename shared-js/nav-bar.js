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

// Default site banner (now the only banner — shows on every page)
const siteBannerImg = document.getElementById('site-banner-img');
const siteBannerWrapper = document.getElementById('site-banner-wrapper');

if (siteBannerImg) {
    siteBannerImg.onload = () => {
        if (siteBannerWrapper) siteBannerWrapper.classList.remove('banner-loading');
    };
    siteBannerImg.src = '/assets/ferrvent-banner(3).png';
}

// banner art credit — update these two lines whenever the banner artwork changes
const bannerArtistUsername = "Hirayne"; // replace with the username of the artist
document.getElementById("banner-credit").href = `/profile/?user=${bannerArtistUsername}`;
document.getElementById("banner-credit-name").textContent = `@${bannerArtistUsername}`;

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
    if (profileLink) profileLink.href = `../../profile/?user=${currentUser.username}`;
}

loadNavAvatar();