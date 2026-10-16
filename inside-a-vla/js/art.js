/* Inside a VLA — the pictures. Six hand-built 960×400 scenes of a Busytown office building in cross-section (the mailroom,
   the tower, the closed top floors, the filing cabinet and drafting room, the stopwatch, two offices side by side), plus the
   nav and cast icons. Flat gouache fills, one warm-brown outline, every object labelled with a hairline pointer. The drawing
   primitives and the Busytown worker are shared with Demos to Deployment. Exposed as window.VLA_ART and window.VLA_ICONS. */
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

  /* ---------- the office's cast ---------- */
  var PHOTO = "#246A9C", STAFF = "#5E4A94", MEET = "#B8A3DC", EXP = "#E2701C", EXPD = "#A84E0F", WORD = YEL, ST = GRASS, MUL = "#7B3A63", MULD = "#5A2748",
      WALL1 = "#FFF1DA", WALL2 = "#F7E3EC", SLAB = "#B8793F", GLASS = "#CFE6F4", DARK = "#8E8478";
  function ground(y) { return R(-5, y, 970, 405 - y, "#CFE3B4", 0) + K("M-5 " + y + " H965", L, 2.5) + R(-5, y + 10, 970, 12, "#D6CFC2", 2); }
  // A small Busytown worker, about 34 tall; (x, y) = feet. o.sit hides the legs behind a desk.
  function mini(x, y, o) { o = o || {}; return G("translate(" + x + " " + y + ") scale(" + (o.sc || 0.45) + ")", person(0, 0, o)); }
  // A card: one token. A coloured band on paper, like an index card.
  function card(x, y, col, rot, sc) {
    sc = sc || 1; var w = 16 * sc, h = 11 * sc;
    return G("rotate(" + (rot || 0) + " " + n(x + w / 2) + " " + n(y + h / 2) + ")", R(x, y, w, h, SHEET, 1.3, 1.5) + R(x, y, w, h * 0.38, col, 1.3, 1.5));
  }
  function cards(x, y, k, col, dx, dy, sc) { var s = ""; for (var i = 0; i < k; i++) s += card(x + i * (dx || 3), y - i * (dy || 2), col, (i % 3 - 1) * 3, sc); return s; }
  function desk(x, y, w) { w = w || 34; return R(x, y - 12, w, 6, SLAB, 1.8, 1) + K("M" + (x + 4) + " " + (y - 6) + " V" + y + " M" + (x + w - 4) + " " + (y - 6) + " V" + y, L, 2.2); }
  // A camera on a short stalk, lens pointing (dir) degrees.
  function camera(x, y, dir, sc) {
    sc = sc || 1;
    return G("translate(" + x + " " + y + ") rotate(" + (dir || 0) + ") scale(" + sc + ")", R(-14, -9, 24, 18, "#4F5A66", 2, 3) + R(10, -6, 7, 12, "#4F5A66", 2, 1.5) + C(17, 0, 5, GLASS, 1.8) + C(-7, -4, 2, "#E2701C", 0));
  }
  // A generic small robot arm on a table, with a red cube and a cardboard box. (x, y) = the arm's base on the table top.
  function arm(x, y, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = R(-70, 0, 210, 12, SLAB, 2.5, 3) + K("M-58 12 V60 M126 12 V60", L, 4);
    s += R(-14, -16, 28, 16, STEEL, 2.2, 4) + P("M-6 -16 L-18 -78 L6 -82 L10 -16 z", "#F4C430", 2.2) + C(-6, -80, 8, STEEL, 2.2);
    s += P("M-10 -86 L58 -66 L54 -54 L-12 -72 z", "#F4C430", 2.2) + C(56, -60, 7, STEEL, 2.2);
    s += P("M54 -54 L62 -24 L52 -22 L46 -52 z", STEEL, 2) + K("M52 -22 l-4 12 M60 -24 l4 12", L, 3.5);
    if (o.wrist) s += camera(70, -44, 100, 0.55);
    s += R(36, -18, 18, 18, BRICK, 2, 2) + R(82, -30, 44, 30, "#C9A774", 2.2, 2) + R(80, -34, 48, 6, "#9A6331", 2, 1);
    return G("translate(" + x + " " + y + ") scale(" + sc + ")", s);
  }
  // A photo print with a little scene; o.grid = tiles per side to rule it into, o.bundle = r to outline bundles.
  function photo(x, y, w, o) {
    o = o || {}; var h = w, s = R(x - 4, y - 4, w + 8, h + 14, SHEET, 2, 2) + R(x, y, w, h, o.tint || "#D7E9F3", 1.4);
    s += R(x, y + h * 0.58, w, h * 0.42, "#C9A774", 0) + K("M" + x + " " + n(y + h * 0.58) + " h" + w, L, 1.2);
    s += R(x + w * 0.56, y + h * 0.5, w * 0.3, w * 0.2, "#B8793F", 1.4) + R(x + w * 0.26, y + h * 0.6, w * 0.12, w * 0.12, BRICK, 1.4) + R(x + w * 0.42, y, w * 0.08, h * 0.32, STEEL, 1.4);
    if (o.grid) {
      var t = w / o.grid, d = "";
      for (var i = 1; i < o.grid; i++) d += "M" + n(x + i * t) + " " + y + " v" + h + " M" + x + " " + n(y + i * t) + " h" + w + " ";
      s += K(d, "rgba(74,46,30,.45)", 0.8);
      if (o.bundle) { d = ""; for (i = o.bundle; i < o.grid; i += o.bundle) d += "M" + n(x + i * t) + " " + y + " v" + h + " M" + x + " " + n(y + i * t) + " h" + w + " "; s += K(d, PHOTO, 2); }
    }
    return o.rot ? G("rotate(" + o.rot + " " + n(x + w / 2) + " " + n(y + h / 2) + ")", s) : s;
  }
  // One floor of the tower, seen in cross-section: a wall, a slab, desks with staff and a run of cards along a belt.
  function floorRoom(x, y, w, h, o) {
    o = o || {}; var s = R(x, y, w, h, o.closed ? DARK : (o.alt ? WALL2 : WALL1), 0);
    if (o.closed) { s += K("M" + (x + 8) + " " + (y + h - 6) + " L" + (x + w - 8) + " " + (y + 6), "rgba(74,46,30,.35)", 2); }
    else if (h >= 30) {
      var k = Math.max(1, Math.floor((w - 20) / 52)), sp = (w - 20) / k;
      for (var i = 0; i < k; i++) { var dx = x + 14 + i * sp; s += mini(dx + 14, y + h - 2, { sc: Math.min(0.42, h / 105), shirt: [SKY, LILAC, SAND, GRASS][i % 4], noLegs: true, hair: i % 2 ? L : "#8C5A3C" }) + desk(dx, y + h, 28); }
      if (o.cards) { for (i = 0; i < 6; i++) s += card(x + 10 + i * (w - 30) / 6, y + 6, [PHOTO, PHOTO, PHOTO, WORD, WORD, ST][i], 0, 0.7); }
    }
    s += R(x, y + h - 3, w, 4, SLAB, 1.2);
    if (o.num != null) s += R(x - 26, y + h / 2 - 9, 22, 16, SHEET, 1.5, 3) + txt(x - 15, y + h / 2 + 4, String(o.num), { size: 12, anchor: "middle", sign: true });
    return s;
  }
  // The tower in cross-section. floors = list of {num, closed, alt, cards}; drawn bottom-up from y (ground) with height fh each.
  function tower(x, y, w, fh, floors, o) {
    o = o || {}; var H = fh * floors.length, top = y - H, s = "";
    s += R(x - 8, top - 10, w + 16, H + 10, o.wall || BRICK, 2.5);
    floors.forEach(function (f, i) { s += floorRoom(x, y - (i + 1) * fh + 2, w, fh - 4, f); });
    s += P("M" + (x - 14) + " " + (top - 10) + " h" + (w + 28) + " l-10 -14 h" + -(w + 8) + " z", o.roof || MUL, 2.5);
    if (o.sign) s += R(x + w / 2 - o.sign.length * 4.6 - 8, top - 50, o.sign.length * 9.2 + 16, 24, SHEET, 2, 4) + txt(x + w / 2, top - 32, o.sign, { size: 15, anchor: "middle", sign: true });
    return s;
  }
  function cabinet(x, y, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = R(0, -96, 50, 96, "#8FA3AE", 2.5, 3);
    for (var i = 0; i < 4; i++) s += R(5, -91 + i * 23, 40, 19, "#B9C7CF", 2, 2) + R(19, -84 + i * 23, 12, 4, L, 0, 1) + R(9, -88 + i * 23, 14, 7, SHEET, 1, 1);
    if (o.open) s += R(-2, -91, 54, 19, "#B9C7CF", 2, 2) + cards(4, -94, 4, PHOTO, 6, 0) + card(30, -96, WORD);
    return G("translate(" + x + " " + y + ") scale(" + sc + ")", s);
  }
  // A drafting table with a drafter; the work order pinned to it.
  function draftTable(x, y, o) {
    o = o || {};
    var s = K("M" + (x - 18) + " " + y + " l6 -30 M" + (x + 18) + " " + y + " l-6 -30", L, 3) + P("M" + (x - 30) + " " + (y - 30) + " L" + (x + 30) + " " + (y - 42) + " L" + (x + 32) + " " + (y - 34) + " L" + (x - 28) + " " + (y - 22) + " z", SAND, 2);
    s += P("M" + (x - 18) + " " + (y - 33) + " L" + (x + 18) + " " + (y - 40) + " L" + (x + 19) + " " + (y - 35) + " L" + (x - 17) + " " + (y - 28) + " z", SHEET, 1.2);
    for (var i = 0; i < 4; i++) s += K("M" + (x - 14 + i * 2) + " " + (y - 31.5 + i * -1.5 + 0) + " l26 -5.4", EXP, 1);
    s += mini(x + (o.left ? -40 : 40), y, { sc: 0.48, shirt: o.shirt || GRASS, hair: o.hair || L, lh: o.left ? [26, -14] : [-26, -14], rh: o.left ? [30, -10] : [-30, -10], hat: o.hat });
    return s;
  }
  // The work order on a clipboard: k lines, the first `done` filled.
  function order(x, y, w, h, o) {
    o = o || {}; var s = R(x, y, w, h, WOOD, 2.2, 4) + R(x + 6, y + 10, w - 12, h - 16, SHEET, 1.5, 2) + R(x + w / 2 - 12, y - 5, 24, 11, STEEL, 1.8, 2);
    var k = o.lines || 10, lh = (h - 26) / k;
    for (var i = 0; i < k; i++) s += K("M" + (x + 12) + " " + n(y + 18 + i * lh) + " h" + n((w - 24) * (0.55 + 0.4 * ((i * 37) % 10) / 10)), o.scribble && i >= (o.done || 0) ? "#C9B8A6" : EXP, 1.6, o.scribble && i >= (o.done || 0) ? ' stroke-dasharray="3 2"' : "");
    if (o.title) s += txt(x + w / 2, y + h + 16, o.title, { size: 13, anchor: "middle" });
    return s;
  }
  function stopwatch(x, y, r, frac) {
    var a = Math.PI * 2 * (frac || 0.3), ex = x + Math.sin(a) * (r - 3), ey = y - Math.cos(a) * (r - 3);
    return R(x - 3, y - r - 7, 6, 6, STEEL, 1.5, 1) + K("M" + n(x + r * 0.7) + " " + n(y - r * 0.7) + " l4 -4", L, 3) + C(x, y, r, SHEET, 2.2) +
      P("M" + x + " " + y + " L" + x + " " + (y - r + 3) + " A" + (r - 3) + " " + (r - 3) + " 0 " + (frac > 0.5 ? 1 : 0) + " 1 " + n(ex) + " " + n(ey) + " z", "#F2C2B5", 0) +
      K("M" + x + " " + y + " L" + n(ex) + " " + n(ey), BAD, 2) + C(x, y, 1.8, L, 0);
  }
  function tube(d) { return K(d, L, 11) + K(d, GLASS, 7); }
  function arrow(x1, y1, x2, y2, col) { var a = Math.atan2(y2 - y1, x2 - x1), h = 9; return K("M" + x1 + " " + y1 + " L" + x2 + " " + y2, col || L, 3) + P("M" + n(x2) + " " + n(y2) + " L" + n(x2 - h * Math.cos(a - 0.45)) + " " + n(y2 - h * Math.sin(a - 0.45)) + " L" + n(x2 - h * Math.cos(a + 0.45)) + " " + n(y2 - h * Math.sin(a + 0.45)) + " z", col || L, 0); }
  function wrap(id, title, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + title + '"><title>' + title + '</title><rect width="960" height="400" fill="#E5F2FA"/>' +
      '<g stroke-linejoin="round" stroke-linecap="round">' + inner + "</g></svg>";
  }

  /* ---------- scenes ---------- */
  var scenes = {};
  scenes.s0 = function () {
    var s = cloud(120, 56, 0.8) + cloud(860, 48, 0.7) + ground(352);
    // outside: the robot at its table, three cameras
    s += arm(110, 300, 0.95, { wrist: true });
    s += K("M30 352 V150", L, 4) + camera(44, 150, 40, 0.8) + K("M236 352 V214", L, 4) + camera(222, 214, 160, 0.8);
    // photos flying to the mailroom
    s += tube("M60 136 C120 40, 300 50, 352 120") + photo(150, 58, 34, { rot: -8 }) + photo(250, 64, 34, { rot: 6, tint: "#E8E2F2" });
    // the mailroom, in cross-section
    s += R(340, 104, 600, 248, WALL1, 2.5) + P("M330 104 h620 l-14 -20 h-592 z", MUL, 2.5) + R(340, 346, 600, 6, SLAB, 1.5);
    s += board(512, 28, 260, "THE MAILROOM", MUL);
    // photo desk: a light table with a ruled photo
    s += R(366, 274, 130, 10, SLAB, 2, 2) + K("M374 284 V346 M488 284 V346", L, 3) + photo(392, 196, 72, { grid: 8, bundle: 4 });
    s += mini(520, 346, { sc: 0.62, shirt: SKY, hair: "#8C5A3C", lh: [-34, -40], rh: [-26, -30], hat: "visor" });
    // the bundler: stapling a bundle onto a card
    s += R(560, 290, 92, 10, SLAB, 2, 2) + K("M568 300 V346 M644 300 V346", L, 3) + R(586, 266, 40, 24, STEEL, 2, 3) + R(582, 262, 48, 8, "#4F5A66", 2, 2) + cards(600, 248, 3, PHOTO, 8, 4);
    s += mini(676, 346, { sc: 0.62, shirt: LILAC, hair: L, lh: [-40, -36], rh: [-30, -44] });
    // word desk: a typewriter and the request
    s += R(720, 290, 96, 10, SLAB, 2, 2) + K("M728 300 V346 M808 300 V346", L, 3) + R(744, 268, 48, 22, "#4F5A66", 2, 4) + R(750, 250, 36, 20, SHEET, 1.5, 1) + K("M754 258 h26 M754 263 h20", L, 1.2) + cards(796, 278, 3, WORD, 5, 3);
    s += note(706, 138, 110, 52, ["“put the cube", "in the box”"], { rot: -3, tape: true, size: 14 });
    // joint slip -> one green card, and the out-tray to the tower
    s += R(840, 300, 70, 10, SLAB, 2, 2) + K("M846 310 V346 M904 310 V346", L, 3) + card(860, 282, ST, -4, 1.3) + R(846, 116, 80, 66, "#D8CFC0", 2, 3) + txt(886, 136, "to the", { size: 13, anchor: "middle" }) + txt(886, 152, "tower ↑", { size: 15, anchor: "middle", sign: true }) + cards(858, 174, 5, PHOTO, 4, 2) + cards(890, 174, 3, WORD, 4, 2);
    s += label(66, 196, ["three cameras:", "top, wrist, side"], [50, 156], { plate: true });
    s += label(380, 136, ["photo desk", "= vision encoder"], [420, 196], { plate: true });
    s += label(520, 150, ["the bundler: 4 × 4 tiles", "→ 1 card (pixel shuffle)"], [604, 250], { plate: true });
    s += label(876, 222, ["joint card", "= the state token"], [872, 284], { plate: true, anchor: "middle" });
    return wrap("s0", "A Busytown cutaway of an office mailroom. Outside, a small yellow robot arm on a table reaches for a red cube beside a cardboard box, watched by three cameras: one on a pole above, one on its wrist, one at the side. Photos fly through a glass tube into the mailroom. Inside, a clerk at a light table rules a photo into a grid of tiles, with every 4 by 4 block outlined in blue; a second clerk staples each block onto a card; a third types the request, put the cube in the box, onto yellow word cards; a single green card carries the arm's joint readings. An out-tray says: to the tower.", s);
  };
  scenes.s1 = function () {
    var s = cloud(90, 60, 0.75) + cloud(470, 40, 0.6) + ground(360);
    var fl = []; for (var i = 0; i < 6; i++) fl.push({ num: i < 5 ? i + 1 : 16, alt: i % 2, cards: true });
    s += tower(90, 360, 250, 50, fl, { sign: "THE TOWER" });
    s += txt(77, 116, "⋮", { size: 22, anchor: "middle" });
    // zoomed floor
    s += R(420, 70, 516, 270, WALL1, 2.5, 8) + K("M340 230 L420 130 M340 258 L420 330", L, 1.5, ' stroke-dasharray="5 4"');
    s += txt(440, 96, "one floor, up close", { size: 17, sign: true });
    // the staff: a row of desks each card visits
    for (i = 0; i < 4; i++) s += desk(452 + i * 62, 210, 40) + mini(472 + i * 62, 210, { sc: 0.5, shirt: [SKY, LILAC, SAND, GRASS][i], noLegs: true, hair: i % 2 ? L : "#8C5A3C" });
    s += K("M440 222 H700", STAFF, 4) + cards(446, 226, 1, PHOTO) + card(520, 226, PHOTO) + card(590, 226, WORD) + card(660, 226, ST);
    s += arrow(690, 230, 720, 230, STAFF);
    // the meeting: a round table, cards compared pairwise
    s += E(812, 268, 92, 30, SLAB, 2.5) + E(812, 262, 92, 30, SAND, 2.5);
    var pos = [[748, 254], [780, 246], [816, 244], [852, 248], [872, 262], [770, 272], [820, 278]];
    var d = ""; pos.forEach(function (a, i) { pos.forEach(function (b, j) { if (j > i) d += "M" + (a[0] + 8) + " " + (a[1] + 5) + " L" + (b[0] + 8) + " " + (b[1] + 5) + " "; }); });
    s += K(d, MEET, 1.4) + pos.map(function (p, i) { return card(p[0], p[1], i < 4 ? PHOTO : i < 6 ? WORD : ST, (i % 3 - 1) * 8); }).join("");
    s += mini(726, 300, { sc: 0.5, shirt: LILAC, hair: L, rh: [24, -18] }) + mini(902, 300, { sc: 0.5, shirt: SKY, hair: "#8C5A3C", lh: [-24, -18] });
    s += label(456, 132, ["the staff = the weights:", "every card visits every desk", "(2 FLOPs per weight per card)"], [520, 196], { plate: true });
    s += label(726, 132, ["the meeting = attention:", "every card against every card", "(grows with cards²)"], [812, 238], { plate: true });
    return wrap("s1", "A Busytown cutaway of a tall office tower with floors numbered 1 to 5 and then 16, cards travelling up on belts. Beside it, one floor drawn up close: a row of clerks at desks that every card passes, labelled the weights, two FLOPs per weight per card; and a round meeting table where every card is joined to every other card by a thin line, labelled attention, growing with the square of the cards.", s);
  };
  scenes.s2 = function () {
    var s = cloud(560, 50, 0.7) + cloud(860, 72, 0.6) + ground(368);
    var tx = 160, tw2 = 180, fh = 9, i;
    s += R(tx - 8, 368 - 32 * fh - 10, tw2 + 16, 32 * fh + 10, BRICK, 2.5) + P("M" + (tx - 14) + " " + (368 - 32 * fh - 10) + " h" + (tw2 + 28) + " l-10 -14 h" + -(tw2 + 8) + " z", MUL, 2.5);
    for (i = 0; i < 32; i++) {
      var fy = 368 - (i + 1) * fh;
      if (i < 16) s += R(tx, fy + 1, tw2, fh - 2, i % 2 ? WALL1 : WALL2, 0) + K("M" + (tx + 10) + " " + (fy + 5) + " h" + (tw2 - 20), YEL, 2.5, ' stroke-dasharray="9 7"');
      else s += R(tx, fy + 1, tw2, fh - 2, "#625C55", 0);
      s += K("M" + tx + " " + (fy + fh) + " h" + tw2, SLAB, 1.5);
    }
    [[0, "1"], [15, "16"], [31, "32"]].forEach(function (q) { var fy = 368 - (q[0] + 0.5) * fh; s += R(tx - 34, fy - 8, 24, 16, SHEET, 1.5, 3) + txt(tx - 22, fy + 4, q[1], { size: 12, anchor: "middle", sign: true }); });
    s += R(tx + tw2 / 2 - 52, 368 - 32 * fh - 52, 104, 24, SHEET, 2, 4) + txt(tx + tw2 / 2, 368 - 32 * fh - 34, "32 FLOORS", { size: 15, anchor: "middle", sign: true });
    // the closed sign and a rope across the stairs at floor 16
    s += R(366, 140, 116, 40, SHEET, 2.2, 5) + txt(424, 158, "FLOORS 17–32", { size: 13, anchor: "middle", sign: true }) + txt(424, 174, "closed", { size: 15, anchor: "middle", fill: BAD }) + K("M340 160 H366", L, 1.5);
    s += K("M150 223 H352", BAD, 3.5, ' stroke-dasharray="10 6"');
    // floor 16 to the drafting room: a chute
    s += tube("M340 222 C440 232, 520 260, 590 270");
    s += R(590, 214, 300, 154, WALL2, 2.5) + P("M580 214 h320 l-12 -18 h-296 z", EXP, 2.5) + txt(740, 246, "the drafting room", { size: 17, anchor: "middle", sign: true });
    s += draftTable(660, 364, { shirt: GRASS }) + draftTable(820, 364, { shirt: SAND, left: true, hair: "#8C5A3C" });
    s += txt(740, 290, "one drafting floor per tower floor read: 16", { size: 14, anchor: "middle" });
    s += board(500, 20, 300, "HALFWAY UP", MUL);
    s += label(20, 150, ["the cards stop", "at floor 16", "= layer skipping"], [150, 223], { plate: true });
    s += label(440, 310, ["notes from floor 16", "go next door"], [470, 240], { plate: true, anchor: "middle" });
    return wrap("s2", "A Busytown cutaway of a 32-floor office tower. The top sixteen floors are dark and empty behind a sign reading floors 17 to 32 closed, and a red rope blocks the stairs above floor 16. From floor 16 a glass chute carries notes next door to a smaller drafting room, where drafters work at slanted tables; a caption says it has one drafting floor per tower floor read, 16.", s);
  };
  scenes.s3 = function () {
    var s = cloud(160, 40, 0.7) + cloud(700, 36, 0.6) + ground(372);
    // the tower's edge and the cabinet
    var fl = []; for (var i = 0; i < 7; i++) fl.push({ alt: i % 2, cards: i < 6 });
    s += tower(-20, 372, 120, 46, fl, {});
    s += tube("M100 150 C150 150, 160 210, 196 226") + cabinet(176, 372, 1.25, { open: true });
    // the drafting room: two floors, cross and self
    s += R(300, 92, 640, 280, WALL2, 2.5) + P("M290 92 h660 l-14 -20 h-632 z", EXP, 2.5) + R(300, 228, 640, 6, SLAB, 1.5);
    s += board(470, 14, 300, "THE DRAFTING ROOM", MUL);
    s += txt(316, 118, "cross floor: check the cabinet", { size: 15 }) + txt(316, 254, "self floor: the cabinet, and the lines above yours", { size: 15 });
    s += draftTable(420, 226, { shirt: GRASS }) + draftTable(600, 226, { shirt: SAND, hair: "#8C5A3C" });
    s += mini(250, 372, { sc: 0.55, shirt: LILAC, hair: L, lh: [-26, -30], rh: [20, -14] });
    s += K("M262 330 C300 300, 330 250, 380 200", L, 1.5, ' stroke-dasharray="5 4"');
    s += draftTable(440, 366, { shirt: SKY, left: true }) + draftTable(620, 366, { shirt: GRASS, hat: "beret", hatCol: BRICK });
    // the order and the drafts
    s += order(760, 130, 82, 110, { lines: 10, scribble: true, done: 6 }) + txt(801, 258, "draft 7 of 10", { size: 15, anchor: "middle", sign: true });
    s += order(860, 140, 66, 92, { lines: 8 }) + txt(893, 246, "draft 6", { size: 13, anchor: "middle", fill: "#7A5A48" });
    s += C(760, 352, 9, SHEET, 1.6) + C(776, 358, 8, SHEET, 1.6) + C(790, 350, 9, SHEET, 1.6) + txt(830, 356, "drafts 1–5", { size: 13 });
    s += stopwatch(900, 310, 24, 0.7);
    s += label(126, 108, ["filing cabinet", "= the KV cache,", "filed once per chunk"], [204, 262], { plate: true });
    s += label(560, 140, ["50 lines = an action chunk;", "each draft redoes all 50"], [760, 170], { plate: true });
    return wrap("s3", "A Busytown cutaway. At left the tower's edge feeds notes through a chute into a filing cabinet labelled filed once, the KV cache. To its right, the two-storey drafting room: on the upper cross floor drafters copy from the cabinet, and a runner walks between the cabinet and the tables; on the lower self floor drafters glance only at lines above their own. On the wall a work order clipboard reads draft 7 of 10, with six lines drawn and the rest dashed; crumpled earlier drafts lie on the floor beside a stopwatch.", s);
  };
  scenes.s4 = function () {
    var s = cloud(340, 50, 0.6) + cloud(640, 40, 0.7) + ground(360);
    // the office front with a big clock
    s += R(30, 120, 250, 240, MUL, 2.5) + P("M20 120 h270 l-14 -22 h-242 z", MULD, 2.5);
    for (var i = 0; i < 2; i++) for (var j = 0; j < 3; j++) s += R(52 + j * 76, 214 + i * 48, 50, 34, GLASS, 2, 2);
    s += C(155, 166, 34, SHEET, 3) + K("M155 166 V140 M155 166 L176 176", L, 3) + C(155, 166, 3, L, 0);
    s += R(130, 318, 50, 42, WOOD, 2.2, 3);
    // the timeline banner
    s += R(320, 112, 610, 120, SHEET, 2.2, 6);
    s += R(340, 140, 230, 30, PHOTO, 2) + R(570, 140, 40, 30, STAFF, 2);
    for (i = 0; i < 10; i++) s += R(610 + i * 14, 140, 14, 30, EXP, 1.6);
    s += txt(455, 160, "photo desk", { size: 15, anchor: "middle", fill: SHEET, sign: true }) + txt(680, 134, "10 drafts", { size: 14, anchor: "middle" });
    var tx = "", tg = ""; for (i = 1; i <= 14; i++) { if (340 + i * 40 < 750) tx += "M" + (340 + i * 40) + " 182 v12 "; else tg += "M" + (340 + i * 40) + " 182 v12 "; }
    s += K(tx, BAD, 2.6) + K(tg, "#9C8F82", 2.2) + txt(340, 216, "the robot's ticks: one action each", { size: 14 });
    s += K("M750 132 V200", L, 3) + txt(758, 132, "chunk ready", { size: 14 });
    // the robot, waiting
    s += arm(740, 300, 0.8);
    s += bubble(820, 248, 120, 40, 800, 292, { thought: true }) + txt(880, 274, "tick, tick…", { size: 16, anchor: "middle" });
    s += board(340, 16, 280, "THE STOPWATCH", MUL);
    s += label(60, 96, "latency = photo desk + tower + drafts", [150, 132], { plate: true });
    s += label(470, 270, ["d = ticks that pass", "before the order lands (red)"], [620, 194], { plate: true });
    return wrap("s4", "A Busytown street. At left the office building's front with a big clock over the door. Across the middle a long paper banner shows a timeline: a long blue bar for the photo desk, a short purple bar for the tower, and ten small orange bars for the drafts, with a row of red tick marks underneath, one per robot action, and a line marking chunk ready. At right the robot arm waits at its table, thinking: tick, tick.", s);
  };
  scenes.s5 = function () {
    var s = cloud(880, 60, 0.6) + cloud(410, 84, 0.55) + ground(372);
    // the small office: SmolVLA
    var fl = []; for (var i = 0; i < 16; i++) fl.push({ alt: i % 2 });
    s += tower(70, 372, 110, 14, fl, { sign: "SmolVLA" });
    s += R(196, 272, 70, 100, WALL2, 2.2) + P("M190 272 h82 l-8 -12 h-66 z", EXP, 2.2) + order(206, 290, 48, 60, { lines: 6 });
    s += R(18, 300, 46, 72, WALL1, 2.2) + photo(24, 316, 34, { grid: 2 });
    // the big office: pi0
    fl = []; for (i = 0; i < 18; i++) fl.push({ alt: i % 2 });
    s += tower(520, 372, 250, 15, fl, { sign: "π0" });
    s += R(786, 222, 130, 150, WALL2, 2.2) + P("M778 222 h146 l-10 -14 h-126 z", EXP, 2.2) + order(806, 250, 90, 104, { lines: 10 });
    s += R(418, 280, 90, 92, WALL1, 2.2) + photo(432, 300, 56, { grid: 4 });
    s += board(330, 16, 300, "SIDE BY SIDE", MUL);
    s += label(200, 120, ["450M weights", "64 cards a frame", "16 of 32 floors"], [178, 200], { plate: true });
    s += label(322, 178, ["3.3B weights", "256 cards a frame", "all 18 floors, 2048 wide"], [528, 200], { plate: true });
    s += label(284, 304, ["drafting room", "~100M"], [268, 320], { plate: true });
    s += label(880, 120, ["drafting room", "~300M"], [850, 210], { plate: true, anchor: "middle" });
    return wrap("s5", "Two Busytown office buildings side by side. On the left, a slim sixteen-floor tower signed SmolVLA, with a small mailroom and a small orange drafting annex; its label reads 450M weights, 64 cards a frame, 16 of 32 floors, drafting room about 100M. On the right, a much wider eighteen-floor tower signed pi zero, with a bigger mailroom and a bigger drafting annex; its label reads 3.3B weights, 256 cards a frame, all 18 floors 2048 wide, drafting room about 300M.", s);
  };

  /* ---------- icons (nav and cast) ---------- */
  var sk = ' stroke="' + L + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  function ic(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + inner + "</svg>"; }
  function f(c) { return ' fill="' + c + '"' + sk; }
  function ln(c, w) { return ' fill="none" stroke="' + (c || L) + '" stroke-width="' + (w || 3.5) + '" stroke-linecap="round" stroke-linejoin="round"'; }
  var icons = {
    card: ic('<rect x="8" y="16" width="48" height="34" rx="4"' + f(SHEET) + '/><path d="M10 18 h44 v10 h-44 z" fill="' + PHOTO + '"/><path d="M8 28 h48"' + ln() + '/><path d="M16 38 h26 M16 44 h18"' + ln(L, 2.5) + "/>"),
    desk: ic('<rect x="8" y="8" width="38" height="34" rx="2"' + f("#D7E9F3") + '/><path d="M8 30 h38"' + ln() + '/><path d="M20 8 v34 M33 8 v34 M8 19 h38"' + ln(PHOTO, 2) + '/><path d="M4 50 h56"' + ln(L, 5) + '/><path d="M10 50 v10 M54 50 v10"' + ln() + "/>"),
    stapler: ic('<path d="M8 44 h44 v8 h-44 z"' + f(STEEL) + '/><path d="M10 40 L50 28 l4 6 L12 46 z"' + f(BRICK) + '/><rect x="38" y="10" width="20" height="14" rx="2"' + f(SHEET) + '/><path d="M38 10 h20 v5 h-20 z" fill="' + PHOTO + '"/>'),
    tower: ic('<rect x="16" y="8" width="32" height="52" rx="2"' + f(MUL) + '/><path d="M22 16 h20 M22 26 h20 M22 36 h20 M22 46 h20"' + ln(YEL, 4) + '/><path d="M12 8 h40"' + ln(L, 4) + "/>"),
    staff: ic('<circle cx="22" cy="20" r="8"' + f(SKIN) + '/><path d="M10 44 a12 12 0 0 1 24 0 z"' + f(SKY) + '/><circle cx="44" cy="22" r="7"' + f(SKIN) + '/><path d="M33 44 a11 11 0 0 1 22 0 z"' + f(LILAC) + '/><path d="M4 46 h56"' + ln(SLAB, 6) + '/><path d="M8 50 v10 M56 50 v10"' + ln() + "/>"),
    meeting: ic('<ellipse cx="32" cy="40" rx="26" ry="12"' + f(SAND) + '/><path d="M14 38 L50 42 M20 34 L44 46 M32 30 L32 50 M14 44 L48 34"' + ln(STAFF, 2) + '/><circle cx="14" cy="38" r="3.5" fill="' + PHOTO + '"/><circle cx="50" cy="42" r="3.5" fill="' + WORD + '"/><circle cx="32" cy="30" r="3.5" fill="' + ST + '"/><circle cx="44" cy="46" r="3.5" fill="' + PHOTO + '"/>'),
    cabinet: ic('<rect x="14" y="4" width="36" height="56" rx="3"' + f("#8FA3AE") + '/><rect x="18" y="9" width="28" height="14" rx="2"' + f("#B9C7CF") + '/><rect x="18" y="27" width="28" height="14" rx="2"' + f("#B9C7CF") + '/><rect x="18" y="45" width="28" height="11" rx="2"' + f("#B9C7CF") + '/><path d="M28 16 h8 M28 34 h8 M28 50 h8"' + ln(L, 3) + "/>"),
    drafting: ic('<path d="M6 40 L50 24 L56 34 L12 50 z"' + f(SAND) + '/><path d="M14 40 L46 29"' + ln(EXP, 3) + '/><path d="M18 46 L12 62 M46 34 L52 62"' + ln(L, 4) + '/><path d="M44 6 L56 18 L36 22 z"' + f(YEL) + "/>"),
    skip: ic('<rect x="18" y="6" width="28" height="54" rx="2"' + f(MUL) + '/><rect x="22" y="10" width="20" height="22"' + f(DARK) + '/><path d="M22 40 h20 M22 48 h20"' + ln(YEL, 4) + '/><path d="M10 34 h44"' + ln(BAD, 4) + "/>"),
    clock: ic('<rect x="28" y="4" width="8" height="7" rx="1.5"' + f(STEEL) + '/><circle cx="32" cy="36" r="22"' + f(SHEET) + '/><path d="M32 36 V18 A18 18 0 0 1 48 44 z" fill="#F2C2B5"/><path d="M32 36 L48 44"' + ln(BAD, 3.5) + '/><circle cx="32" cy="36" r="3" fill="' + L + '"/>'),
    compare: ic('<rect x="6" y="30" width="18" height="30" rx="2"' + f(MUL) + '/><rect x="30" y="10" width="28" height="50" rx="2"' + f(MUL) + '/><path d="M10 38 h10 M10 46 h10 M35 18 h18 M35 28 h18 M35 38 h18 M35 48 h18"' + ln(YEL, 3) + "/>"),
    pencil: ic('<path d="M10 54 l5 -16 27 -27 11 11 -27 27 z"' + f(YEL) + '/><path d="M37 16 l11 11 M10 54 l5 -16 11 11 z"' + ln() + '/><path d="M42 11 l6 -6 11 11 -6 6"' + f(BRICK) + "/>")
  };

  var out = {};
  Object.keys(scenes).forEach(function (k) { out[k] = scenes[k](); });
  root.VLA_ART = out; root.VLA_ICONS = icons;
})(typeof window !== "undefined" ? window : this);
