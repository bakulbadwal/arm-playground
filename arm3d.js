"use strict";
/* Arm Playground · tab 5, "The real arm (3D)". Loaded by index.html the first time the tab is opened.
   No dependencies. The 3D picture is drawn on an ordinary 2D canvas with a hand-written projection,
   so it needs no WebGL and it opens from a downloaded file. */

// ================= kin3d (pure) =================
const K3 = (() => {
  const SOURCE = { repo: "TheRobotStudio/SO-ARM100", file: "Simulation/SO101/so101_new_calib.urdf", commit: "385e8d7", license: "Apache-2.0" };
  // Joint origins (mm: the URDF's metres × 1000), roll-pitch-yaw (radians, as written in the file) and limits (radians).
  // Every revolute joint in the file turns about its own z axis. test.mjs checks this table against docs/vendor/so101_new_calib.urdf.
  const CHAIN = [
    { name: "shoulder_pan",  xyz: [38.8353, -8.97657e-6, 62.4], rpy: [3.14159, 4.18253e-17, -3.14159],    lim: [-1.91986, 1.91986] },
    { name: "shoulder_lift", xyz: [-30.3992, -18.2778, -54.2],  rpy: [-1.5708, -1.5708, 0],               lim: [-1.74533, 1.74533] },
    { name: "elbow_flex",    xyz: [-112.57, -28, 1.73763e-13],  rpy: [-3.63608e-16, 8.74301e-16, 1.5708], lim: [-1.69, 1.69] },
    { name: "wrist_flex",    xyz: [-134.9, 5.2, 3.62355e-14],   rpy: [4.02456e-15, 8.67362e-16, -1.5708], lim: [-1.65806, 1.65806] },
    { name: "wrist_roll",    xyz: [5.55112e-14, -61.1, 18.1],   rpy: [1.5708, 0.0486795, 3.14159],        lim: [-2.74385, 2.84121] },
  ];
  const TOOL = { name: "gripper_frame_joint", xyz: [-7.9, -0.218121, -98.1274], rpy: [0, 3.14159, 0] };
  const N = CHAIN.length, TOL_MM = 0.1;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  const mul = (A, B) => { const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]; return C; };
  const mv = (A, v) => [dot(A[0], v), dot(A[1], v), dot(A[2], v)];
  // URDF fixed-axis roll-pitch-yaw: R = Rz(yaw) · Ry(pitch) · Rx(roll)
  function rpy(r, p, y) {
    const cr = Math.cos(r), sr = Math.sin(r), cp = Math.cos(p), sp = Math.sin(p), cy = Math.cos(y), sy = Math.sin(y);
    return [[cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr], [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr], [-sp, cp * sr, cp * cr]];
  }
  const rz = (t) => { const c = Math.cos(t), s = Math.sin(t); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  const RPY = CHAIN.map((j) => rpy(j.rpy[0], j.rpy[1], j.rpy[2])), TOOL_R = rpy(TOOL.rpy[0], TOOL.rpy[1], TOOL.rpy[2]);

  // Forward kinematics: walk the chain. For each joint: a fixed step to the joint (T_k), then a turn about its axis (R(q_k)).
  // Returns the five joint origins P (pan, lift, elbow, wrist flex, wrist roll), their world axes A, the fingertip T and its orientation RT.
  function fk(q) {
    let R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], p = [0, 0, 0]; const P = [], A = [];
    for (let k = 0; k < N; k++) {
      p = add(p, mv(R, CHAIN[k].xyz)); R = mul(R, RPY[k]);
      P.push(p); A.push([R[0][2], R[1][2], R[2][2]]);
      R = mul(R, rz(q[k]));
    }
    return { P, A, T: add(p, mv(R, TOOL.xyz)), RT: mul(R, TOOL_R) };
  }
  // The point we track: "W" = the wrist-flex joint (the end of the two links, the "hand" of tabs 1–4), "T" = the fingertip frame.
  const point = (f, poi) => (poi === "W" ? f.P[3] : f.T);

  // Geometric Jacobian. Column k = how the point moves per radian of joint k = axis_k × (point − joint_k). mm per radian.
  function jacCols(q, poi = "T") {
    const f = fk(q), X = point(f, poi), moves = poi === "W" ? 3 : N, cols = [];
    for (let k = 0; k < N; k++) cols.push(k < moves ? cross(f.A[k], sub(X, f.P[k])) : [0, 0, 0]);
    return cols;
  }
  // The full 6 × 5 Jacobian of the fingertip: v = position columns (mm/rad), w = orientation columns (the joint axes, rad/rad).
  function jac6(q) { const f = fk(q); return { v: f.P.map((Pk, k) => cross(f.A[k], sub(f.T, Pk))), w: f.A.map((a) => a.slice()) }; }

  function inv3(M) {
    const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) return null;
    return [[A / det, (c * h - b * i) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, (c * d - a * f) / det], [C / det, (b * g - a * h) / det, (a * e - b * d) / det]];
  }
  // Damped pseudo-inverse applied to an error: dq = Jᵀ (J Jᵀ + λ² I)⁻¹ e. Works for any number of columns (J is 3 × n).
  function dls(cols, e, lam) {
    const M = [[lam * lam, 0, 0], [0, lam * lam, 0], [0, 0, lam * lam]];
    for (const c of cols) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] += c[i] * c[j];
    const Mi = inv3(M); if (!Mi) return cols.map(() => 0);
    const y = mv(Mi, e); return cols.map((c) => dot(c, y));
  }
  function rank(rows, tol = 1e-7) {
    const A = rows.map((r) => r.slice()), nr = A.length, nc = A[0].length; let r = 0;
    for (let c = 0; c < nc && r < nr; c++) {
      let piv = r; for (let i = r + 1; i < nr; i++) if (Math.abs(A[i][c]) > Math.abs(A[piv][c])) piv = i;
      if (Math.abs(A[piv][c]) < tol) continue;
      [A[r], A[piv]] = [A[piv], A[r]];
      for (let i = r + 1; i < nr; i++) { const f = A[i][c] / A[r][c]; for (let j = c; j < nc; j++) A[i][j] -= f * A[r][j]; }
      r++;
    }
    return r;
  }
  // Rank of the 6 × 5 fingertip Jacobian. Position rows are scaled to decimetres so both blocks are of order 1.
  function rank6(q) { const J = jac6(q), rows = []; for (let i = 0; i < 3; i++) rows.push(J.v.map((c) => c[i] / 100)); for (let i = 0; i < 3; i++) rows.push(J.w.map((c) => c[i])); return rank(rows, 1e-6); }

  const clampQ = (q) => q.map((v, k) => Math.max(CHAIN[k].lim[0], Math.min(CHAIN[k].lim[1], v)));
  // Numerical IK by damped least squares on the free joints. Steps are capped so it moves smoothly and stays inside the joint limits.
  function solve(q0, target, free, poi = "T", opt = {}) {
    const lam = opt.lam == null ? 6 : opt.lam, maxIter = opt.maxIter == null ? 300 : opt.maxIter, tol = opt.tol == null ? TOL_MM / 5 : opt.tol, cap = opt.maxStep == null ? 40 : opt.maxStep;
    let q = clampQ(q0), err = Infinity, it = 0;
    for (; it < maxIter; it++) {
      const e = sub(target, point(fk(q), poi)); err = len(e); if (err < tol) break;
      const cols = jacCols(q, poi).map((c, k) => (free[k] ? c : [0, 0, 0]));
      let dq = dls(cols, err > cap ? scale(e, cap / err) : e, lam);
      const m = Math.max(...dq.map(Math.abs)); if (m > 0.2) dq = dq.map((x) => x * 0.2 / m);
      q = clampQ(q.map((v, k) => v + dq[k]));
    }
    if (it === maxIter) err = len(sub(target, point(fk(q), poi)));
    return { q, err, iters: it, ok: err < TOL_MM };
  }
  // One downhill search can stop at a joint limit, short of a target the arm can reach. So try several starts: where the arm is now,
  // then the pan aimed at the target (facing it, and facing away with the arm over the top) from a few bent poses, then seeded random poses.
  function solveBest(q0, target, free, poi = "T", opt = {}) {
    let best = solve(q0, target, free, poi, opt), tries = 1; if (best.ok) return { ...best, tries };
    const az = Math.atan2(target[1] - CHAIN[0].xyz[1], target[0] - CHAIN[0].xyz[0]), rnd = mulberry32(opt.seed == null ? 1 : opt.seed), starts = [];
    for (const pan of [-az, -az + Math.PI, -az - Math.PI]) for (const [l, e, w] of [[0, 0, 0], [-0.9, 1.2, 0.5], [0.9, -1.2, -0.3], [-1.4, 0.3, 1.2], [1.4, -0.3, -1.2]]) starts.push([pan, l, e, w, q0[4]]);
    for (let i = 0; i < 16; i++) starts.push(CHAIN.map((j) => j.lim[0] + rnd() * (j.lim[1] - j.lim[0])));
    for (const st0 of starts) { const r = solve(clampQ(st0.map((v, k) => (free[k] ? v : q0[k]))), target, free, poi, opt); tries++; if (r.err < best.err) best = r; if (best.ok) break; }
    return { ...best, tries };
  }
  // Self-motion: set the wrist-flex angle, then re-solve shoulder lift and elbow so the fingertip stays at `anchor`.
  function hold(q, anchor, wrist) { const q2 = q.slice(); q2[3] = wrist; return solve(q2, anchor, [false, true, true, false, false], "T", { maxIter: 200 }); }

  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // A seeded random sample of reachable positions: the free joints drawn uniformly inside their URDF limits, the rest held.
  function cloud(n, seed, free, qBase, poi = "T") {
    const rnd = mulberry32(seed), out = new Float32Array(n * 3), q = qBase.slice();
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < N; k++) if (free[k]) q[k] = CHAIN[k].lim[0] + rnd() * (CHAIN[k].lim[1] - CHAIN[k].lim[0]);
      const X = point(fk(q), poi); out[i * 3] = X[0]; out[i * 3 + 1] = X[1]; out[i * 3 + 2] = X[2];
    }
    return out;
  }

  // The arm's own vertical plane, the one tabs 1–4 draw. a = the pitch axis (the plane's normal), d = "forward" in the plane,
  // O = the pan joint. Points are returned as (u, z): u along d measured from the pan axis, z = height.
  // th1, th2 are the two angles of tabs 1–4 for the links S→E and E→W; th3 is the gripper's angle relative to the forearm.
  function planar(q) {
    const f = fk(q), a = f.A[1], dv = cross(a, [0, 0, 1]), d = scale(dv, 1 / len(dv)), O = f.P[0];
    const uz = (X) => [dot(sub(X, O), d), X[2]], S = uz(f.P[1]), E = uz(f.P[2]), W = uz(f.P[3]), R = uz(f.P[4]), T = uz(f.T);
    const th1 = Math.atan2(E[1] - S[1], E[0] - S[0]), th12 = Math.atan2(W[1] - E[1], W[0] - E[0]), th123 = Math.atan2(T[1] - W[1], T[0] - W[0]);
    return { a, d, O, S, E, W, R, T, th1, th2: wrap(th12 - th1), th3: wrap(th123 - th12), latS: dot(sub(f.P[1], O), a), latT: dot(sub(f.T, O), a) };
  }

  // Facts read off the URDF once, at the zero pose. The page prints these; nothing here is typed in by hand.
  const FACTS = (() => {
    const Q0 = [0, 0, 0, 0, 0], Z = fk(Q0), PZ = planar(Q0), deg = 180 / Math.PI;
    const L1 = len(sub(Z.P[2], Z.P[1])), L2 = len(sub(Z.P[3], Z.P[2]));
    const slope = (k, key) => { const q = Q0.slice(); q[k] = 0.1; return Math.round(wrap(planar(q)[key] - PZ[key]) / 0.1); };
    const S1 = slope(1, "th1"), S2 = slope(2, "th2"), S3 = slope(3, "th3");
    const range = CHAIN[2].lim.map((v) => PZ.th2 + S2 * v).sort((x, y) => x - y), has = (x) => range[0] <= x && x <= range[1];
    const reach = (t) => Math.sqrt(L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(t));
    const rel = sub(Z.T, Z.P[4]), along = dot(rel, Z.A[4]);
    const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))) * deg;
    // a grid over every pose at 5 degree steps: tabs 1-4's map (two full turns) against this arm's five limited joints
    const cells5 = CHAIN.reduce((n, j) => n * ((j.lim[1] - j.lim[0]) * deg / 5), 1);
    const th1r = CHAIN[1].lim.map((v) => PZ.th1 + S1 * v).sort((x, y) => x - y);
    // how far the fingertip sits to the side of the sheet through S, E, W: it depends on the wrist roll (the tip is off the roll axis)
    let tsMin = Infinity, tsMax = 0;
    for (let i = 0; i <= 640; i++) { const q = Q0.slice(); q[4] = CHAIN[4].lim[0] + (CHAIN[4].lim[1] - CHAIN[4].lim[0]) * i / 640; const pq = planar(q), v = Math.abs(pq.latT - pq.latS); tsMin = Math.min(tsMin, v); tsMax = Math.max(tsMax, v); }
    // slider stops, whole degrees inside each limit (a limit within 0.01° of a whole degree counts as that degree: the file's ±1.91986 rad is ±110°)
    const stop = (v, inward) => (Math.abs(Math.round(v) - v) < 0.01 ? Math.round(v) : inward(v));
    return {
      th1RangeDeg: th1r.map((v) => v * deg), tipSheet: { zero: Math.abs(PZ.latT - PZ.latS), min: tsMin, max: tsMax },
      sliderDeg: CHAIN.map((j) => [stop(j.lim[0] * deg, Math.ceil), stop(j.lim[1] * deg, Math.floor)]),
      th2RangeDeg: range.map((v) => v * deg), cells2: 72 * 72, cells5, rollOutOfPlane: Math.abs(dot(Z.A[4], Z.A[1])),
      L1, L2, L3: Math.hypot(PZ.T[0] - PZ.W[0], PZ.T[1] - PZ.W[1]),
      th1_0: PZ.th1, th2_0: PZ.th2, th3_0: PZ.th3, S1, S2, S3,
      reachOuter: has(0) ? L1 + L2 : Math.max(reach(range[0]), reach(range[1])),
      reachInner: has(Math.PI) || has(-Math.PI) ? Math.abs(L1 - L2) : Math.min(reach(range[0]), reach(range[1])),
      planeOffset: Math.abs(PZ.latS), tipOffset: Math.abs(PZ.latT), tipLever: len(sub(rel, scale(Z.A[4], along))),
      panTiltDeg: Math.min(ang(Z.A[0], [0, 0, 1]), ang(Z.A[0], [0, 0, -1])),
      pitchSpreadDeg: Math.max(ang(Z.A[1], Z.A[2]), ang(Z.A[1], Z.A[3])), panPerpDeg: Math.abs(90 - ang(Z.A[0], Z.A[1])),
      zeroTip: Z.T.slice(), limitsDeg: CHAIN.map((j) => j.lim.map((v) => v * deg)),
    };
  })();

  return { SOURCE, CHAIN, TOOL, N, TOL_MM, FACTS, fk, point, planar, jacCols, jac6, rank, rank6, dls, inv3, solve, solveBest, hold, cloud, clampQ, mulberry32, rpy, dot, sub, add, scale, cross, len, wrap };
})();
// ================= end kin3d =================

