const AdminPage = require("./pages/admin");

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
      if (params.path.startsWith("/admin/")) {
        if (document.getElementById("admin-stats-link")) return;

        let href = "/p/admin/stats";

        // Get menu container
        const menuContainer = document.getElementsByClassName("sub-menu")[0];

        // Create link
        const content = `
          <a _ngcontent-dke-c79="" id="admin-stats-link" routerlinkactive="active" class="sub-menu-entry ng-star-inserted" href="${href}">
            ${await peertubeHelpers.translate("Statistics")}
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

  // Register the admin stats route
  registerClientRoute({
    route: "admin/stats",
    onMount: ({ rootEl }) => {
      AdminPage.showPage({rootEl, peertubeHelpers});
    },
  });
}

export { register };