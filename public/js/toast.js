(function () {
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);

    const notificationSound = new Audio("../assets/sounds/error.m4a");

    window.showToast = function (message, type = "info", duration = 3500) {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // trigger the enter animation on the next frame
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });
        notificationSound.currentTime = 0;
        notificationSound.play().catch(err => {
            console.warn("Sound blocked (likely no user interaction yet):", err);
        })

        setTimeout(() => {
            toast.classList.remove("show");
            toast.addEventListener("transitionend", () => toast.remove(), { once: true });
        }, duration);
    };
})();