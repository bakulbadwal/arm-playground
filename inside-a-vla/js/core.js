/* Inside a VLA — the arithmetic. Pure functions only, exposed as window.VLA (or module.exports in Node).
   A vision-language-action model turns camera frames, an instruction and the robot's joint readings into a chunk of
   actions. This file counts what that costs: how many tokens go in, how many multiply-adds each part does, and,
   on a stated toy computer, roughly how many milliseconds that is. Nothing here is random.

   Exact (from the papers, the released configs and the LeRobot code; see SOURCES.md):
   - the shapes: SmolVLA = SmolVLM2-500M (SigLIP-B/16 at 512 px, pixel shuffle r = 4, SmolLM2-360M-shaped decoder,
     first 16 of 32 layers) + an action expert 0.75× as wide, 16 layers, cross-attention and causal self-attention
     interleaved; π0 = PaliGemma (SigLIP-So400m/14 at 224 px, Gemma-2B) + a 1024-wide, 18-layer action expert
   - the token counts: (image/patch)² patches per frame, ÷ r² after pixel shuffle; 48 instruction tokens (LeRobot's
     tokenizer_max_length for both); one state token
   - the order of work: encode the frames, run the prefix through the backbone once and cache its keys and values,
     then run the action expert once per flow-matching step (10 steps), reading the cache (LeRobot's sample_actions);
     in SmolVLA's expert, cross-attention layers read only the cache and self-attention layers read the cache plus the
     earlier actions of the chunk (LeRobot's smolvlm_with_expert.py and denoise_step)
   Teaching models (labelled on the page):
   - FLOPs: 2 per weight per token for every matrix multiply (the cross-attention layers' k and v projections run over the
     T cached prefix tokens, as LeRobot does on every step), plus 4·(query width)·(queries)·(keys) per attention
     layer; norms, biases, softmax, the small state/action/time projections and the embedding lookup are left out;
     π0's state token is counted once and cached, as the paper says (LeRobot recomputes it each step)
   - time: each stage takes max(FLOPs ÷ F, weight bytes ÷ B) on a made-up computer with throughput F and memory
     bandwidth B, weights in bf16 (2 bytes). Real stacks add kernel-launch, Python and transfer overheads: this is a
     floor, not a forecast. */
