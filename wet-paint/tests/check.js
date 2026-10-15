/* Wet Paint — checks. `node tests/check.js` verifies the invariants and prints every number ACCEPTANCE.md quotes.
   Everything is seeded, so the printout is the same on every machine. Exits non-zero if a check fails. */
"use strict";
var WP = require("../js/core.js");
var fails = 0, t0 = Date.now();
function ok(cond, what) { if (!cond) { fails++; console.log("  ✗ " + what); } else console.log("  ✓ " + what); }
function f(n, d) { return Number(n).toFixed(d == null ? 2 : d); }
function head(s) { console.log("\n" + s); }

/* ---------- the machinery ---------- */
head("Machinery");
(function () {
  var r = WP.rng(4), rows = [];
  for (var i = 0; i < 3000; i++) { var o = [r.normal() * 0.1, r.normal() * 0.1, r.normal() * 0.05, r.normal() * 0.05, r() * 4 - 1.5]; rows.push({ o: o, f: WP.scaled(o) }); }
  var nb = WP.notebook(rows), bad = 0;
  for (var q = 0; q < 200; q++) {
    var qo = WP.scaled([r.normal() * 0.3, r.normal() * 0.3, r.normal() * 0.05, r.normal() * 0.05, r() * 4 - 1.5]);
    var got = WP.kdKnn(nb.tree, qo, 5, rows).map(function (x) { return x.d; });
    var all = rows.map(function (x) { var s = 0; for (var j = 0; j < 5; j++) { var u = x.f[j] - qo[j]; s += u * u; } return s; }).sort(function (a, b) { return a - b; }).slice(0, 5);
    for (var j = 0; j < 5; j++) if (Math.abs(got[j] - all[j]) > 1e-9) bad++;
  }
  ok(bad === 0, "k-d tree returns the same 5 nearest pages as brute force (200 queries)");
  var W = WP.rtcMask(10, 25, 50);
  ok(W[9] === 1 && W[10] < 1 && W[25] === 0 && W[49] === 0, "RTC mask: 1 on the frozen 10, 0 from H − s = 25 on");
  var mono = true; for (var k = 1; k < 50; k++) if (W[k] > W[k - 1] + 1e-12) mono = false;
  ok(mono, "RTC mask never rises");
  console.log("  RTC mask (d = 10, s = 25), i = 10…24: " + W.slice(10, 25).map(function (v) { return f(v, 2); }).join(" "));
  var nbc = WP.chunkNotebook(), w = WP.testStreet(3);
  var a1 = WP.execute(w, nbc, { mode: "rtc", delay: 12, s: 25, seed: 9 }), a2 = WP.execute(w, nbc, { mode: "rtc", delay: 12, s: 25, seed: 9 });
  ok(JSON.stringify(a1.trace) === JSON.stringify(a2.trace), "a seeded run is the same every time");
})();

/* ---------- steps 0–2: drift ---------- */
var LOG = WP.streetLog(20), NB = WP.notebook(LOG);
var PH = WP.world({ street: 11, potholes: [{ x: 4, kick: 0.2 }] }), CLEAN = WP.world({ street: 11 });
function stepRun(w, nb) { return WP.score(w, WP.rollStep(w, nb ? function (s) { return WP.bcAction(nb, WP.observe(w, s)); } : function (s) { return WP.masterAction(w, s, 0); }), 0); }
head("Step 0 · Main Street (street 11, 16 m)");
console.log("  logbook: 20 runs, " + LOG.length + " pages");
var m0 = stepRun(CLEAN), b0 = stepRun(CLEAN, NB), m1 = stepRun(PH), b1 = stepRun(PH, NB);
console.log("  clean street   master off " + f(m0.offM) + " m, max " + f(m0.maxE * 100, 1) + " cm | apprentice off " + f(b0.offM) + " m, max " + f(b0.maxE * 100, 1) + " cm");
console.log("  pothole at 4 m master off " + f(m1.offM) + " m, max " + f(m1.maxE * 100, 1) + " cm | apprentice off " + f(b1.offM) + " m, max " + f(b1.maxE * 100, 1) + " cm");
ok(b0.offM < 0.5, "the apprentice copies the master on a clean street");
ok(b1.offM > 5 * Math.max(0.1, m1.offM), "after one pothole the apprentice paints far more off the line than the master");

