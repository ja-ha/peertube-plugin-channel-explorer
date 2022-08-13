function register({ registerHook, peertubeHelpers }) {
  const baseUrl = peertubeHelpers.getBaseRouterRoute();
  var channelsButton = null;
  var isModerator = false;


  const checkChannelIsBanned = async () => {
    channelsButton = document.querySelector(".channel-buttons");
    if (!channelsButton) return;

    const oldUnbanBtn = document.getElementById("orion-unban-btn");
    if (oldUnbanBtn)
      oldUnbanBtn.remove();

    const oldBanBtn = document.getElementById("orion-ban-btn");
    if (oldBanBtn)
      oldBanBtn.remove();

    const channelName = window.location.pathname.split("/")[2];
    const respone = await fetch(baseUrl + "/is-channel-banned?channelId=" + channelName, {
      method: "GET",
      headers: peertubeHelpers.getAuthHeader(),
    });
    const data = await respone.json();
    console.log(data);

    if(data.status !== "success") {
      peertubeHelpers.notifier.error("Error checking if channel is banned : " + data.message);
      return;
    }

    if(data.isBanned) {
      // end id data.endAt
      const endDate = new Date(data.endAt);
      const strDate = endDate.toLocaleString();
      peertubeHelpers.showModal({
        title: await peertubeHelpers.translate("This channel is temporary banned!"),
        content: await peertubeHelpers.translate("Sorry, you can't access to this channel until") + " " + strDate,
        close: false,
        cancel: {
          value: (!isModerator) ? await peertubeHelpers.translate("Back to homepage") : await peertubeHelpers.translate("Close"),
          action: () => {
            if(!isModerator)
              window.location.href = "/";
          }
        }
      })

      addChannelUnbanBtn();
    }else{
      
      addChannelBanBtn();
    }

  };

  const addChannelUnbanBtn = async () => {
    if (!isModerator) return;

    const unbannBtn = document.createElement("a");
    unbannBtn.id = "orion-unban-btn";
    unbannBtn.className = "peertube-button-link orange-button ng-star-inserted";
    unbannBtn.innerText = await peertubeHelpers.translate("Unban");
    unbannBtn.addEventListener("click", async () => {
      // Create modal
      openUnbanModal();
    });

    channelsButton.appendChild(unbannBtn);
  }

  const addChannelBanBtn = async () => {
    if (!isModerator) return;

    const banBtn = document.createElement("a");
    banBtn.id = "orion-ban-btn";
    banBtn.className = "peertube-button-link orange-button ng-star-inserted";
    banBtn.innerText = await peertubeHelpers.translate("Ban");
    banBtn.addEventListener("click", async () => {
      // Create modal
      openBanModal();
    });

    channelsButton.appendChild(banBtn);
  };

  const openBanModal = async () => {
    peertubeHelpers.showModal({
      title: await peertubeHelpers.translate("Ban a channel"),
      content: "",
      close: true,
      cancel: {
        value: await peertubeHelpers.translate("Cancel"),
      }
    });

    document.querySelector(".modal-body").innerHTML = `
      <div class="container">
        <form method="post" action="#" id="ban-channel-form">
          <input type="hidden" name="channelId" value="${window.location.pathname.split("/")[2]}">
          <div class="form-group">
            <label for="duration">${await peertubeHelpers.translate("Duration")}</label>
            <select class="form-control" name="duration">
              <option value="1">1 ${await peertubeHelpers.translate("day")}</option>
              <option value="3">3 ${await peertubeHelpers.translate("days")}</option>
              <option value="7">7 ${await peertubeHelpers.translate("days")}</option>
              <option value="15">15 ${await peertubeHelpers.translate("days")}</option>
              <option value="30">1 ${await peertubeHelpers.translate("month")}</option>
              <option value="60">2 ${await peertubeHelpers.translate("months")}</option>
              <option value="90">3 ${await peertubeHelpers.translate("months")}</option>
              <option value="180">6 ${await peertubeHelpers.translate("months")}</option>
              <option value="360">1 ${await peertubeHelpers.translate("year")}</option>
              <option value="1825">5 ${await peertubeHelpers.translate("years")}</option>
              <option value="3650">10 ${await peertubeHelpers.translate("years")}</option>
              <option value="36500">${await peertubeHelpers.translate("Forever")}</option>
            </select>
          </div>

          <div class="form-group">
            <button type="submit" class="peertube-button orange-button ng-star-inserted">${await peertubeHelpers.translate("Confirm Ban")}</button>
          </div>
        </form>
      </div>
    `;

    onSubmitFormBan();
  };

  const openUnbanModal = async () => {
    peertubeHelpers.showModal({
      title: await peertubeHelpers.translate("Unban a channel"),
      content: await peertubeHelpers.translate("Are you sure you want to unban this channel?"),
      close: true,
      cancel: {
        value: await peertubeHelpers.translate("Cancel"),
      },
      confirm: {
        value: await peertubeHelpers.translate("Unban"),
        action: () => {
          const formData = new FormData();
          formData.append("channelId", window.location.pathname.split("/")[2]);
          const form = new URLSearchParams(formData);
          fetch(baseUrl + "/unban", {
            method: "POST",
            headers: peertubeHelpers.getAuthHeader(),
            body: form,
          })
            .then((res) => res.json())
            .then(async (data) => {
              if (data && data.status && data.status === "success") {
                peertubeHelpers.notifier.success(await peertubeHelpers.translate("Channel unbanned"));
                setTimeout(() => window.location.reload(), 1000);
                return;
              }

              peertubeHelpers.notifier.error(data.message);
            })
            .catch((error) => {
              console.error(error);
              peertubeHelpers.notifier.error(error);
            });
        }
      }
    });
  };

  const onSubmitFormBan = async () => {
    setTimeout(() => {
      document
        .getElementById("ban-channel-form")
        .addEventListener("submit", (e) => {
          e.preventDefault();

          const form = new URLSearchParams(new FormData(e.target));
          fetch(baseUrl + "/ban", {
            method: "POST",
            headers: peertubeHelpers.getAuthHeader(),
            body: form,
          })
            .then((res) => res.json())
            .then(async (data) => {
              if (data && data.status && data.status === "success") {
                peertubeHelpers.notifier.success(await peertubeHelpers.translate("Channel banned"));
                setTimeout(() => window.location.reload(), 1000);
                return;
              }

              peertubeHelpers.notifier.error(data.message);
            })
            .catch((error) => {
              console.error(error);
              peertubeHelpers.notifier.error(error);
            });
        });
    }, 1000);
  };

  registerHook({
    target: "action:router.navigation-end",
    handler: (params) => {
      setTimeout(checkChannelIsBanned, 1000);
    }
  });

  registerHook({
    target: 'action:auth-user.information-loaded',
    handler: ({ user }) => {
      if (user.role == 0 || user.role == 1) {
        isModerator = true;
      } else {
        isModerator = false;
      }
    }
  })
}

export {
  register
}
