# Plan V2: "Workbench", a playable 3D bench for the SO-101

**Status: BUILT 2026-10-10, all three phases** (`workbench.html`, `workbench.js`, three.js vendored in `docs/vendor/`). Drafted 2026-10-05 as a plan; the sections below are that plan, kept as written, with a build record at the end.
V1 is untouched: [PLAN-3d-step.md](PLAN-3d-step.md) is the record of tab 5, which shipped the same day.
A throwaway preview exists so the look can be judged before deciding (link at the bottom).

## What prompted this

Bakul's ask: tab 5 is "another clickable thing"; people are building whole games with these models; can this be immersive 3D that teaches better, and is it worth building.

The example on his phone (read through iPhone Mirroring on 2026-10-05) is a LinkedIn post about **WareTrack**: a warehouse app that looks like a strategy game (bright low-poly 3D seen from above, every object clickable for its live status, KPI cards), built mostly with Claude Opus 5.5 on React + React Three Fiber, no game engine. The post's own point is the useful one: the data model underneath is an ordinary warehouse app, and "the 3D view is just another layer on top". That is the shape of this plan too: the same tested kinematics (`K3`), with a new layer over it.

## The verdict

**Worth building: yes, as a separate page in this repo, and only if it is a game about the course's real subject.** Not as a prettier viewer.

