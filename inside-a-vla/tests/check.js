/* Inside a VLA — checks. `node tests/check.js` verifies the invariants and prints every number the page and ACCEPTANCE.md quote.
   There is no randomness: the printout is the same on every machine. Exits non-zero if a check fails. */
"use strict";
var V = require("../js/core.js");
var fails = 0;
function ok(cond, what) { if (!cond) { fails++; console.log("  ✗ " + what); } else console.log("  ✓ " + what); }
function f(n, d) { return Number(n).toFixed(d == null ? 1 : d); }
function G(x) { return f(x / 1e9, 1); }
function M(x) { return f(x / 1e6, 1); }
function head(s) { console.log("\n" + s); }
function c(o, base) { return Object.assign(V.preset(base || "smolvla"), o || {}); }
var S = c(), P = c({}, "pi0"), FS = V.flops(S), FP = V.flops(P), PS = V.params(S), PP = V.params(P);

head("Shapes and weights (from the released configs; the papers' totals for comparison)");
(function () {
  var xs = V.expertShape(S), xp = V.expertShape(P);
  console.log("  SmolVLA expert: width " + xs.width + " (0.75 × 960), MLP " + xs.mlp + " (LeRobot's get_intermediate_size), " + S.floors + " layers, " + V.expertLayers(S).filter(function (k) { return k === "ca"; }).length + " cross + " + V.expertLayers(S).filter(function (k) { return k === "sa"; }).length + " self");
  console.log("  π0 expert: width " + xp.width + ", MLP " + xp.mlp + ", " + P.floors + " layers");
  console.log("  weights per tower floor: SmolLM2-360M shape " + M(V.towerLayerParams(V.TOWERS.small)) + "M · Gemma-2B " + M(V.towerLayerParams(V.TOWERS.big)) + "M");
  console.log("  SmolVLA weights a chunk runs through: photo desk " + M(PS.eyes) + "M + connector " + M(PS.conn) + "M + tower " + M(PS.tower) + "M + expert " + M(PS.expert) + "M = " + M(PS.hot) + "M (word embeddings " + M(PS.embed) + "M; paper: 450M)");
  console.log("  π0 weights a chunk runs through: photo desk " + M(PP.eyes) + "M + connector " + M(PP.conn) + "M + tower " + M(PP.tower) + "M + expert " + M(PP.expert) + "M = " + f(PP.hot / 1e9, 2) + "B (word embeddings " + M(PP.embed) + "M; paper: 3.3B)");
  ok(Math.abs(PS.expert - 100e6) < 5e6, "SmolVLA's expert comes out at ~100M, as the paper says (" + f(PS.expert / 1e6, 0) + "M)");
  ok(Math.abs(PP.expert - 300e6) < 15e6, "π0's expert comes out at ~300M, as the paper says (" + f(PP.expert / 1e6, 0) + "M)");
  ok(Math.abs(PP.eyes - 400e6) < 20e6, "SigLIP-So400m comes out at ~400M (" + f(PP.eyes / 1e6, 0) + "M)");
  console.log("  SmolVLA: the paper's 450M less the " + f(PS.hot / 1e6, 0) + "M that run per chunk = " + f((450e6 - PS.hot) / 1e6, 0) + "M of weights that don't (the word-embedding table alone is " + f(PS.embed / 1e6, 0) + "M)");
  ok(Math.abs(PP.hot + PP.embed - 3.3e9) < 0.15e9, "π0: running weights + Gemma's embedding table ≈ 3.3B (" + f((PP.hot + PP.embed) / 1e9, 2) + "B)");
  ok(PP.hot / PS.hot > 7 && PP.hot / PS.hot < 8, "π0 runs 7–8× SmolVLA's weights per chunk (" + f(PP.hot / PS.hot, 2) + "×)");
})();

head("Step 0 · The mailroom: cards");
(function () {
  var ps = V.prefix(S), pp = V.prefix(P);
  console.log("  SmolVLA: (512 ÷ 16)² = " + ps.patches + " tiles ÷ 4² = " + ps.perFrame + " cards a frame; 3 cameras " + ps.img + " + " + ps.lang + " words + " + ps.state + " joint = " + ps.T);
  console.log("  π0: (224 ÷ 14)² = " + pp.patches + " a frame; 3 cameras " + pp.img + " + " + pp.lang + " words = " + pp.T + " (joint card to the expert)");
  ok(ps.perFrame === 64, "SmolVLA: 64 cards per frame, the paper's figure");
  ok(pp.perFrame === 256, "π0: 256 per 224-px frame, PaliGemma's figure");
  ok(ps.T === 241 && pp.T === 816, "prefixes: 241 and 816");
  console.log("  r = 2: " + V.prefix(c({ r: 2 })).perFrame + " a frame, prefix " + V.prefix(c({ r: 2 })).T + " · r = 1: prefix " + V.prefix(c({ r: 1 })).T + " · two cameras: " + V.prefix(c({ cams: 2 })).T);
})();

