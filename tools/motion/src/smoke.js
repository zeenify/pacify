/* Pipeline smoke test — a miniature of Act I.
   Exercises every technique the full build depends on: procedural card textures,
   a real 3D slab, post-processing (bloom + halftone), a spline-ish camera push,
   and the DOM typography overlay — all driven from seek(frame) alone.

   Query toggles for A/B comparison: ?bloom=0 ?halftone=0
*/

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { HalftonePass } from "three/addons/postprocessing/HalftonePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { C, FONT, SKEW } from "./brand.mjs";
import { ease, track, spanE, rad, randRange, rand } from "./tween.mjs";
import { makeCard, makeImpactPlane } from "./cardMesh.mjs";

const params = new URLSearchParams(location.search);
// Bloom is off by default: flat poster art gains nothing from it, and a large
// bright card face smears into a frame-wide grey haze. Opt in with ?bloom=1.
const useBloom = params.get("bloom") === "1";
const useHalftone = params.get("halftone") === "1";

const FPS = 30;
const DURATION = 3; // seconds
const TOTAL_FRAMES = Math.round(FPS * DURATION);

const DATA = await (await fetch("./data.json")).json();

// Pick a dramatic pair for the test: Angel (good 12) vs Demon (bad 11).
const byId = Object.fromEntries(DATA.catalogue.map((c) => [c.id, c]));
const heroCard = byId.angel;
const foilCard = byId.demon;

const fatal = (msg) => {
  const el = document.getElementById("fatal");
  el.style.display = "block";
  el.textContent = msg;
};

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true, // required for reliable readback/screenshot
  powerPreference: "high-performance",
});
renderer.setSize(1920, 1080, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// No tone mapping: the look is flat poster art, and ACES lifts blacks toward the
// muddy brown seen in the first render. Crisp sRGB output keeps #0A0A0A black.
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
// Pure black rather than C.black (#0A0A0A): the clear colour round-trips through
// the composer's linear working space and #0A0A0A lands as a lifted mid-grey.
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(new THREE.Color(C.black), 12, 34);

const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 200);
camera.position.set(0, 0, 11);

// ---- lights (only edges + shards are lit; card faces are unlit) ----
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(4, 6, 9);
scene.add(key);
const rim = new THREE.DirectionalLight(new THREE.Color(C.crimson), 2.2);
rim.position.set(-7, -2, -5);
scene.add(rim);
const fill = new THREE.PointLight(new THREE.Color(C.yellow), 14, 26);
fill.position.set(-4, 3, 6);
scene.add(fill);

// ---- DOM crimson pool replaces the old 3D backdrop plane ----
const elBg = document.getElementById("bg");

// ---- floating shards for depth ----
const shards = [];
const shardGeo = new THREE.BoxGeometry(0.34, 0.34, 0.05);
const shardMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.crimson), roughness: 0.5, metalness: 0.2 });
for (let i = 0; i < 46; i++) {
  const m = new THREE.Mesh(shardGeo, i % 4 === 0 ? new THREE.MeshStandardMaterial({ color: new THREE.Color(C.yellow), roughness: 0.5 }) : shardMat);
  m.position.set(randRange(i * 3 + 1, -16, 16), randRange(i * 7 + 2, -9, 9), randRange(i * 11 + 3, -12, 2));
  m.rotation.set(rand(i) * Math.PI, rand(i + 90) * Math.PI, rand(i + 40) * Math.PI);
  m.userData.seed = i;
  m.userData.base = m.position.clone();
  scene.add(m);
  shards.push(m);
}

// ---- hero + foil cards ----
const hero = makeCard(heroCard);
const foil = makeCard(foilCard);
const heroImpact = makeImpactPlane(4.5);
heroImpact.position.z = -0.6;
scene.add(heroImpact);
scene.add(hero);
scene.add(foil);

// ---- post ----
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
if (useBloom) {
  // High threshold so only the yellow/crimson accents bloom, never the paper-white
  // card faces — a low threshold was what produced the giant white halo.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.45, 0.4, 0.86);
  composer.addPass(bloom);
}
if (useHalftone) {
  composer.addPass(new HalftonePass(1920, 1080, { shape: 1, radius: 2.2, rotateR: rad(0), rotateG: rad(30), rotateB: rad(60), scatter: 0, blending: 1, greyscale: false }));
}
composer.addPass(new OutputPass());
composer.setSize(1920, 1080);

// ---- DOM overlay handles ----
const elTitle = document.getElementById("title");
const elKicker = document.getElementById("kicker");
const elRule = document.getElementById("rule");

