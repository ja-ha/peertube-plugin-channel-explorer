const BAN_DATE_KEY = 'orion-ban-date';
const CHANNEL_BANNED_REASON_KEY = 'mod-channel-temporary-banned';

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
  /**
   * Cron jobs
   */
  checkChannelsToUnban(peertubeHelpers, storageManager);
  setInterval(() => {
    checkChannelsToUnban(peertubeHelpers, storageManager);
  }, 1000 * 60 * 60 * 24);
  

  /**
   * Routes
   */
  const router = getRouter();

  // Route: Ban channel
  router.post("/ban", async (req, res) => {
    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user || (user.role != 0 && user.role != 1)) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
  
      const { channelId } = req.body; // duration in days
      const duration = parseInt(req.body.duration);
      if (!channelId || !duration) {
        res.json({ status: "failure", message: "Missing parameters." });
        return;
      }
  
      // Get channel
      const realChannelId = await getChannelIdByName(peertubeHelpers, channelId);
      if (!realChannelId) {
        res.json({ status: "failure", message: "Channel not found." });
        return;
      }
  
      banChannel(realChannelId, duration, peertubeHelpers, storageManager);
  
      res.json({ status: "success", message: "Channel banned for " + duration + " days." });
    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route:: Unban channel
  router.post("/unban", async (req, res) => {
    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user || (user.role != 0 && user.role != 1)) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
  
      const { channelId } = req.body;
      if (!channelId) {
        res.json({ status: "failure", message: "Missing parameters." });
        return;
      }
  
      // Get channel
      const results = await peertubeHelpers.database.query(
        'SELECT "id" from "videoChannel" WHERE "name" = $channelId',
        {
          type: 'SELECT',
          bind: { channelId }
        }
      );
      if (!results || results.length == 0) {
        res.json({ status: "failure", message: "Channel not found." });
        return;
      }
  
      const realChannelId = results[0].id;
      await unbanChannel(realChannelId, peertubeHelpers, storageManager);
  
      res.json({ status: "success", message: "Channel unbanned." });
    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route:: is channel banned ?
  router.get("/is-channel-banned", async (req, res) => {
    console.log(req.query);
    try {
      const channelId = req.query.channelId;
      if (!channelId) {
        res.json({ status: "failure", message: "Missing parameters." });
        return;
      }
  
      const realChannelId = await getChannelIdByName(peertubeHelpers, channelId);
      if (!realChannelId) {
        res.json({ status: "failure", message: "Channel not found." });
        return;
      }
  
      const isBanned = await isChannelBanned(realChannelId, peertubeHelpers, storageManager);
      res.json({ status: "success", isBanned: isBanned !== false, endAt: isBanned });

    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
      
  });
    


  /**
   * Deny access to upload if channel is banned
   */
  for(const hook of [
    "filter:api.video.upload.accept.result",
    "filter:api.live-video.create.accept.result",
    "filter:api.video.post-import-url.accept.result",
    "filter:api.video.post-import-torrent.accept.result"
  ]) {
    registerHook({
      target: hook,
      handler: async ({ accepted }, { video }) => {
        console.log(video)
        if (!accepted) return { accepted: false };
        if (!video) return { accepted: accepted };
        if (!video.channelId) return { accepted: accepted };
  
        const channelId = video.channelId;
        const isBanned = await isChannelBanned(channelId, peertubeHelpers, storageManager);
        if(isBanned) {
          return { accepted: false, errorMessage: "You are banned from this channel." };
        }
  
        return { accepted: true };
      }
    });
  }
}

async function unregister() {
  return
}

module.exports = {
  register,
  unregister
}

async function checkChannelsToUnban(peertubeHelpers, storageManager) {
  peertubeHelpers.logger.info('Checking channels to unban (checked every 24H)');

  const videos = await peertubeHelpers.database.query(
    'SELECT "videoId" from "videoBlacklist" WHERE "reason" = $reason',
    {
      type: 'SELECT',
      bind: { reason: CHANNEL_BANNED_REASON_KEY }
    }
  );

  if (!videos || videos.length == 0) return;
  let bannedChannelIds = [];
  for (const video of videos) {
    const videoId = video.videoId;
    const results = await peertubeHelpers.database.query(
      'SELECT "channelId" from "video" WHERE "id" = $videoId',
      {
        type: 'SELECT',
        bind: { videoId }
      }
    );

    if (!results || results.length == 0) continue;
    const channelId = results[0].channelId;
    // If channelId is not in array, push it
    if (!bannedChannelIds.includes(channelId))
      bannedChannelIds.push(channelId);
  }

  for (const channelId of bannedChannelIds) {
    await isChannelBanned(channelId, peertubeHelpers, storageManager);
  }
}

async function isChannelBanned(channelId, peertubeHelpers, storageManager) {
  const unbanDate = await storageManager.getData(BAN_DATE_KEY + "-" + channelId);
  if (unbanDate) {
    const now = new Date();
    if (now < new Date(unbanDate)) {
      return new Date(unbanDate);
    } else {
      await storageManager.storeData(BAN_DATE_KEY + "-" + channelId, null);
      await unbanChannel(channelId, peertubeHelpers, storageManager);
    }
  }

  return false;
}
async function banChannel(channelId, duration, peertubeHelpers, storageManager) {
  // Get videos channel
  const videos = await peertubeHelpers.database.query(
    'SELECT "id" from "video" WHERE "channelId" = $channelId',
    {
      type: 'SELECT',
      bind: { channelId }
    }
  );

  if (videos) {
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      if (!video || !video.id) continue;

      // Check if the video is already blacklisted
      const results = await peertubeHelpers.database.query(
        'SELECT "id" from "videoBlacklist" WHERE "videoId" = $videoId',
        {
          type: 'SELECT',
          bind: { videoId: video.id }
        }
      );

      // Skip, if video is already blacklisted
      if (results && results.length > 0) continue;

      // Add video to blacklist
      await peertubeHelpers.moderation.blacklistVideo({
        videoIdOrUUID: video.id,
        createOptions: {
          reason: CHANNEL_BANNED_REASON_KEY,
          unfederate: true
        }
      });
    }
  }

  // Set unban date using duration in days
  const unbanDate = new Date();
  unbanDate.setDate(unbanDate.getDate() + duration);

  await storageManager.storeData(BAN_DATE_KEY + "-" + channelId, unbanDate);
  peertubeHelpers.logger.info('Channel ' + channelId + ' banned for ' + duration + ' days');
}

async function unbanChannel(channelId, peertubeHelpers, storageManager) {
  // Get videos channel
  const videos = await peertubeHelpers.database.query(
    'SELECT "id" from "video" WHERE "channelId" = $channelId',
    {
      type: 'SELECT',
      bind: { channelId }
    }
  );

  if (videos) {
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      if (!video || !video.id) continue;

      const bk = await peertubeHelpers.database.query(
        'SELECT "reason" from "videoBlacklist" WHERE "videoId" = $videoId AND "reason" = $reason',
        {
          type: 'SELECT',
          bind: { videoId: video.id, reason: CHANNEL_BANNED_REASON_KEY }
        }
      )

      if(!bk || bk.length == 0) continue;
      const bkItem = bk[0];

      if(bkItem.reason == CHANNEL_BANNED_REASON_KEY) {
        await peertubeHelpers.moderation.unblacklistVideo({
          videoIdOrUUID: video.id
        });
      }

    }
  }

  await storageManager.storeData(BAN_DATE_KEY + "-" + channelId, null);
  peertubeHelpers.logger.info('Channel ' + channelId + ' unbanned');
}

async function getChannelIdByName(peertubeHelpers, name) {
  // Get channel
  const results = await peertubeHelpers.database.query(
    'SELECT "id" from "videoChannel" WHERE "name" = $channelId',
    {
      type: 'SELECT',
      bind: { channelId: name }
    }
  );

  if (!results || results.length == 0) return null;

  return results[0].id;
}