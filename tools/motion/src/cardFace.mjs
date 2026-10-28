/* Procedural P5 card art, drawn to a 2D canvas and uploaded as a THREE texture.

   Three silhouettes so a viewer reads a card instantly, even at an angle and small:
     good number -> paper white face, crimson furniture
     bad  number -> near-black face, crimson slash, yellow power
     trick       -> full-bleed crimson face, black name, yellow accents

   Deterministic: every pseudo-random choice is seeded from the card id, so the
   same card always renders identically across frames and re-renders. */

import * as THREE from "three";
import { C, FONT, CARD_W, CARD_H } from "./brand.mjs";
import { rand, randRange, rad } from "./tween.mjs";

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeCanvas(w = CARD_W, h = CARD_H) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
}

/** Halftone dot field — the signature P5 print texture. */
function halftone(ctx, x, y, w, h, { color = C.halftone, step = 13, maxR = 5.2, seed = 1, jitter = 0.35 } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  let i = 0;
  for (let gy = y; gy < y + h; gy += step) {
    let j = 0;
    for (let gx = x; gx < x + w; gx += step) {
      const r = maxR * (0.35 + 0.65 * rand(seed + i * 31 + j * 7));
      const ox = randRange(seed + i * 13 + j, -jitter * step, jitter * step) * 0.3;
      const oy = randRange(seed + i * 7 + j * 3, -jitter * step, jitter * step) * 0.3;
      ctx.beginPath();
      ctx.arc(gx + ox, gy + oy, Math.max(0.4, r), 0, Math.PI * 2);
      ctx.fill();
      j++;
    }
    i++;
  }
  ctx.restore();
}

/** A hard-edged diagonal band, skewed to match the brand's -8deg language. */
function slash(ctx, { x, y, w, h, angle = -8, color = C.crimson }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rad(angle));
  ctx.fillStyle = color;
  ctx.fillRect(-w, -h / 2, w * 2, h);
  ctx.restore();
}

function skewedText(ctx, text, x, y, { font, color, angle = -8, align = "left", shadow = null, shadowColor = "#000", maxWidth = null }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad(angle));
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  if (shadow) {
    ctx.fillStyle = shadowColor;
    ctx.fillText(text, shadow, shadow, maxWidth ?? undefined);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0, maxWidth ?? undefined);
  ctx.restore();
}

/** Procedural emblem so each card has a distinct mark without external art. */
function emblem(ctx, cx, cy, r, seed, { stroke, fill, weight = 7 }) {
  const kind = Math.floor(rand(seed) * 5);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad(randRange(seed + 5, -18, 18)));
  ctx.lineWidth = weight;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineJoin = "miter";

  if (kind === 0) {
    // Concentric diamonds
    for (let k = 0; k < 3; k++) {
      const rr = r * (1 - k * 0.3);
      ctx.beginPath();
      ctx.moveTo(0, -rr);
      ctx.lineTo(rr * 0.78, 0);
      ctx.lineTo(0, rr);
      ctx.lineTo(-rr * 0.78, 0);
      ctx.closePath();
      if (k === 0) ctx.fill();
      else ctx.stroke();
    }
  } else if (kind === 1) {
    // Radiating shards
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const len = r * (0.55 + 0.45 * rand(seed + i * 17));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 2) {
    // Stacked chevrons
    for (let k = 0; k < 3; k++) {
      const yy = -r * 0.55 + k * r * 0.55;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, yy);
      ctx.lineTo(0, yy + r * 0.38);
      ctx.lineTo(r * 0.8, yy);
      ctx.stroke();
    }
  } else if (kind === 3) {
    // Broken ring + bar
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, rad(30), rad(300));
    ctx.stroke();
    ctx.fillRect(-r * 0.85, -weight, r * 1.7, weight * 2);
  } else {
    // Cross-hatch square
    const s = r * 0.72;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(-s, (i / 3) * s);
      ctx.lineTo(s, (i / 3) * s);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function border(ctx, w, h, { inset = 12, color = C.paper, weight = 8 }) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.restore();
}

/**
 * Draw a card face.
 * @param card {kind, id, name, power, align}
 */
