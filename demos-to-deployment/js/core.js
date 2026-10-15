/* Demos to Deployment — the math. Pure functions only, exposed as window.WP (or module.exports in Node).
   A line-painting robot ("the striper") rolls down Main Street at a constant speed, steering to paint the
   centre line. Everything here is seeded, so every run is the same for everyone.

   Exact (the real algorithms, as published):
   - behaviour cloning as supervised learning on the master's (observation, action) pairs
   - DAgger (Ross, Gordon & Bagnell 2011): roll out, have the expert label the states the learner visited,
     aggregate, retrain, with the β mixing schedule
   - executing action chunks synchronously, naively asynchronously, with ACT's temporal ensembling
     (w_i = exp(−m·i), Zhao et al. 2023), with SmolVLA's asynchronous queue (Shukor et al. 2025) and with
     Real-Time Chunking's frozen prefix and soft mask (Black, Galliker & Levine 2025)
   Teaching models (labelled on the page):
   - the street, the striper's kinematics, the potholes and the wet-cement patch
   - the master's driving rule (pure pursuit plus a hand wobble)
   - the apprentice: a k-nearest-neighbour lookup over the master's logged moments. A real learner, but not a
     neural network; the slow "big model" of the later steps is the same lookup with a simulated think time. */
(function (root) {
  "use strict";

  /* ---------- seeded randomness ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    var f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.normal = function () {
      var u = 0, v = 0;
      while (u === 0) u = f();
      while (v === 0) v = f();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return f;
  }

  /* ---------- constants ---------- */
  var HZ = 50, DT = 1 / HZ;        // the control rate of ACT's ALOHA and of π0: 50 actions a second
  var SPEED = 1.0;                 // metres per second, while rolling
  var WMAX = 2.5;                  // steering limit, rad/s
  var TOL = 0.05;                  // paint more than 5 cm off the target line counts as off the line
  var LEN = 16;                    // metres of street per run

  /* ---------- the street ---------- */
  // Centre line y_c(x): a gentle S of two sines. Units are metres.
  function street(seed) {
    var r = rng(seed == null ? 11 : seed);
    var a1 = 0.35 + 0.1 * r(), l1 = 9 + 3 * r(), p1 = 6.28 * r();
    var a2 = 0.12 + 0.06 * r(), l2 = 4 + 1.5 * r(), p2 = 6.28 * r();
    var k1 = 2 * Math.PI / l1, k2 = 2 * Math.PI / l2;
    return {
      seed: seed,
      y: function (x) { return a1 * Math.sin(k1 * x + p1) + a2 * Math.sin(k2 * x + p2) - (a1 * Math.sin(p1) + a2 * Math.sin(p2)); },
      dy: function (x) { return a1 * k1 * Math.cos(k1 * x + p1) + a2 * k2 * Math.cos(k2 * x + p2); }
    };
  }

  // A world is a street plus what is on it: potholes (each kicks the heading once, by a fixed angle) and an
  // optional wet-cement patch on the centre line that the line has to go around (left or right).
  function world(opts) {
    opts = opts || {};
    return {
      st: street(opts.street),
      potholes: (opts.potholes || []).map(function (p) { return { x: p.x, kick: p.kick }; }),
      cement: opts.cement ? { x: opts.cement.x, len: opts.cement.len || 1.0, half: opts.cement.half || 0.28, appear: opts.cement.appear == null ? -1 : opts.cement.appear } : null,
      len: opts.len || LEN
    };
  }

  // Potholes for a run: a Poisson stream with the given rate per metre (seeded), each kick ±kick rad.
  function potholes(seed, perMetre, kick, len) {
    var r = rng(seed), out = [], x = 0;
    if (!(perMetre > 0)) return out;
    for (;;) {
      x += -Math.log(1 - r()) / perMetre;
      if (x >= (len || LEN)) break;
      out.push({ x: x, kick: (r() < 0.5 ? -1 : 1) * kick });
    }
    return out;
  }

  /* ---------- the detour around the cement ---------- */
  var DETOUR = 0.55, RAMP = 1.3;     // the detour's offset (m) and how long the swerve in and out takes (m)
  function bump(u) { return u <= 0 || u >= 1 ? (u <= 0 ? 0 : 1) : 0.5 - 0.5 * Math.cos(Math.PI * u); }
  // Target offset from the centre line at x, for a run that goes round on `side` (−1 left, +1 right, 0 none).
  function detour(w, x, side) {
    var c = w.cement; if (!c || !side) return 0;
    var a = c.x - RAMP - 0.15, b = c.x + c.len + 0.15;
    var up = bump((x - a) / RAMP), down = 1 - bump((x - b) / RAMP);
    return side * DETOUR * Math.min(up, down);
  }
  // A patch with `appear` ≥ 0 is poured late: the crew drops it once the striper has passed x = appear.
  function cementVisible(w, x) { return !!(w.cement && (w.cement.appear < 0 || x >= w.cement.appear)); }
  function inCement(w, s) {
    var c = w.cement; if (!c || (c.appear >= 0 && s.x < c.appear)) return false;
    var e = s.y - w.st.y(s.x);
    return s.x >= c.x && s.x <= c.x + c.len && Math.abs(e) <= c.half;
  }

  /* ---------- the striper ---------- */
  function start(w, e0, phi0) {
    var x = 0;
    return { x: x, y: w.st.y(x) + (e0 || 0), th: Math.atan(w.st.dy(x)) + (phi0 || 0), tick: 0, nextHole: 0 };
  }
  // One tick: steer at rate om (clamped), roll forward at SPEED unless stopped. Potholes kick the heading.
  function step(w, s, om, stopped) {
    om = Math.max(-WMAX, Math.min(WMAX, om));
    var v = stopped ? 0 : SPEED;
    var th = s.th + (stopped ? 0 : om * DT);
    var n = { x: s.x + v * Math.cos(th) * DT, y: s.y + v * Math.sin(th) * DT, th: th, tick: s.tick + 1, nextHole: s.nextHole };
    while (n.nextHole < w.potholes.length && w.potholes[n.nextHole].x <= n.x) { n.th += w.potholes[n.nextHole].kick; n.nextHole++; }
    return n;
  }
  function errs(w, s) {
    var e = s.y - w.st.y(s.x), phi = s.th - Math.atan(w.st.dy(s.x));
    return { e: e, phi: phi };
  }

  /* ---------- the master (the human demonstrator) ---------- */
  // Pure pursuit: aim at the target line LOOK metres ahead and turn at the rate that arcs onto it.
  var LOOK = 0.7;
  function masterAction(w, s, side) {
    var xa = s.x + LOOK * Math.cos(s.th);
    var ya = w.st.y(xa) + detour(w, xa, side);
    var alpha = Math.atan2(ya - s.y, xa - s.x) - s.th;
    return Math.max(-WMAX, Math.min(WMAX, 2 * SPEED * Math.sin(alpha) / LOOK));
  }

  /* ---------- what the striper sees ---------- */
  // Five numbers: offset from the centre line, heading error, how the street bends 0.5 m and 1.0 m ahead
  // (lateral departure of the centre line from the current tangent), and how far ahead the cement is.
  var FSCALE = [0.04, 0.04, 0.03, 0.06, 0.25];
  function observe(w, s) {
    var st = w.st, x = s.x, y0 = st.y(x), d0 = st.dy(x);
    var b1 = st.y(x + 0.5) - y0 - 0.5 * d0, b2 = st.y(x + 1.0) - y0 - 1.0 * d0;
    var ce = errs(w, s), dx = 2.5;
    if (cementVisible(w, x)) dx = Math.max(-1.5, Math.min(2.5, w.cement.x - x));
    return [ce.e, ce.phi, b1, b2, dx];
  }
  function scaled(o) { return o.map(function (v, i) { return v / FSCALE[i]; }); }

  /* ---------- a k-d tree for the apprentice's notebook ---------- */
  // Implicit tree over a permutation of row indices: the node for a range [lo, hi) is its middle element, split on
  // axis depth mod D. Features live in one flat Float64Array, so a lookup allocates nothing but its result.
  var FD = 5;
  function kdBuild(rows) {
    var n = rows.length, F = new Float64Array(n * FD), idx = new Int32Array(n), i, j;
    for (i = 0; i < n; i++) { idx[i] = i; for (j = 0; j < FD; j++) F[i * FD + j] = rows[i].f[j]; }
    function sel(lo, hi, k, ax) {   // quickselect: idx[k] becomes the k-th smallest of [lo, hi) on axis ax
      while (hi - lo > 1) {
        var pv = F[idx[(lo + hi) >> 1] * FD + ax], a = lo, b = hi - 1, t;
        while (a <= b) {
          while (F[idx[a] * FD + ax] < pv) a++;
          while (F[idx[b] * FD + ax] > pv) b--;
          if (a <= b) { t = idx[a]; idx[a] = idx[b]; idx[b] = t; a++; b--; }
        }
        if (k <= b) hi = b + 1; else if (k >= a) lo = a; else return;
      }
    }
    (function build(lo, hi, depth) {
      if (hi - lo <= 1) return;
      var m = (lo + hi) >> 1; sel(lo, hi, m, depth % FD);
      build(lo, m, depth + 1); build(m + 1, hi, depth + 1);
    })(0, n, 0);
    return { F: F, idx: idx, n: n };
  }
  var KB_I = new Int32Array(16), KB_D = new Float64Array(16);
  function kdKnn(tree, q, k, rows) {
    var F = tree.F, idx = tree.idx, cnt = 0;
    function visit(lo, hi, depth) {
      if (lo >= hi) return;
      var m = (lo + hi) >> 1, r = idx[m], o = r * FD, d = 0, u;
      for (var j = 0; j < FD; j++) { u = F[o + j] - q[j]; d += u * u; }
      if (cnt < k || d < KB_D[cnt - 1]) {
        var i = cnt < k ? cnt++ : k - 1;
        while (i > 0 && KB_D[i - 1] > d) { KB_D[i] = KB_D[i - 1]; KB_I[i] = KB_I[i - 1]; i--; }
        KB_D[i] = d; KB_I[i] = r;
      }
      var ax = depth % FD, diff = q[ax] - F[o + ax];
      if (diff < 0) { visit(lo, m, depth + 1); if (cnt < k || diff * diff < KB_D[cnt - 1]) visit(m + 1, hi, depth + 1); }
      else { visit(m + 1, hi, depth + 1); if (cnt < k || diff * diff < KB_D[cnt - 1]) visit(lo, m, depth + 1); }
    }
    visit(0, tree.n, 0);
    var out = [];
    for (var i = 0; i < cnt; i++) out.push({ p: rows[KB_I[i]], d: KB_D[i] });
    return out;
  }

  /* ---------- the master's logbook (demonstrations) ---------- */
  var H = 50;   // actions per chunk: SmolVLA's n = 50 and π0's H = 50 (one second at 50 Hz)
  // The master's hand: an Ornstein–Uhlenbeck wobble added to the steering.
  var WOBBLE = 0.05, WOB_TAU = 0.35;
  // One demonstration: the master paints the whole street. Each logged moment stores the observation, the steering
  // taken (what the one-step apprentice of steps 0–2 copies) and the next H positions of the nozzle, as offsets from
  // the centre line (the waypoint chunk the apprentice of steps 3–7 copies; entry j is where the nozzle was j + 1
  // ticks later).
  function demo(w, seed, side, wobble) {
    var r = rng(seed), s = start(w, 0, 0), n = 0, rows = [], acts = [], obs = [], offs = [];
    var a = Math.exp(-DT / WOB_TAU), sig = (wobble == null ? WOBBLE : wobble) * Math.sqrt(1 - a * a);
    var guard = Math.ceil(w.len / SPEED / DT) + H + 5;
    for (var t = 0; t < guard && s.x < w.len + 1.2; t++) {
      n = a * n + sig * r.normal();
      var om = masterAction(w, s, side) + n;
      obs.push(observe(w, s)); acts.push(om); offs.push(errs(w, s).e);
      s = step(w, s, om, false);
    }
    offs.push(errs(w, s).e);
    for (var i = 0; i + H < offs.length; i++) rows.push({ o: obs[i], f: scaled(obs[i]), a: acts[i], wp: rel(offs.slice(i + 1, i + 1 + H), offs[i]), side: side, src: "demo" });
    return rows;
  }
  // Waypoints are stored relative to the nozzle's offset at the logged moment, and added back to the striper's own
  // offset when used: a chunk starts from where the striper is, as a policy conditioned on the robot's state does.
  function rel(wp, e0) { return wp.map(function (v) { return v - e0; }); }
  // The foreman's label at a state the apprentice actually reached: what the master would steer from there, and the
  // next H nozzle offsets of the master's noiseless drive from there (simulated on a copy of the street without
  // potholes: the foreman says what he would do, not what will happen).
  function foreman(w, s, side) {
    var clean = { st: w.st, potholes: [], cement: w.cement, len: w.len }, c = { x: s.x, y: s.y, th: s.th, tick: s.tick, nextHole: 0 }, wp = [], a0 = null;
    for (var i = 0; i < H; i++) { var om = masterAction(clean, c, side); if (a0 == null) a0 = om; c = step(clean, c, om, false); wp.push(errs(clean, c).e); }
    return { a: a0, wp: rel(wp, errs(w, s).e) };
  }
  // Which way the foreman goes round the cement from where the striper is: the side it already leans to.
  function leanSide(w, s) {
    if (!w.cement) return 0;
    var ce = errs(w, s), lean = ce.e + 0.4 * ce.phi;
    return lean < 0 ? -1 : 1;
  }
  // The master's own line on this street, noiseless, for a side: what "on the line" is scored against.
  function reference(w, side) {
    var clean = { st: w.st, potholes: [], cement: w.cement && { x: w.cement.x, len: w.cement.len, half: w.cement.half, appear: -1 }, len: w.len };
    var s = start(clean, 0, 0), xs = [], es = [];
    while (s.x < w.len + 0.5) { xs.push(s.x); es.push(errs(clean, s).e); s = step(clean, s, masterAction(clean, s, side), false); }
    return function (x) {
      var lo = 0, hi = xs.length - 1;
      if (x <= xs[0]) return es[0]; if (x >= xs[hi]) return es[hi];
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
      var u = (x - xs[lo]) / (xs[hi] - xs[lo]); return es[lo] + u * (es[hi] - es[lo]);
    };
  }

  /* ---------- the apprentice: k nearest moments in the notebook ---------- */
  function notebook(rows) { return { rows: rows, tree: kdBuild(rows), n: rows.length }; }
  var K = 5, K_RTC = 16;
  // Behaviour cloning, one action at a time: the mean steering of the K most similar logged moments.
  function bcAction(nb, o) {
    var nn = kdKnn(nb.tree, scaled(o), K, nb.rows), s = 0;
    for (var i = 0; i < nn.length; i++) s += nn[i].p.a;
    return s / nn.length;
  }
  // Behaviour cloning, a chunk at a time: look up the K most similar logged moments and either draw one of their
  // waypoint chunks (a generative policy: it keeps one demonstrator's way of doing it) or average them (a regression
  // policy). Waypoints come back relative to the striper's offset; see chunkAt.
  function chunkPolicy(nb, o, r, mode) {
    var nn = kdKnn(nb.tree, scaled(o), K, nb.rows), i, j;
    if (mode === "mean") {
      var m = new Array(H).fill(0);
      for (i = 0; i < nn.length; i++) for (j = 0; j < H; j++) m[j] += nn[i].p.wp[j] / nn.length;
      return m;
    }
    return nn[Math.floor(r() * nn.length)].p.wp.slice();
  }
  // A chunk in absolute offsets: the relative waypoints added to the offset the striper had when it looked.
  function chunkAt(nb, o, r, mode) {
    return chunkPolicy(nb, o, r, mode).map(function (v) { return v + o[0]; });
  }
  // Real-Time Chunking over the notebook. The new chunk must continue the d waypoints that will already have run by
  // the time it lands (ref[0..d−1], frozen) and should lean towards the rest of the old chunk under the soft mask W.
  // RTC gets this by guiding a flow-matching sampler ("inpainting"); over a lookup table this is an analogue of it:
  // draw the K_RTC most similar moments, shift each so it continues from the last frozen waypoint, weight each by
  // exp(−Σ W_i (a_i − ref_i)² / 2σ²), sample one, then blend it into the old chunk with the same mask.
  var RTC_SIG = 0.03;
  function rtcChunk(nb, o, r, ref, W, d) {
    var nn = kdKnn(nb.tree, scaled(o), K_RTC, nb.rows), cands = [], wts = [], i, j, tot = 0;
    for (i = 0; i < nn.length; i++) {
      var wp = nn[i].p.wp, shift = d > 0 && ref[d - 1] != null ? ref[d - 1] - wp[d - 1] : o[0], c = [], e2 = 0;
      for (j = 0; j < H; j++) { c.push(wp[j] + shift); if (ref[j] != null) { var u = c[j] - ref[j]; e2 += W[j] * u * u; } }
      cands.push(c); wts.push(e2);
    }
    var lo = Math.min.apply(null, wts);   // subtract the best before exponentiating, so nothing underflows
    for (i = 0; i < wts.length; i++) { wts[i] = Math.exp(-(wts[i] - lo) / (2 * RTC_SIG * RTC_SIG)); tot += wts[i]; }
    var u2 = r() * tot, pick = cands.length - 1;
    for (i = 0; i < cands.length; i++) { u2 -= wts[i]; if (u2 <= 0) { pick = i; break; } }
    var out = cands[pick];
    for (j = 0; j < H; j++) if (ref[j] != null) out[j] = W[j] * ref[j] + (1 - W[j]) * out[j];
    return out;
  }

  /* ---------- the servo: tracking the waypoints ---------- */
  // A fixed controller, not learned: the policy says where the nozzle should be, the servo gets it there, as a robot
  // arm's motors track joint targets. Pure pursuit on the queue: aim at the waypoint PREVIEW ticks ahead (or the last
  // one queued) and turn towards it. tg[0] is the target for the next tick.
  var PREVIEW = 12, KH = 9;
  function servo(w, s, tg) {
    var ce = errs(w, s), x = s.x, h = 0.05, n = Math.min(PREVIEW, tg.length);
    var kappa = (Math.atan(w.st.dy(x + h)) - Math.atan(w.st.dy(x - h))) / (2 * h);
    var phiD = Math.atan((tg[n - 1] - ce.e) / (n * SPEED * DT));
    return kappa * SPEED + KH * (phiD - ce.phi);
  }

  /* ---------- scoring a painted line ---------- */
  // Off the line: more than TOL from the master's own noiseless line for the side this run took round the cement.
  // Blobs: separate stops with the nozzle open (each one leaves a puddle). Kinks: tick-to-tick steering jumps above KINK.
  var KINK = 0.6;
  function sideTaken(w, trace) {
    if (!w.cement) return 0;
    var cx = w.cement.x + w.cement.len / 2;
    for (var i = 0; i < trace.length; i++) if (trace[i].x >= cx) { var e = trace[i].y - w.st.y(trace[i].x); return e < 0 ? -1 : 1; }
    return 1;
  }
  // Side flips at the fork: how often the side the striper is committed to (target more than 6 cm off centre)
  // changes between the start of the swerve and the end of the cement.
  function flips(w, trace) {
    var c = w.cement; if (!c) return 0;
    var side = 0, n = 0;
    for (var i = 0; i < trace.length; i++) {
      var p = trace[i]; if (p.stopped || p.x < c.x - RAMP - 0.3 || p.x > c.x + c.len) continue;
      var e = p.target != null ? p.target : p.y - w.st.y(p.x), sd = e > 0.06 ? 1 : e < -0.06 ? -1 : 0;
      if (sd && side && sd !== side) n++;
      if (sd) side = sd;
    }
    return n;
  }
  function score(w, trace, side) {
    if (side == null) side = sideTaken(w, trace);
    var ref = reference(w, side), offTicks = 0, cem = 0, stopT = 0, blobs = 0, jerk = 0, kinks = 0, prevStopped = false, maxE = 0, moving = 0;
    for (var i = 0; i < trace.length; i++) {
      var p = trace[i];
      if (p.stopped) { stopT++; if (!prevStopped) blobs++; prevStopped = true; continue; }
      prevStopped = false; moving++;
      var dev = Math.abs(p.y - w.st.y(p.x) - ref(p.x)); if (dev > maxE) maxE = dev;
      if (dev > TOL) offTicks++;
      if (inCement(w, p)) cem++;
      var q = i > 0 && !trace[i - 1].stopped ? trace[i - 1] : null;   // a restart after a stop is a blob, not a kink
      if (q) { var dj = Math.abs(p.om - q.om); jerk += dj; if (dj > KINK) kinks++; }
    }
    return { side: side, flips: flips(w, trace), offTicks: offTicks, offM: offTicks * SPEED * DT, cement: cem, cementM: cem * SPEED * DT, stopTicks: stopT, stopS: stopT * DT, blobs: blobs, jerk: jerk / Math.max(1, moving) * HZ, kinks: kinks, maxE: maxE, ticks: trace.length, timeS: trace.length * DT };
  }

  /* ---------- running a one-step policy (steps 0–2) ---------- */
  function rollStep(w, act, maxTicks) {
    var s = start(w, 0, 0), tr = [], lim = maxTicks || Math.ceil(w.len / SPEED / DT);
    for (var t = 0; t < lim && s.x < w.len; t++) {
      var om = Math.max(-WMAX, Math.min(WMAX, act(s)));
      tr.push({ x: s.x, y: s.y, th: s.th, tick: s.tick, om: om, stopped: false });
      s = step(w, s, om, false);
    }
    return tr;
  }

  /* ---------- DAgger ---------- */
  // Iteration i drives with π_i = β_i·expert + (1 − β_i)·learner, the expert labels every state visited, the labels
  // join the notebook, and the learner is refit (Ross, Gordon & Bagnell 2011, Algorithm 3.1). The demonstrations are
  // iteration 1 (β_1 = 1); after that β_i = p^(i−1).
  function daggerIter(rows, nb, worlds, i, opts) {
    opts = opts || {};
    var p = opts.p == null ? 0.5 : opts.p, beta = Math.pow(p, i - 1), r = rng((opts.seed || 5) * 31 + i), added = [], visited = [];
    worlds.forEach(function (w) {
      var tr = rollStep(w, function (s) { return r() < beta ? masterAction(w, s, leanSide(w, s)) : bcAction(nb, observe(w, s)); });
      visited.push(tr);
      for (var t = 0; t < tr.length; t += (opts.every || 2)) {
        var s = tr[t], side = leanSide(w, s), o = observe(w, s), lab = foreman(w, s, side);
        added.push({ o: o, f: scaled(o), a: lab.a, wp: lab.wp, side: side, src: "foreman", iter: i });
      }
    });
    var all = rows.concat(added);
    return { rows: all, nb: notebook(all), added: added.length, beta: beta, visited: visited };
  }
  function dagger(baseRows, worlds, iters, opts) {
    var rows = baseRows.slice(), nb = notebook(rows), hist = [];
    for (var i = 2; i <= iters + 1; i++) {
      var it = daggerIter(rows, nb, worlds, i, opts);
      rows = it.rows; nb = it.nb; hist.push({ iter: i, beta: it.beta, added: it.added, rows: rows.length });
    }
    return { nb: nb, rows: rows, hist: hist };
  }

  /* ---------- executing waypoint chunks in time (steps 3–7) ---------- */
  // One clock, one tick per action at 50 Hz. A query sent at tick t0 sees the world at t0; its chunk arrives d ticks
  // later and entry j is the target for tick t0 + j + 1. At each tick the servo steers for the queued target.
  //   sync     — stop, think d ticks (the nozzle keeps dripping), then drive s targets; repeat
  //   naive    — keep rolling; start the next query s − d ticks into the chunk; switch the moment it lands
  //              (Black et al. 2025's "naive async")
  //   ensemble — ACT: query every tick; every chunk that covers a tick votes, weighted exp(−m·i), i = 0 the oldest
  //   async    — SmolVLA: query whenever the queue holds at most g·H targets (LeRobot's <=; the paper writes <) or is empty; when a chunk lands,
  //              overlapping targets are merged with the queue by `aggregate`
  //   rtc      — Real-Time Chunking: as naive, but the new chunk is drawn knowing the d targets that will already have
  //              run by the time it lands (frozen) and leaning towards the old chunk under RTC's soft mask
  function execute(w, nb, cfg) {
    var mode = cfg.mode, d = Math.max(0, Math.round(cfg.delay || 0)), sExec = Math.max(1, cfg.s || 25), g = cfg.g == null ? 0.5 : cfg.g;
    var m = cfg.m == null ? 0.01 : cfg.m, pol = cfg.policy || "sample", agg = cfg.aggregate || "latest", r = rng(cfg.seed || 1);
    if (mode === "naive" || mode === "rtc") sExec = Math.max(sExec, d);   // RTC: s = max(d, s_min)
    var s = start(w, cfg.e0 || 0, cfg.phi0 || 0), tr = [], lim = Math.ceil(w.len / SPEED / DT) * 4 + 200, queries = 0, events = [];
    // Two clocks. t counts ticks of wall time (think time is measured in it); n counts actions executed. Waypoints are
    // indexed by n, as LeRobot's async client indexes actions by timestep: while the striper stands still, no
    // waypoint goes stale. Entry i of a chunk asked for when n = n0 is the target for action n0 + i + 1.
    var queue = [];          // [{n, a}] targets for upcoming actions, in order
    var inflight = [];       // queries sent and not yet answered
    var votes = {};          // ensemble: action index -> [a, …], oldest chunk first
    var prev = null;         // rtc: the last chunk and the n it was asked at
    var t = 0, n = 0, nextAskN = 0, syncEnd = -1;
    function ask() { queries++; var q = { t0: t, n0: n, arrive: t + d, o: observe(w, s), x: s.x }; inflight.push(q); events.push({ k: "ask", t: t, x: s.x }); return q; }
    function land(q) { events.push({ k: "land", t: t, x: s.x, t0: q.t0 }); }
    function prune() { while (queue.length && queue[0].n <= n) queue.shift(); }
    function fill(q, c) { var out = []; for (var i = 0; i < H; i++) if (q.n0 + i + 1 > n) out.push({ n: q.n0 + i + 1, a: c[i] }); return out; }
    function lastOm() { return tr.length ? tr[tr.length - 1].om : 0; }
    while (s.x < w.len && t < lim) {
      var tg = [], i, c, q;
      prune();
      if (mode === "sync") {
        if (n >= syncEnd) queue = [];        // s targets driven: the rest of the chunk was only there for the servo to preview
        if (!queue.length && !inflight.length) ask();
        if (inflight.length && t >= inflight[0].arrive) { q = inflight.shift(); c = chunkAt(nb, q.o, r, pol); land(q); queue = fill(q, c); syncEnd = n + sExec; }
      } else if (mode === "naive" || mode === "rtc") {
        if (inflight.length && t >= inflight[0].arrive) {
          q = inflight.shift();
          if (mode === "rtc" && prev) {
            var off = q.n0 - prev.n0, W = rtcMask(d, sExec, H), ref = [];
            for (i = 0; i < H; i++) ref.push(off + i < H ? prev.c[off + i] : null);
            c = rtcChunk(nb, q.o, r, ref, W, d);
          } else c = chunkAt(nb, q.o, r, pol);
          prev = { c: c, n0: q.n0 }; land(q); queue = fill(q, c);
        }
        if (!inflight.length && n >= nextAskN) { ask(); nextAskN = n + sExec; }
      } else if (mode === "async") {
        if (inflight.length && t >= inflight[0].arrive) {
          q = inflight.shift(); c = chunkAt(nb, q.o, r, pol);
          var old = {}; queue.forEach(function (it) { old[it.n] = it.a; });
          queue = fill(q, c).map(function (it) {
            var o2 = old[it.n]; if (o2 == null) return it;
            return { n: it.n, a: agg === "average" ? 0.5 * (o2 + it.a) : agg === "weighted" ? 0.3 * o2 + 0.7 * it.a : it.a };
          });
          land(q);
        }
        if (!inflight.length && (queue.length === 0 || queue.length / H <= g)) ask();   // LeRobot: qsize / chunk_size <= threshold
      } else if (mode === "ensemble") {
        ask();
        while (inflight.length && t >= inflight[0].arrive) {
          q = inflight.shift(); c = chunkAt(nb, q.o, r, pol); land(q);
          for (i = 0; i < H; i++) { var k2 = q.n0 + i + 1; if (k2 > n) (votes[k2] = votes[k2] || []).push(c[i]); }
        }
        for (i = 1; i <= PREVIEW; i++) {
          var vs = votes[n + i]; if (!vs || !vs.length) break;
          var num = 0, den = 0;
          for (var j = 0; j < vs.length; j++) { var wgt = Math.exp(-m * j); num += wgt * vs[j]; den += wgt; }   // w_0 is the oldest
          tg.push(num / den);
        }
      }
      if (mode !== "ensemble") for (i = 0; i < queue.length && i < PREVIEW; i++) tg.push(queue[i].a);
      var stopped = !tg.length, om = stopped ? lastOm() : Math.max(-WMAX, Math.min(WMAX, servo(w, s, tg)));
      var rec = { x: s.x, y: s.y, th: s.th, tick: t, n: n, om: om, stopped: stopped, target: stopped ? null : tg[0] };
      if (cfg.record) {   // for drawing: the waypoints queued ahead, how many of them will be driven, the votes for the next action
        if (mode === "ensemble") { rec.q = tg.slice(); rec.v = (votes[n + 1] || []).slice(); }
        else { rec.q = queue.map(function (it) { return it.a; }); rec.nd = mode === "sync" ? Math.max(0, syncEnd - n) : mode === "naive" || mode === "rtc" ? Math.max(0, nextAskN + d - n) : queue.length; }
        rec.think = inflight.length > 0;
      }
      tr.push(rec);
      if (stopped) s = Object.assign({}, s, { tick: t + 1 });
      else { s = step(w, s, om, false); if (mode === "ensemble") delete votes[n + 1]; n++; }
      t++;
    }
    return { trace: tr, queries: queries, events: events, blindM: blind(w, events) };
  }
  // For a patch poured late: metres the striper drove after the pour on waypoints drafted before it, i.e. from the
  // pour to where the first work order drafted after the pour took over. null when there was no late pour.
  function blind(w, events) {
    if (!w.cement || w.cement.appear < 0) return null;
    var asked = null;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.k === "ask" && asked == null && ev.x >= w.cement.appear) asked = ev.t;
      if (ev.k === "land" && asked != null && ev.t0 >= asked) return Math.max(0, ev.x - w.cement.appear);
    }
    return null;
  }

  /* ---------- the canonical lab: every page uses these seeded datasets ---------- */
  var CEMENT = { x: 8, len: 1.0 };
  // The master's logbook on plain streets (steps 0–2): 20 runs, every tick logged.
  function streetLog(n) { var rows = []; for (var i = 0; i < (n || 20); i++) rows = rows.concat(demo(world({ street: 100 + i }), 1000 + i, 0)); return rows; }
  // Practice streets for DAgger: potholes at 0.3 per metre, each a 0.2 rad kick.
  function practice(cement) { var out = []; for (var i = 0; i < 6; i++) out.push(world({ street: 200 + i, cement: cement ? CEMENT : null, potholes: potholes(300 + i, cement ? 0.15 : 0.3, cement ? 0.15 : 0.2) })); return out; }
  // The logbook with the cement on every street (steps 3–7): 24 runs, half round the left, half round the right,
  // every other tick logged, then three rounds of the master riding along, so the apprentice can recover.
  var CHUNK_NB = null;
  function chunkNotebook() {
    if (CHUNK_NB) return CHUNK_NB;
    var rows = [];
    for (var i = 0; i < 24; i++) rows = rows.concat(demo(world({ street: 100 + i, cement: CEMENT }), 1000 + i, i % 2 ? 1 : -1).filter(function (r, j) { return j % 2 === 0; }));
    CHUNK_NB = dagger(rows, practice(true), 3, {}).nb;
    return CHUNK_NB;
  }
  // A test street for fleet run k (steps 3–7).
  function testStreet(k, appear) { return world({ street: 600 + k, cement: appear == null ? CEMENT : { x: CEMENT.x, len: CEMENT.len, appear: appear } }); }

  // How the notebook covers (offset, heading error): counts per cell over [−R, R]², by where the page came from.
  function coverage(rows, n, R) {
    n = n || 24; R = R || 0.4;
    var demoC = new Array(n * n).fill(0), fore = new Array(n * n).fill(0);
    rows.forEach(function (r) {
      var i = Math.floor((r.o[0] + R) / (2 * R) * n), j = Math.floor((r.o[1] + R) / (2 * R) * n);
      if (i < 0 || j < 0 || i >= n || j >= n) return;
      if (r.src === "demo") demoC[j * n + i]++; else fore[j * n + i]++;
    });
    return { n: n, R: R, demo: demoC, foreman: fore };
  }
  // The share of time a synchronous striper stands still: d ticks of thinking for every s ticks of driving.
  function idleShare(d, s) { return d / (d + s); }
  // SmolVLA's no-starvation condition: the queue never runs dry if g ≥ (latency / Δt) / n.
  function gNeeded(d, n) { return d / (n || H); }
  // RTC's soft mask over a chunk of length H when the next one lands d steps in and s actions run per chunk
  // (Black, Galliker & Levine 2025, eq. 5): 1 for i < d; c_i(e^{c_i} − 1)/(e − 1) with c_i = (H − s − i)/(H − s − d + 1)
  // for d ≤ i < H − s; 0 for i ≥ H − s.
  function rtcMask(d, s, Hh) {
    var W = [];
    for (var i = 0; i < Hh; i++) {
      if (i < d) W.push(1);
      else if (i < Hh - s) { var c = (Hh - s - i) / (Hh - s - d + 1); W.push(c * (Math.exp(c) - 1) / (Math.E - 1)); }
      else W.push(0);
    }
    return W;
  }

  var WP = {
    rng: rng, HZ: HZ, DT: DT, SPEED: SPEED, WMAX: WMAX, TOL: TOL, LEN: LEN, H: H, K: K, K_RTC: K_RTC, KINK: KINK, LOOK: LOOK,
    DETOUR: DETOUR, WOBBLE: WOBBLE,
    street: street, world: world, potholes: potholes, detour: detour, inCement: inCement,
    start: start, step: step, errs: errs, masterAction: masterAction, observe: observe, scaled: scaled,
    demo: demo, foreman: foreman, leanSide: leanSide, reference: reference, sideTaken: sideTaken, flips: flips,
    notebook: notebook, kdKnn: kdKnn, bcAction: bcAction, chunkPolicy: chunkPolicy, chunkAt: chunkAt, rtcChunk: rtcChunk, servo: servo,
    score: score, rollStep: rollStep, blind: blind, CEMENT: CEMENT, streetLog: streetLog, practice: practice, chunkNotebook: chunkNotebook, testStreet: testStreet, coverage: coverage, idleShare: idleShare, gNeeded: gNeeded, daggerIter: daggerIter, dagger: dagger, execute: execute, rtcMask: rtcMask
  };
  if (typeof module !== "undefined" && module.exports) module.exports = WP; else root.WP = WP;
})(this);
