/* Shared stage: renderer, camera, lights, post chain, and a pooled world of
   card meshes / impact flashes / per-act DOM containers.

   Determinism contract: seek() calls world.resetFrame() before the active act's
   render(), hiding every pooled object and every act's DOM container. Each act
   therefore fully specifies the frame it draws — no state can leak across acts
   or across re-renders of the same frame. */

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
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 14, 40);

  const camera = new THREE.PerspectiveCamera(38, VIEW_W / VIEW_H, 0.1, 200);
  camera.position.set(0, 0, 11);

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

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(VIEW_W, VIEW_H), 0.45, 0.4, 0.86));
  if (halftone) composer.addPass(new HalftonePass(VIEW_W, VIEW_H, { shape: 1, radius: 2.2, rotateR: rad(0), rotateG: rad(30), rotateB: rad(60), scatter: 0, blending: 1, greyscale: false }));
  composer.addPass(new OutputPass());
  composer.setSize(VIEW_W, VIEW_H);

  return { renderer, scene, camera, composer, render: () => composer.render() };
}

/** Ambient drifting shards — shared depth cue across every act. */
function buildShards(scene, count = 40) {
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
export function renderShards(shards, t, { visible = true, spin = 0.4 } = {}) {
  for (const s of shards) {
    s.visible = visible;
    if (!visible) continue;
    const sd = s.userData.seed;
    s.position.x = s.userData.base.x + Math.sin(t * 0.6 + sd) * 0.5;
    s.position.y = s.userData.base.y + Math.cos(t * 0.5 + sd * 1.3) * 0.4;
    s.rotation.x = t * (spin + rand(sd) * 0.5) + sd;
    s.rotation.y = t * (spin * 0.8 + rand(sd + 7) * 0.5) + sd;
  }
}

export function buildWorld(stage, data) {
  const { scene } = stage;

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

  return {
    stage,
    data,
    scene,
    camera: stage.camera,
    cards,
    impacts,
    shards,
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
