// Checks the kinematics that index.html teaches, against identities and the lessons' worked examples.
// Run with:  npm test   (Node 18+, no dependencies)
// The math lives inline in index.html; this file slices out the helpers/state/kinematics sections and evaluates them.
// Tab 5's 3D kinematics live in arm3d.js and are checked against the vendored SO-101 URDF (docs/vendor/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const js = html.split("<script>")[1].split("</script>")[0];
const start = js.indexOf("// ================= helpers");
const end = js.indexOf("// ================= world / collisions");
assert.ok(start > 0 && end > start, "could not find the kinematics sections in index.html");
const K = new Function(js.slice(start, end) + "\nreturn { fk, ik, jac, det2, mv, inv2, dampedPinv, wrap, rad, deg, S };")();
const { fk, ik, jac, det2, mv, inv2, dampedPinv, wrap, rad, deg } = K;

const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const closeV = (a, b, tol = 1e-6) => a.length === b.length && a.every((x, i) => close(x, b[i], tol));

test("forward kinematics: the lesson's worked example (30°, 60°) puts the hand at (0.866, 1.5)", () => {
  const { e, h } = fk([rad(30), rad(60)]);
  assert.ok(closeV(e, [Math.cos(rad(30)), 0.5]));
  assert.ok(closeV(h, [0.8660254, 1.5], 1e-6));
});

test("forward kinematics: θ₂ is relative to link 1 (link 2 points at θ₁ + θ₂)", () => {
  const { h } = fk([0, rad(90)]);
  assert.ok(closeV(h, [1, 1]));
});

test("inverse kinematics: both closed-form solutions land the hand on the target", () => {
  for (const p of [[0.866, 1.5], [1, 1], [-0.7, 0.4], [0.2, -1.6], [1.9, 0.1]]) {
    const { sols } = ik(p);
    assert.equal(sols.length, 2, `two solutions inside the workspace for ${p}`);
    for (const q of sols) assert.ok(closeV(fk(q).h, p, 1e-6), `fk(ik(${p})) round-trips`);
    assert.ok(close(sols[0][1], -sols[1][1]), "the elbow angles are mirror images");
  }
});

test("inverse kinematics: the lesson's example target (0.866, 1.5) gives A = (30°, 60°) and B = (90°, −60°)", () => {
  const { sols } = ik([0.8660254, 1.5]);
  assert.ok(closeV(sols[0].map(deg), [30, 60], 1e-4));
  assert.ok(closeV(sols[1].map(deg), [90, -60], 1e-4));
});

test("inverse kinematics: no solution outside the reachable ring, one on its edge", () => {
  assert.equal(ik([2.5, 0]).sols.length, 0);
  const { sols } = ik([2, 0]); // exactly on the outer circle: A and B merge (θ₂ = 0)
  assert.equal(sols.length, 2);
  assert.ok(close(sols[0][1], 0) && close(sols[1][1], 0));
});

test("inverse kinematics: unequal links open a hole of radius |l₁ − l₂|", () => {
  assert.equal(ik([0.3, 0], 1, 0.5).sols.length, 0);
  assert.equal(ik([0.6, 0], 1, 0.5).sols.length, 2);
});

test("Jacobian matches finite differences of forward kinematics", () => {
  const eps = 1e-6;
  for (const q of [[rad(30), rad(60)], [rad(-100), rad(20)], [rad(170), rad(-150)], [0.3, 0.9]]) {
    const J = jac(q), h0 = fk(q).h;
    for (let j = 0; j < 2; j++) {
      const dq = q.slice(); dq[j] += eps;
      const col = fk(dq).h.map((x, i) => (x - h0[i]) / eps);
      assert.ok(close(col[0], J[0][j], 1e-5) && close(col[1], J[1][j], 1e-5), `column ${j + 1} at q=${q}`);
    }
  }
});

test("det J = l₁ l₂ sin θ₂, and the worked example at (30°, 60°)", () => {
  for (const q of [[rad(30), rad(60)], [1.1, -0.4], [rad(30), 0]]) assert.ok(close(det2(jac(q)), Math.sin(q[1]), 1e-9));
  const J = jac([rad(30), rad(60)]);
  assert.ok(closeV(J[0], [-1.5, -1], 1e-6) && closeV(J[1], [0.8660254, 0], 1e-6));
});

test("differential IK: the lesson's example ṗ* = (0.1, 0) at (30°, 60°) needs q̇ = (0, −0.1)", () => {
  const J = jac([rad(30), rad(60)]);
  const qd = mv(inv2(J), [0.1, 0]);
  assert.ok(closeV(qd, [0, -0.1], 1e-6));
  assert.ok(closeV(mv(J, qd), [0.1, 0], 1e-9), "J q̇ reproduces ṗ*");
});

test("plain inverse fails at the singularity; the damped pseudo-inverse stays finite", () => {
  const Js = jac([rad(30), 0]);
  assert.equal(inv2(Js), null);
  const P = dampedPinv(Js, 0.1);
  assert.ok(P !== null);
  const qd = mv(P, [0.25, 0.15]);
  assert.ok(Math.hypot(qd[0], qd[1]) < 10, "bounded joint speeds near det J = 0");
});

test("damped pseudo-inverse tends to the plain inverse as λ → 0", () => {
  const J = jac([rad(30), rad(60)]), Ji = inv2(J), P = dampedPinv(J, 1e-4);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) assert.ok(close(P[i][j], Ji[i][j], 1e-3));
});

