function setupCustomControls(video, prefix = "") {
    const p = (id) => document.getElementById(prefix + id);

    const playPauseBtn = p("play-pause-btn");
    const playIcon = p("play-icon");
    const pauseIcon = p("pause-icon");
    const progressTrack = p("video-progress-track");
    const progressFill = p("video-progress-fill");
    const timeDisplay = p("video-time");
    const muteBtn = p("mute-btn");
    const volumeIcon = p("volume-icon");
    const mutedIcon = p("muted-icon");
    const volumeSlider = p("volume-slider");
    const playerFullscreenBtn = p("player-fullscreen-btn");
    const replayOverlay = p("replay-overlay");
    const replayBtn = p("replay-btn");

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    function togglePlay() {
        if (video.paused) video.play();
        else video.pause();
    }

    playPauseBtn.addEventListener("click", togglePlay);
    video.addEventListener("click", togglePlay);

    video.addEventListener("play", () => {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
        if (replayOverlay) replayOverlay.classList.remove("active");
    });

    video.addEventListener("pause", () => {
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
    });

    video.addEventListener("ended", () => {
        if (replayOverlay) replayOverlay.classList.add("active");
    });

    if (replayBtn) {
        replayBtn.addEventListener("click", () => {
            video.currentTime = 0;
            video.play();
        });
    }

    video.addEventListener("timeupdate", () => {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${percent || 0}%`;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    });

    video.addEventListener("loadedmetadata", () => {
        timeDisplay.textContent = `${formatTime(0)} / ${formatTime(video.duration)}`;
    });

    progressTrack.addEventListener("click", (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
    });

    muteBtn.addEventListener("click", () => {
        video.muted = !video.muted;
        volumeIcon.style.display = video.muted ? "none" : "block";
        mutedIcon.style.display = video.muted ? "block" : "none";
    });

    volumeSlider.addEventListener("input", () => {
        video.volume = volumeSlider.value;
        video.muted = video.volume === 0;
        volumeIcon.style.display = video.muted ? "none" : "block";
        mutedIcon.style.display = video.muted ? "block" : "none";
    });

    if (playerFullscreenBtn) {
        playerFullscreenBtn.addEventListener("click", () => {
            if (video.requestFullscreen) video.requestFullscreen();
        });
    }
}