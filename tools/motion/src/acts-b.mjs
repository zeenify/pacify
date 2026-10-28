/* Acts IV–VI. Same contract as acts-a: render() fully specifies the frame. */

import { C, SKEW } from "./brand.mjs";
import { track, spanE, span, rad, lerp } from "./tween.mjs";
import { el, renderShards } from "./stage.mjs";

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
function win(lines, id) {
  const l = lines.find((x) => x.id === id);
  return l ? { s: l.start, e: l.end } : { s: 0, e: 0 };
}

// =====================================================================
// ACT IV — SEVEN TRICKS
// =====================================================================

const act4 = {
  id: 4,
  init(world) {
    const root = world.actDom.get(4);
    this.dom = {
      kick: txt(root, "ov kick", "TRICKS · SEVEN WAYS TO LIE"),
      name: txt(root, "ov trickname", ""),
      sub: txt(root, "ov sub", ""),
      big: txt(root, "ov bigword", ""),
      x2: txt(root, "ov x2", "×2 NEXT"),
      eye: el(root, "div", "ov eye"),
      blade: el(root, "div", "ov blade"),
      stamp: txt(root, "ov stamp", "EXECUTED"),
      barA: el(root, "div", "ov bar rbar"),
      barAf: el(root, "div", "ov barfill rbar"),
      barAv: txt(root, "ov barval rbar", "18"),
      barB: el(root, "div", "ov bar rbar b"),
      barBf: el(root, "div", "ov barfill rbar b"),
      barBv: txt(root, "ov barval rbar b", "6"),
    };
  },

  render(world, t, lines) {
    const { cards, impacts, bg } = world;
    const d = this.dom;
    const L0 = win(lines, "a4l0");

    world.stage.camera.position.set(0, 0, track([{ t: 0, v: 12.5, e: "outQuint" }, { t: 5, v: 10.6 }], t));
    world.stage.camera.lookAt(0, 0, 0);
    bg.style.opacity = String(spanE(t, 0, 1.2, "outCubic") * 0.7);
    renderShards(world.shards, t, { spin: 0.3 });

    d.kick.style.left = "120px";
    d.kick.style.top = "70px";
    d.kick.style.opacity = String(spanE(t, 0.1, 0.6, "outCubic") * (1 - spanE(t, L0.e, L0.e + 0.4, "inQuad")));
    d.kick.style.transform = `skewX(${SKEW}deg)`;

    const trickIds = ["void", "oracle", "reversal", "ward", "echo", "executioner", "eclipse"];

    // ---- intro: fan of all seven tricks ----
    const fanP = spanE(t, 0.3, 1.6, "outQuint");
    const fanOut = 1 - spanE(t, L0.e - 0.1, L0.e + 0.4, "inQuad");
    for (let i = 0; i < 7; i++) {
      const k = (i - 3) / 3;
      const m = cards.get(trickIds[i]);
      put(m, {
        x: k * 2.5,
        y: -0.2 + Math.abs(k) * 0.7 + (1 - fanP) * 5,
        z: -Math.abs(k) * 0.5,
        rz: rad(k * 10),
        s: 0.78 * fanP * fanOut,
        visible: fanP > 0.02 && fanOut > 0.02,
      });
      faceUp(m, true);
    }
    if (t < L0.e + 0.4) {
      d.name.style.opacity = "0";
      d.sub.style.opacity = "0";
      d.big.style.opacity = "0";
      this.beat = null;
      return;
    }

    // ---- per-trick beats ----
    // Reset shared demo DOM each frame; the active beat sets what it needs.
    // d.big / d.name / d.sub must be cleared too or the previous beat's headline
    // lingers on screen (DOM styles persist across frames).
    d.big.style.opacity = "0";
    d.name.style.opacity = "0";
    d.sub.style.opacity = "0";
    d.x2.style.opacity = "0";
    d.eye.style.opacity = "0";
    d.blade.style.opacity = "0";
    d.stamp.style.opacity = "0";
    d.barA.style.opacity = "0";
    d.barAf.style.opacity = "0";
    d.barAv.style.opacity = "0";
    d.barB.style.opacity = "0";
    d.barBf.style.opacity = "0";
    d.barBv.style.opacity = "0";
    for (const p of impacts) p.material.color.set(C.crimson);

    const beats = [
      ["a4l1", "VOID", "TOP PRIORITY · KILLS THE ROUND ENTIRELY", this.beatVoid],
      ["a4l2", "WARD", "BLOCKS THE TRICK · BANKS 5 FLAT", this.beatWard],
      ["a4l3", "ECHO", "VOIDS THIS ROUND · DOUBLES THE NEXT", this.beatEcho],
      ["a4l4", "ECLIPSE", "SHIELDS OFFLINE FOR 2 ROUNDS", this.beatEclipse],
      ["a4l5", "ORACLE", "PEEK 2 CARDS FROM THEIR HAND", this.beatOracle],
      ["a4l6", "REVERSAL", "SWAP TOTALS AFTER SCORING", this.beatReversal],
      ["a4l7", "EXECUTIONER", "7+ NUMBER COMMITTED → THEIR TOTAL DIES", this.beatExecutioner],
    ];

    for (const [id, name, sub, fn] of beats) {
      const w = win(lines, id);
      if (t < w.s - 0.35 || t > w.e + 0.35) continue;
      const inP = spanE(t, w.s - 0.3, w.s + 0.25, "outQuint");
      const outP = 1 - spanE(t, w.e + 0.05, w.e + 0.35, "inQuad");

      // the trick card itself, slamming in at left
      const tc = cards.get(id === "a4l1" ? "void" : id === "a4l2" ? "ward" : id === "a4l3" ? "echo" : id === "a4l4" ? "eclipse" : id === "a4l5" ? "oracle" : id === "a4l6" ? "reversal" : "executioner");
      put(tc, {
        x: -4.0,
        y: 0.9 + (1 - inP) * 4,
        z: 0.7,
        rz: rad(lerp(-30, SKEW, inP)),
        ry: rad(lerp(-35, 0, inP)),
        s: 0.92 * outP,
        visible: inP > 0.02 && outP > 0.02,
      });
      faceUp(tc, true);

      d.name.textContent = name;
      d.name.style.left = "120px";
      d.name.style.top = "700px";
      d.name.style.opacity = String(inP * outP);
      d.name.style.transform = `skewX(${SKEW}deg) translateX(${(1 - inP) * -120}px)`;
      d.sub.textContent = sub;
      d.sub.style.left = "128px";
      d.sub.style.top = "900px";
      d.sub.style.opacity = String(spanE(t, w.s, w.s + 0.4, "outCubic") * outP);
      d.sub.style.transform = `skewX(${SKEW}deg)`;

      fn.call(this, world, t, w, d, inP, outP);
    }
  },

  // ---- VOID ----
  beatVoid(world, t, w, d, inP, outP) {
    const { cards, impacts } = world;
    const a = cards.get("demon");
    const b = cards.get("seraph");
    const clash = spanE(t, w.s + 0.3, w.s + 1.1, "outQuint");
    const die = spanE(t, w.s + 1.7, w.s + 2.3, "inQuad");
    put(a, { x: lerp(6.5, 2.6, clash), y: 0.2, z: 0, rz: rad(-6), s: 0.8 * (1 - die), visible: clash > 0.02 && die < 1 });
    faceUp(a, true);
    put(b, { x: lerp(8.5, 4.4, clash), y: 0.2, z: -0.3, rz: rad(6), s: 0.8 * (1 - die), visible: clash > 0.02 && die < 1 });
    faceUp(b, true);
    const flash = track([{ t: w.s + 1.6, v: 0 }, { t: w.s + 1.8, v: 1, e: "outExpo" }, { t: w.s + 2.6, v: 0 }], t);
    const f = impacts[4];
    f.material.color.set(0x000000);
    put(f, { x: 3.4, y: 0.2, z: 0.4, s: 1.2 + flash * 2.2, visible: flash > 0.01 });
    f.material.opacity = flash;
    d.big.textContent = "NOTHING SURVIVES";
    d.big.style.left = "560px";
    d.big.style.top = "180px";
    const bp = spanE(t, w.s + 1.9, w.s + 2.4, "outBack") * outP;
    d.big.style.opacity = String(bp);
    d.big.style.transform = `skewX(${SKEW}deg) scale(${lerp(1.8, 1, bp)})`;
  },

  // ---- WARD ----
  beatWard(world, t, w, d, inP, outP) {
    const { cards, impacts } = world;
    const incoming = cards.get("executioner");
    const fly = spanE(t, w.s + 0.4, w.s + 1.3, "inQuad");
    const blocked = spanE(t, w.s + 1.3, w.s + 1.6, "outExpo");
    put(incoming, {
      x: lerp(8.5, 3.2, fly) + blocked * 1.5,
      y: 0.2,
      z: 0.2,
      rz: rad(lerp(20, 60, blocked)),
      s: 0.8 * (1 - blocked),
      visible: fly > 0.02 && blocked < 1,
    });
    faceUp(incoming, true);
    const bar = track([{ t: w.s + 1.25, v: 0 }, { t: w.s + 1.4, v: 1, e: "outExpo" }, { t: w.s + 2.4, v: 0.3 }], t);
    const f = impacts[4];
    f.material.color.set(C.yellow);
    put(f, { x: 2.4, y: 0.2, z: 0.6, s: 0.6 + bar * 0.5, visible: bar > 0.01 });
    f.material.opacity = bar * 0.9;
    d.big.textContent = "+5";
    d.big.style.left = "700px";
    d.big.style.top = "200px";
    const bp = spanE(t, w.s + 1.5, w.s + 1.9, "outBack") * outP;
    d.big.style.opacity = String(bp);
    d.big.style.transform = `skewX(${SKEW}deg) scale(${lerp(2.4, 1, bp)})`;
  },

  // ---- ECHO ----
  beatEcho(world, t, w, d, inP, outP) {
    const { cards, impacts } = world;
    const a = cards.get("leviathan");
    const b = cards.get("valkyrie");
    const clash = spanE(t, w.s + 0.3, w.s + 1.0, "outQuint");
    put(a, { x: lerp(6.5, 2.7, clash), y: 0.2, z: 0, rz: rad(-6), s: 0.8, visible: clash > 0.02 });
    faceUp(a, true);
    put(b, { x: lerp(8.5, 4.5, clash), y: 0.2, z: -0.3, rz: rad(6), s: 0.8, visible: clash > 0.02 });
    faceUp(b, true);
    d.big.textContent = "0 NOW";
    d.big.style.left = "620px";
    d.big.style.top = "170px";
    const zp = spanE(t, w.s + 1.1, w.s + 1.5, "outBack") * (1 - spanE(t, w.s + 2.2, w.s + 2.6, "inQuad"));
    d.big.style.opacity = String(zp);
    d.big.style.transform = `skewX(${SKEW}deg) scale(${lerp(2, 1, zp)})`;
    const xp = spanE(t, w.s + 2.3, w.s + 2.8, "outBack") * outP;
    d.x2.style.left = "640px";
    d.x2.style.top = "300px";
    d.x2.style.opacity = String(xp);
    d.x2.style.transform = `skewX(${SKEW}deg) scale(${lerp(2.2, 1, xp)})`;
  },

  // ---- ECLIPSE ----
  beatEclipse(world, t, w, d, inP, outP) {
    const dark = spanE(t, w.s + 0.5, w.s + 1.4, "inOutCubic");
    world.bg.style.opacity = String(0.7 * (1 - dark * 0.92));
    d.big.textContent = "SHIELDS OFF · 2 ROUNDS";
    d.big.style.left = "520px";
    d.big.style.top = "200px";
    const bp = spanE(t, w.s + 1.3, w.s + 1.9, "outBack") * outP;
    d.big.style.opacity = String(bp);
    d.big.style.transform = `skewX(${SKEW}deg) scale(${lerp(1.8, 1, bp)})`;
    // two shield chips crack apart
    const crack = spanE(t, w.s + 1.5, w.s + 2.2, "inQuad");
    const { impacts } = world;
    const f = impacts[5];
    f.material.color.set(C.yellow);
    const fp = track([{ t: w.s + 1.4, v: 0 }, { t: w.s + 1.6, v: 0.8, e: "outExpo" }, { t: w.s + 2.4, v: 0 }], t);
    put(f, { x: 3.4, y: 0.2, z: 0.5, s: 0.7 + fp * 0.6 + crack, visible: fp > 0.01 });
    f.material.opacity = fp * (1 - crack);
  },

  // ---- ORACLE ----
  beatOracle(world, t, w, d, inP, outP) {
    const { cards } = world;
    const eyeP = spanE(t, w.s + 0.4, w.s + 1.2, "outCubic") * outP;
    d.eye.style.left = "600px";
    d.eye.style.top = "150px";
    d.eye.style.opacity = String(eyeP);
    d.eye.style.transform = `scaleY(${lerp(0.05, 1, eyeP)})`;
    const flip = spanE(t, w.s + 1.3, w.s + 2.0, "inOutCubic");
    const a = cards.get("demon");
    const b = cards.get("witch");
    put(a, { x: 2.8, y: 0.2, z: 0, rz: rad(-6), s: 0.8, visible: true });
    a.rotation.y = lerp(Math.PI, 0, flip);
    put(b, { x: 4.6, y: 0.2, z: -0.3, rz: rad(6), s: 0.8, visible: true });
    b.rotation.y = lerp(Math.PI, 0, flip);
  },

  // ---- REVERSAL ----
  beatReversal(world, t, w, d, inP, outP) {
    const swap = spanE(t, w.s + 1.4, w.s + 2.2, "inOutCubic");
    const show = spanE(t, w.s + 0.3, w.s + 0.8, "outCubic") * outP;
    const topY = 200;
    const botY = 320;
    // bar A starts top, bar B bottom; they swap vertically
    const aY = lerp(topY, botY, swap);
    const bY = lerp(botY, topY, swap);
    const aVal = Math.round(lerp(14, 6, swap));
    const bVal = Math.round(lerp(6, 14, swap));
    d.barA.style.opacity = String(show);
    d.barA.style.top = `${aY}px`;
    d.barA.style.left = "560px";
    d.barA.style.width = "640px";
    d.barAf.style.opacity = String(show);
    d.barAf.style.top = `${aY}px`;
    d.barAf.style.left = "560px";
    d.barAf.style.width = `${(aVal / 20) * 640}px`;
    d.barAv.style.opacity = String(show);
    d.barAv.style.top = `${aY - 4}px`;
    d.barAv.style.left = "1220px";
    d.barAv.textContent = String(aVal);
    d.barB.style.opacity = String(show);
    d.barB.style.top = `${bY}px`;
    d.barB.style.left = "560px";
    d.barB.style.width = "640px";
    d.barBf.style.opacity = String(show);
    d.barBf.style.top = `${bY}px`;
    d.barBf.style.left = "560px";
    d.barBf.style.width = `${(bVal / 20) * 640}px`;
    d.barBv.style.opacity = String(show);
    d.barBv.style.top = `${bY - 4}px`;
    d.barBv.style.left = "1220px";
    d.barBv.textContent = String(bVal);
  },

  // ---- EXECUTIONER ----
  beatExecutioner(world, t, w, d, inP, outP) {
    const drop = spanE(t, w.s + 1.2, w.s + 1.6, "inQuart");
    const show = spanE(t, w.s + 0.3, w.s + 0.8, "outCubic") * outP;
    d.blade.style.opacity = String(drop > 0 && drop < 1 ? 1 : drop >= 1 ? 1 : 0);
    d.blade.style.left = "860px";
    d.blade.style.top = `${lerp(-500, 240, drop)}px`;
    const drain = spanE(t, w.s + 1.6, w.s + 2.6, "inOutCubic");
    const val = Math.round(lerp(18, 0, drain));
    d.barA.style.opacity = String(show);
    d.barA.style.top = "420px";
    d.barA.style.left = "560px";
    d.barA.style.width = "640px";
    d.barAf.style.opacity = String(show);
    d.barAf.style.top = "420px";
    d.barAf.style.left = "560px";
    d.barAf.style.width = `${(val / 20) * 640}px`;
    d.barAv.style.opacity = String(show);
    d.barAv.style.top = "416px";
    d.barAv.style.left = "1220px";
    d.barAv.textContent = String(val);
    const sp = spanE(t, w.s + 2.4, w.s + 2.9, "outBack") * outP;
    d.stamp.style.left = "700px";
    d.stamp.style.top = "250px";
    d.stamp.style.opacity = String(sp);
    d.stamp.style.transform = `rotate(-8deg) scale(${lerp(2.4, 1, sp)})`;
  },
};

