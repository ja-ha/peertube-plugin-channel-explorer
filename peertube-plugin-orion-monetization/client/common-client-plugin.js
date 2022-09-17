const MonetizationPage = require("./pages/monetization");
const AdminPage = require("./pages/admin");
var adsjs = null;
var last_page = null;
var last_insert_index = null;

async function register({
  registerHook,
  peertubeHelpers,
  registerClientRoute,
}) {
  /**
   * Translations
   **/
  const Monetizeation = await peertubeHelpers.translate("Monetization");

  registerHook({
    target: "action:router.navigation-end",
    handler: async (params) => {
      /**
       * Display banner ads
       */
      const settings = await peertubeHelpers.getSettings();
      const isBannerEnabled = await settings['enable-banner-ads'];
      const imgZoneId = await settings['craftyourads-zone-id-image'];
      if (isBannerEnabled) {
        bannerAds(imgZoneId);
      }

      /**
       * Add link to monetization page in account page
       */
      if (params.path.startsWith("/my-account") || params.path.startsWith("/admin/")) {
        if (document.getElementById("monetization-link")) return;

        let href = "/p/monetization";
        if (params.path.startsWith("/admin/"))
          href = "/p/admin-history";

        const container = document.getElementsByClassName("sub-menu")[0];
        const content = `
          <a _ngcontent-dke-c79="" id="monetization-link" routerlinkactive="active" class="sub-menu-entry ng-star-inserted" href="${href}">
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
      MonetizationPage.showPage({ rootEl, peertubeHelpers });
    },
  });

  // Register the admin history route
  registerClientRoute({
    route: "admin-history",
    onMount: ({ rootEl }) => {
      AdminPage.showPage({ rootEl, peertubeHelpers });
    },
  });
}

export { register };

function bannerAds(zoneID) {
  setTimeout(() => {

    if (document.querySelector(".image-zone-tag-container")) {
      document.querySelector(".image-zone-tag-container").remove();
    }

    insertAd(".results-header", ".entry");
    //insertAd(".video-info-first-row", ".video-info-name");
    insertAd(".videos", ".video-wrapper");
    insertAd(".other-videos", "my-video-miniature");

    setTimeout(() => {
      let curr_page = window.location.href;
      if(curr_page !== last_page) {
        last_insert_index = null;
      }

      if (adsjs !== null) {
        adsjs.remove();
        adsjs = null;
      }

      adsjs = document.createElement("script");
      adsjs.type = "text/javascript";
      adsjs.src = "https://manager.craftyourads.com/adserve?zone_id=" + zoneID + "&type=js";
      document.head.appendChild(adsjs);
    }, 1000);

  }, 1000);
}

function insertAd(requiredClassname, selectors) {
  if (document.querySelector(requiredClassname)) {
    let allResults = document.querySelectorAll(selectors);
    if (allResults.length > 0) {
      const min_index = last_insert_index ? last_insert_index : 0;
      const random = Math.floor(Math.random() * (allResults.length - min_index + 1) + min_index)
      const randomElem = allResults[random];
      const ad = document.createElement("div");
      ad.className = "image-zone-tag-container";
      randomElem.parentNode.insertBefore(ad, randomElem.nextSibling);
    }
  }
}