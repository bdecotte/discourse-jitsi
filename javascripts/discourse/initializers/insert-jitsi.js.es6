import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import loadScript from "discourse/lib/load-script";
import { iconHTML } from "discourse-common/lib/icon-library";

function launchJitsi($elem, user) {
  const domain = settings.meet_jitsi_domain;
  loadScript("https://" + domain + "/external_api.js").then(() => {
    const options = {
      roomName: $elem.data("room"),
      height: 450,
      parentNode: $elem.parent()[0],
      interfaceConfigOverwrite: {
        DEFAULT_REMOTE_DISPLAY_NAME: ""
      }
    };

    const jitsiAPI = new JitsiMeetExternalAPI(domain, options);
    $elem.hide();

    if (user.username) {
      jitsiAPI.executeCommand("displayName", user.username);
    }

    jitsiAPI.addEventListener("videoConferenceLeft", () => {
      $elem.show();
      $elem.next().remove();
    });
  });
}

function attachButton($elem, user) {
  const buttonLabel =
    $elem.data("label") || I18n.t(themePrefix("launch_jitsi"));

  $elem.html(
    `<button class='launch-jitsi btn'>${iconHTML(
      settings.button_icon
    )} ${buttonLabel}</button>`
  );
  $elem.find("button").on("click", () => launchJitsi($elem, user));
}

function attachJitsi($elem, helper) {
  if (helper) {
    const currentUser = helper.widget.currentUser;
    $elem.find("[data-wrap=discourse-jitsi]").each((idx, val) => {
      attachButton($(val), currentUser);
    });
  }
}

export default {
  name: "insert-jitsi",

  initialize() {
    withPluginApi("0.8.31", api => {
      let currentUser = api.getCurrentUser();
      api.onToolbarCreate(toolbar => {
        if (settings.only_available_to_staff && !currentUser.staff) {
          return;
        }

        toolbar.addButton({
          title: themePrefix("composer_title"),
          id: "insertJitsi",
          group: "insertions",
          icon: settings.button_icon,
          perform: e =>
            showModal("insert-jitsi").setProperties({ toolbarEvent: e })
        });
      });

      api.decorateCooked(attachJitsi, { id: "discourse-jitsi" });
    });
  }
};
