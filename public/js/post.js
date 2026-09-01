const fullscreenBtn = document.getElementById("fullscreen-btn");
const lightbox = document.getElementById("lightbox");
const lightboxMedia = document.getElementById("lightbox-media");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");

let lightboxVideo = null;
let lightboxControlsInitialized = false;

fullscreenBtn.addEventListener("click", () => {
    const postVideo = document.querySelector(".post-media video");

    if (postVideo) {
        // Video post — build/reuse a video element inside the lightbox
        lightboxImage.style.display = "none";

        if (!lightboxVideo) {
            lightboxVideo = document.createElement("video");
            lightboxVideo.id = "lightbox-video-element";
            lightboxVideo.playsInline = true;
            lightboxMedia.insertBefore(lightboxVideo, lightboxMedia.firstChild);
        }

        lightboxVideo.src = postVideo.src;
        lightboxVideo.currentTime = postVideo.currentTime;
        lightboxVideo.style.display = "block";

        const lightboxTitleOverlay = document.getElementById("lightbox-title-overlay");
        lightboxTitleOverlay.style.display = "block";
        lightboxTitleOverlay.textContent = document.getElementById("video-title-overlay").textContent;

        document.getElementById("lightbox-video-controls").style.display = "block";

        if (!lightboxControlsInitialized) {
            setupCustomControls(lightboxVideo, "lightbox-");
            lightboxControlsInitialized = true;
        }

        postVideo.pause(); // pause the post-page player so it's not playing behind the lightbox
        lightboxVideo.play();
    } else {
        // Image post
        const postImage = document.getElementById("post-image");
        lightboxImage.src = postImage.src;
        lightboxImage.style.display = "block";
    }

    lightbox.classList.add("active");
});

lightboxClose.addEventListener("click", () => {
    lightbox.classList.remove("active");
    if (lightboxVideo) lightboxVideo.pause();
});

// close when clicking the dark background (not the image/video itself)
lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
        lightbox.classList.remove("active");
        if (lightboxVideo) lightboxVideo.pause();
    }
});

// close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
        lightbox.classList.remove("active");
        if (lightboxVideo) lightboxVideo.pause();
    }
});