head("Step 1 · The tower: one forward pass");
(function () {
  var t = FS.parts.tower, tp = FP.parts.tower, s1 = c({ r: 1 }), t1 = V.towerFlops(s1);
  console.log("  SmolVLA tower: staff " + G(t.lin) + " + meetings " + G(t.att) + " = " + G(t.total) + " GFLOP; meetings " + f(t.att / t.total * 100, 1) + "%");
  console.log("  π0 tower: staff " + G(tp.lin) + " + meetings " + G(tp.att) + " + joint card " + G(tp.state) + " = " + G(tp.total) + " GFLOP; meetings " + f(tp.att / tp.total * 100, 1) + "%");
  console.log("  SmolVLA, bundler off (r = 1): " + V.prefix(s1).T + " cards (" + f(V.prefix(s1).T / 241, 1) + "×), tower " + G(t1.total) + " GFLOP = " + f(t1.total / t.total, 1) + "×; staff " + f(t1.lin / t.lin, 1) + "×, meetings " + f(t1.att / t.att, 0) + "× and now " + f(t1.att / t1.total * 100, 0) + "% of the tower");
  console.log("  SmolVLA, r = 2: tower " + G(V.towerFlops(c({ r: 2 })).total) + " GFLOP");
  var e = FS.parts.eyes, ep = FP.parts.eyes;
  console.log("  photo desk: SmolVLA " + G(FS.eyes) + " GFLOP (" + V.patches(V.EYES["b16-512"]) + " tiles a frame through " + f(PS.eyes / 1e6, 0) + "M weights; connector " + G(e.conn) + ") · π0 " + G(FP.eyes) + " GFLOP (" + V.patches(V.EYES["so400m-224"]) + " tiles through " + f(PP.eyes / 1e6, 0) + "M)");
  console.log("  share of the prefix in the photo desk: SmolVLA " + f(FS.eyes / (FS.eyes + FS.tower) * 100, 1) + "% of " + G(FS.eyes + FS.tower) + " GFLOP · π0 " + f(FP.eyes / (FP.eyes + FP.tower) * 100, 1) + "%");
  ok(t.att / t.total < 0.06, "attention is a small share of SmolVLA's tower at 241 cards");
  ok(t1.total / t.total > 13, "turning the bundler off grows the tower more than the card count");
  ok(FS.eyes / (FS.eyes + FS.tower) > 0.8, "after pixel shuffle, the photo desk is most of SmolVLA's prefix");
  ok(Math.abs(FS.eyes - FP.eyes) / FP.eyes < 0.05, "the two photo desks cost within 5% of each other");
})();

head("Step 2 · Halfway up: layer skipping");
(function () {
  var prev = 0, f32 = V.flops(c({ floors: 32 })), f16 = FS;
  [4, 8, 12, 16, 20, 24, 28, 32].forEach(function (N) {
    var fx = V.flops(c({ floors: N })); ok(fx.total > prev, "N = " + N + ": tower " + G(fx.tower) + " + 10 drafts " + G(fx.passes) + " + photo desk " + G(fx.eyes) + " = " + G(fx.total) + " GFLOP, saves " + f((1 - fx.total / f32.total) * 100, 0) + "% against 32"); prev = fx.total;
  });
  console.log("  tower + drafting room: 32 floors " + G(f32.tower + f32.passes) + " → 16 floors " + G(f16.tower + f16.passes) + " GFLOP (" + f((f16.tower + f16.passes) / (f32.tower + f32.passes), 3) + "×)");
  ok(Math.abs((f16.tower + f16.passes) / (f32.tower + f32.passes) - 0.5) < 1e-9, "N = L/2 exactly halves the tower and the drafting room");
  console.log("  SmolVLA Table 8 (quoted): " + V.PAPER.layers.map(function (r) { return "N = " + r.N + ": " + f(r.avg, 1); }).join(" · ") + " · Skip %2 " + V.PAPER.skip2 + " · VLM-256M " + V.PAPER.vlm256);
})();

