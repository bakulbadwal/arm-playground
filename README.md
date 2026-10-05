<p align="center">
  <a href="https://bakulbadwal.github.io/arm-playground/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/dark.png">
      <img src="docs/hero.png" width="900" alt="Arm Playground: a two-joint robot arm reaching a target, next to its configuration-space map coloured by which inverse-kinematics solution an iterative solver converges to">
    </picture>
  </a>
</p>

<h1 align="center">Arm Playground</h1>

<p align="center">
  <b>Learn robot kinematics and control by touching them.</b><br>
  An interactive two-joint arm with 30 guided lessons, the last six on the real five-joint arm in 3D,<br>
  built as a companion to
  <a href="https://huggingface.co/learn/robotics-course/unit2/1">Unit 2 · Classical Robotics</a> of the <a href="https://huggingface.co/learn/robotics-course">Hugging Face Robotics Course</a>,<br>
  plus a <a href="https://bakulbadwal.github.io/arm-playground/datasets.html">second page for Unit 1</a>: what <code>LeRobotDataset</code> actually fetches when you ask for a temporal window.
</p>

<p align="center">
  <a href="https://bakulbadwal.github.io/arm-playground/"><b>▶ Open the playground</b></a> ·
  <a href="https://bakulbadwal.github.io/arm-playground/#r3&step=1"><b>▶ The real arm in 3D</b></a> ·
  <a href="https://bakulbadwal.github.io/arm-playground/datasets.html"><b>▶ Unit 1 · Datasets</b></a> ·
  <a href="#whats-inside">What's inside</a> ·
  <a href="#how-it-compares">How it compares</a> ·
  <a href="#deep-links-for-teachers">Deep links</a>
</p>

<p align="center">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="No build step" src="https://img.shields.io/badge/build-none%20·%20plain%20HTML-2f6fdb">
  <img alt="Works on phones" src="https://img.shields.io/badge/mobile-yes-16925b">
  <a href="https://huggingface.co/spaces/bacool/arm-playground"><img alt="Hugging Face Space" src="https://img.shields.io/badge/🤗%20Space-bacool%2Farm--playground-ffd21e"></a>
</p>

<p align="center"><sub>Also hosted as a <a href="https://huggingface.co/spaces/bacool/arm-playground">Hugging Face Space</a>, and the source of the diagrams offered to the course in <a href="https://github.com/huggingface/robotics-course/pull/37">huggingface/robotics-course#37</a>.</sub></p>

<p align="center">
  <img src="docs/solver.gif" width="880" alt="Animation: an iterative inverse-kinematics solver walks the arm from a folded pose to the target while its path is traced across the configuration-space map, coloured by which solution each starting pose converges to">
  <br><sub>Iterative IK racing to a solution. The map's green and purple regions are the basins of attraction: start anywhere in green and you converge to A, purple to B.</sub>
</p>

---

## Why this exists

Unit 2 of the Hugging Face Robotics Course makes one argument: *even a two-joint arm needs real math to control, and that math breaks on contact, clutter and cameras, which is why the field is learning from data.* The unit gives the equations (forward kinematics, inverse kinematics, the Jacobian, feedback) but no way to push on them. Its source even carries TODO placeholders for the diagrams.

This playground is those diagrams, made interactive. Every equation in the unit is a slider, a drag or a button, and each tab walks you through it with **predict-then-check questions**: you commit to a number before the answer appears.

It uses the course's own notation (q = [θ₁, θ₂], p(q), J(q)⁺, k_p Δp) and its running example: the SO‑100 arm with four joints locked, so it moves in a plane. Tab 5 then gives the locked joints back, one at a time, on the real arm in 3D, so you can watch the planar math stop being enough.

## What's inside

Two views, always in sync. **Task space:** where the hand is. **Configuration space:** every pixel is one pose (θ₁, θ₂). Hover it to preview that pose as a ghost arm; click to go there. Turn on a floor or shelf and watch them carve regions out of the map. Every tab has a **"What do the symbols mean?"** key: tap a symbol and the matching thing on screen pulses, so `J(q)` stops being notation and becomes "those two arrows at the hand."