// =====================================================================
// ACT V — PRIORITY & MULTIPLIERS
// =====================================================================

const act5 = {
  id: 5,
  init(world) {
    const root = world.actDom.get(5);
    this.dom = {
      kick: txt(root, "ov kick", "PRIORITY · ORDER IS LAW"),
      chain: ["Void", "Eclipse", "Ward", "Echo", "Reversal", "Executioner", "Oracle"].map((n, i) =>
        txt(root, "ov chain", `<span class="ci">${i + 1}</span>${n.toUpperCase()}`),
      ),
      mult: txt(root, "ov mult", "R7 ×2 · ECHO +1 · CAP ×3"),
      big: txt(root, "ov bigword", "×3 MAX"),
    };
  },
  render(world, t, lines) {
    const { bg } = world;
    const d = this.dom;
    const L1 = lines[0];
    const L3 = lines[2];

    world.stage.camera.position.set(0, 0, track([{ t: 0, v: 12, e: "outQuint" }, { t: 4, v: 10.4 }], t));
    world.stage.camera.lookAt(0, 0, 0);
    bg.style.opacity = String(spanE(t, 0, 1.2, "outCubic") * 0.7);
    renderShards(world.shards, t, { spin: 0.25 });

    d.kick.style.left = "120px";
    d.kick.style.top = "70px";
    d.kick.style.opacity = String(spanE(t, 0.1, 0.6, "outCubic"));
    d.kick.style.transform = `skewX(${SKEW}deg)`;

    // priority chain as a descending stack of skewed plates
    for (let i = 0; i < d.chain.length; i++) {
      const p = spanE(t, L1.start + 0.4 + i * 0.55, L1.start + 0.4 + i * 0.55 + 0.4, "outBack");
      const node = d.chain[i];
      node.style.left = `${220 + i * 46}px`;
      node.style.top = `${250 + i * 92}px`;
      node.style.opacity = String(p);
      node.style.transform = `skewX(${SKEW}deg) translateX(${(1 - p) * -160}px)`;
    }

    // (A 3D card totem was tried here and cut: the DOM staircase already states
    // priority cleanly, and a second stack only crowded the frame.)

    // line 2: ward block reminder — small flash on the Ward plate
    const wp = win2(lines, "a5l2");
    const flash = track([{ t: wp.s + 0.6, v: 0 }, { t: wp.s + 0.8, v: 0.9, e: "outExpo" }, { t: wp.s + 1.6, v: 0 }], t);
    const wardNode = d.chain[2];
    wardNode.style.filter = flash > 0.01 ? `brightness(${1 + flash * 1.4})` : "none";

    // line 3: multipliers
    const mp = spanE(t, L3.start + 0.5, L3.start + 1.1, "outQuint");
    d.mult.style.left = "120px";
    d.mult.style.top = "940px";
    d.mult.style.opacity = String(mp);
    d.mult.style.transform = `skewX(${SKEW}deg)`;
    const bp = spanE(t, L3.start + 1.6, L3.start + 2.2, "outBack");
    d.big.style.left = "1240px";
    d.big.style.top = "430px";
    d.big.style.opacity = String(bp);
    d.big.style.transform = `skewX(${SKEW}deg) scale(${lerp(2.2, 1, bp)})`;
  },
};