(function (root) {
  "use strict";

  /* ---------- the parts ---------- */
  // Vision encoders ("the photo desk"). Shapes from the released configs (SmolVLM2-500M-Video-Instruct; siglip-so400m-patch14-224).
  var EYES = {
    "b16-512": { key: "b16-512", name: "SigLIP-B/16 at 512 px", short: "B/16 · 512 px", img: 512, patch: 16, layers: 12, width: 768, mlp: 3072 },
    "b16-256": { key: "b16-256", name: "SigLIP-B/16 at 256 px", short: "B/16 · 256 px", img: 256, patch: 16, layers: 12, width: 768, mlp: 3072 },
    "so400m-224": { key: "so400m-224", name: "SigLIP-So400m/14 at 224 px", short: "So400m/14 · 224 px", img: 224, patch: 14, layers: 27, width: 1152, mlp: 4304 }
  };
  // Language-model backbones ("the tower"). SmolLM2-360M shape (SmolVLM2-500M text_config) and Gemma-2B (π0 appendix A-B / LeRobot).
  var TOWERS = {
    small: { key: "small", name: "SmolLM2-360M shape", short: "960 wide, 32 floors", layers: 32, width: 960, heads: 15, kv: 5, hd: 64, mlp: 2560, vocab: 49280, family: "llama" },
    big: { key: "big", name: "Gemma-2B shape", short: "2048 wide, 18 floors", layers: 18, width: 2048, heads: 8, kv: 1, hd: 256, mlp: 16384, vocab: 257152, family: "gemma" }
  };
  var LANG = 48;          // instruction tokens: LeRobot's tokenizer_max_length for SmolVLA and π0 (SmolVLA's base config pads to it)
  var BYTES = 2;          // bf16
  var HW = {
    gpu: { key: "gpu", name: "toy desktop GPU", F: 80e12, B: 1000e9 },
    edge: { key: "edge", name: "toy edge board", F: 10e12, B: 100e9 },
    laptop: { key: "laptop", name: "toy laptop CPU", F: 1e12, B: 50e9 }
  };
  var RATES = { 30: "30 fps (SmolVLA's experiments)", 50: "50 Hz (π0's robots)" };

  // LeRobot's SmolVLA expert MLP size: get_intermediate_size(hidden) in smolvlm_with_expert.py.
  function llamaMlp(h) { var x = Math.floor(2 * h / 3); x = Math.floor(4 * x); return 256 * Math.ceil(x / 256); }

  /* ---------- the two models, as configs ---------- */
  // A config fully describes a VLA for this file: eyes, shuffle r, cameras, tower, floors used, expert, steps, chunk.
  var SMOLVLA = { name: "SmolVLA", eyes: "b16-512", r: 4, cams: 3, tower: "small", floors: 16, expertMult: 0.75, expertMlp: null, mode: "interleaved", steps: 10, chunk: 50, stateIn: "prefix" };
  var PI0 = { name: "π0", eyes: "so400m-224", r: 1, cams: 3, tower: "big", floors: 18, expertMult: 0.5, expertMlp: 4096, mode: "joint", steps: 10, chunk: 50, stateIn: "expert" };
  function preset(name) { return Object.assign({}, name === "pi0" ? PI0 : SMOLVLA); }

  /* ---------- tokens ("cards") ---------- */
  function patches(eyes) { var g = eyes.img / eyes.patch; return g * g; }
  function cardsPerFrame(eyes, r) { return patches(eyes) / (r * r); }
  // The prefix the tower reads: photo cards, instruction cards, and the state card if it goes to the tower (SmolVLA).
  function prefix(cfg) {
    var e = EYES[cfg.eyes], img = cfg.cams * cardsPerFrame(e, cfg.r), st = cfg.stateIn === "prefix" ? 1 : 0;
    return { perFrame: cardsPerFrame(e, cfg.r), patches: patches(e), img: img, lang: LANG, state: st, T: img + LANG + st };
  }

  /* ---------- weights ---------- */
  function eyesLayerParams(e) { return 4 * e.width * e.width + 2 * e.width * e.mlp; }
  function eyesParams(e) { return e.layers * eyesLayerParams(e) + 3 * e.patch * e.patch * e.width + patches(e) * e.width; }
  // The connector: pixel shuffle stacks r×r patches into one vector of width·r², and a linear layer maps it to the tower width.
  function connParams(e, r, t) { return e.width * r * r * t.width; }
  function towerLayerParams(t) { var q = t.heads * t.hd, kv = t.kv * t.hd; return 2 * t.width * q + 2 * t.width * kv + 3 * t.width * t.mlp; }
  function expertShape(cfg) {
    var t = TOWERS[cfg.tower], w = Math.round(t.width * cfg.expertMult);
    return { width: w, mlp: cfg.expertMlp || (t.family === "gemma" ? 4 * w : llamaMlp(w)), layers: cfg.floors, q: t.heads * t.hd, kv: t.kv * t.hd };
  }
  // Per-layer weights of the expert. A self-attention layer projects its own tokens to q, k, v; a cross-attention layer
  // (SmolVLA) projects the tower's cached keys and values (kv wide) instead, so its k and v matrices are kv × kv.
  function expertLayerParams(x, kind) {
    var att = kind === "ca" ? x.width * x.q + 2 * x.kv * x.kv + x.q * x.width : 2 * x.width * x.q + 2 * x.width * x.kv;
    return att + 3 * x.width * x.mlp;
  }
  // Which kind each expert layer is. "ca": cross-attention, the action tokens read only the cached prefix. "sa": self-attention
  // as LeRobot's SmolVLA runs it: the action tokens read the cached prefix and the earlier action tokens (a causal mask
  // within the chunk). "joint": π0, where every layer reads the prefix, the state and the whole chunk (bidirectional).
  // LeRobot keeps self-attention on layer_idx % self_attn_every_n_layers == 0, so layers 0, 2, 4, … are "sa".
  function expertLayers(cfg) {
    var out = [];
    for (var i = 0; i < cfg.floors; i++) out.push(cfg.mode === "joint" ? "joint" : (i % 2 === 0 ? "sa" : "ca"));
    return out;
  }
  function expertParams(cfg) { var x = expertShape(cfg); return expertLayers(cfg).reduce(function (s, k) { return s + expertLayerParams(x, k); }, 0); }
  // The weights a chunk actually runs through: photo desk, connector, the floors used, the expert.
  function params(cfg) {
    var e = EYES[cfg.eyes], t = TOWERS[cfg.tower];
    var p = { eyes: eyesParams(e), conn: connParams(e, cfg.r, t), tower: cfg.floors * towerLayerParams(t), expert: expertParams(cfg) };
    p.hot = p.eyes + p.conn + p.tower + p.expert;
    p.embed = t.vocab * t.width;     // the word-embedding table: looked up, not multiplied
    return p;
  }

  /* ---------- FLOPs ---------- */
  // The photo desk, all frames: 2 per weight per patch, plus attention among each frame's patches, plus the patch embedding and the connector.
  function eyesFlops(cfg) {
    var e = EYES[cfg.eyes], t = TOWERS[cfg.tower], p = patches(e);
    var lin = 2 * e.layers * eyesLayerParams(e) * p, att = 4 * e.layers * e.width * p * p, emb = 2 * 3 * e.patch * e.patch * e.width * p, conn = 2 * e.width * t.width * p;
    return { lin: cfg.cams * (lin + emb), att: cfg.cams * att, conn: cfg.cams * conn, total: cfg.cams * (lin + emb + att + conn) };
  }
  // The tower on the prefix, once: staff work (2 per weight per card per floor) and the meeting (every card against every card).
  function towerFlops(cfg, Tover) {
    var t = TOWERS[cfg.tower], T = Tover == null ? prefix(cfg).T : Tover, q = t.heads * t.hd;
    var lin = 2 * towerLayerParams(t) * cfg.floors * T, att = 4 * cfg.floors * q * T * T;
    var st = 0;
    // π0: the state token goes through the expert once and its keys and values are cached, as the paper says they can be
    // (appendix A-B). LeRobot's modeling_pi0.py instead re-embeds the state with the actions on every denoising step; that is
    // one extra card per draft, 2% of a draft, and this file follows the paper.
    if (cfg.stateIn === "expert") { var x = expertShape(cfg); st = 2 * expertParams(cfg) * 1 + 4 * cfg.floors * x.q * 1 * (T + 1); }
    return { lin: lin, att: att, state: st, total: lin + att + st };
  }
  // One pass of the expert over the chunk of n action cards. Cross layers read the T cached prefix cards; self layers read
  // the T prefix cards and the earlier action cards (n(n+1)/2 pairs); π0's joint layers read the prefix, the state and all n.
  // Staff work is 2 per weight per card, where "card" is whatever a matrix multiplies: n action cards for most weights, but the
  // T cached prefix cards for a cross layer's k and v projections, which LeRobot applies to the cached keys and values on
  // every step (smolvlm_with_expert.py, forward_cross_attn_layer).
  function passFlops(cfg, Tover) {
    var x = expertShape(cfg), n = cfg.chunk, T = (Tover == null ? prefix(cfg).T : Tover) + (cfg.stateIn === "expert" ? 1 : 0);
    var caKV = 2 * x.kv * x.kv, nCA = 0, att = 0;
    expertLayers(cfg).forEach(function (k) {
      if (k === "ca") { att += 4 * x.q * n * T; nCA++; }
      else if (k === "sa") att += 4 * x.q * (n * T + n * (n + 1) / 2);
      else att += 4 * x.q * n * (T + n);
    });
    var proj = 2 * caKV * nCA * T, lin = 2 * (expertParams(cfg) - caKV * nCA) * n + proj;
    return { lin: lin, proj: proj, att: att, total: lin + att, kvRead: kvBytes(cfg, T) };
  }
  // Bytes of cached keys and values a pass reads: k and v, kv wide, T cards, on every layer (all of them read the prefix).
  function kvBytes(cfg, T) { var x = expertShape(cfg); return 2 * x.kv * T * BYTES * cfg.floors; }

  /* ---------- the whole chunk ---------- */
  function flops(cfg) {
    var e = eyesFlops(cfg), tw = towerFlops(cfg), ps = passFlops(cfg);
    return { eyes: e.total, tower: tw.total, pass: ps.total, passes: cfg.steps * ps.total, total: e.total + tw.total + cfg.steps * ps.total, parts: { eyes: e, tower: tw, pass: ps } };
  }
  // Without the cache ("filing cabinet"), every pass would run the prefix through the tower again (the frames are still encoded once).
  function flopsNoCache(cfg) { var f = flops(cfg); return f.eyes + cfg.steps * (f.tower + f.pass); }

  /* ---------- the toy stopwatch ---------- */
  function stage(fl, bytes, hw) { var a = fl / hw.F, b = bytes / hw.B; return { s: Math.max(a, b), compute: a, memory: b, bound: a >= b ? "compute" : "memory" }; }
  function latency(cfg, hwKey) {
    var hw = HW[hwKey || "gpu"], p = params(cfg), f = flops(cfg);
    var eyes = stage(f.eyes, BYTES * (p.eyes + p.conn), hw);
    var tower = stage(f.tower, BYTES * (p.tower + (cfg.stateIn === "expert" ? p.expert : 0)), hw);
    var pass = stage(f.pass, BYTES * p.expert + f.parts.pass.kvRead, hw);
    var total = eyes.s + tower.s + cfg.steps * pass.s;
    return { hw: hw, eyes: eyes, tower: tower, pass: pass, passes: cfg.steps * pass.s, prefill: eyes.s + tower.s, total: total, ms: total * 1000 };
  }
  // Inference delay in control ticks, as the RTC paper defines it: d = ⌊δ / Δt⌋.
  function ticks(ms, rate) { return Math.floor(ms * rate / 1000 + 1e-9); }
  // SmolVLA's no-starvation threshold (§3.3): the queue never runs dry if g ≥ (E[ℓ_S] / Δt) / n, with the latency in ticks
  // left unfloored. A result above 1 means no threshold works: the chunk is shorter than the time it takes to make one.
  function gNeeded(ms, rate, n) { return (ms * rate / 1000) / n; }
  function chunkMs(n, rate) { return n * 1000 / rate; }

  /* ---------- paper figures used in charts (quoted, not computed; see SOURCES.md) ---------- */
  var PAPER = {
    // SmolVLA Table 8, LIBERO average success (%) by the number of VLM layers kept, N.
    layers: [{ N: 8, avg: 75.0 }, { N: 16, avg: 78.5 }, { N: 24, avg: 79.5 }, { N: 32, avg: 80.3 }],
    skip2: 75.5, vlm256: 75.8,
    // SmolVLA Table 6 (attention between expert and VLM) and Table 7 (mask within the expert), LIBERO average (%).
    attn: { CA: 79.0, SA: 74.5, "CA+SA": 85.5 }, mask: { bidir: 67.5, causal: 74.5 },
    // SmolVLA Table 12: chunk size n.
    chunk: [{ n: 1, avg: 50.0 }, { n: 10, avg: 84.0 }, { n: 30, avg: 78.5 }, { n: 50, avg: 80.3 }, { n: 100, avg: 74.5 }],
    // SmolVLA Table 9: expert width w.r.t. the VLM.
    width: [{ m: 1.0, avg: 82.3 }, { m: 0.75, avg: 77.5 }, { m: 0.5, avg: 80.3 }, { m: 0.25, avg: 73.8 }]
  };

  var VLA = {
    EYES: EYES, TOWERS: TOWERS, HW: HW, RATES: RATES, LANG: LANG, BYTES: BYTES, PAPER: PAPER, SMOLVLA: SMOLVLA, PI0: PI0,
    preset: preset, llamaMlp: llamaMlp, patches: patches, cardsPerFrame: cardsPerFrame, prefix: prefix,
    eyesParams: eyesParams, connParams: connParams, towerLayerParams: towerLayerParams, expertShape: expertShape, expertLayerParams: expertLayerParams,
    expertLayers: expertLayers, expertParams: expertParams, params: params,
    eyesFlops: eyesFlops, towerFlops: towerFlops, passFlops: passFlops, kvBytes: kvBytes, flops: flops, flopsNoCache: flopsNoCache,
    latency: latency, ticks: ticks, gNeeded: gNeeded, chunkMs: chunkMs
  };
  if (typeof module !== "undefined" && module.exports) module.exports = VLA; else root.VLA = VLA;
})(this);
