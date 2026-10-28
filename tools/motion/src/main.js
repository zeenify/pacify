/* Entry point: wires data + narration + timeline + stage + acts, and publishes
   the deterministic window.__MOTION__ interface the capture harness drives. */

import * as THREE from "three";
import { createStage, buildWorld } from "./stage.mjs";
import { buildTimeline, locate } from "./timeline.mjs";
import { ACTS_A } from "./acts-a.mjs";
import { ACTS_B } from "./acts-b.mjs";

const params = new URLSearchParams(location.search);
const FPS = Number(params.get("fps") ?? 30);

const fatal = (msg) => {
  const el = document.getElementById("fatal");
  el.style.display = "block";
  el.textContent = msg;
};

const [data, narration] = await Promise.all([
  (await fetch("./data.json")).json(),
  (await fetch("./narration.json")).json(),
]);
data.timeline = buildTimeline(narration, FPS);

const stage = createStage({
  bloom: params.get("bloom") === "1",
  halftone: params.get("halftone") === "1",
});
const world = buildWorld(stage, data);
window.__WORLD__ = world; // debug handle for probes

const acts = [...ACTS_A, ...ACTS_B];
for (const a of acts) a.init(world);
const byId = new Map(acts.map((a) => [a.id, a]));

function seek(frame) {
  const t = Math.max(0, frame) / FPS;
  const { act, local } = locate(data.timeline, t);
  world.resetFrame();
  world.actDom.get(act.id).style.display = "block";
  try {
    byId.get(act.id).render(world, local, act.lines);
  } catch (e) {
    window.__LAST__ = { actId: act.id, local, error: String(e?.stack ?? e).slice(0, 600) };
    throw e;
  }
  window.__LAST__ = {
    actId: act.id,
    local,
    lines: act.lines.map((l) => [l.id, +l.start.toFixed(2), +l.end.toFixed(2)]),
  };
  stage.render();
}

function checksum() {
  const gl = stage.renderer.getContext();
  const w = stage.renderer.domElement.width;
  const h = stage.renderer.domElement.height;
  const px = new Uint8Array(4 * 16);
  let acc = 2166136261;
  for (let i = 0; i < 8; i++) {
    gl.readPixels(Math.floor((w * (i + 1)) / 9), Math.floor(h / 2), 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let k = 0; k < px.length; k++) {
      acc ^= px[k] + i;
      acc = Math.imul(acc, 16777619);
    }
  }
  return (acc >>> 0).toString(16);
}

async function init() {
  await document.fonts.ready;
  seek(0); // warm shaders so the first captured frame is not a compile stall
  return true;
}

window.__MOTION__ = {
  meta: {
    fps: FPS,
    totalFrames: data.timeline.totalFrames,
    width: 1920,
    height: 1080,
    durationSec: data.timeline.total,
    acts: data.timeline.acts.map((a) => ({ id: a.id, title: a.title, start: +a.start.toFixed(2), end: +a.end.toFixed(2) })),
  },
  ready: init().catch((e) => {
    fatal(`init failed: ${e?.stack ?? e}`);
    throw e;
  }),
  seek,
  checksum,
};
