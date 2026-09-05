function renderMediaBlock(post) {
    const urls = post.media_urls && post.media_urls.length > 0
        ? post.media_urls
        : (post.media_url ? [post.media_url] : []);

    if (urls.length === 0) return "";

    if (urls.length === 1) {
        return `<img class="post-media item-media" src="${urls[0]}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="0">`;
    }

    if (urls.length === 2) {
        return `
            <div class="t-collage-2">
                <img class="item-media" src="${urls[0]}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="0">
                <img class="item-media" src="${urls[1]}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="1">
            </div>
        `;
    }

    if (urls.length === 3) {
        return `
            <div class="t-collage-3">
                <img class="item-media" src="${urls[0]}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="0">
                <img class="item-media" src="${urls[1]}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="1">
                <img class="item-media" src="${urls[2]}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="2">
            </div>
        `;
    }

    // exactly 4 — full 2x2 grid, nothing hidden
    return `
        <div class="t-collage-4">
            ${urls.map((url, i) => `<img class="item-media" src="${url}" alt="" data-gallery='${JSON.stringify(urls)}' data-index="${i}">`).join("")}
        </div>
    `;
}