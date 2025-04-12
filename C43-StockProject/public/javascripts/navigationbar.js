document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("logout").addEventListener("click", async () => {
        try {
            const res = await fetch("/users/logout", {
                method: "GET",
                credentials: "include", // important to include the session cookie
            });

            if (res.ok) {
                localStorage.clear(); // Clear local storage
                window.location.href = "/index.html"; // ✅ redirect to landing page
            } else {
                alert("Logout failed");
            }
        } catch (err) {
            console.error("Logout error:", err);
            alert("An error occurred during logout.");
        }
    });

    document.getElementById("stocks").addEventListener("click", () => {
        window.location.href = "/stocksHome.html";
    });
    document.getElementById("friends").addEventListener("click", () => {
        window.location.href = "/friends.html";
    });
    document.getElementById("home").addEventListener("click", () => {
        window.location.href = "/home.html";
    });
});