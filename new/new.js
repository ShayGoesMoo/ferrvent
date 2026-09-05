const filePanel = document.getElementById("file-panel");
const fileInput = document.getElementById("file-input");
const filePlaceholder = document.getElementById("file-placeholder");
const previewGrid = document.getElementById("preview-grid");
const postBtn = document.getElementById("post-btn");
const captionInput = document.getElementById("caption");
const createForm = document.getElementById("create-new");

let selectedFiles = [];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10mb max
const MAX_FILES = 4; // 4 images max

function resetFilePanel() {
    selectedFiles = [];
    fileInput.value = "";
    renderPreviewGrid();
}

function addFiles(newFiles) {
    for (const file of newFiles) {
        if (selectedFiles.length >= MAX_FILES) {
            showToast(`You can only add up to ${MAX_FILES} images.`, "error");
            break;
        }

        if (file.size > MAX_FILE_SIZE) {
            showToast(`"${file.name}" is too big — max 10mb.`, "error");
            continue;
        }

        selectedFiles.push(file);
    }

    fileInput.value = ""; // reset so selecting the same file again still fires "change"
    renderPreviewGrid();
}

function removeFileAt(index) {
    selectedFiles.splice(index, 1);
    renderPreviewGrid();
}

function renderPreviewGrid() {
    if (selectedFiles.length === 0) {
        filePlaceholder.style.display = "flex";
        previewGrid.style.display = "none";
        previewGrid.innerHTML = "";
        return;
    }

    filePlaceholder.style.display = "none";
    previewGrid.style.display = "grid";

    previewGrid.innerHTML = selectedFiles.map((file, index) => `
        <div class="preview-tile">
            <img src="${URL.createObjectURL(file)}" alt="">
            <button type="button" class="remove-tile-btn" data-index="${index}" aria-label="Remove">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `).join("");

    if (selectedFiles.length < MAX_FILES) {
        previewGrid.innerHTML += `
            <div class="add-more-tile" id="add-more-tile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
        `;
    }

    previewGrid.querySelectorAll(".remove-tile-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFileAt(parseInt(btn.dataset.index, 10));
        });
    });

    document.getElementById("add-more-tile")?.addEventListener("click", () => {
        fileInput.click();
    });
}

// clicking the empty placeholder opens the file picker
filePlaceholder.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length === 0) return;
    addFiles(Array.from(fileInput.files));
});

createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        showToast("You need to be logged in to post.", "error");
        return;
    }

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";

    let insertPayload;

    if (activePostType === "story") {
        const title = document.getElementById("story-title").value.trim();
        const storyBody = document.getElementById("story-body").value.trim();

        if (!title || !storyBody) {
            showToast("Add a title and some story text before posting.", "error");
            postBtn.disabled = false;
            postBtn.textContent = "Post";
            return;
        }

        insertPayload = {
            user_id: session.user.id,
            media_url: null,
            media_urls: null,
            media_type: "story",
            title: title,
            caption: storyBody,
        };
    } else {
        const caption = captionInput.value.trim();

        if (!caption && selectedFiles.length === 0) {
            showToast("Add a caption or a photo before posting.", "error");
            postBtn.disabled = false;
            postBtn.textContent = "Post";
            return;
        }

        let mediaUrls = [];
        let mediaType = "text";

        if (selectedFiles.length > 0) {
            for (const file of selectedFiles) {
                const fileExt = file.name.split(".").pop();
                const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from("post-media")
                    .upload(filePath, file);

                if (uploadError) {
                    showToast(`Failed to upload "${file.name}": ` + uploadError.message, "error");
                    postBtn.disabled = false;
                    postBtn.textContent = "Post";
                    return;
                }

                const { data: urlData } = supabaseClient.storage
                    .from("post-media")
                    .getPublicUrl(filePath);

                mediaUrls.push(urlData.publicUrl);
            }

            // any gif in the set marks the whole post as a gif post — otherwise treat as images
            mediaType = selectedFiles.some(f => f.type === "image/gif") ? "gif" : "image";
        }

        insertPayload = {
            user_id: session.user.id,
            media_url: mediaUrls[0] || null, // first image stays in media_url too, for anything still reading the old single-image field
            media_urls: mediaUrls.length > 0 ? mediaUrls : null,
            media_type: mediaType,
            title: null,
            caption: caption,
        };
    }

    const { data: newPost, error: insertError } = await supabaseClient
        .from("posts")
        .insert([insertPayload])
        .select()
        .single();

    if (insertError) {
        showToast("Failed to create post: " + insertError.message, "error");
        postBtn.disabled = false;
        postBtn.textContent = "Post";
        return;
    }

    window.location.href = `/dashboard/post/?id=${newPost.id}`;
});

document.getElementById("cancel-btn").addEventListener("click", () => {
    window.location.href = "../dashboard/";
});

const tabBtns = document.querySelectorAll(".settings-sidebar .settings-tab");
const panels = document.querySelectorAll(".settings-panel");
let activePostType = "post";

tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const tab = btn.dataset.panel;
        activePostType = tab;

        panels.forEach(panel => {
            panel.classList.toggle("active", panel.id === `panel-${tab}`);
        });
    });
});