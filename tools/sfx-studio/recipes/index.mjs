import { ui } from "./ui.mjs";
// Each family module is added by its own render task; uncomment as they land.
// import { table } from "./table.mjs";
// import { clash } from "./clash.mjs";
// import { score } from "./score.mjs";
// import { round } from "./round.mjs";
// import { trickVoid } from "./trick-void.mjs";
// import { trickEcho } from "./trick-echo.mjs";
// import { trickEclipse } from "./trick-eclipse.mjs";
// import { trickWard } from "./trick-ward.mjs";
// import { trickReversal } from "./trick-reversal.mjs";
// import { trickExec } from "./trick-exec.mjs";
// import { trickOracle } from "./trick-oracle.mjs";

/** @type {import("../render.mjs").Recipe[]} */
export const RECIPES = [
  ...ui,
];
