# Acceptance

Every number the page quotes, as `node tests/check.js` prints it. Nothing is random, so it is the same on every machine. The page computes the same numbers live from `js/core.js`; the lines marked ✓ are the invariants the build must keep. Paper figures are marked "quoted" and come from [`SOURCES.md`](SOURCES.md).

```

Shapes and weights (from the released configs; the papers' totals for comparison)
  SmolVLA expert: width 720 (0.75 × 960), MLP 2048 (LeRobot's get_intermediate_size), 16 layers, 8 cross + 8 self
  π0 expert: width 1024, MLP 4096, 18 layers
  weights per tower floor: SmolLM2-360M shape 9.8M · Gemma-2B 110.1M
  SmolVLA weights a chunk runs through: photo desk 86.3M + connector 11.8M + tower 157.3M + expert 98.2M = 353.6M (word embeddings 47.3M; paper: 450M)
  π0 weights a chunk runs through: photo desk 412.0M + connector 2.4M + tower 1981.8M + expert 311.4M = 2.71B (word embeddings 526.6M; paper: 3.3B)
  ✓ SmolVLA's expert comes out at ~100M, as the paper says (98M)
  ✓ π0's expert comes out at ~300M, as the paper says (311M)
  ✓ SigLIP-So400m comes out at ~400M (412M)
  SmolVLA: the paper's 450M less the 354M that run per chunk = 96M of weights that don't (the word-embedding table alone is 47M)
  ✓ π0: running weights + Gemma's embedding table ≈ 3.3B (3.23B)
  ✓ π0 runs 7–8× SmolVLA's weights per chunk (7.66×)

Step 0 · The mailroom: cards
  SmolVLA: (512 ÷ 16)² = 1024 tiles ÷ 4² = 64 cards a frame; 3 cameras 192 + 48 words + 1 joint = 241
  π0: (224 ÷ 14)² = 256 a frame; 3 cameras 768 + 48 words = 816 (joint card to the expert)
  ✓ SmolVLA: 64 cards per frame, the paper's figure
  ✓ π0: 256 per 224-px frame, PaliGemma's figure
  ✓ prefixes: 241 and 816
  r = 2: 256 a frame, prefix 817 · r = 1: prefix 3121 · two cameras: 177

Step 1 · The tower: one forward pass
  SmolVLA tower: staff 75.8 + meetings 3.6 = 79.4 GFLOP; meetings 4.5%
  π0 tower: staff 3234.3 + meetings 98.2 + joint card 0.7 = 3333.2 GFLOP; meetings 2.9%
  SmolVLA, bundler off (r = 1): 3121 cards (13.0×), tower 1580.2 GFLOP = 19.9×; staff 13.0×, meetings 168× and now 38% of the tower
  SmolVLA, r = 2: tower 298.0 GFLOP
  photo desk: SmolVLA 646.0 GFLOP (1024 tiles a frame through 86M weights; connector 4.5) · π0 660.5 GFLOP (256 tiles through 412M)
  share of the prefix in the photo desk: SmolVLA 89.1% of 725.3 GFLOP · π0 16.5%
  ✓ attention is a small share of SmolVLA's tower at 241 cards
  ✓ turning the bundler off grows the tower more than the card count
  ✓ after pixel shuffle, the photo desk is most of SmolVLA's prefix
  ✓ the two photo desks cost within 5% of each other

Step 2 · Halfway up: layer skipping
  ✓ N = 4: tower 19.8 + 10 drafts 28.1 + photo desk 646.0 = 693.9 GFLOP, saves 33% against 32
  ✓ N = 8: tower 39.7 + 10 drafts 56.1 + photo desk 646.0 = 741.8 GFLOP, saves 28% against 32
  ✓ N = 12: tower 59.5 + 10 drafts 84.2 + photo desk 646.0 = 789.7 GFLOP, saves 23% against 32
  ✓ N = 16: tower 79.4 + 10 drafts 112.3 + photo desk 646.0 = 837.6 GFLOP, saves 19% against 32
  ✓ N = 20: tower 99.2 + 10 drafts 140.3 + photo desk 646.0 = 885.5 GFLOP, saves 14% against 32
  ✓ N = 24: tower 119.1 + 10 drafts 168.4 + photo desk 646.0 = 933.4 GFLOP, saves 9% against 32
  ✓ N = 28: tower 138.9 + 10 drafts 196.5 + photo desk 646.0 = 981.4 GFLOP, saves 5% against 32
  ✓ N = 32: tower 158.8 + 10 drafts 224.6 + photo desk 646.0 = 1029.3 GFLOP, saves 0% against 32
  tower + drafting room: 32 floors 383.3 → 16 floors 191.7 GFLOP (0.500×)
  ✓ N = L/2 exactly halves the tower and the drafting room
  SmolVLA Table 8 (quoted): N = 8: 75.0 · N = 16: 78.5 · N = 24: 79.5 · N = 32: 80.3 · Skip %2 75.5 · VLM-256M 75.8

Step 3 · The drafting room
  SmolVLA one draft: 11.2 GFLOP (14.1% of the tower's 79.4); 10 drafts 112.3 GFLOP; reads per cross floor 50 × 241 = 12050, per self floor 50 × 241 + 1,275 = 13325
  of which the 8 cross floors' k and v projections over the 241 cached cards: 0.79 GFLOP (2 × 2 × 320² × 8 × 241), LeRobot's way; over 50 cards it would be 0.16
  ✓ the cross floors' k and v projections are counted over the 241 cached cards, not the 50 action cards
  π0 one draft: 37.5 GFLOP (1.1% of the tower); 10 drafts 375.3; reads per floor 50 × (816 + 1 + 50) = 43350
  without the cache: SmolVLA 837.6 → 1552.0 GFLOP (1.85×) · π0 4.37 → 34.4 TFLOP (7.87×); π0's tower is 76% of its chunk
  ✓ the cache is worth more to the bigger tower
  SmolVLA n = 10: one draft 2.87 GFLOP
  SmolVLA n = 50: one draft 11.23 GFLOP
  SmolVLA n = 100: one draft 21.74 GFLOP
  SmolVLA Tables 6, 7, 12 (quoted): CA 79 · SA 74.5 · CA+SA 85.5 · causal 74.5 · bidirectional 67.5 · chunk 1 → 50.0, 10 → 84.0, 30 → 78.5, 50 → 80.3, 100 → 74.5

Step 4 · The stopwatch (toy computers: F, B; bf16 weights)
  toy desktop GPU: F = 80 TFLOP/s, B = 1000 GB/s
  toy edge board: F = 10 TFLOP/s, B = 100 GB/s
  toy laptop CPU: F = 1 TFLOP/s, B = 50 GB/s
  SmolVLA on the toy desktop GPU: photo desk 8.07 ms (compute) + tower 0.99 ms (compute) + 10 × 0.201 ms (memory) = 11.1 ms · d = 0 at 30 fps, 0 at 50 Hz
  π0 on the toy desktop GPU: photo desk 8.26 ms (compute) + tower 41.67 ms (compute) + 10 × 0.638 ms (memory) = 56.3 ms · d = 1 at 30 fps, 2 at 50 Hz
  SmolVLA on the toy edge board: photo desk 64.60 ms (compute) + tower 7.94 ms (compute) + 10 × 2.014 ms (memory) = 92.7 ms · d = 2 at 30 fps, 4 at 50 Hz
  π0 on the toy edge board: photo desk 66.05 ms (compute) + tower 333.32 ms (compute) + 10 × 6.379 ms (memory) = 463.2 ms · d = 13 at 30 fps, 23 at 50 Hz
  SmolVLA on the toy laptop CPU: photo desk 645.96 ms (compute) + tower 79.38 ms (compute) + 10 × 11.228 ms (compute) = 837.6 ms · d = 25 at 30 fps, 41 at 50 Hz
  π0 on the toy laptop CPU: photo desk 660.53 ms (compute) + tower 3333.24 ms (compute) + 10 × 37.535 ms (compute) = 4369.1 ms · d = 131 at 30 fps, 218 at 50 Hz
  SmolVLA, toy desktop GPU: 10 drafts 11.1 ms → 5 drafts 10.1 ms; one draft reads 201 MB (11.2 GFLOP)
  SmolVLA, toy laptop CPU, 30 fps: 838 ms ÷ 33.3 ms = 25.1, d = 25; sync cycle 25 + 50 = 75 ticks; async g ≥ 25.1 / 50 = 0.50 (unfloored)
  SmolVLA n = 10: toy GPU 11.08 ms · toy laptop 765.6 ms, g ≥ 2.30 (above 1: no threshold works, shown as such on the page)
  SmolVLA n = 50: toy GPU 11.08 ms · toy laptop 837.6 ms, g ≥ 0.50
  SmolVLA n = 100: toy GPU 11.78 ms · toy laptop 942.8 ms, g ≥ 0.28
  ✓ on the toy laptop a 10-line order needs g > 1 (impossible) while a 50-line order does not
  ✓ on the toy GPU SmolVLA's drafts are memory-bound and its tower compute-bound
  ✓ on the toy GPU, 10 lines cost what 50 cost (memory-bound drafts)
  π0 prefill (photo desk + tower) on the toy GPU: 49.9 ms (RTC paper: 46 ms on an RTX 4090)
  ✓ the toy GPU's π0 prefill lands within 15% of the reported 46 ms

Step 5 · Side by side
  per chunk: SmolVLA 0.84 TFLOP · π0 4.37 TFLOP · ratio 5.2× · paper parameter ratio 3.3B / 450M = 7.3×
  towers: π0 42× SmolVLA's; SmolVLA's photo desk is 77% of its chunk
  work order A (laptop, 30 fps, < 200 ms): B/16·256 px + 2 cameras + 5 drafts = 170.1 ms · B/16·256 px + 3 drafts = 201.8 ms
  work order B (big tower, toy GPU, 50 Hz, d ≤ 1): π0 as is 56.3 ms, d 2 · r = 2: 26.5 ms · 9 floors: 32.3 ms · 1 camera: 24.3 ms
  work order C (edge, 3 cameras, ≤ half of 92.7 = 46.3 ms): B/16·256 px 37.0 ms · 4 floors + 1 draft 67.1 ms (photo desk alone 64.6 ms)
  ✓ work order A is solvable
  ✓ work order B is solvable two ways
  ✓ work order C needs the photo desk: cutting floors and drafts can't halve it

Field test answers
  1. SmolVLA, 2 cameras: 177 cards
  2. r = 2: 256 cards a frame
  3. SmolVLA r = 2 tower: 298.0 GFLOP
  4. SmolVLA N = 8 chunk: 741.8 GFLOP
  5. π0 one draft: 37.5 GFLOP
  6. π0 on the toy edge board: 463.2 ms
  7. SmolVLA, toy edge board, 50 Hz: d = 4
  8. π0 weights per chunk: 2.71B

all checks pass
```
