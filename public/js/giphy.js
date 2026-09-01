const GIPHY_API_KEY = "g7cZexeOeTzhTiNMu4gN7sZUjRNuSORJ";

async function searchGifs(query) {
    const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=39&rating=pg-13`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data.map((g) => ({
        id: g.id,
        preview: g.images.fixed_width_small.url,
        full: g.images.original.url,
    }));
}

async function searchStickers(query) {
    const res = await fetch(
        `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=39&rating=pg-13`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data.map((g) => ({
        id: g.id,
        preview: g.images.fixed_width_small.url,
        full: g.images.original.url,
    }));
}

async function getTrendingGifs() {
    const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=39&rating=pg-13`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data.map((g) => ({
        id: g.id,
        preview: g.images.fixed_width_small.url,
        full: g.images.original.url,
    }));
}