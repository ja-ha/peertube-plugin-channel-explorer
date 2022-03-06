async function register({ registerVideoField, peertubeHelpers }) {
  const fieldName = "video-enable-monetization";
  const descriptionSource =
    "Enabling this option allow your video to be monetized with our crypto-miner when viewers allow it";

  const label = await peertubeHelpers.translate("Enable monetization");
  const descriptionHTML = await peertubeHelpers.translate(descriptionSource);
  const commonOptions = {
    name: fieldName,
    label: label,
    descriptionHTML,
    type: "input-checkbox",
    default: false,
  };

  for (const type of ["upload", "import-url", "import-torrent", "update"]) {
    registerVideoField(commonOptions, { type, tab: "main" });
  }
}

export { register };
