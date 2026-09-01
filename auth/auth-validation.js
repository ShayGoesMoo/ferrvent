const usernameInput = document.getElementById("username");
const usernameHint = document.getElementById("username-hint");

const passwordInput = document.getElementById("user_password");
const passwordHint = document.getElementById("user_password-hint");

const confirmInput = document.getElementById("confirm_user_password");
const confirmHint = document.getElementById("confirm_user_password-hint");

const emailInput = document.getElementById("email_address");
const emailHint = document.getElementById("email_address-hint");

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,12}$/;

let usernameCheckTimer;
let emailCheckTimer;

function setState(input, hintEl, isValid, message) {
    hintEl.textContent = message;
    input.classList.remove("valid", "invalid");
    hintEl.classList.remove("valid", "invalid");

    if (isValid === true) {
        input.classList.add("valid");
        hintEl.classList.add("valid");
    } else if (isValid === false) {
        input.classList.add("invalid");
        hintEl.classList.add("invalid");
    }
}

function validateUsername() {
    const value = usernameInput.value;

    if (value.length === 0) {
        setState(usernameInput, usernameHint, null, "3–12 characters: letters, numbers, underscores, periods, dashes");
        return false;
    }

    if (!USERNAME_REGEX.test(value)) {
        setState(usernameInput, usernameHint, false, "Only letters, numbers, underscores, periods, and dashes — 3 to 12 characters");
        return false;
    }

    setState(usernameInput, usernameHint, true, "Looks good");
    return true;
}

function validatePassword() {
    const value = passwordInput.value;

    const checks = {
        length: value.length >= 8,
        upper: /[A-Z]/.test(value),
        lower: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        symbol: /[^A-Za-z0-9]/.test(value),
    };

    const allValid = Object.values(checks).every(Boolean);

    if (value.length === 0) {
        setState(passwordInput, passwordHint, null, "8+ characters, with uppercase, lowercase, a number, and a symbol");
        return false;
    }

    if (!allValid) {
        const missing = [];
        if (!checks.length) missing.push("8+ characters");
        if (!checks.upper) missing.push("an uppercase letter");
        if (!checks.lower) missing.push("a lowercase letter");
        if (!checks.number) missing.push("a number");
        if (!checks.symbol) missing.push("a symbol");

        setState(passwordInput, passwordHint, false, "Missing: " + missing.join(", "));
        return false;
    }

    setState(passwordInput, passwordHint, true, "Strong password");
    return true;
}

function validateConfirmPassword() {
    const value = confirmInput.value;

    if (value.length === 0) {
        setState(confirmInput, confirmHint, null, "");
        return false;
    }

    if (value !== passwordInput.value) {
        setState(confirmInput, confirmHint, false, "Passwords do not match");
        return false;
    }

    setState(confirmInput, confirmHint, true, "Passwords match");
    return true;
}

async function checkUsernameAvailability() {
    const value = usernameInput.value;
    if (!USERNAME_REGEX.test(value)) return;

    const { data, error } = await supabaseClient
        .from("users")
        .select("username")
        .ilike("username", value)
        .maybeSingle();

    if (error) {
        console.error("Username availability check failed:", error);
        return;
    }

    if (data) {
        setState(usernameInput, usernameHint, false, "That username is already taken");
    } else {
        setState(usernameInput, usernameHint, true, "Username is available");
    }
}

async function checkEmailAvailability() {
    const value = emailInput.value.trim();
    if (!value || !value.includes("@")) return;

    const { data, error } = await supabaseClient
        .from("users")
        .select("email_address")
        .ilike("email_address", value)
        .maybeSingle();

    if (error) {
        console.error("Email availability check failed:", error);
        return;
    }

    if (data) {
        setState(emailInput, emailHint, false, "An account with this email already exists");
    } else {
        setState(emailInput, emailHint, null, "Email is available");
    }
}

usernameInput.addEventListener("input", () => {
    const formatValid = validateUsername();
    clearTimeout(usernameCheckTimer);
    if (formatValid) {
        usernameCheckTimer = setTimeout(checkUsernameAvailability, 400);
    }
});

emailInput.addEventListener("input", () => {
    clearTimeout(emailCheckTimer);
    emailCheckTimer = setTimeout(checkEmailAvailability, 400);
});

passwordInput.addEventListener("input", () => {
    validatePassword();
    if (confirmInput.value.length > 0) validateConfirmPassword();
});

confirmInput.addEventListener("input", validateConfirmPassword);