head("Step 3 · The drafting room");
(function () {
  console.log("  SmolVLA one draft: " + G(FS.pass) + " GFLOP (" + f(FS.pass / FS.tower * 100, 1) + "% of the tower's " + G(FS.tower) + "); 10 drafts " + G(FS.passes) + " GFLOP; reads per cross floor 50 × 241 = " + 50 * 241 + ", per self floor 50 × 241 + 1,275 = " + (50 * 241 + 50 * 51 / 2));
  var xs = V.expertShape(S), caProj = 2 * (2 * xs.kv * xs.kv) * 8 * V.prefix(S).T;
  console.log("  of which the 8 cross floors' k and v projections over the 241 cached cards: " + f(FS.parts.pass.proj / 1e9, 2) + " GFLOP (2 × 2 × " + xs.kv + "² × 8 × 241), LeRobot's way; over 50 cards it would be " + f(caProj * 50 / 241 / 1e9, 2));
  ok(Math.abs(FS.parts.pass.proj - caProj) < 1, "the cross floors' k and v projections are counted over the 241 cached cards, not the 50 action cards");
  console.log("  π0 one draft: " + G(FP.pass) + " GFLOP (" + f(FP.pass / FP.tower * 100, 1) + "% of the tower); 10 drafts " + G(FP.passes) + "; reads per floor 50 × (816 + 1 + 50) = " + 50 * 867);
  var ns = V.flopsNoCache(S), np = V.flopsNoCache(P);
  console.log("  without the cache: SmolVLA " + G(FS.total) + " → " + G(ns) + " GFLOP (" + f(ns / FS.total, 2) + "×) · π0 " + f(FP.total / 1e12, 2) + " → " + f(np / 1e12, 1) + " TFLOP (" + f(np / FP.total, 2) + "×); π0's tower is " + f(FP.tower / FP.total * 100, 0) + "% of its chunk");
  ok(np / FP.total > ns / FS.total, "the cache is worth more to the bigger tower");
  [10, 50, 100].forEach(function (n) { console.log("  SmolVLA n = " + n + ": one draft " + f(V.flops(c({ chunk: n })).pass / 1e9, 2) + " GFLOP"); });
  console.log("  SmolVLA Tables 6, 7, 12 (quoted): CA " + V.PAPER.attn.CA + " · SA " + V.PAPER.attn.SA + " · CA+SA " + V.PAPER.attn["CA+SA"] + " · causal " + V.PAPER.mask.causal + " · bidirectional " + V.PAPER.mask.bidir + " · chunk " + V.PAPER.chunk.map(function (r) { return r.n + " → " + f(r.avg, 1); }).join(", "));
})();

head("Step 4 · The stopwatch (toy computers: F, B; bf16 weights)");
(function () {
  Object.keys(V.HW).forEach(function (h) { var hw = V.HW[h]; console.log("  " + hw.name + ": F = " + hw.F / 1e12 + " TFLOP/s, B = " + hw.B / 1e9 + " GB/s"); });
  ["gpu", "edge", "laptop"].forEach(function (h) {
    [["SmolVLA", S], ["π0", P]].forEach(function (m) {
      var L = V.latency(m[1], h);
      console.log("  " + m[0] + " on the " + L.hw.name + ": photo desk " + f(L.eyes.s * 1e3, 2) + " ms (" + L.eyes.bound + ") + tower " + f(L.tower.s * 1e3, 2) + " ms (" + L.tower.bound + ") + 10 × " + f(L.pass.s * 1e3, 3) + " ms (" + L.pass.bound + ") = " + f(L.ms, 1) + " ms · d = " + V.ticks(L.ms, 30) + " at 30 fps, " + V.ticks(L.ms, 50) + " at 50 Hz");
    });
  });
  var g = V.latency(S, "gpu"), g5 = V.latency(c({ steps: 5 }), "gpu"), lap = V.latency(S, "laptop"), d = V.ticks(lap.ms, 30);
  console.log("  SmolVLA, toy desktop GPU: 10 drafts " + f(g.ms, 1) + " ms → 5 drafts " + f(g5.ms, 1) + " ms; one draft reads " + f((2 * PS.expert + FS.parts.pass.kvRead) / 1e6, 0) + " MB (" + f(FS.pass / 1e9, 1) + " GFLOP)");
  console.log("  SmolVLA, toy laptop CPU, 30 fps: " + f(lap.ms, 0) + " ms ÷ " + f(1000 / 30, 1) + " ms = " + f(lap.ms * 30 / 1000, 1) + ", d = " + d + "; sync cycle " + d + " + 50 = " + (d + 50) + " ticks; async g ≥ " + f(lap.ms * 30 / 1000, 1) + " / 50 = " + f(V.gNeeded(lap.ms, 30, 50), 2) + " (unfloored)");
  [10, 50, 100].forEach(function (n) { var x = c({ chunk: n }); console.log("  SmolVLA n = " + n + ": toy GPU " + f(V.latency(x, "gpu").ms, 2) + " ms · toy laptop " + f(V.latency(x, "laptop").ms, 1) + " ms, g ≥ " + f(V.gNeeded(V.latency(x, "laptop").ms, 30, n), 2) + (V.gNeeded(V.latency(x, "laptop").ms, 30, n) > 1 ? " (above 1: no threshold works, shown as such on the page)" : "")); });
  ok(V.gNeeded(V.latency(c({ chunk: 10 }), "laptop").ms, 30, 10) > 1 && V.gNeeded(lap.ms, 30, 50) < 1, "on the toy laptop a 10-line order needs g > 1 (impossible) while a 50-line order does not");
  ok(g.pass.bound === "memory" && g.tower.bound === "compute", "on the toy GPU SmolVLA's drafts are memory-bound and its tower compute-bound");
  ok(V.latency(c({ chunk: 10 }), "gpu").ms === g.ms, "on the toy GPU, 10 lines cost what 50 cost (memory-bound drafts)");
  var pi = V.latency(P, "gpu");
  console.log("  π0 prefill (photo desk + tower) on the toy GPU: " + f(pi.prefill * 1e3, 1) + " ms (RTC paper: 46 ms on an RTX 4090)");
  ok(Math.abs(pi.prefill * 1e3 - 46) / 46 < 0.15, "the toy GPU's π0 prefill lands within 15% of the reported 46 ms");
})();

