// Checks the kinematics that index.html teaches, against identities and the lessons' worked examples.
// Run with:  npm test   (Node 18+, no dependencies)
// The math lives inline in index.html; this file slices out the helpers/state/kinematics sections and evaluates them.
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
