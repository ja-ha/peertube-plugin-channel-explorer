let baseUrl;
let latest = 0;
let perPage = 10;

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
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
            loadNextChannels(peertubeHelpers);
        }
    };

    registerHook({
        target: "action:router.navigation-end",
        handler: (params) => {
            // Cancel onscroll event
            window.onscroll = null;
        }
    });
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
            const node = document.createElement("div");
            node.className = "col-sm-12 col-md-6 mt-2";
            node.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${channel.name}</h5>
                        <p class="card-text">${channel.description || await peertubeHelpers.translate("No description provided")}</p>
                        <a href="/c/${channel.name}/videos" class="btn btn-primary">${await peertubeHelpers.translate("Visit channel")}</a>
                    </div>
                </div>
            `;

            document.getElementById("channels-list").appendChild(node);
        }

    } catch (error) {
        console.log(error);
        peertubeHelpers.notifier.error(error.message);
        return;
    }

    isWorking = false;
}