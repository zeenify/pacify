/* Acts I–III. Each act is { id, init(world), render(world, local, lines) }.
   render() must fully specify the frame: resetFrame() has already hidden every
   pooled card, every impact flash, and every act's DOM container. */

import { C, SKEW, CARD_WORLD_W } from "./brand.mjs";
import { ease, track, spanE, span, rad, lerp } from "./tween.mjs";
import { el, renderShards } from "./stage.mjs";

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

/** Skewed hard-shadow headline, positioned + revealed by a 0..1 progress. */
function revealHeadline(node, p, { dx = 160, scale = 1.4 } = {}) {
  node.style.opacity = String(p);
  node.style.transform = `skewX(${SKEW}deg) translateX(${(1 - p) * dx}px) scale(${lerp(scale, 1, p)})`;
}

// =====================================================================
// ACT I — COLD OPEN
// =====================================================================

const act1 = {
  id: 1,
  init(world) {
    const root = world.actDom.get(1);
    this.dom = {
      n19: txt(root, "ov num", "19"),
      w19: txt(root, "ov numlbl", "CARDS"),
      n7: txt(root, "ov num", "7"),
      w7: txt(root, "ov numlbl", "ROUNDS"),
      n1: txt(root, "ov num", "1"),
      w1: txt(root, "ov numlbl", "LIAR SURVIVES"),
      title: txt(root, "ov title", "PACIFY"),
      kick: txt(root, "ov kick", "LEARN THE LIE"),
      slash: el(root, "div", "ov slash"),
    };
  },
  render(world, t, lines) {
    const { cards, impacts, shards, bg } = world;
    const L1 = lines[0];
    const L2 = lines[1];
    const d = this.dom;

    world.stage.camera.position.set(0, 0, track([{ t: 0, v: 14, e: "outQuint" }, { t: 6, v: 10.2 }], t));
    world.stage.camera.lookAt(0, 0, 0);

    bg.style.opacity = String(spanE(t, 0.1, 1.6, "outCubic") * 0.9);
    renderShards(world.shards, t, { spin: 0.35 });

    // The lone card: spins in face-down, flips to ANGEL on the title beat.
    const hero = cards.get("angel");
    const inP = spanE(t, 0.15, 1.1, "outQuint");
    const flip = spanE(t, L2.start + 0.15, L2.start + 0.85, "inOutCubic");
    put(hero, {
      x: track([{ t: 0, v: 5.8, e: "outQuint" }, { t: 1.2, v: 5.0 }, { t: L2.start, v: 4.7 }, { t: L2.start + 1, v: 4.4 }], t),
      y: track([{ t: 0, v: 6.5, e: "outQuint" }, { t: 1.1, v: 0.2 }, { t: L2.start, v: 0.2 }, { t: L2.start + 1, v: 0.5 }], t),
      z: track([{ t: 0, v: 3, e: "outCubic" }, { t: 1.1, v: 0.4 }], t),
      ry: lerp(t * 2.2, 0, flip) + (1 - inP) * 3,
      rz: rad(SKEW) * spanE(t, 0.6, 1.4, "outBack"),
      s: 1.15,
      visible: t > 0.12,
    });
    faceUp(hero, flip > 0.5);

    // impact flash on the flip
    const flash = impacts[0];
    const fp = track([{ t: L2.start + 0.1, v: 0 }, { t: L2.start + 0.3, v: 0.9, e: "outExpo" }, { t: L2.start + 0.9, v: 0 }], t);
    put(flash, { x: hero.position.x, y: hero.position.y, z: hero.position.z - 0.5, s: 0.8 + fp * 0.6, visible: fp > 0.01 });
    flash.material.opacity = fp;

    // Three counters slam in across line 1, then clear for the title.
    const counters = [
      { n: d.n19, w: d.w19, at: L1.start + 0.1, x: 200 },
      { n: d.n7, w: d.w7, at: L1.start + 1.4, x: 600 },
      { n: d.n1, w: d.w1, at: L1.start + 2.6, x: 1000 },
    ];
    const clearAt = L2.start - 0.25;
    for (const c of counters) {
      const p = spanE(t, c.at, c.at + 0.4, "outBack");
      const out = 1 - spanE(t, clearAt, clearAt + 0.3, "inQuad");
      const v = p * out;
      c.n.style.left = `${c.x}px`;
      c.n.style.top = "330px";
      c.n.style.opacity = String(v);
      c.n.style.transform = `skewX(${SKEW}deg) scale(${lerp(2.2, 1, p)})`;
      c.w.style.left = `${c.x + 8}px`;
      c.w.style.top = "560px";
      c.w.style.opacity = String(spanE(t, c.at + 0.15, c.at + 0.5, "outCubic") * out);
      c.w.style.transform = `skewX(${SKEW}deg)`;
    }

    // Title + kicker + slash on line 2.
    const tp = spanE(t, L2.start + 0.3, L2.start + 0.85, "outQuint");
    d.title.style.left = "120px";
    d.title.style.top = "380px";
    revealHeadline(d.title, tp, { dx: 220, scale: 1.6 });
    d.kick.style.left = "132px";
    d.kick.style.top = "322px";
    d.kick.style.opacity = String(spanE(t, L2.start + 0.7, L2.start + 1.1, "outCubic"));
    d.kick.style.transform = `skewX(${SKEW}deg)`;

    const sp = spanE(t, L2.start + 0.05, L2.start + 0.5, "outExpo");
    d.slash.style.top = "620px";
    d.slash.style.width = `${sp * 1100}px`;
    d.slash.style.opacity = String(sp > 0 ? 1 : 0);
  },
};

