/* Shared stage — v2: an ANIMATED light rig, real shadows, and a camera the acts
   fly. v1 set four lights up once and never touched them again, which is exactly
   why the 3D never looked 3D. Now the rig is exposed to the acts
   (world.lights.key/rim/fill/accent/spot + amb) and every act treats light as a
   storytelling tool: Eclipse kills the key, Oracle aims a spot, the barrier
   flares a point light. The key casts real shadows onto the table.

   Determinism contract: seek() calls world.resetFrame() before the active act's
   render(), hiding every pooled object, resetting lights/fog/camera.fov to
   defaults, and hiding every act's DOM container. Each act therefore fully
   specifies the frame it draws. */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { HalftonePass } from "three/addons/postprocessing/HalftonePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { C, SKEW } from "./brand.mjs";
import { makeCard, makeImpactPlane } from "./cardMesh.mjs";
import { rad, randRange, rand } from "./tween.mjs";

export const VIEW_W = 1920;
export const VIEW_H = 1080;

/** resetFrame() restores these; acts may freely override per frame. */
export const DEFAULTS = {
  amb: 0.5,
  key: 1.05,
  rim: 2.0,
  fill: 8,
  accent: 0,
  spot: 0,
  fogNear: 18,
  fogFar: 46,
  fov: 38,
};

export function createStage({ bloom = false, halftone = false } = {}) {
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(VIEW_W, VIEW_H, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, DEFAULTS.fogNear, DEFAULTS.fogFar);

  const camera = new THREE.PerspectiveCamera(DEFAULTS.fov, VIEW_W / VIEW_H, 0.1, 200);
  camera.position.set(0, 0, 11);

  // ---- light rig (all animated per-frame by the acts) ----
  const amb = new THREE.AmbientLight(0xffffff, DEFAULTS.amb);
  scene.add(amb);

  const key = new THREE.DirectionalLight(0xfff6e8, DEFAULTS.key);
  key.position.set(5, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 45;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(new THREE.Color(C.crimson), DEFAULTS.rim);
  rim.position.set(-7, -2, -6);
  scene.add(rim);

  const fill = new THREE.PointLight(new THREE.Color(C.yellow), DEFAULTS.fill, 40, 1.6);
  fill.position.set(-4, 3, 6);
  scene.add(fill);

  const accent = new THREE.PointLight(new THREE.Color(C.crimson), DEFAULTS.accent, 30, 1.6);
  accent.position.set(-6, 2, 4);
  scene.add(accent);

  const spot = new THREE.SpotLight(0xfff2cc, DEFAULTS.spot, 60, 0.42, 0.65, 1.4);
  spot.position.set(0, 9, 4);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(VIEW_W, VIEW_H), 0.45, 0.4, 0.86));
  if (halftone) composer.addPass(new HalftonePass(VIEW_W, VIEW_H, { shape: 1, radius: 2.2, rotateR: rad(0), rotateG: rad(30), rotateB: rad(60), scatter: 0, blending: 1, greyscale: false }));
  composer.addPass(new OutputPass());
  composer.setSize(VIEW_W, VIEW_H);

  return { renderer, scene, camera, composer, lights: { amb, key, rim, fill, accent, spot }, render: () => composer.render() };
}

/** Position the camera and aim it in one call, with optional roll (deg) around
    the view axis — applied AFTER lookAt so a rolling shot keeps its framing. */
export function aim(cam, px, py, pz, lx, ly, lz, rollDeg = 0) {
  cam.position.set(px, py, pz);
  cam.lookAt(lx, ly, lz);
  if (rollDeg) cam.rotateZ(rad(rollDeg));
}

/** Deterministic impact shake: decaying sine kick after t0. */
export function shake(t, t0, amp = 0.07, freq = 34, dur = 0.55) {
  if (t < t0) return 0;
  const u = (t - t0) / dur;
  if (u >= 1) return 0;
  return Math.sin(u * freq) * amp * Math.pow(1 - u, 2);
}

/** Ambient drifting shards — sparse dust, lit like everything else. */
function buildShards(scene, count = 26) {
  const geo = new THREE.BoxGeometry(0.3, 0.3, 0.045);
  const matRed = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.crimson), roughness: 0.5, metalness: 0.2 });
  const matYellow = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.yellow), roughness: 0.5, metalness: 0.2 });
  const shards = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, i % 5 === 0 ? matYellow : matRed);
    m.position.set(randRange(i * 3 + 1, -17, 17), randRange(i * 7 + 2, -10, 10), randRange(i * 11 + 3, -13, 1));
    m.userData.seed = i;
    m.userData.base = m.position.clone();
    m.visible = false;
    scene.add(m);
    shards.push(m);
  }
  return shards;
}

/** Drive the shared shard field as a pure function of t. */
export function renderShards(shards, t, { visible = true, spin = 0.4, dim = 1 } = {}) {
  for (const s of shards) {
    s.visible = visible;
    if (!visible) continue;
    const sd = s.userData.seed;
    s.position.x = s.userData.base.x + Math.sin(t * 0.6 + sd) * 0.5;
    s.position.y = s.userData.base.y + Math.cos(t * 0.5 + sd * 1.3) * 0.4;
    s.rotation.x = t * (spin + rand(sd) * 0.5) + sd;
    s.rotation.y = t * (spin * 0.8 + rand(sd + 7) * 0.5) + sd;
    void dim;
  }
}

