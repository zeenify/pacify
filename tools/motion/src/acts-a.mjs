/* Acts I–III — v2. Each act is { id, init(world), render(world, local, lines) }.
   render() must fully specify the frame: resetFrame() has already hidden every
   pooled object and reset lights/fog/camera.

   v2 doctrine (the fix for "it doesn't look 3D"):
   - The camera is the narrator: every shot travels (dolly / crane / orbit /
     hard cut), so parallax — not card tilt — is the primary depth cue.
   - Light tells the rules: the key snaps, dies, and flares; the shield is a
     light barrier; darkness is literal.
   - The table grounds everything: real cast shadows instead of baked ones.
   - DOM carries at most a kicker, one headline zone, and centred pops. */

import { C, SKEW, CARD_WORLD_W } from "./brand.mjs";
import { ease, track, spanE, span, rad, lerp, randRange } from "./tween.mjs";
import { el, renderShards, aim, shake } from "./stage.mjs";

// ---------- tiny helpers ----------

function put(mesh, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, visible = true } = {}) {
  mesh.visible = visible;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.setScalar(s);
  return mesh;
}

function faceUp(mesh, up) {
  mesh.rotation.y = up ? 0 : Math.PI;
}

function txt(parent, cls, str) {
  return el(parent, "div", cls, str);
}

/** Headline reveal: slides in on X with the brand skew, settles hard. */
function revealCap(node, p, { dx = 190, scale = 1.5 } = {}) {
  node.style.opacity = String(p);
  node.style.transform = `skewX(${SKEW}deg) translateX(${(1 - p) * dx}px) scale(${lerp(scale, 1, p)})`;
}

/** Simple opacity+rise reveal for secondary DOM. */
function fadeUp(node, p, dy = 26) {
  node.style.opacity = String(p);
  node.style.transform = `translateY(${(1 - p) * dy}px)`;
}

/** Additive impact flash from the shared pool (pure: called every frame). */
function flash(impacts, i, x, y, z, opacity, scale = 1) {
  const p = impacts[i % impacts.length];
  p.visible = opacity > 0.01;
  p.position.set(x, y, z);
  p.scale.setScalar(scale);
  p.material.opacity = opacity;
  return p;
}

// =====================================================================
// ACT I — COLD OPEN: darkness, one card, a field of nineteen, the title
// =====================================================================

