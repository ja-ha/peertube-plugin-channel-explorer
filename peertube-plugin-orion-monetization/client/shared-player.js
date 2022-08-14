export async function buildPlayer(peertubeHelpers, video, player, videojs) {
    if (!video) return video;
    if (!video.pluginData) video.pluginData = {};

    // Check if video settings allow monetization
    const monetizationEnabled = video.pluginData['video-enable-ads-monetization'];
    if (!monetizationEnabled) {
        console.log("Video ads monetization disabled for this video, skip next.");
        return;
    }

    // Get settings
    const settings = await peertubeHelpers.getSettings();
    const adsEnabled = await settings['enable-video-ads'];
    const adsDuration = await settings['ads-duration-seconds'];
    if (!adsEnabled) {
        console.log("Video ads are disabled by admin, skip next.");
        return;
    }

    // if(video.duration < 30) {
    //     console.log("Video is too short, skip video ads.");
    //     return;
    // }

    const zoneID = await settings['craftyourads-zone-id'];
    const api = `https://manager.craftyourads.com/adserve?zone_id=${zoneID}&type=json`;
    await player.ready();
    const base_src = player.currentSrc();

    // Get video ads
    try {
        const response = await fetch(api);
        const data = await response.json();

        const videoUrl = data.media_url;
        const redirectUrl = data.redirect_url;

        player.src(videoUrl);
        player.play();

        addAdsSkipTimer(peertubeHelpers, player, base_src, redirectUrl, adsDuration);
    }
    catch (error) {
        console.error(error);
    }
}

async function addAdsSkipTimer(peertubeHelpers, player, fallback_src, creative_url, adsDuration) {
    const skipButtonContainer = document.getElementById('plugin-placeholder-player-next');

    // Disabled player controls
    player.controls(false);

    // Add block button after #plugin-placeholder-player-next
    const skipButton = document.createElement('button');
    skipButton.id = 'skip-button';
    skipButton.innerText = await peertubeHelpers.translate('Skip Ad');
    skipButton.classList.add('btn', 'btn-primary', 'btn-sm');
    skipButton.style.display = 'none';

    skipButtonContainer.appendChild(skipButton);

    // Add skip timer
    const skipTimer = document.createElement('button');
    skipTimer.id = 'skip-timer';
    skipTimer.innerText = '00:00';
    skipTimer.classList.add('btn', 'btn-primary', 'btn-sm');
    skipButtonContainer.appendChild(skipTimer);
    skipTimer.addEventListener('click', () => {
        window.open(creative_url, '_blank');
    });

    // Add creative button 
    const creativeButton = document.createElement('button');
    creativeButton.id = 'creative-button';
    creativeButton.innerText = await peertubeHelpers.translate('View More');
    creativeButton.classList.add('btn', 'btn-primary', 'btn-sm');
    creativeButton.addEventListener('click', () => {
        window.open(creative_url, '_blank');
    });

    // Add interval to update skip timer
    const interval = setInterval(async () => {
        // Get current time
        const duration = adsDuration; // seconds
        const currentTime = player.currentTime();
        const remainingTime = duration - currentTime;

        if(remainingTime <= 0) {
            // Stop interval
            clearInterval(interval);
            skipTimer.remove();
            skipButton.style.display = 'inline-block';

            // Add click event to skip button
            skipButton.addEventListener('click', () => {
                player.controls(true);
                player.src(fallback_src);
                player.play();

                // Remove skip button
                skipButton.remove();
            });

            return;
        }

        const minutes = Math.floor(remainingTime / 60);
        const seconds = Math.floor(remainingTime % 60);
        const formattedTime = await peertubeHelpers.translate("Skip in") + " " + `${minutes}:${seconds}`;
        skipTimer.innerText = formattedTime;
    } , 1000);
}