export function drawCardFace(card) {
  const cv = makeCanvas();
  const ctx = cv.getContext("2d");
  const W = CARD_W;
  const H = CARD_H;
  const seed = hashSeed(card.id);
  const isTrick = card.kind === "trick";
  const good = !isTrick && card.align === "good";

  // ---- ground ----
  if (isTrick) {
    ctx.fillStyle = C.crimson;
    ctx.fillRect(0, 0, W, H);
    halftone(ctx, 0, 0, W, H, { color: "rgba(10,10,10,0.30)", step: 15, maxR: 6, seed });
    slash(ctx, { x: -60, y: H * 0.62, w: W + 120, h: 46, angle: -8, color: C.black });
  } else if (good) {
    // A pure paper-white ground renders as a blown-out void under bloom and gives
    // the eye nothing to hold. The ray burst + dense halftone break the white field
    // into graphic shapes while keeping "good = light card" instantly readable.
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    halftone(ctx, 0, 0, W, H, { color: "rgba(230,0,18,0.20)", step: 12, maxR: 4.6, seed });
    ctx.save();
    ctx.translate(W / 2, H * 0.47);
    ctx.strokeStyle = C.crimson;
    ctx.lineWidth = 26;
    for (let i = 0; i < 14; i++) {
      ctx.rotate(rad(360 / 14));
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(0, -H * 0.52);
      ctx.stroke();
    }
    ctx.restore();
    slash(ctx, { x: -60, y: -34, w: W + 120, h: 78, angle: -8, color: C.black });
  } else {
    ctx.fillStyle = C.black;
    ctx.fillRect(0, 0, W, H);
    halftone(ctx, 0, 0, W, H * 0.72, { color: "rgba(230,0,18,0.34)", step: 14, maxR: 6.4, seed });
    slash(ctx, { x: -60, y: H * 0.2, w: W + 120, h: 60, angle: -8, color: C.crimsonDeep });
  }

  // ---- emblem ----
  const embStroke = isTrick ? C.yellow : good ? C.black : C.yellow;
  const embFill = isTrick ? C.black : good ? C.yellow : C.crimson;
  emblem(ctx, W / 2, H * 0.5, 108, seed, { stroke: embStroke, fill: embFill, weight: 8 });

  // ---- power / trick badge ----
  const badge = isTrick ? "TRICK" : String(card.power);
  const badgeColor = isTrick ? C.black : good ? C.paper : C.yellow;
  const badgeSize = isTrick ? 44 : card.power >= 10 ? 118 : 132;

  // hard offset shadow plate behind the badge
  ctx.save();
  ctx.fillStyle = isTrick ? C.black : good ? C.crimson : C.crimson;
  ctx.fillRect(26 + 7, 24 + 7, isTrick ? 190 : 150, isTrick ? 62 : 150);
  ctx.fillStyle = isTrick ? C.yellow : C.black;
  ctx.fillRect(26, 24, isTrick ? 190 : 150, isTrick ? 62 : 150);
  ctx.restore();

  skewedText(ctx, badge, isTrick ? 121 : 26 + 75, isTrick ? 24 + 47 : 24 + 118, {
    font: `${badgeSize}px ${FONT.display}, sans-serif`,
    color: badgeColor,
    align: "center",
    angle: 0,
  });

  // ---- alignment tag (numbers only) ----
  if (!isTrick) {
    const tag = card.align === "good" ? "GOOD" : "BAD";
    const tagColor = card.align === "good" ? C.crimson : C.yellow;
    ctx.save();
    ctx.translate(W - 30, 30);
    ctx.rotate(rad(8));
    ctx.fillStyle = C.black;
    ctx.fillRect(-118 + 6, 6, 118, 46);
    ctx.fillStyle = tagColor;
    ctx.fillRect(-118, 0, 118, 46);
    ctx.font = `30px ${FONT.body}, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = card.align === "good" ? C.paper : C.black;
    ctx.fillText(tag, -59, 33);
    ctx.restore();
  }

  // ---- name plate ----
  const plateY = H - 118;
  ctx.save();
  ctx.fillStyle = isTrick ? C.black : good ? C.black : C.crimson;
  ctx.fillRect(0, plateY + 8, W, 96);
  ctx.fillStyle = isTrick ? C.yellow : good ? C.crimson : C.black;
  ctx.fillRect(0, plateY, W, 96);
  ctx.restore();

  const nameColor = isTrick ? C.black : C.paper;
  const nameSize = card.name.length > 9 ? 52 : card.name.length > 6 ? 62 : 72;
  skewedText(ctx, card.name.toUpperCase(), W / 2, plateY + 72, {
    font: `${nameSize}px ${FONT.display}, sans-serif`,
    color: nameColor,
    align: "center",
    angle: -8,
    shadow: 5,
    shadowColor: isTrick ? "rgba(0,0,0,0.55)" : good ? C.black : C.crimsonDeep,
  });

  // ---- frame ----
  border(ctx, W, H, { inset: 10, color: isTrick ? C.black : good ? C.crimson : C.yellow, weight: 9 });
  border(ctx, W, H, { inset: 20, color: isTrick ? C.yellow : good ? C.black : C.crimson, weight: 2 });

  return cv;
}

/** Shared card back — black with a crimson halftone mask motif. */
let backCanvas = null;
export function drawCardBack() {
  if (backCanvas) return backCanvas;
  const cv = makeCanvas();
  const ctx = cv.getContext("2d");
  const W = CARD_W;
  const H = CARD_H;

  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, 0, 0, W, H, { color: "rgba(230,0,18,0.42)", step: 12, maxR: 5.4, seed: 99 });

  // radiating crimson burst
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.strokeStyle = C.crimson;
  ctx.lineWidth = 16;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(rad(30));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -H * 0.62);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(rad(-8));
  ctx.fillStyle = C.black;
  ctx.fillRect(-150 + 8, -56 + 8, 300, 112);
  ctx.fillStyle = C.yellow;
  ctx.fillRect(-150, -56, 300, 112);
  ctx.font = `84px ${FONT.display}, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = C.black;
  ctx.fillText("PACIFY", 0, 30);
  ctx.restore();

  border(ctx, W, H, { inset: 10, color: C.crimson, weight: 10 });
  border(ctx, W, H, { inset: 22, color: C.yellow, weight: 2 });

  backCanvas = cv;
  return cv;
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const faceCache = new Map();

/** Cached THREE texture for a card face. */
export function cardFaceTexture(card) {
  if (faceCache.has(card.id)) return faceCache.get(card.id);
  const tex = toTexture(drawCardFace(card));
  faceCache.set(card.id, tex);
  return tex;
}

let backTex = null;
export function cardBackTexture() {
  if (!backTex) backTex = toTexture(drawCardBack());
  return backTex;
}