const act1 = {
  id: 1,
  init(world) {
    const root = world.actDom.get(1);
    this.dom = {
      kick: txt(root, "ov kick", "HOW TO PLAY"),
      cap: txt(root, "ov cap", "PACIFY"),
      capsub: txt(root, "ov capsub", "LEARN THE LIE"),
    };
  },
  render(world, t, lines) {
    const { cards, impacts, shards, bg, lights: L, camera, scene } = world;
    const L1 = lines[0];
    const L2 = lines[1];
    const d = this.dom;

    const ids = [...cards.keys()];
    const hero = cards.get("angel");
    const fieldIds = ids.filter((id) => id !== "angel");

    const titleAt = L2.start + 0.1;
    const inField = t < L2.start;

    // ---- lights: rim-only darkness, key snaps on the title ----
    L.amb.intensity = lerp(0.1, 0.5, spanE(t, titleAt, titleAt + 0.25, "outQuint"));
    L.key.intensity = lerp(0, 1.15, spanE(t, titleAt, titleAt + 0.22, "outQuint"));
    L.rim.intensity = 2.5;
    L.fill.intensity = lerp(0.6, 8, spanE(t, titleAt, titleAt + 0.6, "outCubic"));

    // ---- fog: deep swallow in the field, airier on the title wall ----
    scene.fog.near = inField ? 4.5 : 10;
    scene.fog.far = inField ? 24 : 42;

    bg.style.opacity = String(inField ? 0 : spanE(t, titleAt, titleAt + 0.8, "outCubic") * 0.55);
    renderShards(shards, t, { visible: !inField, spin: 0.3 });

    // ---- camera: slow push through the card field, CUT to the wide wall ----
    if (inField) {
      const push = spanE(t, 0, L2.start, "inOutCubic");
      const z = lerp(6.8, 2.0, push);
      aim(camera, Math.sin(t * 0.5) * 0.35, lerp(0.5, 0.15, push), z, 0, 0.1, -7);
    } else {
      aim(camera, 0, 0.7, 10.4, 0, 0, -3);
    }
    camera.position.x += shake(t, titleAt + 0.12, 0.085);
    camera.position.y += shake(t, titleAt + 0.12, 0.05, 29);

    // ---- hero card: floats in the dark, flips face-up as the title lands ----
    if (inField) {
      put(hero, {
        x: 2.4,
        y: 0.05 + Math.sin(t * 1.1) * 0.06,
        z: 0.3,
        rx: Math.sin(t * 0.9) * 0.06,
        ry: t * 0.55,
        rz: rad(SKEW) * 0.4,
        s: 1.0,
        visible: t > 0.1,
      });
    } else {
      const flip = spanE(t, L2.start + 0.25, L2.start + 0.85, "inOutCubic");
      put(hero, { x: 0, y: 0, z: -3, ry: lerp(Math.PI, 0, flip), rz: 0, s: 1.06 });
    }

    // ---- the other eighteen: materialise phrase by phrase in deep space,
    //      then join the amphitheatre wall behind the title ----
    for (let i = 0; i < fieldIds.length; i++) {
      const m = cards.get(fieldIds[i]);
      const sd = i * 13 + 5;
      const side = randRange(sd, 0, 1) < 0.5 ? -1 : 1;
      const fx = side * randRange(sd + 1, 2.2, 8.5);
      const fy = randRange(sd + 2, -3.6, 3.6);
      const fz = -3.5 - randRange(sd + 3, 0, 12.5);
      const isTrick = i >= 11;
      const born = isTrick
        ? lerp(L1.start + 2.1, L1.start + 3.6, (i - 11) / 6.999) // "seven rounds"
        : lerp(L1.start + 0.25, L1.start + 2.0, i / 10.999); // "nineteen cards"
      const bornP = spanE(t, born, born + 0.55, "outBack");

      if (!inField) {
        const idx = ids.indexOf(fieldIds[i]);
        const th = lerp(-1.06, 1.06, idx / 18) + randRange(sd, -0.02, 0.02);
        const pop = spanE(t, titleAt + 0.1 + idx * 0.028, titleAt + 0.5 + idx * 0.028, "outBack");
        put(m, {
          x: Math.sin(th) * 9.6,
          y: -0.5 + Math.sin(idx * 2.4) * 0.5,
          z: -3 + (Math.cos(th) - 1) * 9.6,
          ry: -th * 0.55,
          rz: randRange(sd + 4, -0.05, 0.05),
          s: lerp(0.001, 1, pop),
        });
        continue;
      }
      put(m, {
        x: fx,
        y: fy + Math.sin(t * 0.7 + sd) * 0.12,
        z: fz,
        ry: Math.sin(t * 0.5 + sd) * 0.16,
        rx: Math.sin(t * 0.4 + sd * 2) * 0.08,
        s: bornP,
        visible: bornP > 0.001,
      });
    }

    flash(impacts, 0, 0, 0.2, -2.6,
      spanE(t, titleAt, titleAt + 0.18, "outCubic") * (1 - span(t, titleAt + 0.18, titleAt + 0.85)) * 0.85, 2.2);

    // ---- DOM ----
    d.kick.style.opacity = String(spanE(t, 0.4, 1.4, "outCubic") * 0.9);
    const capP = spanE(t, titleAt + 0.08, titleAt + 0.5, "outQuint");
    revealCap(d.cap, capP);
    fadeUp(d.capsub, spanE(t, titleAt + 0.42, titleAt + 0.85, "outCubic"));
  },
};

// =====================================================================
// ACT II — SHAPE OF A DUEL: the table, the deal, the simultaneous commit
// =====================================================================

