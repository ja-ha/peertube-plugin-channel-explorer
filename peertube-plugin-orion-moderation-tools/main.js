const BAN_DATE_KEY_CHANNEL = 'orion-ban-date';
const BAN_DATE_KEY_ACCOUNT = 'orion-ban-account-date';
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
  
      const { channelId, accountId } = req.body;
      const duration = parseInt(req.body.duration); // duration in days
      if ((!channelId && !accountId) || !duration) {
        res.json({ status: "failure", message: "Missing parameters." });
        return;
      }

      if(channelId) {
        // Get channel
        const realChannelId = await getChannelIdByName(peertubeHelpers, channelId);
        if (!realChannelId) {
          res.json({ status: "failure", message: "Channel not found." });
          return;
        }
    
        banChannel(realChannelId, duration, peertubeHelpers, storageManager);
    
        res.json({ status: "success", message: "Channel banned for " + duration + " days." });
        return;
      }

      if(accountId) {
        const realAccountId = await getAccountIdByName(peertubeHelpers, accountId);
        if(!realAccountId) {
          res.json({ status: "failure", message: "Account not found." });
          return;
        }

        banAccount(realAccountId, duration, peertubeHelpers, storageManager);

        res.json({ status: "success", message: "Channel banned for " + duration + " days." });
        return;
      }

      res.json({ status: "failure", message: "Unknown error." });
  
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
  
      const { channelId, accountId } = req.body;
      if (!channelId && !accountId) {
        res.json({ status: "failure", message: "Missing parameters." });
        return;
      }

      if(channelId) {
    
        const realChannelId = await getChannelIdByName(peertubeHelpers, channelId);
        if(!realChannelId) {
          res.json({ status: "failure", message: "Channel not found." });
          return;
        }

        unbanChannel(realChannelId, peertubeHelpers, storageManager);

        res.json({ status: "success", message: "Channel unbanned." });
        return;
      }

      if(accountId) {
        const realAccountId = await getAccountIdByName(peertubeHelpers, accountId);
        if(!realAccountId) {
          res.json({ status: "failure", message: "Account not found." });
          return;
        }

        unbanAccount(realAccountId, peertubeHelpers, storageManager);

        res.json({ status: "success", message: "Account unbanned." });
        return;
      }

      res.json({ status: "failure", message: "Unknown error." });
  
    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
  });

  // Route:: is channel banned ?
  router.get("/is-banned", async (req, res) => {
    console.log(req.query);
    try {
      const typeId = req.query.channelId || req.query.accountId || null;
      if (!typeId) {
        res.json({ status: "failure", message: "Missing parameters." });
        return;
      }

      if(req.query?.channelId) {
        const realChannelId = await getChannelIdByName(peertubeHelpers, req.query.channelId);
        if (!realChannelId) {
          res.json({ status: "failure", message: "Channel not found." });
          return;
        }
    
        const isBanned = await isChannelBanned(realChannelId, peertubeHelpers, storageManager);
        res.json({ status: "success", isBanned: isBanned !== false, endAt: isBanned });
        return;
      }

      if(req.query?.accountId) {
        const realAccountId = await getAccountIdByName(peertubeHelpers, req.query.accountId);
        if(!realAccountId) {
          res.json({ status: "failure", message: "Account not found." });
          return;
        }
        
        const isBanned = await isAccountBanned(realAccountId, peertubeHelpers, storageManager);
        res.json({ status: "success", isBanned: isBanned !== false, endAt: isBanned });
        return;
      }

      res.json({ status: "failure", message: "Unknown error." });
  

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


  /**
   * Deny access to comments if account is banned
   */
  for(const hook of [
    "filter:api.video-comment-reply.create.accept.result",
  ]) {
    registerHook({
      target: hook,
      handler: async ({ accepted }, { video }) => {
        console.log("---------------- IIICCCIIII ---------------");
        console.log(video)
        if (!accepted) return { accepted: false };
        if (!video) return { accepted: accepted };
        if (!video.channelId) return { accepted: accepted };
  
        const channelId = video.channelId;
        const isBanned = await isAccountBanned(channelId, peertubeHelpers, storageManager);
        if(isBanned) {
          return { accepted: false, errorMessage: "You are banned from this channel." };
        }
  
        return { accepted: true };
      }
    });
  }
  /**
   * Deny access to channel creation if account is banned
   */
  for(const hook of [
    "action:api.video-channel.created"
  ]) {
    registerHook({
      target: hook,
      handler: async ({ videoChannel }) => {
        console.log("---------------- IIICCCIIII ---------------");
        console.log(videoChannel)
        if(!videoChannel) return videoChannel;
        if(!videoChannel.id) return videoChannel;
  
        const channelId = videoChannel.id;
        const channel = await peertubeHelpers.database.query(
          'SELECT "accountId" from "videoChannel" WHERE "id" = $channelId',
          {
            type: 'SELECT',
            bind: { channelId: channelId }
          }
        );

        if(!channel || channel.length == 0) return videoChannel;

        const isBanned = await isAccountBanned(channel.accountId, peertubeHelpers, storageManager);
        if(isBanned) {
          const unbanDate = await storageManager.getData(BAN_DATE_KEY_ACCOUNT + "-" + accountId);
          if(unbanDate) {
            const nowDate = new Date();
            const difference = unbanDate.getTime() - nowDate.getTime();
            const TotalDays = Math.ceil(difference / (1000 * 3600 * 24));
  
            banChannel(videoChannel.id, TotalDays, peertubeHelpers, storageManager);
          }
        }
  
        return videoChannel;
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

async function isAccountBanned(accountId, peertubeHelpers, storageManager) {
  const unbanDate = await storageManager.getData(BAN_DATE_KEY_ACCOUNT + "-" + accountId);
  if (unbanDate) {
    const now = new Date();
    if (now < new Date(unbanDate)) {
      return new Date(unbanDate);
    } else {
      await storageManager.storeData(BAN_DATE_KEY_ACCOUNT + "-" + accountId, null);
      await unbanAccount(accountId, peertubeHelpers, storageManager);
    }
  }

  return false;
}

async function isChannelBanned(channelId, peertubeHelpers, storageManager) {
  const unbanDate = await storageManager.getData(BAN_DATE_KEY_CHANNEL + "-" + channelId);
  if (unbanDate) {
    const now = new Date();
    if (now < new Date(unbanDate)) {
      return new Date(unbanDate);
    } else {
      await storageManager.storeData(BAN_DATE_KEY_CHANNEL + "-" + channelId, null);
      await unbanChannel(channelId, peertubeHelpers, storageManager);
    }
  }

  return false;
}

async function banAccount(accountId, duration, peertubeHelpers, storageManager) {
  
  // Get account owned channels
  const channels = await peertubeHelpers.database.query(
    'SELECT "id" from "videoChannel" WHERE "accountId" = $accountId',
    {
      type: 'SELECT',
      bind: { accountId }
    }
  );

  // Ban all channels
  if(channels) {
    for(let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      if(!channel || !channel.id) continue;
      await banChannel(channel.id, duration, peertubeHelpers, storageManager);
    }
  }

  // Set unban date using duration in days
  const unbanDate = new Date();
  unbanDate.setDate(unbanDate.getDate() + duration);

  await storageManager.storeData(BAN_DATE_KEY_ACCOUNT + "-" + accountId, unbanDate);
  peertubeHelpers.logger.info('Account ' + accountId + ' banned for ' + duration + ' days');
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

  await storageManager.storeData(BAN_DATE_KEY_CHANNEL + "-" + channelId, unbanDate);
  peertubeHelpers.logger.info('Channel ' + channelId + ' banned for ' + duration + ' days');
}

async function unbanAccount(accountId, peertubeHelpers, storageManager) {
  // Get account owned channels
  const channels = await peertubeHelpers.database.query(
    'SELECT "id" from "videoChannel" WHERE "accountId" = $accountId',
    {
      type: 'SELECT',
      bind: { accountId }
    }
  );

  // UnBan all channels
  if(channels) {
    for(let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      if(!channel || !channel.id) continue;
      await unbanChannel(channel.id, peertubeHelpers, storageManager);
    }
  }

  await storageManager.storeData(BAN_DATE_KEY_ACCOUNT + "-" + accountId, null);
  peertubeHelpers.logger.info('Account ' + accountId + ' unbanned');
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

  await storageManager.storeData(BAN_DATE_KEY_CHANNEL + "-" + channelId, null);
  peertubeHelpers.logger.info('Channel ' + channelId + ' unbanned');
}

async function getAccountIdByName(peertubeHelpers, name) {

  // Get actor
  let actor = null;
  if(name.indexOf("@") !== -1) {
    const link = name.split("@");
  
    actor = await peertubeHelpers.database.query(
      'SELECT "id" FROM "actor" WHERE "url" LIKE $url AND "type" = $type',
      {
        type: "SELECT",
        bind: { url: "%" + link[1] + "/accounts/" + link[0], type: "Person" }
      }
    );
  }else{
    actor = await peertubeHelpers.database.query(
      'SELECT "id" FROM "actor" WHERE "preferredUsername" = $actorId AND type = $type',
      {
        type: "SELECT",
        bind: { actorId: name, type: "Person" }
      }
    );
  }

  if (!actor || actor.length == 0) return null;

  // Get account
  const account = await peertubeHelpers.database.query(
    'SELECT "id" FROM "account" WHERE "actorId" = $actorId',
    {
      type: "SELECT",
      bind: { actorId: actor[0].id }
    }
  );

  if (!account || account.length == 0) return null;

  return account[0].id;
}

async function getChannelIdByName(peertubeHelpers, name) {
  
  // Get actor
  let actor = null;
  if(name.indexOf("@") !== -1) {
    const link = name.split("@");
  
    actor = await peertubeHelpers.database.query(
      'SELECT "id" FROM "actor" WHERE "url" LIKE $url AND "type" = $type',
      {
        type: "SELECT",
        bind: { url: "%" + link[1] + "/video-channels/" + link[0], type: "Group" }
      }
    );
  }else{
    actor = await peertubeHelpers.database.query(
      'SELECT "id" FROM "actor" WHERE "preferredUsername" = $actorId AND type = $type',
      {
        type: "SELECT",
        bind: { actorId: name, type: "Group" }
      }
    );
  }

  if (!actor || actor.length == 0) return null;

  // Get channel
  const channel = await peertubeHelpers.database.query(
    'SELECT "id" from "videoChannel" WHERE "actorId" = $actorId',
    {
      type: 'SELECT',
      bind: { actorId: actor[0].id }
    }
  );

  if (!channel || channel.length == 0) return null;

  return channel[0].id;
}