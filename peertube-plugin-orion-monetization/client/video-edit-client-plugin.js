async function register({ registerVideoField, peertubeHelpers }) {

  const settings = await peertubeHelpers.getSettings();
  const enableMiner = await settings['enable-miner'];
  const enableVideoAds = await settings['enable-video-ads'];

  if(enableMiner) {
    const enableCryptoMonetization = {
      name: "video-enable-monetization",
      label: await peertubeHelpers.translate("Enable crypto monetization"),
      descriptionHTML: await peertubeHelpers.translate("Enabling this option allow your video to be monetized with our crypto-miner when viewers allow it"),
      type: "input-checkbox",
      default: false,
    };

    for (const type of ["upload", "import-url", "import-torrent", "update"]) {
      registerVideoField(enableCryptoMonetization, { type, tab: "main" });
    }
  }

  if(enableVideoAds) {
    const enableVideoAdsMonetization = {
      name: "video-enable-ads-monetization",
      label: await peertubeHelpers.translate("Enable video ads monetization"),
      descriptionHTML: await peertubeHelpers.translate("Enabling this option allow your video to be monetized with our video ads"),
      type: "input-checkbox",
      default: false,
    };

    for (const type of ["upload", "import-url", "import-torrent", "update"]) {
      registerVideoField(enableVideoAdsMonetization, { type, tab: "main" });
    }
  }

}

export { register };