// =====================================================================
// ACT II — SHAPE OF A DUEL
// =====================================================================

const act2 = {
  id: 2,
  init(world) {
    const root = world.actDom.get(2);
    this.dom = {
      kick: txt(root, "ov kick", "THE SHAPE OF A DUEL"),
      hidden: txt(root, "ov tag", "FACES HIDDEN"),
      sim: txt(root, "ov tag sim", "SIMULTANEOUS COMMIT"),
      round: txt(root, "ov round", "ROUND 1"),
      goal: txt(root, "ov goal", "FIRST TO 20"),
      sub: txt(root, "ov sub", "7 ROUNDS · 7 CARDS EACH · HIGHEST TOTAL IF NOBODY BREAKS 20"),
      barL: el(root, "div", "ov bar left"),
      barR: el(root, "div", "ov bar right"),
      barLf: el(root, "div", "ov barfill left"),
      barRf: el(root, "div", "ov barfill right"),
      lblL: txt(root, "ov barlbl left", "YOU"),
      lblR: txt(root, "ov barlbl right", "THEM"),
    };
    this.dom.barL.appendChild(document.createTextNode(""));
  },
  render(world, t, lines) {
    const { cards, impacts, bg } = world;
    const d = this.dom;
    const L1 = lines[0];
    const L2 = lines[1];
    const L3 = lines[2];

    world.stage.camera.position.set(0, 0, track([{ t: 0, v: 12.5, e: "outQuint" }, { t: 4, v: 10.5 }], t));
    world.stage.camera.lookAt(0, 0, 0);
    bg.style.opacity = String(spanE(t, 0, 1.2, "outCubic") * 0.75);
    renderShards(world.shards, t, { spin: 0.3 });

    d.kick.style.left = "120px";
    d.kick.style.top = "70px";
    d.kick.style.opacity = String(spanE(t, 0.1, 0.6, "outCubic"));
    d.kick.style.transform = `skewX(${SKEW}deg)`;

    // Two fanned hands of face-down cards.
    const handIds = ["bandit", "paladin", "ogre", "knight", "witch", "wizard", "vampire"];
    const fanIn = spanE(t, 0.2, 1.3, "outQuint");
    for (let i = 0; i < 7; i++) {
      const k = (i - 3) / 3; // -1..1
      const lift = spanE(t, L2.start + 0.1, L2.start + 0.7, "outQuint");
      const isCommitter = i === 3;
      const m = cards.get(handIds[i]);
      const lx = -4.7 + k * 0.95;
      const rx = 4.7 - k * 0.95;
      const ly = -1.1 + Math.abs(k) * 0.5;
      // committers fly to centre on line 2
      const cx = lerp(lx, -1.5, isCommitter ? lift : 0);
      const cy = lerp(ly, 0.4, isCommitter ? lift : 0);
      const ox = lerp(rx, 1.5, isCommitter ? lift : 0);
      const oy = lerp(ly, 0.4, isCommitter ? lift : 0);
      const left = cards.get(handIds[i]);
      put(left, {
        x: cx,
        y: cy + (1 - fanIn) * 4,
        z: -0.4 + Math.abs(k) * -0.2 + (isCommitter ? lift * 0.9 : 0),
        rz: rad(k * 9),
        ry: 0,
        s: 0.72,
        visible: fanIn > 0.02,
      });
      faceUp(left, false);
      const right = cards.get(["leviathan", "seraph", "ward", "demon", "void", "angel", "echo"][i]);
      put(right, {
        x: ox,
        y: oy + (1 - fanIn) * 4,
        z: -0.4 + Math.abs(k) * -0.2 + (isCommitter ? lift * 0.9 : 0),
        rz: rad(-k * 9),
        ry: 0,
        s: 0.72,
        visible: fanIn > 0.02,
      });
      faceUp(right, false);
    }

    // On line 2 the two committers flip face-up together + flash.
    const flip = spanE(t, L2.start + 0.7, L2.start + 1.2, "inOutCubic");
    if (flip > 0) {
      faceUp(cards.get("knight"), flip > 0.5);
      cards.get("knight").rotation.y = lerp(Math.PI, 0, flip);
      faceUp(cards.get("demon"), flip > 0.5);
      cards.get("demon").rotation.y = lerp(Math.PI, 0, flip);
    }
    const fp = track([{ t: L2.start + 0.75, v: 0 }, { t: L2.start + 0.95, v: 0.85, e: "outExpo" }, { t: L2.start + 1.5, v: 0 }], t);
    const fl = impacts[1];
    put(fl, { x: 0, y: 0.4, z: -0.9, s: 0.9 + fp * 0.7, visible: fp > 0.01 });
    fl.material.opacity = fp;

    d.hidden.style.left = "760px";
    d.hidden.style.top = "150px";
    const hp = spanE(t, 0.9, 1.4, "outCubic") * (1 - spanE(t, L2.start, L2.start + 0.4, "inQuad"));
    d.hidden.style.opacity = String(hp);
    d.hidden.style.transform = `skewX(${SKEW}deg)`;

    d.sim.style.left = "640px";
    d.sim.style.top = "150px";
    const sp2 = spanE(t, L2.start + 0.7, L2.start + 1.1, "outBack") * (1 - spanE(t, L3.start - 0.2, L3.start + 0.2, "inQuad"));
    d.sim.style.opacity = String(sp2);
    d.sim.style.transform = `skewX(${SKEW}deg) scale(${lerp(1.5, 1, spanE(t, L2.start + 0.7, L2.start + 1.1, "outBack"))})`;

    // Line 3: round counter ticks 1..7 and the goal lands.
    const tick = Math.min(7, 1 + Math.floor(spanE(t, L3.start + 0.2, L3.start + 2.4, "linear") * 7));
    d.round.textContent = `ROUND ${tick}`;
    d.round.style.left = "1560px";
    d.round.style.top = "80px";
    d.round.style.opacity = String(spanE(t, L3.start, L3.start + 0.4, "outCubic"));
    d.round.style.transform = `skewX(${SKEW}deg)`;

    const gp = spanE(t, L3.start + 0.6, L3.start + 1.2, "outQuint");
    d.goal.style.left = "120px";
    d.goal.style.top = "830px";
    revealHeadline(d.goal, gp, { dx: 180, scale: 1.5 });
    d.sub.style.left = "128px";
    d.sub.style.top = "960px";
    d.sub.style.opacity = String(spanE(t, L3.start + 1.1, L3.start + 1.6, "outCubic"));
    d.sub.style.transform = `skewX(${SKEW}deg)`;

    // score bars appear
    const bp = spanE(t, L3.start + 0.4, L3.start + 1.0, "outCubic");
    for (const [bar, fill, lbl, side] of [
      [d.barL, d.barLf, d.lblL, "left"],
      [d.barR, d.barRf, d.lblR, "right"],
    ]) {
      bar.style.opacity = String(bp);
      bar.style.width = `${bp * 560}px`;
      bar.style.top = "760px";
      bar.style[side] = "120px";
      fill.style.opacity = String(bp);
      fill.style.width = "0px";
      fill.style.top = "760px";
      fill.style[side] = "120px";
      lbl.style.opacity = String(bp);
      lbl.style.top = "716px";
      lbl.style[side] = "120px";
      lbl.style.transform = `skewX(${SKEW}deg)`;
    }
  },
};