// ---- datasets.html: the delta_timestamps fetch rule (lerobot 0.6.1 dataset_reader._get_query_indices) ----
const dhtml = readFileSync(new URL("./datasets.html", import.meta.url), "utf8");
const djs = dhtml.split("<script>")[1].split("</script>")[0];
const dStart = djs.indexOf("// ================= helpers"), dEnd = djs.indexOf("// ================= synthetic");
assert.ok(dStart > 0 && dEnd > dStart, "could not find the fetch-rule sections in datasets.html");
const D = new Function(djs.slice(dStart, dEnd) + "\nreturn { fetchWindow, isWhole, toFrames, FPS, EP_LEN, PRESETS };")();

test("datasets: offsets in seconds become whole frames at 30 fps", () => {
  assert.equal(D.toFrames(0.1), 3);
  assert.equal(D.toFrames(-0.2), -6);
  assert.ok(D.isWhole(0.0333) && D.isWhole(-0.1) && D.isWhole(0));
  assert.ok(!D.isWhole(0.05) && !D.isWhole(0.033), "1.5 frames, and 0.99 frames, are outside tolerance_s = 1e-4");
});

test("datasets: the History BC recipe at t = 100 fetches frames 94, 97, 100", () => {
  assert.deepEqual(D.fetchWindow(D.PRESETS.history.obs, 100).map((o) => o.used), [94, 97, 100]);
  assert.deepEqual(D.fetchWindow(D.PRESETS.history.obs, 100).map((o) => o.pad), [false, false, false]);
});

test("datasets: an action chunk at the last frame is clamped and masked [False, True, True, True]", () => {
  const W = D.fetchWindow(D.PRESETS.chunk.act, D.EP_LEN - 1);
  assert.deepEqual(W.map((o) => o.raw), [239, 242, 245, 248]);
  assert.deepEqual(W.map((o) => o.used), [239, 239, 239, 239]);
  assert.deepEqual(W.map((o) => o.pad), [false, true, true, true]);
});

test("datasets: a history window at frame 0 is clamped to the episode start, never the previous episode", () => {
  const W = D.fetchWindow(D.PRESETS.history.obs, 0);
  assert.deepEqual(W.map((o) => o.used), [0, 0, 0]);
  assert.deepEqual(W.map((o) => o.pad), [true, true, false]);
});

test("wrap keeps angles in (−π, π]", () => {
  for (const a of [0, 3.5, -3.5, 10, -10, Math.PI, -Math.PI]) { const w = wrap(a); assert.ok(w > -Math.PI - 1e-12 && w <= Math.PI + 1e-12); assert.ok(close(Math.sin(w), Math.sin(a), 1e-9)); }
});

// ---- tab 5, "The real arm (3D)": arm3d.js against the vendored SO-101 URDF ----
// Source of truth: docs/vendor/so101_new_calib.urdf (TheRobotStudio/SO-ARM100 @ 385e8d7, Apache-2.0), copied unmodified.
// The "known poses" below come from docs/vendor/reference_fk.py, a separate implementation (XML parser + 4×4 matrices) that shares no code with the page.
const a3 = readFileSync(new URL("./arm3d.js", import.meta.url), "utf8");
const kStart = a3.indexOf("// ================= kin3d (pure)"), kEnd = a3.indexOf("// ================= end kin3d");
assert.ok(kStart >= 0 && kEnd > kStart, "could not find the kin3d section in arm3d.js");
const K3 = new Function(a3.slice(kStart, kEnd) + "\nreturn K3;")();
const urdf = readFileSync(new URL("./docs/vendor/so101_new_calib.urdf", import.meta.url), "utf8");
const lStart = js.indexOf("// ================= lessons: tab 5 (data)"), lEnd = js.indexOf("// ================= lessons =================");
assert.ok(lStart > 0 && lEnd > lStart, "could not find tab 5's lessons in index.html");
const L_R3 = new Function(js.slice(lStart, lEnd) + "\nreturn L_R3;")();
const F = K3.FACTS, D2R = Math.PI / 180;
const rnd = K3.mulberry32(20261005);
const randQ = () => K3.CHAIN.map((j) => j.lim[0] + rnd() * (j.lim[1] - j.lim[0]));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const urdfJoints = () => { const out = {};
  for (const m of urdf.matchAll(/<joint name="(\w+)" type="(revolute|fixed)">([\s\S]*?)<\/joint>/g)) {
    const body = m[3], nums = (re) => body.match(re)[1].trim().split(/\s+/).map(Number), lim = body.match(/lower="([^"]+)" upper="([^"]+)"/);
    out[m[1]] = { type: m[2], xyz: nums(/<origin xyz="([^"]+)"/), rpy: nums(/rpy="([^"]+)"/), axis: nums(/<axis xyz="([^"]+)"/), lim: lim ? [+lim[1], +lim[2]] : null,
      parent: body.match(/<parent link="(\w+)"/)[1], child: body.match(/<child link="(\w+)"/)[1] };
  } return out; };

