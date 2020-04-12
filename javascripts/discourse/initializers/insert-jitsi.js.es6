import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import loadScript from "discourse/lib/load-script";
import { iconHTML } from "discourse-common/lib/icon-library";


function launchJitsi($elem, user) {
  loadScript("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/hmac-sha256.js").then(() => {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/components/enc-base64-min.js").then(() => {
      // Defining our token parts

      var header = {
        "typ": "JWT",
        "alg": "HS256"
      };

      var payload = {
        "context": {
          "user": {
            //url? gravatar?size?
            //"avatar":  Discourse.getURL(url) + str_replace( '{size}', '60', user.avatar_template ),
            "name": user.username,
            "email": user.email,
            "id": user.id
          }
        },
        "aud": "jitsi",
        "iss": "my_discourse",
        "sub": settings.meet_jitsi_domain,
        "room": $elem.data("room"),
        //expire in 3 hours
        "exp": new Date().getTime() + 3*3600000
      };

      var secret = settings.jitsi_jwt_secret;

      function base64url(source) {
        // Encode in classical base64
        var encodedSource = CryptoJS.enc.Base64.stringify(source);
        // Remove padding equal characters
        encodedSource = encodedSource.replace(/=+$/, '');
        // Replace characters according to base64url specifications
        encodedSource = encodedSource.replace(/\+/g, '-');
        encodedSource = encodedSource.replace(/\//g, '_');
        return encodedSource;
      }

      var stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
      var encodedHeader = base64url(stringifiedHeader);

      var stringifiedPayload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
      var encodedPayload = base64url(stringifiedPayload);

      var signature = encodedHeader + "." + encodedPayload;
      signature = CryptoJS.HmacSHA256(signature, secret);
      signature = base64url(signature);

      var jitsiJwt = encodedHeader + "." + encodedPayload + "." + signature;
      console.log("JWT " + jitsiJwt);
      $elem.data("jwt", jitsiJwt);
      console.log("JWT " +   $elem.data("jwt"));

      loadScript("https://meet.jit.si/external_api.js").then(() => {
        const domain = settings.meet_jitsi_domain;
        console.log("JWT1 " + $elem.data("jwt"));
        const options = {
          jwt: $elem.data("jwt"),
          roomName: $elem.data("room"),
          height: 450,
          parentNode: $elem.parent()[0],
          interfaceConfigOverwrite: {
            DEFAULT_REMOTE_DISPLAY_NAME: ""
          }
        };

        const jitsiAPI = new JitsiMeetExternalAPI(domain, options);
        $elem.hide();

        //if (user.username) {
        //  jitsiAPI.executeCommand("displayName", user.username);
        //}

        jitsiAPI.addEventListener("videoConferenceLeft", () => {
          $elem.show();
          $elem.next().remove();
        });
      });
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
  $elem.find("button").on("click", () => {
    //makeJWT($elem, user);
    launchJitsi($elem, user);
  })
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
