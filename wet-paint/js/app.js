/* Wet Paint — UI. Every number shown is computed by window.WP (core.js) on a seeded toy street; nothing is
   hard-coded except the paper figures quoted in the prose. */
(function () {
  "use strict";
  var WP = window.WP, GL = window.WP_GLOSSARY, IC = window.WP_ICONS || {}, ART = window.WP_ART || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- formatting ---------------- */
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function pct(p, d) { return fmt(p * 100, d == null ? 0 : d) + "%"; }
  function cm(m) { return fmt(m * 100, 1) + " cm"; }
  function ms(d) { return d + " tick" + (d === 1 ? "" : "s") + " · " + d * 20 + " ms"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ---------------- progress ---------------- */
  var KEY = "wet-paint-v1";
  var store = { predicts: {}, touched: {}, said: {}, cap: {}, ft: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved) store = Object.assign(store, saved); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  var REDUCED = false; try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------------- colours (match css tokens) ---------------- */
  var COL = { paint: "#F4C430", paintEdge: "#B8860B", left: "#246A9C", right: "#5E4A94", bad: "#A5321F", ink: "#3A2418", line: "#4A2E1E", soft: "#6E5040",
    asphalt: "#8F9397", asphaltD: "#6F7377", kerb: "#D6CFC2", cement: "#C9C3B6", cone: "#E2701C", sheet: "#FFFDF6", grass: "#5FA03C", grassD: "#3B7422", sky: "#9CCBEA", rule: "#E7DCC4", yellowD: "#8A6300" };

  /* ---------------- nav ---------------- */
  var NAV_ICON = { s0: "street", s1: "drift", s2: "ride", s3: "desk", s4: "committee", s5: "ahead", s6: "seam", s7: "tracing", cap: "star", ft: "pencil" };
  var sections = qa("section");
  function buildNav() {
    var nav = $("nav"); nav.innerHTML = "";
    sections.forEach(function (s) {
      var b = document.createElement("button"); b.type = "button"; b.dataset.for = s.id;
      b.innerHTML = '<span class="ic" aria-hidden="true">' + (IC[NAV_ICON[s.id]] || "") + "</span>" + s.dataset.n + " · " + s.dataset.title + (store.said[s.id] ? '<span class="chk">✓</span>' : "");
      b.onclick = function () { show(s.id); };
      nav.appendChild(b);
    });
  }
  function show(id) {
    sections.forEach(function (s) { s.classList.toggle("on", s.id === id); });
    qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === id); });
    if (location.hash !== "#/" + id) history.replaceState(null, "", "#/" + id);
    window.scrollTo(0, 0);
    setTimeout(redrawAll, 0);
  }
  function markNav() { var cur = sections.filter(function (s) { return s.classList.contains("on"); })[0]; if (cur) qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === cur.id); }); }
  var redraws = [];
  function redrawAll() { redraws.forEach(function (f) { try { f(); } catch (e) {} }); }
  function onStep(id) { return $(id).classList.contains("on"); }

  /* ---------------- predictions & say-it ---------------- */
  function touch(sec) { store.touched[sec] = (store.touched[sec] || 0) + 1; save(); checkSay(sec); }
  function checkSay(sec) {
    var el = $(sec); if (!el) return;
    var say = el.querySelector(".say"); if (!say) return;
    var preds = qa(".predict", el);
    var allAnswered = preds.every(function (p) { return store.predicts[p.dataset.p] != null; });
    var played = (store.touched[sec] || 0) > 0;
    if (allAnswered && played) {
      say.classList.add("on");
      if (!store.said[sec]) { store.said[sec] = true; save(); buildNav(); markNav(); }
    }
  }
  function initPredicts() {
    qa(".predict").forEach(function (p) {
      var key = p.dataset.p, btns = qa(".opts button", p), sec = p.closest("section").id;
      function reveal(idx) {
        btns.forEach(function (b, i) { b.disabled = true; if (b.hasAttribute("data-right")) b.classList.add("right"); else if (i === idx) b.classList.add("wrong"); });
        p.classList.add("done");
      }
      btns.forEach(function (b, i) { b.onclick = function () { store.predicts[key] = i; save(); reveal(i); checkSay(sec); }; });
      if (store.predicts[key] != null) reveal(store.predicts[key]);
    });
  }

  /* ---------------- glossary tips ---------------- */
  function bindTip(el) {
    var g = GL[el.dataset.g]; if (!g) return;
    el.setAttribute("tabindex", "0"); el.setAttribute("role", "button");
    var tip = $("tip");
    function place() {
      tip.innerHTML = "<b>" + g[0] + "</b>" + g[1] + '<span class="eqv">On Main Street: ' + g[2] + "</span>";
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), tw = Math.min(320, window.innerWidth - 24);
      tip.style.width = tw + "px";
      var left = Math.max(12, Math.min(window.innerWidth - tw - 12, r.left + r.width / 2 - tw / 2));
      var top = r.bottom + 8; if (top + tip.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - tip.offsetHeight - 8);
      tip.style.left = left + "px"; tip.style.top = top + "px";
    }
    el.addEventListener("mouseenter", place); el.addEventListener("focus", place);
    el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
    el.addEventListener("blur", function () { tip.style.display = "none"; });
    el.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (tip.style.display === "block") tip.style.display = "none"; else place(); });
  }
  function initTips(root) { qa(".g", root).forEach(bindTip); }
  document.addEventListener("click", function () { $("tip").style.display = "none"; });
  window.addEventListener("scroll", function () { $("tip").style.display = "none"; }, { passive: true });

  /* ---------------- small widgets ---------------- */
  function seg(el, opts, val, onChange) {
    el.innerHTML = "";
    var state = { value: val };
    opts.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = o.label;
      if (o.v === val) b.classList.add("on");
      b.onclick = function () { state.value = o.v; qa("button", el).forEach(function (x) { x.classList.toggle("on", x === b); }); onChange(o.v); };
      el.appendChild(b);
    });
    return state;
  }
  // Runs onFrame(u) with u from 0 to 1 over the given duration; returns a handle with stop().
  function anim(msDur, onFrame, onDone) {
    var h = { stopped: false, stop: function () { h.stopped = true; } }, t0 = null;
    if (REDUCED) { onFrame(1); if (onDone) onDone(); return h; }
    (function loop(ts) {
      if (h.stopped) return;
      if (t0 == null) t0 = ts;
      var u = Math.max(0, Math.min(1, (ts - t0) / msDur));
      onFrame(u);
      if (u < 1) requestAnimationFrame(loop); else if (onDone) onDone();
    })(performance.now());
    requestAnimationFrame(function () {});
    return h;
  }
  // Runs job(k) for k = 0 … n−1 in slices of ~25 ms so the page stays responsive.
  function slices(n, job, onProgress, onDone) {
    var k = 0, h = { stopped: false, stop: function () { h.stopped = true; } };
    (function chunk() {
      if (h.stopped) return;
      var t0 = performance.now();
      while (k < n && performance.now() - t0 < 25) { job(k); k++; }
      if (onProgress) onProgress(k, n);
      if (k < n) setTimeout(chunk, 0); else if (onDone) onDone();
    })();
    return h;
  }
  function busy(btns, on) { btns.forEach(function (b) { if ($(b)) $(b).disabled = on; }); }

  /* ---------------- canvas basics ---------------- */
  if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  function prep(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 600, h = cv.clientHeight || Math.round(w / 3);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    return { g: g, W: w, H: h };
  }
  var HAND = "'Patrick Hand', 'Comic Sans MS', sans-serif", SIGN = "'Grandstander', 'Patrick Hand', sans-serif";

  /* ================= THE STREET VIEW =================
     Main Street drawn straightened: left to right is distance along the street, up and down is distance from the
     centre line, stretched sideways about three times so centimetres show. Up is the striper's left. */
  function StreetView(id, opts) {
    opts = opts || {};
    var cv = $(id), LEN = opts.len || WP.LEN, EMAX = opts.emax || 0.8;
    function geom(W, H) {
      var top = H * 0.17, bot = H * 0.83, mid = (top + bot) / 2, ky = (bot - top) / 2 / (EMAX + 0.08), padL = 10, padR = 14;
      return { W: W, H: H, top: top, bot: bot, mid: mid, ky: ky, X: function (x) { return padL + (x + 0.2) / (LEN + 0.4) * (W - padL - padR); }, Y: function (e) { return mid + e * ky; }, kx: (W - padL - padR) / (LEN + 0.4) };
    }
    function shops(g, G) {
      var cols = ["#C8452F", "#9CCBEA", "#5FA03C", "#B8A3DC", "#DDBB8A", "#F4C430"], w = 74, x = 4, i = 0;
      [0, 1].forEach(function (row) {
        x = 4 + row * 30; i = row * 2;
        while (x < G.W) {
          var y0 = row ? G.bot + G.H * 0.07 : 0, h = G.H * 0.10;
          g.fillStyle = cols[i % cols.length]; g.fillRect(x, y0, w - 10, h); g.strokeStyle = COL.line; g.lineWidth = 1.5; g.strokeRect(x, y0, w - 10, h);
          g.fillStyle = "#FFFDF6"; g.fillRect(x + 8, y0 + h * 0.25, 14, h * 0.45); g.fillRect(x + w - 34, y0 + h * 0.25, 14, h * 0.45);
          x += w; i++;
        }
      });
    }
    function base(g, G, w) {
      g.fillStyle = COL.kerb; g.fillRect(0, 0, G.W, G.H);
      shops(g, G);
      // asphalt between the kerbs
      g.fillStyle = COL.asphalt; g.fillRect(0, G.Y(-EMAX), G.W, G.Y(EMAX) - G.Y(-EMAX));
      g.strokeStyle = COL.line; g.lineWidth = 2; g.beginPath(); g.moveTo(0, G.Y(-EMAX)); g.lineTo(G.W, G.Y(-EMAX)); g.moveTo(0, G.Y(EMAX)); g.lineTo(G.W, G.Y(EMAX)); g.stroke();
      // flecks
      g.fillStyle = "rgba(255,255,255,.09)"; for (var k = 0; k < 90; k++) { var fx = (k * 97.3) % G.W, fy = G.Y(-EMAX) + ((k * 53.1) % (G.Y(EMAX) - G.Y(-EMAX))); g.fillRect(fx, fy, 3, 1.5); }
      // metre ruler on the kerb
      g.fillStyle = COL.soft; g.font = "12px " + HAND; g.textAlign = "center";
      for (var m = 0; m <= LEN; m += 2) { var px = G.X(m); g.fillRect(px - 0.5, G.Y(EMAX) + 1, 1, 5); g.fillText(m + " m", px, G.Y(EMAX) + 17); }
      // how much the view is stretched sideways, so nobody reads a 5 cm wobble as a swerve
      g.textAlign = "right"; g.fillStyle = COL.ink; g.fillText("street straightened · sideways ×" + fmt(G.ky / G.kx, 0) + " · " + (EMAX >= 0.5 ? "kerb to kerb " + fmt(2 * EMAX, 1) + " m" : "±" + fmt(EMAX * 100, 0) + " cm shown"), G.W - 8, G.Y(-EMAX) - 5);
      // chalk centre line
      g.strokeStyle = "rgba(255,253,246,.75)"; g.lineWidth = 1.5; g.setLineDash([8, 7]); g.beginPath(); g.moveTo(G.X(0), G.Y(0)); g.lineTo(G.X(LEN), G.Y(0)); g.stroke(); g.setLineDash([]);
    }
    function cement(g, G, c) {
      var x0 = G.X(c.x), x1 = G.X(c.x + c.len), y0 = G.Y(-c.half), y1 = G.Y(c.half);
      g.fillStyle = COL.cement; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = "rgba(74,46,30,.10)"; for (var i = 0; i < 6; i++) g.fillRect(x0 + 4 + i * (x1 - x0 - 8) / 6, y0 + 5 + (i % 2) * 6, 7, 2);
      g.strokeStyle = COL.bad; g.lineWidth = 2; g.setLineDash([5, 3]); g.strokeRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6); g.setLineDash([]);
      [[x0 - 3, y0 - 3], [x1 + 3, y0 - 3], [x0 - 3, y1 + 3], [x1 + 3, y1 + 3]].forEach(function (p) { cone(g, p[0], p[1]); });
      g.fillStyle = COL.line; g.font = "700 12px " + SIGN; g.textAlign = "center"; g.fillText("WET", (x0 + x1) / 2, (y0 + y1) / 2 + 4);
    }
    function cone(g, x, y) { g.fillStyle = COL.cone; g.strokeStyle = COL.line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 5, y + 5); g.lineTo(x - 5, y + 5); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#FFFDF6"; g.fillRect(x - 2.5, y - 1, 5, 2); }
    function pothole(g, G, x) { var px = G.X(x), py = G.Y(Math.min(0.22, EMAX * 0.55)); g.fillStyle = "#3A3A3A"; g.strokeStyle = COL.line; g.lineWidth = 1.5; g.beginPath(); g.ellipse(px, py, 9, 5, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = "#555"; g.beginPath(); g.moveTo(px + 9, py); g.lineTo(px + 15, py - 4); g.stroke(); }
    function path(g, G, w, pts, col, width, alpha) {
      if (pts.length < 2) return;
      g.globalAlpha = alpha == null ? 1 : alpha; g.lineJoin = "round"; g.lineCap = "round";
      g.strokeStyle = col; g.lineWidth = width;
      g.beginPath();
      for (var i = 0; i < pts.length; i++) { var p = pts[i], e = p.e != null ? p.e : p.y - w.st.y(p.x), X = G.X(p.x), Y = G.Y(e); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
      g.stroke(); g.globalAlpha = 1;
    }
    function striper(g, G, w, p) {
      var e = p.y - w.st.y(p.x), phi = p.th - Math.atan(w.st.dy(p.x)), a = Math.atan2(Math.sin(phi) * G.ky, Math.cos(phi) * G.kx);
      g.save(); g.translate(G.X(p.x), G.Y(e)); g.rotate(a);
      g.fillStyle = COL.line; g.beginPath(); g.arc(-10, -9, 3.5, 0, 7); g.arc(-10, 9, 3.5, 0, 7); g.fill();
      g.fillStyle = COL.paint; g.strokeStyle = COL.line; g.lineWidth = 2; g.beginPath(); g.roundRect(-18, -8, 26, 16, 5); g.fill(); g.stroke();
      g.fillStyle = "#B9BDC2"; g.beginPath(); g.roundRect(-13, -5, 10, 10, 3); g.fill(); g.stroke();
      g.fillStyle = COL.line; g.beginPath(); g.arc(4, 0, 3, 0, 7); g.fill();
      g.restore();
    }
    function render(st) {
      var c = prep(cv), g = c.g, G = geom(c.W, c.H), w = st.w;
      base(g, G, w);
      if (w && w.potholes) w.potholes.forEach(function (h) { pothole(g, G, h.x); });
      var showCement = w && w.cement && (w.cement.appear < 0 || (st.upto && st.upto.x >= w.cement.appear) || st.showAll);
      if (showCement) cement(g, G, w.cement);
      if (st.refs) st.refs.forEach(function (r) { path(g, G, w, r.pts, r.col || COL.sheet, r.width || 2, r.alpha == null ? 0.9 : r.alpha); });
      if (st.ghosts) st.ghosts.forEach(function (gh) { path(g, G, gh.w || w, gh.pts, COL.paint, 2, 0.45); });
      if (st.trace) {
        var tr = st.trace, k = st.k == null ? tr.length - 1 : Math.min(st.k, tr.length - 1), moving = [], i;
        // blobs: one puddle per stop, sized by how long the nozzle stood open
        var runStart = -1;
        for (i = 0; i <= k; i++) {
          if (tr[i].stopped && runStart < 0) runStart = i;
          if ((!tr[i].stopped || i === k) && runStart >= 0) { var len = (tr[i].stopped ? i + 1 : i) - runStart, p0 = tr[runStart]; blob(g, G, w, p0, len); runStart = -1; }
        }
        for (i = 0; i <= k; i++) if (!tr[i].stopped) moving.push(tr[i]);
        path(g, G, w, moving, COL.paintEdge, 6.5);
        path(g, G, w, moving, COL.paint, 4.5);
        // tyre tracks in the cement
        if (showCement) { var inC = moving.filter(function (p) { return WP.inCement(w, p); }); inC.forEach(function (p) { g.fillStyle = COL.bad; g.fillRect(G.X(p.x) - 1.5, G.Y(p.y - w.st.y(p.x)) - 1.5, 3, 3); }); }
        // kinks
        if (st.kinks) for (i = 1; i <= k; i++) if (!tr[i].stopped && !tr[i - 1].stopped && Math.abs(tr[i].om - tr[i - 1].om) > WP.KINK) { var pk = tr[i], ek = pk.y - w.st.y(pk.x), kx2 = G.X(pk.x), ky2 = G.Y(ek); g.strokeStyle = COL.bad; g.lineWidth = 2.5; g.beginPath(); g.moveTo(kx2 - 5, ky2 - 9); g.lineTo(kx2, ky2 - 15); g.lineTo(kx2 + 5, ky2 - 9); g.stroke(); }
        // seams: where an order landed
        if (st.events) st.events.forEach(function (ev) { if (ev.k !== "land" || ev.t > tr[k].tick) return; var px = G.X(ev.x); g.fillStyle = COL.line; g.beginPath(); g.moveTo(px, G.Y(EMAX) - 1); g.lineTo(px - 4, G.Y(EMAX) - 8); g.lineTo(px + 4, G.Y(EMAX) - 8); g.closePath(); g.fill(); });
        var cur = tr[k];
        // the queued waypoints ahead
        if (cur.q && cur.q.length) {
          var nd = cur.nd == null ? cur.q.length : cur.nd;
          for (i = 0; i < cur.q.length; i++) {
            var wx = cur.x + (i + 1) * WP.SPEED * WP.DT, drive = i < nd;
            g.fillStyle = drive ? COL.paint : COL.sheet; g.strokeStyle = COL.line; g.lineWidth = 1;
            g.beginPath(); g.arc(G.X(wx), G.Y(cur.q[i]), drive ? 2.6 : 2.1, 0, 7); g.fill(); g.stroke();
          }
        }
        striper(g, G, w, cur);
        if (st.label) { g.font = "15px " + HAND; var tw = g.measureText(st.label).width + 14; g.fillStyle = "rgba(255,253,246,.94)"; g.strokeStyle = COL.line; g.lineWidth = 1.5; g.beginPath(); g.roundRect(6, 6, tw, 24, 5); g.fill(); g.stroke(); g.fillStyle = COL.ink; g.textAlign = "left"; g.fillText(st.label, 13, 23); }
      }
    }
    function blob(g, G, w, p, ticks) {
      var e = p.y - w.st.y(p.x), r = Math.min(16, 3.5 + 1.6 * Math.sqrt(ticks));
      g.fillStyle = COL.paint; g.strokeStyle = COL.paintEdge; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(G.X(p.x), G.Y(e), r * 1.1, r * 0.9, 0.3, 0, 7); g.fill(); g.stroke();
    }
    return { render: render };
  }

  /* ---------------- the timeline strip ---------------- */
  function drawTimeline(id, res, k, opts) {
    opts = opts || {};
    var c = prep($(id)), g = c.g, W = c.W, H = c.H, tr = res.trace, T = Math.max(tr.length, opts.T || 0), padL = 74;
    var X = function (t) { return padL + t / T * (W - padL - 8); }, r1 = H * 0.12, r2 = H * 0.56, rh = H * 0.32;
    g.fillStyle = COL.sheet; g.fillRect(0, 0, W, H);
    g.fillStyle = COL.soft; g.font = "13px " + HAND; g.textAlign = "right";
    g.fillText("drafting desk", padL - 6, r1 + rh * 0.75); g.fillText("striper", padL - 6, r2 + rh * 0.75);
    // drafting: ask → land
    var asks = [];
    res.events.forEach(function (ev) { if (ev.k === "ask") asks.push(ev.t); if (ev.k === "land") { var t0 = ev.t0; g.fillStyle = "rgba(156,203,234,.9)"; g.strokeStyle = COL.line; g.lineWidth = 1; var x0 = X(t0), x1 = Math.max(X(ev.t), x0 + 1.5); g.fillRect(x0, r1, x1 - x0, rh); if (x1 - x0 > 3) g.strokeRect(x0, r1, x1 - x0, rh); } });
    // driving / stopped
    for (var i = 0; i < tr.length; i++) { g.fillStyle = tr[i].stopped ? COL.bad : COL.grass; g.fillRect(X(i), r2, Math.max(1, X(i + 1) - X(i)), rh); }
    if (opts.queue) { g.strokeStyle = COL.ink; g.lineWidth = 1.2; g.beginPath(); for (i = 0; i < tr.length; i++) { var q = tr[i].q ? tr[i].q.length : 0, yy = r2 + rh - q / WP.H * rh; if (i) g.lineTo(X(i), yy); else g.moveTo(X(i), yy); } g.stroke(); }
    if (k != null) { g.strokeStyle = COL.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(X(k), 2); g.lineTo(X(k), H - 2); g.stroke(); }
  }

  /* ---------------- a line chart ---------------- */
  function lineChart(id, o) {
    var c = prep($(id)), g = c.g, W = c.W, H = c.H, pad = { l: 48, r: 14, t: 16, b: 34 };
    var xs = o.xs, xmin = o.xmin != null ? o.xmin : Math.min.apply(null, xs), xmax = o.xmax != null ? o.xmax : Math.max.apply(null, xs);
    var ymax = o.ymax || 1e-9; o.series.forEach(function (s) { s.ys.forEach(function (v) { if (v != null && v > ymax) ymax = v; }); }); ymax *= 1.08;
    var X = o.logx ? function (v) { return pad.l + (Math.log(v) - Math.log(xmin)) / (Math.log(xmax) - Math.log(xmin)) * (W - pad.l - pad.r); } : function (v) { return pad.l + (v - xmin) / (xmax - xmin || 1) * (W - pad.l - pad.r); };
    var Y = function (v) { return H - pad.b - v / ymax * (H - pad.t - pad.b); };
    g.fillStyle = COL.sheet; g.fillRect(0, 0, W, H);
    g.strokeStyle = COL.rule; g.lineWidth = 1; g.fillStyle = COL.soft; g.font = "13px " + HAND;
    for (var j = 0; j <= 4; j++) { var yv = ymax / 1.08 * j / 4, yy = Y(yv); g.beginPath(); g.moveTo(pad.l, yy); g.lineTo(W - pad.r, yy); g.stroke(); g.textAlign = "right"; g.fillText(fmt(yv, yv < 10 ? 1 : 0), pad.l - 6, yy + 4); }
    g.textAlign = "center"; xs.forEach(function (v) { g.fillText(o.xfmt ? o.xfmt(v) : String(v), X(v), H - pad.b + 16); });
    if (o.xlab) g.fillText(o.xlab, (pad.l + W - pad.r) / 2, H - 3);
    if (o.ylab) { g.save(); g.translate(12, (pad.t + H - pad.b) / 2); g.rotate(-Math.PI / 2); g.fillText(o.ylab, 0, 0); g.restore(); }
    if (o.vline != null) { g.strokeStyle = COL.grassD; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(o.vline), pad.t); g.lineTo(X(o.vline), H - pad.b); g.stroke(); g.setLineDash([]); if (o.vlab) { g.fillStyle = COL.grassD; g.textAlign = "left"; g.fillText(o.vlab, X(o.vline) + 4, pad.t + 10); } }
    o.series.forEach(function (s) {
      g.strokeStyle = s.col; g.lineWidth = s.width || 2.5; g.setLineDash(s.dash || []);
      g.beginPath(); var started = false;
      s.ys.forEach(function (v, i) { if (v == null) return; var px = X(s.xs ? s.xs[i] : xs[i]), py = Y(v); if (started) g.lineTo(px, py); else { g.moveTo(px, py); started = true; } });
      g.stroke(); g.setLineDash([]);
      if (!s.noDots) s.ys.forEach(function (v, i) { if (v == null) return; g.fillStyle = s.col; g.beginPath(); g.arc(X(s.xs ? s.xs[i] : xs[i]), Y(v), 3.5, 0, 7); g.fill(); });
    });
    // legend
    var lx = pad.l + 8, ly = pad.t + 6; g.textAlign = "left";
    o.series.forEach(function (s) { if (!s.name) return; g.strokeStyle = s.col; g.lineWidth = 2.5; g.setLineDash(s.dash || []); g.beginPath(); g.moveTo(lx, ly + 4); g.lineTo(lx + 20, ly + 4); g.stroke(); g.setLineDash([]); g.fillStyle = COL.ink; g.fillText(s.name, lx + 26, ly + 8); ly += 17; });
  }

  /* ---------------- the notebook map ---------------- */
  function drawMap(id, cov, runs) {
    var c = prep($(id)), g = c.g, W = c.W, H = c.H, pad = 40, n = cov.n, R = cov.R, cw = (W - pad - 10) / n, ch = (H - pad - 10) / n;
    g.fillStyle = COL.sheet; g.fillRect(0, 0, W, H);
    var CX = function (e) { return pad + (e + R) / (2 * R) * (W - pad - 10); }, CY = function (phi) { return 10 + (R - phi) / (2 * R) * (H - pad - 10); };
    g.strokeStyle = COL.rule; g.lineWidth = 1;
    for (var i = 0; i <= n; i++) { g.beginPath(); g.moveTo(pad + i * cw, 10); g.lineTo(pad + i * cw, H - pad); g.stroke(); g.beginPath(); g.moveTo(pad, 10 + i * ch); g.lineTo(W - 10, 10 + i * ch); g.stroke(); }
    for (var j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var d = cov.demo[j * n + i], f = cov.foreman[j * n + i];
      if (!d && !f) continue;
      g.fillStyle = f > d ? COL.grass : COL.paint; g.globalAlpha = Math.min(1, 0.35 + Math.log10(1 + d + f) / 3.5);
      g.fillRect(pad + i * cw + 0.5, 10 + (n - 1 - j) * ch + 0.5, cw - 1, ch - 1);
    }
    g.globalAlpha = 1;
    g.strokeStyle = COL.line; g.lineWidth = 1.5; g.strokeRect(pad, 10, W - pad - 10, H - pad - 10);
    g.fillStyle = COL.soft; g.font = "13px " + HAND; g.textAlign = "center";
    [-0.4, -0.2, 0, 0.2, 0.4].forEach(function (v) { g.fillText(fmt(v * 100, 0), CX(v), H - pad + 15); });
    g.fillText("offset from the line (cm) · left ← → right", (pad + W - 10) / 2, H - 8);
    g.textAlign = "right"; [-0.4, 0, 0.4].forEach(function (v) { g.fillText(fmt(v, 1), pad - 5, CY(v) + 4); });
    g.save(); g.translate(11, (10 + H - pad) / 2); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.fillText("heading error (rad)", 0, 0); g.restore();
    (runs || []).forEach(function (run) {
      g.strokeStyle = run.col || COL.bad; g.lineWidth = 2; g.beginPath();
      run.pts.forEach(function (p, k) { var x = CX(Math.max(-R, Math.min(R, p[0]))), y = CY(Math.max(-R, Math.min(R, p[1]))); if (k) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke();
      if (run.pts.length) { var l = run.pts[run.pts.length - 1]; g.fillStyle = run.col || COL.bad; g.beginPath(); g.arc(CX(Math.max(-R, Math.min(R, l[0]))), CY(Math.max(-R, Math.min(R, l[1]))), 4, 0, 7); g.fill(); }
    });
  }
  function covCells(cov) { var n = 0; for (var i = 0; i < cov.demo.length; i++) if (cov.demo[i] + cov.foreman[i] > 0) n++; return n; }

  /* ---------------- shared data ---------------- */
  var RUNS = []; for (var ri = 0; ri < 20; ri++) RUNS.push(WP.demo(WP.world({ street: 100 + ri }), 1000 + ri, 0));   // = WP.streetLog(20), run by run
  var LOG = [].concat.apply([], RUNS), NB = WP.notebook(LOG);
  var STREET = 11, CLEAN = WP.world({ street: STREET }), HOLE = WP.world({ street: STREET, potholes: [{ x: 4, kick: 0.2 }] });
  function refPts(w, side) { var f = WP.reference(w, side || 0), out = []; for (var x = 0; x <= w.len; x += 0.05) out.push({ x: x, e: f(x) }); return out; }
  function bcRun(w, nb) { return WP.rollStep(w, function (s) { return WP.bcAction(nb, WP.observe(w, s)); }); }
  function masterRun(w) { return WP.rollStep(w, function (s) { return WP.masterAction(w, s, 0); }); }
  function phasePath(w, tr, fromX) { return tr.filter(function (p) { return p.x >= (fromX || 0); }).map(function (p) { var e = WP.errs(w, p); return [e.e, e.phi]; }); }
  var CNB = null;
  function chunkNb() { if (!CNB) CNB = WP.chunkNotebook(); return CNB; }
  // plays a recorded trace on a street view; onTick(k) updates the readouts
  function play(view, w, res, extra, onTick, onDone, speed) {
    var tr = res.trace, N = tr.length, dur = Math.max(2500, N / (speed || 160) * 1000);
    return anim(dur, function (u) {
      var k = Math.min(N - 1, Math.floor(u * (N - 1)));
      view.render(Object.assign({ w: w, trace: tr, k: k, upto: tr[k] }, extra || {}));
      if (onTick) onTick(k);
    }, onDone);
  }

  /* ================= STEP 0 ================= */
  function initS0() {
    var view = StreetView("s0c", { emax: 0.25 }), view2 = StreetView("s0c2", { emax: 0.25 }), logged = [], running = null, last2 = null;
    var demoWorlds = []; for (var i = 0; i < 20; i++) demoWorlds.push(WP.world({ street: 100 + i }));
    var demoTraces = demoWorlds.map(function (w, i) { var r = WP.rng(1000 + i), s = WP.start(w, 0, 0), n = 0, a = Math.exp(-WP.DT / 0.35), sig = WP.WOBBLE * Math.sqrt(1 - a * a), out = []; while (s.x < w.len) { n = a * n + sig * r.normal(); var om = WP.masterAction(w, s, 0) + n; out.push({ x: s.x, y: s.y, th: s.th, om: om, stopped: false }); s = WP.step(w, s, om, false); } return out; });
    function stats() {
      var rows = []; logged.forEach(function (j) { rows = rows.concat(RUNS[j]); });
      $("s0n").textContent = logged.length; $("s0p").textContent = fmt(rows.length);
      if (rows.length) {
        var within = rows.filter(function (r) { return Math.abs(r.o[0]) < 0.05; }).length / rows.length, mx = 0; rows.forEach(function (r) { mx = Math.max(mx, Math.abs(r.o[0])); });
        $("s0w").textContent = pct(within, 1); $("s0max").textContent = cm(mx);
      } else { $("s0w").textContent = "–"; $("s0max").textContent = "–"; }
    }
    function draw(k) {
      var i = logged.length;
      view.render({ w: demoWorlds[Math.min(19, Math.max(0, i - 1))], ghosts: logged.slice(0, -1).map(function (j) { return { w: demoWorlds[j], pts: demoTraces[j].map(function (p) { return { x: p.x, e: p.y - demoWorlds[j].st.y(p.x) }; }) }; }),
        trace: i ? demoTraces[logged[i - 1]] : null, k: k, label: i ? "run " + i + " of 20 · the master's line" : null });
    }
    $("s0demo").onclick = function () {
      if (running) running.stop();
      if (logged.length >= 20) logged = [];
      var j = logged.length; logged.push(j); stats();
      running = play({ render: function (st) { draw(st.k); } }, demoWorlds[j], { trace: demoTraces[j] }, null, null, function () { running = null; touch("s0"); }, 260);
    };
    $("s0all").onclick = function () { if (running) running.stop(); running = null; logged = []; for (var j = 0; j < 20; j++) logged.push(j); stats(); draw(); touch("s0"); };
    // the apprentice
    function app(withHole) {
      if (running) running.stop();
      var w = withHole ? HOLE : CLEAN, tr = bcRun(w, NB), sc = WP.score(w, tr, 0), msc = WP.score(w, masterRun(w), 0);
      var worst = 0; tr.forEach(function (p, i) { if (Math.abs(p.y - w.st.y(p.x)) > Math.abs(tr[worst].y - w.st.y(tr[worst].x))) worst = i; });
      var o = WP.observe(w, tr[worst]), nn = WP.kdKnn(NB.tree, WP.scaled(o), WP.K, NB.rows), farthest = 0; nn.forEach(function (n) { farthest = Math.max(farthest, Math.abs(n.p.o[0])); });
      last2 = { w: w, tr: tr };
      running = play(view2, w, { trace: tr }, { refs: [{ pts: refPts(w, 0), col: COL.sheet, width: 2, alpha: 0.85 }], label: withHole ? "the apprentice · pothole at 4 m" : "the apprentice · clean street" }, null, function () {
        running = null;
        $("s0off").textContent = fmt(sc.offM, 2) + " m"; $("s0off").className = "v " + (sc.offM > 0.5 ? "bad" : "good");
        $("s0me").textContent = cm(sc.maxE); $("s0moff").textContent = fmt(msc.offM, 2) + " m · max " + cm(msc.maxE);
        $("s0pg").textContent = "≤ " + cm(farthest) + " off";
        $("s0st").innerHTML = withHole ? "At its worst the apprentice was <b>" + cm(Math.abs(o[0])) + "</b> off the line. The five most similar pages it found were all at most <b>" + cm(farthest) + "</b> off, the very edge of where the master ever went: there's no page for where the apprentice is, so it steers as if it were nearer the line." : "On a street with no surprises the apprentice stays within <b>" + cm(sc.maxE) + "</b> of the line: every situation it meets is one the master logged.";
        touch("s0");
      }, 220);
    }
    $("s0clean").onclick = function () { app(false); };
    $("s0hole").onclick = function () { app(true); };
    stats(); draw();
    view2.render({ w: HOLE, refs: [{ pts: refPts(HOLE, 0), col: COL.sheet, width: 2, alpha: 0.85 }] });
    redraws.push(function () { if (!onStep("s0") || running) return; draw(); if (last2) view2.render({ w: last2.w, trace: last2.tr, refs: [{ pts: refPts(last2.w, 0), col: COL.sheet, width: 2, alpha: 0.85 }] }); else view2.render({ w: HOLE, refs: [{ pts: refPts(HOLE, 0), col: COL.sheet, width: 2, alpha: 0.85 }] }); });
  }

  /* ================= STEP 1 ================= */
  var FLEET_L = [4, 8, 16, 32], FLEET_N = 12;
  function fleetWorld(k, L) { return WP.world({ street: 500 + k, len: L, potholes: WP.potholes(900 + k, 0.08, 0.2, L) }); }
  function initS1() {
    var cov = WP.coverage(LOG), path = null, result = null, h = null;
    $("s1cells").textContent = covCells(cov) + " of " + cov.n * cov.n;
    function drawM() { drawMap("s1map", cov, path ? [{ pts: path, col: COL.bad }] : []); }
    $("s1go").onclick = function () {
      var tr = bcRun(HOLE, NB); path = phasePath(HOLE, tr, 3.9);
      var n = cov.n, R = cov.R, out = 0;
      tr.forEach(function (p) { var e = WP.errs(HOLE, p), i = Math.floor((e.e + R) / (2 * R) * n), j = Math.floor((e.phi + R) / (2 * R) * n); if (i < 0 || j < 0 || i >= n || j >= n || !(cov.demo[j * n + i] + cov.foreman[j * n + i])) out++; });
      $("s1in").textContent = pct(out / tr.length, 0); drawM(); touch("s1");
    };
    function drawC() {
      if (!result) { lineChart("s1chart", { xs: FLEET_L, series: [], xlab: "street length (m)", ylab: "metres off the line" }); return; }
      var b8 = result.bc[1], quad = FLEET_L.map(function (L) { return b8 * (L / 8) * (L / 8); }), lin = FLEET_L.map(function (L) { return b8 * L / 8; });
      lineChart("s1chart", { xs: FLEET_L, xlab: "street length (m)", ylab: "metres off the line, mean of 12", ymax: result.bc[3] * 1.15,
        series: [{ name: "the apprentice (BC)", col: COL.bad, ys: result.bc }, { name: "the master", col: COL.grassD, ys: result.ma }, { name: "∝ length², through 8 m (never recovers)", col: COL.soft, ys: quad.map(function (v) { return v <= result.bc[3] * 1.15 ? v : null; }), dash: [5, 4], width: 1.5, noDots: true }, { name: "∝ length, through 8 m", col: COL.yellowD, ys: lin, dash: [2, 3], width: 1.5, noDots: true }] });
      $("s1tab").innerHTML = "<tr><th>street</th>" + FLEET_L.map(function (L) { return "<th>" + L + " m</th>"; }).join("") + "</tr>" +
        "<tr><td>the master</td>" + result.ma.map(function (v) { return "<td>" + fmt(v, 2) + " m</td>"; }).join("") + "</tr>" +
        "<tr><td>the apprentice</td>" + result.bc.map(function (v) { return '<td class="n">' + fmt(v, 2) + " m</td>"; }).join("") + "</tr>" +
        "<tr><td>× per doubling</td><td>–</td>" + result.bc.slice(1).map(function (v, i) { return "<td>" + fmt(v / result.bc[i], 1) + "×</td>"; }).join("") + "</tr>";
    }
    $("s1fleet").onclick = function () {
      if (h) return; busy(["s1fleet"], true);
      var jobs = []; FLEET_L.forEach(function (L, li) { for (var k = 0; k < FLEET_N; k++) jobs.push([li, k]); });
      var bc = [0, 0, 0, 0], ma = [0, 0, 0, 0];
      h = slices(jobs.length, function (j) { var li = jobs[j][0], w = fleetWorld(jobs[j][1], FLEET_L[li]); bc[li] += WP.score(w, bcRun(w, NB), 0).offM / FLEET_N; ma[li] += WP.score(w, masterRun(w), 0).offM / FLEET_N; },
        function (k, n) { $("s1st").textContent = "street " + k + " of " + n + "…"; },
        function () { h = null; busy(["s1fleet"], false); result = { bc: bc, ma: ma }; $("s1st").innerHTML = "12 streets at each length, potholes at 0.08 per metre (±0.2 rad), the same streets for both · 4× the street from 8 m to 32 m: <b>" + fmt(bc[3] / bc[1], 1) + "×</b> the off-line paint"; drawC(); touch("s1"); });
    };
    drawM(); drawC();
    redraws.push(function () { if (onStep("s1")) { drawM(); drawC(); } });
  }

  /* ================= STEP 2 ================= */
  var PRACTICE = WP.practice(false);
  function initS2() {
    var view = StreetView("s2c", { emax: 0.25 }), st, hist;
    function reset() { st = { rows: LOG, nb: NB, round: 1, beta: 1, label: "the 20 demonstrations" }; hist = []; record(); }
    function record(extraLabel) {
      var tr = bcRun(HOLE, st.nb), sc = WP.score(HOLE, tr, 0); st.tr = tr;
      hist.push({ label: extraLabel || ("round " + st.round + (st.round === 1 ? " · the demonstrations" : " · riding along")), beta: extraLabel ? null : st.beta, pages: st.rows.length, off: sc.offM, max: sc.maxE });
      render();
    }
    function render() {
      var cov = WP.coverage(st.rows);
      $("s2round").textContent = st.round; $("s2beta").textContent = st.beta == null ? "–" : fmt(st.beta, 3).replace(/0+$/, "").replace(/\.$/, "");
      $("s2pages").textContent = fmt(st.rows.length); $("s2cells").textContent = covCells(cov) + " of " + cov.n * cov.n;
      drawMap("s2map", cov, [{ pts: phasePath(HOLE, st.tr, 3.9), col: COL.bad }]);
      view.render({ w: HOLE, trace: st.tr, refs: [{ pts: refPts(HOLE, 0), col: COL.sheet, width: 2, alpha: 0.85 }], label: st.label + " · pothole street" });
      $("s2tab").innerHTML = "<tr><th>notebook</th><th>β</th><th>pages</th><th>pothole street: off the line</th><th>furthest</th></tr>" + hist.map(function (r) { return "<tr><td>" + r.label + "</td><td>" + (r.beta == null ? "–" : fmt(r.beta, 3)) + "</td><td>" + fmt(r.pages) + '</td><td class="n" style="color:' + (r.off > 0.5 ? COL.bad : COL.grassD) + '">' + fmt(r.off, 2) + " m</td><td>" + cm(r.max) + "</td></tr>"; }).join("");
    }
    $("s2ride").onclick = function () {
      busy(["s2ride", "s2more"], true); $("s2st").textContent = "the master is riding along on six practice streets…";
      setTimeout(function () {
        var it = WP.daggerIter(st.rows, st.nb, PRACTICE, st.round + 1, {});
        st = { rows: it.rows, nb: it.nb, round: st.round + 1, beta: it.beta, label: "after round " + (st.round + 1) };
        record();
        $("s2st").innerHTML = "Round " + st.round + ": the apprentice drove six pothole streets, taking orders from the master " + pct(it.beta) + " of the time; the master wrote <b>" + fmt(it.added) + "</b> pages for the states it actually reached (green on the map).";
        busy(["s2ride", "s2more"], false); touch("s2");
      }, 30);
    };
    $("s2more").onclick = function () {
      busy(["s2ride", "s2more"], true);
      setTimeout(function () {
        var rows = WP.streetLog(40); st = { rows: rows, nb: WP.notebook(rows), round: 1, beta: 1, label: "40 runs from the master" };
        record("instead: 40 runs from the master, no riding along");
        $("s2st").innerHTML = "Twenty more runs from a master who never leaves the line: twenty more pages of being on it. The map barely changes.";
        busy(["s2ride", "s2more"], false); touch("s2");
      }, 30);
    };
    $("s2reset").onclick = function () { reset(); $("s2st").textContent = ""; };
    reset();
    redraws.push(function () { if (onStep("s2")) render(); });
  }

  /* ================= chunked runs (steps 3–7) ================= */
  var N2 = 40;
  function fleet(cfg, n, appear, onDone, onProgress) {
    var a = { offM: 0, cementRuns: 0, flipRuns: 0, flips: 0, stopS: 0, timeS: 0, kinks: 0, blobs: 0, queries: 0, blind: [], n: n || N2 };
    var nb = chunkNb();
    return slices(a.n, function (k) {
      var w = WP.testStreet(k, appear), r = WP.execute(w, nb, Object.assign({ seed: 50 + k }, cfg)), s = WP.score(w, r.trace);
      a.offM += s.offM / a.n; a.stopS += s.stopS / a.n; a.timeS += s.timeS / a.n; a.kinks += s.kinks / a.n; a.blobs += s.blobs / a.n; a.queries += r.queries / a.n; a.flips += s.flips / a.n;
      if (s.cement > 0) a.cementRuns++; if (s.flips > 0) a.flipRuns++; if (r.blindM != null) a.blind.push(r.blindM);
    }, onProgress, function () { a.blind.sort(function (x, y) { return x - y; }); onDone(a); });
  }
  function warm(cb) { if (CNB) { cb(); return; } setTimeout(function () { chunkNb(); cb(); }, 20); }
  function hudSet(id, v, cls) { $(id).textContent = v; if (cls) $(id).className = "v " + cls; }

  /* ================= STEP 3 ================= */
  function initS3() {
    var view = StreetView("s3c"), o = { d: 10, s: 25 }, running = null, last = null, rows = [];
    function label() { $("s3dv").textContent = ms(o.d); }
    function mathbox(meas) {
      var f = WP.idleShare(o.d, o.s);
      $("s3m").innerHTML = '<div class="eq">idle share = d / (d + s) = ' + o.d + " / (" + o.d + " + " + o.s + ") = " + pct(f, 1) + "</div>" +
        '<div class="eqn">Each order: stand still <b>' + o.d + "</b> ticks while it's drafted, then drive <b>" + o.s + "</b>. " + (meas != null ? "This run stood still <b>" + pct(meas, 1) + "</b> of its time." : "Press Drive to measure it.") + "</div>";
    }
    function idleRender() { view.render({ w: WP.testStreet(0), showAll: true }); drawTimeline("s3tl", { trace: [], events: [] }, null, { T: 1 }); }
    $("s3go").onclick = function () {
      if (running) running.stop();
      busy(["s3go"], true); $("s3st").textContent = "the drafting desk is warming up…";
      warm(function () {
        var w = WP.testStreet(0), res = WP.execute(w, chunkNb(), { mode: "sync", delay: o.d, s: o.s, seed: 50, record: true }), sc = WP.score(w, res.trace);
        last = { w: w, res: res };
        $("s3st").textContent = "";
        running = play(view, w, res, { events: res.events }, function (k) {
          var p = res.trace[k], asks = res.events.filter(function (e) { return e.k === "ask" && e.t <= p.tick; }).length, stops = 0, blobs = 0;
          for (var i = 0; i <= k; i++) if (res.trace[i].stopped) { stops++; if (!i || !res.trace[i - 1].stopped) blobs++; }
          hudSet("s3t", fmt(p.tick * WP.DT, 1) + " s"); hudSet("s3o", asks); hudSet("s3b", blobs); hudSet("s3idle", fmt(stops * WP.DT, 1) + " s");
          drawTimeline("s3tl", res, k);
        }, function () {
          running = null; busy(["s3go"], false); mathbox(sc.stopS / sc.timeS);
          $("s3st").innerHTML = "One street: <b>" + fmt(sc.timeS, 1) + " s</b>, of which <b>" + fmt(sc.stopS, 1) + " s</b> standing still in <b>" + sc.blobs + "</b> blobs. Without the think time the same street takes " + fmt(WP.score(w, WP.execute(w, chunkNb(), { mode: "sync", delay: 0, s: o.s, seed: 50 }).trace).timeS, 1) + " s.";
          touch("s3");
        });
      });
    };
    $("s3fleet").onclick = function () {
      busy(["s3fleet"], true);
      warm(function () {
        fleet({ mode: "sync", delay: o.d, s: o.s }, N2, null, function (a) {
          busy(["s3fleet"], false);
          rows = rows.filter(function (r) { return !(r.d === o.d && r.s === o.s); }); rows.push({ d: o.d, s: o.s, a: a }); rows.sort(function (x, y) { return x.d - y.d || x.s - y.s; });
          $("s3st").innerHTML = "40 streets, d = " + o.d + ", s = " + o.s + ": measured idle <b>" + pct(a.stopS / a.timeS, 1) + "</b>, formula " + pct(WP.idleShare(o.d, o.s), 1);
          renderTab(); touch("s3");
        }, function (k, n) { $("s3st").textContent = "street " + k + " of " + n + "…"; });
      });
    };
    function renderTab() {
      $("s3tab") && ($("s3tab").innerHTML = "");
      var host = $("s3m");
      if (!rows.length) return;
      var html = '<table class="ladder"><tr><th>d (ticks)</th><th>s</th><th>time per street</th><th>stopped</th><th>idle (measured / formula)</th><th>blobs</th><th>off the line</th></tr>' + rows.map(function (r) {
        return "<tr><td>" + r.d + "</td><td>" + r.s + '</td><td class="n">' + fmt(r.a.timeS, 1) + " s</td><td>" + fmt(r.a.stopS, 1) + " s</td><td>" + pct(r.a.stopS / r.a.timeS, 1) + " / " + pct(WP.idleShare(r.d, r.s), 1) + "</td><td>" + fmt(r.a.blobs, 1) + "</td><td>" + fmt(r.a.offM, 2) + " m</td></tr>";
      }).join("") + "</table>";
      var t = $("s3rows"); if (!t) { t = document.createElement("div"); t.id = "s3rows"; t.className = "tablewrap"; host.parentNode.insertBefore(t, host.nextSibling); }
      t.innerHTML = html;
    }
    $("s3d").addEventListener("input", function () { o.d = +this.value; label(); mathbox(); });
    seg($("s3s"), [10, 25, 50].map(function (v) { return { v: v, label: String(v) + (v === 25 ? " (π0's choice)" : v === 50 ? " (all of it)" : "") }; }), o.s, function (v) { o.s = v; mathbox(); });
    label(); mathbox(); idleRender();
    redraws.push(function () { if (!onStep("s3") || running) return; if (last) { view.render({ w: last.w, trace: last.res.trace, events: last.res.events }); drawTimeline("s3tl", last.res, null); } else idleRender(); });
  }

  /* ================= STEP 4 ================= */
  function initS4() {
    var view = StreetView("s4c"), o = { d: 25, m: 0.01 }, running = null, last = null, rows = [];
    function label() { $("s4dv").textContent = ms(o.d); $("s4mv").textContent = fmt(o.m, 2); }
    function votesAt(res, w) {
      // a tick early in the master's swerve (1.2 m before the cement; the swerve starts 1.45 m before it)
      var xs = WP.CEMENT.x - 1.2, k = 0; for (var i = 0; i < res.trace.length; i++) if (res.trace[i].x >= xs && !res.trace[i].stopped) { k = i; break; }
      return { k: k, v: res.trace[k].v || [] };
    }
    function drawVotes(vk) {
      var c = prep($("s4v")), g = c.g, W = c.W, H = c.H, pad = { l: 44, r: 10, t: 12, b: 26 }, v = vk ? vk.v : [], n = v.length, half = 0.28, R = 0.65;
      var Y = function (e) { return pad.t + (e + R) / (2 * R) * (H - pad.t - pad.b); };
      g.fillStyle = COL.sheet; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(201,195,182,.8)"; g.fillRect(pad.l, Y(-half), W - pad.l - pad.r, Y(half) - Y(-half));
      g.fillStyle = COL.soft; g.font = "12px " + HAND; g.textAlign = "right"; [-0.6, -0.3, 0, 0.3, 0.6].forEach(function (e) { g.fillText(fmt(e * 100, 0), pad.l - 5, Y(e) + 4); });
      g.save(); g.translate(11, (pad.t + H - pad.b) / 2); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.fillText("waypoint offset (cm)", 0, 0); g.restore();
      g.textAlign = "center"; g.fillText(n ? n + " votes for this tick, oldest on the left" : "drive first", (pad.l + W) / 2, H - 6);
      g.fillStyle = COL.bad; g.textAlign = "left"; g.fillText("cement", pad.l + 4, Y(0) + 4);
      if (!n) return;
      var num = 0, den = 0, bw = (W - pad.l - pad.r) / n;
      v.forEach(function (a, i) { var wgt = Math.exp(-o.m * i); num += wgt * a; den += wgt; g.fillStyle = a < 0 ? COL.left : COL.right; g.globalAlpha = 0.35 + 0.65 * wgt; g.beginPath(); g.arc(pad.l + bw * (i + 0.5), Y(a), Math.max(2, Math.min(5, bw * 0.4)), 0, 7); g.fill(); });
      g.globalAlpha = 1; var avg = num / den;
      g.strokeStyle = COL.ink; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(pad.l, Y(avg)); g.lineTo(W - pad.r, Y(avg)); g.stroke(); g.setLineDash([]);
      g.fillStyle = COL.ink; g.textAlign = "right"; g.fillText("weighted average " + fmt(avg * 100, 0) + " cm", W - pad.r - 4, Y(avg) - 5);
    }
    $("s4go").onclick = function () {
      if (running) running.stop(); busy(["s4go"], true); $("s4st").textContent = "the committee is assembling…";
      warm(function () {
        var k0 = 0, w, res;
        // the first street (in seed order) where this setting lands in the cement, so the failure is on screen; else street 0
        for (var k = 0; k < 12; k++) { w = WP.testStreet(k); res = WP.execute(w, chunkNb(), { mode: "ensemble", delay: o.d, m: o.m, seed: 50 + k, record: true }); if (WP.score(w, res.trace).cement > 0) { k0 = k; break; } if (k === 11) { k0 = 0; w = WP.testStreet(0); res = WP.execute(w, chunkNb(), { mode: "ensemble", delay: o.d, m: o.m, seed: 50, record: true }); } }
        var sc = WP.score(w, res.trace), vk = votesAt(res, w); last = { w: w, res: res, vk: vk };
        $("s4st").textContent = "";
        running = play(view, w, res, { kinks: true }, function (k) { hudSet("s4q", fmt(WP.HZ) + " / s"); }, function () {
          running = null; busy(["s4go"], false); drawVotes(vk);
          $("s4k").textContent = sc.kinks; $("s4st").innerHTML = (k0 ? "Street " + (k0 + 1) + ", the first of the 40 that ends in the cement at this setting: " : "Street 1: ") + (sc.cement ? "<b>" + fmt(sc.cementM, 2) + " m of tyre tracks in the cement</b>. " : "round the cement. ") + "The committee asked for <b>" + fmt(res.queries) + "</b> orders on one 16 m street: one per tick.";
          touch("s4");
        });
      });
    };
    $("s4fleet").onclick = function () {
      busy(["s4fleet"], true);
      warm(function () {
        fleet({ mode: "ensemble", delay: o.d, m: o.m }, N2, null, function (a) {
          busy(["s4fleet"], false);
          hudSet("s4cem", a.cementRuns + " / 40", a.cementRuns ? "bad" : "good"); hudSet("s4flip", a.flipRuns + " / 40"); hudSet("s4q", fmt(a.queries / a.timeS, 0) + " / s"); hudSet("s4k", fmt(a.kinks, 1));
          rows = rows.filter(function (r) { return !(r.d === o.d && r.m === o.m); }); rows.push({ d: o.d, m: o.m, a: a }); rows.sort(function (x, y) { return x.m - y.m || x.d - y.d; });
          $("s4tab").innerHTML = "<tr><th>d</th><th>m</th><th>streets in the cement</th><th>side flips</th><th>kinks / street</th><th>orders / s</th></tr>" + rows.map(function (r) { return "<tr><td>" + r.d + " (" + r.d * 20 + " ms)</td><td>" + fmt(r.m, 2) + '</td><td class="n" style="color:' + (r.a.cementRuns ? COL.bad : COL.grassD) + '">' + r.a.cementRuns + " / 40</td><td>" + r.a.flipRuns + " / 40</td><td>" + fmt(r.a.kinks, 1) + "</td><td>" + fmt(r.a.queries / r.a.timeS, 0) + "</td></tr>"; }).join("");
          $("s4st").textContent = ""; touch("s4");
        }, function (k, n) { $("s4st").textContent = "street " + k + " of " + n + "…"; });
      });
    };
    $("s4d").addEventListener("input", function () { o.d = +this.value; label(); });
    $("s4m").addEventListener("input", function () { o.m = +this.value; label(); if (last) drawVotes(last.vk); });
    label(); view.render({ w: WP.testStreet(0), showAll: true }); drawVotes(null);
    redraws.push(function () { if (!onStep("s4") || running) return; if (last) { view.render({ w: last.w, trace: last.res.trace, kinks: true }); drawVotes(last.vk); } else { view.render({ w: WP.testStreet(0), showAll: true }); drawVotes(null); } });
  }

  /* ================= STEP 5 ================= */
  function initS5() {
    var view = StreetView("s5c"), o = { d: 10, g: 0.5, agg: "latest" }, running = null, last = null, sweep = null;
    function label() { $("s5dv").textContent = ms(o.d); $("s5gv").textContent = fmt(o.g, 2) + (o.g >= WP.gNeeded(o.d) ? " ≥ d/50 = " + fmt(WP.gNeeded(o.d), 2) : " < d/50 = " + fmt(WP.gNeeded(o.d), 2)); }
    $("s5go").onclick = function () {
      if (running) running.stop(); busy(["s5go"], true);
      warm(function () {
        var w = WP.testStreet(0), res = WP.execute(w, chunkNb(), { mode: "async", delay: o.d, g: o.g, aggregate: o.agg, seed: 50, record: true }), sc = WP.score(w, res.trace);
        var sy = WP.score(w, WP.execute(w, chunkNb(), { mode: "sync", delay: o.d, s: 25, seed: 50 }).trace);
        last = { w: w, res: res };
        running = play(view, w, res, { events: res.events, kinks: true }, function (k) {
          var p = res.trace[k], blobs = 0; for (var i = 0; i <= k; i++) if (res.trace[i].stopped && (!i || !res.trace[i - 1].stopped)) blobs++;
          hudSet("s5t", fmt(p.tick * WP.DT, 1) + " s"); hudSet("s5q", p.q ? p.q.length : 0); hudSet("s5b", blobs);
          drawTimeline("s5tl", res, k, { queue: true });
        }, function () {
          running = null; busy(["s5go"], false);
          hudSet("s5vs", fmt(sc.timeS, 1) + " s vs " + fmt(sy.timeS, 1) + " s");
          $("s5st").innerHTML = "This street took <b>" + fmt(sc.timeS, 1) + " s</b> ordering ahead (" + res.queries + " orders, " + fmt(sc.stopS, 1) + " s stopped) against <b>" + fmt(sy.timeS, 1) + " s</b> stopping to think with s = 25: <b>" + pct(1 - sc.timeS / sy.timeS) + "</b> faster. The black line in the timeline is the queue.";
          touch("s5");
        });
      });
    };
    $("s5fleet").onclick = function () {
      busy(["s5fleet", "s5sweep"], true);
      warm(function () {
        fleet({ mode: "async", delay: o.d, g: o.g, aggregate: o.agg }, N2, null, function (a) {
          fleet({ mode: "sync", delay: o.d, s: 25 }, N2, null, function (b) {
            busy(["s5fleet", "s5sweep"], false);
            $("s5st").innerHTML = "40 streets, d = " + o.d + ", g = " + fmt(o.g, 2) + ", " + o.agg + ": <b>" + fmt(a.timeS, 1) + " s</b> a street, " + fmt(a.stopS, 1) + " s stopped, side flips on " + a.flipRuns + ", cement on " + a.cementRuns + " · stop-and-think (s = 25): " + fmt(b.timeS, 1) + " s · <b>" + pct(1 - a.timeS / b.timeS) + "</b> faster";
            hudSet("s5vs", pct(1 - a.timeS / b.timeS) + " faster"); touch("s5");
          });
        }, function (k, n) { $("s5st").textContent = "street " + k + " of " + n + "…"; });
      });
    };
    var GS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1];
    $("s5sweep").onclick = function () {
      busy(["s5sweep", "s5fleet"], true);
      warm(function () {
        var stop = [], flips = [], i = 0, n = 20;
        (function next() {
          if (i >= GS.length) { busy(["s5sweep", "s5fleet"], false); sweep = { d: o.d, stop: stop, flips: flips }; drawSweep(); $("s5st").innerHTML = "20 streets at each g, d = " + o.d + ". Left of the green line the queue runs dry; far right, every fresh order is another chance to change sides at the cement."; touch("s5"); return; }
          fleet({ mode: "async", delay: o.d, g: GS[i], aggregate: o.agg }, n, null, function (a) { stop.push(a.stopS); flips.push(a.flipRuns / n * 10); i++; $("s5st").textContent = "g = " + fmt(GS[i - 1], 1) + " done…"; setTimeout(next, 0); });
        })();
      });
    };
    function drawSweep() {
      if (!sweep) { lineChart("s5chart", { xs: GS, series: [], xlab: "threshold g", ylab: "" }); return; }
      lineChart("s5chart", { xs: GS, xfmt: function (v) { return fmt(v, 1); }, xlab: "threshold g (d = " + sweep.d + ")", ylab: "seconds stopped · flips", vline: WP.gNeeded(sweep.d), vlab: "g = d/50",
        series: [{ name: "seconds stopped per street", col: COL.bad, ys: sweep.stop }, { name: "streets with a side flip, per 10", col: COL.right, ys: sweep.flips }] });
    }
    $("s5d").addEventListener("input", function () { o.d = +this.value; label(); });
    $("s5g").addEventListener("input", function () { o.g = +this.value; label(); });
    seg($("s5agg"), [{ v: "latest", label: "keep the newest" }, { v: "average", label: "average" }, { v: "weighted", label: "0.3 old + 0.7 new (LeRobot)" }], o.agg, function (v) { o.agg = v; });
    label(); view.render({ w: WP.testStreet(0), showAll: true }); drawTimeline("s5tl", { trace: [], events: [] }, null, { T: 1 }); drawSweep();
    redraws.push(function () { if (!onStep("s5") || running) return; if (last) { view.render({ w: last.w, trace: last.res.trace, events: last.res.events, kinks: true }); drawTimeline("s5tl", last.res, null, { queue: true }); } else { view.render({ w: WP.testStreet(0), showAll: true }); drawTimeline("s5tl", { trace: [], events: [] }, null, { T: 1 }); } drawSweep(); });
  }

  /* ================= STEPS 6 & 7: a street drive with seams ================= */
  function seamDrive(prefix, mode, o, view, state) {
    if (state.running) state.running.stop();
    busy([prefix + "go", prefix + "next"], true);
    warm(function () {
      var k = state.street, w = WP.testStreet(k), res = WP.execute(w, chunkNb(), { mode: mode(), delay: o.d, s: 25, seed: 50 + k, record: true }), sc = WP.score(w, res.trace);
      state.last = { w: w, res: res };
      state.running = play(view, w, res, { events: res.events, kinks: true, label: "street " + (k + 1) + " · " + (mode() === "rtc" ? "tracing paper" : "switch on arrival") + " · d = " + o.d }, function (kk) {
        var p = res.trace[kk], kinks = 0; for (var i = 1; i <= kk; i++) if (!res.trace[i].stopped && !res.trace[i - 1].stopped && Math.abs(res.trace[i].om - res.trace[i - 1].om) > WP.KINK) kinks++;
        hudSet(prefix + "t", fmt(p.tick * WP.DT, 1) + " s"); hudSet(prefix + "k", kinks);
        hudSet(prefix + "f", WP.flips(w, res.trace.slice(0, kk + 1)));
      }, function () {
        state.running = null; busy([prefix + "go", prefix + "next"], false);
        hudSet(prefix + "c2", sc.cement ? fmt(sc.cementM, 2) + " m" : "no", sc.cement ? "bad" : "good");
        $(prefix + "st").innerHTML = "Street " + (k + 1) + ": went round on the <b>" + (sc.side < 0 ? "left" : "right") + "</b> · " + sc.flips + " side flip" + (sc.flips === 1 ? "" : "s") + " · " + sc.kinks + " kink" + (sc.kinks === 1 ? "" : "s") + (sc.cement ? " · <b>tracks in the cement</b>" : "") + ". ▲ marks where each new order took over.";
        touch(prefix.replace("#", ""));
      });
    });
  }
  function initS6() {
    var view = StreetView("s6c"), o = { d: 25 }, state = { street: 1, running: null, last: null }, rows = {};
    $("s6d").addEventListener("input", function () { o.d = +this.value; $("s6dv").textContent = ms(o.d); });
    $("s6dv").textContent = ms(o.d);
    $("s6go").onclick = function () { seamDrive("s6", function () { return "naive"; }, o, view, state); };
    $("s6next").onclick = function () { state.street = (state.street + 1) % N2; seamDrive("s6", function () { return "naive"; }, o, view, state); };
    $("s6fleet").onclick = function () {
      busy(["s6fleet"], true); var ds = [5, 10, 15, 20, 25], i = 0;
      warm(function next() {
        if (i >= ds.length) { busy(["s6fleet"], false); render(); $("s6st").textContent = "40 streets at each delay, the same streets and seeds as every other step."; touch("s6"); return; }
        fleet({ mode: "naive", delay: ds[i], s: 25 }, N2, null, function (a) { rows[ds[i]] = a; i++; render(); setTimeout(next, 0); }, function (k, n) { $("s6st").textContent = "d = " + ds[i] + ": street " + k + " of " + n + "…"; });
      });
    };
    function render() {
      var ds = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
      $("s6tab").innerHTML = "<tr><th>d</th><th>kinks / street</th><th>streets with a side flip</th><th>streets in the cement</th><th>off the line</th></tr>" + ds.map(function (d) { var a = rows[d]; return "<tr><td>" + d + " (" + d * 20 + " ms)</td><td>" + fmt(a.kinks, 1) + '</td><td class="n" style="color:' + (a.flipRuns ? COL.bad : COL.grassD) + '">' + a.flipRuns + " / 40</td><td>" + a.cementRuns + " / 40</td><td>" + fmt(a.offM, 2) + " m</td></tr>"; }).join("");
    }
    view.render({ w: WP.testStreet(1), showAll: true });
    redraws.push(function () { if (!onStep("s6") || state.running) return; if (state.last) view.render({ w: state.last.w, trace: state.last.res.trace, events: state.last.res.events, kinks: true }); else view.render({ w: WP.testStreet(1), showAll: true }); });
  }
  function initS7() {
    var view = StreetView("s7c"), o = { d: 25, how: "rtc" }, m = { d: 10, s: 25 }, state = { street: 1, running: null, last: null }, rows = {};
    function drawMask() {
      var d = m.d, s = Math.min(WP.H - d, Math.max(m.s, d)), W = WP.rtcMask(d, s, WP.H), c = prep($("s7mask")), g = c.g, Wd = c.W, H = c.H, pad = { l: 40, r: 10, t: 14, b: 30 }, bw = (Wd - pad.l - pad.r) / WP.H;
      g.fillStyle = COL.sheet; g.fillRect(0, 0, Wd, H);
      var Y = function (v) { return H - pad.b - v * (H - pad.t - pad.b); };
      g.strokeStyle = COL.rule; g.fillStyle = COL.soft; g.font = "12px " + HAND; g.textAlign = "right";
      [0, 0.5, 1].forEach(function (v) { g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(Wd - pad.r, Y(v)); g.stroke(); g.fillText(fmt(v, 1), pad.l - 5, Y(v) + 4); });
      for (var i = 0; i < WP.H; i++) {
        var x = pad.l + i * bw, v = W[i];
        g.fillStyle = i < d ? COL.bad : i < WP.H - s ? COL.paint : COL.rule;
        g.fillRect(x + 1, Y(Math.max(v, 0.02)), bw - 2, H - pad.b - Y(Math.max(v, 0.02)));
        g.strokeStyle = COL.line; g.lineWidth = 1; g.strokeRect(x + 1, Y(Math.max(v, 0.02)), bw - 2, H - pad.b - Y(Math.max(v, 0.02)));
      }
      g.fillStyle = COL.soft; g.textAlign = "center"; [0, 10, 20, 30, 40, 49].forEach(function (i) { g.fillText(String(i), pad.l + (i + 0.5) * bw, H - pad.b + 14); });
      g.fillText("waypoint index i in the new order", (pad.l + Wd) / 2, H - 3);
      var c1 = d < WP.H - s ? (WP.H - s - d) / (WP.H - s - d + 1) : null;
      $("s7mc").innerHTML = '<span class="sw" style="background:#A5321F"></span>frozen, i &lt; d = ' + d + ': driven from the old order before the new one lands · <span class="sw" style="background:#F4C430"></span>soft, ' + d + " ≤ i &lt; H − s = " + (WP.H - s) + ": pulled towards the old order, " + (c1 != null ? "W_" + d + " = " + fmt(W[d], 2) + " decaying to 0" : "empty at this d and s") + ' · <span class="sw" style="background:#E7DCC4"></span>free, i ≥ ' + (WP.H - s) + ": beyond the old order's 50, the new order's own" + (m.s < d ? " · s raised to d, as RTC does (s = max(d, s_min))" : m.s > WP.H - d ? " · s capped at H − d = " + (WP.H - d) + " (RTC: d ≤ s ≤ H − d)" : "");
    }
    $("s7d").addEventListener("input", function () { m.d = +this.value; $("s7dv").textContent = m.d; drawMask(); touch("s7"); });
    $("s7s").addEventListener("input", function () { m.s = +this.value; $("s7sv").textContent = m.s; drawMask(); });
    $("s7dd").addEventListener("input", function () { o.d = +this.value; $("s7ddv").textContent = ms(o.d); });
    $("s7ddv").textContent = ms(o.d);
    seg($("s7how"), [{ v: "rtc", label: "tracing paper (RTC)" }, { v: "naive", label: "switch on arrival" }], o.how, function (v) { o.how = v; });
    var mode = function () { return o.how; };
    $("s7go").onclick = function () { seamDrive("s7", mode, o, view, state); };
    $("s7next").onclick = function () { state.street = (state.street + 1) % N2; seamDrive("s7", mode, o, view, state); };
    $("s7fleet").onclick = function () {
      busy(["s7fleet"], true); var jobs = []; [5, 10, 15, 20, 25].forEach(function (d) { jobs.push(["naive", d]); jobs.push(["rtc", d]); }); var i = 0;
      warm(function next() {
        if (i >= jobs.length) { busy(["s7fleet"], false); render(); $("s7st").textContent = "40 streets for each way and each delay, same streets and seeds."; touch("s7"); return; }
        var j = jobs[i];
        fleet({ mode: j[0], delay: j[1], s: 25 }, N2, null, function (a) { rows[j[0] + j[1]] = a; i++; render(); setTimeout(next, 0); }, function (k, n) { $("s7st").textContent = (j[0] === "rtc" ? "tracing paper" : "switch on arrival") + ", d = " + j[1] + ": street " + k + " of " + n + "…"; });
      });
    };
    function render() {
      var ds = [5, 10, 15, 20, 25].filter(function (d) { return rows["naive" + d] || rows["rtc" + d]; });
      var cell = function (a, f) { return a ? f(a) : "…"; };
      $("s7tab").innerHTML = "<tr><th>d</th><th>flips: switch / trace</th><th>cement: switch / trace</th><th>kinks: switch / trace</th><th>off the line: switch / trace</th></tr>" + ds.map(function (d) {
        var n = rows["naive" + d], r = rows["rtc" + d];
        return "<tr><td>" + d + " (" + d * 20 + " ms)</td><td>" + cell(n, function (a) { return a.flipRuns; }) + ' / <b style="color:' + COL.grassD + '">' + cell(r, function (a) { return a.flipRuns; }) + "</b></td><td>" + cell(n, function (a) { return a.cementRuns; }) + ' / <b style="color:' + COL.grassD + '">' + cell(r, function (a) { return a.cementRuns; }) + "</b></td><td>" + cell(n, function (a) { return fmt(a.kinks, 1); }) + " / <b>" + cell(r, function (a) { return fmt(a.kinks, 1); }) + "</b></td><td>" + cell(n, function (a) { return fmt(a.offM, 2); }) + " / <b>" + cell(r, function (a) { return fmt(a.offM, 2) + " m"; }) + "</b></td></tr>";
      }).join("");
    }
    var BLIND = [["stop and think, s = 10", { mode: "sync", s: 10 }], ["stop and think, s = 25", { mode: "sync", s: 25 }], ["switch on arrival, s = 25", { mode: "naive", s: 25 }], ["order ahead, g = 0.5", { mode: "async", g: 0.5 }], ["the committee (ACT)", { mode: "ensemble" }], ["tracing paper, s = 25", { mode: "rtc", s: 25 }], ["tracing paper, s = 10", { mode: "rtc", s: 10 }]];
    $("s7blind").onclick = function () {
      busy(["s7blind"], true); var out = [], i = 0;
      warm(function next() {
        if (i >= BLIND.length) { busy(["s7blind"], false); touch("s7"); return; }
        fleet(Object.assign({ delay: 10 }, BLIND[i][1]), N2, WP.CEMENT.x - 1.6, function (a) {
          out.push({ name: BLIND[i][0], med: a.blind[Math.floor(a.blind.length / 2)], max: a.blind[a.blind.length - 1], stop: a.stopS, cem: a.cementRuns }); i++;
          $("s7btab").innerHTML = "<tr><th>how it drives</th><th>blind, median</th><th>blind, worst</th><th>stopped per street</th><th>cement</th></tr>" + out.map(function (r) { return "<tr><td>" + r.name + '</td><td class="n">' + fmt(r.med, 2) + " m</td><td>" + fmt(r.max, 2) + " m</td><td>" + fmt(r.stop, 1) + " s</td><td>" + r.cem + " / 40</td></tr>"; }).join("");
          setTimeout(next, 0);
        });
      });
    };
    drawMask(); view.render({ w: WP.testStreet(1), showAll: true });
    redraws.push(function () { if (!onStep("s7")) return; drawMask(); if (state.running) return; if (state.last) view.render({ w: state.last.w, trace: state.last.res.trace, events: state.last.res.events, kinks: true }); else view.render({ w: WP.testStreet(1), showAll: true }); });
  }

  /* ================= REVIEW BOARD ================= */
  function wanderFleet(nb) { var off = 0; for (var k = 0; k < 12; k++) { var w = WP.world({ street: 500 + k, len: 16, potholes: WP.potholes(900 + k, 0.08, 0.2, 16) }); off += WP.score(w, bcRun(w, nb), 0).offM / 12; } return off; }
  var CASES = [
    { id: "c1", title: "Case 1 · the puddler", brief: "<b>The complaint:</b> the striper leaves a puddle of paint every few metres and takes for ever. Its configuration: a 300 ms brain (d = 15 ticks), stop and think, drive 10 waypoints per order.",
      broken: { kind: "chunk", cfg: { mode: "sync", delay: 15, s: 10 } },
      fixes: [
        { label: "Shorter orders, s = 5, so each stop is over sooner", run: { kind: "chunk", cfg: { mode: "sync", delay: 15, s: 5 } }, why: "Each stop is the same 15 ticks; there are twice as many of them." },
        { label: "Order ahead: asynchronous inference with g = 0.5", run: { kind: "chunk", cfg: { mode: "async", delay: 15, g: 0.5 } }, right: true, why: "g = 0.5 ≥ d/50 = 0.3: the next order always lands before the queue is empty." },
        { label: "A twice-as-fast steering servo", run: { kind: "chunk", cfg: { mode: "sync", delay: 15, s: 10 } }, why: "The same run: the servo isn't what's slow. The striper is standing still, not steering." }
      ],
      causes: [{ label: "Thinking while stopped: idle share d/(d + s) = 60%", right: true }, { label: "The orders are too long" }, { label: "The demonstrations were too slow" }],
      checks: [{ label: "under 18 s per street", test: function (f) { return f.timeS < 18; }, why: function (f) { return fmt(f.timeS, 1) + " s per street"; } }, { label: "under 1 s stopped per street", test: function (f) { return f.stopS < 1; }, why: function (f) { return fmt(f.stopS, 1) + " s stopped, " + fmt(f.blobs, 1) + " blobs"; } }] },
    { id: "c2", title: "Case 2 · the zigzagger", brief: "<b>The complaint:</b> at the wet cement the striper swerves one way, then the other, and some mornings there are tyre tracks in the cement. Its configuration: a 500 ms brain (d = 25), keeps rolling, and switches to each new order the moment it lands.",
      broken: { kind: "chunk", cfg: { mode: "naive", delay: 25, s: 25 } },
      fixes: [
        { label: "Ask for orders as often as possible: async, g = 1", run: { kind: "chunk", cfg: { mode: "async", delay: 25, g: 1 } }, why: "Every fresh order is another sample that can pick the other side." },
        { label: "Average all overlapping orders (ACT's temporal ensembling)", run: { kind: "chunk", cfg: { mode: "ensemble", delay: 25 } }, why: "Left and right, averaged, is straight ahead." },
        { label: "Tracing paper: Real-Time Chunking", run: { kind: "chunk", cfg: { mode: "rtc", delay: 25, s: 25 } }, right: true, why: "The frozen waypoints carry the committed side into the new order." }
      ],
      causes: [{ label: "Each new order was drafted without knowing which waypoints would run before it landed, so at the fork it can be the other side", right: true }, { label: "The orders are too short" }, { label: "Too few demonstrations of the cement" }],
      checks: [{ label: "at most 2 of 20 streets with a side flip", test: function (f) { return f.flipRuns <= 2; }, why: function (f) { return f.flipRuns + " of 20 flipped"; } }, { label: "at most 2 of 20 in the cement", test: function (f) { return f.cementRuns <= 2; }, why: function (f) { return f.cementRuns + " of 20 in the cement"; } }] },
    { id: "c3", title: "Case 3 · the wanderer", brief: "<b>The complaint:</b> after a pothole the line drifts towards the kerb and stays off for metres. The striper was taught by behaviour cloning on the master's 20 runs.",
      broken: { kind: "bc", nb: function () { return NB; } },
      fixes: [
        { label: "Twenty more runs from the master", run: { kind: "bc", nb: function () { return WP.notebook(WP.streetLog(40)); } }, why: "More pages of being on the line." },
        { label: "Three rounds of the master riding along (DAgger)", run: { kind: "bc", nb: function () { return WP.dagger(LOG, PRACTICE, 3, {}).nb; } }, right: true, why: "Pages for the states the apprentice actually reaches." },
        { label: "Ask the master to paint even more carefully, with no wobble at all", run: { kind: "bc", nb: function () { var rows = []; for (var i = 0; i < 20; i++) rows = rows.concat(WP.demo(WP.world({ street: 100 + i }), 1000 + i, 0, 0)); return WP.notebook(rows); } }, why: "A perfect master shows even fewer recoveries." }
      ],
      causes: [{ label: "The notebook has no pages for being off the line, so mistakes compound", right: true }, { label: "Too few demonstrations" }, { label: "The potholes are too deep for any policy" }],
      checks: [{ label: "under 0.5 m off the line per 16 m street (12 pothole streets)", test: function (f) { return f.offM < 0.5; }, why: function (f) { return fmt(f.offM, 2) + " m off the line per street"; } }] }
  ];
  function runCase(spec, cb) {
    if (spec.kind === "bc") { setTimeout(function () { cb({ offM: wanderFleet(spec.nb()) }); }, 20); return; }
    warm(function () { fleet(spec.cfg, 20, null, cb); });
  }
  function initCap() {
    var host = $("capcases");
    host.innerHTML = CASES.map(function (c) {
      return '<div class="card" style="margin-top:14px"><h3>' + c.title + '</h3><div class="brief">' + c.brief + '</div>' +
        '<div class="btnrow"><button class="ghost" id="' + c.id + 'run">Run it as configured</button><span class="verdict" id="' + c.id + 'v"></span></div>' +
        '<div class="lbl">The fix</div><div class="reason">' + c.fixes.map(function (f, i) { return '<label><input type="radio" name="' + c.id + 'fix" value="' + i + '"><span>' + esc(f.label) + "</span></label>"; }).join("") + "</div>" +
        '<div class="lbl">The cause</div><div class="reason">' + c.causes.map(function (f, i) { return '<label><input type="radio" name="' + c.id + 'cause" value="' + i + '"><span>' + esc(f.label) + "</span></label>"; }).join("") + "</div>" +
        '<div class="btnrow"><button class="act" id="' + c.id + 'go">Re-run with the fix</button></div><div class="checks" id="' + c.id + 'ch"></div></div>';
    }).join("");
    function describe(f) { return f.timeS != null ? fmt(f.timeS, 1) + " s per street · " + fmt(f.stopS, 1) + " s stopped · side flips on " + f.flipRuns + " of 20 · cement on " + f.cementRuns + " of 20" : fmt(f.offM, 2) + " m off the line per street"; }
    function grade() { var n = CASES.filter(function (c) { return store.cap[c.id]; }).length; $("capstars").textContent = "★".repeat(n) + "☆".repeat(3 - n); $("capverdict").innerHTML = n === 3 ? "<b>Three for three.</b> You can sign off a striper." : n ? "<b>" + n + " of 3</b> fixed and explained." : ""; if (n === 3 && !store.said.cap) { store.said.cap = true; save(); buildNav(); markNav(); } }
    CASES.forEach(function (c) {
      $(c.id + "run").onclick = function () { $(c.id + "v").textContent = "running…"; runCase(c.broken, function (f) { $(c.id + "v").innerHTML = "as configured: " + describe(f); }); };
      $(c.id + "go").onclick = function () {
        var fi = document.querySelector('input[name="' + c.id + 'fix"]:checked'), ci = document.querySelector('input[name="' + c.id + 'cause"]:checked');
        if (!fi || !ci) { $(c.id + "ch").innerHTML = '<div class="callout co-w">Pick a fix and a cause first.</div>'; return; }
        var fix = c.fixes[+fi.value], cause = c.causes[+ci.value];
        $(c.id + "ch").innerHTML = '<div class="status">re-running…</div>';
        runCase(fix.run, function (f) {
          var rows = c.checks.map(function (k) { return { ok: k.test(f), label: k.label, why: k.why(f) }; });
          rows.push({ ok: !!cause.right, label: "the cause is named", why: cause.right ? "yes" : "that's not what the re-run shows" });
          var pass = rows.every(function (r) { return r.ok; });
          $(c.id + "ch").innerHTML = rows.map(function (r) { return '<div class="check ' + (r.ok ? "ok" : "no") + '"><span class="ic">' + (r.ok ? "✓" : "✗") + '</span><div>' + r.label + '<div class="why">' + r.why + "</div></div></div>"; }).join("") +
            '<div class="callout ' + (pass ? "co-g" : "co-r") + '"><b>' + (pass ? "Fixed." : "Not fixed.") + "</b> " + esc(fix.why) + "</div>";
          store.cap[c.id] = store.cap[c.id] || pass; save(); grade();
        });
      };
    });
    grade();
  }

  /* ================= FIELD TEST ================= */
  var FT = [
    { q: "After the pothole at 4 m, how many metres of the apprentice's line are more than 5 cm off?", hint: "step 0, metres", ans: 3.8, tol: 0.1 },
    { q: "How many cells of the notebook map hold a page from the master's 20 runs?", hint: "step 1", ans: 15, tol: 0 },
    { q: "Twelve 32 m streets: the apprentice's mean off-line metres?", hint: "step 1, metres", ans: 12.12, tol: 0.3 },
    { q: "After one round of riding along, the furthest the apprentice gets from the line on the pothole street, in cm?", hint: "step 2", ans: 3.1, tol: 0.2 },
    { q: "Stop and think with d = 20 and s = 25: what percent of the time is the striper idle, by the formula?", hint: "step 3, %", ans: 44.4, tol: 0.5 },
    { q: "The committee at d = 25, m = 0.01: how many of the 40 streets end with tracks in the cement?", hint: "step 4", ans: 21, tol: 1 },
    { q: "Think time 20 ticks: the smallest g at which the queue never runs dry?", hint: "step 5", ans: 0.4, tol: 0.001 },
    { q: "d = 10, g = 0.5: how many percent faster than stop-and-think with s = 25, over 40 streets?", hint: "step 5, 40 streets", ans: 28, tol: 2 },
    { q: "Switch on arrival at d = 25: how many of the 40 streets flip sides?", hint: "step 6", ans: 26, tol: 1 },
    { q: "RTC's soft mask with d = 10, s = 25: the weight W at i = 10?", hint: "step 7, two decimals", ans: 0.85, tol: 0.01 }
  ];
  function initFT() {
    $("ftqs").innerHTML = FT.map(function (f, i) { return '<div class="fq"><div class="fqt"><b>' + (i + 1) + ".</b> " + f.q + ' <span class="muted">(' + f.hint + ')</span></div><div class="row"><input type="number" id="ft' + i + '" step="any" value="' + (store.ft[i] != null ? esc(store.ft[i]) : "") + '" aria-label="Answer ' + (i + 1) + '"><span class="res" id="ftr' + i + '"></span></div></div>'; }).join("");
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) { var raw = $("ft" + i).value, v = parseFloat(raw), ok = raw !== "" && !isNaN(v) && Math.abs(v - f.ans) <= f.tol + 1e-9; store.ft[i] = raw; if (ok) score++; $("ftr" + i).innerHTML = ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'; });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can read the RTC paper." : "");
      if (score >= 8 && !store.said.ft) { store.said.ft = true; save(); buildNav(); markNav(); }
    };
    $("reset").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} history.replaceState(null, "", location.pathname); location.reload(); };
  }

  /* ---------------- art & boot ---------------- */
  function renderArt() { qa(".scene[data-art]").forEach(function (el) { var svg = ART[el.dataset.art]; if (svg && !el.firstChild) el.innerHTML = svg; }); }
  function buildNext() {
    sections.forEach(function (s, i) {
      var n = sections[i + 1]; if (!n) return;
      var row = document.createElement("div"); row.className = "nextrow";
      var b = document.createElement("button"); b.type = "button"; b.className = "act"; b.textContent = "Next: " + n.dataset.n + " · " + n.dataset.title + " →";
      b.onclick = function () { show(n.id); };
      row.appendChild(b); s.appendChild(row);
    });
  }
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  renderArt();
  qa(".kmap .k[data-i]").forEach(function (el) { el.innerHTML = IC[el.dataset.i] || ""; });
  qa(".mast .mi").forEach(function (el) { el.innerHTML = IC.striper || ""; });
  buildNav(); buildNext();
  function hashId() { var m = /^#\/?(s[0-7]|cap|ft)$/.exec(location.hash || ""); return m ? m[1] : null; }
  window.addEventListener("hashchange", function () { var id = hashId(); if (id && !$(id).classList.contains("on")) show(id); });
  initS0(); initS1(); initS2(); initS3(); initS4(); initS5(); initS6(); initS7(); initCap(); initFT();
  initTips(document); initPredicts();
  sections.forEach(function (s) { checkSay(s.id); });
  show(hashId() || "s0");
  window.addEventListener("load", function () { setTimeout(function () { window.scrollTo(0, 0); redrawAll(); }, 0); });
  var rt = null; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(redrawAll, 80); });
  window.WPApp = { show: show, store: function () { return store; } };
})();
