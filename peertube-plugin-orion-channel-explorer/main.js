const moment = require('moment');

async function register({
  registerHook,
  registerSetting,
  settingsManager,
  storageManager,
  videoCategoryManager,
  videoLicenceManager,
  videoLanguageManager,
  getRouter,
  peertubeHelpers
}) {
  const router = getRouter();

  router.get("/channels", async (req, res) => {
    
    try {
      
      const { skip, limit } = req.query;
      if(limit > 50) {
        return res.status(400).send("Limit must be less than 50");
      }

      const channels = await peertubeHelpers.database.query(
        'SELECT * FROM "videoChannel" ORDER BY "updatedAt" ASC LIMIT $limit OFFSET $skip',
        {
          type: "SELECT",
          bind: { skip: parseInt(skip), limit: parseInt(limit) }
        }
      )

      if(channels && channels.length > 0) {
        for(let i = 0; i < channels.length; i++) {
          const channel = channels[i];
          const actor = await peertubeHelpers.database.query(
            'SELECT * FROM "actor" WHERE "id" = $actorId',
            {
              type: "SELECT",
              bind: { actorId: channel.actorId }
            }
          );
  
          if(actor && actor.length > 0) {
            channel.username = actor[0].preferredUsername;
          }
          
          const videos = await peertubeHelpers.database.query(
            'SELECT * FROM "video" WHERE "channelId" = $channelId AND "privacy" = $privacy AND"state" = $state ORDER BY "publishedAt" DESC LIMIT 5',
            {
              type: "SELECT",
              bind: { channelId: channel.id, privacy: "1", state: "1" }
            }
          );

          if(videos && videos.length > 0) {
            channel.latestVideos = videos;
          }
        }
      }

      res.json({
        status: "success",
        data: { channels }
      });

    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.status(500).send(error.message);
    }
  });
}

async function unregister() {
  return
}

module.exports = {
  register,
  unregister
}