// =====================================================================
// ACT III — THE CLASH
// =====================================================================

const act3 = {
  id: 3,
  init(world) {
    const root = world.actDom.get(3);
    this.dom = {
      kick: txt(root, "ov kick", "NUMBER CARDS · THE CLASH"),
      good: txt(root, "ov aligntag good", "GOOD"),
      bad: txt(root, "ov aligntag bad", "BAD"),
      math: txt(root, "ov math", "12 − 3 = 9"),
      diff: txt(root, "ov diff", "+9"),
      shield: txt(root, "ov shieldtag", "SHIELD"),
      zero: txt(root, "ov zero", "0"),
      note: txt(root, "ov sub", "OPPOSITE ALIGNMENT SCORES THE DIFFERENCE · SAME ALIGNMENT SCORES NOTHING"),
    };
  },
  render(world, t, lines) {
    const { cards, impacts, bg } = world;
    const d = this.dom;
    const L1 = lines[0];
    const L2 = lines[1];
    const L3 = lines[2];
    const L4 = lines[3];

    world.stage.camera.position.set(0, 0, track([{ t: 0, v: 13, e: "outQuint" }, { t: 3, v: 11 }], t));
    world.stage.camera.lookAt(0, 0, 0);
    bg.style.opacity = String(spanE(t, 0, 1.2, "outCubic") * 0.7);
    renderShards(world.shards, t, { spin: 0.25 });

    d.kick.style.left = "120px";
    d.kick.style.top = "70px";
    d.kick.style.opacity = String(spanE(t, 0.1, 0.6, "outCubic"));
    d.kick.style.transform = `skewX(${SKEW}deg)`;

    const ladderOut = 1 - spanE(t, L3.start - 0.3, L3.start + 0.3, "inQuad");

    // The ladder: bad ascending left, good ascending right.
    const bads = ["bandit", "ogre", "witch", "vampire", "leviathan", "demon"];
    const goods = ["paladin", "knight", "wizard", "valkyrie", "seraph", "angel"];
    const buildP = spanE(t, L1.start, L1.start + 2.6, "outQuint");
    for (let i = 0; i < 6; i++) {
      const p = spanE(t, L1.start + i * 0.32, L1.start + i * 0.32 + 0.5, "outBack");
      const y = 2.6 - i * 1.05;
      const bx = cards.get(bads[i]);
      put(bx, {
        x: -4.4,
        y: y + (1 - p) * -3,
        z: -0.6,
        rz: rad(4),
        s: 0.5 * p,
        visible: p > 0.02 && ladderOut > 0,
      });
      faceUp(bx, true);
      const gd = cards.get(goods[i]);
      put(gd, {
        x: 4.4,
        y: y + (1 - p) * -3,
        z: -0.6,
        rz: rad(-4),
        s: 0.5 * p,
        visible: p > 0.02 && ladderOut > 0,
      });
      faceUp(gd, true);
    }

    // alignment labels on line 2
    const ap = spanE(t, L2.start + 0.3, L2.start + 0.8, "outCubic") * ladderOut;
    d.bad.style.left = "620px";
    d.bad.style.top = "120px";
    d.bad.style.opacity = String(ap);
    d.bad.style.transform = `skewX(${SKEW}deg)`;
    d.good.style.left = "1180px";
    d.good.style.top = "120px";
    d.good.style.opacity = String(ap);
    d.good.style.transform = `skewX(${SKEW}deg)`;

    // Line 3: Angel 12 vs Ogre 3 — the difference.
    const clashIn = spanE(t, L3.start + 0.4, L3.start + 1.3, "outQuint");
    const angel = cards.get("angel");
    const ogre = cards.get("ogre");
    put(angel, {
      x: lerp(-7.5, -1.7, clashIn),
      y: 0.2,
      z: 0.6,
      rz: rad(lerp(-24, SKEW, clashIn)),
      ry: rad(lerp(-30, 0, clashIn)),
      s: 0.95,
      visible: t > L3.start,
    });
    faceUp(angel, true);
    put(ogre, {
      x: lerp(7.5, 1.7, clashIn),
      y: 0.2,
      z: 0.6,
      rz: rad(lerp(24, -SKEW, clashIn)),
      ry: rad(lerp(30, 0, clashIn)),
      s: 0.95,
      visible: t > L3.start,
    });
    faceUp(ogre, true);

    const hit = track([{ t: L3.start + 1.3, v: 0 }, { t: L3.start + 1.5, v: 0.9, e: "outExpo" }, { t: L3.start + 2.1, v: 0 }], t);
    const fh = impacts[2];
    put(fh, { x: 0, y: 0.2, z: 0.1, s: 0.8 + hit * 0.7, visible: hit > 0.01 });
    fh.material.opacity = hit;

    const mp = spanE(t, L3.start + 1.6, L3.start + 2.1, "outBack");
    d.math.style.left = "700px";
    d.math.style.top = "120px";
    d.math.style.opacity = String(mp * (1 - spanE(t, L4.start - 0.2, L4.start + 0.2, "inQuad")));
    d.math.style.transform = `skewX(${SKEW}deg) scale(${lerp(1.6, 1, mp)})`;
    const dp = spanE(t, L3.start + 1.8, L3.start + 2.3, "outBack");
    d.diff.style.left = "880px";
    d.diff.style.top = "760px";
    d.diff.style.opacity = String(dp * (1 - spanE(t, L4.start - 0.2, L4.start + 0.2, "inQuad")));
    d.diff.style.transform = `skewX(${SKEW}deg) scale(${lerp(2.4, 1, dp)})`;

    // Line 4: the shield — same alignment collides and scores nothing.
    const shieldIn = spanE(t, L4.start + 0.6, L4.start + 1.5, "outQuint");
    const valk = cards.get("valkyrie");
    const pal = cards.get("paladin");
    const showShield = t > L4.start;
    put(valk, {
      x: lerp(-7.5, -1.7, shieldIn),
      y: 0.2,
      z: 0.6,
      rz: rad(lerp(-24, SKEW, shieldIn)),
      s: 0.95,
      visible: showShield,
    });
    faceUp(valk, true);
    put(pal, {
      x: lerp(7.5, 1.7, shieldIn),
      y: 0.2,
      z: 0.6,
      rz: rad(lerp(24, -SKEW, shieldIn)),
      s: 0.95,
      visible: showShield,
    });
    faceUp(pal, true);

    // barrier flash between them
    const bar = track([{ t: L4.start + 1.5, v: 0 }, { t: L4.start + 1.7, v: 1, e: "outExpo" }, { t: L4.start + 2.6, v: 0.25 }], t);
    const fb = impacts[3];
    put(fb, { x: 0, y: 0.2, z: 0.9, s: 0.5 + bar * 0.35, visible: showShield && bar > 0.01 });
    fb.material.opacity = bar * 0.8;
    fb.material.color.set(C.yellow);

    const zp = spanE(t, L4.start + 1.9, L4.start + 2.4, "outBack");
    d.zero.style.left = "900px";
    d.zero.style.top = "700px";
    d.zero.style.opacity = String(zp);
    d.zero.style.transform = `skewX(${SKEW}deg) scale(${lerp(2.6, 1, zp)})`;
    d.shield.style.left = "820px";
    d.shield.style.top = "150px";
    d.shield.style.opacity = String(spanE(t, L4.start + 1.6, L4.start + 2.0, "outCubic"));
    d.shield.style.transform = `skewX(${SKEW}deg)`;

    d.note.style.left = "120px";
    d.note.style.top = "980px";
    d.note.style.opacity = String(spanE(t, L3.start + 1.0, L3.start + 1.6, "outCubic"));
    d.note.style.transform = `skewX(${SKEW}deg)`;
  },
};

export const ACTS_A = [act1, act2, act3];
