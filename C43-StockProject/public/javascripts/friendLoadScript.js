async function loadFriends() {
    const userID = localStorage.getItem("userID");
    if (!userID) {
        console.log("User ID not found in local storage");
        return;
    }
    const response = await fetch(`/friends/${userID}`);
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
    }
    const friends = await response.json();
    return friends
}