/* Mobile screen behavior for web phones (see phone-access commit):
   - inject the PWA manifest + portrait "rotate your phone" overlay,
   - on the first successful tap, enter fullscreen and lock landscape.
   Browsers require a user gesture for requestFullscreen (it cannot fire on
   load), and iPhone Safari supports neither API — there the overlay owns the
   portrait case and installing to the homescreen gives the fullscreen shell.
   Idempotent; called once from the root layout on web. */

import { Platform } from "react-native";

const OVERLAY_HTML =
  '<div><div class="glyph">🔄</div><div class="title">PACIFY</div>' +
  '<div class="hint">Plays in landscape — rotate your phone</div></div>';

const OVERLAY_CSS = `
#pacify-rotate { display: none; position: fixed; inset: 0; z-index: 2147483647;
  background: #0A0A0A; color: #E8E4DA; align-items: center; justify-content: center;
  text-align: center; font-family: system-ui, sans-serif; padding: 24px; }
#pacify-rotate .glyph { font-size: 44px; margin-bottom: 12px; }
#pacify-rotate .title { font-size: 22px; letter-spacing: 4px; margin-bottom: 8px; }
#pacify-rotate .hint { font-size: 15px; opacity: 0.75; }
@media (orientation: portrait) and (pointer: coarse) {
  #pacify-rotate { display: flex; }
}
`;

const TAP_SCRIPT = `
(function () {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  var done = false;
  document.addEventListener("pointerdown", function () {
    if (done) return;
    try {
      var el = document.documentElement;
      if (!el.requestFullscreen) return;
      var p = el.requestFullscreen();
      if (p && p.then) p.then(function () {
        done = true;
        try { screen.orientation && screen.orientation.lock("landscape").catch(function () {}); } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  }, true);
})();
`;

export function installMobileScreen() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById("pacify-mobile-screen")) return;
  const marker = document.createElement("meta");
  marker.id = "pacify-mobile-screen";
  document.head.appendChild(marker);

  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = "/manifest.json";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.textContent = OVERLAY_CSS;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "pacify-rotate";
  overlay.innerHTML = OVERLAY_HTML;
  document.body.appendChild(overlay);

  const tap = document.createElement("script");
  tap.textContent = TAP_SCRIPT;
  document.body.appendChild(tap);
}
