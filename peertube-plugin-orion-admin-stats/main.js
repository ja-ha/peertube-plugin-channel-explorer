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

  router.get("/stats", async (req, res) => {
    
    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user || (user.role.id != 0 && user.role.id != 1)) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
      
      const { from, to, groupBy } = req.query;
      const fromDate = moment(from);
      const toDate = moment(to);
      const startOfMonth = moment().startOf('month');
      
      let usersCount = 0;
      let usersThisMonth;
      let videosCount = 0;
      let videosThisMonth = 0;
      let openAbusesCount = 0;
      let videoViewsStats = [];

      // Users count
      let request = await peertubeHelpers.database.query(
        'SELECT COUNT(*) AS "count" FROM "user"',
        {
          type: "SELECT"
        }
      );
      
      if(request && request.length > 0)
        usersCount = request[0].count;

      // Users this month (createdAt)
      request = await peertubeHelpers.database.query(
        'SELECT COUNT(*) AS "count" FROM "user" WHERE "createdAt" > $dat',
        {
          type: "SELECT",
          bind: { dat: startOfMonth.format('YYYY-MM-DD HH:mm:ss') }
        }
      );

      if(request && request.length > 0)
        usersThisMonth = request[0].count;
      
      // Videos count
      request = await peertubeHelpers.database.query(
        'SELECT COUNT(*) AS "count" FROM "video" WHERE "remote" = $remote',
        {
          type: "SELECT",
          bind: { remote: false }
        }
      );
      
      if(request && request.length > 0)
        videosCount = request[0].count;

      // Videos count this month
      request = await peertubeHelpers.database.query(
        'SELECT COUNT(*) AS "count" FROM "video" WHERE "createdAt" > $dat AND "remote" = $remote',
        {
          type: "SELECT",
          bind: { dat: startOfMonth.format('YYYY-MM-DD HH:mm:ss'), remote: false }
        }
      );

      if(request && request.length > 0)
        videosThisMonth = request[0].count;

      // Open abuse count
      request = await peertubeHelpers.database.query(
        'SELECT COUNT(*) AS "count" FROM "abuse" WHERE "state" = $state',
        {
          type: "SELECT",
          bind: { state: "1" }
        }
      );

      if(request && request.length > 0)
        openAbusesCount = request[0].count;

      // Video views stats (using fromDate, toDate)
      request = await peertubeHelpers.database.query(
        'SELECT "videoId", "views", "startDate", "endDate" FROM "videoView" WHERE "startDate" >= $start AND "endDate" <= $end AND "videoId" IN (SELECT "id" FROM "video" WHERE "remote" = $remote)',
        {
          type: "SELECT",
          bind: { start: fromDate.format('YYYY-MM-DD HH:mm:ss'), end: toDate.format('YYYY-MM-DD HH:mm:ss'), remote: false }
        }
      );

      if(request && request.length > 0) {
        // Group stats video views by groupBy (day, month, year)
        let groupedStats = {};
        for(let i = 0; i < request.length; i++) {
          let format = "YYYY-MM-DD";
          if(groupBy === "month")
            format = "YYYY-MM";
          else if(groupBy === "year")
            format = "YYYY";
          

          const videoView = request[i];
          const date = moment(videoView.startDate).format(format);
          const dateKey = date;
          const videoKey = videoView.videoId;

          if(!groupedStats[dateKey]) {
            groupedStats[dateKey] = {};
          }

          if(!groupedStats[dateKey][videoKey]) {
            groupedStats[dateKey][videoKey] = {
              views: 0
            };
          }

          groupedStats[dateKey][videoKey].views += videoView.views;
        }

        // Convert grouped stats to array
        videoViewsStats = Object.keys(groupedStats).map(key => {
          return {
            date: key,
            items: Object.keys(groupedStats[key]).map(videoKey => {
              return {
                videoId: videoKey,
                views: groupedStats[key][videoKey].views
              };
            })
          };
        });

        // Sort video views stats by date
        videoViewsStats.sort((a, b) => {
          return moment(a.date).isAfter(moment(b.date)) ? 1 : -1;
        });
      }
      
      res.json({
        status: "success",
        data: { usersCount, usersThisMonth, videosCount, videosThisMonth, openAbusesCount, videoViewsStats }
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