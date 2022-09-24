const subPage = require("./pages/subscription");
const successPage = require("./pages/success");
const cancelPage = require("./pages/cancel");

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
    handler: async (params) => {
      if (params.path.startsWith("/my-account")) {
        if (document.getElementById("subscription-link")) return;

        let href = "/p/my-subscription";

        // Get menu container
        const menuContainer = document.getElementsByClassName("sub-menu")[0];

        // Create link
        const content = `
          <a _ngcontent-dke-c79="" id="subscription-link" routerlinkactive="active" class="sub-menu-entry ng-star-inserted" href="${href}">
            ${await peertubeHelpers.translate("Storage")}
          </a>
        `;

        // Create node for it
        const nodeLink = document.createElement("div");
        nodeLink.innerHTML = content.trim();

        // Insert to menu container
        menuContainer.appendChild(nodeLink.firstChild);
      }
    },
  });

  // Register routes
  registerClientRoute({
    route: "my-subscription",
    onMount: ({ rootEl }) => {
      subPage.showPage({rootEl, peertubeHelpers});
    },
  });

  registerClientRoute({
    route: "subscription-success",
    onMount: ({ rootEl }) => {
      successPage.showPage({rootEl, peertubeHelpers});
    },
  });

  registerClientRoute({
    route: "subscription-cancel",
    onMount: ({ rootEl }) => {
      cancelPage.showPage({rootEl, peertubeHelpers});
    },
  });
}

export { register };