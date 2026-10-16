/* Inside a VLA — UI. Every number shown is computed by window.VLA (core.js) from the published shapes; nothing is
   hard-coded except the paper figures quoted in the prose and the comparison table's "in the papers" rows. */
(function () {
  "use strict";
  var V = window.VLA, GL = window.VLA_GLOSSARY, IC = window.VLA_ICONS || {}, ART = window.VLA_ART || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- formatting ---------------- */
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function pct(p, d) { return fmt(p * 100, d == null ? 0 : d) + "%"; }
  function gf(f) { return f >= 1e12 ? fmt(f / 1e12, 2) + " TFLOP" : fmt(f / 1e9, f >= 100e9 ? 0 : 1) + " GFLOP"; }
  function gfn(f) { return fmt(f / 1e9, f >= 100e9 ? 0 : 1); }
  function mp(p) { return p >= 1e9 ? fmt(p / 1e9, 2) + "B" : fmt(p / 1e6, 0) + "M"; }
  function ms(s) { var m = s * 1000; return m >= 100 ? fmt(m, 0) + " ms" : m >= 10 ? fmt(m, 1) + " ms" : fmt(m, 2) + " ms"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  // SmolVLA's async threshold g, or the plain fact that none works once the chunk is shorter than the wait.
  function gText(g) { return g > 1 ? fmt(g, 2) + ": above 1, so no threshold works" : fmt(g, 2); }

  /* ---------------- progress ---------------- */
  var KEY = "inside-a-vla-v1";
  var store = { predicts: {}, touched: {}, said: {}, ft: {}, chal: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved) store = Object.assign(store, saved); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* ---------------- colours (match css tokens) ---------------- */
  var COL = { photo: "#246A9C", conn: "#9CCBEA", staff: "#5E4A94", meet: "#B8A3DC", expert: "#E2701C", expertD: "#A84E0F", word: "#F4C430", st: "#5FA03C",
    ink: "#3A2418", line: "#4A2E1E", soft: "#6E5040", sheet: "#FFFDF6", paper: "#FBF7EC", rule: "#E7DCC4", grass: "#5FA03C", grassD: "#3B7422", bad: "#A5321F", yellowD: "#8A6300", cream: "#FFF6DC", sky: "#9CCBEA" };
  var HAND = "'Patrick Hand', 'Comic Sans MS', sans-serif", SIGN = "'Grandstander', 'Patrick Hand', sans-serif";

  /* ---------------- nav ---------------- */
  var NAV_ICON = { s0: "card", s1: "tower", s2: "skip", s3: "drafting", s4: "clock", s5: "compare", ft: "pencil" };
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
  function redrawAll() { redraws.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error(e); } }); }

  /* ---------------- predictions & say-it ---------------- */
  function touch(sec) { store.touched[sec] = (store.touched[sec] || 0) + 1; save(); checkSay(sec); }
  function checkSay(sec) {
    var el = $(sec); if (!el) return;
    var say = el.querySelector(".say"); if (!say) return;
    var preds = qa(".predict", el);
    var allAnswered = preds.every(function (p) { return store.predicts[p.dataset.p] != null; });
    var played = (store.touched[sec] || 0) > 0;
    if (allAnswered && played) {
      say.classList.add("open");
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
  var tipFor = null, pinned = null;
  function bindTip(el) {
    var g = GL[el.dataset.g]; if (!g) return;
    el.setAttribute("tabindex", "0"); el.setAttribute("role", "button");
    var tip = $("tip");
    function place() {
      tipFor = el;
      tip.innerHTML = "<b>" + g[0] + "</b> " + g[1] + '<span class="kt">In the office: ' + g[2] + "</span>";
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), tw = Math.min(320, window.innerWidth - 24);
      tip.style.width = tw + "px";
      var left = Math.max(12, Math.min(window.innerWidth - tw - 12, r.left + r.width / 2 - tw / 2));
      var top = r.bottom + 8; if (top + tip.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - tip.offsetHeight - 8);
      tip.style.left = left + "px"; tip.style.top = top + "px";
    }
    function hide() { tip.style.display = "none"; if (tipFor === el) tipFor = null; if (pinned === el) pinned = null; }
    el.addEventListener("mouseenter", place); el.addEventListener("focus", function () { pinned = null; place(); });
    el.addEventListener("mouseleave", function () { if (pinned !== el) hide(); });
    el.addEventListener("blur", hide);
    el.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (pinned === el) hide(); else { pinned = el; place(); } });
    el.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  }
  function initTips(root) { qa(".g", root).forEach(bindTip); }
  document.addEventListener("click", function () { $("tip").style.display = "none"; pinned = null; tipFor = null; });
  window.addEventListener("scroll", function () { if (tipFor && document.activeElement === tipFor) { tipFor.dispatchEvent(new Event("focus")); return; } $("tip").style.display = "none"; tipFor = null; pinned = null; }, { passive: true });

  /* ---------------- small widgets ---------------- */
  // A row of segmented buttons. Returns { value, set(v) }.
  function seg(el, opts, val, onChange) {
    el.innerHTML = "";
    var state = { value: val, set: function (v) { state.value = v; qa("button", el).forEach(function (x, i) { x.classList.toggle("on", opts[i].v === v); }); } };
    opts.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.innerHTML = o.label;
      if (o.v === val) b.classList.add("on");
      b.onclick = function () { state.set(o.v); onChange(o.v); };
      el.appendChild(b);
    });
    return state;
  }
  function slider(id, onChange, label) {
    var el = $(id), out = $(id + "v");
    function upd() { if (out) out.textContent = label ? label(+el.value) : el.value; }
    el.addEventListener("input", function () { upd(); onChange(+el.value); });
    upd();
    return { get: function () { return +el.value; }, set: function (v) { el.value = v; upd(); }, el: el };
  }
  var MODEL_OPTS = [{ v: "smolvla", label: "SmolVLA" }, { v: "pi0", label: "π0" }];
  var R_OPTS = [{ v: 1, label: "1 (off)" }, { v: 2, label: "2" }, { v: 4, label: "4" }];
  var HW_OPTS = [{ v: "gpu", label: "desktop GPU" }, { v: "edge", label: "edge board" }, { v: "laptop", label: "laptop CPU" }];
  var RATE_OPTS = [{ v: 30, label: "30 fps" }, { v: 50, label: "50 Hz" }];

  /* ---------------- canvas basics ---------------- */
  function prep(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 600, h = cv.clientHeight || Math.round(w / 3);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    return { g: g, W: w, H: h };
  }
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function text(g, s, x, y, o) {
    o = o || {}; g.font = (o.bold ? "700 " : "400 ") + (o.size || 14) + "px " + (o.sign ? SIGN : HAND);
    g.fillStyle = o.col || COL.ink; g.textAlign = o.align || "left"; g.textBaseline = o.base || "alphabetic"; g.fillText(s, x, y);
  }
  // A hand-lettered chart label on a small paper tag, so it reads over lines and fills.
  function tag(g, s, x, y, o) {
    o = o || {}; var z = o.size || 13;
    g.font = (o.bold ? "700 " : "400 ") + z + "px " + (o.sign ? SIGN : HAND);
    var w = g.measureText(s).width, al = o.align || "left", x0 = al === "right" ? x - w : al === "center" ? x - w / 2 : x;
    g.fillStyle = o.plate || "rgba(255,253,246,.92)"; rr(g, x0 - 5, y - z * 0.85 - 3, w + 10, z + 8, 4); g.fill();
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = 1.2; g.stroke(); }
    text(g, s, x, y, o);
  }
  function hatch(g, x, y, w, h) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = "rgba(255,253,246,.75)"; g.lineWidth = 1.6;
    for (var k = -h; k < w; k += 7) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); }
    g.restore();
  }
  // A horizontal stacked bar of labelled parts; parts = [{v, col, name}], scale = value at full width.
  function stackBar(g, x, y, w, h, parts, scale, o) {
    o = o || {}; var cx = x;
    parts.forEach(function (p) {
      var pw = Math.max(0, p.v / scale * w); if (pw <= 0) return;
      g.fillStyle = p.col; g.fillRect(cx, y, pw, h);
      if (p.hatch) hatch(g, cx, y, pw, h);
      g.strokeStyle = COL.line; g.lineWidth = 1.5; g.strokeRect(cx, y, pw, h);
      if (p.name && pw > (o.small ? 34 : 54)) text(g, p.name, cx + pw / 2, y + h / 2 + 1, { align: "center", base: "middle", size: o.small ? 12 : 14, col: p.dark ? COL.ink : COL.sheet, bold: true, sign: !o.small });
      cx += pw;
    });
    return cx;
  }
  function axisTicks(max) { var raw = max / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).filter(function (k) { return k >= raw; })[0]; var out = []; for (var v = 0; v <= max + 1e-9; v += st) out.push(v); return out; }
  function axisTicksUp(max) { var t = axisTicks(max), st = t[1] - t[0]; if (t[t.length - 1] < max - 1e-9) t.push(t[t.length - 1] + st); return t; }

  /* ================= STEP 0: the mailroom ================= */
  // A procedural camera frame: a wall, a table, a red cube, a cardboard box and the gripper coming in from above.
  function drawPhoto(g, x, y, s, cam) {
    g.save(); g.beginPath(); g.rect(x, y, s, s); g.clip();
    g.fillStyle = cam === 1 ? "#D7E9F3" : cam === 2 ? "#E8E2F2" : "#F3E9D6"; g.fillRect(x, y, s, s);
    g.fillStyle = "#C9A774"; g.fillRect(x, y + s * 0.55, s, s * 0.45);
    g.strokeStyle = COL.line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + s * 0.55); g.lineTo(x + s, y + s * 0.55); g.stroke();
    var bx = x + s * (cam === 2 ? 0.12 : 0.58), by = y + s * 0.5;
    g.fillStyle = "#B8793F"; g.fillRect(bx, by, s * 0.3, s * 0.22); g.strokeRect(bx, by, s * 0.3, s * 0.22);
    g.fillStyle = "#9A6331"; g.fillRect(bx, by, s * 0.3, s * 0.05);
    var cx = x + s * (cam === 2 ? 0.62 : 0.28), cy = y + s * 0.6;
    g.fillStyle = "#C8452F"; g.fillRect(cx, cy, s * 0.11, s * 0.11); g.strokeRect(cx, cy, s * 0.11, s * 0.11);
    g.fillStyle = "#B9BDC2"; g.fillRect(x + s * 0.4, y, s * 0.08, s * 0.3); g.strokeRect(x + s * 0.4, y, s * 0.08, s * 0.3);
    g.fillRect(x + s * 0.34, y + s * 0.3, s * 0.2, s * 0.06); g.strokeRect(x + s * 0.34, y + s * 0.3, s * 0.2, s * 0.06);
    g.fillRect(x + s * 0.34, y + s * 0.36, s * 0.04, s * 0.09); g.strokeRect(x + s * 0.34, y + s * 0.36, s * 0.04, s * 0.09);
    g.fillRect(x + s * 0.5, y + s * 0.36, s * 0.04, s * 0.09); g.strokeRect(x + s * 0.5, y + s * 0.36, s * 0.04, s * 0.09);
    g.restore();
  }
  function initS0() {
    var model = "smolvla", r = 4, cams = 3;
    function cfg() { var c = V.preset(model); c.r = r; c.cams = cams; return c; }
    var mSeg = seg($("s0m"), MODEL_OPTS, model, function (v) { model = v; r = V.preset(v).r; rSeg.set(r); touch("s0"); draw(); });
    var rSeg = seg($("s0r"), R_OPTS, r, function (v) { r = v; touch("s0"); draw(); });
    slider("s0cam", function (v) { cams = v; touch("s0"); draw(); });
    function draw() {
      var c = cfg(), e = V.EYES[c.eyes], pf = V.prefix(c);
      $("s0p").textContent = fmt(pf.patches); $("s0f").textContent = fmt(pf.perFrame); $("s0i").textContent = fmt(pf.img); $("s0T").textContent = fmt(pf.T);
      var gside = e.img / e.patch;
      $("s0math").innerHTML = '<div class="eq">(' + e.img + " ÷ " + e.patch + ")² = " + fmt(pf.patches) + " tiles ÷ " + r + "² = " + fmt(pf.perFrame) + " cards × " + cams + " camera" + (cams > 1 ? "s" : "") + " = " + fmt(pf.img) + "</div>" +
        '<div class="eqn">+ <b>' + pf.lang + "</b> word cards" + (pf.state ? " + <b>1</b> joint card" : " (π0's joint card goes to the drafting room)") + " = <b>" + fmt(pf.T) + "</b> cards up the tower · a frame is " + gside + " × " + gside + " tiles, " + (gside / r) + " × " + (gside / r) + " cards</div>";
      var P = prep($("s0c")), g = P.g, W = P.W, H = P.H, small = W < 560;
      var fs = Math.min(H - 34, small ? W * 0.44 : W * 0.34), fx = 8, fy = 24;
      text(g, "camera 1, cut into tiles", fx, 16, { size: 14, col: COL.soft });
      drawPhoto(g, fx, fy, fs, 1);
      var t = fs / gside;
      g.strokeStyle = "rgba(74,46,30,.35)"; g.lineWidth = 0.6;
      for (var i = 1; i < gside; i++) { g.beginPath(); g.moveTo(fx + i * t, fy); g.lineTo(fx + i * t, fy + fs); g.moveTo(fx, fy + i * t); g.lineTo(fx + fs, fy + i * t); g.stroke(); }
      if (r > 1) { g.strokeStyle = COL.photo; g.lineWidth = 1.6; for (i = 0; i <= gside; i += r) { g.beginPath(); g.moveTo(fx + i * t, fy); g.lineTo(fx + i * t, fy + fs); g.moveTo(fx, fy + i * t); g.lineTo(fx + fs, fy + i * t); g.stroke(); } }
      g.strokeStyle = COL.line; g.lineWidth = 2; g.strokeRect(fx, fy, fs, fs);
      // one bundle, picked out, and its card
      var bi = Math.floor(gside / r * 0.3) * r, bj = Math.floor(gside / r * 0.62) * r;
      g.strokeStyle = COL.bad; g.lineWidth = 2.5; g.strokeRect(fx + bi * t, fy + bj * t, r * t, r * t);
      var sx = fx + fs + (small ? 16 : 34), sw = W - sx - 8;
      g.strokeStyle = COL.bad; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fx + (bi + r) * t, fy + (bj + r / 2) * t); g.lineTo(sx - 4, fy + 18); g.stroke();
      text(g, (r > 1 ? r + " × " + r + " tiles → 1 card" : "1 tile → 1 card"), sx, 16, { size: 14, col: COL.bad });
      // blocks: one square block of cards per camera, the words (8 wide), the joint card; flowed into rows at the largest card size that fits
      var side = gside / r, blocks = [];
      for (var k = 0; k < cams; k++) blocks.push({ cols: side, rows: side, col: COL.photo, name: "cam " + (k + 1) });
      blocks.push({ cols: 8, rows: pf.lang / 8, col: COL.word, name: "words" });
      if (pf.state) blocks.push({ cols: 1, rows: 1, col: COL.st, name: "joint" });
      var areaH = H - fy - 34, gap = 10, lab = 16;
      function flow(cs) {
        var x = 0, y = 0, rowH = 0, pos = [];
        blocks.forEach(function (b) {
          var bw = b.cols * cs, bh = b.rows * cs + lab;
          if (x > 0 && x + bw > sw) { x = 0; y += rowH + gap; rowH = 0; }
          pos.push([x, y]); x += Math.max(bw, 34) + gap; rowH = Math.max(rowH, bh);
        });
        return { pos: pos, h: y + rowH };
      }
      var cs = small ? 14 : 24; while (cs > 1 && (flow(cs).h > areaH || blocks.some(function (b) { return b.cols * cs > sw; }))) cs -= 0.25;
      var lay = flow(cs);
      blocks.forEach(function (b, i) {
        var bx = sx + lay.pos[i][0], by = fy + 6 + lay.pos[i][1], gp = cs > 6 ? 1 : 0.3;
        for (var a = 0; a < b.rows; a++) for (var bb = 0; bb < b.cols; bb++) { g.fillStyle = b.col; g.fillRect(bx + bb * cs + gp / 2, by + a * cs + gp / 2, cs - gp, cs - gp); }
        g.strokeStyle = COL.line; g.lineWidth = 1.2; g.strokeRect(bx, by, b.cols * cs, b.rows * cs);
        text(g, b.name + (b.name.indexOf("cam") === 0 ? " · " + fmt(b.cols * b.rows) : b.name === "words" ? " · " + pf.lang : ""), bx, by + b.rows * cs + 13, { size: 12.5, col: COL.soft });
      });
      text(g, fmt(pf.T) + (small ? " cards up" : " cards go upstairs"), sx, Math.min(H - 6, fy + 6 + lay.h + 20), { size: small ? 13 : 15, bold: true, sign: true });
    }
    redraws.push(draw); draw();
  }

  /* ================= STEP 1: the tower ================= */
  function initS1() {
    var model = "smolvla", r = 4, cams = 3;
    function cfg() { var c = V.preset(model); c.r = r; c.cams = cams; return c; }
    seg($("s1m"), MODEL_OPTS, model, function (v) { model = v; r = V.preset(v).r; rSeg.set(r); touch("s1"); draw(); });
    var rSeg = seg($("s1r"), R_OPTS, r, function (v) { r = v; touch("s1"); draw(); });
    slider("s1cam", function (v) { cams = v; touch("s1"); draw(); });
    function draw() {
      var c = cfg(), pf = V.prefix(c), e = V.eyesFlops(c), tw = V.towerFlops(c), t = V.TOWERS[c.tower];
      $("s1T").textContent = fmt(pf.T); $("s1e").textContent = gf(e.total); $("s1t").textContent = gf(tw.total); $("s1a").textContent = pct(tw.att / tw.total, 1);
      var lp = V.towerLayerParams(t), q = t.heads * t.hd;
      $("s1math").innerHTML = '<div class="eq">tower = 2 × ' + fmt(lp / 1e6, 2) + "M weights × " + c.floors + " floors × " + fmt(pf.T) + " cards + 4 × " + q + " × " + fmt(pf.T) + "² × " + c.floors + "</div>" +
        '<div class="eqn">= <b>' + gfn(tw.lin) + "</b> staff + <b>" + gfn(tw.att) + "</b> meetings" + (tw.state ? " + <b>" + gfn(tw.state) + "</b> (joint card through the drafting room)" : "") + " GFLOP · photo desk: " + c.cams + " × " + fmt(V.patches(V.EYES[c.eyes])) + " tiles through " + fmt(V.eyesParams(V.EYES[c.eyes]) / 1e6, 0) + "M weights = <b>" + gfn(e.total) + "</b> GFLOP</div>";
      // the bill
      var P = prep($("s1bill")), g = P.g, W = P.W, H = P.H;
      var maxv = 0; [1, 2, 4].forEach(function (rr_) { var x = cfg(); x.r = rr_; maxv = Math.max(maxv, V.eyesFlops(x).total + V.towerFlops(x).total); });
      var parts = [{ v: e.lin + e.att, col: COL.photo, name: "photo desk" }, { v: e.conn, col: COL.conn }, { v: tw.lin + tw.state, col: COL.staff, name: "staff" }, { v: tw.att, col: COL.meet, name: "meet", dark: true }];
      var bx = 10, bw = W - 20, by = 26, bh = Math.max(26, H - 62);
      var cap = "the prefix bill, " + gf(e.total + tw.total) + " (scale: the most any bundle size costs with " + cams + " camera" + (cams > 1 ? "s" : "") + ")";
      g.font = "400 14px " + HAND; if (g.measureText(cap).width > bw) cap = "the prefix bill, " + gf(e.total + tw.total) + " (bar = the costliest r)";
      text(g, cap, bx, 17, { size: W < 560 ? 12.5 : 14, col: COL.soft });
      var end = stackBar(g, bx, by, bw, bh, parts, maxv, { small: W < 560 });
      axisTicks(maxv / 1e9).forEach(function (v) { var x = bx + v * 1e9 / maxv * bw; g.strokeStyle = COL.soft; g.lineWidth = 1; g.beginPath(); g.moveTo(x, by + bh); g.lineTo(x, by + bh + 5); g.stroke(); text(g, fmt(v), x, by + bh + 18, { size: 12, col: COL.soft, align: x > W - 30 ? "right" : "center" }); });
      text(g, "GFLOP", W - 10, by + bh + 32 > H ? H - 2 : by + bh + 32, { size: 12, col: COL.soft, align: "right" });
      drawCurve(c, pf.T);
    }
    function drawCurve(c, Tnow) {
      var P = prep($("s1curve")), g = P.g, W = P.W, H = P.H, t = V.TOWERS[c.tower];
      var L = 52, Rm = 14, T0 = 26, B = 34, pw = W - L - Rm, ph = H - T0 - B, Tmax = 3300;
      var f = function (T) { return V.towerFlops(c, T); };
      var ymax = f(Tmax).total; var yt = axisTicksUp(ymax / 1e9);
      ymax = yt[yt.length - 1] * 1e9;
      var X = function (T) { return L + T / Tmax * pw; }, Y = function (v) { return T0 + ph - v / ymax * ph; };
      g.strokeStyle = COL.rule; g.lineWidth = 1;
      yt.forEach(function (v) { g.beginPath(); g.moveTo(L, Y(v * 1e9)); g.lineTo(L + pw, Y(v * 1e9)); g.stroke(); text(g, fmt(v), L - 6, Y(v * 1e9) + 4, { size: 12, col: COL.soft, align: "right" }); });
      [0, 500, 1000, 1500, 2000, 2500, 3000].forEach(function (T) { text(g, fmt(T), X(T), T0 + ph + 16, { size: 12, col: COL.soft, align: "center" }); });
      text(g, "cards up the tower", L + pw, H - 4, { size: 13, col: COL.soft, align: "right" });
      text(g, "GFLOP", 4, 14, { size: 12, col: COL.soft });
      // meetings area between staff line and total
      g.beginPath(); g.moveTo(X(0), Y(0));
      for (var T = 0; T <= Tmax; T += 50) g.lineTo(X(T), Y(f(T).total));
      for (T = Tmax; T >= 0; T -= 50) g.lineTo(X(T), Y(f(T).lin + f(T).state));
      g.closePath(); g.fillStyle = "rgba(184,163,220,.55)"; g.fill();
      g.strokeStyle = COL.staff; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(0), Y(f(0).lin)); g.lineTo(X(Tmax), Y(f(Tmax).lin + f(Tmax).state)); g.stroke();
      g.strokeStyle = COL.line; g.lineWidth = 2; g.beginPath();
      for (T = 0; T <= Tmax; T += 25) { if (T === 0) g.moveTo(X(T), Y(f(T).total)); else g.lineTo(X(T), Y(f(T).total)); } g.stroke();
      tag(g, "staff + meetings", X(Tmax * 0.78) - 8, Y(f(Tmax * 0.78).total) - 8, { size: 13, align: "right", col: COL.ink });
      tag(g, "staff alone", X(Tmax * 0.9), Y(f(Tmax * 0.9).lin + f(Tmax * 0.9).state) + 20, { size: 13, align: "right", col: COL.staff });
      var marks = c.tower === "small" ? [[241, "SmolVLA"], [3121, "no bundler"]] : [[816, "π0"]];
      marks.forEach(function (m) { g.strokeStyle = COL.soft; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(m[0]), T0); g.lineTo(X(m[0]), T0 + ph); g.stroke(); g.setLineDash([]); tag(g, m[1], X(m[0]) + (m[0] > 3000 ? -4 : 4), T0 + 12, { size: 12, col: COL.soft, align: m[0] > 3000 ? "right" : "left" }); });
      var v = f(Math.min(Tnow, Tmax)).total;
      g.fillStyle = COL.bad; g.strokeStyle = COL.line; g.lineWidth = 2; g.beginPath(); g.arc(X(Math.min(Tnow, Tmax)), Y(v), 6, 0, 7); g.fill(); g.stroke();
      tag(g, t.name + ", " + c.floors + " floors", L + pw - 8, T0 + ph - 10, { size: 13, col: COL.soft, align: "right" });
    }
    redraws.push(draw); draw();
  }

  /* ================= STEP 2: halfway up ================= */
  function initS2() {
    var N = 16;
    var sl = slider("s2N", function (v) { N = v; touch("s2"); draw(); });
    function at(n) { var c = V.preset("smolvla"); c.floors = n; return V.flops(c); }
    function draw() {
      var f = at(N), f32 = at(32), row = V.PAPER.layers.filter(function (x) { return x.N === N; })[0];
      $("s2t").textContent = gf(f.tower); $("s2x").textContent = gf(f.passes); $("s2tot").textContent = gf(f.total); $("s2s").textContent = pct(1 - f.total / f32.total, 0);
      $("s2st").innerHTML = row ? "SmolVLA Table 8, N = " + N + ": <b>" + fmt(row.avg, 1) + "</b> LIBERO average success" : "N = " + N + " isn't in Table 8 (it tested 8, 16, 24 and 32)";
      var P = prep($("s2c")), g = P.g, W = P.W, H = P.H;
      var L = 48, Rm = 46, T0 = 40, B = 34, pw = W - L - Rm, ph = H - T0 - B;
      var Ns = [4, 8, 12, 16, 20, 24, 28, 32], ymax = 1100e9, Y = function (v) { return T0 + ph - v / ymax * ph; };
      var slot = pw / Ns.length, bw = Math.min(46, slot * 0.62);
      [0, 200, 400, 600, 800, 1000].forEach(function (v) { g.strokeStyle = COL.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(v * 1e9)); g.lineTo(L + pw, Y(v * 1e9)); g.stroke(); text(g, fmt(v), L - 6, Y(v * 1e9) + 4, { size: 12, col: COL.soft, align: "right" }); });
      text(g, "GFLOP per chunk", 4, 14, { size: 12, col: COL.soft });
      var y2 = function (s) { return T0 + ph - (s - 70) / 12 * ph; };
      [70, 74, 78, 82].forEach(function (s) { text(g, fmt(s), L + pw + 6, y2(s) + 4, { size: 12, col: COL.grassD }); });
      text(g, "success % (axis from 70)", W - 4, 13, { size: 12, col: COL.grassD, align: "right" });
      Ns.forEach(function (n, i) {
        var fx = at(n), cx = L + slot * (i + 0.5), x = cx - bw / 2, y = Y(0);
        [[fx.eyes, COL.photo], [fx.tower, COL.staff], [fx.passes, COL.expert]].forEach(function (p) { var h = p[0] / ymax * ph; g.fillStyle = p[1]; g.fillRect(x, y - h, bw, h); g.strokeStyle = COL.line; g.lineWidth = 1.3; g.strokeRect(x, y - h, bw, h); y -= h; });
        if (n === N) { g.strokeStyle = COL.bad; g.lineWidth = 3; g.strokeRect(x - 3, y - 3, bw + 6, Y(0) - y + 6); }
        text(g, String(n), cx, T0 + ph + 16, { size: 13, align: "center", col: n === N ? COL.bad : COL.soft, bold: n === N });
      });
      text(g, "floors kept, N", L + pw, H - 3, { size: 13, col: COL.soft, align: "right" });
      var pts = V.PAPER.layers.map(function (r) { return [L + slot * (Ns.indexOf(r.N) + 0.5), y2(r.avg), r.avg]; });
      g.strokeStyle = COL.grassD; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); g.setLineDash([]);
      var tight = slot < 44;
      pts.forEach(function (p, i) {
        g.fillStyle = COL.grass; g.strokeStyle = COL.line; g.lineWidth = 1.8; g.beginPath(); g.arc(p[0], p[1], 5.5, 0, 7); g.fill(); g.stroke();
        // the score on a little tag: above-right of its dot, flipped left at the right edge, never off the top;
        // on a narrow chart the tags alternate above and below so neighbours don't cover each other
        var lx = p[0] + 9, ly = Math.max(T0 - 4, p[1] - 9); if (lx + 34 > L + pw) lx = p[0] - 42;
        if (tight && i % 2) ly = p[1] + 22;
        g.fillStyle = COL.sheet; rr(g, lx - 3, ly - 13, 36, 17, 4); g.fill(); g.strokeStyle = COL.grassD; g.lineWidth = 1.2; g.stroke();
        text(g, fmt(p[2], 1), lx + 15, ly, { size: 13, align: "center", col: COL.grassD, bold: true });
      });
    }
    redraws.push(draw); draw();
  }

  /* ================= STEP 3: the drafting room ================= */
  function initS3() {
    var model = "smolvla", k = 10, n = 50, cache = true;
    function cfg() { var c = V.preset(model); c.steps = k; c.chunk = n; return c; }
    seg($("s3m"), MODEL_OPTS, model, function (v) { model = v; touch("s3"); draw(); });
    slider("s3k", function (v) { k = v; touch("s3"); draw(); });
    slider("s3n", function (v) { n = v; touch("s3"); draw(); });
    $("s3cache").addEventListener("change", function () { cache = this.checked; touch("s3"); draw(); });
    function drawAtt(c) {
      var P = prep($("s3att")), g = P.g, W = P.W, H = P.H, pf = V.prefix(c), T = pf.T + (c.stateIn === "expert" ? 1 : 0), small = W < 560;
      // one panel per kind of drafting floor; columns are the keys a line can read (the filed cards, then the order's own lines), drawn to one scale
      var panels = c.mode === "joint" ? [{ kind: "joint", title: "every floor (π0): cabinet + whole order" }] : [{ kind: "ca", title: "cross floors: the cabinet only" }, { kind: "sa", title: "self floors: cabinet + lines above" }];
      var gap = 18, top = 22, ph = H - top - 30, lw = 28, avail = W - 16 - gap * (panels.length - 1) - lw * panels.length;
      var colsOf = function (p) { return p.kind === "ca" ? T : T + n; }, totalCols = panels.reduce(function (a, p) { return a + colsOf(p); }, 0), cw = avail / totalCols, x0 = 8;
      panels.forEach(function (p) {
        var cols = colsOf(p), ww = cols * cw, gx = x0 + lw, y0 = top + 8, hh = ph - 8;
        text(g, p.title, x0, 15, { size: small ? 12.5 : 14, col: COL.soft });
        var colOf = function (j) { if (j < pf.img) return COL.photo; if (j < pf.img + pf.lang) return COL.word; if (j < T) return COL.st; return COL.expert; };
        for (var j = 0; j < cols; j++) { g.fillStyle = colOf(j); g.fillRect(gx + j * cw, top, Math.max(cw, 0.6), 6); }
        g.fillStyle = COL.sheet; g.fillRect(gx, y0, ww, hh);
        g.fillStyle = "rgba(36,106,156,.5)"; g.fillRect(gx, y0, T * cw, hh);
        g.fillStyle = "rgba(226,112,28,.8)";
        if (p.kind === "sa") { g.beginPath(); g.moveTo(gx + T * cw, y0); g.lineTo(gx + (T + 1) * cw, y0); g.lineTo(gx + ww, y0 + hh); g.lineTo(gx + T * cw, y0 + hh); g.closePath(); g.fill(); }
        else if (p.kind === "joint") g.fillRect(gx + T * cw, y0, n * cw, hh);
        g.strokeStyle = COL.line; g.lineWidth = 1.5; g.strokeRect(gx, y0, ww, hh);
        g.save(); g.translate(x0 + 12, y0 + hh / 2); g.rotate(-Math.PI / 2); text(g, n + " lines", 0, 0, { size: 13, col: COL.expertD, align: "center" }); g.restore();
        var reads = p.kind === "sa" ? n * T + n * (n + 1) / 2 : p.kind === "ca" ? n * T : n * (T + n);
        text(g, fmt(reads) + " reads", gx, H - 8, { size: small ? 12 : 13, col: COL.ink });
        x0 += lw + ww + gap;
      });
      $("s3attc").innerHTML = c.mode === "joint" ? "π0: on each of its 18 drafting floors, every line reads all " + fmt(T) + " filed cards (blue: the " + fmt(pf.T) + " cards and π0's joint card) and every other line of the order, above and below (orange). Drawn to one scale: each column is one card a line can read." :
        "SmolVLA: 16 drafting floors, alternating. On cross floors each of the " + n + " lines reads the " + fmt(T) + " filed cards (blue); on self floors it reads them too, plus the lines above it, never the ones below (the orange triangle: the causal mask). Drawn to one scale: each column is one card a line can read.";
    }
    function draw() {
      var c = cfg(), p = V.params(c), f = V.flops(c), pass = f.pass, noc = V.flopsNoCache(c);
      $("s3P").textContent = mp(p.expert); $("s3p").textContent = gf(pass); $("s3r").textContent = pct(pass / f.tower, 1);
      $("s3tot").textContent = gf(cache ? f.total : noc) + (cache ? "" : " · " + fmt(noc / f.total, 1) + "×");
      drawAtt(c);
      var P = prep($("s3bar")), g = P.g, W = P.W, H = P.H, small = W < 560;
      var parts = [{ v: f.eyes, col: COL.photo, name: "photo desk" }];
      if (cache) { parts.push({ v: f.tower, col: COL.staff, name: "tower" }); for (var i = 0; i < k; i++) parts.push({ v: pass, col: COL.expert }); }
      else for (i = 0; i < k; i++) { parts.push({ v: f.tower, col: COL.staff, name: i === 0 ? "tower" : "" }); parts.push({ v: pass, col: COL.expert }); }
      var total = cache ? f.total : noc, by = 26, bh = Math.max(24, H - 60);
      text(g, small ? (cache ? "cabinet: tower once, then " : "no cabinet: tower before each of ") + k + " draft" + (k > 1 ? "s" : "") : (cache ? "with the filing cabinet: the tower reads the cards once, then " : "no cabinet: the tower rereads the cards before each of ") + k + " draft" + (k > 1 ? "s" : ""), 10, 17, { size: small ? 12.5 : 14, col: COL.soft });
      stackBar(g, 10, by, W - 20, bh, parts, total, { small: small });
      text(g, gf(total) + " per chunk", W - 10, by + bh + 20, { size: 14, align: "right", bold: true, sign: true });
      text(g, k + " × " + gf(pass) + " in drafts", 10, by + bh + 20, { size: 13, col: COL.expertD });
    }
    redraws.push(draw); draw();
  }

  /* ================= the timeline (steps 4 and 5) ================= */
  function drawTimeline(cv, c, hwKey, rate) {
    var P = prep(cv), g = P.g, W = P.W, H = P.H, L = V.latency(c, hwKey), tick = 1 / rate, small = W < 560;
    var xmax = Math.max(L.total, tick) * 1.1, x0 = 10, pw = W - 20, X = function (s) { return x0 + s / xmax * pw; };
    var top = small ? 38 : 34, bh = Math.max(26, H * (small ? 0.24 : 0.34));
    text(g, L.hw.name + " · " + rate + (rate === 30 ? " fps" : " Hz") + ": one tick every " + fmt(1000 / rate, 1) + " ms", x0, 14, { size: small ? 12.5 : 14, col: COL.soft });
    var segs = [{ s: L.eyes.s, col: COL.photo, name: "photo desk", mem: L.eyes.bound === "memory" }, { s: L.tower.s, col: COL.staff, name: "tower", mem: L.tower.bound === "memory" }];
    for (var i = 0; i < c.steps; i++) segs.push({ s: L.pass.s, col: COL.expert, mem: L.pass.bound === "memory", name: "" });
    var cx = 0;
    segs.forEach(function (sg) {
      var a = X(cx), b = X(cx + sg.s); g.fillStyle = sg.col; g.fillRect(a, top, Math.max(0.8, b - a), bh);
      if (sg.mem) hatch(g, a, top, b - a, bh);
      g.strokeStyle = COL.line; g.lineWidth = b - a > 4 ? 1.4 : 0.6; g.strokeRect(a, top, Math.max(0.8, b - a), bh);
      if (sg.name && b - a > (small ? 52 : 70)) text(g, sg.name, (a + b) / 2, top + bh / 2 + 1, { align: "center", base: "middle", size: small ? 12 : 14, col: COL.sheet, bold: true, sign: !small });
      cx += sg.s;
    });
    var dw = X(L.total) - X(L.prefill), dl = c.steps + " draft" + (c.steps > 1 ? "s" : "");
    g.font = "700 14px " + SIGN;
    var tw = g.measureText(dl).width;
    if (dw > tw + 12) { g.fillStyle = "rgba(255,253,246,.92)"; rr(g, X(L.prefill) + dw / 2 - tw / 2 - 5, top + bh / 2 - 10, tw + 10, 20, 5); g.fill(); text(g, dl, X(L.prefill) + dw / 2, top + bh / 2 + 1, { align: "center", base: "middle", size: small ? 12 : 14, col: COL.ink, bold: true, sign: !small }); }
    else text(g, dl, X(L.prefill) + dw / 2, top - 4, { align: "center", size: 13, col: COL.expertD });
    // the robot's ticks
    var nT = Math.floor(xmax / tick), every = 1; while (pw / (nT / every) < 6) every *= 2;
    var ty = top + bh + 8;
    g.strokeStyle = COL.soft; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, ty + 12); g.lineTo(x0 + pw, ty + 12); g.stroke();
    var lastLab = -1e9;
    for (var k = 1; k <= nT; k++) {
      if (k % every) continue;
      var x = X(k * tick), done = k * tick <= L.total;
      g.strokeStyle = done ? COL.bad : COL.soft; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x, ty); g.lineTo(x, ty + 12); g.stroke();
      if (x - lastLab > 64 && Math.abs(x - X(L.total)) > 30) { text(g, fmt(k * tick * 1000, 0) + " ms", x, ty + 25, { size: 11.5, col: COL.soft, align: "center" }); lastLab = x; }
    }
    var d = V.ticks(L.total * 1000, rate);
    g.strokeStyle = COL.ink; g.lineWidth = 2.2; g.beginPath(); g.moveTo(X(L.total), top - 6); g.lineTo(X(L.total), ty + 16); g.stroke();
    var lab = (small ? "ready at " : "chunk ready at ") + ms(L.total) + " · d = " + d + " tick" + (d === 1 ? "" : "s");
    var lx = X(L.total), al = lx > W * 0.6 ? "right" : "left";
    if (small) { lx = x0 - 6; al = "left"; }
    text(g, lab, lx + (al === "right" ? -6 : 6), ty + 44, { size: small ? 13 : 15, align: al, bold: true, sign: true, col: COL.ink });
    text(g, (small ? "red ticks pass while it works" : "robot ticks: red = ticks that pass while the office works") + (every > 1 ? " (every " + every + "th drawn)" : ""), x0, Math.min(H - 4, ty + 62), { size: small ? 11.5 : 12.5, col: COL.soft });
    return { L: L, d: d };
  }

  /* ================= STEP 4: the stopwatch ================= */
  function initS4() {
    var model = "smolvla", hw = "gpu", rate = 30, k = 10, n = 50, cams = 3;
    function cfg() { var c = V.preset(model); c.steps = k; c.chunk = n; c.cams = cams; return c; }
    seg($("s4m"), MODEL_OPTS, model, function (v) { model = v; rate = v === "pi0" ? 50 : 30; rSeg.set(rate); touch("s4"); draw(); });
    seg($("s4hw"), HW_OPTS, hw, function (v) { hw = v; touch("s4"); draw(); });
    var rSeg = seg($("s4rate"), RATE_OPTS, rate, function (v) { rate = v; touch("s4"); draw(); });
    slider("s4k", function (v) { k = v; touch("s4"); draw(); });
    slider("s4n", function (v) { n = v; touch("s4"); draw(); });
    slider("s4cam", function (v) { cams = v; touch("s4"); draw(); });
    function draw() {
      var c = cfg(), out = drawTimeline($("s4tl"), c, hw, rate), L = out.L, d = out.d;
      $("s4L").textContent = ms(L.total); $("s4d").textContent = d + " tick" + (d === 1 ? "" : "s"); $("s4ch").textContent = fmt(V.chunkMs(n, rate), 0) + " ms";
      var gN = V.gNeeded(L.total * 1000, rate, n);
      $("s4g").textContent = gN > 1 ? fmt(gN, 2) + " (none works)" : fmt(gN, 2);
      var hwv = L.hw, f = V.flops(c), p = V.params(c);
      function line(name, st, fl, by) { return name + " max(" + gfn(fl) + " GFLOP ÷ " + fmt(hwv.F / 1e12) + " T, " + fmt(by / 1e6, 0) + " MB ÷ " + fmt(hwv.B / 1e9) + " GB/s) = <b>" + ms(st.s) + "</b> <span class=\"" + (st.bound === "memory" ? "bad" : "ok") + "\">(" + st.bound + ")</span>"; }
      $("s4math").innerHTML = '<div class="eq">latency = photo desk + tower + ' + k + " × draft = " + ms(L.eyes.s) + " + " + ms(L.tower.s) + " + " + k + " × " + ms(L.pass.s) + " = " + ms(L.total) + "</div>" +
        '<div class="eqn">' + line("photo desk:", L.eyes, f.eyes, 2 * (p.eyes + p.conn)) + "<br>" + line("tower:", L.tower, f.tower, 2 * (p.tower + (c.stateIn === "expert" ? p.expert : 0))) + "<br>" + line("one draft:", L.pass, f.pass, 2 * p.expert + f.parts.pass.kvRead) + "</div>" +
        '<div class="eqn">d = ⌊' + fmt(L.total * 1000, 1) + " ÷ " + fmt(1000 / rate, 1) + "⌋ = <b>" + d + "</b> · the order lasts " + n + " × " + fmt(1000 / rate, 1) + " ms = " + fmt(V.chunkMs(n, rate), 0) + " ms · asynchronously, ask for the next with g ≥ (" + fmt(L.total * 1000, 1) + " ÷ " + fmt(1000 / rate, 1) + ") ÷ " + n + " = <b>" + gText(gN) + "</b>" + (gN > 1 ? ": the order is shorter than the wait for the next one" : " of it left") + " (Demos to Deployment, step 5)</div>";
      var pi = V.latency(V.preset("pi0"), "gpu");
      $("s4cal").innerHTML = "<b>A check against one real number.</b> π0 on the toy desktop GPU, three cameras: photo desk + tower (the prefill) = <b>" + fmt(pi.prefill * 1000, 1) + " ms</b> here. The RTC paper reports that π0 on an RTX 4090 \"spends 46ms on the KV cache prefill alone, before any denoising steps\". Close, for a big compute-bound pass. For small passes, real stacks add overheads (kernel launches, Python, copies) this model leaves out, so read its milliseconds as a floor.";
    }
    redraws.push(draw); draw();
  }

  /* ================= STEP 5: side by side, and the builder ================= */
  function initS5Table() {
    var s = V.preset("smolvla"), p = V.preset("pi0"), fs = V.flops(s), fp = V.flops(p), ps = V.params(s), pp = V.params(p);
    var Ls = { gpu: V.latency(s, "gpu"), edge: V.latency(s, "edge"), laptop: V.latency(s, "laptop") }, Lp = { gpu: V.latency(p, "gpu"), edge: V.latency(p, "edge"), laptop: V.latency(p, "laptop") };
    function src(t) { return '<span class="src">' + t + "</span>"; }
    var rows = [
      ["sec", "In the papers"],
      ["Parameters", "450M" + src("SmolVLA §4.3"), "3.3B" + src("π0 §IV: PaliGemma 3B + 300M")],
      ["Vision-language model", "SmolVLM2-500M" + src("SmolVLA §3.1"), "PaliGemma 3B" + src("π0 §IV")],
      ["Photo desk", "SigLIP-B/16 at 512 px; 93M in the paper, 86M of matrix weights in this count" + src("SmolVLM §4; SmolVLA §4.3"), "SigLIP-So400m at 224 px" + src("PaliGemma §3.1–3.2")],
      ["Cards per frame", "64 (pixel shuffle)" + src("SmolVLA §3.1"), "256" + src("PaliGemma: 224 px → 256 tokens")],
      ["Tower floors used", "first 16 of 32" + src("SmolVLA §4.3; config: 32 layers"), "all 18 of Gemma-2B" + src("π0 appendix A-B")],
      ["Drafting room", "~100M, 0.75 × width; cross + causal self-attention" + src("SmolVLA §3.1, §4.3"), "~300M, width 1024; reads prefix and whole chunk" + src("π0 appendix A-B, §IV")],
      ["Drafts × lines", "10 × 50" + src("SmolVLA §4.3"), "10 × 50" + src("π0 §IV")],
      ["Timing reported", "none in ms; async finished tasks ~30% faster than sync" + src("SmolVLA §4.6"), "prefill 46 ms on an RTX 4090" + src("RTC §2, citing π0")],
      ["LIBERO, average success", "87.3%" + src("SmolVLA Table 2"), "86.0% (robot-pretrained)" + src("SmolVLA Table 2")],
      ["SO100 real robot, average", "78.3%" + src("SmolVLA Table 3"), "61.7%" + src("SmolVLA Table 3")],
      ["Training", "\"around 40% faster to train and consumes 6× less memory\" than π0" + src("SmolVLA §4.5"), "–"],
      ["sec", "This lab's count (three cameras)"],
      ["Cards up the tower", fmt(V.prefix(s).T), fmt(V.prefix(p).T)],
      ["Weights a chunk runs through", mp(ps.hot), mp(pp.hot)],
      ["Photo desk", gf(fs.eyes), gf(fp.eyes)],
      ["Tower", gf(fs.tower), gf(fp.tower)],
      ["10 drafts", gf(fs.passes), gf(fp.passes)],
      ["Per chunk", "<b>" + gf(fs.total) + "</b>", "<b>" + gf(fp.total) + "</b>"],
      ["Toy desktop GPU", ms(Ls.gpu.total), ms(Lp.gpu.total)],
      ["Toy edge board", ms(Ls.edge.total), ms(Lp.edge.total)],
      ["Toy laptop CPU", ms(Ls.laptop.total), ms(Lp.laptop.total)]
    ];
    $("s5tab").innerHTML = "<tr><th></th><th>SmolVLA</th><th>π0</th></tr>" + rows.map(function (r) {
      if (r[0] === "sec") return '<tr class="sec"><td colspan="3">' + r[1] + "</td></tr>";
      return "<tr><td>" + r[0] + '</td><td class="s">' + r[1] + '</td><td class="p">' + r[2] + "</td></tr>";
    }).join("");
  }
  var B = null;
  function initBuilder() {
    var c = V.preset("smolvla"), hw = "edge", rate = 30;
    c.expertMlp = null;
    function act() { touch("s5"); upd(); }
    var tSeg = seg($("bTower"), [{ v: "small", label: "small (960 wide, 32)" }, { v: "big", label: "big (2048 wide, 18)" }], c.tower, function (v) { c.tower = v; clampN(); act(); });
    var nSl = slider("bN", function (v) { c.floors = v; act(); });
    var eSeg = seg($("bEyes"), [{ v: "b16-256", label: "B/16 · 256 px" }, { v: "b16-512", label: "B/16 · 512 px" }, { v: "so400m-224", label: "So400m/14 · 224 px" }], c.eyes, function (v) { c.eyes = v; act(); });
    var rSeg = seg($("bR"), R_OPTS, c.r, function (v) { c.r = v; act(); });
    var camSl = slider("bCam", function (v) { c.cams = v; act(); });
    var xSeg = seg($("bX"), [{ v: 0.25, label: "0.25" }, { v: 0.5, label: "0.5" }, { v: 0.75, label: "0.75" }, { v: 1, label: "1" }], c.expertMult, function (v) { c.expertMult = v; act(); });
    var mSeg = seg($("bMode"), [{ v: "interleaved", label: "every other floor" }, { v: "joint", label: "every floor" }], c.mode, function (v) { c.mode = v; act(); });
    var kSl = slider("bK", function (v) { c.steps = v; act(); });
    var nnSl = slider("bNn", function (v) { c.chunk = v; act(); });
    seg($("bHw"), HW_OPTS, hw, function (v) { hw = v; act(); });
    var rtSeg = seg($("bRate"), RATE_OPTS, rate, function (v) { rate = v; act(); });
    function clampN() { var mx = V.TOWERS[c.tower].layers; nSl.el.max = mx; if (c.floors > mx) c.floors = mx; nSl.set(c.floors); }
    function load(name) {
      var p = V.preset(name); Object.keys(p).forEach(function (k) { c[k] = p[k]; }); c.expertMlp = null;
      tSeg.set(c.tower); clampN(); eSeg.set(c.eyes); rSeg.set(c.r); camSl.set(c.cams); xSeg.set(c.expertMult); mSeg.set(c.mode); kSl.set(c.steps); nnSl.set(c.chunk);
      rate = name === "pi0" ? 50 : 30; rtSeg.set(rate);
      upd();
    }
    $("bSmol").onclick = function () { touch("s5"); load("smolvla"); };
    $("bPi").onclick = function () { touch("s5"); load("pi0"); };
    var SMOL_EDGE = V.latency(V.preset("smolvla"), "edge").total;
    var CH = [
      { id: "A", title: "The laptop", text: "On the toy laptop CPU with the robot at 30 fps, get a chunk out in under 200 ms.", base: "smolvla",
        test: function () { return hw === "laptop" && rate === 30 && V.latency(c, hw).total * 1000 < 200; } },
      { id: "B", title: "The big brain", text: "Keep the big tower (2048 wide) on the toy desktop GPU, robot at 50 Hz, and get d down to 1 tick or less.", base: "pi0",
        test: function () { return c.tower === "big" && hw === "gpu" && rate === 50 && V.ticks(V.latency(c, hw).total * 1000, rate) <= 1; } },
      { id: "C", title: "Three cameras, half the time", text: "On the toy edge board, keep all three cameras and at least half of SmolVLA's latency off: under " + fmt(SMOL_EDGE * 500, 1) + " ms (SmolVLA takes " + fmt(SMOL_EDGE * 1000, 1) + " ms there).", base: "smolvla",
        test: function () { return hw === "edge" && c.cams === 3 && V.latency(c, hw).total <= SMOL_EDGE / 2; } }
    ];
    var NAMES = { tower: function (v) { return v + " tower"; }, floors: function (v) { return v + " floors"; }, eyes: function (v) { return V.EYES[v].short; }, r: function (v) { return "r = " + v; }, cams: function (v) { return v + " camera" + (v > 1 ? "s" : ""); }, expertMult: function (v) { return "drafting room × " + v; }, mode: function (v) { return v === "joint" ? "cabinet every floor" : "cabinet every other floor"; }, steps: function (v) { return v + " drafts"; }, chunk: function (v) { return "n = " + v; } };
    function levers(base) { var p = V.preset(base), out = []; Object.keys(NAMES).forEach(function (k) { if (p[k] !== c[k]) out.push(NAMES[k](c[k])); }); return out; }
    function upd() {
      var out = drawTimeline($("bBar"), c, hw, rate), L = out.L, f = V.flops(c), p = V.params(c), pf = V.prefix(c);
      $("bT").textContent = fmt(pf.T); $("bP").textContent = mp(p.hot); $("bF").textContent = gf(f.total); $("bL").textContent = ms(L.total) + " · " + out.d;
      var x = V.expertShape(c), t = V.TOWERS[c.tower], e = V.EYES[c.eyes];
      $("bMath").innerHTML = '<div class="eq">FLOPs = photo desk ' + gfn(f.eyes) + " + tower " + gfn(f.tower) + " + " + c.steps + " × draft " + gfn(f.pass) + " = " + gf(f.total) + "</div>" +
        '<div class="eqn">cards = ' + c.cams + " × (" + e.img + "÷" + e.patch + ")²÷" + c.r + "² + 48" + (pf.state ? " + 1" : "") + " = <b>" + fmt(pf.T) + "</b> · tower " + t.width + " wide × " + c.floors + " floors · drafting room " + x.width + " wide (MLP " + x.mlp + ", " + (t.family === "gemma" ? "4 × width, this lab's rule" : "LeRobot's rule") + ") × " + c.floors + " floors, " + mp(p.expert) + " weights</div>" +
        '<div class="eqn">each stage = max(FLOPs ÷ ' + fmt(L.hw.F / 1e12) + " TFLOP/s, bf16 weights ÷ " + fmt(L.hw.B / 1e9) + " GB/s) on the " + L.hw.name + " · d = ⌊" + fmt(L.total * 1000, 1) + " ÷ " + fmt(1000 / rate, 1) + "⌋ = <b>" + out.d + "</b> · async needs g ≥ " + gText(V.gNeeded(L.total * 1000, rate, c.chunk)) + "</div>";
      var done = 0;
      $("bChal").innerHTML = CH.map(function (ch) {
        var ok = ch.test(), lv = levers(ch.base);
        if (ok) { done++; var how = lv.length ? lv.join(", ") : "the " + (ch.base === "pi0" ? "π0" : "SmolVLA") + " settings"; if (store.chal[ch.id] !== how) { store.chal[ch.id] = how; save(); } }
        var was = !ok && store.chal[ch.id];
        return '<div class="chal' + (ok || was ? " ok" : "") + '"><span class="ic">' + (ok || was ? "✓" : ch.id) + "</span><div><b>" + ch.title + ".</b> " + ch.text +
          '<span class="why">' + (ok ? "Met, with: " + how + "." : (was ? "Solved earlier, with: " + esc(store.chal[ch.id]) + ". " : "") + "Now: " + ms(L.total) + " on the " + L.hw.name + ", d = " + out.d + " at " + rate + (rate === 30 ? " fps" : " Hz") + ".") + "</span></div></div>";
      }).join("");
    }
    B = { upd: upd };
    redraws.push(function () { upd(); });
    load("smolvla");
  }

  /* ================= FIELD TEST ================= */
  function ftAnswers() {
    function c(o, base) { return Object.assign(V.preset(base || "smolvla"), o || {}); }
    return [
      { q: "SmolVLA with two cameras: how many cards go up the tower?", hint: "step 0", ans: V.prefix(c({ cams: 2 })).T, tol: 0 },
      { q: "SmolVLA's frame with the bundle size set to r = 2: how many cards per frame?", hint: "step 0", ans: V.prefix(c({ r: 2 })).perFrame, tol: 0 },
      { q: "SmolVLA, three cameras, r = 2: the tower's bill, in GFLOP?", hint: "step 1", ans: +(V.towerFlops(c({ r: 2 })).total / 1e9).toFixed(1), tol: 2 },
      { q: "SmolVLA keeping only N = 8 floors: the whole chunk, in GFLOP?", hint: "step 2", ans: +(V.flops(c({ floors: 8 })).total / 1e9).toFixed(1), tol: 3 },
      { q: "π0: one draft in its drafting room, in GFLOP?", hint: "step 3, one decimal", ans: +(V.flops(c({}, "pi0")).pass / 1e9).toFixed(1), tol: 0.2 },
      { q: "π0 on the toy edge board, three cameras, 10 drafts: milliseconds to the chunk?", hint: "step 4", ans: +V.latency(c({}, "pi0"), "edge").ms.toFixed(1), tol: 2 },
      { q: "SmolVLA on the toy edge board with the robot at 50 Hz: the inference delay d, in ticks?", hint: "step 4", ans: V.ticks(V.latency(c(), "edge").ms, 50), tol: 0 },
      { q: "π0: how many weights does one chunk run through, in billions?", hint: "step 5, two decimals", ans: +(V.params(c({}, "pi0")).hot / 1e9).toFixed(2), tol: 0.02 }
    ];
  }
  function initFT() {
    var FT = ftAnswers();
    $("ftqs").innerHTML = FT.map(function (f, i) { return '<div class="fq"><div class="fqt"><b>' + (i + 1) + ".</b> " + f.q + ' <span class="muted">(' + f.hint + ')</span></div><div class="row"><input type="number" id="ft' + i + '" step="any" value="' + (store.ft[i] != null ? esc(store.ft[i]) : "") + '" aria-label="Answer ' + (i + 1) + '"><span class="res" id="ftr' + i + '"></span></div></div>'; }).join("");
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) { var raw = $("ft" + i).value, v = parseFloat(raw), ok = raw !== "" && !isNaN(v) && Math.abs(v - f.ans) <= f.tol + 1e-9; store.ft[i] = raw; if (ok) score++; $("ftr" + i).innerHTML = ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'; });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can read a VLA's config and say where its milliseconds go." : "");
      if (score >= 7 && !store.said.ft) { store.said.ft = true; save(); buildNav(); markNav(); }
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
  qa(".mast .mi").forEach(function (el) { el.innerHTML = IC.tower || ""; });
  buildNav(); buildNext();
  function hashId() { var m = /^#\/?(s[0-5]|ft)$/.exec(location.hash || ""); return m ? m[1] : null; }
  window.addEventListener("hashchange", function () {
    var id = hashId();
    if (id) { if (!$(id).classList.contains("on")) show(id); return; }
    var cur = sections.filter(function (s) { return s.classList.contains("on"); })[0];   // an unknown hash: put the current step's back
    if (cur) history.replaceState(null, "", "#/" + cur.id);
  });
  // ?shot=1 shows one card by itself, for the README screenshots
  if (/[?&]shot=1/.test(location.search)) document.body.classList.add("shot");
  initS0(); initS1(); initS2(); initS3(); initS4(); initS5Table(); initBuilder(); initFT();
  initTips(document); initPredicts();
  sections.forEach(function (s) { checkSay(s.id); });
  show(hashId() || "s0");
  window.addEventListener("load", function () { setTimeout(function () { window.scrollTo(0, 0); redrawAll(); }, 0); });
  var rt = null; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(redrawAll, 80); });
  window.VLAApp = { show: show, store: function () { return store; } };
})();
