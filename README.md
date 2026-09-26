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
  An interactive two-joint arm with 23 guided lessons, built as a companion to<br>
  <a href="https://huggingface.co/learn/robotics-course/unit2/1">Unit 2 · Classical Robotics</a> of the <a href="https://huggingface.co/learn/robotics-course">Hugging Face Robotics Course</a>.
</p>

<p align="center">
  <a href="https://bakulbadwal.github.io/arm-playground/"><b>▶ Open the playground</b></a> ·
  <a href="#whats-inside">What's inside</a> ·
  <a href="#how-it-compares">How it compares</a> ·
  <a href="#deep-links-for-teachers">Deep links</a>
</p>

<p align="center">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Single HTML file" src="https://img.shields.io/badge/build-none%20·%20one%20HTML%20file-2f6fdb">
  <img alt="Works on phones" src="https://img.shields.io/badge/mobile-yes-16925b">
</p>

---

## Why this exists

Unit 2 of the Hugging Face Robotics Course makes one argument: *even a two-joint arm needs real math to control, and that math breaks on contact, clutter and cameras, which is why the field is learning from data.* The unit gives the equations (forward kinematics, inverse kinematics, the Jacobian, feedback) but no way to push on them. Its source even carries TODO placeholders for the diagrams.

This playground is those diagrams, made interactive. Every equation in the unit is a slider, a drag or a button, and each tab walks you through it with **predict-then-check questions**: you commit to a number before the answer appears.

It uses the course's own notation (q = [θ₁, θ₂], p(q), J(q)⁺, k_p Δp) and its running example: the SO‑100 arm with four joints locked, so it moves in a plane.

## What's inside

Two views, always in sync. **Left, task space:** where the hand is. **Right, configuration space:** every pixel is one pose (θ₁, θ₂). Hover it to preview that pose as a ghost arm; click to go there. Turn on a floor or shelf and watch them carve regions out of the map.

| Tab | You learn | You can | Lesson |
|---|---|---|---|
| **1 · Forward kinematics** | FK is two arrows added head to tail; θ₂ is *relative*; the workspace is a ring | Drive θ₁, θ₂; change link lengths; hover the pose map | 6 steps |
| **2 · Inverse kinematics** | IK has 0, 1 or 2 answers; obstacles delete them; iterative solvers find the one whose basin you start in | Drag a target; jump to either solution; run an **iterative (damped least-squares) solver** and see its path; paint the **basins of attraction** | 6 steps |
| **3 · Jacobian & diff-IK** | J's columns are each joint's "nudge"; det J = l₁l₂ sin θ₂; singularities make joint speeds explode | **Wiggle** a joint to see its column; drag a desired hand velocity; run diff-IK into a singularity with a plain vs **damped** inverse; **teleop** the hand with arrow keys | 5 steps |
| **4 · Feedback control** | Open loop trusts the model; feedback fixes model error; k_p·Δt > 1 overshoots, > 2 diverges; latency and saturation change the picture; tracking isn't planning | Step, circle, sweep or drag targets; vary **gain, control rate, latency, model error, joint speed limit**; watch the error trace against the **ideal e^(−k_p t) response**, step-response metrics and the **discrete error sequence** | 6 steps |

<table>
  <tr>
    <td width="50%"><img src="docs/fk.png" alt="Forward kinematics tab with head-to-tail link vectors, the angle arcs and the hand position"><br><sub><b>Forward kinematics.</b> The grey dashes show θ₂ is measured from link 1.</sub></td>
    <td width="50%"><img src="docs/ik-shelf.png" alt="Inverse kinematics with a floor and shelf: both solutions blocked, the closest feasible pose shown"><br><sub><b>Inverse kinematics with obstacles.</b> The target is inside the ring, but the shelf blocks both solutions.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/jac.png" alt="Jacobian tab showing both columns as arrows, the manipulability ellipse and singular rows on the map"><br><sub><b>Jacobian.</b> Columns as arrows, the velocity ellipse, and the det J = 0 rows.</sub></td>
    <td width="50%"><img src="docs/fb.png" alt="Feedback tab tracking a step target with the lesson, controls and error trace"><br><sub><b>Feedback control.</b> Lesson, live math, error trace and step metrics.</sub></td>
  </tr>
</table>