head("Step 1 · Off the map");
(function () {
  var cov = WP.coverage(LOG), within = LOG.filter(function (r) { return Math.abs(r.o[0]) < 0.05; }).length / LOG.length;
  var hd = LOG.filter(function (r) { return Math.abs(r.o[1]) < 0.05; }).length / LOG.length;
  console.log("  pages within 5 cm of the line: " + f(within * 100, 1) + "% · heading within 0.05 rad: " + f(hd * 100, 1) + "%");
  var cells = cov.demo.filter(function (c) { return c > 0; }).length;
  console.log("  notebook map cells with a page: " + cells + " of " + cov.n * cov.n);
  var Ls = [4, 8, 16, 32], N = 12, rate = 0.08, bc = [], ma = [];
  Ls.forEach(function (L) {
    var b = 0, m = 0;
    for (var k = 0; k < N; k++) {
      var w = WP.world({ street: 500 + k, len: L, potholes: WP.potholes(900 + k, rate, 0.2, L) });
      b += stepRun(w, NB).offM / N; m += stepRun(w).offM / N;
    }
    bc.push(b); ma.push(m);
  });
  console.log("  fleet of 12, potholes 0.08/m, ±0.2 rad. off-line metres by street length 4 / 8 / 16 / 32 m:");
  console.log("    master     " + ma.map(function (v) { return f(v); }).join(" / "));
  console.log("    apprentice " + bc.map(function (v) { return f(v); }).join(" / "));
  console.log("    apprentice growth per doubling: " + bc.slice(1).map(function (v, i) { return f(v / bc[i], 1) + "×"; }).join(" "));
  ok(bc[3] > 3 * ma[3], "at 32 m the apprentice paints over 3× the master's off-line metres");
  ok(bc[3] / bc[1] > 4, "apprentice: 4× the street, more than 4× the off-line paint (superlinear)");
})();

head("Step 2 · The master rides along (DAgger, p = 0.5)");
var PR = WP.practice(false), dRows = LOG, dNb = NB, hist = [];
for (var it = 2; it <= 5; it++) {
  var res = WP.daggerIter(dRows, dNb, PR, it, {});
  dRows = res.rows; dNb = res.nb;
  var sc = stepRun(PH, dNb);
  hist.push(sc.offM);
  console.log("  iteration " + it + ": β = " + f(res.beta, 3) + ", +" + res.added + " pages (" + dRows.length + " total) → pothole street off " + f(sc.offM) + " m, max " + f(sc.maxE * 100, 1) + " cm");
}
var more = WP.notebook(WP.streetLog(40)), scm = stepRun(PH, more);
console.log("  instead, 20 more runs from the master (40 total): pothole street off " + f(scm.offM) + " m, max " + f(scm.maxE * 100, 1) + " cm");
ok(hist[hist.length - 1] < 0.35 * b1.offM, "after DAgger the pothole costs under a third of what it did");
ok(scm.offM > 0.6 * b1.offM, "doubling the master's runs does not fix it");
(function () {
  var N = 12, b = 0, d = 0, m = 0;
  for (var k = 0; k < N; k++) { var w = WP.world({ street: 500 + k, len: 16, potholes: WP.potholes(900 + k, 0.08, 0.2, 16) }); b += stepRun(w, NB).offM / N; d += stepRun(w, dNb).offM / N; m += stepRun(w).offM / N; }
  console.log("  fleet of 12 on 16 m: master " + f(m) + " m · apprentice " + f(b) + " m · after DAgger " + f(d) + " m off the line");
})();

/* ---------- steps 3–7: time ---------- */
var CNB = WP.chunkNotebook(), N2 = 40;
function fleet(cfg, appear) {
  var a = { offM: 0, cementRuns: 0, flipRuns: 0, stopS: 0, timeS: 0, kinks: 0, blobs: 0, queries: 0, blind: [] };
  for (var k = 0; k < N2; k++) {
    var w = WP.testStreet(k, appear), r = WP.execute(w, CNB, Object.assign({ seed: 50 + k }, cfg)), s = WP.score(w, r.trace);
    a.offM += s.offM / N2; a.stopS += s.stopS / N2; a.timeS += s.timeS / N2; a.kinks += s.kinks / N2; a.blobs += s.blobs / N2; a.queries += r.queries / N2;
    if (s.cement > 0) a.cementRuns++; if (s.flips > 0) a.flipRuns++;
    if (r.blindM != null) a.blind.push(r.blindM);
  }
  a.blind.sort(function (x, y) { return x - y; });
  return a;
}
function line(name, a) { return "  " + name + " time " + f(a.timeS, 1) + " s · stopped " + f(a.stopS, 1) + " s in " + f(a.blobs, 1) + " blobs · off " + f(a.offM) + " m · kinks " + f(a.kinks, 1) + " · flips " + a.flipRuns + "/" + N2 + " · cement " + a.cementRuns + "/" + N2 + " · queries " + f(a.queries, 0); }

