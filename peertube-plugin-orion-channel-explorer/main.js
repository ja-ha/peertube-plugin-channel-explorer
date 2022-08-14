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