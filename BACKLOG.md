# Backlog

Ideas considered and not built, with the reason, so the same discussion doesn't happen twice. Newest first.

## Decided 2026-10-10

- **Workbench (plan V2): built**, all three phases, as `workbench.html` + `workbench.js` on top of `K3`. Seven missions. Record in [PLAN-3d-step-v2.md](PLAN-3d-step-v2.md). Still open from it: Follow-style continuous tracking was dropped (missions use Solve-free driving); the thinned real meshes were not attempted, the arm stays simplified shapes; three.js r149 is vendored as a plain script (608 KB, 153 KB compressed) rather than bundled.

## Decided 2026-10-05

- **The real arm in 3D: built, as tab 5.** This reverses the "3-D, six-joint SO-100" rejection below, on Bakul's decision, and answers the objection in it: the tab does not replace the planar argument, it extends it. It starts as the arm of tabs 1–4 (three joints locked, the plane drawn as a sheet) and unlocks joints one at a time, so the learner sees the planar math stop being enough. Spec and what changed from it: [PLAN-3d-step.md](PLAN-3d-step.md).
- **three.js for that tab: rejected, measured.** three.js 0.186.1 ships only as ES modules (core 416 KB + renderer 393 KB + OrbitControls 41 KB minified, about 202 KB gzipped), needs WebGL2, and Chrome 154 refuses module imports from `file://`, which would break "opens from a downloaded copy". The scene is a dozen rods, a grid and a few thousand points, so it is drawn on a 2D canvas instead: one 55 KB file, no WebGL, one renderer to test. If a lit, meshed render is ever wanted for a video, add it as an optional layer on top of `K3` (the kinematics) without touching the lessons.
- **Real SO-101 meshes: rejected.** The STL files are 31 files, 19 MB. The rods through the joint centres are labelled a schematic.
- **Left out of tab 5 on purpose:** self-collision, orientation IK (the tab only shows why it is impossible in general with five joints), the gripper jaw, dynamics.
- **Known limits of tab 5, from its pre-publish review:** Follow mode is a single downhill search and can stall at a joint limit for targets behind the base (Solve retries from several starts; Follow does not). On a phone the target can only be dragged in the flat views, and the 3D view orbits sideways only (Tilt is a slider) so the page still scrolls. The view code (`Arm3D`) has no automated tests; only the kinematics (`K3`) and the lesson numbers do. Not yet opened on a real phone or Chromebook.

## Decided 2026-09-26

- **Diagrams offered upstream: done.** [huggingface/robotics-course#37](https://github.com/huggingface/robotics-course/pull/37) fills seven of the ten `<!-- TODO: ... diagram -->` placeholders in Unit 2 with five figures: three rendered from this playground's export mode (`?export=task|cs|both`, sources in `docs/course-diagrams/`) and two hand-drawn SVGs (feedback block diagram, motion taxonomy). Remaining placeholders, offered as a follow-up in the PR: the explicit/implicit/hybrid comparison table (`1.mdx`), the Unit 2 timeline and pros/cons graphic (`5.mdx`).
- **Published as a Hugging Face Space: done.** [huggingface.co/spaces/bacool/arm-playground](https://huggingface.co/spaces/bacool/arm-playground) (static; direct URL `bacool-arm-playground.static.hf.space`). Re-publish after changes with `~/.claude/scripts/publish-arm-playground-space.py`, which mirrors both pages, `docs/` and this README with the Space's YAML front matter.

## Rejected, with reasons

- ~~**A 3-D, six-joint SO-100.** Unit 2's whole argument is built on the planar two-joint simplification; a 6-DOF arm would obscure it, and CompuTools already does 6-DOF FK/IK well. Not this tool's job.~~ Reversed 2026-10-05, see above: built as a fifth tab that starts from the planar arm and unlocks the other joints.
- **First-order damping (k_d on the velocity-commanded arm).** Tried on 2026-09-26 and measured: with 60 ms latency, k_d = 0.5 only trimmed the error (max 0.78 → 0.58) and the ringing did not die. On a velocity-commanded plant, derivative-on-measurement just divides the effective gain by (1 + k_d). Replaced by the inertia mode (step 7), where PD damping is real physics.
- **An integral term / steady-state disturbance.** Would need a constant disturbance (gravity sag) to be meaningful; Unit 2 doesn't cover it and the field guide only names it. Low value per line of code.
- **Reproducing the course's chapter quiz.** The course owns it; the playground's predict-then-check questions (23 at the time, 30 now) already test the same ideas in a more hands-on way. The progress file uses the course quiz as the exit check.
- **Sound, translations, analytics.** No.
- **Trajectory planning / waypoints.** ArmLab does this well, and Unit 2 doesn't teach it.

## Maybe later

- **Shoulder joint limit** (only the elbow is limited today). Cheap, but the map's tan/grey regions are already busy; add only if a lesson needs it.
- **A Unit 5–7 companion** once Hugging Face releases those units (RL, imitation learning, foundation models). Nothing to build until the material exists.
- **Touch-friendly hover.** On phones there is no hover preview on the configuration map; tapping sets the pose. Acceptable.
