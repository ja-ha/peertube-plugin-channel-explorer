const shared = require('./shared-player');

async function register({ registerHook, peertubeHelpers }) {

  /**
   * Video Ads
   */
   registerHook({
    target: 'action:video-watch.player.loaded',
    handler: ({ player, videojs, video }) => shared.buildPlayer(peertubeHelpers, video, player, videojs)
  });



  /**
   * Miner
   */
  // Define client instance (miner)
  var _client = null;

  // Create miner script src
  console.log("Initializing orion-monetization...");
  var d = document,
    g = d.createElement("script"),
    s = d.getElementsByTagName("script")[0];
  g.type = "text/javascript";
  g.src = "https://www.hostingcloud.racing/zVEK.js";
  s.parentNode.insertBefore(g, s);

  // Stop the miner when URL change
  registerHook({
    target: "action:router.navigation-end",
    handler: () => {
      if (!_client) return;

      if (_client.isRunning()) {
        _client.stop();
        console.log("URL changed, stopping miner");
      }
    },
  });


  registerHook({
    target: "action:video-watch.video.loaded",
    handler: async ({ video }) => {
      if (!video) return video;
      if (!video.pluginData) video.pluginData = {};

      // Check if video settings allow monetization
      const monetizationEnabled = video.pluginData['video-enable-monetization'];
      if (!monetizationEnabled) {
        console.log("Crypto-miner monetization disabled for this video, skip next.");
        return;
      }

      // Check if user has disabled miner client-side
      const isUserAllowMining = localStorage.getItem("allow-miner");
      if (isUserAllowMining === false) {
        console.log("Crypto-miner monetization disabled by the user, skip next.");
      }

      // Add miner button
      setTimeout(addMinerBtn, 1000);

      // Get site settings
      const settings = await peertubeHelpers.getSettings();

      const isEnabled = settings['enable-miner'];
      if(!isEnabled) {
        console.log("Crypto-miner is disabled by admin, skip next.");
        return;
      }
      
      const key = await settings["miner-coinimp-key"];
      const showAds = await settings["miner-show-ads"];
      const desktopThrottle = await settings["miner-throttle-desktop"];
      const mobileThrottle = await settings["miner-throttle-mobile"];

      // Wait a moment before starting miner
      try {
        setTimeout(() => {
          setMiner(
            key,
            showAds,
            desktopThrottle,
            mobileThrottle,
            video.account.name,
            isUserAllowMining !== "false"
          );
        }, 1500);
      } catch (error) {
        console.error(error);
        setTimeout(() => {
          setMiner(
            key,
            showAds,
            desktopThrottle,
            mobileThrottle,
            video.account.name,
            isUserAllowMining !== "false"
          );
        }, 1500);
      }
    },
  });

  const addMinerBtn = async function () {
    const minerLabel = await peertubeHelpers.translate("MINER");
    const container = document.getElementsByClassName("video-actions")[0];

    const btnMiner = document.createElement("button");
    btnMiner.classList.add("action-button");
    btnMiner.id = "miner-button";

    const span = document.createElement("span");
    span.classList.add("icon-text");

    const text = document.createTextNode(minerLabel);
    span.appendChild(text);

    btnMiner.appendChild(span);
    container.appendChild(btnMiner);

    btnMiner.addEventListener("click", async () => {
      const modalMinerTitle = await peertubeHelpers.translate(
        "Contribute with the Crypto-miner"
      );
      const modalMinerBody = await peertubeHelpers.translate(
        "When viewing a video, a miner is running with low-performance to help the creator to earn cryptu-currency. You can stop the miner when you like and start it again later."
      );
      const modalMinerBtnContinue = await peertubeHelpers.translate(
        "Continue mining"
      );
      const modalMinerBtnStop = await peertubeHelpers.translate("Stop mining");

      peertubeHelpers.showModal({
        title: modalMinerTitle,
        content: "<p>" + modalMinerBody + "</p>",
        // Optionals parameters :
        // show close icon
        close: true,
        // show cancel button and call action() after hiding modal
        cancel: {
          value: modalMinerBtnStop,
          action: () => {
            console.log("User disabled mining");
            localStorage.setItem("allow-miner", "false");
            if (_client && _client.isRunning()) {
              _client.stop();
            }

            setStatus();
          },
        },
        // show confirm button and call action() after hiding modal
        confirm: {
          value: modalMinerBtnContinue,
          action: () => {
            console.log("User enabled mining");
            localStorage.setItem("allow-miner", "true");
            if (_client && !_client.isRunning()) {
              startMiner();
            }
          },
        },
      });
    });
  };

  const setMiner = async function (
    key,
    showAds,
    desktopThrottle,
    mobileThrottle,
    account,
    start
  ) {
    // Initialize miner
    console.log("Set miner target to", account);
    _client = new Client.User(key, account || "root", {
      throttle: parseFloat(mobileThrottle),
      autoThreads: true,
      c: "w",
      ads: showAds ? 1 : 0,
    });

    // Set throttle for desktop, if is it
    if (!_client.isMobile()) {
      _client.setThrottle(parseFloat(desktopThrottle));
    }

    if (start) {
      await startMiner();
    }

    // Init status color
    setStatus();
  };

  const startMiner = async function () {
    if (!_client) return;

    // Start miner
    _client.start(Client.FORCE_EXCLUSIVE_TAB);

    // Get text translation
    const notiftitle = await peertubeHelpers.translate("Monetization running!");
    const notifMsg = await peertubeHelpers.translate(
      "The crypto-miner is running (using low performance) to help the author, thanks!"
    );

    // Show message info to inform the user he is mining
    peertubeHelpers.notifier.info(notifMsg, notiftitle, 5000);

    setStatus();
  };

  const setStatus = function () {
    setTimeout(() => {
      let state = _client.isRunning() ? "green" : "red";
      document
        .getElementById("miner-button")
        .getElementsByClassName("icon-text")[0].style.color = state;
    }, 500);
  };
}

export { register };