export function buildWorld(stage, data) {
  const { scene, lights } = stage;

  const cards = new Map();
  for (const card of data.catalogue) {
    const mesh = makeCard(card);
    mesh.visible = false;
    scene.add(mesh);
    cards.set(card.id, mesh);
  }

  const impacts = [];
  for (let i = 0; i < 8; i++) {
    const p = makeImpactPlane(4.5);
    p.visible = false;
    scene.add(p);
    impacts.push(p);
  }

  const shards = buildShards(scene);

  // ---- shared props (hidden every frame; acts choreograph them) ----
  const extras = [];

  const add = (mesh) => {
    mesh.visible = false;
    scene.add(mesh);
    extras.push(mesh);
    return mesh;
  };

  // The duel table: dark gloss so the key light leaves a specular streak.
  const table = add(new THREE.Mesh(
    new THREE.PlaneGeometry(30, 17),
    new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.34, metalness: 0.3 }),
  ));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -2.35;
  table.receiveShadow = true;

  // Light barriers (Ward / shield / cage). Additive planes, opacity driven per beat.
  const barriers = [];
  for (let i = 0; i < 3; i++) {
    const b = add(new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 5.2),
      new THREE.MeshBasicMaterial({
        color: C.yellow, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      }),
    ));
    b.renderOrder = 4;
    barriers.push(b);
  }

  // The Void: a hole in the world. Pure black, with a thin crimson rim ring.
  const voidSphere = add(new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 40, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }),
  ));
  const voidRing = add(new THREE.Mesh(
    new THREE.TorusGeometry(1.66, 0.045, 10, 64),
    new THREE.MeshBasicMaterial({
      color: C.crimson, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  ));

  // Eclipse occluder: slides between the key light and the table, its real
  // shadow sweeping across the felt.
  const occluder = add(new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, side: THREE.DoubleSide }),
  ));
  occluder.castShadow = true;

  // Executioner blade: metal so it glints, with a crimson guard.
  const blade = add(new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 6.8, 0.12),
    new THREE.MeshStandardMaterial({ color: C.yellow, roughness: 0.22, metalness: 0.75 }),
  ));
  const bladeGuard = add(new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.28, 0.2),
    new THREE.MeshStandardMaterial({ color: C.crimson, roughness: 0.4, metalness: 0.3 }),
  ));

  // Score slabs (Executioner target).
  const slab = (x) => {
    const s = add(new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 1.5, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5, metalness: 0.15 }),
    ));
    s.position.x = x;
    return s;
  };
  const slabA = slab(-4.4);
  const slabB = slab(4.4);

  // Ghost cards (Echo doubles) — translucent copies with their OWN edge
  // materials: the pool caches edge materials per colour, so sharing them here
  // would let resetFrame's opacity-0 sweep erase every pool card's edges too.
  const ghostSpecs = ["witch", "valkyrie", "valkyrie"];
  const ghosts = ghostSpecs.map((id) => {
    const card = data.catalogue.find((c) => c.id === id);
    const g = add(makeCard(card, { faceUp: true }));
    const mats = g.material.slice();
    for (let i = 0; i < 4; i++) mats[i] = mats[i].clone();
    g.material = mats;
    for (const m of mats) {
      m.transparent = true;
      m.opacity = 0;
      m.depthWrite = false;
    }
    return g;
  });

  // Reversal score bars — glowing UI objects sliding through depth.
  const barMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false });
  const barA = add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.36, 0.36), barMat(C.yellow)));
  const barB = add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.36, 0.36), barMat(C.crimson)));

  const domRoot = document.getElementById("dom");
  const bg = document.getElementById("bg");

  // One DOM container per act; only the active one is displayed each frame.
  const actDom = new Map();
  for (const act of data.timeline.acts) {
    const div = document.createElement("div");
    div.className = "act";
    div.style.display = "none";
    domRoot.appendChild(div);
    actDom.set(act.id, div);
  }

  const L = lights;
  return {
    stage,
    data,
    scene,
    camera: stage.camera,
    lights,
    cards,
    impacts,
    shards,
    extras: { table, barriers, voidSphere, voidRing, occluder, blade, bladeGuard, slabA, slabB, ghosts, barA, barB },
    domRoot,
    actDom,
    bg,
    SKEW,
    resetFrame() {
      for (const m of cards.values()) m.visible = false;
      for (const p of impacts) {
        p.visible = false;
        p.material.opacity = 0;
      }
      for (const div of actDom.values()) div.style.display = "none";
      bg.style.opacity = "0";

      for (const x of extras) x.visible = false;
      for (const b of barriers) b.material.opacity = 0;
      voidRing.material.opacity = 0;
      for (const g of ghosts) for (const m of g.material) m.opacity = 0;
      barA.material.opacity = 0;
      barB.material.opacity = 0;

      L.amb.intensity = DEFAULTS.amb;
      L.key.intensity = DEFAULTS.key;
      L.rim.intensity = DEFAULTS.rim;
      L.rim.color.set(C.crimson);
      L.fill.intensity = DEFAULTS.fill;
      L.fill.color.set(C.yellow);
      L.fill.position.set(-4, 3, 6);
      L.accent.intensity = DEFAULTS.accent;
      L.spot.intensity = DEFAULTS.spot;
      L.spot.target.position.set(0, 0, 0);

      scene.fog.near = DEFAULTS.fogNear;
      scene.fog.far = DEFAULTS.fogFar;

      stage.camera.fov = DEFAULTS.fov;
      stage.camera.updateProjectionMatrix();
    },
  };
}

/** Tiny DOM builder for overlay typography. */
export function el(parent, tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  parent.appendChild(node);
  return node;
}