## How it compares

Two-link arm visualisers are a well-worn genre. I checked the closest ones against their own pages on 2026‑09‑25. This playground is narrower in scope (two joints, 2‑D) and deeper on what Unit 2 teaches.

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
| Guided lessons with predict-then-check questions | ✓ (23) | quick-start list | written explainer | — |
| More than two joints / 3‑D / DH tables | — | — | — | ✓ |
| Trajectories, waypoints, export | — | ✓ | — | path trace + CSV export |

Use CompuTools for 6‑DOF arms and DH parameters, and ArmLab for trajectory planning. Use this one to understand *why* Unit 2 ends by arguing for learning. For a comparison of iterative IK solvers (CCD, FABRIK, Jacobian transpose), see [Saeed Ghorbani's interactive post](https://saeed1262.github.io/blog/2025/inverse-kinematics-models/). If I've mischaracterised a tool, open an issue.

## Deep links for teachers

Any setup can be shared as a link (use the 🔗 button). Parameters go after `#tab`, joined by `&`:

| Param | Meaning | Example |
|---|---|---|
| `fk` `ik` `jac` `fb` | Tab | `#ik` |
| `step` | Lesson step (1-based) | `step=4` |
| `t1`, `t2` | Joint angles (degrees) | `t1=30&t2=60` |
| `tx`, `ty` | IK target | `tx=1.2&ty=1.35` |
| `l1`, `l2`, `lim` | Link lengths, elbow limit | `l2=0.5` |
| `floor`, `shelf`, `basins` | Toggles | `floor=1&shelf=1` |
| `path`, `kp`, `rate`, `lat`, `merr`, `qmax` | Feedback settings | `path=step&kp=75` |
| `solve` | Start the iterative IK solver (`2` = run instantly) | `solve=1` |
| `theme` | `light` / `dark` | `theme=dark` |

Try it: [both IK solutions blocked by a shelf](https://bakulbadwal.github.io/arm-playground/#ik&floor=1&shelf=1&tx=1.2&ty=1.35&t1=79&t2=-54) · [iterative IK racing to a basin](https://bakulbadwal.github.io/arm-playground/#ik&basins=1&t1=-120&t2=-30&tx=0.866&ty=1.5&solve=1) · [latency turns a safe gain unstable](https://bakulbadwal.github.io/arm-playground/#fb&path=step&kp=30&rate=50&lat=60)

## Under the hood

- **One file.** `index.html` is vanilla HTML, CSS and JavaScript on `<canvas>`, with no build step. KaTeX (from jsDelivr) renders the equation cards and falls back to plain text offline.
- **Kinematics:** closed-form FK/IK; J(q) analytic; the damped pseudo-inverse is Jᵀ(JJᵀ + λ²I)⁻¹.
- **Collisions:** exact segment-vs-box tests (Liang–Barsky); the configuration-space map is a 2° grid.
- **Iterative IK:** damped least squares (λ = 0.15, step 0.6, capped at 0.2 rad per iteration). Basins come from running it from every cell of a 120×120 grid.
- **Feedback sim:** integrates at 2 ms. The controller updates at the chosen rate with zero-order hold, measures the hand with the true geometry (like a camera) after the chosen latency, builds J from possibly wrong link lengths, and clamps joint speeds. The bar chart shows the linearised sequence e<sub>k+1</sub> = e<sub>k</sub> − k<sub>p</sub>Δt·e<sub>k−d</sub>.
- **Conventions:** angles in degrees in the UI and radians in the math; θ₂ is relative to link 1; lengths in abstract units (default l₁ = l₂ = 1). Only the elbow has a joint limit; the shoulder is free.
- **Lessons:** each step resets its tab to a baseline (link lengths, obstacles, inverse type) before applying its own setup, so steps are reproducible in any order. Progress is remembered in `localStorage`.

## Credits

An unofficial companion to the [Hugging Face Robotics Course](https://huggingface.co/learn/robotics-course), which is based on the [Robot Learning Tutorial](https://huggingface.co/spaces/lerobot/robot-learning-tutorial). Not affiliated with Hugging Face. The equations and the SO‑100 planar example follow the course's Unit 2.

Built by [Bakul Badwal](https://github.com/bakulbadwal) while working through the course. MIT licensed.