const act2 = {
  id: 2,
  init(world) {
    const root = world.actDom.get(2);
    this.dom = {
      kick: txt(root, "ov kick", "THE SHAPE OF A DUEL"),
      goal: txt(root, "ov goal", "FIRST TO 20"),
      goalsub: txt(root, "ov tiny", "SEVEN ROUNDS · HIGHEST TOTAL TAKES IT"),
    };
    this.dom.goalsub.style.top = "46%";
    this.dom.goalsub.style.left = "0";
    this.dom.goalsub.style.right = "0";
    this.dom.goalsub.style.textAlign = "center";
  },
  render(world, t, lines) {
    const { cards, impacts, bg, lights: L, camera, scene, extras } = world;
    const L1 = lines[0];
    const L2 = lines[1];
    const L3 = lines[2];
    const d = this.dom;
    extras.table.visible = true;

    // ---- lights: warm key over the felt ----
    L.amb.intensity = 0.62;
    L.key.intensity = track([
      { t: 0, v: 1.15 }, { t: 1.2, v: 1.3 },
      { t: L2.end - 0.3, v: 1.3 }, { t: L2.end - 0.15, v: 1.7, e: "outQuint" }, { t: L2.end + 0.5, v: 1.3 },
    ], t);
    L.rim.intensity = 1.3;
    L.fill.intensity = 12;
    scene.fog.near = 13;
    scene.fog.far = 44;
    bg.style.opacity = "0.4";

    // ---- hands: seven backs per side, dealt onto the felt ----
    // The two hands must not share a card id — each id is one pooled mesh.
    const handIds = ["bandit", "paladin", "ogre", "knight", "witch", "wizard", "vampire"];
    const rightIds = ["demon", "valkyrie", "seraph", "angel", "oracle", "reversal", "leviathan"];
    const mine = cards.get("knight");
    const theirs = cards.get("valkyrie");

    for (let i = 0; i < 7; i++) {
      const tL = L1.start + 0.35 + i * 0.27;
      const tR = L1.start + 0.48 + i * 0.27;
      const pl = spanE(t, tL, tL + 0.5, "outQuint");
      const pr = spanE(t, tR, tR + 0.5, "outQuint");
      const ml = cards.get(handIds[i]);
      const mr = cards.get(rightIds[i]);

      if (ml !== mine) {
        put(ml, {
          x: -4.6 + i * 0.42, y: lerp(0.6, -2.31, pl), z: 1.7 + Math.abs(i - 3) * 0.3,
          rx: lerp(1.15, Math.PI / 2, pl), ry: 0, rz: -(i - 3) * rad(6),
          visible: pl > 0.01,
        });
      }
      if (mr !== theirs) {
        put(mr, {
          x: 4.6 - i * 0.42, y: lerp(0.6, -2.31, pr), z: 1.7 + Math.abs(i - 3) * 0.3,
          rx: lerp(1.15, Math.PI / 2, pr), ry: 0, rz: (i - 3) * rad(6),
          visible: pr > 0.01,
        });
      }
      if (pl > 0.02 && pl < 0.3) flash(impacts, i, -4.6 + i * 0.42, -2.1, 1.7, 0.28 * (1 - pl * 3.3), 0.7);
      if (pr > 0.02 && pr < 0.3) flash(impacts, i + 7, 4.6 - i * 0.42, -2.1, 1.7, 0.28 * (1 - pr * 3.3), 0.7);
    }

    // ---- commit beat: cards stand from the felt, slide to centre, flip together ----
    const rise = spanE(t, L2.start + 1.3, L2.start + 2.5, "inOutCubic");
    const flip = spanE(t, L2.end - 0.95, L2.end - 0.3, "inOutCubic");
    const settle = spanE(t, L3.start, L3.start + 1.1, "outCubic");
    const mx = lerp(lerp(-3.34, -0.8, rise), -0.8, settle);
    const tx = lerp(lerp(4.18, 0.8, rise), 0.8, settle);
    const mz = lerp(lerp(1.7, 1.1, rise), 0.4, settle);
    const tz = lerp(lerp(2.0, 1.1, rise), 0.4, settle);
    put(mine, {
      x: mx,
      y: lerp(lerp(-2.31, -0.9, rise), -2.31, settle) + Math.sin(t * 2.2) * 0.04 * (1 - flip) * (1 - settle),
      z: mz,
      rx: lerp(lerp(Math.PI / 2, 0, rise), -Math.PI / 2, settle),
      rz: lerp(rad(-13.5), 0, rise), s: 1,
    });
    put(theirs, {
      x: tx,
      y: lerp(lerp(-2.31, -0.9, rise), -2.31, settle) + Math.sin(t * 2.2 + 1.7) * 0.04 * (1 - flip) * (1 - settle),
      z: tz,
      rx: lerp(lerp(Math.PI / 2, 0, rise), -Math.PI / 2, settle),
      rz: lerp(rad(13.5), 0, rise), s: 1,
    });
    const flipP = spanE(t, L2.end - 0.95, L2.end - 0.3, "inOutCubic");
    mine.rotation.y = lerp(lerp(0, Math.PI, rise), 0, flipP);
    theirs.rotation.y = lerp(lerp(0, Math.PI, rise), 0, flipP);
    flash(impacts, 1, 0, -0.9, 1.1, flipP > 0 && flipP < 1 ? Math.sin(flipP * Math.PI) * 0.7 : 0, 1.6);

    // ---- camera: crane in, drop low for the commit, wide reveal ----
    if (t < L2.start) {
      const k = spanE(t, 0, L2.start, "outCubic");
      aim(camera, 0, lerp(5.6, 3.4, k), lerp(11, 9.4, k), 0, -1.6, 0);
    } else if (t < L3.start) {
      aim(camera, 0, 1.0 + shake(t, L2.end - 0.35, 0.045) * 0.4, 7.8, 0, -1.2, -1.5);
    } else {
      const k = spanE(t, L3.start, L3.start + 1.3, "outCubic");
      aim(camera, 0, lerp(0.75, 7.0, k), lerp(6.6, 12.6, k), 0, lerp(-1.5, -1.9, k), -1.2);
    }

    // ---- DOM ----
    d.kick.style.opacity = String(spanE(t, 0.3, 1.1, "outCubic") * 0.9);
    const gP = spanE(t, L3.start + 0.55, L3.start + 1.15, "outQuint");
    revealCap(d.goal, gP);
    fadeUp(d.goalsub, spanE(t, L3.start + 0.95, L3.start + 1.5, "outCubic"));
  },
};

