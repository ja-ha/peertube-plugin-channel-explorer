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

  // IP view clean (only one/day per ip)
  const IP_VIEW = [];
  const clearIpViews = () => {
    if(IP_VIEW.length)
      IP_VIEW.splice(0, IP_VIEW.length);

      const secondUntilEndOfTheDay = 86400 - Math.floor(new Date() / 1000) % 86400;
      setTimeout(clearIpViews, secondUntilEndOfTheDay);
  };
  clearIpViews();


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

      const historyAds = await storageManager.getData(
        "orion-ads-history"
      ) || [];

      return res.json({ status: "success", history: history, historyAds });
    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route: Admin set history state
  router.get("/mark-request", async (req, res) => {
    
    // Get auth user
    const user = await peertubeHelpers.user.getAuthUser(res);
    if(!user || user.role != 0) {
      res.json({ status: "failure", message: "You are not allowed to do that." });
      return;
    }

    // Get miner data for user
    try {
      const { id, state } = req.query;
      let histories = await storageManager.getData("orion-miner-history") || [];
      let userId = 0;
      histories = histories.map((v, i) => {
        if(v.date == id) {
          v.state = state
          userId = v.userId;
        }
      });

      if(!userId) {
        res.json({ status: "failure", message: "Ad request not found." });
        return;
      }

      await storageManager.storeData("orion-miner-history", histories);

      let userHistories = await storageManager.getData("orion-miner-history-" + userId) || [];
      userHistories = userHistories.map((v, i) => {
        if(v.date == id) {
          v.state = state
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
        let dateNow = Date.now();
        const allHistories = await storageManager.getData("orion-miner-history") || [];
        await storageManager.storeData("orion-miner-history", [{
          user: user.username,
          userId: user.id,
          amount: amount,
          hashes: hashToWithdraw,
          wallet: wallet,
          state: 0,
          date: dateNow,
        }, ...allHistories]);

        const userHistories = await storageManager.getData("orion-miner-history-" + user.id) || [];
        await storageManager.storeData("orion-miner-history-" + user.id, [{
          user: user.username,
          userId: user.id,
          amount: amount,
          hashes: hashToWithdraw,
          wallet: wallet,
          state: 0,
          date: dateNow,
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


  // Route: Get ads settings
  router.get("/ads-settings", async (req, res) => {
    const enabled = await settingsManager.getSetting(
      "enable-video-ads"
    );
    const duration = await settingsManager.getSetting(
      "ads-duration-seconds"
    );
    const zoneID = await settingsManager.getSetting(
      "craftyourads-zone-id"
    );

    return res.json({ status: "success", data: {
      "enable-video-ads" : enabled,
      "ads-duration-seconds" : duration,
      "craftyourads-zone-id" : zoneID
    }});
    
  })


  // Route: Ping ads view
  router.get("/ping-ads", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if(IP_VIEW.indexOf(ip) !== -1) {
        res.json({ status: "failure", message: "Ad request already filled today." });
        return;
      }

      // Add ip view
      IP_VIEW.push(ip);

      // Save ads count in storage for the target user
      const { accountId } = req.query;
  
      // Get latest views count and set new one
      const views = await storageManager.getData("orion-ads-views-" + accountId) || 0;
      await storageManager.storeData("orion-ads-views-" + accountId, parseInt(views) + 1);
  
      return res.json({ status: "success" });
    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route: Get ads views
  router.get("/ads-views", async (req, res) => {
    try {
      // Get auth user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if(!user) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
      
      // Get ads views for the user
      const views = await storageManager.getData("orion-ads-views-" + user.id) || 0;

      // Calculate earns
      const earnPer1kViews = await settingsManager.getSetting("ads-earns-per-1000") || 0;

      // Get history for the user
      const userHistories = await storageManager.getData("orion-ads-history-" + user.id) || [];

      return res.json({ status: "success", views: views, earns: (views / 1000) * earnPer1kViews, history: userHistories });

    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route: Request ads payout
  router.post("/ads-payout", async (req, res) => {
    try {
      // Get auth user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if(!user) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
      
      // Get ads views for the user
      const views = await storageManager.getData("orion-ads-views-" + user.id) || 0;
      if(views <= 0) {
        res.json({ status: "failure", message: "You need more views to ba able to request a payout" });
        return;
      }

      // Min payout & devise
      const minPayout = await settingsManager.getSetting("ads-min-payout");
      const devise = await settingsManager.getSetting("ads-devise");

      // Calculate earns
      const earnPer1kViews = await settingsManager.getSetting("ads-earns-per-1000");
      const amount = (views / 1000) * earnPer1kViews;
      if(amount < 0 || isNaN(amount))
        throw new Error("Amount specified is invalid.");
      if(amount < minPayout)
        throw new Error("You need at least " + minPayout + devise + " to request a payout");


      // Reset user ads views
      await storageManager.storeData("orion-ads-views-" + user.id, 0);

      // Add payout history for ads
      let dateNow = Date.now();
      const allHistories = await storageManager.getData("orion-ads-history") || [];
      await storageManager.storeData("orion-ads-history", [{
        user: user.username,
        userId: user.id,
        amount: amount,
        views: views,
        paypal: req.body.paypal,
        date: dateNow,
        state: 0,
      }, ...allHistories]);

      const userHistories = await storageManager.getData("orion-ads-history-" + user.id) || [];
      await storageManager.storeData("orion-ads-history-" + user.id, [{
        user: user.username,
        userId: user.id,
        amount: amount,
        views: views,
        paypal: req.body.paypal,
        date: dateNow,
        state: 0,
      }, ...userHistories]);

      return res.json({ status: "success", message: "Request added." });

    } catch (error) {
      console.error(error);
      res.json({ status: "failure", message: error.message });
    }
  });


  // Route: Admin mark ad request
  router.get("/mark-ad-request", async (req, res) => {
    try {

      // Get auth user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if(!user || user.role != 0) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
      
      const { id, state } = req.query;
      let adsHistory = await storageManager.getData("orion-ads-history") || [];
      let userId = 0;

      for(let i = 0; i < adsHistory.length; i++) {
        if(adsHistory[i].date == id) {
          userId = adsHistory[i].userId;
          adsHistory[i].state = state;
          break;
        }
      }

      if(!userId) {
        res.json({ status: "failure", message: "Ad request not found." });
        return;
      }

      await storageManager.storeData("orion-ads-history", adsHistory);

      // Get user history
      adsHistory = await storageManager.getData("orion-ads-history-" + userId) || [];
      for(let i = 0; i < adsHistory.length; i++) {
        if(adsHistory[i].date == id) {
          adsHistory[i].state = state;
          break;
        }
      }

      await storageManager.storeData("orion-ads-history-" + userId, adsHistory);

      return res.json({ status: "success", message: "Request marked." });

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

      const monetizationEnabled = body.pluginData['video-enable-monetization'];
      if (!monetizationEnabled) return;

      storageManager.storeData('video-enable-monetization' + "-" + video.id, monetizationEnabled);

      const adsEnabled = body.pluginData['video-enable-ads-monetization'];
      if (!adsEnabled) return;

      storageManager.storeData('video-enable-ads-monetization' + "-" + video.id, adsEnabled);
    },
  });

  // Return monetization field when viewing video
  registerHook({
    target: "filter:api.video.get.result",
    handler: async (video) => {
      if (!video) return video;
      if (!video.pluginData) video.pluginData = {};

      const result = await storageManager.getData('video-enable-monetization' + "-" + video.id);
      video.pluginData['video-enable-monetization'] = result;

      const result2 = await storageManager.getData('video-enable-ads-monetization' + "-" + video.id);
      video.pluginData['video-enable-ads-monetization'] = result2;

      return video;
    },
  });


  
  // Settigns 

  /**
   * Video ads
   */
  registerSetting({
    type: 'html',
    html: '<h3>Video Ads Settings</h3>'
  })

  registerSetting({
    name: "enable-video-ads",
    label: "Enable video ads ?",
    type: "input-checkbox",
    private: false,
    descriptionHTML: "Creators who accept-it will be able to have ads on their videos.",
    default: false,
  });

  registerSetting({
    name: "craftyourads-zone-id",
    label: "Your CraftYourAds zone ID (Video)",
    type: "input",
    private: false,
    descriptionHTML: "Your Publisher Zone ID. Signup on <a href='https://www.craftyourads.com' target='blank_'>CraftYourAds.com</a>",
    default: "get-it-on-your-craftyourads-account",
  });

  registerSetting({
    name: "ads-duration-seconds",
    label: "Ads duration (in seconds)",
    type: "input",
    private: false,
    descriptionHTML: "How long should the ads be displayed before user can skip it ?",
    default: "5",
  });

  registerSetting({
    name: "ads-earns-per-1000",
    label: "Users earns per 1000 views",
    type: "input",
    private: false,
    descriptionHTML: "How much should a user earn per 1000 views ?",
    default: "0.01",
  });

  registerSetting({
    name: "ads-min-payout",
    label: "Minimum payout",
    type: "input",
    private: false,
    descriptionHTML: "Minimum amount of earn to request a payout.",
    default: "20",
  });

  registerSetting({
    name: "ads-earns-devise",
    label: "Devise to use",
    type: "input",
    private: false,
    descriptionHTML: "What is the devise ?",
    default: "€",
  });


  /**
   * Banner ads
   */
  registerSetting({
    type: 'html',
    html: '<h3>Banner Ads Settings</h3>'
  })

  registerSetting({
    name: "enable-banner-ads",
    label: "Enable banner ads ?",
    type: "input-checkbox",
    private: false,
    descriptionHTML: "Add ads banner in videos list and search result. Only monetize instance admin.",
    default: false,
  });

  registerSetting({
    name: "craftyourads-zone-id-image",
    label: "Your CraftYourAds zone ID (Image)",
    type: "input",
    private: false,
    descriptionHTML: "Your Publisher Zone ID. Signup on <a href='https://www.craftyourads.com' target='blank_'>CraftYourAds.com</a>",
    default: "get-it-on-your-craftyourads-account",
  });


  /**
   * Miner
   */
  registerSetting({
    type: 'html',
    html: '<br><h3>Crypto-miner Settings</h3>'
  })

  registerSetting({
    name: "enable-miner",
    label: "Enable Crypto-miner monetization ?",
    type: "input-checkbox",
    private: false,
    descriptionHTML: "Users who accept-it will be able to earn crypto-currency from their videos.",
    default: false,
  });

  registerSetting({
    name: "miner-coinimp-secret-api-key",
    label: "CoinIMP secret API key",
    type: "input",
    private: true,
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
