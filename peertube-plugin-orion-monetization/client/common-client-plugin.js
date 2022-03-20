const MonetizationPage = require("./pages/monetization");
const AdminPage = require("./pages/admin");

async function register({
  registerHook,
  peertubeHelpers,
  registerClientRoute,
}) {
  /**
   * Translations
   **/
  const Monetizeation = await peertubeHelpers.translate("Monetization");

  /**
   * Add link to monetization page in account page
   */
  registerHook({
    target: "action:router.navigation-end",
    handler: async (params) => {
      if (params.path.startsWith("/my-account") || params.path.startsWith("/admin/")) {
        if (document.getElementById("monetization-link")) return;

        let href = "/p/monetization";
        if(params.path.startsWith("/admin/"))
          href = "/p/admin-history";

        const container = document.getElementsByClassName("sub-menu")[0];
        const content = `
          <a _ngcontent-dke-c79="" id="monetization-link" routerlinkactive="active" class="title-page title-page-settings ng-star-inserted" href="${href}">
            ${Monetizeation}
          </a>
        `;

        const node = document.createElement("div");
        node.innerHTML = content.trim();

        // Insert to container
        container.appendChild(node.firstChild);
      }
    },
  });


  // Register the monetization route
  registerClientRoute({
    route: "monetization",
    onMount: ({ rootEl }) => {
      MonetizationPage.showPage({rootEl, peertubeHelpers});
    },
  });

  // Register the admin history route
  registerClientRoute({
    route: "admin-history",
    onMount: ({ rootEl }) => {
      AdminPage.showPage({rootEl, peertubeHelpers});
    },
  });
}

export { register };