| Tab | You learn | You can | Lesson |
|---|---|---|---|
| **1 · Forward kinematics** | FK is two arrows added head to tail; θ₂ is *relative*; the workspace is a ring | Drive θ₁, θ₂; change link lengths; hover the pose map | 6 steps |
| **2 · Inverse kinematics** | IK has 0, 1 or 2 answers; obstacles delete them; iterative solvers find the one whose basin you start in | Drag a target; jump to either solution; run an **iterative (damped least-squares) solver** and see its path; paint the **basins of attraction** | 6 steps |
| **3 · Jacobian & diff-IK** | J's columns are each joint's "nudge"; det J = l₁l₂ sin θ₂; singularities make joint speeds explode | **Wiggle** a joint to see its column; drag a desired hand velocity; run diff-IK into a singularity with a plain vs **damped** inverse; **teleop** the hand with arrow keys | 5 steps |
| **4 · Feedback control** | Open loop trusts the model; feedback fixes model error; k_p·Δt > 1 overshoots, > 2 diverges; latency and saturation change the picture; tracking isn't planning; and, beyond the course, **why PD needs mass**: P on an arm with inertia is an undamped spring, k_d is the damper | Step, circle, sweep or drag targets; vary **gain, control rate, latency, model error, joint speed limit**; watch the error trace against the **ideal e^(−k_p t) response**, step-response metrics and the **discrete error sequence**; switch on **inertia** and tune k_d to critical damping | 7 steps |
| **5 · The real arm (3D)** | The plane of tabs 1–4 was one slice of a five-joint arm; one spare joint turns "A or B" into a continuous family of poses; the pose map can no longer be drawn; J becomes 3 × 5 (which is why the course writes J⁺), then 6 × 5 with rank 5 | Orbit the **SO‑101, drawn from its URDF**; unlock joints one at a time; sample the reachable volume; hold the fingertip still while the arm moves (**self-motion**); drag a target in 3D and watch the same damped pseudo-inverse follow it | 6 steps |

<table>
  <tr>
    <td width="50%"><img src="docs/fk.png" alt="Forward kinematics tab with head-to-tail link vectors, the angle arcs and the hand position"><br><sub><b>Forward kinematics.</b> The grey dashes show θ₂ is measured from link 1.</sub></td>
    <td width="50%"><img src="docs/ik-shelf.png" alt="Inverse kinematics with a floor and shelf: both solutions blocked, the closest feasible pose shown"><br><sub><b>Inverse kinematics with obstacles.</b> The target is inside the ring, but the shelf blocks both solutions.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/jac.png" alt="Jacobian tab showing both columns as arrows, the manipulability ellipse and singular rows on the map"><br><sub><b>Jacobian.</b> Columns as arrows, the velocity ellipse, and the det J = 0 rows.</sub></td>
    <td width="50%"><img src="docs/fb.png" alt="Feedback tab tracking a step target with the lesson, controls and error trace"><br><sub><b>Feedback control.</b> Lesson, live math, error trace and step metrics.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/inertia.png" alt="Feedback tab with inertia on and k_d = 0: the hand swings through the target repeatedly, an undamped spring"><br><sub><b>Give the arm mass.</b> With inertia on, proportional control alone is an undamped spring; k_d is the damper.</sub></td>
    <td width="50%"><img src="docs/datasets.png" alt="The Unit 1 page: an episode timeline with the fetched observation and action frames, the window editor, the live sample shapes and the matching Python"><br><sub><b>Unit 1 · Datasets.</b> Drag a frame through an episode and watch <code>delta_timestamps</code> become indices, clamps, masks and tensor shapes.</sub></td>
  </tr>
</table>

## Tab 5: the real arm, in 3D

<p align="center">
  <img src="docs/linkedin/arm-playground-3d.gif" width="420" alt="Animation of tab 5: the two-joint arm moving inside a translucent plane; the shoulder pan unlocks and the plane swings like a door through a cloud of reachable points; then all five joints follow a target around a loop with the Jacobian's five columns drawn as arrows">
  <br><sub>Two joints in a plane, then the pan unlocks and the plane swings like a door, then all five joints follow a target.</sub>
</p>

Tabs 1–4 teach the course's simplification: two joints, one flat plane. Tab 5 shows what was simplified away. The arm is the **SO‑101** (the current revision of the course's SO‑100), built from the robot's own description file, and the tab starts with three of its five joints locked, which is exactly the arm of tabs 1–4. A translucent sheet marks the plane you have been working in. Then you unlock joints:

1. **The plane was a slice.** Same arm, same ring, real sizes: the upper arm is 116 mm and the forearm 135 mm, not the two equal links the course draws.
2. **Unlock the pan.** The sheet swings about a vertical axis and the flat ring sweeps out a volume.
3. **Three joints for two numbers.** Unlock the wrist and the fingertip can stay put while the arm moves: tab 2's "A or B" becomes a continuous family.
4. **The map no longer fits.** A pose is five numbers. A 5° grid over two joint angles has 5,184 cells; over this arm's five joints it has about 166 million.
5. **Why the course writes J⁺.** The Jacobian is 3 × 5. No inverse exists, and tab 3's damped pseudo-inverse works unchanged.
6. **Five joints, six numbers.** Position plus orientation needs six; the 6 × 5 Jacobian has rank 5. The hand-written model is running out, which is where Unit 2 hands over to learning.

