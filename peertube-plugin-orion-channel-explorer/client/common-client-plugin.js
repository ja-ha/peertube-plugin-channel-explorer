const ChannelsPage = require("./pages/channels");

async function register({
  registerHook,
  peertubeHelpers,
  registerClientRoute,
}) {
  
  /**
   * Add link admin page
   */
  registerHook({
    target: "action:router.navigation-end",
    handler: (params) => {
      setTimeout(async () => {
        if (params.path.startsWith("/videos/overview")) {
          if (document.getElementById("channels-explore-link")) return;
  
          // Get menu container
          const menuContainer = document.getElementsByClassName("margin-content")[0];
  
          // Create link
          const content = `
            <a class="btn btn-primary btn-sm mt-5" href="/videos/overview">
              ${await peertubeHelpers.translate("Discover videos")}
            </a>
            <a class="btn btn-secondary btn-sm mt-5" href="/p/channels/explore" id="channels-explore-link">
              ${await peertubeHelpers.translate("Explore channels")}
            </a>
          `;
  
          // Create node for it
          const nodeLink = document.createElement("div");
          nodeLink.innerHTML = content.trim();
  
          // Append as first element
          menuContainer.insertBefore(nodeLink, menuContainer.firstChild);
        }
      }, 300);
    },
  });

  // Register the admin stats route
  registerClientRoute({
    route: "channels/explore",
    onMount: ({ rootEl }) => {
      ChannelsPage.showPage({rootEl, peertubeHelpers});
    },
  });
}

export { register };