/** The whole world, as a pure function of seconds. */
function render(t) {
  // camera push-in with a slight drift
  camera.position.z = track([{ t: 0, v: 13.5, e: "outQuint" }, { t: 3, v: 8.6 }], t);
  camera.position.x = Math.sin(t * 0.7) * 0.35;
  camera.position.y = Math.cos(t * 0.5) * 0.22;
  camera.lookAt(0, 0, 0);

  // hero card: slams in from off-screen, settles, then a slow proud rotation
  const slam = spanE(t, 0.05, 0.62, "slam");
  hero.position.x = track([{ t: 0, v: -9, e: "outQuint" }, { t: 0.62, v: -1.62 }, { t: 3, v: -1.78 }], t);
  hero.position.y = track([{ t: 0, v: 5.4, e: "outQuint" }, { t: 0.62, v: 0.05 }, { t: 3, v: -0.12 }], t);
  hero.position.z = track([{ t: 0, v: 4.5, e: "outCubic" }, { t: 0.62, v: 0 }, { t: 3, v: 0.4 }], t);
  hero.rotation.y = rad(-32 + 26 * slam) + Math.sin(t * 0.8) * 0.05;
  hero.rotation.z = rad(track([{ t: 0, v: -46, e: "outBack" }, { t: 0.7, v: SKEW }, { t: 3, v: SKEW - 1.5 }], t));
  hero.rotation.x = rad(track([{ t: 0, v: 34, e: "outCubic" }, { t: 0.7, v: -4 }], t));

  // foil card mirrors in from the right, a beat later
  foil.position.x = track([{ t: 0, v: 9.4, e: "outQuint" }, { t: 0.9, v: 1.72 }, { t: 3, v: 1.9 }], t);
  foil.position.y = track([{ t: 0, v: -5.2, e: "outQuint" }, { t: 0.9, v: -0.05 }, { t: 3, v: 0.14 }], t);
  foil.position.z = track([{ t: 0, v: 3.6, e: "outCubic" }, { t: 0.9, v: -0.35 }, { t: 3, v: -0.1 }], t);
  foil.rotation.y = rad(30 - 24 * spanE(t, 0.2, 0.9, "slam"));
  foil.rotation.z = rad(track([{ t: 0, v: 44, e: "outBack" }, { t: 1.0, v: -SKEW }, { t: 3, v: -SKEW + 1.5 }], t));

  // impact flash on the hero's landing beat — tight radial glow, not a screen fill
  const impact = track([{ t: 0.56, v: 0 }, { t: 0.62, v: 0.85, e: "outExpo" }, { t: 1.0, v: 0 }], t);
  heroImpact.material.opacity = impact;
  heroImpact.scale.setScalar(0.75 + impact * 0.55);
  heroImpact.position.x = hero.position.x;
  heroImpact.position.y = hero.position.y;

  // crimson pool bleeds in as the title lands
  elBg.style.opacity = String(track([{ t: 0.25, v: 0 }, { t: 1.5, v: 1 }], t));

  // shards drift and parallax
  for (const s of shards) {
    const sd = s.userData.seed;
    s.position.x = s.userData.base.x + Math.sin(t * 0.6 + sd) * 0.5;
    s.position.y = s.userData.base.y + Math.cos(t * 0.5 + sd * 1.3) * 0.4;
    s.rotation.x += 0.0; // static per frame; orientation is a pure function of t below
    s.rotation.x = t * (0.4 + rand(sd) * 0.5) + sd;
    s.rotation.y = t * (0.3 + rand(sd + 7) * 0.5) + sd;
  }

  // ---- DOM overlay ----
  const kIn = spanE(t, 0.42, 0.82, "outCubic");
  elKicker.style.opacity = String(kIn);
  elKicker.style.transform = `skewX(${SKEW}deg) translateX(${(1 - kIn) * -60}px)`;

  const tIn = spanE(t, 0.62, 1.05, "outQuint");
  const tScale = track([{ t: 0.62, v: 1.55, e: "outQuint" }, { t: 1.05, v: 1 }], t);
  elTitle.style.opacity = String(tIn);
  elTitle.style.transform = `skewX(${SKEW}deg) translate(${(1 - tIn) * 180}px, 0) scale(${tScale})`;

  const rIn = spanE(t, 0.95, 1.5, "outExpo");
  elRule.style.width = `${rIn * 780}px`;
  elRule.style.opacity = String(rIn > 0 ? 1 : 0);

  composer.render();
}

// ---- deterministic readback for verification ----
function checksum() {
  const gl = renderer.getContext();
  const px = new Uint8Array(4 * 64);
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  let acc = 2166136261;
  for (let i = 0; i < 8; i++) {
    const x = Math.floor((w * (i + 1)) / 9);
    const y = Math.floor(h / 2);
    gl.readPixels(x, y, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let k = 0; k < px.length; k++) {
      acc ^= px[k] + i;
      acc = Math.imul(acc, 16777619);
    }
  }
  return (acc >>> 0).toString(16);
}

async function init() {
  await document.fonts.ready;
  // Warm the shader program so the first captured frame is not a compile stall.
  render(0);
  composer.render();
  return true;
}

window.__MOTION__ = {
  meta: { fps: FPS, totalFrames: TOTAL_FRAMES, width: 1920, height: 1080, durationSec: DURATION },
  ready: init().catch((e) => {
    fatal(`init failed: ${e?.stack ?? e}`);
    throw e;
  }),
  seek(frame) {
    try {
      render(Math.max(0, frame) / FPS);
    } catch (e) {
      fatal(`seek(${frame}) failed: ${e?.stack ?? e}`);
      throw e;
    }
  },
  checksum,
  info: { bloom: useBloom, halftone: useHalftone, hero: heroCard.name, foil: foilCard.name },
};
