const FormData = require('form-data');

async function register({
  registerHook,
  registerSetting,
  storageManager,
  settingsManager,
  getRouter,
  peertubeHelpers
}) {
  const router = getRouter();
  const fieldName = "video-enable-monetization";

  // Route: User get stats info
  router.get("/miner-stats", async (req, res) => {
    // Get keys in admin settings
    const APIsecret = await settingsManager.getSetting(
      "miner-coinimp-secret-api-key"
    );
    const APIpublic = await settingsManager.getSetting(
      "miner-coinimp-public-api-key"
    );
    const SiteKey = await settingsManager.getSetting("miner-coinimp-key");

    // Get auth user
    const user = await peertubeHelpers.user.getAuthUser(res);

    // Get miner data for user
    try {
      const response = await fetch(
        "https://www.coinimp.com/api/v2/user/balance?site-key=" +
          SiteKey +
          "&user=" +
          user.username,
        {
          method: "GET",
          headers: new Headers({
            "X-API-ID": APIpublic,
            "X-API-KEY": APIsecret,
          }),
        }
      );

      const history = await storageManager.getData(
        "orion-miner-history-" + user.id
      );
      const data = await response.json();

      return res.json({ status: data.status, message: data.message, history });
    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route: Get admin history
  router.get("/admin-history", async (req, res) => {
    
    // Get auth user
    const user = await peertubeHelpers.user.getAuthUser(res);
    if(user.role != 0) {
      res.json({ status: "failure", message: "You are not allowed to see admin history." });
      return;
    }

    // Get miner data for user
    try {
      const history = await storageManager.getData(
        "orion-miner-history"
      ) || [];

      return res.json({ status: "success", history: history });
    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route: Admin set history state
  router.get("/mark-request", async (req, res) => {
    
    // Get auth user
    const user = await peertubeHelpers.user.getAuthUser(res);
    if(user.role != 0) {
      res.json({ status: "failure", message: "You are not allowed to do that." });
      return;
    }

    // Get miner data for user
    try {
      let histories = await storageManager.getData("orion-miner-history") || [];
      let userId = 0;
      histories = histories.map((v, i) => {
        if(v.date === req.query.id) {
          v.state = req.query.state
          userId = v.userId;
        }
      });
      await storageManager.storeData("orion-miner-history", histories);

      let userHistories = await storageManager.getData("orion-miner-history-" + userId) || [];
      userHistories = userHistories.map((v, i) => {
        if(v.date === req.query.id) {
          v.state = req.query.state
        }
      });
      await storageManager.storeData("orion-miner-history-" + userId, userHistories);

      return res.json({ status: "success" });
    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route: User request payout
  router.post("/miner-payout", async (req, res) => {
    // Get keys in admin settings
    const APIsecret = await settingsManager.getSetting(
      "miner-coinimp-secret-api-key"
    );
    const APIpublic = await settingsManager.getSetting(
      "miner-coinimp-public-api-key"
    );
    const SiteKey = await settingsManager.getSetting("miner-coinimp-key");
    const minForPayout = await settingsManager.getSetting("miner-min-payout");

    // Get auth user
    const user = await peertubeHelpers.user.getAuthUser(res);

    // Get amount and wallet send on the request
    const amount = req.body.amount;
    const wallet = req.body.wallet;

    // Withdrawn user pending
    try {
      if (amount < 0 || isNaN(amount))
        throw new Error("Amount specified is invalid.");
      if(amount < minForPayout)
        throw new Error("You need at least " + minForPayout + " MINTME to request a payout");
      if (wallet.length <= 3)
        throw new Error("Your wallet address is unvalid.");

      // Get miner hashes to payout
      const earnPer1M = await settingsManager.getSetting("miner-earn-per-1m-hashes");
      const hashToWithdraw = (1000000 * amount) / earnPer1M;

      const formData = new FormData();
      formData.append('site-key', SiteKey);
      formData.append('user', user.username);
      formData.append('amount', hashToWithdraw);

      const response = await fetch(
        "https://www.coinimp.com/api/v2/user/withdraw",
        {
          method: "POST",
          headers: new Headers({
            "X-API-ID": APIpublic,
            "X-API-KEY": APIsecret,
          }),
          body: formData
        }
      );

      const data = await response.json();
      if (data.status && data.status === "success") {
        const allHistories = await storageManager.getData("orion-miner-history") || [];
        await storageManager.storeData("orion-miner-history", [{
          user: user.username,
          userId: user.id,
          amount: amount,
          hashes: hashToWithdraw,
          wallet: wallet,
          state: 0,
          date: Date.now(),
        }, ...allHistories]);

        const userHistories = await storageManager.getData("orion-miner-history-" + user.id) || [];
        await storageManager.storeData("orion-miner-history-" + user.id, [{
          user: user.username,
          userId: user.id,
          amount: amount,
          hashes: hashToWithdraw,
          wallet: wallet,
          state: 0,
          date: Date.now(),
        }, ...userHistories]);

        return res.json({ status: "success", message: "Request added." });
      } else {
        return res.json({
          status: "failure",
          message: data.message || "Unknown error",
        });
      }
    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Set monetization field when update video setting
  registerHook({
    target: "action:api.video.updated",
    handler: ({ video, body }) => {
      if (!body.pluginData) return;

      const monetizationEnabled = body.pluginData[fieldName];
      if (!monetizationEnabled) return;

      storageManager.storeData(fieldName + "-" + video.id, monetizationEnabled);
    },
  });

  // Return monetization field when viewing video
  registerHook({
    target: "filter:api.video.get.result",
    handler: async (video) => {
      if (!video) return video;
      if (!video.pluginData) video.pluginData = {};

      const result = await storageManager.getData(fieldName + "-" + video.id);
      video.pluginData[fieldName] = result;

      return video;
    },
  });

  // Registering all settings for admin
  registerSetting({
    name: "miner-coinimp-secret-api-key",
    label: "CoinIMP secret API key",
    type: "input",
    private: false,
    descriptionHTML: "The account secret API key. Signup on <a href='https://www.coinimp.com' target='blank_'>CoinIMP.com</a>",
    default: "get-it-on-your-coinimp-account",
  });

  registerSetting({
    name: "miner-coinimp-public-api-key",
    label: "CoinIMP public API key",
    type: "input",
    private: false,
    descriptionHTML: "The account public API key",
    default: "09ec999db885a4bac07a61a2ee33f8f80e117142bd4e2722130303fcd2a91feb",
  });

  registerSetting({
    name: "miner-coinimp-key",
    label: "CoinIMP public Site key",
    type: "input",
    private: false,
    descriptionHTML: "The public key of the website.",
    default: "0dffb7309465b7e048d6881c702295333ae02723a5f55767accbeb935179a4d3",
  });

  registerSetting({
    name: "miner-earn-per-1m-hashes",
    label: "MINTME user earns",
    type: "input",
    private: false,
    descriptionHTML: "How much MINTME to give per 1M hashes to user",
    default: "0.06954153",
  });

  registerSetting({
    name: "miner-min-payout",
    label: "Minimum MINTME payout",
    type: "input",
    private: false,
    descriptionHTML: "Minimum MINTME pending to allow user to request a payout",
    default: "0.02",
  });

  registerSetting({
    name: "miner-show-ads",
    label: "Show ads",
    type: "input-checkbox",
    private: false,
    descriptionHTML: "Show ads to user ? Only one per month per user",
    default: true,
  });

  registerSetting({
    name: "miner-throttle-desktop",
    label: "Miner CPU throttle (Desktop)",
    type: "input",
    private: false,
    descriptionHTML: "CPU throttle (time to wait for cpu usage) <code>0-1, 0.85 = 85% waiting / 15% usage</code>",
    default: "0.85",
  });

  registerSetting({
    name: "miner-throttle-mobile",
    label: "Miner CPU throttle (Mobile)",
    type: "input",
    private: false,
    descriptionHTML: "CPU throttle (time to wait for cpu usage) <code>0-1, 0.9 = 90% waiting / 10% usage</code>",
    default: "0.9",
  });
}

async function unregister() {
  return;
}

module.exports = {
  register,
  unregister,
};