test("3D: the joint table in arm3d.js is the vendored SO-101 URDF, number for number", () => {
  const U = urdfJoints();
  assert.deepEqual(K3.CHAIN.map((j) => j.name), ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll"]);
  K3.CHAIN.forEach((j, k) => { const u = U[j.name];
    assert.equal(u.type, "revolute"); assert.deepEqual(u.axis, [0, 0, 1], `${j.name} turns about its own z axis`);
    assert.ok(closeV(j.xyz, u.xyz.map((v) => v * 1000), 1e-9), `${j.name} origin (mm = URDF metres × 1000)`);
    assert.deepEqual(j.rpy, u.rpy, `${j.name} rpy`); assert.deepEqual(j.lim, u.lim, `${j.name} limits`);
    if (k) assert.equal(u.parent, U[K3.CHAIN[k - 1].name].child, `${j.name} hangs off the previous joint's link`);
  });
  const tip = U[K3.TOOL.name];
  assert.equal(tip.type, "fixed"); assert.equal(tip.parent, U.wrist_roll.child, "the fingertip frame is fixed to the link the wrist roll turns");
  assert.ok(closeV(K3.TOOL.xyz, tip.xyz.map((v) => v * 1000), 1e-9)); assert.deepEqual(K3.TOOL.rpy, tip.rpy);
});

test("3D forward kinematics: known poses → known positions (independent reference, docs/vendor/reference_fk.py)", () => {
  const REF = [ // [q (rad), joint origins pan…roll (mm), fingertip frame (mm)]
    [[0, 0, 0, 0, 0], [[38.8353, 0, 62.4], [69.2345, -18.2779, 116.6], [97.2341, -18.278, 229.1701], [232.1341, -18.2772, 234.3701], [293.234, -0.1768, 234.3703]], [391.3615, -0.0092, 226.4697]],
    [[0.4, -0.6, 0.9, 0.3, -0.7], [[38.8353, 0, 62.4], [59.7172, -28.6731, 116.5999], [22.4576, -12.9205, 225.3178], [142.5749, -63.7043, 190.4198], [196.0708, -66.6704, 155.9203]], [269.6111, -92.0969, 95.6147]],
    [[-1.5, 1.2, -1.1, 1.3, 2.0], [[38.8353, 0, 62.4], [59.2176, 29.03, 116.6001], [67.3563, 143.8074, 131.2943], [76.8869, 278.2151, 123.0012], [59.5668, 289.8547, 62.7903]], [68.2005, 309.0625, -33.3761]],
  ];
  for (const [q, P, T] of REF) { const f = K3.fk(q);
    P.forEach((p, k) => assert.ok(closeV(f.P[k], p, 1e-4), `joint ${k} at q = ${q}: got ${f.P[k]}, reference ${p}`));
    assert.ok(closeV(f.T, T, 1e-4), `fingertip at q = ${q}: got ${f.T}, reference ${T}`);
  }
  const A0 = K3.fk([0, 0, 0, 0, 0]).A; // zero-pose axes from the same reference run
  [[0, 0, -1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [-1, 0, 0]].forEach((a, k) => assert.ok(closeV(A0[k], a, 2e-5), `axis ${k}`));
});

test("3D forward kinematics: a quarter-turn of the pan, worked by hand", () => {
  // The pan axis points straight down, so +90° sends an offset (x, y) from the axis to (y, −x) and leaves z alone.
  const O = K3.fk([0, 0, 0, 0, 0]).P[0], T0 = K3.fk([0, 0, 0, 0, 0]).T, T1 = K3.fk([Math.PI / 2, 0, 0, 0, 0]).T;
  const want = [O[0] + (T0[1] - O[1]), O[1] - (T0[0] - O[0]), T0[2]];
  assert.ok(closeV(T1, want, 0.005), `got ${T1}, want ${want}`); // 0.005 mm: the URDF rounds π to 3.14159
});

test("3D: the two links are 116 mm and 135 mm, and lift, elbow and wrist share one plane at every pose", () => {
  assert.ok(close(F.L1, 116, 0.001) && close(F.L2, 135, 0.001), `${F.L1}, ${F.L2}`);
  for (let i = 0; i < 200; i++) { const q = randQ(), f = K3.fk(q), pl = K3.planar(q);
    assert.ok(close(dist(f.P[1], f.P[2]), F.L1, 1e-9) && close(dist(f.P[2], f.P[3]), F.L2, 1e-9));
    const lat = [f.P[1], f.P[2], f.P[3]].map((X) => K3.dot(K3.sub(X, pl.O), pl.a));
    assert.ok(Math.max(...lat) - Math.min(...lat) < 1e-9, "S, E, W stay in one plane");
    assert.ok(K3.len(K3.cross(f.A[1], f.A[2])) < 1e-9 && K3.len(K3.cross(f.A[1], f.A[3])) < 1e-9, "the three pitch axes are parallel");
    assert.ok(Math.abs(K3.dot(f.A[0], f.A[1])) < 1e-5, "the pan axis is perpendicular to them");
    assert.ok(Math.abs(K3.dot(f.A[4], pl.a)) < 1e-5, "the gripper's roll axis never leaves the plane's directions (lesson 6's missing motion)");
  }
  assert.equal(F.planeOffset.toFixed(1), "18.3"); assert.equal(Math.abs(K3.planar([0, 0, 0, 0, 0]).latT - K3.planar([0, 0, 0, 0, 0]).latS).toFixed(1), "18.3"); assert.equal(F.tipLever.toFixed(1), "7.9");
});

test("3D: in the side view, lift and elbow are tabs 1–4's θ₁ and θ₂, and the wrist follows tab 1's formula with l₁ = 116, l₂ = 135", () => {
  assert.equal(F.S1, -1); assert.equal(F.S2, -1);
  for (let i = 0; i < 100; i++) { const q = randQ(), pl = K3.planar(q);
    const th1 = F.th1_0 + F.S1 * q[1], th2 = F.th2_0 + F.S2 * q[2];
    // Tolerances: the URDF writes π as 3.14159, which tips the plane by 2.65 millionths of a radian. Measured worst case: 2.7e-6 rad, 0.0007 mm.
    assert.ok(close(wrap(pl.th1 - th1), 0, 1e-5) && close(wrap(pl.th2 - th2), 0, 1e-9), "θ₁ = θ₁⁰ − lift, θ₂ = θ₂⁰ − elbow");
    const h = fk([th1, th2], F.L1, F.L2).h; // the page's own 2D forward kinematics, from tabs 1–4
    assert.ok(closeV([pl.W[0] - pl.S[0], pl.W[1] - pl.S[1]], h, 0.002), "W − S equals the planar fk to within 2 thousandths of a millimetre");
  }
  assert.ok(close(F.reachOuter, F.L1 + F.L2, 1e-9));
  assert.equal(F.th2RangeDeg.map((v) => v.toFixed(1)).join(" "), "-170.7 23.0");
});

test("3D: turning only the pan never changes height (to within the URDF's rounding of π)", () => {
  assert.ok(panWobble > 0 && panWobble < 0.01, `worst height change of the wrist or fingertip over a full pan sweep, 300 poses: ${panWobble} mm`);
});

test("3D: the Jacobian's columns match finite differences (fingertip: 3 × 5; wrist: its last two columns are zero)", () => {
  const h = 1e-6;
  for (let i = 0; i < 25; i++) { const q = randQ();
    for (const poi of ["T", "W"]) { const cols = K3.jacCols(q, poi);
      for (let k = 0; k < 5; k++) { const qp = q.slice(), qm = q.slice(); qp[k] += h; qm[k] -= h;
        const fd = K3.scale(K3.sub(K3.point(K3.fk(qp), poi), K3.point(K3.fk(qm), poi)), 1 / (2 * h));
        assert.ok(closeV(cols[k], fd, 1e-5), `${poi} column ${k}`); } } }
});

test("3D: the 6 × 5 Jacobian's turning rows are the joint axes, and its rank is 5 (never 6)", () => {
  const h = 1e-6;
  for (let i = 0; i < 300; i++) { const q = randQ(); assert.equal(K3.rank6(q), 5);
    if (i >= 10) continue; const J = K3.jac6(q), R0 = K3.fk(q).RT;
    for (let k = 0; k < 5; k++) { const qp = q.slice(); qp[k] += h; const R1 = K3.fk(qp).RT, M = [0, 1, 2].map((r) => [0, 1, 2].map((c) => R1[r][0] * R0[c][0] + R1[r][1] * R0[c][1] + R1[r][2] * R0[c][2])); // R(q+h)·R(q)ᵀ ≈ I + h·[ω]×
      assert.ok(closeV([(M[2][1] - M[1][2]) / (2 * h), (M[0][2] - M[2][0]) / (2 * h), (M[1][0] - M[0][1]) / (2 * h)], J.w[k], 1e-5), `ω column ${k}`); } }
});

test("3D: the pseudo-inverse of the 3 × 5 Jacobian satisfies J J⁺ = I, so J J⁺ J = J", () => {
  for (let i = 0; i < 25; i++) { const q = randQ(), cols = K3.jacCols(q, "T");
    const pinv = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => K3.dls(cols, e, 0)); // pinv[i] = J⁺ eᵢ, five joint speeds
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { let v = 0; for (let k = 0; k < 5; k++) v += cols[k][r] * pinv[c][k]; assert.ok(close(v, r === c ? 1 : 0, 1e-6), `(J J⁺)[${r}][${c}] = ${v}`); } }
});

test("3D: self-motion (lesson 3) holds the fingertip within 0.1 mm across the wrist's whole range", () => {
  const q0 = L_R3[2].setup.q.map((d) => d * D2R), anchor = K3.fk(q0).T, seen = new Set();
  for (let w = -94; w <= 94; w += 4) { const r = K3.hold(q0, anchor, w * D2R);
    assert.ok(r.ok && dist(K3.fk(r.q).T, anchor) < K3.TOL_MM, `wrist ${w}°: off by ${r.err} mm`);
    assert.ok(close(r.q[0], q0[0]) && close(r.q[4], q0[4]) && close(r.q[3], w * D2R, 1e-9), "only lift and elbow were re-solved");
    seen.add(r.q[1].toFixed(3) + "/" + r.q[2].toFixed(3)); }
  assert.equal(seen.size, 48, "every wrist angle gives a different pose: a continuous family, not A or B");
});

test("3D inverse kinematics: lands within 0.1 mm of reachable targets from a nearby pose, and says so when it can't", () => {
  for (let i = 0; i < 60; i++) { const goal = randQ(), target = K3.fk(goal).T, start = K3.clampQ(goal.map((v) => v + (rnd() - 0.5) * 0.5));
    const r = K3.solve(start, target, [true, true, true, true, true], "T");
    assert.ok(r.ok && dist(K3.fk(r.q).T, target) < K3.TOL_MM, `target ${i}: ${r.err} mm after ${r.iters} steps`);
    r.q.forEach((v, k) => assert.ok(v >= K3.CHAIN[k].lim[0] - 1e-12 && v <= K3.CHAIN[k].lim[1] + 1e-12, "stays inside the joint limits")); }
  const q0 = [0, 0, 0, 0, 0], far = [900, 0, 200], r = K3.solve(q0, far, [true, true, true, true, true], "T");
  assert.equal(r.ok, false); assert.ok(r.err < dist(K3.fk(q0).T, far), "it still moved closer"); assert.ok(r.err > 400, "but 900 mm is far outside the workspace");
  const two = K3.solve(L_R3[4].setup.q.map((d) => d * D2R), L_R3[4].setup.target, [true, true, true, true, true], "T");
  assert.ok(two.ok, "lesson 5's target is reachable from lesson 5's start");
});

test("3D: the reachable-points sample is seeded, inside the joint limits, and (pan locked) flat", () => {
  const free = [false, true, true, false, false], base = [0, 0, 0, 0, 0], A = K3.cloud(500, 7, free, base, "W"), B = K3.cloud(500, 7, free, base, "W"), C = K3.cloud(500, 8, free, base, "W");
  assert.deepEqual(Array.from(A), Array.from(B)); assert.notDeepEqual(Array.from(A), Array.from(C));
  const pl = K3.planar(base), S = K3.fk(base).P[1];
  for (let i = 0; i < A.length; i += 3) { const X = [A[i], A[i + 1], A[i + 2]], r = dist(X, S);
    assert.ok(r <= F.reachOuter + 1e-3 && r >= F.reachInner - 1e-3, `wrist sample ${r} mm from the shoulder is inside the ring ${F.reachInner}…${F.reachOuter}`);
    assert.ok(Math.abs(K3.dot(K3.sub(X, pl.O), pl.a) - pl.latS) < 1e-3, "with the pan locked every sample lies in the plane of tabs 1–4"); }
});

test("3D Solve: several starts, because one downhill search often stalls at a joint limit short of a reachable target", () => {
  const all = [true, true, true, true, true], q0 = L_R3[4].setup.q.map((d) => d * D2R); let n = 0, single = 0, multi = 0;
  while (n < 300) { const tg = K3.fk(randQ()).T; if (tg[2] < 0) continue; n++; // reachable by construction: it is some in-limit pose's fingertip
    if (!K3.solve(q0, tg, all, "T").ok) single++;
    const r = K3.solveBest(q0, tg, all, "T"); if (!r.ok) multi++; else assert.ok(dist(K3.fk(r.q).T, tg) < K3.TOL_MM, "a reported success really is within 0.1 mm"); }
  assert.ok(single > 0.05 * n, `the single search misses ${single} of ${n} reachable targets: that is why Solve does not trust it`);
  assert.ok(multi <= 0.01 * n, `with several starts, ${multi} of ${n} reachable targets are still missed (the page says "probably out of reach", not "out of reach")`);
  assert.equal(K3.solveBest([0, 0, 0, 0, 0], [900, 0, 200], all, "T").ok, false, "a target 900 mm away is still reported as not reached");
});

// worst change in height over a full sweep of the pan, at many poses (used by the height test above and by lesson 2's answer)
const panWobble = (() => { let worst = 0; const r2 = K3.mulberry32(7);
  for (let i = 0; i < 300; i++) { const q = K3.CHAIN.map((j) => j.lim[0] + r2() * (j.lim[1] - j.lim[0])); let lo = [1e9, 1e9], hi = [-1e9, -1e9];
    for (let s = 0; s <= 40; s++) { const qq = q.slice(); qq[0] = K3.CHAIN[0].lim[0] + (K3.CHAIN[0].lim[1] - K3.CHAIN[0].lim[0]) * s / 40; const f = K3.fk(qq);
      [f.P[3][2], f.T[2]].forEach((z, k) => { lo[k] = Math.min(lo[k], z); hi[k] = Math.max(hi[k], z); }); }
    worst = Math.max(worst, hi[0] - lo[0], hi[1] - lo[1]); } return worst; })();

test("3D lessons and labels: the typed answers and the numbers quoted on the page are recomputed from the kinematics", () => {
  assert.equal(L_R3.length, 6);
  const byKey = Object.fromEntries(L_R3.filter((s) => s.ask.key).map((s) => [s.ask.key, s.ask])), txt = (s) => s.b + s.ask.q + s.ask.why + (s.ask.o || []).join(" ");
  const num = (x, d) => x.toFixed(d).replace("-", "−"); // the page writes a real minus sign
  // lesson 1: 116 + 135 = 251, the 27.9 mm inner stop, and how the sliders map to tab 1's angles
  assert.ok(txt(L_R3[0]).includes(`${F.L1.toFixed(0)} mm`) && txt(L_R3[0]).includes(`${F.L2.toFixed(0)} mm`));
  assert.ok(Math.abs(F.reachOuter - byKey.reachOuter.a) <= byKey.reachOuter.tol && byKey.reachOuter.a === Math.round(F.L1) + Math.round(F.L2), "lesson 1: 116 + 135 = 251");
  assert.ok(byKey.reachOuter.why.includes(F.reachInner.toFixed(1) + " mm"), `lesson 1 quotes the inner radius ${F.reachInner.toFixed(1)}`);
  const after = L_R3[0].ask.after.q.map((d) => d * D2R), fa = K3.fk(after);
  assert.ok(close(dist(fa.P[1], fa.P[3]), F.reachOuter, 0.01), "lesson 1's reveal pose really straightens the elbow");
  const rel1 = `θ₁ = ${num(F.th1_0 / D2R, 1)}° − lift`, rel2 = `θ₂ = ${num(F.th2_0 / D2R, 1)}° − elbow`;
  assert.ok(L_R3[0].b.includes(rel1) && L_R3[0].b.includes(rel2), `lesson 1 states ${rel1} and ${rel2}`);
  assert.ok(html.includes(`${rel1}, ${rel2}`), "the symbols key states the same two relations");
  // lesson 2: the pan's range and the height change
  assert.deepEqual(F.sliderDeg[0], [-110, 110]); assert.ok(byKey.panHeight.q.includes("−110° to +110°"), "lesson 2 quotes the pan slider's real ends");
  assert.ok(Math.abs(panWobble - byKey.panHeight.a) <= byKey.panHeight.tol, `lesson 2: the measured height change ${panWobble} mm rounds to the answer ${byKey.panHeight.a}`);
  assert.ok(panWobble < 0.01 && byKey.panHeight.why.includes("under 0.01 mm"), `lesson 2's "under 0.01 mm" covers the measured ${panWobble} mm`);
  // lesson 3: the elbow's range in tab 2's θ₂
  assert.ok(L_R3[2].ask.why.includes(`${num(F.th2RangeDeg[0], 1)}°`) && L_R3[2].ask.why.includes(`+${F.th2RangeDeg[1].toFixed(0)}°`), "lesson 3 quotes the elbow's range in tab 2's θ₂");
  // lesson 4: five numbers; the two grid sizes
  assert.equal(byKey.N.a, K3.N); assert.equal(K3.CHAIN.length, 5);
  assert.equal(F.cells2, (360 / 5) ** 2); assert.ok(close(F.cells5, K3.CHAIN.reduce((n, j) => n * (j.lim[1] - j.lim[0]) / (5 * D2R), 1), 1e-3));
  assert.ok(byKey.N.why.includes(`72 × 72 = ${F.cells2.toLocaleString("en-US")}`) && byKey.N.why.includes(`${Math.round(F.cells5 / 1e6)} million`), `lesson 4 quotes ${Math.round(F.cells5 / 1e6)} million`);
  // lesson 5: the roll's column is the tip's distance from the roll axis
  assert.ok(L_R3[4].b.includes(`about ${F.tipLever.toFixed(0)} mm per radian`));
  for (let i = 0; i < 20; i++) { const q = randQ(); assert.ok(close(K3.len(K3.jacCols(q, "T")[4]), F.tipLever, 1e-6), "the roll column's length is that distance at every pose"); }
  // the exact-vs-model list, the free-play list, the controls note
  assert.ok(html.includes(`sits ${F.tipSheet.zero.toFixed(1)} mm to one side of the blue sheet (${F.tipSheet.min.toFixed(0)} to ${F.tipSheet.max.toFixed(0)} mm as the roll turns)`), `the fingertip's offset from the sheet: ${JSON.stringify(F.tipSheet)}`);
  assert.ok(html.includes(`just ${F.tipLever.toFixed(1)} mm off the roll axis`)); assert.ok(html.includes(`within ${K3.TOL_MM} mm of the target`));
  assert.ok(html.includes(`the elbow's ±${F.limitsDeg[2][1].toFixed(1)}° shows as ±${F.sliderDeg[2][1]}°`));
  F.sliderDeg.forEach(([lo, hi], k) => assert.ok(lo >= F.limitsDeg[k][0] - 0.01 && hi <= F.limitsDeg[k][1] + 0.01 && F.limitsDeg[k][1] - hi < 1 && lo - F.limitsDeg[k][0] < 1, `joint ${k}'s slider stops are whole degrees inside its limit`));
  assert.deepEqual(F.th1RangeDeg.map((v) => +v.toFixed(1)), [+(F.th1_0 / D2R - 100).toFixed(1), +(F.th1_0 / D2R + 100).toFixed(1)], "the shaded region's θ₁ range is the lift's ±100° about its offset");
  // every lesson pose is inside the URDF limits and above z = 0
  for (const s of L_R3) for (const q of [s.setup.q, s.ask.after && s.ask.after.q].filter(Boolean))
    q.forEach((d, k) => assert.ok(d * D2R >= K3.CHAIN[k].lim[0] && d * D2R <= K3.CHAIN[k].lim[1], `"${s.t}": joint ${k} at ${d}° is inside its URDF limit`));
  for (const s of L_R3) { const f = K3.fk(s.setup.q.map((d) => d * D2R)); assert.ok(Math.min(f.P[2][2], f.P[3][2], f.P[4][2], f.T[2]) > 0, `"${s.t}" starts above z = 0`); }
});

// ---- workbench.html: the playable bench. Its core (arm control, grasp, recording, replay, lag, the toy policy) is pure, in workbench.js. ----
const wbSrc = readFileSync(new URL("./workbench.js", import.meta.url), "utf8");
const wStart = wbSrc.indexOf("// ================= workbench core (pure)"), wEnd = wbSrc.indexOf("// ================= end workbench core");
assert.ok(wStart >= 0 && wEnd > wStart, "could not find the workbench core in workbench.js");
const WB = new Function("K3", wbSrc.slice(wStart, wEnd) + "\nreturn WB;")(K3);
const DT = 1 / WB.FPS;
const driveTo = (w, P, speed = 180) => { for (let i = 0; i < 600; i++) { const d = K3.sub(P, w.tg), L = K3.len(d); if (L < 0.5) break; WB.step(w, { move: L <= speed * DT ? d : K3.scale(d, speed * DT / L), gripCmd: w.gripCmd }, DT); } for (let i = 0; i < 15; i++) WB.step(w, { gripCmd: w.gripCmd }, DT); };

test("workbench: the hand follows commands to within 1 mm, with the jaws pitched down, at every cube spot and over the bin", () => {
  const w = WB.world(WB.SPOTS[0]);
  for (const P of [...WB.SPOTS.map((s) => [s[0], s[1], 21]), ...WB.SPOTS.map((s) => [s[0], s[1], 130]), [WB.BIN.c[0], WB.BIN.c[1], 84], [WB.BIN.c[0], WB.BIN.c[1], 135], WB.HOME]) {
    driveTo(w, P); const f = K3.fk(w.q); assert.ok(dist(f.T, P) < 1, `hand ${f.T} vs ${P}`); // within 1 mm: pitch and position trade off near the edge
    assert.ok(WB.pitchOf(f) < -60 * D2R, `jaws point down (${(WB.pitchOf(f) / D2R).toFixed(0)}°) at ${P}`);
    w.q.forEach((v, k) => assert.ok(v >= K3.CHAIN[k].lim[0] - 1e-9 && v <= K3.CHAIN[k].lim[1] + 1e-9)); }
});

test("workbench: pushing past the edge of reach stops the hand and tilts the jaws instead of breaking a joint limit", () => {
  const w = WB.world(WB.SPOTS[0]); for (let i = 0; i < 240; i++) WB.step(w, { move: [7, 0, 0], gripCmd: 0 }, DT); // hold "forward" for 8 seconds
  const f = K3.fk(w.q); assert.ok(w.edge > 0, "the edge flag is up"); assert.ok(dist(w.tg, f.T) <= 20.001, "the request is held within 20 mm of the hand");
  assert.ok(WB.pitchOf(f) > -60 * D2R, `the jaws relaxed from −75° to ${(WB.pitchOf(f) / D2R).toFixed(0)}° to reach further`);
  w.q.forEach((v, k) => assert.ok(v >= K3.CHAIN[k].lim[0] - 1e-9 && v <= K3.CHAIN[k].lim[1] + 1e-9, "inside the URDF limits"));
  assert.ok(f.T[0] > 380, `it got ${f.T[0].toFixed(0)} mm out along x`);
  const T1 = f.T.slice(); for (let i = 0; i < 60; i++) WB.step(w, { move: [7, 0, 0], gripCmd: 0 }, DT); assert.ok(dist(K3.fk(w.q).T, T1) < 3, "another two seconds of pushing moves the hand under 3 mm: it has stopped");
});

test("workbench: the grasp is a toy with one rule: the closed jaws take the cube if its centre is within 21 mm of the fingertip", () => {
  const w = WB.world(WB.SPOTS[0]), c = w.cube.p.slice();
  driveTo(w, [c[0], c[1] + 30, 40]); for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 1 }, DT); assert.equal(w.held, false, "37 mm away: nothing");
  for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 0 }, DT); driveTo(w, [c[0], c[1] + 23, 18]); for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 1 }, DT); assert.equal(w.held, false, "23 mm away: still nothing");
  for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 0 }, DT); driveTo(w, [c[0], c[1] + 20, 18]); for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 1 }, DT); assert.equal(w.held, true, "20 mm away: taken");
  for (let i = 0; i < 40; i++) WB.step(w, { gripCmd: 0 }, DT); WB.placeCube(w, [c[0], c[1]]); driveTo(w, [c[0] + 40, c[1], 21]); for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 1 }, DT); assert.equal(w.held, false, "closed early, 40 mm short");
  driveTo(w, [c[0], c[1], 21], 60); assert.equal(w.held, true, "sliding the closed jaws onto the cube takes it (the toy's one rule)");
  for (let i = 0; i < 40; i++) WB.step(w, { gripCmd: 0 }, DT); WB.placeCube(w, [c[0], c[1]]); driveTo(w, [c[0], c[1], 21]); for (let i = 0; i < 20; i++) WB.step(w, { gripCmd: 1 }, DT); assert.equal(w.held, true, "at the cube: taken");
  driveTo(w, [c[0], c[1], 120]); assert.ok(WB.cubeWorld(w)[2] > 90, "the cube rides up with the hand");
  for (let i = 0; i < 40; i++) WB.step(w, { gripCmd: 0 }, DT); assert.equal(w.held, false); assert.equal(w.cube.state, "rest"); assert.ok(close(w.cube.p[2], WB.TOP + WB.HALF, 1e-9), "let go: it falls back onto the mat");
});

