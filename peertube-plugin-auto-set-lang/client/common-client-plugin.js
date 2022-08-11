function register ({ registerHook, peertubeHelpers }) {
  var isUserLangDefined = false;

  // Get browser language
  const getBrowserLanguage = () => {
    const browserLanguage = navigator.language || navigator.userLanguage
    return browserLanguage.split('-')[0]
  }

  // Set params languageOneOf 
  const setParamsLang = (params) => {
    const isGuest = peertubeHelpers.isLoggedIn() === false;

    if(isGuest) {
      const definedLang = localStorage.getItem("video_languages") || null;
      if(definedLang)
        return params;
    }else{
      if(isUserLangDefined) {
        return params;
      }
    }

    if('languageOneOf' in params) {
      return params;
    }

    return {
      ...params,
      languageOneOf: [getBrowserLanguage()]
    }
  };
  
  registerHook({
    target: "filter:api.trending-videos.videos.list.params",
    handler: setParamsLang
  });
  registerHook({
    target: "filter:api.most-liked-videos.videos.list.params",
    handler: setParamsLang
  });
  registerHook({
    target: "filter:api.local-videos.videos.list.params",
    handler: setParamsLang
  });
  registerHook({
    target: "filter:api.recently-added-videos.videos.list.params",
    handler: setParamsLang
  });
  registerHook({
    target: "filter:api.user-subscriptions-videos.videos.list.params",
    handler: setParamsLang
  });
  registerHook({
    target: "filter:api.search.videos.list.params",
    handler: setParamsLang
  });
  registerHook({
    target: "filter:api.search.video-channels.list.params",
    handler: setParamsLang
  });
  
  registerHook({
    target: 'action:auth-user.information-loaded',
    handler: ({ user }) => {
      if(user.videoLanguages === null) {
        isUserLangDefined = false;
      }else{
        isUserLangDefined = true;
      }
    }
  })
}

export {
  register
}
