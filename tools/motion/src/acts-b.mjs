/* Acts IV–VI — v2. Same contract as acts-a: render() fully specifies the frame.

   Act IV doctrine: each trick gets a signature the BODY understands —
   Void is a hole things fall into, Ward is a light wall that shatters a card,
   Echo is a ghost copy standing deeper in Z, Eclipse is the key light itself
   being eclipsed (a real occluder sweeps its shadow across the felt), Oracle
   is a spotlight in the dark, Reversal is two score bars swapping THROUGH
   depth, Executioner is a blade that falls past the lens. */

import { C, SKEW } from "./brand.mjs";
import { track, spanE, span, rad, lerp, randRange, ease } from "./tween.mjs";
import { el, renderShards, aim, shake } from "./stage.mjs";

function put(mesh, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, visible = true } = {}) {
  mesh.visible = visible;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.setScalar(s);
  return mesh;
}
function txt(parent, cls, str) {
  return el(parent, "div", cls, str);
}
function win(lines, id) {
  const l = lines.find((x) => x.id === id);
  return l ? { s: l.start, e: l.end } : { s: 0, e: 0 };
}
function flash(impacts, i, x, y, z, opacity, scale = 1, color = C.crimson) {
  const p = impacts[i % impacts.length];
  p.visible = opacity > 0.01;
  p.position.set(x, y, z);
  p.scale.setScalar(scale);
  p.material.opacity = opacity;
  p.material.color.set(color);
  return p;
}
function ghostOpacity(g, o) {
  for (const m of g.material) m.opacity = o;
}
/** Deterministic debris burst driven by the shared shard pool. */
function debris(shards, t, t0, cx, cy, cz, n, seed0, speed = 1) {
  for (let i = 0; i < n; i++) {
    const s = shards[i];
    const dt = t - t0;
    const sd = seed0 + i * 7;
    if (dt < 0 || dt > 1.15) { s.visible = false; continue; }
    const vx = randRange(sd, -3.6, 3.6) * speed;
    const vy = randRange(sd + 1, 2.2, 5.4) * speed;
    const vz = randRange(sd + 2, -2.8, 2.2) * speed;
    s.visible = true;
    s.position.set(cx + vx * dt, cy + vy * dt - 4.9 * dt * dt, cz + vz * dt);
    s.rotation.x = dt * (3 + randRange(sd + 3, 0, 4));
    s.rotation.y = dt * (4 + randRange(sd + 4, 0, 5));
    s.scale.setScalar(Math.max(0.05, 1 - dt * 0.55));
  }
}
function revealCap(node, p, { dx = 190, scale = 1.5 } = {}) {
  node.style.opacity = String(p);
  node.style.transform = `skewX(${SKEW}deg) translateX(${(1 - p) * dx}px) scale(${lerp(scale, 1, p)})`;
}
function fadeUp(node, p, dy = 26) {
  node.style.opacity = String(p);
  node.style.transform = `translateY(${(1 - p) * dy}px)`;
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
      cap: txt(root, "ov cap", ""),
      capsub: txt(root, "ov capsub", ""),
      pop: txt(root, "ov pop", ""),
      popsub: txt(root, "ov popsub", ""),
      stamp: txt(root, "ov stamp", "EXECUTED"),
    };
    this.dom.stamp.style.left = "58%";
    this.dom.stamp.style.top = "36%";
  },
  render(world, t, lines) {
    const { cards, impacts, shards, bg, lights: L, camera, scene, extras } = world;
    const d = this.dom;
    const { table, barriers, voidSphere, voidRing, occluder, blade, bladeGuard, ghosts } = extras;
    table.visible = true;

    const L0 = win(lines, "a4l0");
    const L1 = win(lines, "a4l1");
    const L2 = win(lines, "a4l2");
    const L3 = win(lines, "a4l3");
    const L4 = win(lines, "a4l4");
    const L5 = win(lines, "a4l5");
    const L6 = win(lines, "a4l6");
    const L7 = win(lines, "a4l7");

    const trickIds = ["void", "oracle", "reversal", "ward", "echo", "executioner", "eclipse"];

    // ---- the chorus: seven tricks hover at the back, dimmed, all act long ----
    const chorusIn = spanE(t, 0.3, 1.6, "outQuint");
    for (let i = 0; i < 7; i++) {
      const k = (i - 3) / 3;
      put(cards.get(trickIds[i]), {
        x: k * 6.4,
        y: 1.9 + Math.abs(k) * 0.5 + Math.sin(t * 0.8 + i) * 0.1,
        z: -4.6 - Math.abs(k) * 0.6,
        ry: -k * rad(10),
        rz: rad(k * 5),
        s: 0.62 * chorusIn,
      });
    }

    // ---- props: four face-down number cards on the felt (Void's victims) ----
    const props = [
      { id: "bandit", x: -2.4, z: 0.6 },
      { id: "witch", x: -0.8, z: 0.15 },
      { id: "vampire", x: 0.9, z: 0.5 },
      { id: "demon", x: 2.5, z: 0.05 },
    ];
    const propsIn = spanE(t, 0.9, 2.0, "outQuint");

    d.cap.textContent = "";
    d.capsub.textContent = "";
    d.pop.textContent = "";
    d.popsub.textContent = "";
    d.stamp.style.opacity = "0";
    for (const b of barriers) b.material.opacity = 0;
    ghostOpacity(ghosts[0], 0);
    ghostOpacity(ghosts[1], 0);
    ghostOpacity(ghosts[2], 0);
    occluder.visible = false;
    blade.visible = false;
    bladeGuard.visible = false;
    voidSphere.visible = false;
    voidRing.visible = false;

    let done = false;

    if (t < L1.s) {
      // ---- L0 intro: the fan presents itself in low light ----
      L.amb.intensity = 0.32;
      L.key.intensity = 0.5;
      L.rim.intensity = 2.4;
      L.fill.intensity = 3;
      scene.fog.near = 10;
      scene.fog.far = 34;
      bg.style.opacity = "0.3";
      renderShards(shards, t, { visible: false });

      const k = spanE(t, 0, L0.e, "outCubic");
      aim(camera, 0, lerp(-0.5, 0.15, k), lerp(7.8, 6.6, k), 0, 0, -0.5);

      for (let i = 0; i < 4; i++) {
        put(cards.get(props[i].id), {
          x: props[i].x, y: lerp(0.5, -2.31, propsIn), z: props[i].z,
          rx: lerp(1.15, Math.PI / 2, propsIn), ry: 0, rz: rad((i - 1.5) * 3), visible: propsIn > 0.01,
        });
      }
      d.cap.textContent = "SEVEN TRICKS";
      revealCap(d.cap, spanE(t, L0.s + 1.6, L0.s + 2.2, "outQuint"));
      d.capsub.textContent = "THEY DO NOT PLAY FAIR";
      fadeUp(d.capsub, spanE(t, L0.s + 2.0, L0.s + 2.6, "outCubic"));
      done = true;
    }

    if (!done && t < L2.s) {
      // ---- L1 VOID: a hole opens and the round falls into it ----
      const u = spanE(t, L1.s, L1.e - 0.55, "inOutCubic");
      const collapse = spanE(t, L1.e - 0.55, L1.e - 0.2, "inQuart");
      const grow = lerp(0.12, 2.7, u) * (1 - collapse);
      L.amb.intensity = lerp(0.32, 0.08, u);
      L.key.intensity = lerp(0.5, 0.07, u);
      L.rim.intensity = lerp(2.4, 2.9, u);
      L.fill.intensity = lerp(3, 0.3, u);
      scene.fog.near = 3;
      scene.fog.far = 15;
      bg.style.opacity = "0.15";
      renderShards(shards, t, { visible: false });

      put(voidSphere, { x: 0, y: -0.35, z: -2.4, s: Math.max(0.02, grow) });
      voidRing.visible = true;
      voidRing.position.set(0, -0.35, -2.4);
      voidRing.scale.setScalar(Math.max(0.02, grow));
      voidRing.lookAt(camera.position);
      voidRing.material.opacity = 0.12 + 0.3 * u - collapse * 0.9;

      for (let i = 0; i < 4; i++) {
        const m = cards.get(props[i].id);
        const s0 = L1.s + 0.5 + i * 0.55;
        const su = spanE(t, s0, s0 + 1.05, "inQuad");
        const ang = t * 3.1 + i * 1.9;
        const rad0 = lerp(1.4, 0.1, su);
        put(m, {
          x: lerp(props[i].x, 0, su) + Math.cos(ang) * rad0 * (1 - su * 0.4),
          y: lerp(-2.28, -0.35, su) + Math.sin(ang) * rad0 * (1 - su * 0.4),
          z: lerp(props[i].z, -2.4, su),
          ry: Math.PI + su * 9,
          s: Math.max(0.01, 1 - su * 0.92),
          visible: su < 0.999,
        });
      }

      aim(camera, 0, 0.1, lerp(6.6, 5.4, u), 0, -0.25, -2.2);
      camera.position.x += shake(t, L1.e - 0.5, 0.05);

      d.cap.textContent = "VOID";
      revealCap(d.cap, spanE(t, L1.s + 1.1, L1.s + 1.7, "outQuint"));
      d.capsub.textContent = "NOTHING SURVIVES — NOT EVEN TRICKS";
      fadeUp(d.capsub, spanE(t, L1.s + 1.5, L1.s + 2.1, "outCubic"));
      flash(impacts, 0, 0, -0.3, -2.2, (collapse > 0 && collapse < 1 ? 0.8 * (1 - collapse) : 0), 2.6);
      done = true;
    }

    if (!done && t < L3.s) {
      // ---- L2 WARD: a light wall eats the incoming trick ----
      L.amb.intensity = 0.5;
      L.key.intensity = track([{ t: L2.s, v: 0.3 }, { t: L2.s + 0.25, v: 1.05, e: "outQuint" }], t);
      L.rim.intensity = 1.6;
      L.fill.intensity = 7;
      L.accent.intensity = track([
        { t: L2.s + 1.5, v: 4 },
        { t: L2.s + 1.72, v: 16, e: "outQuint" },
        { t: L2.s + 3.2, v: 6 },
      ], t);
      L.accent.position.set(1.2, 0.4, 2.6);
      scene.fog.near = 11;
      scene.fog.far = 40;
      bg.style.opacity = "0.3";
      renderShards(shards, t, { visible: false });

      // ward steps forward from the chorus
      const wardIn = spanE(t, L2.s + 0.35, L2.s + 1.05, "outQuint");
      put(cards.get("ward"), {
        x: lerp(-6.4, -0.1, wardIn), y: lerp(1.9, -0.35, wardIn), z: lerp(-4.6, 1.25, wardIn),
        rz: lerp(rad(5), rad(SKEW) * 0.4, wardIn), s: lerp(0.62, 1.04, wardIn),
      });

      // the doomed trick flies in and dies on the barrier
      const fly = spanE(t, L2.s + 0.9, L2.s + 2.0, "inQuad");
      const hitT = L2.s + 2.0;
      const shatter = spanE(t, hitT, hitT + 0.14, "inQuart");
      const ic = cards.get("executioner");
      if (shatter < 1) {
        put(ic, {
          x: lerp(-8, 1.75, fly), y: lerp(1.4, -0.3, fly), z: lerp(-7, 1.35, fly),
          ry: rad(28) * (1 - fly) + fly * 0.4, s: 1.0 * (1 - shatter),
          visible: fly > 0.01,
        });
      } else ic.visible = false;

      const bIn = spanE(t, L2.s + 1.5, L2.s + 1.72, "outQuint");
      const barrier = barriers[0];
      barrier.visible = true;
      barrier.position.set(1.15, -0.3, 1.0);
      barrier.rotation.y = rad(-24);
      barrier.scale.set(1, lerp(0.12, 1, bIn), 1);
      barrier.material.opacity = lerp(0.42, 0.18, spanE(t, L2.s + 1.72, L2.s + 3.4, "outCubic"));

      debris(shards, t, hitT, 1.75, -0.2, 1.3, 13, 41, 1.0);
      flash(impacts, 1, 1.75, -0.25, 1.35, spanE(t, hitT, hitT + 0.12, "outCubic") * (1 - span(t, hitT + 0.12, hitT + 0.7)) * 0.85, 1.9, C.yellow);

      aim(camera, 0.3 + shake(t, hitT, 0.07), 0.35, 7.7, 0.35, -0.3, 0.9);

      d.cap.textContent = "WARD";
      revealCap(d.cap, spanE(t, L2.s + 0.5, L2.s + 1.1, "outQuint"));
      d.pop.textContent = "+5";
      revealCap(d.pop, spanE(t, hitT + 0.15, hitT + 0.65, "outQuint"));
      d.popsub.textContent = "TRICK BLOCKED · FLAT POINTS BANKED";
      fadeUp(d.popsub, spanE(t, hitT + 0.35, hitT + 0.85, "outCubic"));
      done = true;
    }

    if (!done && t < L4.s) {
      // ---- L3 ECHO: the round sinks, its double rises deeper in Z ----
      L.amb.intensity = 0.5;
      L.key.intensity = 1.1;
      L.rim.intensity = 2.6;
      L.fill.intensity = 6;
      scene.fog.near = 8;
      scene.fog.far = 34;
      bg.style.opacity = "0.35";
      renderShards(shards, t, { visible: false });

      const rise = spanE(t, L3.s + 0.25, L3.s + 0.95, "outCubic");
      const sink = spanE(t, L3.s + 1.7, L3.s + 2.7, "inQuad");
      const wz = cards.get("witch");
      put(wz, {
        x: 0, y: lerp(lerp(-2.28, -0.55, rise), -2.75, sink),
        z: lerp(0.2, 1.7, rise), rx: sink * -1.25, ry: 0, rz: 0,
        s: lerp(1, 1.06, rise) * (1 - sink * 0.1),
      });
      const gP = spanE(t, L3.s + 1.9, L3.s + 2.7, "outCubic");
      put(ghosts[0], { x: 0, y: -0.45, z: lerp(-2.3, -1.5, gP), s: 1.12 });
      ghostOpacity(ghosts[0], 0.62 * gP);

      const push = spanE(t, L3.s + 1.8, L3.e, "inOutQuad");
      aim(camera, 0, 0.05, lerp(6.4, 3.1, push), 0, -0.4, -1.6);

      d.cap.textContent = "ECHO";
      revealCap(d.cap, spanE(t, L3.s + 0.4, L3.s + 1.0, "outQuint"));
      d.pop.textContent = "×2";
      revealCap(d.pop, spanE(t, L3.s + 2.5, L3.s + 3.1, "outQuint"));
      d.popsub.textContent = "THIS ROUND: ZERO · NEXT ROUND: DOUBLE";
      fadeUp(d.popsub, spanE(t, L3.s + 2.75, L3.s + 3.25, "outCubic"));
      done = true;
    }

    if (!done && t < L5.s) {
      // ---- L4 ECLIPSE: the key light itself is eclipsed ----
      const u = spanE(t, L4.s, L4.e, "inOutQuad");
      L.amb.intensity = lerp(0.45, 0.1, u);
      L.key.intensity = lerp(0.9, 0.08, spanE(t, L4.s, L4.s + 3.4, "inQuad"));
      L.rim.intensity = lerp(2.0, 3.3, u);
      L.fill.intensity = lerp(7, 0.4, u);
      scene.fog.near = 6;
      scene.fog.far = 30;
      bg.style.opacity = "0.5";
      renderShards(shards, t, { visible: false });

      // occluder slides between the key and the scene — its shadow sweeps the felt
      occluder.visible = true;
      occluder.position.set(lerp(-8.5, 8.5, u), 5.6, 3.2);
      occluder.lookAt(L.key.position.x, L.key.position.y, L.key.position.z);

      // the two shield barriers flicker out, one per eclipsed round
      for (let b = 0; b < 2; b++) {
        const dieAt = L4.s + 2.1 + b * 0.9;
        const alive = t < dieAt;
        const flicker = alive
          ? (t < L4.s + 1.6 ? 0.26 : 0.26 * (0.55 + 0.45 * Math.sin(t * 34)))
          : 0;
        const bar = barriers[1 + b];
        bar.visible = flicker > 0.01;
        bar.position.set(b === 0 ? -3.4 : 3.4, -1.3, -0.6);
        bar.scale.set(0.62, 0.5, 1);
        bar.material.opacity = flicker;
      }

      aim(camera, 0, lerp(0.3, 0.85, u), lerp(5.9, 7.4, u), 0, 0, -1);

      d.cap.textContent = "ECLIPSE";
      revealCap(d.cap, spanE(t, L4.s + 1.3, L4.s + 1.9, "outQuint"));
      d.capsub.textContent = "SHIELDS OFFLINE — TWO ROUNDS";
      fadeUp(d.capsub, spanE(t, L4.s + 1.7, L4.s + 2.3, "outCubic"));
      done = true;
    }

    if (!done && t < L6.s) {
      // ---- L5 ORACLE: a spotlight finds two cards in the dark hand ----
      L.amb.intensity = 0.1;
      L.key.intensity = 0.1;
      L.rim.intensity = 2.2;
      L.fill.intensity = 0.5;
      scene.fog.near = 6;
      scene.fog.far = 26;
      bg.style.opacity = "0.4";
      renderShards(shards, t, { visible: false });

      const handIds = ["bandit", "valkyrie", "vampire", "seraph", "ogre"];
      for (let i = 0; i < 5; i++) {
        put(cards.get(handIds[i]), {
          x: -4.7 + i * 0.92, y: -2.28, z: -3.0 + Math.abs(i - 2) * 0.12,
          ry: Math.PI, rz: rad((i - 2) * 4),
        });
      }
      const aimA = spanE(t, L5.s + 0.9, L5.s + 1.4, "outQuint");
      const aimB = spanE(t, L5.s + 2.7, L5.s + 3.2, "outQuint");
      const tx = lerp(lerp(-6.5, -3.78, aimA), -1.94, aimB);
      L.spot.intensity = track([{ t: L5.s + 0.8, v: 0 }, { t: L5.s + 1.3, v: 65, e: "outQuint" }], t);
      L.spot.position.set(-2.9, 8.5, 1.5);
      L.spot.target.position.set(tx, -2.2, -3.0);

      const flipA = spanE(t, L5.s + 1.55, L5.s + 2.05, "inOutCubic");
      const flipB = spanE(t, L5.s + 3.35, L5.s + 3.85, "inOutCubic");
      cards.get("valkyrie").rotation.y = lerp(Math.PI, 0, flipA);
      cards.get("seraph").rotation.y = lerp(Math.PI, 0, flipB);

      const k = spanE(t, L5.s, L5.e, "inOutQuad");
      aim(camera, lerp(1.6, -2.7, k), lerp(0.55, -0.25, k), lerp(7.1, 4.9, k), tx, -1.6, -3);

      d.cap.textContent = "ORACLE";
      revealCap(d.cap, spanE(t, L5.s + 0.5, L5.s + 1.1, "outQuint"));
      d.capsub.textContent = "TWO CARDS, TURNED FACE UP";
      fadeUp(d.capsub, spanE(t, L5.s + 0.9, L5.s + 1.5, "outCubic"));
      done = true;
    }

    if (!done && t < L7.s) {
      // ---- L6 REVERSAL: the score bars swap THROUGH depth ----
      L.amb.intensity = 0.45;
      L.key.intensity = 0.85;
      L.rim.intensity = 1.9;
      L.fill.intensity = 6;
      scene.fog.near = 10;
      scene.fog.far = 38;
      bg.style.opacity = "0.35";
      renderShards(shards, t, { visible: false });

      const inP = spanE(t, L6.s + 0.35, L6.s + 1.0, "outQuint");
      const swap = spanE(t, L6.s + 1.5, L6.s + 3.1, "inOutCubic");
      const dip = Math.sin(swap * Math.PI);
      const { barA, barB } = extras;
      barA.visible = inP > 0.01;
      barB.visible = inP > 0.01;
      barA.material.opacity = 0.95 * inP;
      barB.material.opacity = 0.95 * inP;
      barA.position.set(lerp(-2.3, 1.45, swap), 0.7, lerp(0.4, 0.4, swap) - dip * 1.7);
      barB.position.set(lerp(1.45, -2.3, swap), -0.55, lerp(0.4, 0.4, swap) + dip * 1.7);

      const roll = track([
        { t: L6.s + 1.5, v: 0 },
        { t: L6.s + 2.3, v: -9, e: "inOutQuad" },
        { t: L6.s + 3.1, v: 7, e: "inOutQuad" },
        { t: L6.s + 3.9, v: 0 },
      ], t);
      aim(camera, 0, 0.35, 7.0, 0, 0, 0, roll);

      d.cap.textContent = "REVERSAL";
      revealCap(d.cap, spanE(t, L6.s + 0.45, L6.s + 1.05, "outQuint"));
      d.capsub.textContent = swap > 0.5 ? "YOUR 6 · THEIR 14" : "YOUR 14 · THEIR 6";
      d.capsub.style.opacity = String(spanE(t, L6.s + 1.4, L6.s + 1.9, "outCubic") * 0.85);
      d.capsub.style.transform = "translateY(0)";
      done = true;
    }

    if (!done) {
      // ---- L7 EXECUTIONER: the blade falls past the lens ----
      const hitT = L7.e - 2.2;
      L.amb.intensity = 0.4;
      L.key.intensity = track([
        { t: L7.s, v: 0.8 }, { t: hitT - 0.05, v: 0.8 },
        { t: hitT, v: 1.95, e: "outQuint" }, { t: hitT + 0.7, v: 0.6 },
      ], t);
      L.rim.intensity = 2.0;
      L.fill.intensity = 6;
      scene.fog.near = 10;
      scene.fog.far = 38;
      bg.style.opacity = "0.35";
      renderShards(shards, t, { visible: false });

      const slabIn = spanE(t, L7.s + 0.4, L7.s + 1.1, "outQuint");
      const slabB = extras.slabB;
      slabB.visible = true;
      slabB.position.set(4.4, lerp(-0.6, -1.55, slabIn), 0);
      const punch = spanE(t, hitT, hitT + 0.42, "outQuad");
      slabB.scale.set(1 + Math.sin(punch * Math.PI) * 0.2, 1 + Math.sin(punch * Math.PI) * 0.2, 1);
      slabB.rotation.z = -punch * 0.07;

      // the 7+ commit that triggers the blade
      const demon = cards.get("demon");
      put(demon, { x: 2.55, y: -2.28, z: 0.7, ry: 0, rz: rad(7), s: 1 });

      blade.visible = true;
      bladeGuard.visible = true;
      const hover = Math.sin(t * 26) * 0.03;
      const drop = spanE(t, hitT - 0.32, hitT, "inExpo");
      const by = lerp(3.1 + hover, -2.3, drop);
      blade.position.set(4.4, by, 0.4);
      blade.rotation.z = rad(SKEW);
      bladeGuard.position.set(4.4 - 0.1, by + 3.5, 0.45);
      bladeGuard.rotation.z = rad(SKEW);

      debris(shards, t, hitT, 4.4, -1.4, 0.4, 12, 77, 0.9);
      flash(impacts, 2, 4.4, -1.4, 0.5, spanE(t, hitT, hitT + 0.12, "outCubic") * (1 - span(t, hitT + 0.12, hitT + 0.75)) * 0.8, 1.8);

      const zP = spanE(t, L7.s, hitT + 0.35, "inOutQuad");
      const zoom = spanE(t, hitT - 0.32, hitT + 0.25, "inOutQuad");
      camera.fov = lerp(38, 46, zoom);
      camera.updateProjectionMatrix();
      aim(camera, 1.8 + shake(t, hitT, 0.11), -0.95, lerp(6.9, 5.8, zP), 3.3, -1.0, 0);

      d.stamp.style.opacity = String(spanE(t, hitT + 0.1, hitT + 0.4, "outQuint"));
      d.stamp.style.transform = `rotate(-7deg) scale(${lerp(2.1, 1, spanE(t, hitT + 0.1, hitT + 0.4, "outQuint"))})`;
      d.popsub.textContent = "THEIR TOTAL → 0";
      fadeUp(d.popsub, spanE(t, hitT + 0.4, hitT + 0.9, "outCubic"));
      d.popsub.style.top = "62%";
      d.pop.style.opacity = "0";
      d.cap.style.opacity = "0";
      d.capsub.style.opacity = "0";
    }

    d.kick.style.opacity = String(spanE(t, 0.3, 1.0, "outCubic") * 0.85);
  },
};

