/*
 * Wires up any search input on the page to a live suggestions dropdown
 * and sends the user to video-results.html?q=... on submit.
 * Works for both the compact nav bar search and the big hero search box.
 */
(function () {
    function setupSearchInput(inputId, listId, { onSubmitForm = null } = {}) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        if (!input || !list) return;

        let activeIndex = -1;
        let currentSuggestions = [];

        function goToResults(query) {
            const trimmed = query.trim();
            if (!trimmed) return;
            window.location.href = "video-results.html?q=" + encodeURIComponent(trimmed);
        }

        function renderSuggestions(suggestions) {
            currentSuggestions = suggestions;
            activeIndex = -1;
            list.innerHTML = "";

            if (suggestions.length === 0) {
                list.classList.add("hidden");
                return;
            }

            suggestions.forEach((s, i) => {
                const li = document.createElement("li");
                li.setAttribute("role", "option");
                li.dataset.index = i;

                const thumb = document.createElement("img");
                thumb.className = "suggestion-thumb";
                thumb.src = s.thumbnail;
                thumb.alt = "";

                const text = document.createElement("span");
                text.className = "suggestion-text";
                text.textContent = s.title;

                li.appendChild(thumb);
                li.appendChild(text);

                li.addEventListener("mousedown", (e) => {
                    // mousedown fires before input blur, so the click registers
                    e.preventDefault();
                    goToResults(s.title);
                });

                list.appendChild(li);
            });

            list.classList.remove("hidden");
        }

        function updateActiveItem() {
            [...list.children].forEach((li, i) => {
                li.classList.toggle("active", i === activeIndex);
            });
            if (activeIndex >= 0 && currentSuggestions[activeIndex]) {
                input.value = currentSuggestions[activeIndex].title;
            }
        }

        let requestId = 0;
        input.addEventListener("input", async () => {
            const thisRequest = ++requestId;
            const suggestions = await getSuggestions(input.value);
            // if the user kept typing while this request was in flight, drop the stale result
            if (thisRequest !== requestId) return;
            renderSuggestions(suggestions);
        });

        input.addEventListener("keydown", (e) => {
            if (list.classList.contains("hidden")) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (onSubmitForm) return; // let form submit handler deal with it
                    goToResults(input.value);
                }
                return;
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
                updateActiveItem();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, -1);
                updateActiveItem();
            } else if (e.key === "Enter") {
                e.preventDefault();
                goToResults(input.value);
            } else if (e.key === "Escape") {
                list.classList.add("hidden");
            }
        });

        document.addEventListener("click", (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.classList.add("hidden");
            }
        });

        return { goToResults };
    }

    // Compact nav bar search (present on every page)
    setupSearchInput("video-search-input", "suggestions-list");

    // Big hero search on the search page itself
    const heroForm = document.getElementById("main-search-form");
    if (heroForm) {
        const heroApi = setupSearchInput("main-search-input", "main-suggestions-list", { onSubmitForm: true });
        heroForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("main-search-input");
            heroApi.goToResults(input.value);
        });
    }

    // Trending chips
    const trendingContainer = document.getElementById("trending-chips");
    if (trendingContainer && typeof TRENDING_QUERIES !== "undefined") {
        TRENDING_QUERIES.forEach((term) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = term;
            btn.addEventListener("click", () => {
                window.location.href = "video-results.html?q=" + encodeURIComponent(term);
            });
            trendingContainer.appendChild(btn);
        });
    }
})();
