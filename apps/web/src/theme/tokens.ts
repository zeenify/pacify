/**
 * PACIFY — clean P5 tokens, matched to wix act assets
 * persona5-hero/projects/skills.html: #E60012 / #0A0A0A / #FFFFFF / #FCEE21
 * Anton + Oswald, hard shadows, bgShift
 */
export const theme = {
  color: {
    // P5 core — from html --p5-red:#E60012 etc.
    crimson: "#E60012",
    crimsonDeep: "#A3000C",
    crimsonMid: "#C00010",
    yellow: "#FCEE21",
    black: "#0A0A0A",
    ink: "#111111",
    paper: "#FFFFFF",
    paperDim: "rgba(255,255,255,0.72)",
    paperFaint: "rgba(255,255,255,0.14)",
    pureWhite: "#FFFFFF",
    pureBlack: "#000000",
    surface1: "#141414",
    surface2: "#1A1A1A",
    surface3: "#262626",
    border: "#2A2A2A",
    borderStrong: "#333333",
    gold: "#FCEE21",
    halftone: "rgba(230,0,18,0.18)",
    stripe: "rgba(255,255,255,0.06)",
  },
  font: {
    display: "Anton",
    body: "Oswald",
    mono: "Oswald",
    alt: "Anton",
  },
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 36,
    hero: 56,
    giant: 96,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
    xxl: 64,
  },
  radius: { none: 0, sm: 2, md: 4 },
  border: { thin: 1.5, medium: 3, thick: 4, heavy: 6 },
  skew: -8,
  shadow: {
    hard: { shadowColor: "#000", shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
    hardCrimson: { shadowColor: "#E60012", shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 },
    hardSmall: { shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  },
  motion: {
    fast: 140,
    base: 220,
    slow: 320,
    overshoot: "cubic-bezier(0.175,0.885,0.32,1.275)",
    easeOut: "cubic-bezier(0.22,1,0.36,1)",
  },
} as const;

export type Theme = typeof theme;