- **What immersion is good for here.** Tabs 1–5 let you *inspect* an arm. They cannot let you *operate* one, and operating is the course's actual subject: LeRobot's whole method is teleoperate → record → train → deploy. A bench where you drive the arm yourself, and your driving becomes the dataset, teaches Units 1, 2 and 4 in a way no panel of sliders can.
- **Is it "Call of Duty" immersive? No, and it should not try to be.** The viral game demos are short slices built from asset packs. This would be one polished bench, one real robot, a handful of objects. What makes it feel like a game is agency and consequence: you drive, the cube falls, your replay misses. The first-person view is real, too: it is the wrist camera, which is exactly the image a policy is fed.
- **Is it new? Partly.** Checked 2026-10-05:
  - A 3D SO-101 in the browser already exists. [LeRobot.js](https://huggingface.co/blog/NERDDISCO/lerobotjs) controls a *real* arm from Chrome. [Binh's LeRobot Notes](https://lerobot.binhph.am/) ([write-up](https://discourse.threejs.org/t/a-real-robot-policy-neural-net-physics-running-100-in-the-browser-so-101-arm-three-js-r3f/92415), June 2026) runs a trained ACT policy with MuJoCo physics in the tab. It is more technically advanced than anything planned here, and it is watch-only: no controls, no lessons.
  - What two searches did not find: a *playable lesson*. Nothing where the learner drives, records their own demonstration, watches a blind replay fail, and trains a policy on their own data, with every number checkable. That is the gap. I can't prove nobody has built it.
- **The honest risk.** It is easy to spend a week on lighting and end up with a toy. The plan below is ordered so that each phase teaches something on its own and can be the last.

## What it is

**`workbench.html`**: a full-screen 3D bench. The SO-101 (same URDF kinematics as tab 5, same `K3` code) sits on a cutting mat with a cube and a bin. You drive the gripper with the keyboard or an on-screen stick, and a corner inset shows the wrist camera. Tab 5's last lesson links to it: "now drive it yourself".

It is a companion page like `datasets.html`, not a sixth tab: it needs the whole screen, a game loop and a 3D library, none of which belong inside `index.html`. Same repo, same URL, same tests.

### Missions (each one is a course idea you feel before you read it)

| # | Mission | What you do | The idea | Course |
|---|---|---|---|---|
| 1 | Put the cube in the bin | Drive the hand, close the gripper, carry, release | Cartesian teleoperation; the solver from tab 3 running under your thumbs | U2 |
| 2 | Now do it joint by joint | Same task with five joint keys and no solver | Why a leader arm exists: a human can't do inverse kinematics in their head | U2 |
| 3 | Reach the far corner | A cube placed at the edge of reach | Joint limits and the workspace from tab 5, felt as the hand refusing to go | U2 |
| 4 | Record a demonstration | Press record, do mission 1 | Your episode appears as rows: 30 frames a second, six numbers in, six out. This is a LeRobot dataset | U1 |
| 5 | Replay it blind | Replay your recording after the cube is nudged 4 cm | Open loop trusts the world; the gripper closes on air | U2 |
| 6 | Drive through lag | Mission 1 with 200 ms of delay | Why control rate and latency matter (tab 4, in your hands) | U2 |
| 7 | Teach it | Record 1, then 5, then 10 demos from different cube positions; a small policy trains on them in the page | More demonstrations, better behaviour; one demo memorises one spot | U4 |

### What stays exact, what is a toy

| Exact (and tested) | Labelled as a toy |
|---|---|
| Kinematics, joint limits, link sizes: `K3`, the vendored URDF, the same tests as tab 5 | Grasping: the cube attaches when the closed gripper is within a set distance. No contact, no friction |
| The recording: 30 frames a second, six-number state and action, the same field names as `lerobot/svla_so101_pickplace` | Falling: simple gravity onto flat surfaces. Nothing tumbles |
| A replay reproduces the recorded joint path exactly (tested) | The policy in mission 7: a small network on (joint angles, cube position) → next action. Not ACT, no camera images. The page says so |
| The wrist-camera inset is the scene rendered from the gripper's own frame | The arm's look: simplified shapes in the real colours, or the real meshes thinned down. Not the CAD |

The series rule holds: every number exact or labelled.

## How it would be built

- **Renderer: three.js**, because this page needs real lighting, shadows and a second camera, which the hand-drawn canvas of tab 5 can't give. To keep "no build step" and "opens from a download", three.js is bundled once into a single plain script and vendored in the repo (about 700 KB, 180 KB compressed), loaded only by this page. Tabs 1–5 are not touched and stay the fallback where WebGL is missing.
- **The arm's body.** Start with simple lit shapes in the real colours (yellow printed parts, black servos), positioned by `K3`. Later, optionally, the real meshes from the SO-ARM100 repo (Apache-2.0), thinned from 19 MB to 1–2 MB by a script.
- **Blender: not needed.** A Python script can thin and merge the meshes. Blender only becomes useful if we want hand-tuned materials, and it is not installed on this Mac.
- **Physics: none in phases 1–2.** A real engine (MuJoCo in the browser, as Binh's page uses) is a V3 decision. It adds megabytes and a class of bugs, and none of the seven missions needs it.
- **Controls.** Keyboard on a laptop; a thumb stick and three buttons on a phone. Drag to look around; one key switches to the wrist camera full-screen.
- **Tests.** The control solver, the grasp rule, the recorder (replay equals recording, bit for bit) and the policy's training step are pure functions, tested in `npm test` like `K3`. Then the usual gates: a fresh-context review, zero console errors, a phone-width check, a real phone.

## Phases (each can be the last)

| Phase | You get | Missions | Size, relative to tab 5 |
|---|---|---|---|
| 1 · The bench | A good-looking bench you can drive, with the wrist camera | 1, 2, 3 | About the same as tab 5 |
| 2 · Your driving is data | Record, the dataset view, blind replay, lag | 4, 5, 6 | Smaller |
| 3 · Teach it | In-page training on your own demonstrations | 7 | About the same as tab 5, and the riskiest: a policy that learns well from ten keyboard demos needs tuning |
| V3, not planned | Real physics, the real meshes, a real pretrained policy, a real arm over USB | | Large |

Tab 5 took one long session plus one review agent. I have no clean measurement of what share of a weekly limit that was, so these are relative sizes, not percentages.

**Usage, as far as it can be measured (2026-10-05).** Only the plan meter is visible, not billed tokens. Writing this plan, the prior-art check and the working preview moved the weekly meter from 18% to 20% while other sessions were also running, so they cost at most 2 points. Estimates from that, not measurements: phase 1 about 5–8 points of a weekly limit, phase 2 about 3–5, phase 3 about 5–8; all three about 13–21. Read the meter before and after phase 1 and replace these with the real number before starting phase 2. Build in a fresh session: this one is two-thirds full, and every turn re-reads it.

## V1 and V2 side by side

| | V1: tab 5 (shipped) | V2: Workbench (this plan) |
|---|---|---|
| You | Inspect: unlock joints, read the Jacobian | Operate: drive, grasp, record, replay, teach |
| Teaches | Why hand-written models run out (end of Unit 2) | What replaces them: demonstrations and learning (Units 1, 2, 4) |
| Rendering | Hand-drawn on a 2D canvas, 55 KB, no WebGL | three.js, lit, shadows, two cameras; needs WebGL |
| Runs on | Anything, including a downloaded copy | Any laptop or phone from the last five years; falls back to tab 5 |
| Unique? | Other 3D arm viewers exist; the lessons are the difference | Watch-only demos exist; a playable lesson was not found |
| Risk | Low | Polish can eat the budget; phase 3 may need tuning |

## Decisions for Bakul

1. **Go or no-go**, after trying the preview.
2. **How far**: phase 1 only, 1–2, or all three.
3. **The arm's body**: simple shapes first (recommended), or the thinned real meshes from the start.

## Preview

**https://claude.ai/artifact/2BicQz9ytcsMHkZ1tjmL9V** (private to Bakul's account; works on a laptop or a phone).

A throwaway sketch of phase 1's feel, with a first taste of phase 2. It is not the build: simple shapes, one task, no missions, no tests, and it loads three.js from a CDN.

What it does today:
- Drive the gripper with W A S D, Q and E (or the thumb stick on a phone); Space grips. The hand moves "into the screen" for wherever you have turned the camera.
- The cube lights up when the open gripper is close enough to take it. Carry it to the bin and let go.
- A corner inset shows the wrist camera; V swaps to look through it.
- Record your driving at 30 frames a second, replay it, then nudge the cube 4 cm and replay again: the gripper closes on air.
- The panel in the corner shows the six joint numbers under their real LeRobot names (`shoulder_pan.pos` … `gripper.pos`).

Checked before publishing, in the browser pane with scripted input: zero console errors; a full pick, carry and drop registers as delivered; the solver holds the hand within 0.3 mm of the commanded point at every cube spot and over the bin; holding "forward" stops at the edge of reach; the unchanged replay succeeds and the nudged replay misses; at phone width (375 px) nothing scrolls and the thumb stick drives the hand. Not checked: the published artifact page itself, and a real phone.

The sketch's source is in the session scratchpad, not in this repo.

## Build record (2026-10-10)

Built in one sitting on Fable 5.1, all three phases, after Bakul said to go ahead with his week's usage left over. What shipped, and where it departs from the plan above:

- **Files:** `workbench.html` (markup, CSS), `workbench.js` (a pure core `WB` + a three.js view), `docs/vendor/three.min.js` (three.js r149, MIT, 608 KB / 153 KB gzipped, loaded by a plain script tag so a downloaded copy still opens), `docs/workbench.png`. Tab 5's last lesson and the page header now link to the Workbench; `npm test` went from 30 to 37 checks.
- **The core is one simulation, `WB.world` + `WB.step`,** shared by live driving, replay, the policy's rollouts and the tests. Same tested `K3` kinematics underneath.
- **Control:** damped least squares on four joints for four numbers (x, y, z and the jaws' pitch), with a joint pressed against its limit dropped from the solve. Measured: within 1 mm at every cube spot and over the bin; pushing past the edge of reach stops the hand and tilts the jaws rather than breaking a limit.
- **Recording:** 30 rows a second, `state` = the six joints as they were, `action` = the six as commanded, under the dataset's real names. The grasp is also stored as an event with the exact pose, so an unchanged scene always replays the same way; a cube moved 4 cm makes the replay miss.
- **The policy (phase 3) works, after the review broke the first version.** What it took: the network sees the cube (or, once holding, the bin) relative to the gripper rather than absolute positions; each training row looks ahead (the velocity over the next 4 frames, and whether the jaws are commanded closed within the next 12, since a person pauses and then presses); the grasp rule became continuous (closed jaws take a cube they are moved around), so closing a little early no longer loses the cube; Adam with cosine decay over 2,500 steps. Measured in `test.mjs` and in a longer sweep (six seeds, six subsets, clean and clumsy demonstrators): four demonstrations from different spots deliver at 8 of 8 unseen spots in 16 of 18 cases and never below 5; one demonstration is hit or miss, 0 to 8. The page scores every trained policy on the same eight spots and prints the number, so the lesson is what the student measures. Training runs in a Web Worker (about 2 s for four demos in node), with a same-thread fallback for `file://`.
- **Dropped or changed:** mission 2's joint mode uses five on-screen −/+ pairs and the digit keys (Shift reverses) rather than sliders. There is no Follow mode; driving is direct. The thinned real meshes were not attempted; the arm stays simplified shapes in the real colours. three.js is vendored as the r149 single-file build, not bundled.
- **The review (Opus 5.5, fresh context) found five blockers before the commit, all fixed:** the world stepped once per display frame, so "30 rows a second" and "200 ms of lag" were wrong on a 60 Hz screen (now a fixed 1/30 s clock, tested at 30–144 Hz); the policy lesson held for one lucky set of demos only (see above); mission 3 blamed a joint limit when the arm had simply run out of length (rewritten around the 251 mm ring); delivering in mission 4 without recording threw and marked the mission done; the P key could skip the point of missions 2 and 6. Plus a dozen smaller fixes: the HUD's state and action columns were identical, a delivered replay left no new cube, the toy note was hidden on phones, and so on.
- **Checked before publishing:** every mission completed by scripted input in the browser pane with zero console errors; phone width (375 px) with no horizontal scroll, the thumb stick driving the hand and the joint pairs in mission 2; opened from a local file; the worker training path confirmed.
- **Still owed:** a real phone, and a real Chromebook. The usage meter was read before and after the build; the number is in the memory note, not here.
