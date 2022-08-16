let baseUrl;
let latest = 0;
let perPage = 20;

async function showPage({ rootEl, peertubeHelpers }) {
    baseUrl = peertubeHelpers.getBaseRouterRoute();

    // Main content
    rootEl.innerHTML = `
        <div class="margin-content">
            <a class="btn btn-secondary btn-sm mt-5" href="/videos/overview">
                ${await peertubeHelpers.translate("Discover videos")}
            </a>
            <a class="btn btn-primary btn-sm mt-5" href="/p/channels/explore" id="channels-explore-link">
                ${await peertubeHelpers.translate("Explore channels")}
            </a>

            <div class="mt-4">
                <div class="row" id="channels-list">
            </div>
        </div>
    `;

    // Init channels list
    loadNextChannels(peertubeHelpers);


    // When page is scrolled to botoom, refresh the channels list
    window.onscroll = function() {
        // If current url != channels/explore, return
        if(window.location.pathname !== "/p/channels/explore") return;

        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
            loadNextChannels(peertubeHelpers);
        }
    };
}

export { showPage };

let isWorking = false;
async function loadNextChannels(peertubeHelpers) {
    if(isWorking) return;
    isWorking = true;

    try {
        const request = await fetch(`${baseUrl}/channels?skip=${latest}&limit=${perPage}`);
        const data = await request.json();

        if(!data.status || data.status !== "success") {
            peertubeHelpers.notifier.error(data.message || "Unknown error while loading channels");
            console.log(data);
            return;
        }

        const channels = data.data.channels;
        if (channels.length === 0) {
            peertubeHelpers.notifier.info(await peertubeHelpers.translate("No more channels to load"));
            return;
        }
        
        latest += channels.length;
        for(let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            if(!channel.username) return;

            const node = document.createElement("div");
            
            node.className = "col-sm-12 col-md-6 mt-2";
            node.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-sm-12 col-md-6">
                                <h5 class="card-title">
                                    ${channel.name}<br>
                                    <small>@${channel.username||"Unknown"}</small>
                                </h5>
                                <p class="card-text">${channel.description || await peertubeHelpers.translate("No description provided")}</p>
                                <a href="/c/${channel.url}/videos" class="btn btn-primary">${await peertubeHelpers.translate("Visit channel")}</a>
                            </div>

                            <div class="col-sm-12 col-md-6">
                                <h5>${await peertubeHelpers.translate("Latest videos")}</h5>
                                <ul>
                                    ${channel.latestVideos?.map(video => `
                                        <li>
                                            <a href="/w/${video.uuid}">
                                                ${video.name}
                                            </a>
                                        </li>
                                    `)?.join("") || await peertubeHelpers.translate("No videos found")}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById("channels-list").appendChild(node);
        }

    } catch (error) {
        console.log(error);
    }

    isWorking = false;
}