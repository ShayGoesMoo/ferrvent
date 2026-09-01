const searchInput = document.getElementById("search-input");
const suggestionsEl = document.getElementById("search-suggestions");
let searchTimeout;
const searchClear = document.getElementById("search-clear");

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();

    searchClear.style.display = query.length > 0 ? "flex" : "none";

    if (query.length === 0) {
        suggestionsEl.classList.remove("open");
        return;
    }

    searchTimeout = setTimeout(() => runSearch(query), 10);
});

searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.style.display = "none";
    suggestionsEl.classList.remove("open");
    searchInput.focus();
});

async function runSearch(query) {
    const [userResults, postResults] = await Promise.all([
        supabaseClient
            .from("users")
            .select("id, display_name, username, avatar_url")
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(6),
        supabaseClient
            .from("posts")
            .select("id, title, caption, media_url")
            .or(`title.ilike.%${query}%,caption.ilike.%${query}%`)
            .limit(6)
    ]);

    const users = (userResults.data || []).map(user => ({
        type: "user",
        id: user.id,
        username: user.username, // add this if it's not already there
        label: user.display_name || user.username,
        sublabel: `@${user.username}`,
        image: user.avatar_url || "/assets/pfp.png"
    }));

    const posts = (postResults.data || []).map(post => ({
        type: "post",
        id: post.id,
        label: post.title || post.caption || "Untitled",
        sublabel: "Post",
        image: post.media_url || null
    }));

    const combined = [...users, ...posts].slice(0, 10);
    renderSuggestions(combined);
}

function renderSuggestions(results) {
    if (results.length === 0) {
        suggestionsEl.innerHTML = `<div class="suggestion-item">No results found</div>`;
        suggestionsEl.classList.add("open");
        return;
    }

    suggestionsEl.innerHTML = results.map(item => {
        const href = item.type === "user"
            ? `/profile/?user=${item.username}`
            : `/dashboard/post/?id=${item.id}`;

        const imageHtml = item.type === "user"
            ? `<img class="suggestion-avatar" src="${item.image}" alt="">`
            : item.image
                ? `<img class="suggestion-thumb" src="${item.image}" alt="">`
                : `<div class="suggestion-thumb suggestion-thumb-empty"></div>`;

        return `
            <a href="${href}" class="suggestion-item">
                ${imageHtml}
                <div class="suggestion-text">
                    <span class="suggestion-label">${item.label}</span>
                    <span class="suggestion-type">${item.sublabel}</span>
                </div>
            </a>
        `;
    }).join("");

    suggestionsEl.classList.add("open");
}

document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
        suggestionsEl.classList.remove("open");
    }
});