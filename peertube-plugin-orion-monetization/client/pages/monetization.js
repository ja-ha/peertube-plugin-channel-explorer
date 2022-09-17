async function showPage({ rootEl, peertubeHelpers }) {
  // Redirect to login page if not auth
  if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

  const loading = await peertubeHelpers.translate("Loading");
  rootEl.innerHTML = loading + "...";

  /**
   * Translations
   **/
  const monetizationTitle = await peertubeHelpers.translate("Monetization");
  const monetizationDesc = await peertubeHelpers.translate(
    "You can enable monetization on each video settings. You can request a payout after a minimum amount."
  );
  const youEarn = await peertubeHelpers.translate("Earn for 1M hashes");
  const currentPending = await peertubeHelpers.translate("Currently pending");
  const minPayout = await peertubeHelpers.translate("Minimum for payout is");
  const currentlyHashesPending = await peertubeHelpers.translate(
    "Currently pending"
  );
  const doRequest = await peertubeHelpers.translate("Request payout");
  const requestPayoutDesc = await peertubeHelpers.translate(
    "You can request a payout when your have the required MINTME amount (see above). Requests are processed within 72 hours by a admin."
  );
  const requestPayoutDesc2 = await peertubeHelpers.translate(
    `You can create your wallet via <a href='https://github.com/mintme-com/wallet/releases' rel='nofollow' target='_blank'>GUI Wallet</a>. To exchange your MINTME to BTC use <a href='https://www.mintme.com' target='_blank'>MintMe</a>`
  );
  const amountLabel = await peertubeHelpers.translate(
    "Amount (in MINTME) to payout"
  );
  const walletLabel = await peertubeHelpers.translate("Your wallet address");
  const sendBtn = await peertubeHelpers.translate("Send payout request");
  const dateTh = await peertubeHelpers.translate("Date");
  const amountTh = await peertubeHelpers.translate("Amount");
  const walletTh = await peertubeHelpers.translate("Wallet");
  const stateTh = await peertubeHelpers.translate("State");
  const historyTitle = await peertubeHelpers.translate("Payout history");
  const historyDesc = await peertubeHelpers.translate(
    "When you request a payout, he appear here and you can follow its state."
  );

  const pendingTd = await peertubeHelpers.translate("Pending");
  const processedTd = await peertubeHelpers.translate("Processed");
  const refusedTd = await peertubeHelpers.translate("Refused");

  // Get settings
  const settings = await peertubeHelpers.getSettings();
  const baseUrl = peertubeHelpers.getBaseRouterRoute();


  rootEl.innerHTML = "<div class='orion-content'><h1>"+ monetizationTitle +"</h1><p>"+monetizationDesc+"</p></div>";

  /**
   * ADS
   */
  {
    // Fetch user miner stats
    const response = await fetch(baseUrl + "/ads-views", {
      method: "GET",
      headers: peertubeHelpers.getAuthHeader(),
    });
    const data = await response.json();
    const devise = await settings['ads-earns-devise'];

     // Construct history
    let historyHtml = "";
    if (data.history && data.history.length > 0) {
      for (let i = 0; i < data.history.length; i++) {
        let history = data.history[i];
        var curdate = new Date(null);
        curdate.setTime(history.date);
        let dateStr = curdate.toLocaleString();

        historyHtml += `
              <tr>
                <td>${dateStr}</td>
                <td>${history.amount} ${devise}</td>
                <td>${history.views || 0}</td>
                <td>${history.paypal}</td>
                <td>${
                  history.state === 0
                    ? pendingTd
                    : history.state === -1
                    ? refusedTd
                    : processedTd
                }</td>
              </tr>
            `;
      }
    }

    const views = data.views;
    const earns = data.earns;
    const earnPer1000 = await settings['ads-earns-per-1000'];
    const minPay = await settings['ads-min-payout'];
    
    rootEl.innerHTML += `
    <div class="orion-content">
      <h2>${await peertubeHelpers.translate("Video Ads")}</h2>
      <p>
        <b>${await peertubeHelpers.translate("Earns for 1000 views")}: ${earnPer1000}${devise}</b> <i>(${minPayout} ${minPay} ${devise})</i><br>
        <b>${currentPending}: ${earns.toFixed(3)} ${devise}</b> <i>(${currentlyHashesPending} ${views} ${await peertubeHelpers.translate("views")})</i><br>
      </p>
  
      <h3>${doRequest}</h3>
      <p>
        ${requestPayoutDesc}
      </p>
      <form method="post" action="" id="ads-payout-form">
        <div class="form-group">
          <label for="paypal">${await peertubeHelpers.translate("Paypal address")}</label>
          <input class="form-control" type="text" name="paypal" id="paypal" placeholder="Ex: email@domain.tld" />
        </div>

        <div class="form-group">
          <input type="submit" class="btn btn-primary" id="submit" value="${sendBtn}" />
        </div>
      </form>
  
      <h3>${historyTitle}</h3>
      <p>${historyDesc}</p>
      <table class="table-orion">
        <thead>
          <tr>
            <th>${dateTh}</th>
            <th>${amountTh}</th>
            <th>${await peertubeHelpers.translate("Views")}</th>
            <th>${await peertubeHelpers.translate("Paypal")}</th>
            <th>${stateTh}</th>
          </tr>
        </thead>
  
        <tbody>
          ${historyHtml}
        </tbody>
      </table>
    </div>
  `;
  }

  /**
   * MINER
   */
  // Fetch user miner stats
  const response = await fetch(baseUrl + "/miner-stats", {
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
            <tr>
              <td>${dateStr}</td>
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
            </tr>
          `;
    }
  }

  // Miner user data
  const earnPer1M = settings["miner-earn-per-1m-hashes"];
  const minForPayout = settings["miner-min-payout"];
  const pending = data.message.pending;
  const pendingMintmeAmount = (earnPer1M * (pending / 1000000)).toFixed(8);

  rootEl.innerHTML += `
    <div class="orion-content">
      <h2>${await peertubeHelpers.translate("Crypto-miner")}</h2>
      <p>
        <b>${youEarn}: ${earnPer1M} MINTME</b> <i>(${minPayout} ${minForPayout} MINTME)</i><br>
        <b>${currentPending}: ${pendingMintmeAmount} MINTME</b> <i>(${currentlyHashesPending} ${pending} Hashes)</i><br>
      </p>

      <h3>${doRequest}</h3>
      <p>
        ${requestPayoutDesc}<br>
        ${requestPayoutDesc2}
      </p>
      <form method="post" action="" id="miner-payout-form">
        <div class="form-group">
          <label for="amount">${amountLabel}</label>
          <input class="form-control" type="text" name="amount" id="amount" placeholder="Ex: 0.02" />
        </div>

        <div class="form-group">
          <label for="wallet">${walletLabel}</label>
          <input class="form-control" type="text" name="wallet" id="wallet" placeholder="Ex: 0Xretkhjnkljnsdgjresldgnkjhres" />
        </div>

        <div class="form-group">
          <input type="submit" class="btn btn-primary" id="submit" value="${sendBtn}" />
        </div>
      </form>

      <h3>${historyTitle}</h3>
      <p>${historyDesc}</p>
      <table class="table-orion">
        <thead>
          <tr>
            <th>${dateTh}</th>
            <th>${amountTh}</th>
            <th>Hashes</th>
            <th>${walletTh}</th>
            <th>${stateTh}</th>
          </tr>
        </thead>

        <tbody>
          ${historyHtml}
        </tbody>
      </table>
    </div>
  `;

  setTimeout(() => {
    document
      .getElementById("miner-payout-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();

        const form = new URLSearchParams(new FormData(e.target));
        fetch(baseUrl + "/miner-payout", {
          method: "POST",
          headers: peertubeHelpers.getAuthHeader(),
          body: form,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.status && data.status === "success")
              return window.location.reload();

            peertubeHelpers.notifier.error(data.message);
          })
          .catch((error) => {
            console.error(error);
            peertubeHelpers.notifier.error(error);
          });
    });

    document
      .getElementById("ads-payout-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();

        const form = new URLSearchParams(new FormData(e.target));
        fetch(baseUrl + "/ads-payout", {
          method: "POST",
          headers: peertubeHelpers.getAuthHeader(),
          body: form,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.status && data.status === "success")
              return window.location.reload();

            peertubeHelpers.notifier.error(data.message);
          })
          .catch((error) => {
            console.error(error);
            peertubeHelpers.notifier.error(error);
          });
    });
  }, 1000);
}

export { showPage };
