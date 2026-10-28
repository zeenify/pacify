/* P5 brand tokens, mirrored from packages/ui-kit/src/tokens.ts.
   Duplicated rather than imported because the capture page runs in a browser
   against plain ES modules and ui-kit ships TypeScript + React Native styles.
   If tokens.ts changes, this file must be updated to match. */

export const C = {
  crimson: "#E60012",
  crimsonDeep: "#A3000C",
  crimsonMid: "#C00010",
  yellow: "#FCEE21",
  black: "#0A0A0A",
  ink: "#111111",
  paper: "#FFFFFF",
  surface1: "#141414",
  surface2: "#1A1A1A",
  surface3: "#262626",
  border: "#2A2A2A",
  borderStrong: "#333333",
  halftone: "rgba(230,0,18,0.18)",
};

export const FONT = {
  display: "Anton",
  body: "Oswald",
};

export const SKEW = -8; // degrees, theme.skew

/** Card face pixel size. 512x715 keeps the 0.716 standard poker ratio. */
export const CARD_W = 512;
export const CARD_H = 715;

/** World-space card size used by the 3D scenes. */
export const CARD_WORLD_W = 2.6;
export const CARD_WORLD_H = CARD_WORLD_W * (CARD_H / CARD_W);
export const CARD_DEPTH = 0.07;