head("Step 3 · The drafting desk (synchronous, 40 test streets, cement at 8 m)");
[0, 4, 10, 20].forEach(function (d) {
  [10, 25, 50].forEach(function (s) {
    var a = fleet({ mode: "sync", delay: d, s: s });
    var meas = a.stopS / a.timeS, form = WP.idleShare(d, s);
    console.log(line("d " + d + " s " + s + ":", a) + " · idle " + f(meas * 100, 1) + "% (formula " + f(form * 100, 1) + "%)");
    if (d > 0) ok(Math.abs(meas - form) < 0.02, "  idle share matches d/(d+s) within 2 points (d " + d + ", s " + s + ")");
  });
});

head("Step 4 · The committee (ACT temporal ensembling, m = 0.01, a query every tick)");
[0, 10, 15, 20, 25].forEach(function (d) { console.log(line("d " + d + ":", fleet({ mode: "ensemble", delay: d }))); });
console.log(line("no ensembling, sync d 0 s 25:", fleet({ mode: "sync", delay: 0, s: 25 })));
ok(fleet({ mode: "ensemble", delay: 25 }).cementRuns >= 15, "at d = 25 the committee averages at least 15 of 40 runs into the cement");

head("Step 5 · Order ahead (SmolVLA async, H = 50, aggregate = latest unless named)");
[10, 20].forEach(function (d) {
  console.log("  d " + d + ": queue never runs dry when g ≥ d/H = " + f(WP.gNeeded(d), 2));
  [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1].forEach(function (g) { console.log(line("    g " + g + ":", fleet({ mode: "async", delay: d, g: g }))); });
  ["average", "weighted"].forEach(function (agg) { console.log(line("    g 0.5 " + agg + ":", fleet({ mode: "async", delay: d, g: 0.5, aggregate: agg }))); });
});
(function () {
  var s = fleet({ mode: "sync", delay: 10, s: 25 }), a = fleet({ mode: "async", delay: 10, g: 0.5 });
  console.log("  d 10: sync " + f(s.timeS, 1) + " s vs async g 0.5 " + f(a.timeS, 1) + " s per street (" + f((1 - a.timeS / s.timeS) * 100, 0) + "% faster)");
  ok(a.stopS < 0.25, "async with g ≥ d/H stops only for the very first order");
})();

head("Step 6 · Seams (naive async: switch the moment the new order lands, s = 25)");
[5, 10, 15, 20, 25].forEach(function (d) { console.log(line("d " + d + ":", fleet({ mode: "naive", delay: d, s: 25 }))); });

head("Step 7 · Tracing paper (Real-Time Chunking, s = 25)");
[5, 10, 15, 20, 25].forEach(function (d) { console.log(line("d " + d + ":", fleet({ mode: "rtc", delay: d, s: 25 }))); });
(function () {
  var n = fleet({ mode: "naive", delay: 25, s: 25 }), r = fleet({ mode: "rtc", delay: 25, s: 25 });
  ok(r.flipRuns < n.flipRuns / 3, "at d = 25 RTC flips sides in under a third as many runs as naive switching");
  ok(r.cementRuns < n.cementRuns, "at d = 25 RTC drives into the cement less often than naive switching");
})();

head("Reacting to a late pour (cement poured 1.6 m ahead, d = 10): metres driven blind, median / max");
[["sync s 10", { mode: "sync", s: 10 }], ["sync s 25", { mode: "sync", s: 25 }], ["naive s 25", { mode: "naive", s: 25 }], ["async g 0.5", { mode: "async", g: 0.5 }], ["async g 0.2", { mode: "async", g: 0.2 }], ["rtc s 25", { mode: "rtc", s: 25 }], ["rtc s 10", { mode: "rtc", s: 10 }], ["ensemble", { mode: "ensemble" }]].forEach(function (p) {
  var a = fleet(Object.assign({ delay: 10 }, p[1]), WP.CEMENT.x - 1.6);
  console.log("  " + p[0] + ": " + f(a.blind[Math.floor(a.blind.length / 2)]) + " / " + f(a.blind[a.blind.length - 1]) + " m · stopped " + f(a.stopS, 1) + " s · cement " + a.cementRuns + "/" + N2);
});

console.log("\n" + (fails ? fails + " check(s) FAILED" : "all checks passed") + " · " + f((Date.now() - t0) / 1000, 1) + " s");
process.exit(fails ? 1 : 0);
