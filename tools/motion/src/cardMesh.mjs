/* 3D card slab — v2: LIT faces.
   v1 shipped faces as MeshBasicMaterial ("unlit on purpose") and the whole scene
   read as flat: an unlit surface cannot respond to light, so the eye files every
   card as a rotated rectangle no matter how the camera moves. Faces are now
   MeshStandardMaterial (matte paper: roughness ~0.85) so the key light shades
   them, cards shadow each other, and dark acts actually go dark. Edges are
   semi-metallic so light races across a stack as it turns. `toneMapped: false`
   keeps the poster colours exact under NoToneMapping. */

import * as THREE from "three";
import { CARD_WORLD_W, CARD_WORLD_H, CARD_DEPTH, C } from "./brand.mjs";
import { cardFaceTexture, cardBackTexture } from "./cardFace.mjs";

const edgeCache = new Map();

function edgeMaterial(color) {
  if (edgeCache.has(color)) return edgeCache.get(color);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 });
  edgeCache.set(color, m);
  return m;
}

let geo = null;
function cardGeometry() {
  if (!geo) geo = new THREE.BoxGeometry(CARD_WORLD_W, CARD_WORLD_H, CARD_DEPTH, 1, 1, 1);
  return geo;
}

/** Edge colour by card type, so a stack of cards still reads as good/bad/trick. */
function edgeColorFor(card) {
  if (card.kind === "trick") return C.yellow;
  return card.align === "good" ? C.crimson : C.yellow;
}

/**
 * @param card catalogue entry from data.json
 * @param opts { faceUp: boolean }
 */
export function makeCard(card, { faceUp = true } = {}) {
  const face = new THREE.MeshStandardMaterial({
    map: cardFaceTexture(card),
    roughness: 0.85,
    metalness: 0.02,
    toneMapped: false,
  });
  const back = new THREE.MeshStandardMaterial({
    map: cardBackTexture(),
    roughness: 0.85,
    metalness: 0.02,
    toneMapped: false,
  });

  const edge = edgeMaterial(edgeColorFor(card));

  // BoxGeometry material order: +X, -X, +Y, -Y, +Z (front), -Z (back)
  const mesh = new THREE.Mesh(cardGeometry(), [edge, edge, edge, edge, face, back]);
  mesh.userData.card = card;
  mesh.userData.faceMat = face;
  mesh.rotation.y = faceUp ? 0 : Math.PI;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A face-down card (shared back texture, still needs its own edge colour). */
export function makeCardBack(card) {
  return makeCard(card, { faceUp: false });
}

/** Radial flash used for slam impacts. A plain additive plane shows a hard
    rectangular edge on screen; the radial alpha texture makes it read as a glow. */
let impactTex = null;
function impactTexture() {
  if (impactTex) return impactTex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  impactTex = new THREE.CanvasTexture(cv);
  impactTex.colorSpace = THREE.SRGBColorSpace;
  return impactTex;
}

export function makeImpactPlane(size = 6) {
  const g = new THREE.PlaneGeometry(size, size);
  const m = new THREE.MeshBasicMaterial({
    color: C.crimson,
    map: impactTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 5;
  return mesh;
}
