# Plan and build record: tab 5, "The real arm (3D)"

**Status: built and shipped 2026-10-05.** Spec drafted that morning; Bakul approved it end to end the same day (relayed through the Courses HQ session) with these decisions:

1. An extension of Arm Playground: a fifth tab in this repo. No new repo, no rebuild of tabs 1–4.
2. The lesson carries forward: the tab starts as the two-joint planar arm and unlocks the locked joints, linking back to the earlier tabs' notation.
3. Kinematics from a real, cited source; tests for the new forward kinematics; a fresh-context adversarial review before pushing; a phone-width check; a fallback if WebGL is unavailable.

Every number below was measured on 2026-10-05; the source is named beside it.

## The one idea

Tabs 1–4 teach a two-joint arm in a flat plane, the course's own simplification of the SO-100. Tab 5 gives the locked joints back, one at a time, so the learner *sees* the moment the planar math stops being enough. That is Unit 2's closing argument, and before this tab the lab only asserted it.

The real arm makes this unusually clean. From the official URDFs (TheRobotStudio/SO-ARM100, Apache-2.0):

| Fact | Value | Source |
|---|---|---|
| Upper arm, shoulder-lift → elbow | **116.00 mm** | both `so100.urdf` @ `0c8e289` and `so101_new_calib.urdf` @ `385e8d7` |
| Forearm, elbow → wrist-flex | **135.00 mm** | both |
| The three pitch axes (lift, elbow, wrist-flex) | parallel: cross products below 1e-9 | computed from the SO-101 file |
| Pan axis vs pitch axes | perpendicular to within 1e-5 (the file writes π as 3.14159) | computed |
| That plane's offset from the pan axis | 18.28 mm (SO-101), 0.00 mm (SO-100) | computed from joint origins |
| Fingertip frame's distance from the roll axis | 7.9 mm | SO-101 only (it has a `gripper_frame`) |
| Joint limits (SO-101) | pan ±110°, lift ±100°, elbow ±96.8°, wrist-flex ±95°, roll −157.2°…+162.8° | `so101_new_calib.urdf` |
| The elbow's range in tab 2's θ₂ | −170.7° … +23.0° | computed (θ₂ = −73.8° − elbow) |

So the real arm *is* the 2D lab's plane, with one more joint in that plane, spun about a vertical axis. And the course's "two links of equal length" is a simplification: the real ratio is 1 : 1.16.

## What the tab shows: six predict-then-check lessons

Same mechanics as the other tabs (commit to an answer, then see it).

1. **The plane was a slice.** The arm in 3D with three joints locked, and the 2D lab's plane drawn through it as a translucent sheet carrying the familiar reach ring. *Predict:* 116 mm + 135 mm: how far can the wrist get from the shoulder joint? (251 mm.)
2. **Unlock the pan.** The sheet swings about the vertical axis; the flat ring sweeps into a volume (a cloud of sampled wrist positions). *Predict:* turning only the pan changes the wrist's height by how much? (0 mm; under 0.01 mm of numerical wobble, disclosed.)
3. **Three joints for two numbers.** Unlock the wrist. Turning it moves the whole arm while the fingertip stays put: one target, endlessly many poses. Tab 2's "A or B" is gone. *Predict:* how many poses reach this point now? (A continuous family.)
4. **The map no longer fits.** The pose map from tabs 1–4 was two-dimensional because there were two joints. *Predict:* how many numbers describe the pose with five joints free? (5; a 5° grid goes from 5,184 cells to about 166 million.)
5. **Why the course writes J⁺.** The Jacobian for fingertip position is 3 rows × 5 columns: not square, no inverse. Drag a target in 3D and the damped pseudo-inverse follows it. *Predict:* can it be inverted like tab 3's? (No.)
6. **Five joints, six numbers.** A full pose is 3 of position plus 3 of orientation. *Predict:* can this arm reach any position at any orientation? (No: rank 5 < 6.) The closing lines hand off to the rest of the course.

Ends with the series' standard card: what's exact, what's a teaching model.

## Controls

