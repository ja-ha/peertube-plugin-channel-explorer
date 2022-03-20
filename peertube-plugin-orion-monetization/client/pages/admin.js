async function showPage({ rootEl, peertubeHelpers }) {
  // Redirect to login page if not auth
  if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

  const loading = await peertubeHelpers.translate("Loading");
  rootEl.innerHTML = loading + "...";

  /**
   * Translations
   **/
  const dateTh = await peertubeHelpers.translate("Date");
  const amountTh = await peertubeHelpers.translate("Amount");
  const walletTh = await peertubeHelpers.translate("Wallet");
  const stateTh = await peertubeHelpers.translate("State");
  const historyTitle = await peertubeHelpers.translate("Request history");
  const historyDesc = await peertubeHelpers.translate(
    "All users request appear here."
  );

  const pendingTd = await peertubeHelpers.translate("Pending");
  const processedTd = await peertubeHelpers.translate("Processed");
  const refusedTd = await peertubeHelpers.translate("Refused");

  // Get settings
  const baseUrl = peertubeHelpers.getBaseRouterRoute();


  // Fetch admin history
  const response = await fetch(baseUrl + "/admin-history", {
    method: "GET",
    headers: peertubeHelpers.getAuthHeader(),
  });
  const data = await response.json();

  // If have error
  if (!data || !data.status || (data.status && data.status !== "success")) {
    peertubeHelpers.notifier.error(data.message || "Unknown error");
    rootEl.innerHTML = `<h1>${data.message || "Unknown error"}</h1>`;
    return;
  }

  // Construct history
  let historyHtml = "";

  if (data.history && data.history.length > 0) {
    for (let i = 0; i < data.history.length; i++) {
      let history = data.history[i];
      var curdate = new Date(null);
      curdate.setTime(history.date);
      let dateStr = curdate.toLocaleString();

      historyHtml += `
              <tr data-id="${history.date}">
                <td>${dateStr}</td>
                <td>${history.user}</td>
                <td>${history.amount} MINTME</td>
                <td>${history.hashes || 0}</td>
                <td>${history.wallet}</td>
                <td>${
                  history.state === 0
                    ? pendingTd
                    : history.state === -1
                    ? refusedTd
                    : processedTd
                }</td>
                <td>
                    <button class="markProcessed btn btn-primary" data-id="${history.date}">Mark processed</button>
                    <br>
                    <button class="markRefused btn btn-danger" data-id="${history.date}">Mark refused</button>
                </td>
              </tr>
            `;
    }
  }

  rootEl.innerHTML = `
        <div class="container">
        <h1>${historyTitle}</h1>
        <p>${historyDesc}</p>
        <table class="table table-striped">
            <thead>
            <tr>
                <th>${dateTh}</th>
                <th>@</th>
                <th>${amountTh}</th>
                <th>Hashes</th>
                <th>${walletTh}</th>
                <th>${stateTh}</th>
                <th></th>
            </tr>
            </thead>

            <tbody>
            ${historyHtml}
            </tbody>
        </table>
        </div>
    `;

    setTimeout(() => {
        let buttons = document.getElementsByClassName("markProcessed");
        for(let i = 0; i < buttons.length; i++) {
            let el = buttons[i];
            el.onclick = async function() {
                let id = this.getAttribute("data-id");
                console.log("Mark " + id + " to processed");

                // Fetch admin history
                const response = await fetch(baseUrl + "/mark-request?state=1&id=" + id, {
                    method: "GET",
                    headers: peertubeHelpers.getAuthHeader(),
                });
                const data = await response.json();

                // If have error
                if (!data || !data.status || (data.status && data.status !== "success")) {
                    peertubeHelpers.notifier.error(data.message || "Unknown error");
                    return;
                }

                window.location.reload();
            }
        }

        buttons = document.getElementsByClassName("markRefused");
        for(let i = 0; i < buttons.length; i++) {
            let el = buttons[i];
            el.onclick = async function() {
                let id = this.getAttribute("data-id");
                console.log("Mark " + id + " to refused");

                // Fetch admin history
                const response = await fetch(baseUrl + "/mark-request?state=-1&id=" + id, {
                    method: "GET",
                    headers: peertubeHelpers.getAuthHeader(),
                });
                const data = await response.json();

                // If have error
                if (!data || !data.status || (data.status && data.status !== "success")) {
                    peertubeHelpers.notifier.error(data.message || "Unknown error");
                    return;
                }

                window.location.reload();
            }
        }
    }, 300);
}

export { showPage };
