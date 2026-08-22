/**
 * PACIFY — Persona 5 native tokens
 * Rebellion palette A kept: #FAFAF5 / #111111 / #D40000
 * but built as a GAME HUD, not a website.
 */
export const theme = {
  color: {
    crimson: "#D40000",
    crimsonDeep: "#8F0000",
    crimsonMid: "#C00000",
    black: "#111111",
    ink: "#0A0A0A",
    paper: "#FAFAF5",
    paperDim: "rgba(250,250,245,0.6)",
    paperFaint: "rgba(250,250,245,0.12)",
    pureWhite: "#FFFFFF",
    pureBlack: "#000000",
    surface1: "#161616",
    surface2: "#1D1D1D",
    surface3: "#262626",
    border: "#3A3A3A",
    borderStrong: "#555555",
    gold: "#E5C800",
    halftone: "rgba(212,0,0,0.18)",
    stripe: "rgba(250,250,245,0.06)",
  },
  font: {
    display: "Archivo Black",
    displayAlt: "Anton",
    body: "Syne",
    mono: "JetBrains Mono",
    // fallback stack injected via ThemeProvider
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
  skew: -12,
  // hard P5 shadows — no soft blur, all offset solid
  shadow: {
    hard: { shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
    hardCrimson: { shadowColor: "#D40000", shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 },
    hardWhite: { shadowColor: "#FAFAF5", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  },
  // motion — P5 snappy, not bento fade
  motion: {
    fast: 120,
    base: 180,
    slow: 320,
    spring: "cubic-bezier(0.34,1.56,0.64,1)",
    easeOut: "cubic-bezier(0.16,1,0.3,1)",
  },
} as const;

export type Theme = typeof theme;