test("workbench: a recording replays its own joint path exactly, reproduces the outcome, and misses once the cube is moved 4 cm", () => {
  for (const spot of WB.SPOTS) { const ep = WB.demonstrate(spot); assert.ok(ep.frames.length > 60 && ep.end.held === false && WB.inBin(ep.end.p), `the demonstrator delivers from ${spot}`);
    ep.frames.forEach((fr) => { assert.equal(fr.s.length, 6); assert.equal(fr.a.length, 6); });
    { const w = WB.world(ep.cube.p, { yaw: ep.cube.yaw }), play = { x: 0, gi: 0 }; for (let i = 1; i < ep.frames.length; i++) { WB.replay(ep, w, DT, play); assert.deepEqual(w.q, ep.frames[i].a.slice(0, 5), `replay frame ${i}: the world's joints equal the recorded row, bit for bit`); } }
    for (const [nudge, expect] of [[0, true], [40, false]]) { const w = WB.world([ep.cube.p[0], ep.cube.p[1] + nudge], { yaw: ep.cube.yaw }), play = { x: 0, gi: 0 }; let done = false;
      for (let i = 0; i < 2000 && !done; i++) done = WB.replay(ep, w, DT, play).done;
      assert.equal(WB.sameEnd(ep, w), expect, `nudge ${nudge} mm from ${spot}: outcome ${expect ? "matches" : "differs"}`); assert.equal(WB.inBin(w.cube.p), expect); } }
});