function win2(lines, id) {
  const l = lines.find((x) => x.id === id);
  return l ? { s: l.start, e: l.end } : { s: 0, e: 0 };
}

// =====================================================================
// ACT VI — STINGER
// =====================================================================

const act6 = {
  id: 6,
  init(world) {
    const root = world.actDom.get(6);
    this.dom = {
      line: txt(root, "ov stinger", "YOU CANNOT OUT-POWER THEM."),
      line2: txt(root, "ov stinger", "YOU CAN ONLY OUT-THINK THEM."),
      title: txt(root, "ov title", "PACIFY"),
      tag: txt(root, "ov kick", "LEARN THE LIE"),
      rule: el(root, "div", "ov slash"),
    };
  },
  render(world, t, lines) {
    const { cards, bg } = world;
    const d = this.dom;
    const L1 = lines[0];
    const L2 = lines[1];

    // slow orbit around a rotating monolith of all 19 cards
    const orbit = t * 0.22;
    world.stage.camera.position.set(Math.sin(orbit) * 2.2, Math.cos(t * 0.3) * 0.5, track([{ t: 0, v: 13, e: "outQuint" }, { t: 4, v: 10.8 }], t));
    world.stage.camera.lookAt(0, 0, 0);
    bg.style.opacity = String(spanE(t, 0, 1.5, "outCubic"));
    renderShards(world.shards, t, { spin: 0.5 });

    const ids = world.data.catalogue.map((c) => c.id);
    const assemble = spanE(t, 0.2, 2.2, "outQuint");
    for (let i = 0; i < ids.length; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const tx = (col - 2) * 1.5;
      const ty = 2.6 - row * 1.75;
      const m = cards.get(ids[i]);
      const spin = t * 0.35 + i * 0.13;
      put(m, {
        x: lerp((i - 9) * 1.6, tx, assemble) + Math.sin(spin) * 0.12,
        y: lerp(8 - i * 0.4, ty, assemble) + Math.cos(spin) * 0.1,
        z: -1.2 + Math.sin(spin * 0.7) * 0.5,
        ry: lerp(2.4, Math.sin(spin) * 0.35, assemble),
        rz: rad(SKEW * 0.4),
        s: 0.5,
        visible: true,
      });
      faceUp(m, true);
    }

    const l1p = spanE(t, L1.start, L1.start + 0.6, "outCubic") * (1 - spanE(t, L1.end + 0.4, L1.end + 0.9, "inQuad"));
    d.line.style.left = "120px";
    d.line.style.top = "880px";
    d.line.style.opacity = String(l1p);
    d.line.style.transform = `skewX(${SKEW}deg) translateX(${(1 - spanE(t, L1.start, L1.start + 0.6, "outCubic")) * -100}px)`;
    const l2p = spanE(t, L1.start + 2.2, L1.start + 2.8, "outCubic") * (1 - spanE(t, L1.end + 0.4, L1.end + 0.9, "inQuad"));
    d.line2.style.left = "120px";
    d.line2.style.top = "940px";
    d.line2.style.opacity = String(l2p);
    d.line2.style.transform = `skewX(${SKEW}deg) translateX(${(1 - spanE(t, L1.start + 2.2, L1.start + 2.8, "outCubic")) * -100}px)`;

    const tp = spanE(t, L2.start + 0.2, L2.start + 0.9, "outQuint");
    d.title.style.left = "120px";
    d.title.style.top = "330px";
    d.title.style.opacity = String(tp);
    d.title.style.transform = `skewX(${SKEW}deg) translateX(${(1 - tp) * 240}px) scale(${lerp(1.7, 1, tp)})`;
    d.tag.style.left = "132px";
    d.tag.style.top = "272px";
    d.tag.style.opacity = String(spanE(t, L2.start + 0.7, L2.start + 1.2, "outCubic"));
    d.tag.style.transform = `skewX(${SKEW}deg)`;
    const rp = spanE(t, L2.start + 0.5, L2.start + 1.1, "outExpo");
    d.rule.style.top = "580px";
    d.rule.style.width = `${rp * 900}px`;
    d.rule.style.opacity = String(rp > 0 ? 1 : 0);
  },
};

export const ACTS_B = [act4, act5, act6];
