const uploadPanel = document.getElementById("upload-panel");
const mediaInput = document.getElementById("media-input");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const previewWrapper = document.getElementById("preview-wrapper");
const previewImage = document.getElementById("preview-image");
const previewVideo = document.getElementById("preview-video");
const changeMediaBtn = document.getElementById("change-media-btn");
const mediaTypeDisplay = document.getElementById("media-type-display");

const editParams = new URLSearchParams(window.location.search);
const editPostId = editParams.get("edit");
let existingMediaUrl = null;
let existingThumbnailUrl = null;

async function loadPostForEditing() {
    const { data: post, error } = await supabaseClient
        .from("posts")
        .select("id, user_id, title, caption, media_type, media_url, thumbnail_url")
        .eq("id", editPostId)
        .single();

    if (error || !post) {
        showToast("Couldn't load post for editing", "error");
        window.location.href = "index.html";
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || session.user.id !== post.user_id) {
        showToast("You don't have permission to edit this post", "error");
        window.location.href = "index.html";
        return;
    }

    existingMediaUrl = post.media_url;
    existingThumbnailUrl = post.thumbnail_url;
    detectedMediaType = post.media_type;

    // update page chrome for edit mode (guarded in case these elements don't exist)
    const subNavTitle = document.querySelector(".sub-navbar-title");
    if (subNavTitle) subNavTitle.textContent = "Edit Post";

    const publishBtn = document.getElementById("publish-btn");
    if (publishBtn) publishBtn.textContent = "Save Changes";

    if (post.media_type === "text") {
        document.getElementById("tab-text").click();
        document.getElementById("text-title").value = post.title || "";
        document.getElementById("text-body").value = post.caption || "";
    } else {
        document.getElementById("post-title").value = post.title || "";
        document.getElementById("caption").value = post.caption || "";
        mediaTypeDisplay.value = post.media_type;

        uploadPlaceholder.style.display = "none";
        previewWrapper.style.display = "block";

        if (post.media_type === "video") {
            previewVideo.src = post.media_url;
            previewVideo.style.display = "block";
            previewImage.style.display = "none";
        } else {
            previewImage.src = post.media_url;
            previewImage.style.display = "block";
            previewVideo.style.display = "none";
        }

        mediaInput.required = false;
    }
}
if (editPostId) {
    loadPostForEditing();
}

const tabButtons = document.querySelectorAll(".tab-btn");
const panels = {
    media: document.getElementById("panel-media"),
    text: document.getElementById("panel-text"),
};

let activeTab = "media";

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        activeTab = tab;

        tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

        document.getElementById("panel-media").style.display = tab === "media" ? "flex" : "none";
        document.getElementById("panel-text").style.display = tab === "text" ? "block" : "none";

        mediaInput.required = tab === "media";
    });
});

let selectedFile = null;
let detectedMediaType = null;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB, adjust as you like

// clicking the panel opens the file picker (unless clicking "Change")
uploadPanel.addEventListener("click", (e) => {
    if (e.target === changeMediaBtn) return;
    mediaInput.click();
});

