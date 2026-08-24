const userSearchInput = document.getElementById("user-search");
const searchResults = document.getElementById("search-results");

let searchTimeout = null;

userSearchInput.addEventListener("input", () => {
    const query = userSearchInput.value.trim();

    clearTimeout(searchTimeout);

    if (!query) {
        searchResults.classList.remove("active");
        searchResults.innerHTML = "";
        return;
    }

    searchTimeout = setTimeout(() => runSearch(query), 250);
});

async function runSearch(query) {
    const { data: users, error } = await supabaseClient
        .from("users")
        .select("id, display_name, username, avatar_url")
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(8);

    if (error) {
        console.error("Search failed:", error.message);
        return;
    }

    renderResults(users);
}

function renderResults(users) {
    if (!users || users.length === 0) {
        searchResults.innerHTML = `<div class="search-empty">No users found</div>`;
        searchResults.classList.add("active");
        userSearchInput.classList.add("results-open");
        return;
    }

    searchResults.innerHTML = users.map(user => `
        <a href="/profile/?id=${user.id}" class="search-result-item" data-user-id="${user.id}">
            <img class="search-result-avatar" src="${user.avatar_url || '/assets/pfp.png'}" alt="">
            <div class="search-result-name">
                <span class="search-result-display">${user.display_name || user.username}</span>
                <span class="search-result-username">@${user.username}</span>
            </div>
        </a>
    `).join("");

    searchResults.classList.add("active");
    userSearchInput.classList.add("results-open");

    if (!query) {
        searchResults.classList.remove("active");
        searchResults.innerHTML = "";
        userSearchInput.classList.remove("results-open");
        return;
    }
}

// close results when clicking outside
document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
        searchResults.classList.remove("active");
        userSearchInput.classList.remove("results-open");
    }
});

// close results when clicking outside
document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
        searchResults.classList.remove("active");
    }
});