test("workbench: the world advances in 1/30 s steps whatever the display rate", () => {
  for (const hz of [60, 120, 144, 30]) { let acc = 0, n = 0; for (let i = 0; i < hz * 10; i++) { const t = WB.ticks(acc, 1 / hz); acc = t.acc; n += t.n; } assert.ok(Math.abs(n - 300) <= 1, `${hz} Hz: ${n} steps in 10 s`); }
  assert.equal(WB.ticks(0, 1 / 60).n, 0); assert.equal(WB.ticks(1 / 60, 1 / 60).n, 1); assert.equal(WB.ticks(0, 0.5).n, 7, "a long stall is capped, not replayed all at once");
});

test("workbench: with lag, a command takes effect exactly N frames later", () => {
  for (const lag of [3, 6]) { const w = WB.world(WB.SPOTS[0], { lag }), h0 = WB.handOf(w), moved = [];
    for (let i = 0; i < lag + 4; i++) { WB.step(w, { move: i === 0 ? [30, 0, 0] : [0, 0, 0], gripCmd: 0 }, DT); moved.push(dist(WB.handOf(w), h0)); }
    moved.forEach((m, i) => assert.ok(i < lag ? m < 1e-9 : m > 20, `lag ${lag}: frame ${i} moved ${m.toFixed(1)} mm`)); }
});

