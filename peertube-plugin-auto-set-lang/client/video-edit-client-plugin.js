async function register({ registerVideoField, peertubeHelpers }) {
  // Get browser language
  const getBrowserLanguage = () => {
    const browserLanguage = navigator.language || navigator.userLanguage
    return browserLanguage.split('-')[0]
  }

  const fieldName = "video-upload-browser-language";

  const commonOptions = {
    name: fieldName,
    label: "",
    descriptionHTML: "",
    type: "input",
    default: getBrowserLanguage(),
    hidden: () => {
      return true;
    }
  };

  for (const type of ["upload", "import-url", "import-torrent", "update"]) {
    registerVideoField(commonOptions, { type, tab: "main" });
  }
}

export { register };
