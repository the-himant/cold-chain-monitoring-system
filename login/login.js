
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const passwordInput = document.getElementById("password");

// Check if admin is already logged in
if (sessionStorage.getItem("coldchainAdminLoggedIn") === "true") {
    window.location.replace("../home/index.html");
}

// Admin login functionality
loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = passwordInput.value;

    // Demo admin credentials
    const adminEmail = "admin@coldchain.com";
    const adminPassword = "Admin@123";

    if (email === adminEmail && password === adminPassword) {

        // Save login session
        sessionStorage.setItem("coldchainAdminLoggedIn", "true");

        // Hide error message
        loginError.classList.add("hidden");

        // Redirect to dashboard
        window.location.href = "../home/index.html";

    } else {
        // Show error for incorrect credentials
        loginError.classList.remove("hidden");
        passwordInput.value = "";
        passwordInput.focus();
    }
});

// Show and hide password
document.getElementById("togglePassword").addEventListener("click", function () {

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        this.textContent = "Show";
    }

});
