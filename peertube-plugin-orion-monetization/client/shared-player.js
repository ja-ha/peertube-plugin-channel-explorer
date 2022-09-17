export async function buildPlayer(peertubeHelpers, video, player, videojs) {
    if (!video) return video;
    if (!video.pluginData) video.pluginData = {};

    // Check if video settings allow monetization
    const monetizationEnabled = video.pluginData['video-enable-ads-monetization'];
    if (!monetizationEnabled) {
        console.log("Video ads monetization disabled for this video, skip next.");
        return;
    }

    // Do not show ad one time of 2 (check local storage)
    const adAlreadShow = localStorage.getItem("ad-already-show") || false;
    if(adAlreadShow) {
        // Remove item in local storage to see ad the next time
        localStorage.removeItem("ad-already-show");
        console.log("Ad already show, skip next.");
        return;
    }else{
        // Set item in local storage to not see ad the next time
        localStorage.setItem("ad-already-show", true);
    }


    // Get settings
    let settings, adsEnabled, adsDuration, zoneID;
    if(peertubeHelpers) {
        settings = await peertubeHelpers.getSettings();
        adsEnabled = await settings['enable-video-ads'];
        adsDuration = await settings['ads-duration-seconds'];
        zoneID = await settings['craftyourads-zone-id'];
    }else{
        const response = await fetch("/plugins/orion-monetization/1.5.0/router/ads-settings");
        const data = await response.json();

        adsEnabled = data['enable-video-ads'];
        adsDuration = data['ads-duration-seconds'];
        zoneID = data['craftyourads-zone-id'];
    }

    // Check enabled
    if (!adsEnabled) {
        console.log("Video ads are disabled by admin, skip next.");
        return;
    }

    // Check video duration
    if(video.duration < 30) {
        console.log("Video is too short, skip video ads.");
        return;
    }

    // Wait for player ready and save the current video
    await player.ready();
    const base_src = {
        src: player.currentSrc(),
        type: player.currentType()
    }
    
    // Get video ads
    try {
        // Set api link
        const api = `https://manager.craftyourads.com/adserve?zone_id=${zoneID}&type=json`;

        const response = await fetch(api);
        const data = await response.json();

        const videoUrl = data.media_url;
        const redirectUrl = data.redirect_url;

        player.src(videoUrl);
        player.currentTime(0);
        player.controls(false);

        
        await player.play().catch(() => {
            console.log("Error while auto playing video. Waiting for user runnning the video.");
        });

        addAdsSkipTimer(peertubeHelpers, player, base_src, redirectUrl, adsDuration, video);
    }
    catch (error) {
        console.error(error);
    }
}

async function addAdsSkipTimer(peertubeHelpers, player, fallback_src, creative_url, adsDuration, video) {
    const skipButtonContainer = document.getElementById('video-wrapper');
    // Set as relative position
    skipButtonContainer.style.position = 'relative';

    // Create a container for our buttons
    const skipButtonContainerDiv = document.createElement('div');
    skipButtonContainerDiv.style.position = 'absolute';
    skipButtonContainerDiv.style.bottom = '15px';
    skipButtonContainerDiv.style.right = '15px';
    skipButtonContainerDiv.style.color = '#fff';
    skipButtonContainerDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    skipButtonContainerDiv.style.padding = '5px';
    skipButtonContainerDiv.style.borderRadius = '5px';
    skipButtonContainerDiv.innerHTML = "<p>" + await peertubeHelpers.translate("Your are seeing this Ad from CraftYourAds") + "</p>";

    // Add block button after #video-wrapper
    const skipButton = document.createElement('button');
    skipButton.id = 'skip-button';
    skipButton.innerText = await peertubeHelpers.translate('Skip Ad');
    skipButton.classList.add('btn', 'btn-primary', 'btn-sm');
    skipButton.style.display = 'none';

    // Add skip timer
    const skipTimer = document.createElement('button');
    skipTimer.id = 'skip-timer';
    skipTimer.innerHTML = await peertubeHelpers.translate('Skip Ad in') + " " + adsDuration + ' ' + await peertubeHelpers.translate('seconds');
    skipTimer.classList.add('btn', 'btn-primary', 'btn-sm');
    skipTimer.addEventListener('click', () => {
        window.open(creative_url, '_blank');
    });

    // Add creative button 
    const creativeButton = document.createElement('button');
    creativeButton.id = 'creative-button';
    creativeButton.innerText = await peertubeHelpers.translate('View more') + ' >>';
    creativeButton.classList.add('btn', 'btn-primary', 'btn-sm');
    creativeButton.addEventListener('click', () => {
        window.open(creative_url, '_blank');
    });

    // Add our buttons to our container
    skipButtonContainerDiv.appendChild(skipButton);
    skipButtonContainerDiv.appendChild(skipTimer);
    skipButtonContainerDiv.appendChild(creativeButton);

    // Add our container to main container
    skipButtonContainer.appendChild(skipButtonContainerDiv);

    // Function to skip the ad
    const skipNow = async (viewed = true) => {
        player.src({
            src: fallback_src.src,
            type: fallback_src.type
        });
        player.preload('auto');
        player.controls(true);
        // player.off("playing");
        player.currentTime(0);
        player.play();

        // Remove skip button
        skipButton.remove();
        creativeButton.remove();
        skipButtonContainerDiv.remove();

        // Ping ads view
        if(viewed) {
            const account = video.account.userId;
            const baseUrl = peertubeHelpers.getBaseRouterRoute();
            await fetch(`${baseUrl}/ping-ads?accountId=${account}&video=${video.id}`, {
                method: 'GET'
            });
        }
    };

    // On player error, skip ad
    player.on('error', (err) => {
        player.off('error');
        console.log(err);
        skipNow(false);
    });

    // Add interval to update skip timer
    const interval = setInterval(async () => {
        // Get current time
        const duration = adsDuration; // seconds
        const currentTime = player.currentTime();
        const remainingTime = duration - currentTime;

        if(player.ended()) {
            // Video ended, skip ad
            skipNow();
            return;
        }

        if(player.paused()) {
            player.controls(true);
        }else{
            player.controls(false);
        }

        if(remainingTime <= 0) {
            // Stop interval
            clearInterval(interval);
            skipTimer.remove();
            skipButton.style.display = 'inline-block';

            // Add click event to skip button
            skipButton.addEventListener('click', () => {
                skipNow();
            });

            return;
        }

        // Update skip timer
        const minutes = Math.floor(remainingTime / 60);
        const seconds = Math.floor(remainingTime % 60);
        const formattedTime = await peertubeHelpers.translate("Skip Ad in") + " " + `${minutes}:${seconds}`;
        skipTimer.innerHTML = formattedTime;
    } , 1000);
}