// =====================================================================
// ACT V — PRIORITY & MULTIPLIERS
// =====================================================================

const NAMES = ["1 · VOID", "2 · ECLIPSE", "3 · WARD", "4 · ECHO", "5 · REVERSAL", "6 · EXECUTIONER", "7 · ORACLE"];

const act5 = {
  id: 5,
  init(world) {
    const root = world.actDom.get(5);
    this.dom = {
      kick: txt(root, "ov kick", "PRIORITY · ORDER IS LAW"),
      pop: txt(root, "ov pop", "×3"),
      popsub: txt(root, "ov popsub", "THE MULTIPLIER CEILING"),
      multline: txt(root, "ov multline", "R7 ×2 · ECHO +1 · NEVER ×4"),
      capsub: txt(root, "ov capsub", ""),
    };
  },
  render(world, t, lines) {
    const { cards, impacts, shards, bg, lights: L, camera, scene, extras } = world;
    const d = this.dom;
    const { table, barriers, ghosts } = extras;
    table.visible = true;

    const L1 = win(lines, "a5l1");
    const L2 = win(lines, "a5l2");
    const L3 = win(lines, "a5l3");
    const order = ["void", "eclipse", "ward", "echo", "reversal", "executioner", "oracle"];
    const pos = (i) => ({ x: -6.2 + i * 1.85, y: -1.6 + i * 0.62, z: 2.4 - i * 1.7 });

    const hidePops = () => { d.pop.style.opacity = "0"; d.popsub.style.opacity = "0"; d.multline.style.opacity = "0"; d.capsub.style.opacity = "0"; };

    if (t < L2.s) {
      // ---- L1: crane down the priority staircase, light hops card to card ----
      L.amb.intensity = 0.3;
      L.key.intensity = 0.5;
      L.rim.intensity = 2.3;
      L.fill.intensity = 3;
      scene.fog.near = 8;
      scene.fog.far = 34;
      bg.style.opacity = "0.2";
      renderShards(shards, t, { visible: false });

      for (let i = 0; i < 7; i++) put(cards.get(order[i]), { ...pos(i), ry: rad(-24), rz: rad(-3) });

      const u = spanE(t, L1.s, L1.e, "inOutQuad");
      const f = u * 6;
      let hop = 0;
      for (let k = 0; k < 7; k++) hop = Math.max(hop, 1 - Math.abs(f - k) * 2.2);
      const acc = pos(Math.round(f));
      L.accent.intensity = 5 + 26 * hop;
      L.accent.position.set(acc.x, acc.y + 1.2, acc.z + 1.6);

      const px = [-8.8, -4.3, 0.6, 5.0];
      const py = [-0.9, 0.5, 1.9, 3.2];
      const pz = [9.8, 6.8, 4.4, 2.4];
      const lx = [-6.2, -2.5, 1.2, 4.9];
      const ly = [-1.6, -0.36, 0.88, 2.12];
      const lz = [2.4, -1.0, -4.4, -7.8];
      const seg = Math.min(2.999, u * 3);
      const i0 = Math.floor(seg);
      const fk = seg - i0;
      const e = ease.inOutQuad(fk);
      aim(
        camera,
        lerp(px[i0], px[i0 + 1], e), lerp(py[i0], py[i0 + 1], e), lerp(pz[i0], pz[i0 + 1], e),
        lerp(lx[i0], lx[i0 + 1], e), lerp(ly[i0], ly[i0 + 1], e), lerp(lz[i0], lz[i0 + 1], e),
      );

      d.kick.textContent = NAMES[Math.max(0, Math.min(6, Math.round(f)))];
      d.kick.style.opacity = String((0.5 + 0.5 * hop) * 0.9);
      hidePops();
    } else if (t < L3.s) {
      // ---- L2: a Ward blocks the trick BEFORE it fires ----
      L.amb.intensity = 0.45;
      L.key.intensity = 0.95;
      L.rim.intensity = 1.8;
      L.fill.intensity = 7;
      L.accent.intensity = track([
        { t: L2.s + 1.4, v: 4 }, { t: L2.s + 1.62, v: 32, e: "outQuint" }, { t: L2.s + 3.0, v: 8 },
      ], t);
      L.accent.position.set(0.5, 0.4, 3);
      scene.fog.near = 11;
      scene.fog.far = 40;
      bg.style.opacity = "0.3";
      renderShards(shards, t, { visible: false });

      put(cards.get("ward"), { x: -0.1, y: -0.1, z: 1.45, ry: 0, rz: rad(SKEW) * 0.35, s: 1.05 });
      const fly = spanE(t, L2.s + 0.7, L2.s + 1.7, "inQuad");
      const deflect = spanE(t, L2.s + 1.7, L2.s + 2.75, "outQuad");
      const ic = cards.get("echo");
      if (deflect < 1) {
        put(ic, {
          x: lerp(8, 0.85, fly) + deflect * deflect * 5.5,
          y: 0.2 + deflect * 0.7,
          z: lerp(0.6, 1.4, fly) - deflect * 3.6,
          ry: rad(30) * (1 - fly) + deflect * 7,
          s: 1,
        });
      } else ic.visible = false;

      const bIn = spanE(t, L2.s + 1.42, L2.s + 1.6, "outQuint");
      const barrier = barriers[0];
      barrier.visible = true;
      barrier.position.set(0.42, 0, 1.42);
      barrier.scale.set(0.9, lerp(0.15, 1, bIn), 1);
      barrier.material.opacity = lerp(0.68, 0.3, spanE(t, L2.s + 1.62, L2.s + 3.0, "outCubic"));
      flash(impacts, 0, 0.85, 0.2, 1.5, spanE(t, L2.s + 1.7, L2.s + 1.82, "outCubic") * (1 - span(t, L2.s + 1.82, L2.s + 2.4)) * 0.85, 2.0, C.yellow);

      aim(camera, 0.2, 0.6, 8.4, 0, 0, 1.2);
      d.kick.textContent = "WARD · FIRST PRIORITY BLOCK";
      d.kick.style.opacity = "0.85";
      d.capsub.textContent = "BLOCKED BEFORE IT FIRES";
      d.capsub.style.opacity = String(spanE(t, L2.s + 1.9, L2.s + 2.4, "outCubic") * 0.85);
      d.capsub.style.transform = "translateY(0)";
      hidePops();
    } else {
      // ---- L3: the multiplier sandwich, capped at three ----
      L.amb.intensity = 0.42;
      L.key.intensity = 0.9;
      L.rim.intensity = 2.0;
      L.fill.intensity = track([
        { t: L3.s + 1.0, v: 5 }, { t: L3.s + 1.25, v: 14, e: "outQuint" },
        { t: L3.s + 2.3, v: 6 }, { t: L3.s + 2.5, v: 12, e: "outQuint" }, { t: L3.s + 3.6, v: 7 },
      ], t);
      scene.fog.near = 11;
      scene.fog.far = 42;
      bg.style.opacity = "0.3";
      renderShards(shards, t, { visible: false });

      const base = spanE(t, L3.s, L3.s + 0.7, "outQuint");
      put(cards.get("valkyrie"), { x: 0, y: -0.25, z: 1.85, ry: 0, rz: 0, s: 1.12 * base });

      const g1 = spanE(t, L3.s + 1.05, L3.s + 1.65, "outBack");
      put(ghosts[1], { x: 0, y: -0.25, z: 0.25, ry: 0, s: 1.2 * Math.max(0.001, g1) });
      ghostOpacity(ghosts[1], 0.4 * g1);
      const g2 = spanE(t, L3.s + 2.35, L3.s + 2.95, "outBack");
      put(ghosts[2], { x: 0, y: -0.25, z: -1.5, ry: 0, s: 1.28 * Math.max(0.001, g2) });
      ghostOpacity(ghosts[2], 0.3 * g2);

      const cage = spanE(t, L3.s + 3.35, L3.s + 3.6, "outQuint");
      for (let b = 0; b < 2; b++) {
        const bar = barriers[1 + b];
        bar.visible = cage > 0.01;
        bar.position.set(b === 0 ? -3.2 : 3.2, -0.2, 0.4);
        bar.rotation.y = (b === 0 ? 1 : -1) * rad(34);
        bar.scale.set(1, lerp(0.2, 1, cage), 1);
        bar.material.opacity = 0.2 * cage;
      }
      flash(impacts, 1, 0, -0.2, 0.4, (1 - cage) * cage > 0 ? 0.5 * (1 - cage) : 0, 2.6, C.yellow);

      const k = spanE(t, L3.s + 3.3, L3.s + 5.0, "outCubic");
      aim(camera, 0, lerp(0.8, 1.15, k), lerp(5.3, 8.9, k), 0, -0.2, 0);

      d.kick.textContent = "MULTIPLIER";
      d.kick.style.opacity = "0.85";
      const popP = spanE(t, L3.s + 3.5, L3.s + 4.1, "outQuint");
      revealCap(d.pop, popP);
      fadeUp(d.popsub, spanE(t, L3.s + 3.75, L3.s + 4.25, "outCubic"));
      d.multline.style.opacity = String(spanE(t, L3.s + 4.2, L3.s + 4.8, "outCubic") * 0.95);
    }
  },
};

