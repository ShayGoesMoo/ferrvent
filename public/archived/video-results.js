(async function () {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q") || "";

    const heading = document.getElementById("results-query-heading");
    const countEl = document.getElementById("results-count");
    const grid = document.getElementById("results-grid");
    const noResults = document.getElementById("no-results");

    heading.textContent = query ? `Results for "${query}"` : "All videos";

    // Pre-fill the nav search bar with the current query
    const navInput = document.getElementById("video-search-input");
    if (navInput) navInput.value = query;

    countEl.textContent = "Loading...";

    const results = query ? await searchVideos(query) : [];

    countEl.textContent = `${results.length} video${results.length === 1 ? "" : "s"} found`;

    if (results.length === 0) {
        noResults.classList.remove("hidden");
        return;
    }

    results.forEach((video) => {
        const card = document.createElement("a");
        card.className = "video-card";
        card.href = `post.html?youtube=${encodeURIComponent(video.id)}`;
        card.dataset.videoId = video.id;

        card.addEventListener("click", () => {
            // stash the full video info so watch.html can show title/channel/views
            // without an extra API call; if it's missing (e.g. direct link, refresh),
            // watch.html just falls back to showing the player alone.
            sessionStorage.setItem("watch:" + video.id, JSON.stringify(video));
        });

        card.innerHTML = `
            <div class="thumbnail">
                <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}">
                <span class="duration">${video.duration}</span>
            </div>
            <div class="video-info">
                <div class="video-text">
                    <div class="video-title">${escapeHtml(video.title)}</div>
                    <div class="video-meta">${escapeHtml(video.channel)} &middot; ${video.views} &middot; ${video.uploaded}</div>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }
})();
