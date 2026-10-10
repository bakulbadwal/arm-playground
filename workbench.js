"use strict";
if (typeof importScripts === "function" && typeof K3 === "undefined") importScripts("arm3d.js"); // when this file runs as a worker, for training
/* Arm Playground · Workbench: drive the SO-101, record your driving, replay it blind, teach a small policy.
   Needs K3 (arm3d.js) and, for the picture, three.js (docs/vendor/three.min.js). The core below is pure and tested by test.mjs. */

// ================= workbench core (pure) =================
const WB = (() => {
  const { fk, jacCols, clampQ, CHAIN, sub, add, scale, len, dot, mulberry32 } = K3;
  const FPS = 30, TOP = 3, HALF = 15, GRASP_MM = 21, HOME = [205, 0, 115], PSI = -75 * Math.PI / 180;
  const BIN = { c: [170, -190], half: 50, wall: 46, t: 5 };
  // where cubes appear: the ordinary spots (missions 1, 2, 4, 6, 7) and the far spots (mission 3), all checked reachable in test.mjs
  const SPOTS = [[230, 90], [190, 140], [262, 28], [160, 112], [248, 122], [212, 58]];
  const FAR_SPOTS = [[300, 70], [285, 110], [305, 20]];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const inBin = (p) => Math.abs(p[0] - BIN.c[0]) < BIN.half - HALF + 4 && Math.abs(p[1] - BIN.c[1]) < BIN.half - HALF + 4;

  // ---- the gripper's frame: z points out of the jaws, x is the direction they open, y is the jaw hinge (checked against the URDF in tab 5) ----
  const basis = (f) => [[f.RT[0][0], f.RT[1][0], f.RT[2][0]], [f.RT[0][1], f.RT[1][1], f.RT[2][1]], [f.RT[0][2], f.RT[1][2], f.RT[2][2]]];
  const pitchOf = (f) => Math.asin(clamp(f.RT[2][2], -1, 1)); // how far the jaws point down: 0 level, −90° straight down
  const relOf = (f, p) => { const [o, j, a] = basis(f), d = sub(p, f.T); return [dot(d, o), dot(d, j), dot(d, a)]; };
  const posOf = (f, r) => { const [o, j, a] = basis(f); return add(add(add(f.T, scale(o, r[0])), scale(j, r[1])), scale(a, r[2])); };

  // ---- control: damped least squares on four joints for four numbers (x, y, z and the jaws' pitch). Same formula as tab 3, one row more. ----
  const PITCH_W = 45, LAMBDA2 = 64, STEP_MM = 28, STEP_RAD = 0.22;
  function solve4(A, b) { const n = 4, M = A.map((r, i) => r.concat(b[i]));
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
    return M.map((r, i) => r[n] / r[i]); }
  function ikStep(q, tg, psi = PSI, iters = 3) {
    for (let it = 0; it < iters; it++) {
      const f = fk(q), cols = jacCols(q, "T"); let e = sub(tg, f.T); const n = len(e); if (n > STEP_MM) e = scale(e, STEP_MM / n);
      const err = [e[0], e[1], e[2], PITCH_W * clamp(psi - pitchOf(f), -0.3, 0.3)];
      const J = [0, 1, 2, 3].map((k) => [cols[k][0], cols[k][1], cols[k][2], k === 0 ? 0 : -PITCH_W]); // pitch falls one radian per radian of lift, elbow or wrist
      let dq = null;
      for (let pass = 0; pass < 2; pass++) { // a joint pressed against its limit can't help: drop it and let the others take up the motion
        const A = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => J.reduce((s, col) => s + col[r] * col[c], 0) + (r === c ? LAMBDA2 : 0))), y = solve4(A, err); if (!y) return q;
        dq = J.map((col) => col[0] * y[0] + col[1] * y[1] + col[2] * y[2] + col[3] * y[3]); let stuck = false;
        for (let k = 0; k < 4; k++) if ((q[k] >= CHAIN[k].lim[1] - 1e-6 && dq[k] > 0) || (q[k] <= CHAIN[k].lim[0] + 1e-6 && dq[k] < 0)) { J[k] = [0, 0, 0, 0]; stuck = true; }
        if (!stuck) break; }
      const m = Math.max(...dq.map(Math.abs)); if (m > STEP_RAD) dq = dq.map((v) => v * STEP_RAD / m);
      q = clampQ([q[0] + dq[0], q[1] + dq[1], q[2] + dq[2], q[3] + dq[3], q[4]]);
    }
    return q;
  }

  // ---- the world: arm, gripper, one cube, one bin. step() is the only way it changes, so live play, replay, policy runs and tests share it. ----
  function world(spot, opt = {}) {
    let q = [0, -0.3, 0.6, 1.0, 0]; for (let i = 0; i < 40; i++) q = ikStep(q, HOME);
    const w = { q, act: q.slice(), tg: HOME.slice(), grip: 0, gripCmd: 0, held: false, rel: null, edge: 0, clock: 0, t0: null, delivered: 0, landedInBin: false,
      cube: { p: [0, 0, 0], yaw: 0, state: "rest", vz: 0 }, lag: opt.lag || 0, queue: [] };
    placeCube(w, spot, opt.yaw || 0); return w;
  }
  function placeCube(w, xy, yaw = 0) { w.cube = { p: [xy[0], xy[1], TOP + HALF], yaw, state: "rest", vz: 0 }; w.held = false; w.rel = null; w.t0 = null; w.landedInBin = false; }
  function tryGrasp(w, f) { if (w.held || w.cube.state !== "rest" || len(sub(w.cube.p, f.T)) > GRASP_MM) return false; w.held = true; w.cube.state = "held"; w.rel = relOf(f, w.cube.p); return true; }
  function release(w, f) { if (!w.held) return; w.held = false; w.cube.p = posOf(f, w.rel); w.cube.state = "fall"; w.cube.vz = 0; w.rel = null; }
  // input: { move: [dx, dy, dz] mm, gripCmd: 0|1, joint: [5] radians to add (joint mode), q: [5] to set outright (replay) }
  function step(w, input, dt) {
    if (w.lag) { w.queue.push(input); input = w.queue.length > w.lag ? w.queue.shift() : { gripCmd: w.gripCmd }; } // commands arrive `lag` frames late
    w.clock += dt; const events = { grasped: false, released: false, landed: false };
    if (input.gripCmd != null) w.gripCmd = input.gripCmd;
    const state = w.q.slice();
    if (input.q) { w.q = clampQ(input.q.slice()); w.tg = fk(w.q).T.slice(); }
    else if (input.joint) { w.q = clampQ(w.q.map((v, k) => v + input.joint[k])); w.tg = fk(w.q).T.slice(); if (input.joint.some((v) => v) && w.t0 == null && w.cube.state === "rest") w.t0 = w.clock; }
    else {
      if (input.move && (input.move[0] || input.move[1] || input.move[2])) { w.tg = [w.tg[0] + input.move[0], w.tg[1] + input.move[1], Math.max(TOP + 7, w.tg[2] + input.move[2])]; if (w.t0 == null && w.cube.state === "rest") w.t0 = w.clock; }
      w.q = ikStep(w.q, w.tg);
      const T = fk(w.q).T, miss = sub(w.tg, T), n = len(miss); // the hand can't be asked to go where the arm can't: keep the request within 20 mm of it
      if (n > 20) { w.tg = add(T, scale(miss, 20 / n)); w.edge = 0.5; } else w.edge = Math.max(0, w.edge - dt);
    }
    w.act = w.q.slice();
    const f = fk(w.q); w.grip = clamp(w.grip + (w.gripCmd ? 1 : -1) * dt * 4.5, 0, 1);
    if (!input.q && w.grip >= 0.55 && w.gripCmd && tryGrasp(w, f)) events.grasped = true; // closed jaws take a cube they are around; during a replay the recorded grasp is replayed instead
    if (w.held && w.gripCmd === 0) { release(w, f); events.released = true; }
    if (w.cube.state === "fall") { w.cube.vz -= 9810 * dt; w.cube.p[2] += w.cube.vz * dt; const rest = TOP + HALF + (inBin(w.cube.p) ? BIN.t : 0);
      if (w.cube.p[2] <= rest) { w.cube.p[2] = rest; w.cube.state = "rest"; w.cube.vz = 0; events.landed = true; if (inBin(w.cube.p)) { w.delivered++; w.landedInBin = true; } } }
    return { f, state, events };
  }
  // the display may refresh at 60 or 120 Hz; the world always advances in steps of 1/FPS. ticks() says how many steps a frame of `dt` seconds owes.
  function ticks(acc, dt) { acc = Math.min(acc + dt, 0.25); let n = 0; while (acc >= 1 / FPS - 1e-9) { acc -= 1 / FPS; n++; } return { n, acc }; }
  const handOf = (w) => fk(w.q).T;
  const cubeWorld = (w) => (w.held ? posOf(fk(w.q), w.rel) : w.cube.p.slice());

  // ---- recording: what LeRobot stores, 30 times a second. state = the six joints as they were, action = the six as commanded. ----
  function recorder(w) { return { fps: FPS, frames: [], grasps: [], cube: { p: w.cube.p.slice(), yaw: w.cube.yaw }, end: null }; }
  function record(ep, w, state, events) {
    if (events.grasped) ep.grasps.push({ i: ep.frames.length, q: w.q.slice() }); // the exact pose the jaws closed in
    ep.frames.push({ s: state.concat(w.grip), a: w.act.concat(w.gripCmd), c: cubeWorld(w), h: w.held ? 1 : 0 });
  }
  const finish = (ep, w) => { ep.end = { held: w.held, p: cubeWorld(w) }; return ep; };
  // replay: frame x (fractional) of an episode → the joint command and gripper command, interpolated between rows
  function sample(ep, x) { const F = ep.frames, i = clamp(Math.floor(x), 0, F.length - 1), j = Math.min(F.length - 1, i + 1), u = clamp(x - i, 0, 1);
    return { q: [0, 1, 2, 3, 4].map((k) => F[i].a[k] + (F[j].a[k] - F[i].a[k]) * u), gripCmd: F[i].a[5] }; }
  function replay(ep, w, dt, play) { // play = { x: frame position, gi: next recorded grasp to try }; returns true when finished
    play.x += dt * FPS; const s = sample(ep, play.x); const r = step(w, { q: s.q, gripCmd: s.gripCmd }, dt);
    while (play.gi < ep.grasps.length && play.x >= ep.grasps[play.gi].i) { tryGrasp(w, fk(ep.grasps[play.gi].q)); play.gi++; } // close on the cube exactly where the recording did
    return { done: play.x >= ep.frames.length + FPS, r };
  }
  const sameEnd = (ep, w) => w.held === ep.end.held && (ep.end.held || len(sub(w.cube.p, ep.end.p)) < 12);

  // ---- a small policy, trained in the page on your own demonstrations (a toy: it is handed the cube's position; the course's policies must find it in images) ----
  const F_IN = 8, F_OUT = 4, V_SCALE = 220;
  const features = (hand, cube, held) => { const goal = held ? [BIN.c[0], BIN.c[1], 84] : cube, d = sub(goal, hand); return [d[0] / 150, d[1] / 150, d[2] / 150, hand[2] / 150, hand[0] / 300, hand[1] / 300, held ? 1 : 0, len(d) / 150]; };
  // Each row: where the hand and cube are now → where the hand is heading over the next AHEAD frames, and whether the jaws should be closed by then.
  // Looking a few frames ahead is what makes the two one-frame events (close, open) learnable; ACT does the same thing at scale by predicting a whole chunk of future actions.
  const AHEAD = 4, GRIP_AHEAD = 12;
  function dataset(episodes) { const X = [], Y = [];
    for (const ep of episodes) for (let i = 0; i + 1 < ep.frames.length; i++) { const j = Math.min(ep.frames.length - 1, i + AHEAD), g = Math.min(ep.frames.length - 1, i + GRIP_AHEAD), a = fk(ep.frames[i].a).T, b = fk(ep.frames[j].a).T, v = scale(sub(b, a), FPS / ((j - i) * V_SCALE));
      X.push(features(a, ep.frames[i].c, ep.frames[i].h)); Y.push([v[0], v[1], v[2], ep.frames[g].a[5]]); }
    return { X, Y }; }
  function mlp(seed, H = 48) { const r = mulberry32(seed), rnd = (s) => (r() * 2 - 1) * s, mk = (n, m) => Array.from({ length: n }, () => Array.from({ length: m }, () => rnd(Math.sqrt(6 / (n + m)))));
    return { W1: mk(F_IN, H), b1: new Array(H).fill(0), W2: mk(H, H), b2: new Array(H).fill(0), W3: mk(H, F_OUT), b3: new Array(F_OUT).fill(0), H, trained: 0, demos: 0 }; }
  function forward(p, x) { const h1 = p.b1.map((b, j) => Math.tanh(b + x.reduce((s, xi, i) => s + xi * p.W1[i][j], 0)));
    const h2 = p.b2.map((b, j) => Math.tanh(b + h1.reduce((s, hi, i) => s + hi * p.W2[i][j], 0)));
    const o = p.b3.map((b, j) => b + h2.reduce((s, hi, i) => s + hi * p.W3[i][j], 0)); return { h1, h2, o }; }
  function train(p, data, opt = {}) { // Adam on mean squared error, mini-batches, deterministic for a seed
    const steps = opt.steps || 2500, lr0 = opt.lr || 3e-3, B = 32, r = mulberry32(opt.seed == null ? 3 : opt.seed), N = data.X.length; if (!N) return p;
    const params = [p.W1, p.b1, p.W2, p.b2, p.W3, p.b3], m = params.map((P) => Array.isArray(P[0]) ? P.map((row) => row.map(() => 0)) : P.map(() => 0)), v = m.map((P) => Array.isArray(P[0]) ? P.map((row) => row.map(() => 0)) : P.map(() => 0));
    let t = 0;
    for (let s = 0; s < steps; s++) {
      const g = params.map((P) => Array.isArray(P[0]) ? P.map((row) => row.map(() => 0)) : P.map(() => 0));
      for (let bi = 0; bi < B; bi++) { const n = Math.floor(r() * N), x = data.X[n], y = data.Y[n], { h1, h2, o } = forward(p, x);
        const dO = o.map((oi, j) => 2 * (oi - y[j]) * (j === 3 ? 3 : 1) / B); // the jaw decision is weighted up: it is a few rows deciding the whole task
        const dH2 = h2.map((h, i) => (1 - h * h) * dO.reduce((acc, d, j) => acc + d * p.W3[i][j], 0));
        const dH1 = h1.map((h, i) => (1 - h * h) * dH2.reduce((acc, d, j) => acc + d * p.W2[i][j], 0));
        for (let i = 0; i < p.H; i++) for (let j = 0; j < F_OUT; j++) g[4][i][j] += h2[i] * dO[j]; for (let j = 0; j < F_OUT; j++) g[5][j] += dO[j];
        for (let i = 0; i < p.H; i++) for (let j = 0; j < p.H; j++) g[2][i][j] += h1[i] * dH2[j]; for (let j = 0; j < p.H; j++) g[3][j] += dH2[j];
        for (let i = 0; i < F_IN; i++) for (let j = 0; j < p.H; j++) g[0][i][j] += x[i] * dH1[j]; for (let j = 0; j < p.H; j++) g[1][j] += dH1[j]; }
      t++; const b1c = 1 - Math.pow(0.9, t), b2c = 1 - Math.pow(0.999, t), lr = lr0 * (0.05 + 0.95 * 0.5 * (1 + Math.cos(Math.PI * s / steps))); // cosine decay: settle instead of bouncing
      params.forEach((P, pi) => { const upd = (row, mi, vi, gi) => { for (let j = 0; j < row.length; j++) { mi[j] = 0.9 * mi[j] + 0.1 * gi[j]; vi[j] = 0.999 * vi[j] + 0.001 * gi[j] * gi[j]; row[j] -= lr * (mi[j] / b1c) / (Math.sqrt(vi[j] / b2c) + 1e-8); } };
        if (Array.isArray(P[0])) P.forEach((row, i) => upd(row, m[pi][i], v[pi][i], g[pi][i])); else upd(P, m[pi], v[pi], g[pi]); });
    }
    p.trained += steps; return p;
  }
  const act = (p, hand, cube, held) => { const o = forward(p, features(hand, cube, held)).o; return { v: [o[0], o[1], o[2]].map((x) => clamp(x, -1.2, 1.2) * V_SCALE), gripCmd: o[3] > 0.5 ? 1 : 0 }; };
  const TEST_SPOTS = [[205, 120], [245, 60], [180, 95], [255, 100], [225, 20], [200, 70], [270, 60], [170, 130]];
  const scorePolicy = (p) => TEST_SPOTS.map((s) => rollout(p, s)); // one rollout per fresh spot; the page reports how many delivered
  // run the policy in a fresh world at `spot`, for up to `seconds`; the same loop the page runs
  function rollout(p, spot, seconds = 14) { const w = world(spot); let holdGrip = 0;
    for (let i = 0; i < seconds * FPS; i++) { const a = act(p, handOf(w), cubeWorld(w), w.held); if (a.gripCmd !== holdGrip) holdGrip = a.gripCmd;
      step(w, { move: scale(a.v, 1 / FPS), gripCmd: holdGrip }, 1 / FPS); if (w.landedInBin) return { ok: true, t: w.clock, w }; }
    return { ok: false, t: seconds, w }; }

  // ---- a scripted demonstrator, for the tests and for the "show me" button: the way a careful person would drive ----
  function demonstrate(spot, opt = {}) { const w = world(spot), ep = recorder(w), c = w.cube.p.slice(), rnd = opt.noisy != null ? mulberry32(100 + opt.noisy) : null, jit = (s) => (rnd ? (rnd() * 2 - 1) * s : 0);
    const v = opt.speed || (rnd ? 120 + rnd() * 80 : 180), B = [BIN.c[0] + jit(14), BIN.c[1] + jit(14)];
    let plan = [[c[0], c[1], 85], [c[0], c[1], 21], "grip", [c[0], c[1], 135], [B[0], B[1], 135], [B[0], B[1], 84], "open", "wait"];
    if (rnd) plan = [[c[0] + jit(6), w.tg[1], 85 + jit(20)], [c[0] + jit(6), c[1] + jit(6), 85 + jit(20)], "pause", [c[0] + jit(5), c[1] + jit(5), 21 + jit(3)], "pause", "grip", "pause", [c[0], c[1], 135 + jit(20)], [B[0], c[1], 135 + jit(20)], "pause", [B[0], B[1], 135 + jit(20)], [B[0], B[1], 84 + jit(8)], "pause", "open", "wait"]; // one axis at a time, pauses, sloppy heights: a person on a keyboard
    let si = 0, waitLeft = 1.0, pause = 0;
    for (let i = 0; i < 30 * FPS && si < plan.length; i++) { const st = plan[si]; let input = { gripCmd: w.gripCmd };
      if (st === "grip") { input.gripCmd = 1; si++; } else if (st === "open") { input.gripCmd = 0; si++; } else if (st === "wait") { waitLeft -= 1 / FPS; if (waitLeft <= 0) si++; }
      else if (st === "pause") { if (!pause) pause = 0.1 + rnd() * 0.5; pause -= 1 / FPS; if (pause <= 0) { pause = 0; si++; } }
      else { const d = sub(st, w.tg), L = len(d), sm = v / FPS; if (L <= sm) { input.move = d; si++; } else input.move = scale(d, sm / L); if (w.grip > 0 && w.grip < 1) input.move = [0, 0, 0]; }
      const r = step(w, input, 1 / FPS); record(ep, w, r.state, r.events); }
    return finish(ep, w); }

  // ---- missions ----
  const MISSIONS = [
    { id: "pick", title: "Put the cube in the bin", unit: "Unit 2", mode: "drive", spots: SPOTS,
      goal: "Drive the hand to the red cube, close the gripper, carry it over the blue bin and let go.",
      ask: { type: "mc", q: "When you press forward, which joints move?", o: ["One: the arm has a forward motor", "Several at once, in ratios the solver works out", "None until you choose a joint"], a: 1,
        why: "There is no forward motor. Every move you make is turned into joint speeds by the damped pseudo-inverse from tab 3, thirty times a second. Watch the joint numbers in the corner change together." } },
    { id: "joints", title: "Now do it joint by joint", unit: "Unit 2", mode: "joint", spots: SPOTS,
      goal: "Same task, but the solver is off. You turn the five joints yourself.",
      ask: { type: "mc", q: "To move the hand in a straight line, the joints have to…", o: ["Turn one at a time, in order", "All change at once, in exactly the right ratios", "Only the elbow needs to move"], a: 1,
        why: "A straight line in the room is a curve in joint space, and now your head has to be the solver. That is why LeRobot's leader arm exists: you move a copy of the arm and the follower copies its joint angles, so nobody has to do this in their head." } },
    { id: "far", title: "Reach the far corner", unit: "Unit 2", mode: "drive", spots: FAR_SPOTS,
      goal: "This cube is near the edge of reach. Push past the edge and feel what the arm does, then bring the cube in.",
      ask: { type: "mc", q: "What happens as you push the hand out toward the edge of reach?", o: ["The arm keeps stretching for as long as you hold the key", "Over the last stretch the jaws tip forward, then the hand stops: the arm has run out of length", "It swings round the other way"], a: 1,
        why: "The two links are 116 and 135 mm, so the wrist can't get more than 251 mm from the shoulder: tab 1's outer ring. Pointing the jaws straight down costs reach, so the solver trades the pointing-down rule for distance first: over roughly the last 10 cm the jaws tip forward, then the arm is straight and the hand stops. The edge is the geometry of the links, not a motor hitting a stop." } },
    { id: "record", title: "Record a demonstration", unit: "Unit 1", mode: "drive", spots: SPOTS, needs: "rec",
      goal: "Press Record, then put the cube in the bin. Recording stops by itself when the cube lands in the bin.",
      ask: { type: "num", q: "At 30 rows a second, how many rows is a 6-second demonstration?", a: 180, tol: 0,
        why: "180 rows, each with six numbers of state (where the joints were) and six of action (where they were told to go). Those are the two tables a LeRobot dataset keeps for the SO-101, under the same names; the real one also stores its camera images and a few bookkeeping columns, and its gripper action is a position rather than open or closed. The Unit 1 page shows what a policy fetches from rows like these." } },
    { id: "blind", title: "Replay it blind", unit: "Unit 2", mode: "replay", spots: SPOTS, needs: "episode",
      goal: "The cube has been moved 4 cm. Replay your recording and watch.",
      ask: { type: "mc", q: "The cube moved 4 cm. Will the replay still put it in the bin?", o: ["Yes: the gripper closes anyway, so it will grab it", "No: a replay only repeats joint angles, and the cube is no longer where the jaws close", "Yes, if the replay runs slower"], a: 1,
        why: "Open loop. The recording never looked at the cube, so it can only work if the world is exactly as it was. This is why the course's policies take an observation at every step, and why a dataset stores the camera images next to the joint angles." } },
    { id: "lag", title: "Drive through lag", unit: "Unit 2", mode: "drive", spots: SPOTS, lag: 6,
      goal: "Same task, but every command now arrives 200 ms late, like a robot on the far end of a network.",
      ask: { type: "mc", q: "With 200 ms of delay, the safe way to drive is…", o: ["Small moves, then wait and look", "Bigger moves, to make up the lost time", "The same as before; 200 ms is nothing"], a: 0,
        why: "Every command lands a fifth of a second late, so what you see is where your commands from a fifth of a second ago have put the arm. Tab 4 showed the same thing as a graph: delay plus hard pushing makes a loop overshoot." } },
    { id: "teach", title: "Teach it", unit: "Unit 4", mode: "teach", spots: SPOTS,
      goal: "Record one demonstration and train on it. Then record three or four more from different spots and train again. Each time, the policy is tried on eight spots it has never seen.",
      ask: { type: "mc", q: "Which policy manages more of the eight new spots: one trained on a single demonstration, or one trained on four from different spots?", o: ["The single one: extra demonstrations only confuse it", "The four: seeing the cube in several places is what makes it use the cube's position", "The same: it is the same task either way"], a: 1,
        why: "With one demonstration the network has only ever seen the cube in one place, so 'go to the cube' and 'go to that spot' look the same to it, and new spots are hit or miss. Demonstrations from several spots force it to use the cube's position relative to the gripper, which is what this toy is handed directly. The course's ACT (Action Chunking with Transformers) has to find the cube in camera images instead, which is why the real SO-101 dataset has fifty episodes, not four." } },
  ];

  return { FPS, TOP, HALF, GRASP_MM, HOME, PSI, BIN, SPOTS, FAR_SPOTS, inBin, basis, pitchOf, relOf, posOf, ikStep, world, placeCube, step, handOf, cubeWorld, tryGrasp, release,
    recorder, record, finish, sample, replay, sameEnd, features, dataset, mlp, forward, train, act, rollout, scorePolicy, TEST_SPOTS, demonstrate, ticks, MISSIONS, V_SCALE };
})();
// ================= end workbench core =================
if (typeof window !== "undefined") window.WB = WB;
if (typeof importScripts === "function" && typeof document === "undefined") self.onmessage = (e) => { const p = WB.train(WB.mlp(1), WB.dataset(e.data.demos)); p.demos = e.data.demos.length; self.postMessage(p); };

