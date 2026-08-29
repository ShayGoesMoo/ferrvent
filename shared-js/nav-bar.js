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