**Where the numbers come from.** Joint order, axes, offsets and limits are read from [`so101_new_calib.urdf`](https://github.com/TheRobotStudio/SO-ARM100/blob/385e8d7/Simulation/SO101/so101_new_calib.urdf) in TheRobotStudio/SO‑ARM100, pinned at commit `385e8d7` (Apache‑2.0). An unmodified copy is in [`docs/vendor/`](docs/vendor/), and the tests check the page's table against it number for number, then check forward kinematics against a separate implementation ([`reference_fk.py`](docs/vendor/reference_fk.py)).

**What's exact and what's a model** is listed on the tab itself. In short: the kinematics, link lengths, Jacobian and the 5 < 6 count are exact to the URDF; the rods are a schematic of the joint centres (not the printed parts), the reachable points are a random sample, the solver is numerical (within 0.1 mm when it converges, and it says so when it doesn't), and a URDF is an idealised arm.

**No 3D library.** The view is about a dozen rods, a grid and a few thousand points, so it is drawn on an ordinary 2D canvas with a hand-written camera, perspective divide and depth sort. That keeps the tab at one 55 KB file (18 KB gzipped), with no WebGL requirement, and it still opens from a downloaded copy of the folder (ES-module 3D libraries can't be loaded from `file://`). Two flat views, side and top, are always shown next to it and are the precise place to drag a target.

<table>
  <tr>
    <td><img src="docs/real-arm-3d.png" alt="Tab 5 with the shoulder pan unlocked: the SO-101 arm in a 3D view with the plane of tabs 1 to 4 drawn as a translucent sheet inside a cloud of sampled wrist positions, next to a side view and a top view"><br><sub><b>The real arm (3D).</b> The pan is unlocked: the sheet is the plane of tabs 1–4, the dots are sampled wrist positions, and the flat views on the right stay exact.</sub></td>
  </tr>
</table>

## The Unit 1 page: datasets in practice

Unit 1's only code (page 1.4) is about `delta_timestamps`: asking `LeRobotDataset` for a window of past observations and future actions around one frame. The course explains it with a static diagram. [`datasets.html`](https://bakulbadwal.github.io/arm-playground/datasets.html) makes it live, against the real facts of `lerobot/svla_so101_pickplace` (50 episodes, 11,939 frames, 30 fps, six motors, two 480×640 cameras) and the fetch rule in lerobot 0.6.1's `dataset_reader.py`:

- **Episode timeline.** Drag *t* through a 240-frame episode. Observation frames light up blue, action frames orange, and any offset that runs past the episode edge is drawn hatched red with an arrow showing it being **clamped** back to the edge frame and flagged in `{feature}_is_pad`. It never crosses into the neighbouring episode.
- **Window editor** with the course's three recipes (basic BC, history BC, action chunking). An offset that isn't a whole number of frames, like 0.05 s at 30 fps, shows the same `ValueError` LeRobot raises.
- **Joint traces** of the six action values with the fetched chunk marked, so "the next 0.3 s of the plan" is something you can see.
- **The sample, live**: every key of `dataset[t]` with its tensor shape, the `_is_pad` masks, and the batched shapes from a `DataLoader`, including the 0.6.1 quirk that a single-offset video window is squeezed to `[3, 480, 640]` while `action` keeps `[1, 6]`.
- **The exact Python** for the current window, copyable, plus the working form of streaming (`next(iter(...))`, since `StreamingLeRobotDataset` is an `IterableDataset` and the course's `streaming_dataset[100]` raises).
- **Six predict-then-check lessons**, from "how many frames is 0.1 s" to why a padded chunk must be masked in the loss (ACT multiplies its L1 loss by `~action_is_pad`).

## How it compares

Two-link arm visualisers are a well-worn genre. I checked the closest ones against their own pages on 2026‑09‑25. This playground is narrower in scope (two joints in a plane, plus one tab on the five-joint arm in 3D) and deeper on what Unit 2 teaches.

| | **Arm Playground** | [ArmLab](https://github.com/ishn-kapadia/armlab) | [ShareTechnote](https://www.sharetechnote.com/html/WebProgramming/Websim_RoboticsKinematicsI.html) | [CompuTools](https://www.compu-tools.com/robot-kinematics/) |
|---|:-:|:-:|:-:|:-:|
| FK and both closed-form IK solutions | ✓ | ✓ | ✓ | ✓ |
| Joint limits | elbow only | ✓ | — (ignored by design) | ✓ |
| Obstacles, drawn in **configuration space** | ✓ | — | — | — |
| Closest feasible pose when IK fails (optimisation form) | ✓ | — | — | — |
| Iterative IK solver + **basins of attraction** | ✓ | — | — | — |
| Jacobian columns + manipulability ellipse | ✓ | — | ✓ | ✓ (index / SVD) |
| Singularity blow-up, plain vs damped inverse | ✓ | — | described | detection |
| **Feedback control** with gain, rate, latency, model error, saturation | ✓ | — | — | — |
| Guided lessons with predict-then-check questions | ✓ (30) | quick-start list | written explainer | — |
| PD control on an arm with inertia (spring + damper) | ✓ | — | — | — |
| More than two joints / 3‑D / DH tables | 5 joints in 3‑D from the URDF (tab 5); no DH tables | — | — | ✓ |
| Trajectories, waypoints, export | — | ✓ | — | path trace + CSV export |

Use CompuTools for 6‑DOF arms and DH parameters, and ArmLab for trajectory planning. Use this one to understand *why* Unit 2 ends by arguing for learning. For a comparison of iterative IK solvers (CCD, FABRIK, Jacobian transpose), see [Saeed Ghorbani's interactive post](https://saeed1262.github.io/blog/2025/inverse-kinematics-models/). If I've mischaracterised a tool, open an issue.

## Deep links for teachers

Any setup can be shared as a link (use the 🔗 button). Parameters go after `#tab`, joined by `&`:

| Param | Meaning | Example |
|---|---|---|
| `fk` `ik` `jac` `fb` `r3` | Tab (`r3` = the real arm in 3D) | `#ik` |
| `step` | Lesson step (1-based) | `step=4` |
| `t1`, `t2` | Joint angles (degrees) | `t1=30&t2=60` |
| `tx`, `ty` | IK target | `tx=1.2&ty=1.35` |
| `l1`, `l2`, `lim` | Link lengths, elbow limit | `l2=0.5` |
| `floor`, `shelf`, `basins` | Toggles | `floor=1&shelf=1` |
| `inv`, `lam` | Jacobian tab: `plain` / `damped` inverse, damping λ | `inv=damped&lam=0.1` |
| `path`, `kp`, `rate`, `lat`, `merr`, `qmax`, `ff` | Feedback settings | `path=step&kp=75` |
| `inertia`, `kd` | Give the arm mass; damping gain | `inertia=1&kd=11` |
| `solve` | Start the iterative IK solver (`2` = run instantly) | `solve=1` |
| `iter` | Run exactly N solver iterations and freeze (animation frames) | `iter=12` |
| `theme` | `light` / `dark` | `theme=dark` |
| `q`, `free` | Tab 5: the five joint angles in degrees (pan, lift, elbow, wrist flex, wrist roll); which joints are unlocked, one digit each | `q=0,20,-74,0,0&free=01100` |
| `cam` | Tab 5: camera yaw, tilt (degrees) and distance (mm) | `cam=-52,22,860` |
| `plane`, `cloud`, `axes`, `cols`, `triad` | Tab 5 toggles: the plane of tabs 1–4, reachable points, joint axes, Jacobian columns, fingertip orientation | `cloud=1&cols=1` |
| `tg`, `mode` | Tab 5: target x,y,z in mm; `mode=follow` tracks it, `mode=self` holds the fingertip while the wrist turns | `tg=250,120,170&mode=follow` |

Try it: [both IK solutions blocked by a shelf](https://bakulbadwal.github.io/arm-playground/#ik&floor=1&shelf=1&tx=1.2&ty=1.35&t1=79&t2=-54) · [iterative IK racing to a basin](https://bakulbadwal.github.io/arm-playground/#ik&basins=1&t1=-120&t2=-30&tx=0.866&ty=1.5&solve=1) · [latency turns a safe gain unstable](https://bakulbadwal.github.io/arm-playground/#fb&path=step&kp=30&rate=50&lat=60) · [the real arm with its pan unlocked](https://bakulbadwal.github.io/arm-playground/#r3&step=2) · [five joints following a target in 3D](https://bakulbadwal.github.io/arm-playground/#r3&step=5)

## Proof you can run

```bash
npm test
```

Thirty checks, no dependencies (Node 18+). They slice the math out of the pages and verify it against identities and the lessons' own worked examples: FK↔IK round-trips, the Jacobian against finite differences, det J = l₁l₂ sin θ₂, the closed-form solutions for the lesson targets, that the damped pseudo-inverse stays finite where the plain inverse fails, and, for the Unit 1 page, that the `delta_timestamps` fetch rule reproduces LeRobot's frame indices, clamping and `is_pad` masks.

Fourteen of them cover tab 5: the joint table equals the vendored URDF number for number; forward kinematics matches known poses from an independent implementation (`python3 docs/vendor/reference_fk.py`) and a quarter-turn worked by hand; the links are 116 mm and 135 mm; the side view reduces to tab 1's own formula; the 3 × 5 and 6 × 5 Jacobians match finite differences, with rank 5; self-motion holds the fingertip within 0.1 mm; the Solve button's several-starts search reaches at least 99% of targets that are reachable by construction (a single search misses over 5% of them, which is why it retries); and the numbers the lessons and labels quote are recomputed from the kinematics.

## Under the hood

- **Three files, no build.** `index.html` (Unit 2), `arm3d.js` (tab 5, fetched the first time that tab is opened) and `datasets.html` (Unit 1) are vanilla HTML, CSS and JavaScript on `<canvas>`. KaTeX (from jsDelivr) renders the Unit 2 equation cards and falls back to plain text offline.
- **Tab 5:** forward kinematics is the URDF's chain of fixed transforms and joint turns in double precision; the Jacobian is geometric (column k = axis k × (point − joint k)); IK and self-motion are damped least squares, Jᵀ(JJᵀ + λ²I)⁻¹ with λ = 6 mm/rad, steps capped at 40 mm and 0.2 rad, clamped to the URDF joint limits. That search only goes downhill from where it starts and can stall against a limit, so the Solve button retries from up to 31 other starting poses (the pan aimed at the target, then seeded random poses) before reporting a miss. The 3D picture is a hand-written orbit camera with painter's-algorithm depth sorting on a 2D canvas; it redraws only when something changes.
- **Kinematics:** closed-form FK/IK; J(q) analytic; the damped pseudo-inverse is Jᵀ(JJᵀ + λ²I)⁻¹.
- **Collisions:** exact segment-vs-box tests (Liang–Barsky); the configuration-space map is a 2° grid.
- **Iterative IK:** damped least squares (λ = 0.15, step 0.6, capped at 0.2 rad per iteration). Basins come from running it from every cell of a 120×120 grid.
- **Feedback sim:** integrates at 2 ms. The controller updates at the chosen rate with zero-order hold, measures the hand with the true geometry (like a camera) after the chosen latency, builds J from possibly wrong link lengths, and clamps joint speeds. The bar chart shows the linearised sequence e<sub>k+1</sub> = e<sub>k</sub> − k<sub>p</sub>Δt·e<sub>k−d</sub>. With **inertia** on, a command is an acceleration instead of a velocity, q̈ = J⁺(k<sub>p</sub>Δp + k<sub>d</sub>(ṗ* − ṗ)), integrated twice, and the bars switch to the unit-mass spring–damper response.
- **Not built, and why:** see [BACKLOG.md](BACKLOG.md).
- **Conventions:** angles in degrees in the UI and radians in the math; θ₂ is relative to link 1; lengths in abstract units (default l₁ = l₂ = 1). Only the elbow has a joint limit; the shoulder is free. Tab 5 is in millimetres with the URDF's limits on all five joints; there θ₁ and θ₂ are the lift and elbow joints up to a fixed offset and a sign, as drawn in its side view.
- **Lessons:** each step resets its tab to a baseline (link lengths, obstacles, inverse type) before applying its own setup, so steps are reproducible in any order. Progress is remembered in `localStorage`.

## Credits

An unofficial companion to the [Hugging Face Robotics Course](https://huggingface.co/learn/robotics-course), which is based on the [Robot Learning Tutorial](https://huggingface.co/spaces/lerobot/robot-learning-tutorial). Not affiliated with Hugging Face. The equations and the SO‑100 planar example follow the course's Unit 2. Tab 5's arm geometry comes from the SO‑101 URDF in [TheRobotStudio/SO‑ARM100](https://github.com/TheRobotStudio/SO-ARM100) (Apache‑2.0); see [`docs/vendor/NOTICE.md`](docs/vendor/NOTICE.md).

Built by [Bakul Badwal](https://github.com/bakulbadwal) while working through the course. MIT licensed.
