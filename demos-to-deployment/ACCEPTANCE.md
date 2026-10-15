# Acceptance

Every number the page quotes, as `node tests/check.js` prints it (seeded: the same on every machine). The page computes the same numbers live, with the same seeds; the lines marked ✓ are the invariants the build must keep.

```

Machinery
  ✓ k-d tree returns the same 5 nearest pages as brute force (200 queries)
  ✓ RTC mask: 1 on the frozen 10, 0 from H − s = 25 on
  ✓ RTC mask never rises
  RTC mask (d = 10, s = 25), i = 10…24: 0.85 0.71 0.59 0.49 0.40 0.32 0.25 0.19 0.14 0.10 0.07 0.04 0.02 0.01 0.00
  ✓ a seeded run is the same every time

Step 0 · Main Street (street 11, 16 m)
  logbook: 20 runs, 16120 pages
  clean street   master off 0.00 m, max 0.0 cm | apprentice off 0.00 m, max 1.7 cm
  pothole at 4 m master off 0.00 m, max 4.3 cm | apprentice off 3.80 m, max 7.9 cm
  ✓ the apprentice copies the master on a clean street
  ✓ after one pothole the apprentice paints far more off the line than the master

Step 1 · Off the map
  pages within 5 cm of the line: 100.0% · heading within 0.05 rad: 99.4%
  notebook map cells with a page: 15 of 576
  fleet of 12, potholes 0.08/m, ±0.2 rad. off-line metres by street length 4 / 8 / 16 / 32 m:
    master     0.00 / 0.00 / 0.00 / 0.12
    apprentice 0.41 / 1.53 / 4.50 / 12.12
    apprentice growth per doubling: 3.7× 2.9× 2.7×
  ✓ at 32 m the apprentice paints over 3× the master's off-line metres
  ✓ apprentice: 4× the street, more than 4× the off-line paint (superlinear)

Step 2 · The master rides along (DAgger, p = 0.5)
  iteration 2: β = 0.500, +2400 pages (18520 total) → pothole street off 0.00 m, max 3.1 cm
  iteration 3: β = 0.250, +2400 pages (20920 total) → pothole street off 0.00 m, max 3.2 cm
  iteration 4: β = 0.125, +2400 pages (23320 total) → pothole street off 0.00 m, max 3.3 cm
  iteration 5: β = 0.063, +2400 pages (25720 total) → pothole street off 0.00 m, max 3.5 cm
  instead, 20 more runs from the master (40 total): pothole street off 4.96 m, max 24.3 cm
  ✓ after DAgger the pothole costs under a third of what it did
  ✓ doubling the master's runs does not fix it
  fleet of 12 on 16 m: master 0.00 m · apprentice 4.50 m · after DAgger 0.14 m off the line

Step 3 · The drafting desk (synchronous, 40 test streets, cement at 8 m)
  d 0 s 10: time 16.6 s · stopped 0.0 s in 0.0 blobs · off 1.07 m · kinks 0.1 · flips 0/40 · cement 0/40 · queries 83 · idle 0.0% (formula 0.0%)
  d 0 s 25: time 16.6 s · stopped 0.0 s in 0.0 blobs · off 0.74 m · kinks 0.3 · flips 0/40 · cement 0/40 · queries 34 · idle 0.0% (formula 0.0%)
  d 0 s 50: time 16.6 s · stopped 0.0 s in 0.0 blobs · off 1.55 m · kinks 2.6 · flips 0/40 · cement 0/40 · queries 17 · idle 0.0% (formula 0.0%)
  d 4 s 10: time 23.2 s · stopped 6.7 s in 83.3 blobs · off 1.07 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 83 · idle 28.7% (formula 28.6%)
  ✓   idle share matches d/(d+s) within 2 points (d 4, s 10)
  d 4 s 25: time 19.3 s · stopped 2.7 s in 33.7 blobs · off 0.74 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 34 · idle 14.0% (formula 13.8%)
  ✓   idle share matches d/(d+s) within 2 points (d 4, s 25)
  d 4 s 50: time 18.0 s · stopped 1.4 s in 17.0 blobs · off 1.55 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 17 · idle 7.6% (formula 7.4%)
  ✓   idle share matches d/(d+s) within 2 points (d 4, s 50)
  d 10 s 10: time 33.2 s · stopped 16.7 s in 83.3 blobs · off 1.07 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 83 · idle 50.1% (formula 50.0%)
  ✓   idle share matches d/(d+s) within 2 points (d 10, s 10)
  d 10 s 25: time 23.3 s · stopped 6.7 s in 33.7 blobs · off 0.74 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 34 · idle 28.9% (formula 28.6%)
  ✓   idle share matches d/(d+s) within 2 points (d 10, s 25)
  d 10 s 50: time 20.0 s · stopped 3.4 s in 17.0 blobs · off 1.55 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 17 · idle 17.0% (formula 16.7%)
  ✓   idle share matches d/(d+s) within 2 points (d 10, s 50)
  d 20 s 10: time 49.9 s · stopped 33.3 s in 83.3 blobs · off 1.07 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 83 · idle 66.8% (formula 66.7%)
  ✓   idle share matches d/(d+s) within 2 points (d 20, s 10)
  d 20 s 25: time 30.1 s · stopped 13.5 s in 33.7 blobs · off 0.74 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 34 · idle 44.8% (formula 44.4%)
  ✓   idle share matches d/(d+s) within 2 points (d 20, s 25)
  d 20 s 50: time 23.4 s · stopped 6.8 s in 17.0 blobs · off 1.55 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 17 · idle 29.1% (formula 28.6%)
  ✓   idle share matches d/(d+s) within 2 points (d 20, s 50)

Step 4 · The committee (ACT temporal ensembling, m = 0.01, a query every tick)
  d 0: time 16.6 s · stopped 0.0 s in 0.0 blobs · off 0.80 m · kinks 0.0 · flips 0/40 · cement 0/40 · queries 829
  d 10: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.82 m · kinks 0.5 · flips 0/40 · cement 1/40 · queries 839
  d 15: time 16.9 s · stopped 0.3 s in 1.0 blobs · off 1.06 m · kinks 2.2 · flips 1/40 · cement 2/40 · queries 845
  d 20: time 17.0 s · stopped 0.4 s in 1.0 blobs · off 1.35 m · kinks 8.8 · flips 3/40 · cement 6/40 · queries 850
  d 25: time 17.1 s · stopped 0.5 s in 1.0 blobs · off 3.27 m · kinks 28.7 · flips 14/40 · cement 21/40 · queries 857
  no ensembling, sync d 0 s 25: time 16.6 s · stopped 0.0 s in 0.0 blobs · off 0.74 m · kinks 0.3 · flips 0/40 · cement 0/40 · queries 34
  ✓ at d = 25 the committee averages at least 15 of 40 runs into the cement

Step 5 · Order ahead (SmolVLA async, H = 50, aggregate = latest unless named)
  d 10: queue never runs dry when g ≥ d/H = 0.20
      g 0: time 20.0 s · stopped 3.4 s in 17.0 blobs · off 1.55 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 17
      g 0.1: time 18.6 s · stopped 2.0 s in 18.9 blobs · off 0.81 m · kinks 0.6 · flips 0/40 · cement 0/40 · queries 19
      g 0.2: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.83 m · kinks 5.0 · flips 0/40 · cement 0/40 · queries 21
      g 0.3: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.54 m · kinks 3.3 · flips 0/40 · cement 0/40 · queries 24
      g 0.5: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.71 m · kinks 1.3 · flips 0/40 · cement 0/40 · queries 34
      g 0.7: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.84 m · kinks 1.7 · flips 1/40 · cement 0/40 · queries 56
      g 1: time 16.7 s · stopped 0.2 s in 1.0 blobs · off 2.94 m · kinks 58.8 · flips 21/40 · cement 19/40 · queries 84
      g 0.5 average: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 1.00 m · kinks 0.3 · flips 1/40 · cement 0/40 · queries 34
      g 0.5 weighted: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.88 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 34
  d 20: queue never runs dry when g ≥ d/H = 0.40
      g 0: time 23.4 s · stopped 6.8 s in 17.0 blobs · off 1.55 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 17
      g 0.1: time 22.3 s · stopped 5.8 s in 18.9 blobs · off 0.81 m · kinks 0.6 · flips 0/40 · cement 0/40 · queries 19
      g 0.2: time 20.9 s · stopped 4.4 s in 20.9 blobs · off 0.83 m · kinks 0.5 · flips 0/40 · cement 0/40 · queries 21
      g 0.3: time 19.3 s · stopped 2.7 s in 23.8 blobs · off 0.87 m · kinks 0.8 · flips 0/40 · cement 0/40 · queries 24
      g 0.5: time 17.0 s · stopped 0.4 s in 1.0 blobs · off 0.76 m · kinks 5.3 · flips 0/40 · cement 0/40 · queries 34
      g 0.7: time 17.2 s · stopped 0.4 s in 1.0 blobs · off 6.41 m · kinks 37.4 · flips 27/40 · cement 19/40 · queries 43
      g 1: time 17.2 s · stopped 0.4 s in 1.0 blobs · off 6.22 m · kinks 36.0 · flips 28/40 · cement 24/40 · queries 43
      g 0.5 average: time 17.0 s · stopped 0.4 s in 1.0 blobs · off 0.76 m · kinks 5.3 · flips 1/40 · cement 0/40 · queries 34
      g 0.5 weighted: time 17.0 s · stopped 0.4 s in 1.0 blobs · off 0.76 m · kinks 5.3 · flips 0/40 · cement 0/40 · queries 34
  d 10: sync 23.3 s vs async g 0.5 16.8 s per street (28% faster)
  ✓ async with g ≥ d/H stops only for the very first order

Step 6 · Seams (naive async: switch the moment the new order lands, s = 25)
  d 5: time 16.7 s · stopped 0.1 s in 1.0 blobs · off 0.75 m · kinks 0.4 · flips 0/40 · cement 0/40 · queries 34
  d 10: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.71 m · kinks 1.3 · flips 0/40 · cement 0/40 · queries 34
  d 15: time 16.9 s · stopped 0.3 s in 1.0 blobs · off 0.79 m · kinks 2.7 · flips 0/40 · cement 0/40 · queries 34
  d 20: time 17.0 s · stopped 0.4 s in 1.0 blobs · off 0.76 m · kinks 5.3 · flips 0/40 · cement 0/40 · queries 34
  d 25: time 17.6 s · stopped 0.5 s in 1.0 blobs · off 8.77 m · kinks 29.3 · flips 26/40 · cement 19/40 · queries 35

Step 7 · Tracing paper (Real-Time Chunking, s = 25)
  d 5: time 16.7 s · stopped 0.1 s in 1.0 blobs · off 1.15 m · kinks 0.1 · flips 1/40 · cement 0/40 · queries 34
  d 10: time 16.8 s · stopped 0.2 s in 1.0 blobs · off 0.96 m · kinks 0.3 · flips 0/40 · cement 0/40 · queries 34
  d 15: time 16.9 s · stopped 0.3 s in 1.0 blobs · off 0.96 m · kinks 0.8 · flips 0/40 · cement 0/40 · queries 34
  d 20: time 17.0 s · stopped 0.4 s in 1.0 blobs · off 0.62 m · kinks 2.2 · flips 0/40 · cement 0/40 · queries 34
  d 25: time 17.1 s · stopped 0.5 s in 1.0 blobs · off 1.48 m · kinks 7.5 · flips 1/40 · cement 2/40 · queries 34
  ✓ at d = 25 RTC flips sides in under a third as many runs as naive switching
  ✓ at d = 25 RTC drives into the cement less often than naive switching

Reacting to a late pour (cement poured 1.6 m ahead, d = 10): metres driven blind, median / max
  sync s 10: 0.07 / 0.20 m · stopped 16.7 s · cement 0/40
  sync s 25: 0.44 / 0.49 m · stopped 6.7 s · cement 0/40
  naive s 25: 0.63 / 0.68 m · stopped 0.2 s · cement 0/40
  async g 0.5: 0.63 / 0.68 m · stopped 0.2 s · cement 0/40
  async g 0.2: 0.84 / 0.92 m · stopped 0.2 s · cement 13/40
  rtc s 25: 0.63 / 0.68 m · stopped 0.2 s · cement 3/40
  rtc s 10: 0.27 / 0.40 m · stopped 0.2 s · cement 0/40
  ensemble: 0.21 / 0.22 m · stopped 0.2 s · cement 2/40

all checks passed · 25.5 s
```
