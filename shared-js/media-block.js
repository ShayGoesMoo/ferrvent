// builds the media portion of a post: single image, or a collage for multiple photos.
// every <img> gets data-gallery (the full url list) + data-index, so the modal can navigate
// through all images regardless of how many thumbnails are actually visible.
function renderMediaBlock(post) {
    const urls = post.media_urls && post.media_urls.length > 0
        ? post.media_urls
        : (post.media_url ? [post.media_url] : []);

    if (urls.length === 0) return "";

    const galleryAttr = `data-gallery='${JSON.stringify(urls)}'`;

    if (urls.length === 1) {
        return `<img class="post-media item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">`;
    }

    if (urls.length === 2) {
        return `
            <div class="t-collage-2">
                <img class="item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">
                <img class="item-media" src="${urls[1]}" alt="" ${galleryAttr} data-index="1">
            </div>
        `;
    }

    if (urls.length === 3) {
        return `
            <div class="t-collage-3">
                <img class="big item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">
                <img class="item-media" src="${urls[1]}" alt="" ${galleryAttr} data-index="1">
                <img class="item-media" src="${urls[2]}" alt="" ${galleryAttr} data-index="2">
            </div>
        `;
    }

    const remaining = urls.length - 4;
    return `
        <div class="t-collage-4">
            <img class="item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">
            <img class="item-media" src="${urls[1]}" alt="" ${galleryAttr} data-index="1">
            <img class="item-media" src="${urls[2]}" alt="" ${galleryAttr} data-index="2">
            <div class="t-more-overlay" ${remaining > 0 ? `data-more="+${remaining}"` : ""}>
                <img class="item-media" src="${urls[3]}" alt="" ${galleryAttr} data-index="3">
            </div>
        </div>
    `;
}

// used only on the extended post page — shows every image, no +N overlay
function renderFullMediaBlock(post) {
    const urls = post.media_urls && post.media_urls.length > 0
        ? post.media_urls
        : (post.media_url ? [post.media_url] : []);

    if (urls.length === 0) return "";

    const galleryAttr = `data-gallery='${JSON.stringify(urls)}'`;

    if (urls.length === 1) {
        return `<img class="post-media item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">`;
    }

    if (urls.length === 2) {
        return `
            <div class="t-collage-2">
                <img class="item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">
                <img class="item-media" src="${urls[1]}" alt="" ${galleryAttr} data-index="1">
            </div>
        `;
    }

    if (urls.length === 3) {
        return `
            <div class="t-collage-3">
                <img class="big item-media" src="${urls[0]}" alt="" ${galleryAttr} data-index="0">
                <img class="item-media" src="${urls[1]}" alt="" ${galleryAttr} data-index="1">
                <img class="item-media" src="${urls[2]}" alt="" ${galleryAttr} data-index="2">
            </div>
        `;
    }

    // 4 or more — uniform square grid, every image shown, nothing hidden
    return `
        <div class="t-gallery-grid">
            ${urls.map((url, i) => `<img class="item-media" src="${url}" alt="" ${galleryAttr} data-index="${i}">`).join("")}
        </div>
    `;
}