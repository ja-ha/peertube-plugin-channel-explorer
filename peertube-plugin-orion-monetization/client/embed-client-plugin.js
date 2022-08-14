const shared = require('./shared-player')

function register ({ registerHook, peertubeHelpers}) {
  registerHook({
    target: 'action:embed.player.loaded',
    handler: ({ player, videojs, video }) => shared.buildPlayer(peertubeHelpers, video, player, videojs)
  })
}

export {
  register
}