// ================= view (browser only) =================
(() => {
  if (typeof document === "undefined" || !document.getElementById("gl")) return;
  const $ = (id) => document.getElementById(id), D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const { fk, sub, add, scale, len, dot, CHAIN, FACTS } = K3, { FPS, TOP, HALF, BIN, SPOTS, MISSIONS } = WB;
  if (typeof THREE === "undefined") { $("fail").hidden = false; return; }
  const V = (X) => new THREE.Vector3(X[0], X[2], -X[1]); // K3: x front, y left, z up (mm). three: y up.
  const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const store = { get(k, d) { try { const v = localStorage.getItem("armwb:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("armwb:" + k, JSON.stringify(v)); } catch (e) {} } };

  // ---------- renderer and the room ----------
  const canvas = $("gl"); let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { $("fail").hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(cssVar("--sky")); scene.fog = new THREE.Fog(C(cssVar("--sky")), 2200, 5200);
  scene.add(new THREE.HemisphereLight(C("#e9f1f8"), C("#b7a78c"), 0.85));
  const sun = new THREE.DirectionalLight(C("#fff1dd"), 1.15); sun.position.set(-420, 980, 520); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; Object.assign(sun.shadow.camera, { left: -620, right: 620, top: 620, bottom: -620, near: 100, far: 2400 }); sun.target.position.set(170, 0, 30); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(C("#cfe0ff"), 0.28); fill.position.set(600, 400, -500); scene.add(fill);
  const std = (hex, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color: C(hex), roughness: rough, metalness: metal });
  const mesh = (geo, mat, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
  const floor = mesh(new THREE.PlaneGeometry(9000, 9000), std("#aeb6bd", 0.95), false); floor.rotation.x = -Math.PI / 2; floor.position.y = -760; scene.add(floor);
  const wallTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#dfe5e9"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#b9c3ca";
    for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 13); t.encoding = THREE.sRGBEncoding; return t; })();
  const wall = mesh(new THREE.PlaneGeometry(5200, 2600), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), false); wall.position.set(900, 500, 0); wall.rotation.y = -Math.PI / 2; scene.add(wall);
  const bench = mesh(new THREE.BoxGeometry(1250, 44, 1500), std("#d9c4a1", 0.75)); bench.position.set(290, -22.2, 0); scene.add(bench);
  const apron = mesh(new THREE.BoxGeometry(1190, 90, 1440), std("#8f7a5c", 0.85)); apron.position.set(290, -89, 0); scene.add(apron);
  for (const [x, z] of [[-270, -690], [-270, 690], [850, -690], [850, 690]]) { const leg = mesh(new THREE.BoxGeometry(70, 720, 70), std("#8f7a5c", 0.85)); leg.position.set(x, -400, z); scene.add(leg); }
  const matTex = (() => { const c = document.createElement("canvas"); c.width = 1240; c.height = 920; const g = c.getContext("2d"); g.fillStyle = cssVar("--mat"); g.fillRect(0, 0, 1240, 920);
    for (let mm = 10; mm <= 610; mm += 50) { const bold = (mm - 10) % 100 === 0; g.strokeStyle = bold ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.2)"; g.lineWidth = bold ? 2.2 : 1.2; g.beginPath(); g.moveTo(mm * 2, 20); g.lineTo(mm * 2, 900); g.stroke(); }
    for (let mm = 30; mm <= 430; mm += 50) { const bold = (mm - 30) % 100 === 0; g.strokeStyle = bold ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.2)"; g.lineWidth = bold ? 2.2 : 1.2; g.beginPath(); g.moveTo(20, mm * 2); g.lineTo(1220, mm * 2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; })();
  const mat = mesh(new THREE.BoxGeometry(620, 3, 460), [std("#2f605b"), std("#2f605b"), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.9 }), std("#2f605b"), std("#2f605b"), std("#2f605b")], false); mat.position.set(190, 1.5, 0); scene.add(mat);
  const binMat = std(cssVar("--bin"), 0.55), BINGLOW = C("#7dffb0");
  { const g = new THREE.Group(), h = BIN.half + BIN.t; const fl = mesh(new THREE.BoxGeometry(2 * h, BIN.t, 2 * h), binMat); fl.position.y = BIN.t / 2; g.add(fl);
    for (const [dx, dz, sx, sz] of [[h - BIN.t / 2, 0, BIN.t, 2 * h], [-h + BIN.t / 2, 0, BIN.t, 2 * h], [0, h - BIN.t / 2, 2 * h, BIN.t], [0, -h + BIN.t / 2, 2 * h, BIN.t]]) { const wl = mesh(new THREE.BoxGeometry(sx, BIN.wall, sz), binMat); wl.position.set(dx, BIN.wall / 2, dz); g.add(wl); }
    g.position.copy(V([BIN.c[0], BIN.c[1], TOP])); scene.add(g); }
  const cube = mesh(new THREE.BoxGeometry(2 * HALF, 2 * HALF, 2 * HALF), std(cssVar("--cube"), 0.5)); scene.add(cube);
  const GLOW = C("#ffb347"), NOGLOW = new THREE.Color(0x000000);
  // the arm: simplified shapes in the real arm's colours, placed on K3's joint frames
  const YEL = std(cssVar("--arm"), 0.55), BLK = std("#1c1f23", 0.45, 0.1), GREY = std("#3a4047", 0.6);
  const Z = fk([0, 0, 0, 0, 0]), PTS0 = [[0, 0, 0], ...Z.P, Z.T], UP = new THREE.Vector3(0, 1, 0);
  const links = [1, 2, 3, 4].map((i) => ({ i, m: mesh(new THREE.CapsuleGeometry([15, 14, 13, 11][i - 1], len(sub(PTS0[i + 1], PTS0[i])), 6, 14), YEL) })); links.forEach((l) => scene.add(l.m));
  const servos = [0, 1, 2, 3, 4].map((k) => { const m = mesh(new THREE.BoxGeometry(k === 4 ? 27 : k ? 32 : 24, k === 4 ? 27 : k ? 32 : 24, k === 4 ? 32 : k ? 48 : 30), BLK); scene.add(m); return m; });
  { const base = mesh(new THREE.BoxGeometry(118, 16, 96), YEL); base.position.copy(V([24, 0, TOP + 8])); scene.add(base);
    const post = mesh(new THREE.CylinderGeometry(30, 34, Z.P[0][2] - 16, 20), GREY); post.position.copy(V([Z.P[0][0], 0, TOP + 8 + (Z.P[0][2] - 16) / 2])); scene.add(post); }
  const palm = mesh(new THREE.BoxGeometry(30, 36, 44), YEL), jawA = mesh(new THREE.BoxGeometry(9, 22, 66), YEL), jawB = mesh(new THREE.BoxGeometry(9, 22, 66), YEL), camBody = mesh(new THREE.BoxGeometry(20, 18, 20), BLK);
  scene.add(palm, jawA, jawB, camBody);
  const ring = new THREE.Mesh(new THREE.RingGeometry(9, 12, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const dropLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); scene.add(dropLine);
  const cam = new THREE.PerspectiveCamera(38, 1, 10, 9000), wrist = new THREE.PerspectiveCamera(74, 4 / 3, 4, 6000);
  const orbit = { yaw: -2.02, pitch: 0.42, dist: 900, look: [185, -40, 75] };
  function placeCam(narrow) { const L = V(narrow ? [orbit.look[0], orbit.look[1], orbit.look[2] + 40] : orbit.look), cp = Math.cos(orbit.pitch), d = orbit.dist * (narrow ? 1.5 : 1); cam.fov = narrow ? 50 : 38;
    cam.position.set(L.x + d * cp * Math.sin(orbit.yaw), L.y + d * Math.sin(orbit.pitch), L.z + d * cp * Math.cos(orbit.yaw)); cam.lookAt(L); }

  // ---------- page state ----------
  const S = { m: 0, mode: "drive", w: null, gripCmd: 0, keys: {}, stick: [0, 0], tUp: false, tDown: false, jointHold: [0, 0, 0, 0, 0], wristView: false,
    ep: null, episodes: [], demos: [], policy: null, play: null, playEp: null, nudge: 0, polAcc: 0, polT: 0, runSpot: null, demoSpot: 0, testSpot: 0,
    done: store.get("done", {}), asked: store.get("ask", {}), times: {}, flash: 0, toastT: 0, hud: 0, spot: 0, cubeRelQ: null, started: false, acc: 0, lastState: null, teachLines: [], scores: [] };
  const M = MISSIONS;
  const mission = () => M[S.m];

  function newWorld(spot, yaw = 0) { const m = mission(); S.w = WB.world(spot, { lag: m.lag || 0, yaw }); S.gripCmd = 0; S.cubeRelQ = null; S.flash = 0; S.respawn = 0; S.edgeDemo = 0; S.lastState = null; S.demoPlaying = false; }
  function nextSpot() { const m = mission(), s = m.spots[S.spot % m.spots.length]; S.spot++; return s; }
  function startMission(i, fromLink) {
    S.m = clamp(i, 0, M.length - 1); store.set("m", S.m); const m = mission(); S.ep = null; S.play = null; S.playEp = null; S.jointHold = [0, 0, 0, 0, 0];
    S.mode = m.mode === "joint" ? "joint" : "drive"; newWorld(nextSpot());
    if (m.id === "blind") { const ep = S.episodes[S.episodes.length - 1]; if (ep) { S.nudge = 40; S.w = WB.world([ep.cube.p[0], ep.cube.p[1] + 40], { yaw: ep.cube.yaw }); } }
    renderMission(); if (!fromLink) toast(`Mission ${S.m + 1}: ${m.title}`, "rec");
  }
  function markDone(id) { if (S.done[id]) return; S.done[id] = 1; store.set("done", S.done); renderDots(); }

  // ---------- the mission card ----------
  function renderDots() { $("mDots").innerHTML = M.map((m, k) => `<button aria-label="Mission ${k + 1}" class="${k === S.m ? "cur" : S.done[m.id] ? "done" : ""}" data-k="${k}"></button>`).join("");
    $("mDots").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => startMission(+b.dataset.k))); }
  function renderMission() {
    const m = mission(); $("mUnit").textContent = m.unit; $("mCount").textContent = `mission ${S.m + 1} of ${M.length}`; $("mTitle").textContent = m.title; $("mGoal").textContent = m.goal; renderDots();
    const A = m.ask, box = $("mAsk"), key = m.id;
    if (A.type === "num") { box.innerHTML = `<div class="ask"><div class="q">🤔 Predict: ${A.q}</div><div class="btns"><input type="number" step="any" id="ansIn" aria-label="Your answer"><button id="ansBtn">Check</button><button id="ansShow">Show answer</button></div><div class="fb" id="ansFb"></div></div>`;
      const check = (reveal) => { const v = parseFloat($("ansIn").value), ok = !reveal && Math.abs(v - A.a) <= A.tol; $("ansFb").className = "fb " + (ok ? "good" : reveal ? "" : "no");
        $("ansFb").innerHTML = (ok ? "✓ Right." : reveal ? `Answer: <b>${A.a}</b>.` : isNaN(v) ? "Type a number first." : "Not quite. Try again, or show the answer.") + (ok || reveal ? `<span class="why">${A.why}</span>` : ""); if (ok || reveal) { S.asked[key] = 1; store.set("ask", S.asked); } };
      $("ansBtn").onclick = () => check(false); $("ansShow").onclick = () => check(true); $("ansIn").addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") check(false); }); }
    else { box.innerHTML = `<div class="ask"><div class="q">🤔 ${A.q}</div><div class="opts">${A.o.map((o, k) => `<button data-k="${k}">${o}</button>`).join("")}</div><div class="fb" id="ansFb"></div></div>`;
      box.querySelectorAll(".opts button").forEach((b) => b.addEventListener("click", () => { const ok = +b.dataset.k === A.a; b.classList.add(ok ? "right" : "wrong"); $("ansFb").className = "fb " + (ok ? "good" : "no");
        $("ansFb").innerHTML = ok ? `✓ Right.<span class="why">${A.why}</span>` : "Not that one. Try another."; if (ok) { S.asked[key] = 1; store.set("ask", S.asked); } })); }
    const B = $("mBtns"); B.innerHTML = "";
    if (m.id === "record" || m.mode === "drive" && m.id !== "far") { B.innerHTML += `<button id="bRec" class="rec" aria-pressed="false" title="Record your driving, 30 frames a second (R)">● Record</button>`; }
    if (m.id === "blind") { B.innerHTML += `<button id="bPlay" title="Replay the last recording with the cube where it was (P)">▶ Replay as recorded</button><button id="bNudge" class="primary" title="Move the cube 4 cm, then replay the same recording (N)">Nudge 4 cm, then replay</button>`; }
    if (m.id === "far") B.innerHTML += `<button id="bEdge" title="Push the hand to the edge of reach for you">Show the edge</button>`;
    if ($("bRec")) $("bRec").onclick = () => (S.ep ? stopRec(false) : startRec());
    if ($("bPlay")) $("bPlay").onclick = () => startReplay(0); if ($("bNudge")) $("bNudge").onclick = () => startReplay(40);
    if ($("bEdge")) $("bEdge").onclick = () => { S.edgeDemo = 2.5; };
    $("teach").hidden = m.id !== "teach"; $("bPrev").disabled = S.m === 0; $("bNext").textContent = S.m === M.length - 1 ? "Done ✓" : "Next mission →";
    $("keysDrive").hidden = S.mode === "joint"; $("keysJoint").hidden = S.mode !== "joint"; $("joints").hidden = S.mode !== "joint"; $("stick").style.display = S.mode === "joint" ? "none" : ""; $("tup").style.display = $("tdown").style.display = S.mode === "joint" ? "none" : "";
    if (m.id === "blind" && !S.episodes.length) { $("mGoal").innerHTML = `First record a demonstration in mission 4. <button id="bGo4">Go to mission 4</button>`; $("bGo4").onclick = () => startMission(3); }
    syncButtons(); teachLog();
  }
  function syncButtons() { const r = $("bRec"); if (r) { r.setAttribute("aria-pressed", !!S.ep); r.textContent = S.ep ? "■ Stop" : "● Record"; r.disabled = S.mode !== "drive" && S.mode !== "joint"; }
    const ep = S.episodes[S.episodes.length - 1]; if ($("bPlay")) $("bPlay").disabled = !ep || S.mode === "replay"; if ($("bNudge")) $("bNudge").disabled = !ep || S.mode === "replay";
    $("bDemo").setAttribute("aria-pressed", !!S.ep); $("bDemo").textContent = S.ep ? "■ Stop" : "● Record a demo"; $("bTrain").disabled = !S.demos.length || S.mode !== "drive" || !!S.training; $("bTrain").textContent = S.demos.length ? `Train on ${S.demos.length} demo${S.demos.length > 1 ? "s" : ""}` : "Train";
    $("bRun").disabled = !S.policy || S.mode !== "drive"; $("bShow").disabled = S.mode !== "drive"; $("bView").setAttribute("aria-pressed", S.wristView); }
  function teachLog() { const L = $("teachLog"); L.innerHTML = (S.demos.length ? `<b>${S.demos.length} demonstration${S.demos.length > 1 ? "s" : ""}</b>, ${S.demos.reduce((n, e) => n + e.frames.length, 0)} rows` + (S.policy ? ` · policy trained on ${S.policy.demos}` : "") : "no demonstrations yet") + S.teachLines.slice(-7).map((l) => "<br>" + l).join(""); }

  // ---------- recording, replay, policy ----------
  function startRec() { const w = S.w; if (S.mode !== "drive" && S.mode !== "joint") return; if (w.cube.state !== "rest" || WB.inBin(w.cube.p) || w.held) { toast("Wait for a fresh cube on the mat, then record.", "bad"); return; }
    S.ep = WB.recorder(w); toast("Recording. It stops by itself when the cube lands in the bin, or press Stop.", "rec"); syncButtons(); }
  function stopRec(delivered) { const ep = S.ep; S.ep = null; if (!ep || ep.frames.length < 10) { if (!delivered) toast("Too short to keep.", "bad"); syncButtons(); return; }
    WB.finish(ep, S.w); S.episodes.push(ep); if (mission().id === "teach") { S.demos.push(ep); S.teachLines.push(`demo ${S.demos.length}: ${ep.frames.length} rows, cube at (${Math.round(ep.cube.p[0])}, ${Math.round(ep.cube.p[1])})`); }
    if (!delivered) toast(`Recording stopped: ${ep.frames.length} rows.`, "rec"); syncButtons(); teachLog(); }
  function startReplay(nudge) { const ep = S.episodes[S.episodes.length - 1]; if (!ep || S.ep) return; S.nudge = nudge;
    S.w = WB.world([ep.cube.p[0], ep.cube.p[1] + nudge], { yaw: ep.cube.yaw }); S.cubeRelQ = null; S.playEp = ep; S.play = { x: -0.5 * FPS, gi: 0, from: S.w.q.slice() }; S.mode = "replay";
    toast(nudge ? `The cube has moved ${nudge / 10} cm. Replaying the same joint angles.` : "Replaying your recorded joint angles.", "rec"); syncButtons(); }
  function endReplay() { const ep = S.playEp, w = S.w, m = mission(), same = WB.sameEnd(ep, w); S.mode = m.mode === "joint" ? "joint" : "drive"; w.lag = m.lag || 0; S.play = null; S.playEp = null; S.gripCmd = w.held ? 1 : 0;
    if (S.demoPlaying) { S.demoPlaying = false; toast("That demonstration is saved. Record more, or train.", "ok"); }
    else if (same && !S.nudge) toast("The replay matched your recording: nothing had changed, so the same joint angles did the same job.", "ok");
    else if (same) toast("It still landed: the jaws happened to catch the moved cube. Luck, not looking; a replay only repeats joint angles.", "ok");
    else toast(S.nudge ? "Missed. A replay only repeats joint angles. It never looked at the cube." : "The replay came out differently from your recording.", "bad");
    if (S.nudge && m.id === "blind") markDone("blind"); if (w.landedInBin) S.respawn = 1.6; syncButtons(); }
  function showDemo() { if (S.mode !== "drive" || S.ep) return; const spot = SPOTS[S.demoSpot % SPOTS.length]; S.demoSpot++; const ep = WB.demonstrate(spot); S.demos.push(ep); S.episodes.push(ep);
    S.teachLines.push(`demo ${S.demos.length} (built-in): ${ep.frames.length} rows, cube at (${spot[0]}, ${spot[1]})`); S.w = WB.world(spot); S.cubeRelQ = null; S.playEp = ep; S.play = { x: -0.5 * FPS, gi: 0, from: S.w.q.slice() }; S.mode = "replay"; S.demoPlaying = true; S.nudge = 0; syncButtons(); teachLog(); }
  function trainPolicy() { if (!S.demos.length || S.training) return; const rows = S.demos.reduce((n, e) => n + e.frames.length, 0), t = performance.now(), demos = S.demos.slice(); S.training = true; S.toastT = 99;
    toast(`Training on ${rows} rows from ${demos.length} demonstration${demos.length > 1 ? "s" : ""}…`, "rec"); syncButtons();
    const finished = (p, via) => { S.training = false; S.policy = p; p.demos = demos.length; S.trainedVia = via; S.teachLines.push(`trained on ${demos.length} demo${demos.length > 1 ? "s" : ""} in ${((performance.now() - t) / 1000).toFixed(1)} s`); toast("Trained. Now run it on a spot it has never seen.", "ok"); syncButtons(); teachLog(); };
    const sync = () => setTimeout(() => finished(WB.train(WB.mlp(1), WB.dataset(demos)), "page"), 30); // same arithmetic on the page's own thread
    try { const wk = new Worker("workbench.js"); wk.onmessage = (e) => { wk.terminate(); finished(e.data, "worker"); }; wk.onerror = () => { wk.terminate(); sync(); }; wk.postMessage({ demos }); } catch (e) { sync(); } }
  function runPolicy() { if (!S.policy || S.mode !== "drive" || S.ep) return;
    const results = WB.scorePolicy(S.policy), k = results.filter((r) => r.ok).length, n = S.policy.demos, i = S.testSpot % results.length; S.testSpot++; // scored on all eight fresh spots first; then one is played
    S.scores.push({ n, k }); S.teachLines.push(`${n} demo${n > 1 ? "s" : ""} → <b>${k} of ${results.length}</b> new spots delivered`);
    const spot = WB.TEST_SPOTS[i]; S.runSpot = spot; S.runOk = results[i].ok; S.w = WB.world(spot); S.cubeRelQ = null; S.mode = "policy"; S.polAcc = 0; S.polT = 0; S.gripCmd = 0; S.lastState = null;
    toast(`${k} of ${results.length} new spots delivered. Watch spot ${i + 1}, (${spot[0]}, ${spot[1]}).`, "rec"); if (n >= 3 && k >= 6) markDone("teach"); syncButtons(); teachLog(); }
  function endPolicy(ok) { const w = S.w; S.mode = "drive"; S.gripCmd = w.held ? 1 : 0; const last = S.scores[S.scores.length - 1], prev = S.scores.slice(0, -1).find((x) => x.n < last.n);
    toast(ok ? `Delivered from a spot it never saw${prev ? `. With ${prev.n} demo${prev.n > 1 ? "s" : ""} it managed ${prev.k} of 8; with ${last.n}, ${last.k}` : ""}.` : last.n < 3 ? `Missed here. With ${last.n} demo${last.n > 1 ? "s" : ""} it managed ${last.k} of 8; add demonstrations from other spots and train again.` : `Missed here; ${last.k} of 8 overall. More demonstrations from new spots usually help.`, ok ? "ok" : "bad");
    if (w.landedInBin) S.respawn = 1.6; syncButtons(); teachLog(); }

  // ---------- per-frame ----------
  function onDelivered() { const w = S.w, m = mission(), secs = w.t0 == null ? 0 : w.clock - w.t0, wasRecording = !!S.ep; S.flash = 1;
    if (S.ep) stopRec(true);
    if (S.mode === "drive" || S.mode === "joint") { toast(`In the bin · ${secs.toFixed(1)} s`, "ok"); S.times[m.id] = secs;
      if (m.id === "record") { if (wasRecording) { markDone("record"); toast(`In the bin · ${secs.toFixed(1)} s · episode saved: ${S.episodes[S.episodes.length - 1].frames.length} rows`, "ok"); } else toast(`In the bin · ${secs.toFixed(1)} s. That one wasn't recorded: press Record first.`, "bad"); }
      else if (m.id === "teach") { if (wasRecording) toast(`Demo ${S.demos.length} saved · ${secs.toFixed(1)} s`, "ok"); }
      else if (["pick", "joints", "far", "lag"].includes(m.id) && S.mode === (m.mode === "joint" ? "joint" : "drive")) { markDone(m.id); if (m.id !== "pick" && S.times.pick != null) toast(`In the bin · ${secs.toFixed(1)} s (mission 1 took you ${S.times.pick.toFixed(1)} s)`, "ok"); }
      S.respawn = 1.6; } }
  function simStep() { // one 1/30 s step of the world, whatever the display's refresh rate
    const w = S.w, dt = 1 / FPS;
    if (S.mode === "drive" || S.mode === "joint") {
      let input = { gripCmd: S.gripCmd };
      if (S.mode === "joint") input.joint = S.jointHold.map((h) => h * 1.1 * dt);
      else { const ix = (S.keys.d || S.keys.arrowright ? 1 : 0) - (S.keys.a || S.keys.arrowleft ? 1 : 0) + S.stick[0], iy = (S.keys.w || S.keys.arrowup ? 1 : 0) - (S.keys.s || S.keys.arrowdown ? 1 : 0) + S.stick[1], iz = (S.keys.e || S.tUp ? 1 : 0) - (S.keys.q || S.tDown ? 1 : 0);
        const fwd = [-Math.sin(orbit.yaw), Math.cos(orbit.yaw)], right = [fwd[1], -fwd[0]], sp = 210 * dt; // "forward" is into the screen, whichever way the view is turned
        input.move = [(fwd[0] * iy + right[0] * ix) * sp, (fwd[1] * iy + right[1] * ix) * sp, iz * 170 * dt];
        if (S.edgeDemo > 0) { S.edgeDemo -= dt; input.move = [fwd[0] * 230 * dt, fwd[1] * 230 * dt, 0]; } }
      const r = WB.step(w, input, dt); S.lastState = r.state; if (S.ep) WB.record(S.ep, w, r.state, r.events);
      if (r.events.landed && w.landedInBin) onDelivered();
    } else if (S.mode === "replay") {
      const P = S.play; if (P.x < 0) { P.x += 1; const u = 1 + P.x / (0.5 * FPS); w.q = P.from.map((v, k) => lerp(v, S.playEp.frames[0].a[k], clamp(u, 0, 1))); }
      else { const res = WB.replay(S.playEp, w, dt, P); S.lastState = res.r.state; if (res.r.events.landed && w.landedInBin) S.flash = 1; if (res.done) endReplay(); }
    } else if (S.mode === "policy") {
      S.polT += dt; const a = WB.act(S.policy, WB.handOf(w), WB.cubeWorld(w), w.held); S.gripCmd = a.gripCmd;
      const r = WB.step(w, { move: scale(a.v, dt), gripCmd: a.gripCmd }, dt); S.lastState = r.state; if (r.events.landed && w.landedInBin) { S.flash = 1; endPolicy(true); } else if (S.polT > 14) endPolicy(false);
    }
    if (S.respawn > 0) { S.respawn -= dt; if (S.respawn <= 0 && (S.mode === "drive" || S.mode === "joint")) { WB.placeCube(w, nextSpot(), 0.3 * (S.spot % 3)); S.cubeRelQ = null; } }
    S.flash = Math.max(0, S.flash - dt * 1.4); if (S.toastT > 0) { S.toastT -= dt; if (S.toastT <= 0) $("toast").hidden = true; }
  }
  function update(dt) { const t = WB.ticks(S.acc, dt); S.acc = t.acc; for (let i = 0; i < t.n; i++) simStep(); pose(); S.hud += dt; if (S.hud > 0.09) { S.hud = 0; hud(); } }

  // ---------- put every mesh where the world says ----------
  const Q = new THREE.Quaternion();
  const basisM = (f) => new THREE.Matrix4().makeBasis(V([f.RT[0][0], f.RT[1][0], f.RT[2][0]]), V([f.RT[0][1], f.RT[1][1], f.RT[2][1]]), V([f.RT[0][2], f.RT[1][2], f.RT[2][2]]));
  function pose() {
    const w = S.w, f = fk(w.q), pts = [[0, 0, TOP + 16], ...f.P, f.T];
    for (const l of links) { const a = V(pts[l.i]), b = V(pts[l.i + 1]), d = b.clone().sub(a); l.m.position.copy(a.add(b).multiplyScalar(0.5)); l.m.quaternion.setFromUnitVectors(UP, d.normalize()); }
    servos.forEach((m, k) => { const z = V(f.A[k]).normalize(), out = V(sub(pts[k + 2], pts[k + 1])); let x = out.sub(z.clone().multiplyScalar(out.dot(z))); if (x.lengthSq() < 1e-6) x = new THREE.Vector3(1, 0, 0).cross(z); x.normalize();
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, z.clone().cross(x), z)); m.position.copy(V(f.P[k])); });
    const [o, side, a] = WB.basis(f); Q.setFromRotationMatrix(basisM(f));
    const gap = lerp(64, w.held ? 2 * HALF : 5, w.grip);
    palm.quaternion.copy(Q); palm.position.copy(V(add(f.T, scale(a, -76))));
    jawA.quaternion.copy(Q); jawA.position.copy(V(add(add(f.T, scale(a, -26)), scale(o, gap / 2 + 4.5))));
    jawB.quaternion.copy(Q); jawB.position.copy(V(add(add(f.T, scale(a, -26)), scale(o, -gap / 2 - 4.5))));
    const up = scale(o, -1), cp = add(add(add(f.T, scale(a, -70)), scale(side, 44)), scale(up, 14)); // the wrist camera rides on the gripper's side, looking between the jaws
    camBody.quaternion.copy(Q); camBody.position.copy(V(add(cp, scale(a, -12)))); wrist.position.copy(V(cp)); wrist.up.copy(V(up)); wrist.lookAt(V(add(f.T, scale(a, 26))));
    if (w.held) { if (!S.cubeRelQ) S.cubeRelQ = Q.clone().invert().multiply(cube.quaternion); cube.position.copy(V(WB.cubeWorld(w))); cube.quaternion.copy(Q).multiply(S.cubeRelQ); }
    else { if (S.cubeRelQ) { const e = new THREE.Euler().setFromQuaternion(cube.quaternion, "YXZ"); w.cube.yaw = e.y; S.cubeRelQ = null; } cube.position.copy(V(w.cube.p)); cube.quaternion.setFromAxisAngle(UP, w.cube.yaw); }
    cube.material.emissive.copy(!w.held && w.cube.state === "rest" && w.grip < 0.5 && len(sub(w.cube.p, f.T)) < WB.GRASP_MM ? GLOW : NOGLOW); cube.material.emissiveIntensity = 0.28;
    binMat.emissive.copy(BINGLOW).multiplyScalar(Math.max(0, S.flash));
    const under = V([f.T[0], f.T[1], TOP + 0.6]); ring.position.copy(under); dropLine.geometry.setFromPoints([V(f.T), under]);
  }

  // ---------- HUD ----------
  const NAMES = ["shoulder_pan.pos", "shoulder_lift.pos", "elbow_flex.pos", "wrist_flex.pos", "wrist_roll.pos", "gripper.pos"];
  $("rows").innerHTML = NAMES.map((n, k) => `<tr><td>${n}</td><td id="s${k}"></td><td id="a${k}"></td></tr>`).join("");
  const fmt = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
  function hud() { const w = S.w, m = mission();
    const st = S.lastState || w.q; for (let k = 0; k < 5; k++) { $("s" + k).textContent = fmt(st[k] * R2D) + "°"; $("a" + k).textContent = fmt(w.act[k] * R2D) + "°"; }
    $("s5").textContent = Math.round(w.grip * 100) + "%"; $("a5").textContent = w.gripCmd ? "close" : "open";
    const secs = w.t0 == null || S.respawn > 0 ? 0 : w.clock - w.t0;
    $("score").textContent = `delivered ${w.delivered} · this cube ${secs.toFixed(1)} s` + (w.edge > 0 && S.mode === "drive" ? " · edge of reach" : "") + (w.lag ? ` · lag ${Math.round(w.lag * 1000 / FPS)} ms` : "");
    const ep = S.episodes[S.episodes.length - 1];
    $("episode").innerHTML = S.ep ? `<b>● recording</b> · ${S.ep.frames.length} frames · ${(S.ep.frames.length / FPS).toFixed(1)} s` : S.mode === "policy" ? `<b>policy driving</b> · ${S.polT.toFixed(1)} s` : ep ? `<b>episode ${S.episodes.length - 1}</b> · ${ep.frames.length} frames · ${(ep.frames.length / FPS).toFixed(1)} s · 30 fps · 6 in, 6 out` : "no episode recorded yet";
    if (S.mode === "joint") for (let k = 0; k < 5; k++) { const o = $("jo" + k); if (o) o.value = fmt(w.q[k] * R2D) + "°"; } }
  function toast(msg, kind) { const el = $("toast"); el.textContent = msg; el.dataset.kind = kind || ""; el.hidden = false; S.toastT = kind === "rec" ? 3.4 : 5; }

  // ---------- drawing ----------
  const insetText = () => { $("insetLabel").textContent = S.wristView ? "operator view" : canvas.clientWidth < 760 ? "gripper camera" : "gripper camera · the kind of image a policy is fed"; };
  function render() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
    const narrow = w < 760, iw = Math.round(clamp(w * (narrow ? 0.36 : 0.24), 124, 320)), ih = Math.round(iw * 0.75), ix = w - 16 - iw, iyTop = narrow ? Math.round($("head").getBoundingClientRect().bottom - canvas.getBoundingClientRect().top) + 10 : h - 16 - ih;
    const el = $("inset"); el.style.width = iw + "px"; el.style.height = ih + "px"; el.style.left = ix - 2 + "px"; el.style.top = iyTop - 2 + "px";
    const main = S.wristView ? wrist : cam, small = S.wristView ? cam : wrist;
    placeCam(narrow); main.aspect = w / h; main.updateProjectionMatrix(); ring.visible = dropLine.visible = !S.wristView;
    renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.render(scene, main);
    small.aspect = iw / ih; small.updateProjectionMatrix(); ring.visible = dropLine.visible = S.wristView;
    renderer.setScissorTest(true); renderer.setScissor(ix, h - iyTop - ih, iw, ih); renderer.setViewport(ix, h - iyTop - ih, iw, ih); renderer.render(scene, small); renderer.setScissorTest(false);
  }

  // ---------- input ----------
  const KEYS = new Set(["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
  const begin = () => { if (!S.started) { S.started = true; $("start").hidden = true; } };
  window.addEventListener("keydown", (ev) => { if (ev.metaKey || ev.ctrlKey || ev.altKey) return; if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) return; begin(); const k = ev.key.toLowerCase();
    if (/^Digit[1-5]$/.test(ev.code) && S.mode === "joint") { S.jointHold[+ev.code[5] - 1] = ev.shiftKey ? -1 : 1; ev.preventDefault(); return; }
    if (KEYS.has(k)) { S.keys[k] = true; ev.preventDefault(); }
    else if (k === " ") { ev.preventDefault(); if (!ev.repeat && (S.mode === "drive" || S.mode === "joint")) S.gripCmd = S.gripCmd ? 0 : 1; }
    else if (ev.repeat) return;
    else if (k === "v") toggleView(); else if (k === "r") (mission().id === "teach" ? (S.ep ? stopRec(false) : startRec()) : $("bRec") && (S.ep ? stopRec(false) : startRec()));
    else if (k === "p") { if (mission().id === "teach") runPolicy(); else if (mission().id === "blind") startReplay(0); } else if (k === "n") (mission().id === "blind" ? startReplay(40) : startMission(S.m + 1)); });
  window.addEventListener("keyup", (ev) => { S.keys[ev.key.toLowerCase()] = false; if (/^Digit[1-5]$/.test(ev.code)) S.jointHold[+ev.code[5] - 1] = 0; if (ev.key === "Shift") S.jointHold = S.jointHold.map((h) => (h < 0 ? 0 : h)); });
  window.addEventListener("blur", () => { S.keys = {}; S.jointHold = [0, 0, 0, 0, 0]; });
  function toggleView() { S.wristView = !S.wristView; insetText(); syncButtons(); }
  $("bView").onclick = toggleView; $("bPrev").onclick = () => startMission(S.m - 1); $("bNext").onclick = () => { if (S.m < M.length - 1) startMission(S.m + 1); else toast("That's all seven missions. The five tabs have the math behind each one.", "ok"); };
  $("bReset").onclick = () => { if (S.ep) stopRec(false); S.mode = mission().mode === "joint" ? "joint" : "drive"; S.play = null; S.playEp = null; newWorld(nextSpot()); syncButtons(); };
  $("bDemo").onclick = () => (S.ep ? stopRec(false) : startRec()); $("bShow").onclick = showDemo; $("bTrain").onclick = trainPolicy; $("bRun").onclick = runPolicy;
  document.querySelectorAll("button").forEach((b) => b.addEventListener("keydown", (e) => { if (e.key === " ") e.preventDefault(); }));
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { begin(); drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; orbit.yaw = drag.yaw - (e.clientX - drag.x) * 0.006; orbit.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.005, 0.08, 1.35); });
  const endDrag = () => { drag = null; }; canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); orbit.dist = clamp(orbit.dist * (e.deltaY > 0 ? 1.07 : 0.93), 420, 1700); }, { passive: false });
  $("start").addEventListener("pointerdown", begin);
  { const st = $("stick"), kn = $("knob"); let id = null; const set = (e) => { const r = st.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n; } S.stick = [x, -y]; kn.style.transform = `translate(${x * 36}px, ${y * 36}px)`; };
    st.addEventListener("pointerdown", (e) => { id = e.pointerId; try { st.setPointerCapture(id); } catch (_) {} set(e); }); st.addEventListener("pointermove", (e) => { if (e.pointerId === id) set(e); });
    const up = () => { id = null; S.stick = [0, 0]; kn.style.transform = ""; }; st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    const hold = (el, on, off) => { el.addEventListener("pointerdown", (e) => { on(); try { el.setPointerCapture(e.pointerId); } catch (_) {} }); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); };
    hold($("tup"), () => { S.tUp = true; }, () => { S.tUp = false; }); hold($("tdown"), () => { S.tDown = true; }, () => { S.tDown = false; });
    $("tgrip").addEventListener("click", () => { if (S.mode === "drive" || S.mode === "joint") S.gripCmd = S.gripCmd ? 0 : 1; });
    const JN = ["Shoulder pan", "Shoulder lift", "Elbow", "Wrist flex", "Wrist roll"], JC = ["--warn", "--link1", "--link2", "--shelf", "--floor"];
    $("joints").innerHTML = JN.map((n, k) => `<div class="jrow"><button data-j="${k}" data-d="-1" aria-label="${n} one way">−</button><div class="jname"><span class="sw" style="background:${["#b87d00", "#2f6fdb", "#e0751f", "#6d5bd0", "#8a7a66"][k]}"></span><span>${n}</span></div><button data-j="${k}" data-d="1" aria-label="${n} the other way">+</button><output id="jo${k}"></output></div>`).join("");
    $("joints").querySelectorAll("button").forEach((b) => hold(b, () => { S.jointHold[+b.dataset.j] = +b.dataset.d; }, () => { S.jointHold[+b.dataset.j] = 0; })); }
  window.addEventListener("resize", insetText);

  // ---------- go ----------
  const hm = (location.hash.match(/m=(\d+)/) || [])[1]; S.m = hm ? clamp(+hm - 1, 0, M.length - 1) : clamp(store.get("m", 0), 0, M.length - 1);
  startMission(S.m, true); insetText(); hud();
  if (matchMedia("(pointer: fine)").matches && innerWidth > 760 && !/nostart/.test(location.hash)) $("start").hidden = false;
  let last = performance.now();
  function frame(t) { const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t; try { update(dt); render(); } catch (err) { console.error(err); } requestAnimationFrame(frame); }
  if (!window.__CAPTURE) requestAnimationFrame(frame);
  window.__wbv = { S, update, render, startMission, startRec, stopRec, startReplay, showDemo, trainPolicy, runPolicy, orbit, toggleView, hud };
})();
