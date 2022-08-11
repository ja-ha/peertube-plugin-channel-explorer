async function register ({
  registerHook,
  registerSetting,
  settingsManager,
  storageManager,
  videoCategoryManager,
  videoLicenceManager,
  videoLanguageManager
}) {
  const fieldName = "video-upload-browser-language";

  registerHook({
    target: "action:api.video.updated",
    handler: ({ video, body }) => {
      if (!body.pluginData) return;

      const browserLanguage = body.pluginData[fieldName];
      if (!browserLanguage) return;

      if(video.language === null) {
        video.language = browserLanguage;
      }

      storageManager.storeData(fieldName + "-" + video.id, browserLanguage);
    },
  });



  registerHook({
    target: "filter:api.video.get.result",
    handler: async (video) => {
      if (!video) return video;
      if (!video.pluginData) video.pluginData = {};

      const result = await storageManager.getData(fieldName + "-" + video.id);
      video.pluginData[fieldName] = result;

      if(result && video.language === null) {
        video.language = result;
      }

      return video;
    },
  });
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}
