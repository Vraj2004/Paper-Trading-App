console.log("Navigation bar script loaded");
document.getElementById("logout").addEventListener("click", async () => {
    try {
        const res = await fetch("/users/logout", {
            method: "GET",
            credentials: "include", // important to include the session cookie
        });

        if (res.ok) {
            window.location.href = "/index.html"; // ✅ redirect to landing page
        } else {
            alert("Logout failed");
        }
    } catch (err) {
        console.error("Logout error:", err);
        alert("An error occurred during logout.");
    }
});



document.getElementById("addStockData").addEventListener("click", () => {
    window.location.href = "/stocklistHome.html";
});