// =====================================================================
// ACT III — THE CLASH: corridor fly-through, alignment walls, orbit, shield
// =====================================================================

const act3 = {
  id: 3,
  init(world) {
    const root = world.actDom.get(3);
    this.dom = {
      kick: txt(root, "ov kick", "NUMBER CARDS · THE CLASH"),
      sideL: txt(root, "ov sideL", "BAD"),
      sideR: txt(root, "ov sideR", "GOOD"),
      pop: txt(root, "ov pop", "+9"),
      popsub: txt(root, "ov popsub", "ANGEL 12 — OGRE 3"),
      pop2: txt(root, "ov pop", "0"),
      popsub2: txt(root, "ov popsub", "SAME ALIGNMENT — NOTHING SCORES"),
    };
    for (const k of ["popsub", "popsub2"]) {
      this.dom[k].style.top = "calc(38% + 150px)";
    }
  },
  render(world, t, lines) {
    const { cards, impacts, bg, lights: L, camera, scene, extras } = world;
    const L1 = lines[0];
    const L2 = lines[1];
    const L3 = lines[2];
    const L4 = lines[3];
    const d = this.dom;
    extras.table.visible = true;

    const badCol = ["bandit", "ogre", "witch", "vampire", "leviathan", "demon"];
    const goodCol = ["paladin", "knight", "wizard", "valkyrie", "seraph", "angel"];
    const ogre = cards.get("ogre");
    const angel = cards.get("angel");
    const valkyrie = cards.get("valkyrie");
    const wizard = cards.get("wizard");

    const hide = (nodes) => { for (const n of nodes) n.style.opacity = "0"; };

    if (t < L2.start) {
      // ---- L1: fly the corridor of twelve ----
      L.amb.intensity = 0.35;
      L.key.intensity = 0.7;
      L.rim.intensity = 2.6;
      L.fill.intensity = 4;
      L.accent.intensity = 6;
      scene.fog.near = 3;
      scene.fog.far = 21;
      bg.style.opacity = "0.15";

      for (let i = 0; i < 6; i++) {
        const z = 1.5 - i * 1.7;
        const sway = Math.sin(t * 0.8 + i * 1.4) * 0.07;
        put(cards.get(badCol[i]), { x: -1.9, y: -0.45 + Math.sin(i * 2.1) * 0.12, z, ry: sway });
        put(cards.get(goodCol[i]), { x: 1.9, y: -0.45 + Math.sin(i * 2.1 + 1) * 0.12, z, ry: sway });
      }
      const fly = spanE(t, L1.start, L1.end + 0.5, "inOutCubic");
      const cz = lerp(8.5, -12.5, fly);
      camera.fov = 48;
      camera.updateProjectionMatrix();
      aim(camera, Math.sin(t * 0.55) * 0.35, 0.05, cz, 0, -0.35, cz - 4.5);
      // key rides just ahead of the camera so faces catch light as we pass
      L.key.position.set(camera.position.x, 3, camera.position.z - 3);

      hide([d.sideL, d.sideR, d.pop, d.popsub, d.pop2, d.popsub2]);
    } else if (t < L3.start) {
      // ---- L2: two alignment walls, each lit by its own light ----
      L.amb.intensity = 0.42;
      L.key.intensity = 0.8;
      L.rim.intensity = 1.6;
      L.fill.intensity = 13;
      L.fill.position.set(9, 1.2, 4);
      L.accent.intensity = 26;
      L.accent.position.set(-9, 1.2, 4);
      scene.fog.near = 12;
      scene.fog.far = 40;
      bg.style.opacity = "0.3";

      for (let i = 0; i < 6; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        put(cards.get(badCol[i]), { x: -5.35 + col * 1.45, y: -1.95 + row * 1.95, z: 0.2 - col * 0.95, ry: rad(20) });
        put(cards.get(goodCol[i]), { x: 5.35 - col * 1.45, y: -1.95 + row * 1.95, z: 0.2 - col * 0.95, ry: rad(-20) });
      }
      const drift = spanE(t, L2.start, L2.end, "inOutQuad");
      aim(camera, lerp(0, -2.2, drift), 0.7, lerp(10.5, 11.6, drift), 0, 0, 0);

      const inL = spanE(t, L2.start + 0.4, L2.start + 1.0, "outCubic");
      const inR = spanE(t, L2.start + 0.8, L2.start + 1.4, "outCubic");
      d.sideL.style.opacity = String(inL);
      d.sideL.style.transform = `translateX(${(1 - inL) * -60}px) skewX(${SKEW}deg)`;
      d.sideR.style.opacity = String(inR);
      d.sideR.style.transform = `translateX(${(1 - inR) * 60}px) skewX(${SKEW}deg)`;
      hide([d.pop, d.popsub, d.pop2, d.popsub2]);
    } else if (t < L4.start) {
      // ---- L3: the clash, orbited by the camera ----
      L.amb.intensity = 0.45;
      L.key.intensity = track([
        { t: L3.start, v: 0.8 },
        { t: L3.end - 1.42, v: 0.8 },
        { t: L3.end - 1.3, v: 1.75, e: "outQuint" },
        { t: L3.end - 0.7, v: 0.9 },
      ], t);
      L.rim.intensity = 1.9;
      L.fill.intensity = 7;
      L.accent.intensity = 8;
      scene.fog.near = 12;
      scene.fog.far = 42;
      bg.style.opacity = "0.3";

      const dimP = spanE(t, L3.start, L3.start + 0.9, "outCubic");
      for (let i = 0; i < 6; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const mb = badCol[i] === "ogre" ? null : cards.get(badCol[i]);
        const mg = goodCol[i] === "angel" ? null : cards.get(goodCol[i]);
        if (mb) put(mb, { x: -5.35 + col * 1.45, y: -1.95 + row * 1.95, z: 0.2 - col * 0.95 - dimP * 1.6, ry: rad(20), s: 1 - dimP * 0.12 });
        if (mg) put(mg, { x: 5.35 - col * 1.45, y: -1.95 + row * 1.95, z: 0.2 - col * 0.95 - dimP * 1.6, ry: rad(-20), s: 1 - dimP * 0.12 });
      }

      const fly = spanE(t, L3.start, L3.start + 1.15, "outQuint");
      const slam = spanE(t, L3.end - 1.42, L3.end - 1.12, "inExpo");
      put(ogre, {
        x: lerp(lerp(-5.35, -1.35, fly), -0.62, slam),
        y: lerp(-0.2, 0, fly), z: lerp(0.2, 0.85, fly),
        ry: rad(14) * (1 - slam), s: 1.12,
      });
      put(angel, {
        x: lerp(lerp(5.35, 1.35, fly), 0.62, slam),
        y: lerp(0.4, 0, fly), z: lerp(0.2, 0.85, fly),
        ry: rad(-14) * (1 - slam), s: 1.12,
      });
      flash(impacts, 0, 0, 0, 0.85, slam > 0.02 && slam < 1 ? 0.9 * (1 - slam * 0.7) : 0, 2.4);

      const az = lerp(rad(-40), rad(32), spanE(t, L3.start, L3.end - 1.0, "inOutQuad"));
      const R = 7.6;
      aim(camera, Math.sin(az) * R + shake(t, L3.end - 1.3, 0.09), 0.9, Math.cos(az) * R, 0, 0, 0.85);

      const popP = spanE(t, L3.end - 1.25, L3.end - 0.75, "outQuint");
      revealCap(d.pop, popP);
      fadeUp(d.popsub, spanE(t, L3.end - 1.0, L3.end - 0.5, "outCubic"));
      d.sideL.style.opacity = "0";
      d.sideR.style.opacity = "0";
      hide([d.pop2, d.popsub2]);
    } else {
      // ---- L4: the shield — a light barrier the clash cannot pass ----
      L.amb.intensity = 0.4;
      L.key.intensity = track([{ t: L4.start, v: 0.85 }, { t: L4.start + 1.6, v: 0.55 }, { t: L4.end, v: 0.55 }], t);
      L.rim.intensity = 2.1;
      L.fill.intensity = track([{ t: L4.start + 1.5, v: 5 }, { t: L4.start + 1.75, v: 16, e: "outQuint" }, { t: L4.start + 3.5, v: 9 }], t);
      L.accent.intensity = track([{ t: L4.start + 1.5, v: 6 }, { t: L4.start + 1.75, v: 30, e: "outQuint" }, { t: L4.start + 3.5, v: 12 }], t);
      L.accent.position.set(0, 0.5, 3.4);
      scene.fog.near = 11;
      scene.fog.far = 40;
      bg.style.opacity = "0.35";

      for (let i = 0; i < 6; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const mb = badCol[i] === "ogre" ? null : cards.get(badCol[i]);
        const mg = goodCol[i] === "angel" ? null : cards.get(goodCol[i]);
        if (mb) put(mb, { x: -5.35 + col * 1.45, y: -1.95 + row * 1.95, z: -1.8 - col * 0.95, ry: rad(20), s: 0.88 });
        if (mg) put(mg, { x: 5.35 - col * 1.45, y: -1.95 + row * 1.95, z: -1.8 - col * 0.95, ry: rad(-20), s: 0.88 });
      }

      const inP = spanE(t, L4.start, L4.start + 0.9, "outCubic");
      const press = spanE(t, L4.start + 1.9, L4.start + 2.4, "inOutQuad");
      const bounce = spanE(t, L4.start + 2.5, L4.start + 3.4, "outElastic");
      put(valkyrie, {
        x: lerp(lerp(-1.7, -1.05, press), -1.75, bounce),
        y: lerp(3.6, 0.1, inP), z: 0.85, s: 1.08,
      });
      put(wizard, {
        x: lerp(lerp(1.7, 1.05, press), 1.75, bounce),
        y: lerp(-3.6, 0.1, inP), z: 0.85, s: 1.08,
      });

      const bIn = spanE(t, L4.start + 1.55, L4.start + 1.85, "outQuint");
      const bFlare = spanE(t, L4.start + 1.55, L4.start + 2.6, "outCubic");
      const barrier = extras.barriers[0];
      barrier.visible = true;
      barrier.position.set(0, 0.1, 0.85);
      barrier.scale.set(lerp(0.05, 1, bIn), lerp(0.3, 1, bIn), 1);
      barrier.material.opacity = lerp(0.68, 0.34, bFlare);
      flash(impacts, 1, 0, 0.1, 0.9, (1 - bFlare) * 0.75, 2.6);

      const popP = spanE(t, L4.start + 2.5, L4.start + 3.0, "outQuint");
      revealCap(d.pop2, popP);
      fadeUp(d.popsub2, spanE(t, L4.start + 2.75, L4.start + 3.25, "outCubic"));
      hide([d.pop, d.popsub, d.sideL, d.sideR]);

      const k = spanE(t, L4.start, L4.end, "inOutQuad");
      aim(camera, 0, 0.55, lerp(6.9, 5.9, k), 0, 0, 0.85);
    }

    d.kick.style.opacity = String(spanE(t, 0.3, 1.0, "outCubic") * 0.85);
  },
};

export const ACTS_A = [act1, act2, act3];