// ================= view (browser only) =================
const Arm3D = (() => {
  if (typeof document === "undefined") return null;
  const $ = (id) => document.getElementById(id), D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const { CHAIN, FACTS, fk, planar, jacCols, jac6, rank6, solve, solveBest, hold, cloud, clampQ, dot, sub, add, scale, len } = K3;
  const NAMES = ["Shoulder pan", "Shoulder lift", "Elbow", "Wrist flex", "Wrist roll"], SHORT = ["pan", "lift", "elbow", "wrist", "roll"];
  const JCOL = ["--warn", "--link1", "--link2", "--shelf", "--floor"]; // one colour per joint: its ring, its link, its axis, its Jacobian column
  const OFF1 = (FACTS.th1_0 * R2D).toFixed(1).replace("-", "−"), OFF2 = (FACTS.th2_0 * R2D).toFixed(1).replace("-", "−"); // θ₁ = OFF1° − lift, θ₂ = OFF2° − elbow
  const NOTE = ["turns the whole sheet about a vertical axis", `tabs 1–4's θ₁, counted the other way from its own zero: θ₁ = ${OFF1}° − lift`, `tabs 1–4's θ₂, counted the other way from its own zero: θ₂ = ${OFF2}° − elbow`, "a third joint in the same plane", "turns the gripper about its own long axis"];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), toast = () => {};
  const st = {
    q: [0, 0, 0, 0, 0], free: [false, true, true, false, false], cam: { yaw: -52 * D2R, pitch: 22 * D2R, dist: 860 }, look: [150, 0, 175],
    plane: true, cloud: false, axes: false, jac: false, triad: false, mode: "", target: null, anchor: null, holdErr: 0, err: 0,
    anim: null, camAnim: null, dirty: true, cloudN: 3000, cloudKey: "", cloudPts: null, slow: 0, drag: null, mounted: false, map: {}, tp: null, B: null,
  };
  const poiName = () => (st.free[3] || st.free[4] ? "T" : "W");
  const now = () => performance.now();

  // ---------- colours ----------
  function rgb(name) { let h = css(name); if (h.startsWith("rgb")) return h.match(/[\d.]+/g).slice(0, 3).map(Number); h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  const rgba = (name, a) => { const c = rgb(name); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v * t + B[i] * (1 - t))).join(",")})`; };

  // ---------- state changes ----------
  function setView(name, animate = true, qRef = st.q) {
    const pl = planar(qRef), sideYaw = Math.atan2(pl.d[1], pl.d[0]) - Math.PI / 2;
    const V = { q: [-52 * D2R, 22 * D2R], side: [sideYaw, 3 * D2R], top: [Math.PI, 86 * D2R], front: [0, 12 * D2R] }[name]; if (!V) return;
    if (animate && !reduced()) st.camAnim = { from: [st.cam.yaw, st.cam.pitch], to: [st.cam.yaw + K3.wrap(V[0] - st.cam.yaw), V[1]], t0: now(), dur: 450 };
    else { st.cam.yaw = V[0]; st.cam.pitch = V[1]; st.camAnim = null; }
    st.dirty = true;
  }
  function apply(s, animate = true) {
    if (!s) return;
    const okV = (v, n) => Array.isArray(v) && v.length === n && v.every((x) => Number.isFinite(x));
    s = { ...s, q: okV(s.q, 5) ? s.q : undefined, cam: Array.isArray(s.cam) && s.cam.length >= 2 && s.cam.every((x) => Number.isFinite(x)) ? s.cam : undefined };
    if (s.target && !okV(s.target, 3)) delete s.target;
    if (s.free != null) st.free = String(s.free).padEnd(5, "0").slice(0, 5).split("").map((c) => c === "1");
    for (const k of ["plane", "cloud", "axes", "jac", "triad"]) if (s[k] != null) st[k] = !!+s[k];
    if (s.mode != null) st.mode = s.mode;
    if (s.target !== undefined) st.target = s.target ? s.target.slice(0, 3) : null;
    if (s.view) setView(s.view, animate, s.q ? clampQ(s.q.map((d) => d * D2R)) : st.q);
    if (s.dist) st.cam.dist = clamp(s.dist, 600, 1900);
    if (s.cam) { st.cam.yaw = s.cam[0] * D2R; st.cam.pitch = clamp(s.cam[1] * D2R, 0.03, 1.52); if (s.cam[2]) st.cam.dist = clamp(s.cam[2], 600, 1900); st.camAnim = null; }
    if (s.q) { const to = clampQ(s.q.map((d) => d * D2R)); if (animate && !reduced()) st.anim = { from: st.q.slice(), to, t0: now(), dur: 700 }; else { st.q = to; st.anim = null; } }
    st.anchor = st.mode === "self" && !st.anim ? fk(st.q).T.slice() : null;
    st.holdErr = 0; st.dirty = true; syncUI();
  }
  function readParams(hash) {
    const s = {};
    for (const part of String(hash || "").replace(/^#/, "").split("&")) {
      const [k, v] = part.split("="); if (v == null) continue;
      if (k === "q") s.q = v.split(",").map(Number); else if (k === "free") s.free = v; else if (k === "cam") s.cam = v.split(",").map(Number);
      else if (["plane", "cloud", "axes", "triad"].includes(k)) s[k] = +v; else if (k === "cols") s.jac = +v; else if (k === "tg") s.target = v.split(",").map(Number);
      else if (k === "mode") s.mode = v; else if (k === "view") s.view = v; else if (k === "n") st.cloudN = clamp(+v || 3000, 200, 6000);
    }
    if (Object.keys(s).length) apply(s, false);
  }
  function linkParams() {
    const out = [`q=${st.q.map((v) => Math.round(v * R2D)).join(",")}`, `free=${st.free.map(Number).join("")}`, `cam=${Math.round(st.cam.yaw * R2D)},${Math.round(st.cam.pitch * R2D)},${Math.round(st.cam.dist)}`];
    for (const k of ["plane", "cloud", "axes", "triad"]) out.push(`${k}=${st[k] ? 1 : 0}`);
    out.push(`cols=${st.jac ? 1 : 0}`);
    if (st.target) out.push(`tg=${st.target.map((v) => Math.round(v)).join(",")}`);
    out.push(`mode=${st.mode}`); // always, even when empty: a lesson's own default (follow, self-motion) must not come back
    return out;
  }
  function holdAt(angle) {
    if (!st.anchor) st.anchor = fk(st.q).T.slice();
    const r = hold(st.q, st.anchor, clamp(angle, CHAIN[3].lim[0], CHAIN[3].lim[1])); st.q = r.q; st.holdErr = r.err; st.dirty = true;
  }
  function getCloud() {
    const poi = poiName(), key = [st.cloudN, poi, st.free.map(Number).join(""), st.q.map((v, k) => (st.free[k] ? "f" : v.toFixed(3))).join(",")].join("|");
    if (key !== st.cloudKey) { st.cloudKey = key; st.cloudPts = cloud(st.cloudN, 7, st.free, st.q, poi); }
    return st.cloudPts;
  }

  // ---------- canvas helpers ----------
  function fit(c) {
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, w, h };
  }
  function tag(ctx, x, y, txt, color, opt = {}) {
    ctx.save(); ctx.font = (opt.bold ? "bold " : "") + "12px ui-monospace, Menlo, monospace";
    const W = ctx.canvas.clientWidth, Hh = ctx.canvas.clientHeight, tw = ctx.measureText(txt).width;
    const X = clamp(opt.align === "right" ? x - tw : opt.align === "center" ? x - tw / 2 : x, 4, W - tw - 4), Y = clamp(y, 14, Hh - 4);
    if (opt.bg !== false) { ctx.fillStyle = css("--panel"); ctx.globalAlpha = 0.82; ctx.fillRect(X - 3, Y - 12, tw + 6, 16); ctx.globalAlpha = 1; }
    ctx.fillStyle = color || css("--ink"); ctx.fillText(txt, X, Y); ctx.restore();
  }
  function arrow(ctx, x0, y0, x1, y1, color, width = 2.5, head = 9) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 3) return;
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.7, y1 - Math.sin(a) * head * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42)); ctx.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function capsule(ctx, a, b, width, color) {
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = width + 2.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    if (width >= 7) { // a soft highlight along the upper-left edge reads as a lit cylinder
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; let ox = -dy / L, oy = dx / L; if (oy > 0) { ox = -ox; oy = -oy; }
      ctx.globalAlpha = 0.34; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = width * 0.26;
      ctx.beginPath(); ctx.moveTo(a[0] + ox * width * 0.2, a[1] + oy * width * 0.2); ctx.lineTo(b[0] + ox * width * 0.2, b[1] + oy * width * 0.2); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- the 3D view ----------
  function camBasis() {
    const y = st.cam.yaw, p = st.cam.pitch, cp = Math.cos(p), sp = Math.sin(p), cy = Math.cos(y), sy = Math.sin(y), z = [cp * cy, cp * sy, sp];
    return { pos: add(st.look, scale(z, st.cam.dist)), r: [-sy, cy, 0], u: [-sp * cy, -sp * sy, cp], f: scale(z, -1) };
  }
  function draw3D() {
    const c = $("a3"), { ctx, w, h } = fit(c); if (!w) return;
    const B = camBasis(), F = 1.25 * Math.min(w, h);
    const P = (X) => { const d = sub(X, B.pos), zc = Math.max(dot(d, B.f), 80), k = F / zc; return [w / 2 + dot(d, B.r) * k, h / 2 - dot(d, B.u) * k, zc, k]; };
    st.B = B;
    const line = (A, Bq, col, lw, dash) => { const a = P(A), b = P(Bq); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); };
    const poly = (pts, close) => { ctx.beginPath(); pts.forEach((X, i) => { const p = P(X); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); if (close) ctx.closePath(); };

    ctx.clearRect(0, 0, w, h); ctx.fillStyle = css("--panel"); ctx.fillRect(0, 0, w, h);
    const f = fk(st.q), pl = planar(st.q), poi = poiName(), X = poi === "W" ? f.P[3] : f.T;

    // the plane z = 0 of the URDF's base frame, as a 100 mm grid
    poly([[-400, -500, 0], [500, -500, 0], [500, 500, 0], [-400, 500, 0]], true); ctx.fillStyle = rgba("--grid", 0.7); ctx.fill();
    for (let v = -400; v <= 500; v += 100) line([v, -500, 0], [v, 500, 0], rgba("--muted", 0.28), 1);
    for (let v = -500; v <= 500; v += 100) line([-400, v, 0], [500, v, 0], rgba("--muted", 0.28), 1);
    line([0, 0, 0], [120, 0, 0], rgba("--muted", 0.8), 1.5); { const fp = P([132, 0, 0]); tag(ctx, fp[0], fp[1] + 4, "front", css("--muted"), { bg: false, align: "center" }); }

    // the arm as joint-to-joint segments (schematic capsules; radii are not from the URDF)
    const pts = [[0, 0, 0], f.P[0], f.P[1], f.P[2], f.P[3], f.P[4], f.T];
    const segs = [[0, 1, 15, "--muted"], [1, 2, 10.5, JCOL[0]], [2, 3, 9.5, JCOL[1]], [3, 4, 8.5, JCOL[2]], [4, 5, 7, JCOL[3]], [5, 6, 5.5, JCOL[4]]];
    // shadows first: the same segments dropped straight down onto the table
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgba(0,0,0,0.09)";
    for (const [i, j, r] of segs) { if (!i) continue; const a = P([pts[i][0], pts[i][1], 0]), b = P([pts[j][0], pts[j][1], 0]); ctx.lineWidth = Math.max(2, r * (a[3] + b[3]) * 0.8); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.restore();

    // the plane of tabs 1–4, with the two-link reach ring around the shoulder-lift joint
    if (st.plane) {
      const PL = (u, z) => [pl.O[0] + pl.d[0] * u + pl.a[0] * pl.latS, pl.O[1] + pl.d[1] * u + pl.a[1] * pl.latS, z], uS = pl.S[0], zS = pl.S[1], Rr = FACTS.reachOuter;
      poly([PL(uS - Rr - 20, 0), PL(uS + Rr + 20, 0), PL(uS + Rr + 20, zS + Rr + 20), PL(uS - Rr - 20, zS + Rr + 20)], true);
      ctx.fillStyle = rgba("--accent", 0.09); ctx.fill(); ctx.strokeStyle = rgba("--accent", 0.45); ctx.lineWidth = 1; ctx.stroke();
      for (const [rad, dash] of [[FACTS.reachOuter, [5, 5]], [FACTS.reachInner, [2, 4]]]) {
        ctx.save(); ctx.strokeStyle = rgba("--accent", 0.75); ctx.lineWidth = 1.4; ctx.setLineDash(dash); ctx.beginPath(); let pen = false;
        for (let i = 0; i <= 96; i++) { const t = i / 96 * 2 * Math.PI, z = zS + rad * Math.sin(t); if (z < 0) { pen = false; continue; } const p = P(PL(uS + rad * Math.cos(t), z)); pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; }
        ctx.stroke(); ctx.restore();
      }
      // label in the sheet's top-left corner; if the tracked point's own label would sit on it, lift it just above the sheet's edge
      const lp = P(PL(uS - Rr - 20, zS + Rr + 20)), xw = P(X), clash = poi === "W" && Math.abs(xw[1] - 20 - (lp[1] + 18)) < 19 && xw[0] + 92 > lp[0] && xw[0] - 92 < lp[0] + 170;
      tag(ctx, lp[0] + 8, clash ? lp[1] - 7 : lp[1] + 18, "the plane of tabs 1–4", css("--accent"));
    }

    // reachable cloud: far points now, near points after the arm so the arm sits inside it
    const armZ = pts.map((Xp) => P(Xp)[2]), zNear = Math.min(...armZ), near = [];
    if (st.cloud) {
      const C = getCloud(); ctx.save(); ctx.fillStyle = css("--accent"); ctx.globalAlpha = 0.45;
      for (let i = 0; i < C.length; i += 3) { if (C[i + 2] < 0) continue; const p = P([C[i], C[i + 1], C[i + 2]]); if (p[2] < zNear) { near.push(p); continue; } const s = Math.max(1.3, 2.6 * p[3]); ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s); }
      ctx.restore();
    }

    // drop lines: where the tracked point and the target sit above the table
    const drop = (Xp, col) => { line(Xp, [Xp[0], Xp[1], 0], col, 1.2, [3, 4]); const g = P([Xp[0], Xp[1], 0]); ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(g[0], g[1], 5.5, 2.6, 0, 0, 7); ctx.fill(); ctx.restore(); };
    drop(X, css("--ink")); if (st.target) drop(st.target, css("--target"));

    // links and joints, far to near
    const items = [], marks = [];
    for (const [i, j, r, col] of segs) { const a = P(pts[i]), b = P(pts[j]); items.push({ z: (a[2] + b[2]) / 2, draw() { capsule(ctx, a, b, Math.max(3, r * (a[3] + b[3])), css(col)); } }); }
    f.P.forEach((Pk, k) => { const p = P(Pk), r = Math.max(4, [11, 10, 9, 8, 6][k] * p[3]); marks.push({ z: p[2], draw() {
      ctx.save(); ctx.fillStyle = css("--panel"); ctx.strokeStyle = st.free[k] ? css(JCOL[k]) : css("--ghost"); ctx.lineWidth = st.free[k] ? 3 : 2;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.free[k] ? css(JCOL[k]) : css("--ghost"); ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.32, 0, 7); ctx.fill(); ctx.restore(); } }); });
    { const p = P(f.T); marks.push({ z: p[2], draw() { ctx.save(); ctx.fillStyle = css("--target"); ctx.strokeStyle = css("--panel"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(3.5, 6 * p[3]), 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); } }); }
    items.sort((m, n) => n.z - m.z).forEach((it) => it.draw()); marks.sort((m, n) => n.z - m.z).forEach((it) => it.draw());

    if (near.length) { ctx.save(); ctx.fillStyle = css("--accent"); ctx.globalAlpha = 0.26; for (const p of near) { const s = Math.max(1.3, 2.6 * p[3]); ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s); } ctx.restore(); }

    // joint axes
    if (st.axes) f.P.forEach((Pk, k) => { line(add(Pk, scale(f.A[k], -48)), add(Pk, scale(f.A[k], 48)), css(JCOL[k]), 1.6, [5, 4]); const p = P(add(Pk, scale(f.A[k], 54))); tag(ctx, p[0] + 4, p[1], SHORT[k], css(JCOL[k])); });

    // Jacobian columns at the tracked point: each free joint's "nudge", drawn as 0.5 rad of that joint
    if (st.jac) { const cols = jacCols(st.q, poi), x0 = P(X), placed = [];
      cols.forEach((cv, k) => { if (!st.free[k] || len(cv) < 1) return; const e = P(add(X, scale(cv, 0.5))), L = Math.hypot(e[0] - x0[0], e[1] - x0[1]) || 1, ux = (e[0] - x0[0]) / L, uy = (e[1] - x0[1]) / L;
        if (L < 6) return; // too short to see (the roll's column is about 8 mm per radian): no arrow, so no label either
        arrow(ctx, x0[0], x0[1], e[0], e[1], css(JCOL[k]), 2.6);
        // label just past the arrow's tip; nudge it a little further out if it would sit on a label already placed
        let lx = e[0] + ux * 16, ly = e[1] + uy * 16 + 4; const tw = SHORT[k].length * 7.3 + 8;
        for (let n = 0; n < 3 && placed.some((b) => Math.abs(b[0] - lx) < (b[2] + tw) / 2 && Math.abs(b[1] - ly) < 17); n++) { lx += ux * 12; ly += (uy >= 0 ? 1 : -1) * 15; }
        placed.push([lx, ly, tw]); tag(ctx, lx, ly, SHORT[k], css(JCOL[k]), { align: "center" }); }); }

    // orientation of the fingertip frame
    if (st.triad) { const t0 = P(f.T); [["--bad", "x"], ["--target", "y"], ["--link1", "z"]].forEach(([col, nm], i) => { const e = P(add(f.T, scale([f.RT[0][i], f.RT[1][i], f.RT[2][i]], 55))); arrow(ctx, t0[0], t0[1], e[0], e[1], css(col), 2.2, 7); tag(ctx, e[0] + 4, e[1] + 4, nm, css(col), { bg: false }); }); }

    // target
    st.tp = null;
    if (st.target) {
      const t = P(st.target), xp = P(X); st.tp = t;
      ctx.save(); ctx.strokeStyle = css("--bad"); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xp[0], xp[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = css("--target"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t[0], t[1], 10, 0, 7); ctx.moveTo(t[0] - 16, t[1]); ctx.lineTo(t[0] - 5, t[1]); ctx.moveTo(t[0] + 5, t[1]); ctx.lineTo(t[0] + 16, t[1]); ctx.moveTo(t[0], t[1] - 16); ctx.lineTo(t[0], t[1] - 5); ctx.moveTo(t[0], t[1] + 5); ctx.lineTo(t[0], t[1] + 16); ctx.stroke(); ctx.restore();
      tag(ctx, t[0] + 14, t[1] - 10, "p*", css("--target"));
    }
    const xp = P(X); if (poi === "W") tag(ctx, xp[0], xp[1] - 20, "W · the hand of tabs 1–4", css("--ink"), { align: "center" }); else tag(ctx, xp[0] + 12, xp[1] - 12, "fingertip p", css("--ink"));

    // a small compass for the world axes, and the scale
    const g0 = [34, h - 30]; [[[1, 0, 0], "x"], [[0, 1, 0], "y"], [[0, 0, 1], "z"]].forEach(([e, nm]) => { const ex = dot(e, B.r) * 22, ey = -dot(e, B.u) * 22; arrow(ctx, g0[0], g0[1], g0[0] + ex, g0[1] + ey, css("--muted"), 1.6, 6); tag(ctx, g0[0] + ex * 1.35 - 3, g0[1] + ey * 1.35 + 4, nm, css("--muted"), { bg: false }); });
    tag(ctx, w - 8, h - 8, "grid at z = 0 · 100 mm", css("--muted"), { align: "right", bg: false });
  }

  // ---------- the two flat views: side (the arm's own plane) and top, drawn at one shared scale ----------
  function drawFlat() {
    const c = $("a3flat"), { ctx, w, h } = fit(c); if (!w) return;
    const f = fk(st.q), pl = planar(st.q), poi = poiName();
    const s = Math.min((h - 74) / 1460, w / 920), split = Math.round(560 * s + 44);
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = css("--panel"); ctx.fillRect(0, 0, w, h);
    const seg2 = (a, b, col, lw) => { ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); };
    const node = (p, col, r = 4.5) => { ctx.save(); ctx.fillStyle = css("--panel"); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); };
    const cross2 = (t, r, alpha = 1) => { ctx.save(); ctx.strokeStyle = css("--target"); ctx.lineWidth = 2; ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(t[0], t[1], r, 0, 7); ctx.moveTo(t[0] - r * 1.5, t[1]); ctx.lineTo(t[0] + r * 1.5, t[1]); ctx.moveTo(t[0], t[1] - r * 1.5); ctx.lineTo(t[0], t[1] + r * 1.5); ctx.stroke(); ctx.restore(); };

    // ---- side: looking straight along the three pitch axes. u = distance along the plane from the pan axis, z = height.
    // For the two links S→E→W this is exactly the picture tabs 1–4 draw.
    const ox = w / 2, oz = split - 14, SX = (u) => ox + u * s, SZ = (z) => oz - z * s, SP = (p) => [SX(p[0]), SZ(p[1])];
    st.map.side = { s, ox, oz, split };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, split - 2); ctx.clip();
    const S = SP(pl.S), E = SP(pl.E), W = SP(pl.W), Rr = SP(pl.R), T = SP(pl.T), O0 = [SX(0), SZ(0)], O1 = [SX(0), SZ(pl.O[2])];
    // shaded: where the wrist can go with the lift AND the elbow inside their limits. For each elbow angle the wrist sweeps one arc about S.
    { const t1 = FACTS.th1RangeDeg.map((v) => v * D2R), t2 = FACTS.th2RangeDeg.map((v) => v * D2R), n = 140;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, SZ(0)); ctx.clip(); ctx.strokeStyle = mix("--accent", "--panel", poi === "W" ? 0.17 : 0.09); ctx.lineWidth = 3.2;
      for (let i = 0; i <= n; i++) { const th2 = t2[0] + (t2[1] - t2[0]) * i / n, r = Math.sqrt(FACTS.L1 * FACTS.L1 + FACTS.L2 * FACTS.L2 + 2 * FACTS.L1 * FACTS.L2 * Math.cos(th2)), b = Math.atan2(FACTS.L2 * Math.sin(th2), FACTS.L1 + FACTS.L2 * Math.cos(th2));
        ctx.beginPath(); ctx.arc(S[0], S[1], r * s, -(t1[0] + b), -(t1[1] + b), true); ctx.stroke(); }
      ctx.restore(); }
    ctx.strokeStyle = css("--grid"); ctx.lineWidth = 1;
    for (let u = -500; u <= 500; u += 100) { ctx.beginPath(); ctx.moveTo(SX(u), SZ(0)); ctx.lineTo(SX(u), 22); ctx.stroke(); }
    for (let z = 100; z <= 500; z += 100) { ctx.beginPath(); ctx.moveTo(0, SZ(z)); ctx.lineTo(w, SZ(z)); ctx.stroke(); }
    ctx.strokeStyle = css("--floor"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, SZ(0)); ctx.lineTo(w, SZ(0)); ctx.stroke();
    // dashed: tab 1's ring for the wrist (outer l₁ + l₂; inner set by the elbow's limit), which assumes a shoulder that turns all the way round
    ctx.save(); ctx.strokeStyle = rgba("--accent", poi === "W" ? 0.8 : 0.35);
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(S[0], S[1], FACTS.reachOuter * s, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(S[0], S[1], FACTS.reachInner * s, 0, 7); ctx.stroke(); ctx.restore();
    seg2(O0, O1, css("--muted"), 8); seg2(O1, S, css(JCOL[0]), 6); seg2(S, E, css(JCOL[1]), 6); seg2(E, W, css(JCOL[2]), 5); seg2(W, Rr, css(JCOL[3]), 4); seg2(Rr, T, css(JCOL[4]), 3);
    [[S, 1], [E, 2], [W, 3], [Rr, 4]].forEach(([p, k]) => node(p, st.free[k] ? css(JCOL[k]) : css("--ghost"), k === 4 ? 3.5 : 4.5));
    ctx.save(); ctx.fillStyle = css("--target"); ctx.beginPath(); ctx.arc(T[0], T[1], 3.5, 0, 7); ctx.fill(); ctx.restore();
    // θ₁ and θ₂ exactly as tab 1 draws them
    ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = css("--ghost"); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(S[0] + 36, S[1]); ctx.stroke();
    const ext = [E[0] + 40 * Math.cos(pl.th1), E[1] - 40 * Math.sin(pl.th1)]; ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(ext[0], ext[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = css(JCOL[1]); ctx.beginPath(); ctx.arc(S[0], S[1], 20, 0, -pl.th1, pl.th1 > 0); ctx.stroke();
    ctx.strokeStyle = css(JCOL[2]); ctx.beginPath(); ctx.arc(E[0], E[1], 17, -pl.th1, -(pl.th1 + pl.th2), pl.th2 > 0); ctx.stroke(); ctx.restore();
    tag(ctx, S[0] + 30 * Math.cos(pl.th1 / 2), S[1] - 30 * Math.sin(pl.th1 / 2) + 4, "θ₁", css(JCOL[1]), { bg: false });
    tag(ctx, E[0] + 28 * Math.cos(pl.th1 + pl.th2 / 2), E[1] - 28 * Math.sin(pl.th1 + pl.th2 / 2) + 4, "θ₂", css(JCOL[2]), { bg: false });
    if (w >= 420) { const beside = (A, B, away, t, txt, col) => { let nx = -(B[1] - A[1]), ny = B[0] - A[0]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        const mx = A[0] + (B[0] - A[0]) * t, my = A[1] + (B[1] - A[1]) * t; if (nx * (away[0] - mx) + ny * (away[1] - my) > 0) { nx = -nx; ny = -ny; }
        tag(ctx, mx + nx * 30, my + ny * 16 + 4, txt, col, { align: "center" }); };
      beside(S, E, W, 0.5, `l₁ = ${FACTS.L1.toFixed(0)}`, css(JCOL[1])); beside(E, W, S, 0.6, `l₂ = ${FACTS.L2.toFixed(0)}`, css(JCOL[2])); }
    tag(ctx, (poi === "W" ? W : T)[0] + 9, (poi === "W" ? W : T)[1] + 16, poi === "W" ? "W" : "p", css("--ink"));
    if (st.target) { const tu = dot(sub(st.target, pl.O), pl.d), tp = [SX(tu), SZ(st.target[2])], off = dot(sub(st.target, pl.O), pl.a) - (poi === "W" ? pl.latS : pl.latT);
      cross2(tp, 7, Math.abs(off) > 3 ? 0.45 : 1);
      if (Math.abs(off) > 3) tag(ctx, tp[0] + 12, tp[1] - 10, `${Math.abs(off).toFixed(0)} mm out of this plane`, css("--target")); }
    ctx.restore();
    tag(ctx, 8, 16, w >= 430 ? "side view · the plane of tabs 1–4 (it turns with the pan)" : "side view · the plane of tabs 1–4", css("--muted"), { bg: false });

    // ---- top: looking straight down, centred on the pan axis. +x (the arm's front) is up the page, +y is to the left.
    const cx = w / 2, cy = split + (h - split) / 2 + 8, TXY = (X) => [cx - (X[1] - pl.O[1]) * s, cy - (X[0] - pl.O[0]) * s];
    st.map.top = { s, cx, cy, O: pl.O };
    ctx.save(); ctx.beginPath(); ctx.rect(0, split + 2, w, h - split - 2); ctx.clip();
    ctx.strokeStyle = css("--grid"); ctx.lineWidth = 1;
    for (let y = -500; y <= 500; y += 100) { const a = TXY([-500, y]), b = TXY([600, y]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (let x = -500; x <= 600; x += 100) { const a = TXY([x, -500]), b = TXY([x, 500]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // the pan's range, swept from the URDF limits
    ctx.save(); ctx.fillStyle = rgba(JCOL[0], 0.1); ctx.strokeStyle = rgba(JCOL[0], 0.6); ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); const Oc = TXY(pl.O); ctx.moveTo(Oc[0], Oc[1]);
    for (let i = 0; i <= 28; i++) { const q = st.q.slice(); q[0] = CHAIN[0].lim[0] + (CHAIN[0].lim[1] - CHAIN[0].lim[0]) * i / 28; const d = planar(q).d, pp = TXY([pl.O[0] + d[0] * 445, pl.O[1] + d[1] * 445]); ctx.lineTo(pp[0], pp[1]); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    const tp3 = [[0, 0, 0], f.P[0], f.P[1], f.P[2], f.P[3], f.P[4], f.T].map(TXY);
    ctx.save(); ctx.fillStyle = css("--muted"); ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(tp3[1][0], tp3[1][1], Math.max(6, 34 * s), 0, 7); ctx.fill(); ctx.restore();
    [[1, 2, JCOL[0], 6], [2, 3, JCOL[1], 6], [3, 4, JCOL[2], 5], [4, 5, JCOL[3], 4], [5, 6, JCOL[4], 3]].forEach(([i, j, col, lw]) => seg2(tp3[i], tp3[j], css(col), lw));
    node(tp3[1], st.free[0] ? css(JCOL[0]) : css("--ghost"), 5);
    ctx.save(); ctx.fillStyle = css("--target"); ctx.beginPath(); ctx.arc(tp3[6][0], tp3[6][1], 3.5, 0, 7); ctx.fill(); ctx.restore();
    if (st.target) cross2(TXY(st.target), 7);
    arrow(ctx, 44, h - 14, 44, h - 40, css("--muted"), 1.5, 6); tag(ctx, 50, h - 30, "x", css("--muted"), { bg: false });
    arrow(ctx, 44, h - 14, 18, h - 14, css("--muted"), 1.5, 6); tag(ctx, 8, h - 10, "y", css("--muted"), { bg: false });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = css("--line"); ctx.beginPath(); ctx.moveTo(0, split); ctx.lineTo(w, split); ctx.stroke(); ctx.restore();
    tag(ctx, 8, split + 18, `top view · pan = ${(st.q[0] * R2D).toFixed(0)}°, range ±${FACTS.limitsDeg[0][1].toFixed(0)}°`, css("--muted"), { bg: false });
    tag(ctx, w - 8, h - 8, "grid: 100 mm, both views", css("--muted"), { align: "right", bg: false });
  }

  // ---------- the live math ----------
  const n1 = (x) => (Math.abs(x) < 0.05 ? 0 : x).toFixed(1), xyz = (X) => X.map((v) => n1(v).padStart(7)).join(","), dg = (r) => { const v = Math.round(r * R2D); return (v === 0 ? 0 : v) + "°"; };
  const fx = (v, d) => { const t = v.toFixed(d); return /^-0(\.0+)?$/.test(t) ? t.slice(1) : t; };
  function mathHTML() {
    const f = fk(st.q), pl = planar(st.q), poi = poiName(), fr = [0, 1, 2, 3, 4].filter((k) => st.free[k]), lk = [0, 1, 2, 3, 4].filter((k) => !st.free[k]);
    let m = `q = (pan, lift, elbow, wrist, roll) = (${st.q.map(dg).join(", ")})\nfree: ${fr.length ? fr.map((k) => SHORT[k]).join(", ") : "none"}    locked: ${lk.length ? lk.map((k) => SHORT[k]).join(", ") : "none"}\n\n`;
    m += `p(q) = T₀·R(pan) · T₁·R(lift) · T₂·R(elbow) · T₃·R(wrist) · T₄·R(roll) · T_tip\n       five turns, six fixed steps: forward kinematics is a chain of matrices\n\n`;
    m += `wrist     W = (${xyz(f.P[3])}) mm${poi === "W" ? "   ← the “hand” of tabs 1–4" : ""}\nfingertip p = (${xyz(f.T)}) mm${poi === "T" ? "   ← the point we track now" : ""}\n`;
    m += `\ntabs 1–4's angles, from this arm's joints (see the side view):\n  θ₁ = ${(FACTS.th1_0 * R2D).toFixed(1)}° − lift  = ${dg(pl.th1)}        θ₂ = ${(FACTS.th2_0 * R2D).toFixed(1)}° − elbow = ${dg(pl.th2)}\n`;
    if (poi === "W") m += `  |W − S| = ${Math.hypot(pl.W[0] - pl.S[0], pl.W[1] - pl.S[1]).toFixed(1)} mm   (tab 1's ring, l₁ = ${FACTS.L1.toFixed(0)}, l₂ = ${FACTS.L2.toFixed(0)}: ${FACTS.reachInner.toFixed(1)} … ${FACTS.reachOuter.toFixed(1)} mm)\n`;
    if (fr.length === 5) m += `\na pose of the arm is 5 numbers. A grid over every pose, at 5° steps:\n  two joints (tabs 1–4): 72 × 72 = ${FACTS.cells2.toLocaleString()} cells     this arm: ${(FACTS.cells5 / 1e6).toFixed(0)} million cells, in 5 dimensions\n`;
    if (st.mode === "self") m += `\nself-motion: wrist set to ${dg(st.q[3])}; lift and elbow re-solved\nfingertip held within ${st.holdErr.toFixed(3)} mm  ${st.holdErr < K3.TOL_MM ? '<span class="pill ok">held</span>' : '<span class="pill bad">this wrist angle can\'t hold the point</span>'}\n`;
    if (st.target) { const e = len(sub(st.target, poi === "W" ? f.P[3] : f.T)); m += `\ntarget p* = (${xyz(st.target)}) mm    miss = ${e.toFixed(2)} mm  ${e < K3.TOL_MM ? '<span class="pill ok">reached</span>' : ""}\n`; }
    const cols = jacCols(st.q, poi), nm = poi === "W" ? "W" : "p", head = fr.map((k) => SHORT[k].padStart(7)).join(""), plural = fr.length > 1 ? "s" : "";
    if (!fr.length) m += `\nJ: every joint is locked, so nothing can move`;
    else if (!st.free[0] && !st.free[4]) { // pan and roll locked: the arm stays in its sheet, so write J in the sheet's own two directions, as tab 3 did
      const note = fr.length === 2 ? (st.free[1] && st.free[2] ? "  ← square, like tab 3's (in mm; these joints count the other way from θ₁, θ₂)" : "  ← square") : fr.length > 2 ? "  ← not square: no J⁻¹" : "";
      m += `\nJ = ∂${nm}/∂q, inside the sheet : 2 rows × ${fr.length} column${plural}${note}\n       ${head}\n`;
      m += `  out [${fr.map((k) => fx(dot(cols[k], pl.d), 0).padStart(7)).join("")} ]  mm/rad\n  up  [${fr.map((k) => fx(cols[k][2], 0).padStart(7)).join("")} ]  mm/rad\n`;
      m += `  (a third row, out of the sheet, is all zeros while the pan and roll are locked)\n`;
    } else {
      const six = st.triad && fr.length === 5, rows = six ? 6 : 3;
      m += `\nJ = ∂${nm}/∂q : ${rows} rows × ${fr.length} column${plural}${fr.length === rows ? "" : "  ← not square: no J⁻¹"}\n      ${head}\n`;
      ["x", "y", "z"].forEach((r, i) => { m += `  ${r}  [${fr.map((k) => fx(cols[k][i], 0).padStart(7)).join("")} ]  mm/rad\n`; });
      if (six) { const J = jac6(st.q), rk = rank6(st.q); ["ωx", "ωy", "ωz"].forEach((r, i) => { m += `  ${r} [${fr.map((k) => fx(J.w[k][i], 2).padStart(7)).join("")} ]  rad/rad\n`; });
        m += `only ${rk} of these 6 rows are independent (its “rank” is ${rk})   <span class="pill warn">five columns can't fill six numbers</span>`; }
      else if (st.triad) m += `(unlock all five joints to see the three turning rows too)\n`;
    }
    return m;
  }

  // ---------- controls ----------
  function mount() {
    if (st.mounted) return; st.mounted = true;
    $("a3Joints").innerHTML = NAMES.map((nm, k) => `<div class="ctl" title="${NOTE[k]}"><label for="a3q${k}"><input type="checkbox" id="a3lk${k}" aria-label="Unlock ${nm}"> <span class="sw" style="background:var(${JCOL[k]})"></span>${nm}</label><input type="range" id="a3q${k}" min="${FACTS.sliderDeg[k][0]}" max="${FACTS.sliderDeg[k][1]}" step="1" aria-label="${nm} angle"><output id="a3o${k}"></output></div>`).join("");
    NAMES.forEach((_, k) => {
      $("a3lk" + k).addEventListener("change", (e) => { st.free[k] = e.target.checked;
        if (st.mode === "self") { if (st.free[1] && st.free[2] && st.free[3]) st.anchor = fk(st.q).T.slice(); // self-motion re-solves lift and elbow against the wrist, so all three must be free
          else { st.mode = ""; st.anchor = null; toast("Self-motion needs the lift, elbow and wrist unlocked, so it is now off."); } }
        st.dirty = true; syncUI(); });
      $("a3q" + k).addEventListener("input", (e) => { if (st.anim) { st.q = st.anim.to.slice(); st.anim = null; if (st.mode === "self") st.anchor = fk(st.q).T.slice(); } // finish a lesson's opening move first
        const v = +e.target.value * D2R;
        if (st.mode === "self" && k === 3) holdAt(v); else { st.q[k] = v; st.q = clampQ(st.q); if (st.mode === "self") { st.anchor = fk(st.q).T.slice(); st.holdErr = 0; } if (st.mode === "follow") st.mode = ""; }
        st.dirty = true; syncUI(); });
    });
    for (const k of ["plane", "cloud", "axes", "jac"]) $("a3" + k).addEventListener("change", (e) => { st[k] = e.target.checked; st.dirty = true; syncUI(); });
    document.querySelectorAll("[data-a3view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.a3view)));
    $("a3tilt").addEventListener("input", (e) => { st.camAnim = null; st.cam.pitch = +e.target.value * D2R; st.dirty = true; });
    $("a3zin").addEventListener("click", () => { st.cam.dist = clamp(st.cam.dist / 1.15, 600, 1900); st.dirty = true; });
    $("a3zout").addEventListener("click", () => { st.cam.dist = clamp(st.cam.dist * 1.15, 600, 1900); st.dirty = true; });
    $("a3follow").addEventListener("change", (e) => { st.mode = e.target.checked ? "follow" : ""; if (e.target.checked && !st.target) st.target = [250, 120, 170]; st.dirty = true; syncUI(); });
    $("a3solve").addEventListener("click", () => {
      if (!st.free.some(Boolean)) { toast("Unlock at least one joint first."); return; }
      if (!st.target) st.target = [250, 120, 170];
      const r = solveBest(st.q, st.target, st.free, poiName()); st.mode = st.mode === "follow" ? "" : st.mode;
      if (reduced()) st.q = r.q; else st.anim = { from: st.q.slice(), to: r.q, t0: now(), dur: 800 };
      toast(r.ok ? `Reached: ${r.err.toFixed(2)} mm off${r.tries > 1 ? `, on start ${r.tries} (the search from the current pose got stuck)` : ` after ${r.iters} steps`}.`
        : `Stopped ${r.err.toFixed(0)} mm short after ${r.tries} different starts. The target is probably out of reach with these joints.`); st.dirty = true; syncUI();
    });

    const c3 = $("a3"), cf = $("a3flat");
    c3.addEventListener("pointerdown", (e) => { const r = c3.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; st.camAnim = null;
      st.drag = st.target && st.tp && Math.hypot(x - st.tp[0], y - st.tp[1]) < 26 ? { kind: "target", x, y, t0: st.target.slice(), k: st.tp[3], B: st.B } : { kind: "orbit", x, y, yaw: st.cam.yaw, pitch: st.cam.pitch };
      try { c3.setPointerCapture(e.pointerId); } catch (_) {} c3.style.cursor = "grabbing"; });
    c3.addEventListener("pointermove", (e) => { if (!st.drag) return; const r = c3.getBoundingClientRect(), dx = e.clientX - r.left - st.drag.x, dy = e.clientY - r.top - st.drag.y;
      if (st.drag.kind === "target") { const t = add(st.drag.t0, add(scale(st.drag.B.r, dx / st.drag.k), scale(st.drag.B.u, -dy / st.drag.k))); t[2] = Math.max(0, t[2]); st.target = t; }
      else { st.cam.yaw = st.drag.yaw - dx * 0.008; if (e.pointerType !== "touch") st.cam.pitch = clamp(st.drag.pitch + dy * 0.006, 0.03, 1.52); }
      st.dirty = true; });
    const end = () => { st.drag = null; c3.style.cursor = "grab"; }; c3.addEventListener("pointerup", end); c3.addEventListener("pointercancel", end);
    c3.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); st.cam.dist = clamp(st.cam.dist * (e.deltaY > 0 ? 1.06 : 0.94), 600, 1900); st.dirty = true; }, { passive: false });
    c3.addEventListener("keydown", (e) => { const K = { ArrowLeft: [0.09, 0], ArrowRight: [-0.09, 0], ArrowUp: [0, 0.07], ArrowDown: [0, -0.07] }[e.key];
      if (K) { e.preventDefault(); st.camAnim = null; st.cam.yaw += K[0]; st.cam.pitch = clamp(st.cam.pitch + K[1], 0.03, 1.52); st.dirty = true; }
      else if (e.key === "+" || e.key === "=") { st.cam.dist = clamp(st.cam.dist / 1.1, 600, 1900); st.dirty = true; } else if (e.key === "-") { st.cam.dist = clamp(st.cam.dist * 1.1, 600, 1900); st.dirty = true; } });
    let fdrag = false;
    const flat = (e) => { if (!st.target) return; const r = cf.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, pl = planar(st.q);
      if (!st.map.side) return;
      if (y < st.map.side.split) { const M = st.map.side, u = (x - M.ox) / M.s, z = Math.max(0, (M.oz - y) / M.s), v = dot(sub(st.target, pl.O), pl.a); st.target = [pl.O[0] + pl.d[0] * u + pl.a[0] * v, pl.O[1] + pl.d[1] * u + pl.a[1] * v, z]; }
      else { const M = st.map.top; st.target = [M.O[0] + (M.cy - y) / M.s, M.O[1] + (M.cx - x) / M.s, st.target[2]]; }
      st.dirty = true; };
    cf.addEventListener("pointerdown", (e) => { if (!st.target || !st.map.side) return;
      if (e.pointerType === "touch") { const r = cf.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, pl = planar(st.q), A = st.map.side, B = st.map.top;
        const inSide = [A.ox + dot(sub(st.target, pl.O), pl.d) * A.s, A.oz - st.target[2] * A.s], inTop = [B.cx - (st.target[1] - B.O[1]) * B.s, B.cy - (st.target[0] - B.O[0]) * B.s];
        if (Math.min(Math.hypot(x - inSide[0], y - inSide[1]), Math.hypot(x - inTop[0], y - inTop[1])) > 44) return; }
      fdrag = true; try { cf.setPointerCapture(e.pointerId); } catch (_) {} flat(e); });
    cf.addEventListener("pointermove", (e) => { if (fdrag) flat(e); });
    const fend = () => { fdrag = false; }; cf.addEventListener("pointerup", fend); cf.addEventListener("pointercancel", fend);
    window.addEventListener("resize", () => { st.dirty = true; });
  }
  function syncUI() {
    if (!st.mounted) return;
    NAMES.forEach((_, k) => { const s = $("a3q" + k), lockedByMode = st.mode === "self" && k !== 3 && st.free[k];
      $("a3lk" + k).checked = st.free[k]; s.disabled = !st.free[k]; s.value = Math.round(st.q[k] * R2D); $("a3o" + k).textContent = (st.q[k] * R2D).toFixed(0) + "°";
      s.closest(".ctl").style.opacity = st.free[k] ? 1 : 0.55; s.title = lockedByMode ? "Re-solved for you while you turn the wrist" : ""; });
    for (const k of ["plane", "cloud", "axes", "jac"]) $("a3" + k).checked = st[k];
    $("a3follow").checked = st.mode === "follow"; $("a3tilt").value = Math.round(st.cam.pitch * R2D);
    $("a3selfNote").classList.toggle("hidden", st.mode !== "self");
    $("a3flat").style.touchAction = st.target ? "none" : "pan-y";
    const nf = st.free.filter(Boolean).length, poi = poiName();
    const f = fk(st.q), under = Math.min(f.P[2][2], f.P[3][2], f.P[4][2], f.T[2]) < 0, lab = st.free.map(Number).join("") === "01100"; // lift + elbow only = the arm of tabs 1–4
    $("a3Status").innerHTML = (under ? '<span class="pill bad">below z = 0</span> ' : "") + `<span class="pill ${lab ? "ok" : "warn"}">${nf} of 5 joints free${lab ? " · the 2D lab" : ""}</span>`;
    const parts = NAMES.map((nm, k) => `<span><span class="sw" style="background:var(${JCOL[k]})"></span>${SHORT[k]}${st.free[k] ? "" : " (locked)"}</span>`);
    if (st.cloud) parts.push(`<span>dots: ${st.cloudN.toLocaleString()} random settings of the free joints → where the ${poi === "W" ? "wrist" : "fingertip"} lands (a sample, not the true edge; it ignores the arm bumping into itself, and points below z = 0 are left out)</span>`);
    parts.push(`<span>drag = orbit · on a phone, swipe sideways and use Tilt</span>`);
    $("a3selfNote").classList.toggle("hidden", st.mode !== "self");
    $("a3Legend").innerHTML = parts.join("");
  }

  // ---------- per-frame ----------
  function frame(t) {
    if (st.anim) { const u = clamp((t - st.anim.t0) / st.anim.dur, 0, 1), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      st.q = st.anim.from.map((v, k) => v + (st.anim.to[k] - v) * e); st.dirty = true;
      if (u >= 1) { st.q = st.anim.to.slice(); st.anim = null; if (st.mode === "self") st.anchor = fk(st.q).T.slice(); } }
    if (st.camAnim) { const u = clamp((t - st.camAnim.t0) / st.camAnim.dur, 0, 1), e = 1 - Math.pow(1 - u, 3);
      st.cam.yaw = st.camAnim.from[0] + (st.camAnim.to[0] - st.camAnim.from[0]) * e; st.cam.pitch = st.camAnim.from[1] + (st.camAnim.to[1] - st.camAnim.from[1]) * e; st.dirty = true; if (u >= 1) st.camAnim = null; }
    if (st.mode === "follow" && st.target && !st.anim && st.free.some(Boolean)) {
      const r = solve(st.q, st.target, st.free, poiName(), { maxIter: 2, maxStep: 9 }); if (r.q.some((v, k) => Math.abs(v - st.q[k]) > 1e-5)) { st.q = r.q; st.dirty = true; } st.err = r.err; }
    if (!st.dirty) return;
    st.dirty = false;
    const t0 = now(); draw3D(); const ms = now() - t0; drawFlat();
    // keep slow machines usable: thin the cloud if drawing it keeps a frame long
    if (st.cloud && ms > 30) { if (++st.slow >= 4 && st.cloudN > 750) { st.cloudN = Math.round(st.cloudN / 2); st.slow = 0; st.dirty = true; } } else st.slow = 0;
    $("math").innerHTML = mathHTML(); syncUI();
  }

  function init(hooks) { if (hooks) { if (hooks.css) css = hooks.css; if (hooks.toast) toast = hooks.toast; } mount(); st.dirty = true; syncUI(); }
  return { init, apply, frame, readParams, linkParams, setView, invalidate() { st.dirty = true; }, state: st, mathHTML, poiName };
})();
if (typeof window !== "undefined") { window.K3 = K3; window.Arm3D = Arm3D; }