test("workbench: mission 7's lesson holds for clean and clumsy demonstrations: four demos from different spots beat one, and deliver at most of eight unseen spots", () => {
  const score = (p) => WB.scorePolicy(p).filter((r) => r.ok).length, fit = (eps, seed) => WB.train(WB.mlp(seed), WB.dataset(eps), { seed: seed + 2 });
  assert.ok(WB.demonstrate(WB.SPOTS[1], { noisy: 1 }).frames.length > WB.demonstrate(WB.SPOTS[1]).frames.length, "the clumsy demonstrator pauses and dithers, so its episodes are longer");
  for (const kind of ["clean", "noisy"]) { const demos = [0, 1, 2, 3].map((i) => (kind === "clean" ? WB.demonstrate(WB.SPOTS[i]) : WB.demonstrate(WB.SPOTS[i], { noisy: i })));
    for (const seed of [1, 2]) { const one = score(fit([demos[0]], seed)), four = score(fit(demos, seed));
      assert.ok(four >= 6, `${kind}, seed ${seed}: four demonstrations deliver at ${four} of 8 unseen spots`); assert.ok(four >= one, `${kind}, seed ${seed}: four (${four}) at least match one (${one})`); } }
  const p2 = WB.train(WB.mlp(1), WB.dataset([WB.demonstrate(WB.SPOTS[0])]), { steps: 300 }); assert.deepEqual(WB.forward(p2, WB.features([200, 0, 100], [230, 90, 18], 0)).o, WB.forward(WB.train(WB.mlp(1), WB.dataset([WB.demonstrate(WB.SPOTS[0])]), { steps: 300 }), WB.features([200, 0, 100], [230, 90, 18], 0)).o, "training is deterministic for a seed");
});