mediaInput.addEventListener("change", () => {
    const file = mediaInput.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        showToast(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`, "error");
        mediaInput.value = ""; // reset the input
        return;
    }

    selectedFile = file;
    const fileURL = URL.createObjectURL(file);

    uploadPlaceholder.style.display = "none";
    previewWrapper.style.display = "block";

    if (file.type.startsWith("video/")) {
        detectedMediaType = "video";
        previewVideo.src = fileURL;
        previewVideo.style.display = "block";
        previewImage.style.display = "none";
    } else {
        detectedMediaType = file.type === "image/gif" ? "gif" : "image";
        previewImage.src = fileURL;
        previewImage.style.display = "block";
        previewVideo.style.display = "none";
    }

    mediaTypeDisplay.value = detectedMediaType;
});

document.getElementById("create-post-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        showToast("You need to be logged in to post.", "error");
        return;
    }

    const publishBtn = document.getElementById("publish-btn");

    // --- Text post branch ---
    if (activeTab === "text") {
        const title = document.getElementById("text-title").value.trim();
        const body = document.getElementById("text-body").value.trim();

        if (!body) {
            showToast("Please write something before publishing.", "error");
            return;
        }

        publishBtn.disabled = true;
        publishBtn.textContent = editPostId ? "Saving..." : "Publishing...";

        if (editPostId) {
            const { error: updateError } = await supabaseClient
            .from("posts")
            .update({
                media_url: urlData.publicUrl,
                media_type: detectedMediaType,
                title: title,
                caption: caption,
                thumbnail_url: thumbnailUrl,
                edited_at: new Date().toISOString(),
            })
            .eq("id", editPostId);

            if (updateError) {
                showToast("Failed to save changes: " + updateError.message, "error");
                publishBtn.disabled = false;
                publishBtn.textContent = "Save Changes";
                return;
            }

            window.location.href = `post.html?id=${editPostId}`;
            return;
        }

        const { data: newPost, error: insertError } = await supabaseClient
            .from("posts")
            .insert([
                {
                    user_id: session.user.id,
                    media_url: null,
                    media_type: "text",
                    title: title,
                    caption: body,
                    thumbnail_url: null,
                },
            ])
            .select()
            .single();

        if (insertError) {
            showToast("Failed to create post: " + insertError.message, "error");
            publishBtn.disabled = false;
            publishBtn.textContent = "Publish";
            return;
        }

        window.location.href = `post.html?id=${newPost.id}`;
        return;
    }

    // --- Media post branch ---

    if (editPostId && !selectedFile) {
        // editing, no new file chosen — just update title/caption
        publishBtn.disabled = true;
        publishBtn.textContent = "Saving...";

        const title = document.getElementById("post-title").value.trim();
        const caption = document.getElementById("caption").value.trim();

        const { error: updateError } = await supabaseClient
            .from("posts")
            .update({ title: title, caption: caption, edited_at: new Date().toISOString() })
            .eq("id", editPostId);

        if (updateError) {
            showToast("Failed to save changes: " + updateError.message, "error");
            publishBtn.disabled = false;
            publishBtn.textContent = "Save Changes";
            return;
        }

        window.location.href = `post.html?id=${editPostId}`;
        return;
    }

    if (!selectedFile && !editPostId) {
        showToast("Please select a photo, video, or gif to upload.", "error");
        return;
    }

    publishBtn.disabled = true;
    publishBtn.textContent = "Publishing...";

    // 1. Upload the file to Supabase Storage
    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

    window.currentAccessToken = session.access_token; // needed by uploadWithProgress

    const progressWrapper = document.getElementById("upload-progress");
    const progressBar = document.getElementById("upload-progress-bar");
    progressWrapper.style.display = "block";

    try {
        await uploadWithProgress(filePath, selectedFile, (percent) => {
            progressBar.style.width = `${percent}%`;
            publishBtn.textContent = `Uploading... ${percent}%`;
        });
    } catch (uploadError) {
        showToast("Upload failed: " + uploadError.message, "error");
        publishBtn.disabled = false;
        publishBtn.textContent = "Publish";
        progressWrapper.style.display = "none";
        return;
    }

    // 2. Get the public URL for the uploaded file
    const { data: urlData } = supabaseClient.storage
        .from("post-media")
        .getPublicUrl(filePath);

    // 2.5. Generate + upload a thumbnail if it's a video
    let thumbnailUrl = null;

    if (detectedMediaType === "video") {
        try {
            const thumbBlob = await generateThumbnail(selectedFile);
            const thumbPath = `${session.user.id}/${crypto.randomUUID()}.jpg`;

            const { error: thumbUploadError } = await supabaseClient.storage
                .from("post-media")
                .upload(thumbPath, thumbBlob);

            if (!thumbUploadError) {
                const { data: thumbUrlData } = supabaseClient.storage
                    .from("post-media")
                    .getPublicUrl(thumbPath);
                thumbnailUrl = thumbUrlData.publicUrl;
            }
        } catch (thumbError) {
            console.error("Thumbnail generation failed, proceeding without one:", thumbError);
            // thumbnailUrl stays null — post still gets created, just without a thumbnail
        }
    }

    // 3. Insert the post record
    const title = document.getElementById("post-title").value.trim();
    const caption = document.getElementById("caption").value.trim();

    const { data: newPost, error: insertError } = await supabaseClient
        .from("posts")
        .insert([
            {
                user_id: session.user.id,
                media_url: urlData.publicUrl,
                media_type: detectedMediaType,
                title: title,
                caption: caption,
                thumbnail_url: thumbnailUrl,
            },
        ])
        .select()
        .single();

    if (insertError) {
        showToast("Failed to create post: " + insertError.message, "error");
        publishBtn.disabled = false;
        publishBtn.textContent = "Publish";
        return;
    }

    // redirect to the new post
    window.location.href = `post.html?id=${newPost.id}`;
});


document.getElementById("cancel-btn").addEventListener("click", () => {
    window.location.href = "index.html";
});

async function generateThumbnail(videoFile) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto"; // more reliable than "metadata" for triggering actual frame decode on mobile
        video.src = URL.createObjectURL(videoFile);

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Thumbnail generation timed out"));
        }, 8000);

        function cleanup() {
            clearTimeout(timeout);
            video.pause();
            URL.revokeObjectURL(video.src);
        }

        function captureFrame() {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                cleanup();
                if (blob) resolve(blob);
                else reject(new Error("Canvas toBlob returned null"));
            }, "image/jpeg", 0.8);
        }

        video.addEventListener("loadedmetadata", async () => {
            try {
                video.currentTime = 0.1;
                await video.play(); // actually start playback briefly
                // give it a couple frames to actually render before capturing
                requestAnimationFrame(() => {
                    requestAnimationFrame(captureFrame);
                });
            } catch (err) {
                cleanup();
                reject(err);
            }
        });

        video.addEventListener("error", (e) => {
            cleanup();
            reject(e);
        });
    });
}

function uploadWithProgress(filePath, file, onProgress) {
    return new Promise((resolve, reject) => {
        const url = `${SUPABASE_URL}/storage/v1/object/post-media/${filePath}`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Authorization", `Bearer ${window.currentAccessToken}`);
        xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
        xhr.setRequestHeader("x-upsert", "false");

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
    });
}
