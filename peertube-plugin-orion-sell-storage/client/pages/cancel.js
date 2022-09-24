async function showPage({ rootEl, peertubeHelpers }) {
    // Redirect to login page if not auth
    if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

    rootEl.innerHTML = `
        <div class="orion-content text-center">
            <h1>${await peertubeHelpers.translate("Subscription canceled.")}</h1>
        </div>
    `;
}

export { showPage };