head("Step 5 · Side by side");
(function () {
  console.log("  per chunk: SmolVLA " + f(FS.total / 1e12, 2) + " TFLOP · π0 " + f(FP.total / 1e12, 2) + " TFLOP · ratio " + f(FP.total / FS.total, 1) + "× · paper parameter ratio 3.3B / 450M = " + f(3.3e9 / 450e6, 1) + "×");
  console.log("  towers: π0 " + f(FP.tower / FS.tower, 0) + "× SmolVLA's; SmolVLA's photo desk is " + f(FS.eyes / FS.total * 100, 0) + "% of its chunk");
  var edge = V.latency(S, "edge");
  console.log("  work order A (laptop, 30 fps, < 200 ms): B/16·256 px + 2 cameras + 5 drafts = " + f(V.latency(c({ eyes: "b16-256", cams: 2, steps: 5 }), "laptop").ms, 1) + " ms · B/16·256 px + 3 drafts = " + f(V.latency(c({ eyes: "b16-256", steps: 3 }), "laptop").ms, 1) + " ms");
  console.log("  work order B (big tower, toy GPU, 50 Hz, d ≤ 1): π0 as is " + f(V.latency(P, "gpu").ms, 1) + " ms, d " + V.ticks(V.latency(P, "gpu").ms, 50) + " · r = 2: " + f(V.latency(c({ r: 2 }, "pi0"), "gpu").ms, 1) + " ms · 9 floors: " + f(V.latency(c({ floors: 9 }, "pi0"), "gpu").ms, 1) + " ms · 1 camera: " + f(V.latency(c({ cams: 1 }, "pi0"), "gpu").ms, 1) + " ms");
  console.log("  work order C (edge, 3 cameras, ≤ half of " + f(edge.ms, 1) + " = " + f(edge.ms / 2, 1) + " ms): B/16·256 px " + f(V.latency(c({ eyes: "b16-256" }), "edge").ms, 1) + " ms · 4 floors + 1 draft " + f(V.latency(c({ floors: 4, steps: 1 }), "edge").ms, 1) + " ms (photo desk alone " + f(edge.eyes.s * 1e3, 1) + " ms)");
  ok(V.latency(c({ eyes: "b16-256", cams: 2, steps: 5 }), "laptop").ms < 200, "work order A is solvable");
  ok(V.ticks(V.latency(c({ r: 2 }, "pi0"), "gpu").ms, 50) <= 1 && V.ticks(V.latency(c({ floors: 9 }, "pi0"), "gpu").ms, 50) <= 1, "work order B is solvable two ways");
  ok(V.latency(c({ eyes: "b16-256" }), "edge").ms <= edge.ms / 2 && V.latency(c({ floors: 4, steps: 1 }), "edge").ms > edge.ms / 2, "work order C needs the photo desk: cutting floors and drafts can't halve it");
})();

head("Field test answers");
(function () {
  console.log("  1. SmolVLA, 2 cameras: " + V.prefix(c({ cams: 2 })).T + " cards");
  console.log("  2. r = 2: " + V.prefix(c({ r: 2 })).perFrame + " cards a frame");
  console.log("  3. SmolVLA r = 2 tower: " + G(V.towerFlops(c({ r: 2 })).total) + " GFLOP");
  console.log("  4. SmolVLA N = 8 chunk: " + G(V.flops(c({ floors: 8 })).total) + " GFLOP");
  console.log("  5. π0 one draft: " + G(FP.pass) + " GFLOP");
  console.log("  6. π0 on the toy edge board: " + f(V.latency(P, "edge").ms, 1) + " ms");
  console.log("  7. SmolVLA, toy edge board, 50 Hz: d = " + V.ticks(V.latency(S, "edge").ms, 50));
  console.log("  8. π0 weights per chunk: " + f(PP.hot / 1e9, 2) + "B");
})();

console.log("\n" + (fails ? fails + " check(s) FAILED" : "all checks pass"));
process.exit(fails ? 1 : 0);
