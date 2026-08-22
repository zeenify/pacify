/**
 * PACIFY design tokens — Palette A (Rebellion)
 * Structure borrowed from ninjaruss token system, colors ours.
 */
export const theme = {
  color: {
    crimson: "#D40000",
    crimsonDeep: "#8F0000",
    black: "#111111",
    ink: "#0A0A0A",
    paper: "#FAFAF5",
    paperDim: "rgba(250,250,245,0.6)",
    surface1: "#161616",
    surface2: "#1D1D1D",
    surface3: "#262626",
    border: "#3A3A3A",
    borderStrong: "#555555",
    gold: "#E5C800", // sparing accent (rank/coin only)
  },
  font: {
    display: "Archivo Black",
    body: "Syne",
    mono: "JetBrains Mono",
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
  },
  radius: { none: 0, sm: 2, md: 4 },
  border: { thin: 1.5, medium: 3, thick: 4 },
  shadow: {
    hard: { shadowColor: "#D40000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
    hardHover: { shadowColor: "#D40000", shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 },
  },
  skew: -12,
} as const;

export type Theme = typeof theme;
