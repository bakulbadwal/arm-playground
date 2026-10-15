/* Wet Paint — the pictures. Nine hand-built 960×400 scenes of Busytown's Main Street, assembled from a small cast of
   drawn parts (the striper, the master, the notebook, the drafting desk, the work order, the committee, the wet cement),
   plus the nav and cast icons. Flat gouache fills, one warm-brown outline, every object labelled with a hairline pointer.
   Exposed as window.WP_ART (scenes) and window.WP_ICONS (icons). */
(function (root) {
  "use strict";
  var L = "#4A2E1E", PAPER = "#FBF7EC", SHEET = "#FFFDF6", YEL = "#F4C430", BRICK = "#C8452F", GRASS = "#5FA03C", SKY = "#9CCBEA",
      SAND = "#DDBB8A", LILAC = "#B8A3DC", STEEL = "#B9BDC2", WOOD = "#B8793F", NOTE = "#FFF1A8", CHALK = "#2F4A3A",
      ASPH = "#8F9397", ASPHD = "#6F7377", KERB = "#D6CFC2", LEFT = "#246A9C", RIGHT = "#5E4A94", CEM = "#C9C3B6", BAD = "#A5321F",
      CONE = "#E2701C", MAST = "#C9561A", HOLE = "#3F4246", VEST = "#CFE03A", SILVER = "#E4E7EA", BILL = "#E9A23B",
      SKIN = "#F1C9A5", SKIN2 = "#D9A27A", SKIN3 = "#9C6B4A", CORK = "#D2A877";
  var HAND = "'Patrick Hand', 'Comic Sans MS', sans-serif", SIGN = "'Grandstander', 'Patrick Hand', sans-serif";

  /* ---------- primitives ---------- */
  function n(v) { return Math.round(v * 10) / 10; }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function st(sw) { return sw === 0 ? "" : ' stroke="' + L + '" stroke-width="' + (sw || 2.5) + '"'; }
  function R(x, y, w, h, f, sw, rx, ex) { return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + f + '"' + st(sw) + (ex || "") + "/>"; }
  function C(x, y, r, f, sw, ex) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + r + '" fill="' + f + '"' + st(sw === undefined ? 2 : sw) + (ex || "") + "/>"; }
  function E(x, y, rx, ry, f, sw, ex) { return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + st(sw === undefined ? 2 : sw) + (ex || "") + "/>"; }
  function P(d, f, sw, ex) { return '<path d="' + d + '" fill="' + (f || "none") + '"' + st(sw === undefined ? 2 : sw) + (ex || "") + "/>"; }
  function K(d, col, w, ex) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (ex || "") + "/>"; }
  function G(tf, inner, ex) { return '<g transform="' + tf + '"' + (ex || "") + ">" + inner + "</g>"; }
  function rnd(seed) { var r = seed; return function () { r = (r * 9301 + 49297) % 233280; return r / 233280; }; }
  function ss(t) { t = cl(t, 0, 1); return t * t * (3 - 2 * t); }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + n(x) + '" y="' + n(y) + '" font-family="' + (o.sign ? SIGN : HAND) + '" font-size="' + (o.size || 15) + '"' + (o.sign ? ' font-weight="800"' : "") +
      ' fill="' + (o.fill || L) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") + (o.tf ? ' transform="' + o.tf + '"' : "") + (o.ls ? ' letter-spacing="' + o.ls + '"' : "") + ">" + s + "</text>";
  }
  // A painted signboard title: uppercase sign lettering in paper on a coloured board, with the 2px dark offset copy.
  function board(x, y, w, s, col) {
    return R(x, y, w, 36, col || MAST, 3, 6) + '<g font-family="' + SIGN + '" font-weight="800" font-size="21" letter-spacing="1" text-anchor="middle">' +
      '<text x="' + (x + w / 2 + 2) + '" y="' + (y + 27) + '" fill="' + L + '">' + s + '</text><text x="' + (x + w / 2) + '" y="' + (y + 25) + '" fill="' + PAPER + '">' + s + "</text></g>";
  }
  // A hand-lettered label (one or more lines) joined to its object by a hairline pointer; t = [x, y] of the object.
  // With plate, the lettering sits on a small paper tag so it reads on the asphalt.
  // Patrick Hand advance widths (per 100px) for ASCII 32–126, so a tag fits its lettering.
  var GW = [23,25,30,46,51,64,53,16,33,36,40,48,20,40,21,42,45,36,47,45,37,42,40,49,43,37,23,23,40,57,40,37,55,49,51,55,47,44,37,48,47,23,37,52,37,59,53,56,48,65,45,46,47,55,56,62,60,44,51,30,42,30,37,57,22,39,41,39,39,40,36,44,42,22,23,41,27,68,45,40,43,46,38,38,34,40,40,46,45,42,43,34,18,33,53];
  function tw(s, z) { var w = 0; s.replace(/&[a-z#0-9]+;/g, "x").split("").forEach(function (c) { w += GW[c.charCodeAt(0) - 32] || 64; }); return w * z / 100; }
  function label(x, y, lines, t, o) {
    o = o || {}; if (typeof lines === "string") lines = [lines];
    var z = o.size || 15, lh = Math.round(z * 1.22), an = o.anchor || "start", w = 0, s = "";
    lines.forEach(function (l) { w = Math.max(w, tw(l, z)); });
    var x0 = an === "middle" ? x - w / 2 : an === "end" ? x - w : x, pd = o.plate ? 7 : 3;
    var b = [x0 - pd, y - z * 0.8 - pd + 1, x0 + w + pd, y + (lines.length - 1) * lh + z * 0.25 + pd - 1];
    if (t) {
      var ax, ay;
      if (o.from) { ax = o.from[0]; ay = o.from[1]; }
      else if (t[1] > b[3]) { ax = cl(t[0], b[0] + 10, b[2] - 10); ay = b[3]; }
      else if (t[1] < b[1]) { ax = cl(t[0], b[0] + 10, b[2] - 10); ay = b[1]; }
      else { ax = t[0] < b[0] ? b[0] : b[2]; ay = cl(t[1], b[1] + 4, b[3] - 4); }
      s += K("M" + n(ax) + " " + n(ay) + " L" + t[0] + " " + t[1], L, 1.2) + C(t[0], t[1], 1.8, L, 0);
    }
    if (o.plate) s += R(b[0], b[1], b[2] - b[0], b[3] - b[1], SHEET, 1.6, 6, ' class="pl"');
    lines.forEach(function (l, i) { s += txt(x, y + i * lh, l, { size: z, anchor: an, fill: (o.fills && o.fills[i]) || o.fill }); });
    return s;
  }
  function note(x, y, w, h, lines, o) {   // a sticky note or index card
    o = o || {};
    var s = '<g transform="rotate(' + (o.rot || 0) + " " + (x + w / 2) + " " + (y + h / 2) + ')">' + R(x, y, w, h, o.fill || NOTE, 2, 3);
    if (o.tape) s += R(x + w / 2 - 16, y - 6, 32, 12, "rgba(156,203,234,.8)", 0, 0, ' stroke="rgba(74,46,30,.4)" stroke-width="1.2" transform="rotate(3 ' + (x + w / 2) + " " + y + ')"');
    lines.forEach(function (ln, i) { s += txt(x + 9, y + 20 + i * 18, ln, { size: o.size || 15, sign: i === 0 && o.head }); });
    return s + "</g>";
  }
  function bubble(x, y, w, h, tx, ty, o) {   // a speech bubble with a tail to (tx, ty), or a thought bubble trailing circles
    o = o || {};
    var s = R(x, y, w, h, SHEET, 2, 14), bx = cl(tx, x + 24, x + w - 24), by = ty > y + h ? y + h : y;
    if (o.thought) { for (var i = 1; i <= 3; i++) { var k = i / 4; s += C(bx + (tx - bx) * k, by + (ty - by) * k, 6 - i * 1.3, SHEET, 1.8); } }
    else s += P("M" + (bx - 9) + " " + (by + (ty > by ? -1.5 : 1.5)) + " L" + tx + " " + ty + " L" + (bx + 9) + " " + (by + (ty > by ? -1.5 : 1.5)), SHEET, 2);
    return s;
  }
  function cloud(x, y, sc) { return G("translate(" + x + " " + y + ") scale(" + (sc || 1) + ")", P("M-34 10 a14 14 0 0 1 6 -22 a18 18 0 0 1 32 -8 a14 14 0 0 1 24 10 a12 12 0 0 1 4 20 z", SHEET, 2)); }
  function tree(x, y, sc) {
    return G("translate(" + x + " " + y + ") scale(" + (sc || 1) + ")", R(-5, -40, 10, 40, WOOD, 2) + C(0, -62, 28, GRASS, 2.5) + C(-18, -48, 16, GRASS, 2) + C(16, -46, 15, GRASS, 2) + K("M-8 -70 q6 -6 12 -2", "#7DB85A", 3));
  }
  function lamp(x, y, h) { h = h || 96; return K("M" + x + " " + y + " V" + (y - h) + " h14", L, 4) + P("M" + (x + 6) + " " + (y - h) + " h18 l-3 9 h-12 z", "#4F6B5C", 2) + C(x + 15, y - h + 11, 3.5, NOTE, 1.5) + R(x - 6, y - 6, 12, 6, "#4F6B5C", 2, 1); }
  function bench(x, y) { return R(x, y - 18, 64, 7, WOOD, 2, 2) + R(x, y - 30, 64, 6, WOOD, 2, 2) + K("M" + (x + 8) + " " + (y - 11) + " v11 M" + (x + 56) + " " + (y - 11) + " v11", L, 3); }
  function hydrant(x, y) { return R(x - 7, y - 22, 14, 22, BRICK, 2, 3) + P("M" + (x - 8) + " " + (y - 22) + " a8 7 0 0 1 16 0 z", BRICK, 2) + R(x - 11, y - 16, 22, 5, BRICK, 1.5, 2); }
  // A Busytown storefront in elevation; (x, y) = top-left of the facade, standing on y + h.
  function shop(x, y, w, h, col, o) {
    o = o || {};
    var s = R(x, y, w, h, col, 2.5) + R(x - 6, y - 14, w + 12, 16, o.roof || WOOD, 2.5);
    var k = Math.max(1, Math.floor(w / 40));
    for (var i = 0; i < k; i++) { var wx = k === 1 ? x + w / 2 - 9 : x + 12 + i * ((w - 42) / (k - 1)); s += R(wx, y + 10, 18, 18, SKY, 2, 2) + K("M" + (wx + 9) + " " + (y + 10) + " v18", L, 1.2); }
    var ay = y + h - 44, d = "M" + x + " " + ay + " h" + w + " v10 ", m = Math.floor(w / 12);
    for (var j = 0; j < m; j++) d += "l-" + n(w / m / 2) + " 8 l-" + n(w / m / 2) + " -8 ";
    s += P(d + "z", o.awning || BRICK, 2);
    for (j = 1; j < m; j += 2) s += K("M" + n(x + j * w / m) + " " + (ay + 1) + " v10", SHEET, 4, ' opacity=".55"');
    s += R(x + 6, y + h - 66, w - 12, 18, SHEET, 1.5, 3) + txt(x + w / 2, y + h - 52.5, o.sign, { size: 13, anchor: "middle", sign: true });
    s += R(x + w / 2 - 11, y + h - 30, 22, 30, WOOD, 2, 3) + C(x + w / 2 + 6, y + h - 15, 1.6, L, 0);
    if (o.goods) s += o.goods(x, y + h);
    return s;
  }
  function loaves(x, y) { return E(x + 14, y - 12, 8, 5, SAND, 1.5) + E(x + 26, y - 10, 8, 5, WOOD, 1.5); }

  /* ---------- the cast ---------- */
  // A rounded Busytown worker standing about 75 tall; (x, y) = feet centre. lh / rh = hand offsets from the hip.
  function person(x, y, o) {
    o = o || {};
    var sk = o.skin || SKIN, sh = o.shirt || SKY, pc = o.pants || "#59606A", hip = y - (o.sit ? 12 : 22), s = "", top = hip - 28, hy = top - 12;
    if (!o.noLegs) s += R(x - 10, hip, 8, y - hip, pc, 2, 3) + R(x + 2, hip, 8, y - hip, pc, 2, 3) + E(x - 7, y, 6, 3, L, 0) + E(x + 7, y, 6, 3, L, 0);
    s += R(x - 14, top, 28, 32, sh, 2, 9);
    if (o.vest) s += R(x - 14, top, 28, 32, VEST, 2, 9) + P("M" + (x - 7) + " " + top + " L" + x + " " + (top + 10) + " L" + (x + 7) + " " + top + " z", sh, 1.5) + R(x - 13.5, top + 14, 27, 4, SILVER, 1.2) + R(x - 13.5, top + 22, 27, 4, SILVER, 1.2);
    if (o.overalls) s += R(x - 9, top + 9, 18, 23, SHEET, 1.5, 3) + K("M" + (x - 8) + " " + (top + 10) + " L" + (x - 11) + " " + (top + 1) + " M" + (x + 8) + " " + (top + 10) + " L" + (x + 11) + " " + (top + 1), L, 1.5) + C(x - 3, top + 17, 1.8, YEL, 0) + C(x + 4, top + 24, 1.5, YEL, 0);
    var sy = top + 6, lh = [x + (o.lh ? o.lh[0] : -24), hip + (o.lh ? o.lh[1] : -10)], rh = [x + (o.rh ? o.rh[0] : 24), hip + (o.rh ? o.rh[1] : -10)];
    [[x - 13, lh], [x + 13, rh]].forEach(function (a) { var d = "M" + a[0] + " " + sy + " L" + n(a[1][0]) + " " + n(a[1][1]); s += K(d, L, 7) + K(d, sh, 3.5); });
    s += C(lh[0], lh[1], 4, sk, 1.5) + C(rh[0], rh[1], 4, sk, 1.5);
    s += C(x, hy, 13, sk, 2) + C(x - 4, hy - 1, 1.6, L, 0) + C(x + 4, hy - 1, 1.6, L, 0) + C(x - 8, hy + 3, 2.4, "#E79C86", 0, ' opacity=".6"') + C(x + 8, hy + 3, 2.4, "#E79C86", 0, ' opacity=".6"');
    var m = o.mouth;
    s += m === "o" ? E(x, hy + 6, 2.2, 2.8, L, 0) : m === "frown" ? K("M" + (x - 4) + " " + (hy + 7) + " q4 -3 8 0", L, 1.5) : m === "flat" ? K("M" + (x - 3) + " " + (hy + 6) + " h6", L, 1.5) : K("M" + (x - 4) + " " + (hy + 4) + " q4 3.5 8 0", L, 1.5);
    if (o.stache) s += P("M" + (x - 6) + " " + (hy + 4) + " q3 -3 6 0 q3 -3 6 0 q-6 3 -12 0 z", L, 0);
    if (o.hair) s += P("M" + (x - 13) + " " + (hy - 2) + " a13 13 0 0 1 26 0 v-2 a13 13 0 0 0 -26 0 z", o.hair, 1.5);
    var hc = o.hatCol || BRICK;
    if (o.hat === "cap") s += P("M" + (x - 13) + " " + (hy - 4) + " a13 13 0 0 1 26 0 z", hc, 2) + R(x + (o.capL ? -18 : -2), hy - 7, 20, 5, hc, 1.5, 2);
    if (o.hat === "visor") s += P("M" + (x - 14) + " " + (hy - 4) + " h28 l-4 -7 h-20 z", GRASS, 1.5) + K("M" + (x + 12) + " " + (hy - 1) + " l7 -9", YEL, 2.4);
    if (o.hat === "beret") s += E(x + 2, hy - 11, 13, 5, hc, 2);
    return s;
  }
  // The master's teleoperation box: two sticks and an antenna; (x, y) = box centre.
  function remote(x, y, aDir) {
    var ad = aDir || 1;
    return K("M" + (x + 12 * ad) + " " + (y - 6) + " l" + 10 * ad + " -22", L, 2.5) + C(x + 22 * ad, y - 30, 3, BRICK, 1.5) + R(x - 15, y - 8, 30, 16, STEEL, 2, 4) +
      K("M" + (x - 6) + " " + (y - 7) + " l-2 -7 M" + (x + 6) + " " + (y - 7) + " l2 -7", L, 2.5) + C(x - 8, y - 15, 3, BRICK, 1.5) + C(x + 8, y - 15, 3, YEL, 1.5) + C(x, y + 2, 1.6, L, 0);
  }
  // The striper: a small three-wheeled line-marking robot, school-bus yellow, paint tank on top, nozzle at the front
  // dripping one drop, a camera mast. (x, y) = ground under its middle; faces right; the drop lands at (x + 54·sc, y).
  function striper(x, y, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = '<g transform="translate(' + n(x) + " " + n(y) + ") scale(" + sc + ')"' + (o.ghost ? ' opacity=".38"' : "") + ">";
    if (o.seat) s += K("M-46 -36 H-70 M-46 -22 H-62 V-34", L, 3.5) + R(-84, -40, 44, 6, WOOD, 2, 2) + R(-86, -66, 6, 32, WOOD, 2, 2) + R(-80, -26, 32, 5, STEEL, 1.8, 2);
    s += C(-19, -16, 12, "#3A2A20", 2) + C(-19, -16, 4, STEEL, 1.5);   // the far rear wheel, peeking
    s += K("M18 -52 V-90", L, 6) + K("M18 -52 V-90", STEEL, 2.5) + R(6, -104, 26, 15, STEEL, 2, 4) + C(32, -96.5, 6, SKY, 2) + C(32, -96.5, 2.2, L, 0) + C(11, -100, 2, BRICK, 0);
    s += R(-36, -75, 44, 26, STEEL, 2.5, 12) + R(-36, -68, 44, 8, YEL, 1.5) + P("M-28 -60 q-2 5 0 6 q2 -1 0 -6 z M-12 -60 q-2 7 0 8 q2 -1 0 -8 z M2 -60 q-2 4 0 5 q2 -1 0 -5 z", YEL, 1.2) + R(-20, -81, 12, 7, STEEL, 2, 2);
    s += R(-46, -52, 92, 36, YEL, 2.5, 11) + R(-46, -33, 92, 5, "#D9A514", 1.4);
    if (o.gauge != null) {
      var a = Math.PI * (1 - o.gauge), gx = -22, gy = -36;
      s += P("M" + (gx - 11) + " " + gy + " a11 11 0 0 1 22 0 z", SHEET, 1.8) + P("M" + (gx - 9) + " " + gy + " a9 9 0 0 1 3 -6.6", "none", 0, ' stroke="' + BAD + '" stroke-width="2.6"') +
        K("M" + gx + " " + gy + " l" + n(Math.cos(a) * 9) + " " + n(-Math.sin(a) * 9), L, 2) + C(gx, gy, 1.8, L, 0);
    }
    s += R(16, -48, 24, 17, SHEET, 2, 5);
    var f = o.face;
    if (f === "dizzy") s += K("M20 -43 l4 4 m0 -4 l-4 4 M29 -43 l4 4 m0 -4 l-4 4", L, 1.6) + K("M23 -34.5 q3 -2 6 0", L, 1.4);
    else if (f === "worried") s += C(23, -40, 2, L, 0) + C(32, -40, 2, L, 0) + K("M20 -43.5 l5 -2 M35 -43.5 l-5 -2", L, 1.4) + E(27.5, -35, 1.8, 1.4, L, 0);
    else if (f === "flat") s += C(23, -40, 2, L, 0) + C(32, -40, 2, L, 0) + K("M24 -35 h7", L, 1.5);
    else if (f === "asleep") s += K("M21 -40 h4 M30 -40 h4", L, 1.8) + K("M24 -35 h7", L, 1.4);
    else s += C(23, -40, 2, L, 0) + C(32, -40, 2, L, 0) + K("M23.5 -36 q4 3 8 0", L, 1.5);
    s += K("M44 -24 h10 v13", L, 6.5) + K("M44 -24 h10 v13", STEEL, 3) + P("M50 -12 h8 l-2 5 h-4 z", STEEL, 1.8);
    if (o.drip !== false) s += P("M54 -5 c-2.5 3.5 -3.5 5.5 0 7 c3.5 -1.5 2.5 -3.5 0 -7 z", YEL, 1.4);
    s += C(-26, -14, 14, "#3A2A20", 2) + C(-26, -14, 5, STEEL, 1.5) + K("M28 -18 v6", L, 4) + C(28, -8, 8, "#3A2A20", 2) + C(28, -8, 3, STEEL, 1.5);
    return s + (o.extra || "") + "</g>";
  }
  // The notebook: a spiral notebook lying open, sketches of the street on its pages, dog-eared, sticky tabs.
  // pages: one entry per sketch (0 = line dead centre, "r" = off the line with the master's arrow back). (x, y) = top-left.
  function notebook(x, y, w, h, o) {
    o = o || {};
    var s = "", hw = w / 2, per = o.per || 2, pages = o.pages || [0, 0, 0, 0];
    (o.tabs || []).forEach(function (c, i) { s += R(x + hw + 16 + i * 17, y - 10, 13, 16, c, 1.5, 2); });
    s += R(x - 6, y - 4, w + 12, h + 9, o.cover || BRICK, 2.5, 6) + R(x, y, hw, h, SHEET, 2, 3) + R(x + hw, y, hw, h, SHEET, 2, 3);
    var ph = (h - 10) / per - 6, pw = hw - 22;
    pages.forEach(function (k, i) {
      var p = Math.floor(i / per), r = i % per, px = x + p * hw + (p ? 15 : 8), py = y + 7 + r * (ph + 6), my = py + ph / 2;
      s += R(px, py, pw, ph, ASPH, 1.4, 2) + K("M" + px + " " + (py + 3) + " h" + pw + " M" + px + " " + (py + ph - 3) + " h" + pw, KERB, 1.5);
      if (k === "r") s += K("M" + (px + 3) + " " + (my + ph * 0.28) + " q" + n(pw * 0.45) + " 0 " + n(pw - 6) + " " + n(-ph * 0.28), YEL, 3) + K("M" + (px + 14) + " " + (my + ph * 0.3) + " v" + n(-ph * 0.26) + " m-3 3 l3 -3 l3 3", GRASS, 2);
      else s += K("M" + (px + 3) + " " + n(my + k) + " h" + (pw - 6), YEL, 3);
    });
    for (var yy = y + 6; yy < y + h - 2; yy += 9) s += E(x + hw, yy, 5, 2.4, "none", 1.6);
    if (o.dog !== false) {
      s += P("M" + (x + w - 15) + " " + (y + h) + " L" + (x + w) + " " + (y + h - 15) + " L" + (x + w) + " " + (y + h) + " z", o.cover || BRICK, 0) + P("M" + (x + w - 15) + " " + (y + h) + " L" + (x + w) + " " + (y + h - 15) + " L" + (x + w - 15) + " " + (y + h - 15) + " z", "#EDE3CB", 1.5);
      s += P("M" + x + " " + (y + 13) + " L" + (x + 13) + " " + y + " L" + x + " " + y + " z", o.cover || BRICK, 0) + P("M" + x + " " + (y + 13) + " L" + (x + 13) + " " + y + " L" + (x + 13) + " " + (y + 13) + " z", "#EDE3CB", 1.5);
    }
    return s;
  }
  function dot(x, y, r, f) {
    if (f !== "hatch") return C(x, y, r, f, r < 3 ? 1.1 : 1.5);
    var k = r * 0.62;
    return C(x, y, r, SHEET, 1.5) + K("M" + n(x - k) + " " + n(y + k) + " L" + n(x + k) + " " + n(y - k) + " M" + n(x - r * 0.95) + " " + n(y + r * 0.1) + " L" + n(x - r * 0.1) + " " + n(y - r * 0.95) + " M" + n(x + r * 0.1) + " " + n(y + r * 0.95) + " L" + n(x + r * 0.95) + " " + n(y - r * 0.1), L, 1.1);
  }
  // The work order: a clipboard with a strip of waypoint dots. o.col(i) colours dot i; o.bend(t) lifts the strip.
  function order(x, y, w, h, o) {
    o = o || {};
    var s = R(x, y, w, h, WOOD, 2.5, 5) + R(x + 6, y + 9, w - 12, h - 14, SHEET, 1.5, 2) + R(x + w / 2 - 15, y - 5, 30, 11, STEEL, 2, 3);
    if (o.title) s += txt(x + 13, y + 25, o.title, { size: o.ts || 11, sign: true });
    if (o.wet) s += R(x + w * 0.55, y + h - (o.db || 16) - 7, w * 0.14, 14, CEM, 1.2, 2);
    var N = o.n || 50, x0 = x + 15, x1 = x + w - 15, yb = y + h - (o.db || 16), r = o.r || 2.1;
    for (var i = 0; i < N; i++) { var t = i / (N - 1); s += dot(x0 + t * (x1 - x0), yb + (o.bend ? o.bend(t) : 0), r, o.col ? o.col(i) : i < (o.k || 0) ? YEL : SHEET); }
    return s;
  }
  function stopwatch(x, y, r, frac) {
    var a = Math.PI * 2 * (frac || 0.3), ex = x + Math.sin(a) * (r - 3), ey = y - Math.cos(a) * (r - 3);
    return R(x - 3, y - r - 7, 6, 6, STEEL, 1.5, 1) + K("M" + n(x + r * 0.7) + " " + n(y - r * 0.7) + " l4 -4", L, 3) + C(x, y, r, SHEET, 2.2) +
      P("M" + x + " " + y + " L" + x + " " + (y - r + 3) + " A" + (r - 3) + " " + (r - 3) + " 0 " + (frac > 0.5 ? 1 : 0) + " 1 " + n(ex) + " " + n(ey) + " z", "#F2C2B5", 0) +
      K("M" + x + " " + y + " L" + n(ex) + " " + n(ey), BAD, 2) + C(x, y, 1.8, L, 0);
  }
  // The drafting desk: a booth on the pavement with a slanted drafting table, a lamp, a stopwatch and the draughtsperson.
  // (x, y) = base centre; about 190 tall at sc = 1.
  function kiosk(x, y, sc, watch) {
    var s = '<g transform="translate(' + x + " " + y + ") scale(" + sc + ')">';
    s += R(-80, -150, 160, 150, SAND, 2.5, 2) + P("M-94 -148 L0 -190 L94 -148 z", BRICK, 2.5) + R(-56, -174, 112, 22, MAST, 2.2, 4) + txt(0, -158, "DRAFTING", { size: 14, sign: true, anchor: "middle", fill: PAPER, ls: 1 });
    s += R(-66, -140, 132, 94, PAPER, 2.5, 3);
    if (watch !== false) s += stopwatch(46, -116, 12, 0.35);
    s += P("M-39 -121 L-54 -78 H4 L-21 -121 z", NOTE, 0, ' opacity=".55"') + K("M-62 -140 L-48 -116 L-30 -131", L, 3) + P("M-39 -120 a9 9 0 0 1 18 0 z", GRASS, 2);
    s += person(-6, -40, { shirt: LILAC, skin: SKIN3, hat: "visor", hair: L, lh: [-22, -20], rh: [26, -26] });
    s += P("M-50 -70 L42 -88 L48 -76 L-44 -58 z", SHEET, 2) + K("M-36 -70 L30 -83", BRICK, 1, ' stroke-dasharray="2 3"') + K("M18 -88 l9 -9", YEL, 3) + K("M18 -88 l9 -9", L, 1);
    s += R(-82, -50, 164, 50, WOOD, 2.5, 2) + K("M-82 -38 H82", L, 1.2) + txt(0, -16, "WORK ORDERS", { size: 13, sign: true, anchor: "middle", fill: PAPER });
    return s + "</g>";
  }
  function megaphone(x, y, ang) { return G("rotate(" + ang + " " + x + " " + y + ")", R(x - 7, y - 3, 8, 7, L, 0, 2) + P("M" + x + " " + (y - 4) + " L" + (x + 20) + " " + (y - 11) + " L" + (x + 20) + " " + (y + 11) + " L" + x + " " + (y + 4) + " z", SHEET, 2) + E(x + 20, y, 3, 11, BRICK, 2)); }
  // The committee: painters in overalls behind a table, each holding up a work order. (x, y) = table centre, feet line.
  function committee(x, y, orders) {
    var s = "", k = orders.length, sp = 86, x0 = x - (k - 1) * sp / 2, hats = [LEFT, BRICK, RIGHT, GRASS], skins = [SKIN, SKIN3, SKIN2, SKIN];
    orders.forEach(function (o, i) {
      var px = x0 + i * sp, hip = y - 22, up = i % 2 ? 10 : 0;
      s += person(px, y, { overalls: true, shirt: [SKY, NOTE, LILAC, SAND][i], skin: skins[i], hat: "cap", hatCol: hats[i], lh: [-16, -60 - up], rh: [16, -60 - up], mouth: o.mouth, capL: i === 0 });
      s += order(px - 55, hip - 118 - up, 110, 60, { n: 13, r: 2.8, db: 18, bend: o.bend, col: o.col, wet: true, title: o.title, ts: 10 });
      s += C(px - 16, hip - 59 - up, 4, skins[i], 1.5) + C(px + 16, hip - 59 - up, 4, skins[i], 1.5);
    });
    return s + R(x - (k * sp) / 2 - 6, y - 26, k * sp + 12, 9, WOOD, 2.5, 2) + K("M" + (x - (k * sp) / 2 + 6) + " " + (y - 17) + " v20 M" + (x + (k * sp) / 2 - 6) + " " + (y - 17) + " v20", L, 4);
  }
  function cone(x, y) { return R(x - 12, y - 4, 24, 5, CONE, 1.8, 2) + P("M" + (x - 9) + " " + (y - 4) + " L" + (x - 3) + " " + (y - 26) + " h6 L" + (x + 9) + " " + (y - 4) + " z", CONE, 2) + P("M" + (x - 6.5) + " " + (y - 12) + " L" + (x - 4.8) + " " + (y - 18) + " h9.6 L" + (x + 6.5) + " " + (y - 12) + " z", SHEET, 0); }
  function wetSign(x, y) { return K("M" + x + " " + y + " v-26", L, 3.5) + R(x - 25, y - 50, 50, 26, SHEET, 2.2, 4) + R(x - 22, y - 47, 44, 20, "none", 0, 3, ' stroke="' + CONE + '" stroke-width="2.5"') + txt(x, y - 31.5, "WET", { size: 15, sign: true, anchor: "middle", fill: BAD }); }
  // The wet-cement patch in plan: grey, roped off in red on little posts. o.tracks = [x0, x1, y] tyre tracks in cement red.
  function cement(x, y, w, h, o) {
    o = o || {};
    var s = R(x, y, w, h, CEM, 2.5, 8), r = rnd(7), d = "";
    for (var i = 0; i < 14; i++) d += "M" + n(x + 12 + r() * (w - 34)) + " " + n(y + 10 + r() * (h - 20)) + " q6 -4 12 0 ";
    s += K(d, "#A9A397", 1.6);
    if (o.tracks) { var t = o.tracks; s += K("M" + t[0] + " " + (t[2] - 7) + " H" + t[1] + " M" + t[0] + " " + (t[2] + 7) + " H" + t[1], BAD, 3.5, ' stroke-dasharray="5 3"'); }
    var px = [x - 8, x + w / 2, x + w + 8], py = [y - 8, y + h + 8], rope = "";
    rope = "M" + px[0] + " " + py[0] + " Q" + (px[0] + px[1]) / 2 + " " + (py[0] + 6) + " " + px[1] + " " + py[0] + " Q" + (px[1] + px[2]) / 2 + " " + (py[0] + 6) + " " + px[2] + " " + py[0] +
      " Q" + (px[2] - 6) + " " + (py[0] + py[1]) / 2 + " " + px[2] + " " + py[1] + " Q" + (px[1] + px[2]) / 2 + " " + (py[1] - 6) + " " + px[1] + " " + py[1] + " Q" + (px[0] + px[1]) / 2 + " " + (py[1] - 6) + " " + px[0] + " " + py[1] + " Q" + (px[0] + 6) + " " + (py[0] + py[1]) / 2 + " " + px[0] + " " + py[0];
    s += K(rope, BAD, 2.6);
    [[px[0], py[0]], [px[1], py[0]], [px[2], py[0]], [px[0], py[1]], [px[1], py[1]], [px[2], py[1]]].forEach(function (p) { s += C(p[0], p[1], 4, WOOD, 1.8); });
    return s;
  }
  function pothole(x, y, rx, ry) {
    return E(x, y, rx, ry, HOLE, 2.5) + E(x + 2, y + 2, rx * 0.62, ry * 0.5, "#2E3033", 0) +
      K("M" + (x + rx - 2) + " " + y + " l8 -3 l5 4 l8 -2 M" + (x - rx + 2) + " " + (y + 2) + " l-7 4 l-6 -3 M" + (x + 4) + " " + (y - ry + 1) + " l3 -7 l5 -2", L, 1.6);
  }
  function paint(d) { return K(d, L, 9) + K(d, YEL, 5.5); }
  function blob(x, y, rx, ry) { return E(x, y, rx, ry, YEL, 2) + E(x - rx * 0.3, y - ry * 0.3, rx * 0.32, ry * 0.3, "#F9DD7E", 0); }
  function smooth(p) {   // a Catmull-Rom curve through the points
    var d = "M" + p[0][0] + " " + p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += " C" + n(p1[0] + (p2[0] - p0[0]) / 6) + " " + n(p1[1] + (p2[1] - p0[1]) / 6) + " " + n(p2[0] - (p3[0] - p1[0]) / 6) + " " + n(p2[1] - (p3[1] - p1[1]) / 6) + " " + p2[0] + " " + p2[1];
    }
    return d;
  }
  function duck(x, y, sc, baby) {
    var s = baby ? K("M-3 -2 v4 M3 -2 v4", BILL, 2.2) + E(0, -9, 10, 7, YEL, 1.8) + C(8, -18, 6.5, YEL, 1.8) + P("M14 -19 l6 1.5 l-6 2.5 z", BILL, 1.2) + C(10, -19.5, 1.2, L, 0)
      : K("M-5 -3 v6 M5 -3 v6", BILL, 3) + P("M-16 -18 l-10 -7 l3 11 z", SHEET, 2) + E(0, -15, 19, 12, SHEET, 2) + K("M-9 -16 q9 7 18 -2", L, 1.5) + R(4, -36, 11, 16, SHEET, 0) + C(13, -34, 9.5, SHEET, 2) + R(5, -28, 9, 10, SHEET, 0) +
        P("M21 -35 l10 2 l-10 3.5 z", BILL, 1.5) + C(15, -36.5, 1.5, L, 0) + P("M5 -27 q8 4 15 -1 l-2 5 q-7 3 -13 0 z", LILAC, 1.5);
    return G("translate(" + n(x) + " " + n(y) + ") scale(" + (sc || 1) + ")", s);
  }
  function ducks(x, y, sc) { sc = sc || 1; return duck(x - 78 * sc, y - 12 * sc, sc, 1) + duck(x - 56 * sc, y - 8 * sc, sc, 1) + duck(x - 34 * sc, y - 4 * sc, sc, 1) + duck(x, y, sc); }
  function bike(x, y) {   // the order runner on a bicycle, carrying the next work order in the basket. (x, y) = ground centre
    var s = C(x - 26, y - 14, 14, "none", 2.5) + C(x + 26, y - 14, 14, "none", 2.5) + C(x - 26, y - 14, 2, L, 0) + C(x + 26, y - 14, 2, L, 0);
    var fr = "M" + (x - 26) + " " + (y - 14) + " L" + (x - 4) + " " + (y - 14) + " L" + (x + 10) + " " + (y - 36) + " L" + (x - 12) + " " + (y - 36) + " Z M" + (x - 4) + " " + (y - 14) + " L" + (x - 14) + " " + (y - 40) + " M" + (x + 26) + " " + (y - 14) + " L" + (x + 12) + " " + (y - 44);
    s += K(fr, L, 5) + K(fr, GRASS, 2.4) + R(x - 22, y - 44, 15, 5, L, 0, 2) + K("M" + (x + 12) + " " + (y - 44) + " h-8", L, 3);
    s += K("M" + (x - 10) + " " + (y - 50) + " L" + (x - 2) + " " + (y - 28) + " L" + (x - 4) + " " + (y - 14) + " M" + (x - 6) + " " + (y - 50) + " L" + (x + 6) + " " + (y - 34) + " L" + (x + 2) + " " + (y - 22), "#59606A", 6);
    s += person(x - 12, y - 38, { sit: true, noLegs: true, shirt: GRASS, hat: "cap", hatCol: YEL, skin: SKIN2, lh: [24, -8], rh: [40, -36], mouth: "o" });
    s += R(x + 12, y - 60, 28, 17, WOOD, 2, 2) + K("M" + (x + 12) + " " + (y - 52) + " h28", L, 1.2) + G("rotate(8 " + (x + 30) + " " + (y - 100) + ")", order(x + 8, y - 126, 46, 38, { n: 8, r: 2.2, db: 11, k: 8 }));
    return s + K("M" + (x - 52) + " " + (y - 40) + " h-24 M" + (x - 48) + " " + (y - 28) + " h-30 M" + (x - 54) + " " + (y - 16) + " h-18", L, 2);
  }
  /* ---------- the stage ---------- */
  // Main Street in plan: pavement (top, t - 20 .. t), asphalt (t .. b), pavement below; the master's dashed chalk guide at the centre.
  function street(t, b, o) {
    o = o || {};
    var s = R(-5, t - 20, 970, 20, KERB, 2) + R(-5, t, 970, b - t, ASPH, 0) + R(-5, b, 970, 410 - b, KERB, 2), d = "", r = rnd(o.seed || 3), i;
    for (i = 30; i < 960; i += 52) d += "M" + i + " " + (t - 19) + " v18 ";
    for (i = 10; i < 960; i += 64) d += "M" + i + " " + (b + 1) + " v" + (400 - b) + " ";
    s += K(d + "M-5 " + (b + 38) + " H965", "#BFB6A6", 1.5);
    d = ""; for (i = 0; i < 110; i++) d += "M" + n(r() * 960) + " " + n(t + 6 + r() * (b - t - 12)) + " h3 ";
    s += K(d, ASPHD, 2.2) + K("M-5 " + t + " H965 M-5 " + b + " H965", L, 3);
    if (o.chalk !== false) s += K("M-5 " + (t + b) / 2 + " H965", SHEET, 3, ' stroke-dasharray="12 10" opacity=".7"');
    return s;
  }
  function wrap(id, title, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + title + '"><title>' + title + '</title><rect width="960" height="400" fill="#E5F2FA"/>' +
      '<g stroke-linejoin="round" stroke-linecap="round">' + inner + "</g></svg>";
  }
  var BAKERY = function (x, y, w, h) { return shop(x, y, w, h, SAND, { awning: BRICK, sign: "bakery", roof: WOOD }); },
      HARDWARE = function (x, y, w, h) { return shop(x, y, w, h, GRASS, { awning: YEL, sign: "hardware" }); },
      CAFE = function (x, y, w, h) { return shop(x, y, w, h, SKY, { awning: BRICK, sign: "caf&#233;" }); },
      POST = function (x, y, w, h) { return shop(x, y, w, h, LILAC, { awning: GRASS, sign: "post office" }); };

  /* ---------- scenes ---------- */
  var scenes = {};
  scenes.s0 = function () {
    var s = cloud(300, 74, 0.9) + cloud(700, 70, 0.8);
    s += BAKERY(20, 52, 120, 104) + HARDWARE(152, 52, 120, 104) + CAFE(688, 52, 120, 104) + POST(820, 52, 120, 104);
    s += tree(318, 156, 0.9) + lamp(410, 156) + lamp(540, 156) + tree(634, 156, 0.9);
    s += street(176, 318);
    s += paint("M-5 247 H600") + striper(546, 251, 1) + K("M561 140 a8 8 0 0 1 14 -4 M556 134 a14 14 0 0 1 24 -7", L, 1.6);
    s += ducks(912, 306, 0.85);
    s += person(84, 390, { vest: true, shirt: SKY, hat: "cap", hatCol: BRICK, lh: [10, -2], rh: [34, -2] }) + remote(108, 362, 1);
    s += R(420, 352, 46, 7, WOOD, 2, 2) + K("M426 359 v32 M460 359 v32", L, 3.5) + P("M418 352 l4 -16 h21 l2 3 l2 -3 h21 l2 16 z", SHEET, 2) + K("M443 338 v13", L, 1.5) + K("M425 346 h16 M447 346 h16", YEL, 2.5) + K("M426 341 h12 M448 341 h12", SKY, 1.2);
    s += board(330, 8, 300, "MAIN STREET");
    s += label(152, 336, "the master = the human demonstrator", [97, 326]);
    s += label(152, 362, "joystick = teleoperation", [124, 362]);
    s += label(486, 350, ["the logbook", "= the demonstrations"], [466, 344]);
    s += label(320, 290, ["the striper = the robot", "its steering rule = the policy"], [514, 230], { plate: true });
    s += note(736, 328, 196, 58, ["20 runs logged,", "every one on the line"], { rot: -2, tape: true }) + hydrant(672, 388);
    return wrap("s0", "Main Street from above, with shops along the top: a bakery, a hardware store, a cafe and a post office. A small yellow three-wheeled line-marking robot, the striper, paints a clean yellow centre line along the street. On the pavement the master, a road-crew painter in a high-visibility vest and cap, steers it with a joystick box. Beside him a logbook lies open on a stool, and a sticky note reads: 20 runs logged, every one on the line. A family of ducks crosses ahead.", s);
  };
  scenes.s1 = function () {
    var s = cloud(150, 40, 0.8) + cloud(660, 46, 0.7) + tree(40, 76, 0.75) + lamp(120, 76, 58) + tree(250, 76, 0.7) + lamp(640, 76, 58);
    s += street(96, 236, { seed: 5 });
    var pts = [[262, 169]], off = function (x) { return 4 * Math.exp(0.00648 * (x - 262)); };
    for (var x = 300; x <= 680; x += 38) pts.push([x, n(166 + off(x))]);
    s += paint("M-5 166 H224") + pothole(250, 166, 24, 11) + E(246, 168, 6, 2.5, YEL, 0) + paint(smooth(pts));
    [400, 490, 580].forEach(function (x) { var e = off(x) + 2; s += K("M" + x + " 166 V" + n(166 + e) + " M" + (x - 6) + " 166 h12 M" + (x - 6) + " " + n(166 + e) + " h12", BAD, 2.6); });
    var ex = pts[pts.length - 1];
    s += striper(ex[0] - 49, ex[1] + 2, 0.9, { face: "worried" });
    s += bubble(724, 16, 220, 112, 668, 140, { thought: true }) + R(736, 30, 84, 58, SHEET, 1.8, 3) + R(742, 44, 72, 30, ASPH, 1.4, 2) + K("M745 59 h66", YEL, 3) + K("M742 47 h72 M742 71 h72", KERB, 1.5) + K("M746 37 h40", SKY, 1.5);
    s += txt(830, 50, "nearest page:", { size: 15 }) + txt(830, 70, "on the line,", { size: 15 }) + txt(830, 90, "steer gently", { size: 15 }) + txt(736, 112, "the page it remembers", { size: 13, fill: "#7A5A48" });
    s += notebook(40, 266, 320, 118, { per: 3, pages: [0, 0, 0, 0, 0, 0], tabs: [YEL, YEL, YEL] });
    s += bench(820, 300) + ducks(920, 380, 0.8);
    s += board(330, 8, 300, "OFF THE MAP");
    s += label(250, 130, "pothole = a disturbance", [250, 155], { anchor: "middle", plate: true });
    s += label(300, 218, "small error → bigger error = compounding", [580, 183], { plate: true });
    s += label(386, 290, ["the notebook: every page shows", "the line dead centre", "= no recoveries in the data"], [362, 300]);
    s += label(612, 290, ["the apprentice: copied", "the master's moves", "(behaviour cloning)"], [650, 232]);
    return wrap("s1", "Main Street from above. The striper hit a pothole; after it, its yellow line drifts away from the chalk guide in a growing curve until it nearly reaches the kerb, with red markers showing the gap getting bigger. The worried striper thinks of the nearest page in its notebook: on the line, steer gently. Below, its spiral notebook lies open: every page shows a sketch of the street with the line dead centre.", s);
  };
  scenes.s2 = function () {
    var s = cloud(320, 80, 0.75) + cloud(620, 76, 0.8);
    s += CAFE(18, 52, 112, 104) + BAKERY(142, 52, 112, 104) + HARDWARE(712, 52, 112, 104) + POST(836, 52, 106, 104);
    s += street(176, 318, { seed: 9 });
    var w = [[262, 250], [300, 258], [340, 268], [380, 272], [420, 267], [460, 257], [500, 249], [540, 245], [580, 247], [690, 247]];
    s += paint("M-5 247 H226") + pothole(250, 247, 22, 10) + paint(smooth(w));
    [[320, 263], [370, 271], [420, 267], [468, 255]].forEach(function (a) { s += K("M" + a[0] + " " + (a[1] + 8) + " V" + 249, GRASS, 6.5) + K("M" + a[0] + " " + (a[1] + 8) + " V" + 249, "#9BD27A", 2.5) + P("M" + (a[0] - 6) + " 252 l6 -8 l6 8 z", GRASS, 1.5); });
    s += striper(636, 251, 1, { seat: true });
    s += person(581, 223, { sit: true, vest: true, shirt: SKY, hat: "cap", hatCol: BRICK, lh: [-24, -26], rh: [16, -8], mouth: "o", capL: true }) + megaphone(557, 185, 208) + R(603, 191, 4, 8, GRASS, 1, 1) + R(586, 196, 22, 15, SHEET, 1.5, 2) + K("M597 196 v15 M589 202 h5 M600 202 h5", L, 1);
    s += bubble(372, 68, 168, 54, 534, 166, {}) + txt(456, 90, "you're off the line here:", { size: 15, anchor: "middle" }) + txt(456, 110, "steer left, back to it!", { size: 15, anchor: "middle" });
    s += notebook(30, 334, 236, 54, { per: 1, pages: [0, "r"], tabs: [YEL, YEL, GRASS, GRASS], dog: false });
    s += ducks(915, 388, 0.75);
    s += board(250, 8, 460, "THE MASTER RIDES ALONG");
    s += label(290, 356, ["new pages (green tabs)", "= aggregated data"], [242, 330]);
    s += label(500, 356, ["the master labels where the striper", "actually is = DAgger"], [420, 278]);
    s += label(300, 210, "a wobble, then back to the line", [380, 264], { plate: true });
    return wrap("s2", "Main Street from above. The master now rides on a little seat on the back of the striper, calling corrections through a megaphone: you are off the line here, steer left, back to it. After a pothole the painted line wobbles off the centre and comes back, with green chalk arrows at each spot pointing back to the line. Below, the notebook lies open with new green-tabbed pages showing the line off centre and an arrow back.", s);
  };
  scenes.s3 = function () {
    var s = cloud(520, 92, 0.8) + cloud(860, 60, 0.7);
    s += POST(600, 172, 110, 124) + CAFE(722, 172, 110, 124) + HARDWARE(844, 172, 110, 124);
    s += R(-5, 296, 970, 20, KERB, 2) + K("M40 297 v18 M120 297 v18 M200 297 v18 M280 297 v18 M360 297 v18 M440 297 v18 M520 297 v18 M600 297 v18 M680 297 v18 M760 297 v18 M840 297 v18 M920 297 v18", "#BFB6A6", 1.5);
    s += R(-5, 316, 970, 90, ASPH, 0) + K("M-5 316 H965", L, 3);
    var r = rnd(4), d = ""; for (var i = 0; i < 50; i++) d += "M" + n(r() * 960) + " " + n(322 + r() * 72) + " h3 "; s += K(d, ASPHD, 2.2);
    s += paint("M-5 346 H732") + blob(196, 346, 22, 7) + blob(470, 346, 28, 8);
    s += E(734, 348, 54, 15, "none", 1.5, ' stroke-dasharray="5 5"') + blob(734, 348, 40, 11);
    s += kiosk(160, 300, 1.12, false) + K("M64 120 h-14 v10", L, 3) + stopwatch(50, 152, 20, 0.62);
    s += K("M300 300 L318 236 M546 300 L528 236 M423 236 V300", L, 4) + order(290, 156, 270, 84, { title: "WORK ORDER No. 7", ts: 13, n: 50, k: 25, r: 2.3, db: 22 }) + txt(306, 202, "yellow: drive these 25", { size: 13 }) + txt(546, 202, "white: preview", { size: 13, anchor: "end" });
    s += striper(680, 350, 1.05, { face: "flat" });
    s += board(330, 8, 300, "THE DRAFTING DESK");
    s += label(16, 74, ["drafting time", "= inference latency"], [42, 134]);
    s += label(282, 76, "the drafting desk = the policy, thinking", [232, 148]);
    s += label(574, 112, ["work order = an action chunk", "(50 waypoints)"], [552, 162]);
    s += label(300, 386, "stopped with the nozzle open = a blob (synchronous inference)", [704, 354], { plate: true });
    s += label(808, 296, ["it waits, nozzle", "open, for the", "next order"], [722, 306], { plate: true, size: 14 });
    return wrap("s3", "Side view of the pavement. A little booth labelled drafting holds a draughtsperson at a slanted drafting table under a lamp; a stopwatch hangs on the booth. On an easel stands a clipboard work order with a strip of fifty dots, the first twenty-five filled yellow. On the road the striper has stopped with its nozzle open, waiting for the next order, and a yellow puddle of paint is spreading under it; earlier blobs dot the line behind it.", s);
  };
  scenes.s4 = function () {
    var s = cloud(560, 84, 0.75);
    s += POST(664, 52, 128, 104) + BAKERY(804, 52, 136, 104) + tree(600, 156, 0.85);
    s += street(176, 318, { seed: 12 });
    s += cement(560, 214, 140, 66, { tracks: [560, 648, 247] }) + cone(544, 226) + cone(544, 296) + wetSign(744, 268);
    s += paint("M-5 247 H230") + striper(176, 251, 0.95);
    var bump = function (x) { return ss((x - 240) / 260) * (1 - ss((x - 760) / 170)); };
    for (var x = 246; x <= 940; x += 17) { s += dot(x, n(247 - 58 * bump(x)), 4, LEFT) + dot(x, n(247 + 56 * bump(x)), 4, RIGHT); }
    for (x = 246; x <= 646; x += 17) s += dot(x, 247, 4, BAD);
    s += K("M656 239 l14 14 M670 239 l-14 14", BAD, 3.5);
    var sn = function (t) { return Math.sin(Math.PI * t); };
    s += committee(165, 168, [
      { bend: function (t) { return -16 * sn(t); }, col: function () { return LEFT; }, title: "LEFT" },
      { bend: function () { return 0; }, col: function () { return BAD; }, title: "AVERAGE", mouth: "flat" },
      { bend: function (t) { return 16 * sn(t); }, col: function () { return RIGHT; }, title: "RIGHT" }]);
    s += board(330, 8, 300, "THE COMMITTEE");
    s += label(340, 72, ["votes from overlapping orders", "= temporal ensembling (ACT)"], [302, 64]);
    s += label(240, 356, ["left + right, averaged", "= straight into the cement"], [420, 251]);
    s += label(660, 356, ["wet cement = where the", "demonstrations split"], [640, 284]);
    s += label(846, 204, "went left", [830, 214], { plate: true, size: 14, fill: LEFT }) + label(846, 296, "went right", [830, 281], { plate: true, size: 14, fill: RIGHT });
    s += ducks(116, 392, 0.7);
    return wrap("s4", "Main Street from above. Ahead of the striper a patch of wet cement is roped off in red, with two orange cones and a WET sign. Blue dots curve round it on the left and purple dots round it on the right. On the pavement a committee of three painters holds up overlapping work orders: one going left in blue, one going right in purple, and in the middle their average in red, which runs straight into the cement and ends in red tyre tracks.", s);
  };
  scenes.s5 = function () {
    var s = cloud(260, 60, 0.7);
    s += HARDWARE(706, 52, 112, 104) + CAFE(830, 52, 112, 104) + tree(300, 156, 0.85);
    s += street(176, 318, { seed: 15 });
    s += kiosk(110, 168, 0.8) + bench(220, 172);
    s += K("M150 140 C 230 210, 300 300, 372 292", L, 2, ' stroke-dasharray="3 7"');
    s += paint("M-5 247 H640") + K("M528 200 h-34 M534 216 h-46 M526 232 h-28", SHEET, 2.5, ' opacity=".85"');
    s += striper(586, 251, 1, { gauge: 0.22 });
    for (var i = 0; i < 9; i++) s += dot(656 + i * 14, 247, 4, YEL);
    s += bike(420, 306);
    s += C(520, 104, 42, SHEET, 2.5) + P("M486 116 a34 34 0 0 1 68 0", "none", 0, ' stroke="' + GRASS + '" stroke-width="7"') + P("M486 116 a34 34 0 0 1 10 -24", "none", 0, ' stroke="' + BAD + '" stroke-width="7"') +
      K("M496 92 l-6 -6", L, 2) + txt(484, 80, "g", { size: 15, fill: BAD }) + K("M520 116 L497 104", L, 3) + C(520, 116, 3.5, L, 0) + txt(492, 134, "E", { size: 12 }) + txt(542, 134, "F", { size: 12 }) +
      K("M533 144 L562 212", L, 1.5, ' stroke-dasharray="3 4"');
    s += board(330, 8, 300, "ORDER AHEAD");
    s += label(572, 84, ["orders left", "in the queue"], [560, 100]);
    s += label(24, 294, "no stop, no blob", [100, 251], { plate: true });
    s += label(250, 350, ["send the next order when the queue falls below g", "= asynchronous inference (SmolVLA)"], [472, 202], { from: [505, 331] });
    s += label(708, 300, "the queue never runs dry", [700, 252], { plate: true, size: 14 });
    s += ducks(920, 392, 0.7);
    return wrap("s5", "Main Street from above. The striper keeps rolling and paints a clean line with no blobs, with a few yellow waypoints left ahead of it. A fuel-style gauge on its side, shown enlarged, reads how many orders are left in the queue, with a red mark at g. A runner on a bicycle carries the next work order from the drafting booth to the moving striper before the current one runs out.", s);
  };
  scenes.s6 = function () {
    var s = cloud(140, 40, 0.7) + cloud(760, 52, 0.8) + lamp(250, 104, 66) + tree(690, 104, 0.7) + lamp(910, 104, 66);
    s += street(124, 330, { seed: 21 });
    s += cement(684, 186, 150, 80, { tracks: [684, 780, 226] }) + cone(662, 202) + cone(662, 292) + wetSign(884, 248);
    s += striper(232 - 43, 213, 0.8, { ghost: true, drip: false, face: "flat" });
    for (var i = 1; i < 8; i++) s += dot(n(232 + i * 14), n(214 + i * 13.7), 3.4, RIGHT);
    var p1 = smooth([[150, 226], [220, 214], [280, 192], [338, 168]]);
    s += paint("M-5 226 H150 " + p1.slice(p1.indexOf("C")) + " L436 264 L520 236 Q560 226 672 226");
    s += K("M262 180 q28 -10 52 -26 m-9 -1 l9 1 l-3 8", LEFT, 3) + K("M382 166 q26 30 52 56 m-9 0 l9 0 l0 -9", RIGHT, 3);
    [[338, 168], [436, 264]].forEach(function (k) { s += C(k[0], k[1], 17, "none", 0, ' stroke="' + BAD + '" stroke-width="2.4" stroke-dasharray="5 4"'); });
    s += striper(762, 230, 0.9, { face: "dizzy", drip: false });
    s += board(330, 8, 300, "SEAMS");
    s += label(22, 60, ["a new order, drafted from where", "the striper was = stale"], [196, 140], { plate: true });
    s += label(372, 148, "switch on arrival = a kink at the seam", [354, 160], { plate: true });
    s += label(480, 200, "left, then right = a side flip", [436, 214], { plate: true });
    s += label(30, 298, ["its plan, drawn for back there", "(purple dots, never driven)"], [262, 244], { plate: true, size: 14, fills: [RIGHT, RIGHT] });
    s += label(560, 368, "red tyre tracks: the last flip ran out of road", [702, 234]);
    s += ducks(170, 392, 0.7);
    return wrap("s6", "Main Street from above, close up. The painted yellow line approaches a roped-off wet-cement patch curving to the left, then kinks sharply where a new work order takes over heading right, kinks back again, and runs into the cement, where a dizzy striper sits in red tyre tracks. A faded ghost of the striper shows where it was when the new order was drafted, with that order's purple dots starting from there. Dashed red circles mark the two seams.", s);
  };
  scenes.s7 = function () {
    var s = R(0, 0, 960, 400, PAPER, 0) + R(-5, 300, 970, 110, SAND, 2.5);
    for (var k = 40; k < 960; k += 80) s += K("M" + k + " 301 V400", "#C9A574", 1.5);
    // the window onto the street: the line rounds the cement on the left
    s += R(22, 54, 262, 160, WOOD, 2.5, 4) + R(32, 64, 242, 140, KERB, 2) + R(32, 98, 242, 76, ASPH, 0) + K("M32 98 H274 M32 174 H274", L, 2);
    s += cement(160, 128, 50, 32, {}) + paint("M32 144 H92 C126 144, 130 108, 185 108 C238 108, 236 144, 262 144") + striper(242, 146, 0.32, { drip: false });
    s += R(14, 210, 278, 10, WOOD, 2.5, 2);
    // the drafting table, the old order, and the tracing paper over it
    s += P("M312 64 L938 64 L952 290 L298 290 z", "#CFE0C9", 2.5) + K("M300 296 l-6 100 M948 296 l6 100", L, 6) + R(296, 288, 658, 10, WOOD, 2.5, 2);
    s += R(330, 140, 590, 106, SHEET, 2) + txt(344, 238, "OLD ORDER", { size: 12, sign: true, fill: "#8C7A6C" });
    var yo = function (i) { return 206 - 30 * ss(i / 49) + 6 * Math.sin(i / 7); }, yn = function (i) { return 206 - 62 * ss((i - 4) / 40) + 6 * Math.sin(i / 7); };
    var x0 = 352, dx = 11.4, F = 12, S = 36, W = function (i) { return i < F ? 1 : i >= S ? 0 : Math.exp(-3.2 * (i - F) / (S - F)) * (1 - (i - F) / (S - F)); };
    for (var i = 0; i < 50; i++) s += C(x0 + i * dx, yo(i), 4.3, SHEET, 1.3, ' stroke-opacity=".5"');
    s += G("rotate(-1 630 160)", R(340, 82, 590, 156, "#FFFFFF", 1.6, 2, ' fill-opacity=".6"') + R(356, 76, 40, 13, "rgba(156,203,234,.8)", 0, 0, ' stroke="rgba(74,46,30,.4)" stroke-width="1.2"') + R(876, 76, 40, 13, "rgba(156,203,234,.8)", 0, 0, ' stroke="rgba(74,46,30,.4)" stroke-width="1.2"') + txt(356, 104, "NEW ORDER, on tracing paper", { size: 12, sign: true }));
    for (i = 0; i < 50; i++) {
      var w = W(i), y = w * yo(i) + (1 - w) * yn(i);
      if (i >= F && i < S && Math.abs(y - yo(i)) > 9) s += K("M" + n(x0 + i * dx) + " " + n(yo(i) - 4.5) + " V" + n(y + 4.5), "#8C7A6C", 1, ' stroke-dasharray="2 2"');
      s += dot(x0 + i * dx, y, 4.3, i < F ? "hatch" : i < S ? YEL : SHEET);
    }
    s += G("rotate(-6 840 214)", R(764, 200, 152, 28, "none", 0, 4, ' stroke="' + BAD + '" stroke-width="2.4"') + txt(840, 220, "REAL-TIME CHUNKING", { size: 12.5, sign: true, fill: BAD, anchor: "middle" }));
    // the mask chart: how hard each dot leans on the old plan
    s += R(330, 308, 590, 86, SHEET, 2, 3) + K("M346 384 H906", L, 1.5) + K("M" + (347 + F * 11.2) + " 332 V384 M" + (347 + S * 11.2) + " 332 V384", L, 1.2, ' stroke-dasharray="3 3"');
    for (i = 0; i < 50; i++) { var hh = 36 * W(i); if (hh > 0.5) s += R(349 + i * 11.2, 384 - hh, 8, hh, i < F ? STEEL : YEL, 1.2); }
    s += txt(346, 325, "weight on the old plan, dot by dot", { size: 12, fill: "#7A5A48" }) + txt(416, 342, "frozen", { size: 14, anchor: "middle" }) + txt(620, 352, "soft mask", { size: 14, anchor: "middle" }) + txt(830, 352, "free: drawn fresh", { size: 14, anchor: "middle" });
    s += G("translate(150 394) scale(1.25) translate(-150 -394)", person(150, 394, { shirt: LILAC, skin: SKIN3, hat: "visor", hair: L, rh: [36, -24], lh: [-22, -8] }) + K("M190 351 l12 -9", YEL, 4) + K("M190 351 l12 -9", L, 1));
    s += board(330, 8, 300, "TRACING PAPER", GRASS);
    s += label(22, 240, ["the line rounds the", "cement on the left"], [118, 112], { fills: [LEFT, LEFT] });
    s += label(344, 274, "frozen = the actions that will run before the new order lands", [404, 214], { plate: true, size: 14 });
    s += label(470, 126, "soft mask = lean towards the old plan, then let go", [604, 182], { plate: true, size: 14 });
    return wrap("s7", "Inside the drafting booth. On a big drafting table lies the old work order, a row of fifty dots. A sheet of tracing paper is taped over it: the first dots are traced exactly and hatched, the next ones start on top of the old dots and gradually drift to a new plan, and the last ones are drawn fresh. A chart below shows the weight on the old plan: full for the frozen dots, falling through the soft mask, zero for the free ones. Through the window, the painted line rounds the wet cement smoothly on the left.", s);
  };
  scenes.cap = function () {
    var s = R(-5, 268, 970, 100, KERB, 0) + R(-5, 263, 970, 7, WOOD, 2) + R(-5, 364, 970, 40, WOOD, 3);
    s += R(34, 48, 892, 180, WOOD, 2.5, 6) + R(44, 58, 872, 160, CORK, 1.5);
    var r = rnd(2), d = ""; for (var i = 0; i < 120; i++) d += "M" + n(50 + r() * 860) + " " + n(64 + r() * 148) + " h2 "; s += K(d, "#B98D5B", 2);
    function strip(x, y) { return R(x, y, 244, 76, ASPH, 2) + K("M" + x + " " + (y + 8) + " h244 M" + x + " " + (y + 68) + " h244", KERB, 4); }
    function folder(x, title, sub, stamp, art) {
      var f = R(x, 68, 268, 144, NOTE, 2.2, 4) + C(x + 134, 71, 5, BRICK, 1.8) + txt(x + 14, 89, title, { size: 15, sign: true }) + strip(x + 12, 96) + art(x + 12, 96) + txt(x + 14, 197, sub, { size: 14 });
      return f + G("rotate(-7 " + (x + 212) + " 190)", R(x + 166, 178, 98, 24, NOTE, 0, 3, ' stroke="' + BAD + '" stroke-width="2"') + txt(x + 215, 195, stamp, { size: 14, sign: true, fill: BAD, anchor: "middle" }));
    }
    s += folder(58, "CASE 1 &#183; THE PUDDLER", "stopped to think", "BLOBS", function (x, y) {
      return paint("M" + (x + 4) + " " + (y + 52) + " h166") + blob(x + 40, y + 52, 12, 5) + blob(x + 104, y + 52, 13, 5) + blob(x + 168, y + 53, 18, 6) + striper(x + 146, y + 54, 0.42, { face: "asleep" });
    });
    s += folder(346, "CASE 2 &#183; THE ZIGZAGGER", "switched at every seam", "SIDE FLIP", function (x, y) {
      return cement(x + 172, y + 22, 54, 40, { tracks: [x + 172, x + 204, y + 42] }) + paint("M" + (x + 4) + " " + (y + 42) + " h40 l22 -18 l22 34 l22 -30 l22 26 l20 -12") + striper(x + 194, y + 46, 0.36, { face: "dizzy", drip: false }) + cone(x + 160, y + 30);
    });
    s += folder(634, "CASE 3 &#183; THE WANDERER", "no off-line pages", "DRIFT", function (x, y) {
      return K("M" + x + " " + (y + 38) + " h244", SHEET, 2, ' stroke-dasharray="8 7" opacity=".7"') + pothole(x + 54, y + 38, 13, 6) + paint("M" + (x + 4) + " " + (y + 38) + " h36 M" + (x + 68) + " " + (y + 39) + " C" + (x + 120) + " " + (y + 42) + ", " + (x + 160) + " " + (y + 52) + ", " + (x + 196) + " " + (y + 64)) + striper(x + 176, y + 66, 0.4, { face: "worried" });
    });
    s += person(280, 340, { vest: true, shirt: SKY, hat: "cap", hatCol: BRICK, rh: [30, -24], mouth: "flat" }) + C(316, 296, 10, SKY, 2.5, ' fill-opacity=".5"') + K("M309 304 l-10 11", L, 4);
    s += person(680, 340, { shirt: LILAC, skin: SKIN3, hat: "visor", hair: L, lh: [-30, -42], mouth: "o" }) + G("rotate(-8 634 262)", order(604, 242, 60, 36, { n: 10, r: 2, db: 10, k: 4 }));
    s += R(150, 318, 660, 10, WOOD, 0) + R(160, 328, 640, 36, MAST, 0) + txt(480, 352, "diagnose &#183; fix the rule &#183; re-run the fleet", { size: 18, sign: true, fill: PAPER, anchor: "middle" });
    s += board(290, 6, 380, "INCIDENT REVIEW BOARD");
    s += R(14, 240, 170, 64, SHEET, 2, 6) + txt(24, 258, "the master", { size: 16 }) + txt(24, 276, "rides along to fix", { size: 14 }) + txt(24, 293, "the wanderer", { size: 14 });
    s += R(740, 240, 206, 64, SHEET, 2, 6) + txt(750, 258, "the draughtsperson", { size: 16 }) + txt(750, 276, "traces the frozen dots", { size: 14 }) + txt(750, 293, "to fix the zigzagger", { size: 14 });
    return wrap("cap", "A cork board pins three incident folders. The puddler: a yellow line dotted with paint blobs and a sleeping striper, stamped blobs. The zigzagger: a zigzag line running into a roped-off cement patch, stamped side flip. The wanderer: a line that drifts toward the kerb after a pothole, stamped drift. Below, the master and the draughtsperson study them under a sign reading diagnose, fix the rule, re-run the fleet.", s);
  };

  /* ---------- icons: 64×64, flat fills, 3.5px line ---------- */
  var sk = ' stroke="' + L + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  function ic(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + inner + "</svg>"; }
  function f(c) { return ' fill="' + c + '"' + sk; }
  function ln(c, w) { return ' fill="none" stroke="' + (c || L) + '" stroke-width="' + (w || 3.5) + '" stroke-linecap="round" stroke-linejoin="round"'; }
  var road = '<rect x="4" y="14" width="56" height="36" rx="4"' + f(ASPH) + "/>";
  var miniStriper = '<rect x="22" y="12" width="20" height="12" rx="5"' + f(STEEL) + '/><rect x="6" y="22" width="44" height="20" rx="7"' + f(YEL) + '/><rect x="34" y="26" width="12" height="9" rx="2.5"' + f(SHEET) + '/><circle cx="16" cy="46" r="8"' + f(L) + '/><circle cx="44" cy="48" r="5"' + f(L) + '/><path d="M50 34 h6 v10"' + ln() + '/><path d="M56 50 c-2 3 -2 5 0 6 c2 -1 2 -3 0 -6 z"' + f(YEL) + "/>";
  var icons = {
    street: ic(road + '<path d="M4 32 H60"' + ln(YEL, 5) + '/><path d="M4 14 H60 M4 50 H60"' + ln() + "/>"),
    drift: ic(road + '<ellipse cx="20" cy="30" rx="7" ry="4"' + f(HOLE) + '/><path d="M6 30 h6 M28 31 C40 32, 48 38, 56 46"' + ln(YEL, 5) + "/>"),
    ride: ic('<path d="M10 26 L40 14 V50 L10 38 z"' + f(SHEET) + '/><ellipse cx="40" cy="32" rx="6" ry="18"' + f(BRICK) + '/><rect x="4" y="26" width="8" height="12" rx="2"' + f(L) + '/><path d="M50 20 q6 12 0 24 M56 14 q8 18 0 36"' + ln() + "/>"),
    desk: ic('<path d="M18 40 L12 60 M46 32 L52 60"' + ln(L, 5) + '/><path d="M6 36 L54 22 L58 32 L10 46 z"' + f(SAND) + '/><path d="M16 36 L44 28"' + ln(YEL, 4) + '/><path d="M6 4 L14 14 L28 8"' + ln() + '/><path d="M20 18 a9 9 0 0 1 18 0 z"' + f(GRASS) + "/>"),
    committee: ic('<rect x="4" y="10" width="26" height="30" rx="3"' + f(SHEET) + '/><rect x="19" y="18" width="26" height="30" rx="3"' + f(SHEET) + '/><rect x="34" y="26" width="26" height="30" rx="3"' + f(SHEET) + '/><path d="M9 30 q8 -10 16 0"' + ln(LEFT, 4) + '/><path d="M24 34 h16"' + ln(BAD, 4) + '/><path d="M39 42 q8 10 16 0"' + ln(RIGHT, 4) + "/>"),
    ahead: ic('<rect x="6" y="12" width="32" height="42" rx="4"' + f(WOOD) + '/><rect x="10" y="18" width="24" height="32" rx="2"' + f(SHEET) + '/><circle cx="16" cy="34" r="3" fill="' + YEL + '"/><circle cx="22" cy="34" r="3" fill="' + YEL + '"/><circle cx="28" cy="34" r="3" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.5"/><path d="M42 32 h16 m-7 -7 l7 7 l-7 7"' + ln() + "/>"),
    seam: ic(road + '<path d="M4 38 L22 24 L36 44 L46 30 L60 30"' + ln(YEL, 5) + '/><circle cx="22" cy="24" r="8" fill="none" stroke="' + BAD + '" stroke-width="3" stroke-dasharray="4 3"/>'),
    tracing: ic('<rect x="4" y="16" width="44" height="40" rx="3"' + f(SHEET) + '/><rect x="16" y="6" width="44" height="40" rx="3" fill="#FFFFFF" fill-opacity=".7"' + sk + '/><circle cx="26" cy="30" r="4.5"' + f(SHEET) + '/><path d="M23 33 l6 -6"' + ln(L, 2) + '/><circle cx="38" cy="26" r="4.5"' + f(YEL) + '/><circle cx="50" cy="20" r="4.5"' + f(SHEET) + "/>"),
    star: ic('<path d="M32 6 l7.2 16 16.8 1.6 -12.8 11.5 3.7 16.5 -14.9 -8.8 -14.9 8.8 3.7 -16.5 -12.8 -11.5 16.8 -1.6z"' + f(YEL) + "/>"),
    pencil: ic('<path d="M10 54 l5 -16 27 -27 11 11 -27 27 z"' + f(YEL) + '/><path d="M37 16 l11 11 M10 54 l5 -16 11 11 z"' + ln() + '/><path d="M42 11 l6 -6 11 11 -6 6"' + f(BRICK) + "/>"),
    striper: ic(miniStriper),
    master: ic('<path d="M12 60 v-16 a20 14 0 0 1 40 0 v16 z"' + f(VEST) + '/><path d="M12 50 h40"' + ln(SILVER, 5) + '/><path d="M26 32 l6 10 l6 -10"' + ln() + '/><circle cx="32" cy="22" r="11"' + f(SKIN) + '/><path d="M21 19 a11 11 0 0 1 22 0 z"' + f(BRICK) + '/><path d="M40 16 h12"' + ln(L, 4) + "/>"),
    joystick: ic('<rect x="6" y="34" width="44" height="22" rx="5"' + f(STEEL) + '/><path d="M20 34 l-3 -10 M36 34 l3 -10 M46 34 l8 -26"' + ln() + '/><circle cx="16" cy="22" r="5"' + f(BRICK) + '/><circle cx="40" cy="22" r="5"' + f(YEL) + '/><circle cx="55" cy="8" r="4"' + f(BRICK) + "/>"),
    logbook: ic('<rect x="10" y="6" width="40" height="52" rx="4"' + f(WOOD) + '/><rect x="16" y="12" width="28" height="14" rx="2"' + f(SHEET) + '/><path d="M20 19 h20"' + ln(YEL, 4) + '/><path d="M50 10 v48"' + ln() + '/><path d="M38 52 v10 l4 -3 l4 3 v-10"' + f(BRICK) + "/>"),
    notebook: ic('<rect x="16" y="10" width="7" height="10" rx="2"' + f(YEL) + '/><rect x="28" y="10" width="7" height="10" rx="2"' + f(GRASS) + '/><rect x="8" y="16" width="48" height="42" rx="4"' + f(SHEET) + '/><path d="M14 30 h36 M14 40 h36 M14 50 h24"' + ln(SKY, 2.5) + '/><path d="M8 16 h48"' + ln() + '/><path d="M16 12 v8 M28 12 v8 M40 12 v8 M48 12 v8"' + ln(L, 3) + "/>"),
    pothole: ic(road + '<ellipse cx="32" cy="32" rx="18" ry="10"' + f(HOLE) + '/><path d="M50 32 l6 -3 l4 3 M14 33 l-6 4"' + ln(L, 2.5) + "/>"),
    order: ic('<rect x="10" y="8" width="44" height="52" rx="5"' + f(WOOD) + '/><rect x="16" y="16" width="32" height="38" rx="2"' + f(SHEET) + '/><rect x="24" y="4" width="16" height="9" rx="2"' + f(STEEL) + '/><circle cx="22" cy="38" r="3" fill="' + YEL + '"/><circle cx="29" cy="38" r="3" fill="' + YEL + '"/><circle cx="36" cy="38" r="3" fill="' + YEL + '"/><circle cx="43" cy="38" r="2.6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.5"/><path d="M21 26 h18"' + ln(L, 2.5) + "/>"),
    clock: ic('<rect x="28" y="4" width="8" height="7" rx="1.5"' + f(STEEL) + '/><circle cx="32" cy="36" r="22"' + f(SHEET) + '/><path d="M32 36 V18 A18 18 0 0 1 48 44 z" fill="#F2C2B5"/><path d="M32 36 L48 44"' + ln(BAD, 3.5) + '/><circle cx="32" cy="36" r="3" fill="' + L + '"/>'),
    blob: ic(road + '<path d="M4 32 H40"' + ln(YEL, 5) + '/><ellipse cx="42" cy="33" rx="15" ry="9"' + f(YEL) + "/>"),
    cement: ic('<rect x="8" y="16" width="48" height="36" rx="5"' + f(CEM) + '/><path d="M4 12 Q32 20 60 12"' + ln(BAD, 3.5) + '/><path d="M14 52 L20 30 h6 L32 52 z"' + f(CONE) + '/><path d="M17 42 h12"' + ln(SHEET, 3) + "/>"),
    kink: ic('<path d="M6 46 L30 18 L58 46"' + ln(L, 9) + '/><path d="M6 46 L30 18 L58 46"' + ln(YEL, 5) + '/><circle cx="30" cy="18" r="9" fill="none" stroke="' + BAD + '" stroke-width="3" stroke-dasharray="4 3"/>'),
    queue: ic('<path d="M6 46 a26 26 0 0 1 52 0 z"' + f(SHEET) + '/><path d="M12 44 a20 20 0 0 1 6 -14"' + ln(BAD, 5) + '/><path d="M32 46 L18 32"' + ln(L, 4) + '/><circle cx="32" cy="46" r="4" fill="' + L + '"/><path d="M6 54 h52"' + ln() + "/>")
  };

  var out = {};
  Object.keys(scenes).forEach(function (k) { out[k] = scenes[k](); });
  root.WP_ART = out; root.WP_ICONS = icons;
})(typeof window !== "undefined" ? window : this);