test("workbench: mission answers and spots are consistent with the rest of the lab", () => {
  const M = WB.MISSIONS; assert.equal(M.length, 7); assert.deepEqual(M.map((m) => m.id), ["pick", "joints", "far", "record", "blind", "lag", "teach"]);
  const rec = M.find((m) => m.id === "record"); assert.equal(WB.FPS, 30); assert.equal(rec.ask.a, 180); { const w = WB.world(WB.SPOTS[0]), ep = WB.recorder(w); for (let i = 0; i < 6 * WB.FPS; i++) { const r = WB.step(w, { gripCmd: 0 }, DT); WB.record(ep, w, r.state, r.events); } assert.equal(ep.frames.length, 180, "six seconds of 1/30 s steps records 180 rows"); }
  const lagM = M.find((m) => m.id === "lag"); assert.equal(lagM.lag * 1000 / WB.FPS, 200, "six 1/30 s frames of lag is 200 ms"); assert.ok(lagM.ask.why.includes("fifth of a second"));
  assert.ok(M.find((m) => m.id === "pick").ask.why.includes("thirty times a second"), "mission 1 states the world's rate");
  { const far = M.find((m) => m.id === "far"); assert.ok(far.ask.why.includes(`${K3.FACTS.L1.toFixed(0)} and ${K3.FACTS.L2.toFixed(0)} mm`) && far.ask.why.includes(`${K3.FACTS.reachOuter.toFixed(0)} mm`), "mission 3 quotes the links and the 251 mm ring");
    const w = WB.world(WB.SPOTS[0]); for (let i = 0; i < 240; i++) WB.step(w, { move: [7, 0, 0], gripCmd: 0 }, DT); const f = K3.fk(w.q); assert.ok(dist(f.P[3], f.P[1]) > 248, "at the edge the arm is straight: wrist to shoulder is the two links' length"); w.q.forEach((v, k) => assert.ok(K3.CHAIN[k].lim[1] - Math.abs(v) > 0.1, "no joint is at its limit there")); }
  for (const m of M) for (const s of m.spots) { const d = Math.hypot(s[0] - K3.CHAIN[0].xyz[0], s[1]); assert.ok(d < 320 && WB.demonstrate(s).end.p && WB.inBin(WB.demonstrate(s).end.p), `"${m.title}": a cube at ${s} (${d.toFixed(0)} mm out) can be delivered`); }
  assert.ok(WB.FAR_SPOTS.every((s) => Math.hypot(s[0] - K3.CHAIN[0].xyz[0], s[1]) > 260) && WB.SPOTS.every((s) => Math.hypot(s[0] - K3.CHAIN[0].xyz[0], s[1]) < 245), "far spots are farther out than the ordinary ones");
});
