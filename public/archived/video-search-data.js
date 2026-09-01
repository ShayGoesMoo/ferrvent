/*
 * YOUTUBE DATA API v3 INTEGRATION
 * --------------------------------
 * Replace YOUTUBE_API_KEY below with your own key from the Google Cloud
 * Console (APIs & Services > Credentials). Make sure the key is restricted
 * to "YouTube Data API v3" and to your site's HTTP referrer.
 *
 * Two calls happen per search:
 *   1. search.list      -> finds matching videos (title, channel, thumbnail)
 *   2. videos.list       -> fills in duration + view count for those results
 * This costs 100 + 1 = 101 quota units per search. Free tier is 10,000
 * units/day, so budget for roughly ~90 full searches/day. Suggestions are
 * debounced (300ms) so fast typing doesn't burn through quota.
 */

const YOUTUBE_API_KEY = "";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const TRENDING_QUERIES = ["frog species", "javascript tutorial", "css grid", "youtube api", "nature sounds"];

// Converts YouTube's ISO 8601 duration (e.g. "PT1H2M10S") into "1:02:10"
function formatDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    const ss = String(seconds).padStart(2, "0");
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Converts a raw view count into "1.2M views" style formatting
function formatViews(count) {
    const n = parseInt(count, 10);
    if (isNaN(n)) return "";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M views";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K views";
    return n + " views";
}

function formatUploaded(dateStr) {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return "today";
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? "" : "s"} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? "" : "s"} ago`;
}

/**
 * Full search: hits search.list, then videos.list to fill in duration/views.
 * Returns an array of { id, title, channel, channelAvatar, thumbnail, duration, views, uploaded }.
 */
async function searchVideos(query) {
    const q = query.trim();
    if (!q) return [];

    try {
        const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(q)}&key=${YOUTUBE_API_KEY}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
            console.error("YouTube search.list error:", await searchRes.text());
            return [];
        }
        const searchData = await searchRes.json();
        const items = searchData.items || [];
        if (items.length === 0) return [];

        const videoIds = items.map(item => item.id.videoId).join(",");
        const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = detailsRes.ok ? await detailsRes.json() : { items: [] };

        const detailsById = {};
        (detailsData.items || []).forEach(d => { detailsById[d.id] = d; });

        return items.map(item => {
            const videoId = item.id.videoId;
            const details = detailsById[videoId];
            return {
                id: videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                channelAvatar: "../assets/default profile picture.png", // needs a channels.list call to get real avatars
                thumbnail: item.snippet.thumbnails.medium.url,
                duration: details ? formatDuration(details.contentDetails.duration) : "",
                views: details ? formatViews(details.statistics.viewCount) : "",
                uploaded: formatUploaded(item.snippet.publishedAt)
            };
        });
    } catch (err) {
        console.error("YouTube API request failed:", err);
        return [];
    }
}

async function searchVideosLite(query, maxResults = 6) {
    const q = query.trim();
    if (!q) return [];

    try {
        const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${YOUTUBE_API_KEY}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
            console.error("YouTube search.list error:", await searchRes.text());
            return [];
        }
        const searchData = await searchRes.json();
        const items = searchData.items || [];

        return items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
        }));
    } catch (err) {
        console.error("YouTube API request failed:", err);
        return [];
    }
}

// Debounced suggestions so the dropdown doesn't fire a request on every keystroke
let suggestionsDebounceTimer;
function getSuggestions(query, limit = 6) {
    return new Promise((resolve) => {
        clearTimeout(suggestionsDebounceTimer);
        const q = query.trim();
        if (!q) {
            resolve([]);
            return;
        }
        suggestionsDebounceTimer = setTimeout(async () => {
            const results = await searchVideosLite(q, limit);
            resolve(results);
        }, 150);
    });
}
