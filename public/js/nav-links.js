// save scroll position whenever the user clicks into a post
document.querySelectorAll(".timeline-item a").forEach((link) => {
    link.addEventListener("click", () => {
        sessionStorage.setItem("timelineScroll", window.scrollY);
    });
});

            // restore scroll position on page load (covers cases where history.back() alone doesn't restore it)
            window.addEventListener("load", () => {
                const savedScroll = sessionStorage.getItem("timelineScroll");
                if (savedScroll !== null) {
                    window.scrollTo(0, parseInt(savedScroll, 10));
                    sessionStorage.removeItem("timelineScroll"); // clear it so it doesn't persist stale on future visits
                }
            });

            document.querySelector("#create-post").addEventListener("click", () => {
                window.location.href = "create-post.html";
            });

            document.querySelector("#settings-btn").addEventListener("click", () => {
                window.location.href = "settings.html";
            });

            document.getElementById("suggestions-btn").addEventListener("click", () => {
                window.location.href = "suggestions.html";
            });

            document.getElementById("changelog-btn").addEventListener("click", () => {
                window.location.href = "changelog.html";
            });

            document.getElementById("home-btn").addEventListener("click", () => {
                window.location.href = "index.html";
            }); 
            
            document.getElementById("notifications-btn").addEventListener("click", () => {
                window.location.href = "notifications.html";
            }); 
            document.querySelector(".user").addEventListener("click", async () => {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    window.location.href = "login.html";
                    return;
                }
                window.location.href = `profile.html?id=${session.user.id}`;
            });