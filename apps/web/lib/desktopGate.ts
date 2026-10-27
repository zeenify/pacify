/* Desktop gate — PACIFY's web version is desktop-only. Phones and tablets
   (primary pointer: coarse) get a blocking screen instead of the game, since
   there is no mobile layout. Touch-screen laptops are unaffected: their
   primary pointer is fine. Client-side and trivially bypassed — a design
   statement, not security. Idempotent; called once from the root layout. */

import { Platform } from "react-native";

const GATE_HTML =
  '<div><div class="glyph">💻</div><div class="title">PACIFY</div>' +
  '<div class="hint">Desktop only — please open on a PC or laptop</div></div>';

const GATE_CSS = `
#pacify-gate { display: none; position: fixed; inset: 0; z-index: 2147483647;
  background: #0A0A0A; color: #E8E4DA; align-items: center; justify-content: center;
  text-align: center; font-family: system-ui, sans-serif; padding: 24px; }
#pacify-gate .glyph { font-size: 44px; margin-bottom: 12px; }
#pacify-gate .title { font-size: 22px; letter-spacing: 4px; margin-bottom: 8px; }
#pacify-gate .hint { font-size: 15px; opacity: 0.75; }
@media (pointer: coarse) {
  #pacify-gate { display: flex; }
}
`;

export function installDesktopGate() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.textContent = GATE_CSS;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "pacify-gate";
  gate.innerHTML = GATE_HTML;
  document.body.appendChild(gate);
}