- **Orbit** by dragging the 3D view (on a phone: swipe sideways, plus a Tilt slider, so vertical swipes still scroll the page); zoom buttons; ¾ / Side / Top / Front; arrow keys when the view has focus.
- **Five joint sliders**, each with an unlock tick. Locked = the 2D lab's assumption. Limits from the URDF.
- **Toggles:** the plane of tabs 1–4 · reachable points · joint axes · Jacobian columns.
- **Target:** drag it in the 3D view (moves in the screen's plane) or in the two flat views beside it. **Solve** button and **Follow** mode.
- **Self-motion** for lesson 3: the wrist slider drives, lift and elbow are re-solved.
- **Two always-on flat views** in the right pane, replacing the pose map on this tab: *side* (the arm's own plane, which is the 2D lab, with θ₁ and θ₂ marked) and *top* (shows the pan and its range), drawn at one shared scale.
- Live math panel in millimetres: wrist and fingertip (x, y, z), the 3 × 5 Jacobian (6 × 5 with rank in lesson 6), which joints are locked.
- Deep links like the other tabs (`#r3&step=…&q=…&free=…&cam=…`), so a teacher can link straight to a lesson. The LinkedIn clip was rendered from these.

## What's exact, what's a toy

| Exact (and tested) | Labelled as a model |
|---|---|
| Joint order, axes, origins, limits: the SO-101 URDF pinned at `385e8d7`, with a copy vendored in `docs/vendor/` | The drawn shapes are plain rods through the joint centres, not the printed parts; the base and the shadow are for depth only |
| Forward kinematics: the URDF's transforms composed in double precision, checked against a separate implementation (`docs/vendor/reference_fk.py`) | The reachable cloud is a random sample of joint settings (count shown), not the true boundary; it ignores self-collision, and samples below z = 0 are left out. The grid is z = 0 of the URDF's base frame, not a measured tabletop |
| The 116 mm and 135 mm links, the shared plane, the 18.28 mm and 7.9 mm offsets | IK here is numerical (damped least squares): within 0.1 mm when it converges, and it can stall at a joint limit |
| The 3 × 5 Jacobian (checked against finite differences), the 6 × 5 rank | A URDF is a model: no backlash, no flex, and a calibrated physical arm's limits differ. The gripper jaw is not modelled |
| "5 < 6": a dimension count | Tabs 1–4 use abstract units (l = 1); this tab is in mm. The mapping is stated on screen |

## Library choice: none

**The 3D view is drawn on a normal 2D canvas with a hand-written projection.** The arm is about a dozen rods, a floor grid and a few thousand points. That needs a rotation, a perspective divide and a depth sort.

| | Hand-written canvas (built) | three.js 0.186.1 vendored (rejected) |
|---|---|---|
| Added download | **55 KB** in one readable file (18 KB gzipped) | **849 KB** minified in 3 files, ~202 KB gzipped (measured: core 416 + renderer 393 + OrbitControls 41) |
| Opens from a downloaded file | Yes (checked in headless Chrome from `file://`) | **No.** It ships only as ES modules, and Chrome 154 blocks module imports from `file://` (tested, both static and dynamic) |
| Needs WebGL | No, so there is nothing to fall back from | WebGL2 only, plus a second renderer for the fallback |
| Look | Depth-sorted rods with a highlight and a floor shadow; matches tabs 1–4 | Real lighting and true depth; the nicer clip |

The approval message asked for a 2D fallback when WebGL is unavailable and for three.js to be vendored locally. Both were written before the choice of renderer was settled; with no WebGL in the page, the first is met by construction and the second has nothing to vendor. If a lit, meshed render is wanted later, it can sit on top of the same kinematics (`K3` in `arm3d.js`) without changing a lesson.

**The real meshes are out either way:** the SO-101's STL files are 31 files, 19 MB. **Blender MCP: not needed** (the geometry that matters is the twelve numbers per joint in the URDF).

## Measured on the built tab

- `arm3d.js`: 55 KB (18 KB gzipped), loaded with a plain script tag the first time the tab is opened. `index.html` grew from 109 KB to 129 KB (most of it lesson text).
- A full redraw with 3,000 cloud points takes about 2 ms on the build machine (Apple silicon, 567 × 648 canvas at 1×). It redraws only when something changes. If drawing the cloud keeps a frame over 30 ms, the sample halves (3,000 → 1,500 → 750).
- Phone width (375 px): no horizontal scroll; every control reachable. Not yet tried on a real phone or a real Chromebook; that needs a person.
- Respects reduced-motion; both themes; every control is a native input or button.

## Tests (`npm test`, 16 → 30)

- The joint table in `arm3d.js` equals the vendored URDF (parsed in the test), including parent/child order.
- Known poses → known positions from `reference_fk.py` (three poses, five joints and the fingertip, to 0.0001 mm), plus a quarter-turn of the pan worked by hand.
- 116 mm and 135 mm at 200 random poses; lift, elbow and wrist share a plane; the roll axis never leaves that plane's directions.
- With the page's own 2D `fk` from tabs 1–4: wrist − shoulder equals the planar formula with l₁ = 116, l₂ = 135 (to 0.002 mm), θ₁ = 76.03° − lift, θ₂ = −73.82° − elbow.
- Pan alone changes height by less than 0.01 mm over its whole range.
- The 3 × 5 Jacobian matches finite differences; J J⁺ = I; the 6 × 5 turning rows match finite differences of the rotation and its rank is 5 at 300 random poses.
- Self-motion keeps the fingertip within 0.1 mm across the wrist's range, with a different pose at every angle.
- IK lands within 0.1 mm of 60 reachable targets from a nearby start, stays inside the limits, and reports failure on an unreachable one.
- The Solve button's several-starts search: on 300 targets that are reachable by construction, a single search misses more than 5% and the several-starts search misses at most 1%.
- The cloud sampler is seeded and stays inside the ring; with the pan locked it is flat.
- The numbers the lessons and labels quote (251, 27.9, θ₁ = 76.0° − lift, θ₂ = −73.8° − elbow, ±110°, 0 mm with under 0.01 mm of wobble, −170.7° / +23°, 5,184, 166 million, 8 mm per radian, 18.3 mm and its 10 to 26 mm range, 7.9, 0.1 mm) are recomputed from the kinematics, and every lesson pose is inside the URDF limits and above z = 0.

## What changed from the spec while building

- Lesson 1's question became "how far can the wrist reach" (251 mm = l₁ + l₂, tab 1's outer circle) because the text already states both link lengths; asking for the forearm length would have been reading, not predicting.
- The self-motion control is the wrist slider itself, not a separate slider.
- The tracked point is the wrist while the wrist and roll are locked (that is the "hand" of tabs 1–4) and the fingertip once either is unlocked. The label on screen says which.
- The spec said the pitch axes are "exactly" parallel and perpendicular to the pan. Parallel holds to 1e-9; perpendicular and "height never changes" hold only to the URDF's rounding of π, so the tab and the tests state tolerances.
- `arm3d.js` came out at 55 KB against a 45 KB budget.
- One real-device check is still owed: open it on a phone.

## What the pre-publish review changed

A fresh-context reviewer was given only the repo and the URDF and told to break it. It rebuilt forward kinematics a third way (quaternions, its own XML walk) and matched `arm3d.js` to 3e-13 mm over 53 poses, and confirmed the vendored URDF is byte-identical to upstream at `385e8d7`. It also found five things a student would have read that were wrong, all fixed before the first commit:

1. **The Solve button said "out of reach" for about 17% of reachable targets.** A single damped-least-squares search stalls at joint limits. Solve now retries from up to 31 other starts (measured: misses fall to under 0.5%), and the message says "probably out of reach".
2. **"The fingertip sits 18.3 mm to one side of the sheet"** is only true with the wrist roll at 0; it ranges from 10 to 26 mm. The text now says so, and a test covers the range.
3. **"A direction in 3D takes three more numbers."** A direction takes two; an orientation takes three. Lesson 6 was rewritten.
4. **Lesson 2 asked about −110° to +110° but the slider stopped at ±109°** (the limits were truncated to whole degrees). A limit within 0.01° of a whole degree now rounds to it.
5. **"A workspace nobody can draw"** contradicted lesson 4, which draws it. It is the map of poses that can't be drawn.

Also fixed from the same review: the side view now shades where the wrist can really go (the shoulder's limit cuts tab 1's ring down; the reviewer measured 57% of it); the math panel prints the in-sheet 2 × 2 Jacobian when the pan and roll are locked, instead of calling tab 3's own square J "not square"; the sliders' relation to tab 1's angles is stated (θ₁ = 76.0° − lift, θ₂ = −73.8° − elbow); self-motion can no longer move a joint the student has locked; copied links keep Follow and self-motion off when they were off; a malformed link can no longer turn the arm into NaN; an error inside tab 5 can no longer stop the page's draw loop; the grid is labelled z = 0 of the URDF's base frame instead of "the table"; "pose", "rank", "degree of freedom" and "backlash" were replaced or explained; and the test names no longer promise more than the tests check.

Not fixed, and written down in BACKLOG.md: Follow mode can still stall behind the base; on a phone the target is dragged in the flat views only; the view code has no automated tests.

Left out on purpose: real meshes, self-collision, orientation IK, the gripper jaw, dynamics.