// =====================================================================
// ACT VI — STINGER: the monolith
// =====================================================================

const act6 = {
  id: 6,
  init(world) {
    const root = world.actDom.get(6);
    this.dom = {
      kick: txt(root, "ov kick", "NINETEEN CARDS · ONE LIE AT A TIME"),
      cap: txt(root, "ov cap", "PACIFY"),
      capsub: txt(root, "ov capsub", "LEARN THE LIE"),
    };
  },
  render(world, t, lines) {
    const { cards, impacts, shards, bg, lights: L, camera, scene } = world;
    const d = this.dom;
    const L1 = win(lines, "a6l1");
    const L2 = win(lines, "a6l2");

    scene.fog.near = 14;
    scene.fog.far = 52;
    bg.style.opacity = String(spanE(t, 0.4, 1.6, "outCubic") * 0.4);
    renderShards(shards, t, { spin: 0.25 });

    const ids = [...cards.keys()];
    const rows = [5, 5, 5, 4];
    const phi = Math.max(0, t - 2.2) * 0.13;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);

    for (let i = 0; i < ids.length; i++) {
      const m = cards.get(ids[i]);
      const sd = i * 17 + 3;
      let r = 0;
      let c = i;
      if (i >= 5) { r = 1; c = i - 5; }
      if (i >= 10) { r = 2; c = i - 10; }
      if (i >= 15) { r = 3; c = i - 15; }
      const cols = rows[r];
      const gx = (c - (cols - 1) / 2) * 1.82;
      const gy = (1.5 - r) * 2.46;
      const gz = -r * 0.12;

      // rotate the whole slab around Y as one object
      const sx = gx * cosP - gz * sinP;
      const sz = gx * sinP + gz * cosP;

      const delay = 0.35 + randRange(sd, 0, 1.15);
      const fly = spanE(t, delay, delay + 0.8, "outQuint");
      put(m, {
        x: lerp(randRange(sd + 1, -13, 13), sx, fly),
        y: lerp(randRange(sd + 2, -7, 7), gy, fly),
        z: lerp(randRange(sd + 3, -20, -11), sz, fly),
        ry: lerp(randRange(sd + 4, -2.4, 2.4), phi, fly),
        rz: randRange(sd + 5, -0.035, 0.035),
        s: 0.6,
        visible: t > delay - 0.05,
      });
      if (fly > 0.98 && fly < 1) flash(impacts, i % 8, sx, gy, sz, 0.18 * (1 - (fly - 0.98) * 50), 0.5);
    }

    // ---- light: key counter-orbits the slab so glints race the edges ----
    const fadeOut = spanE(t, 8.9, 10.35, "inQuad");
    L.amb.intensity = lerp(0.42, 0.06, fadeOut);
    L.key.intensity = lerp(0.8, 0.1, fadeOut);
    L.rim.intensity = lerp(2.6, 0.7, fadeOut);
    L.fill.intensity = lerp(4, 0.4, fadeOut);
    const kAz = -phi * 1.7 + 0.8;
    L.key.position.set(Math.sin(kAz) * 10, 7, Math.cos(kAz) * 10 + 2);

    const az = lerp(-0.4, 0.26, spanE(t, 0, L2.s + 1.6, "inOutQuad"));
    const pull = spanE(t, L2.s, L2.s + 1.7, "outCubic");
    const R = lerp(13.6, 17.2, pull);
    aim(camera, Math.sin(az) * R, lerp(0.7, 2.4, pull), Math.cos(az) * R, 0, 0, -0.4);
    camera.position.x += shake(t, L2.s + 0.18, 0.09);

    flash(impacts, 0, 0, 0, -0.4, spanE(t, L2.s, L2.s + 0.2, "outCubic") * (1 - span(t, L2.s + 0.2, L2.s + 0.9)) * 0.8, 2.8);

    const out = 1 - spanE(t, 9.0, 10.3, "inQuad");
    d.kick.style.opacity = String(spanE(t, 0.5, 1.3, "outCubic") * 0.85 * out);
    const capP = spanE(t, L2.s + 0.12, L2.s + 0.62, "outQuint");
    revealCap(d.cap, capP);
    d.cap.style.opacity = String(capP * out);
    fadeUp(d.capsub, spanE(t, L2.s + 0.45, L2.s + 0.95, "outCubic"));
    d.capsub.style.opacity = String(spanE(t, L2.s + 0.45, L2.s + 0.95, "outCubic") * out);
  },
};

export const ACTS_B = [act4, act5, act6];
