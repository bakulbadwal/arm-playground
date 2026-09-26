# Backlog

Ideas considered and not built, with the reason, so the same discussion doesn't happen twice. Newest first.

## Decided 2026-09-26

- **Diagrams offered upstream: done.** [huggingface/robotics-course#37](https://github.com/huggingface/robotics-course/pull/37) fills seven of the ten `<!-- TODO: ... diagram -->` placeholders in Unit 2 with five figures: three rendered from this playground's export mode (`?export=task|cs|both`, sources in `docs/course-diagrams/`) and two hand-drawn SVGs (feedback block diagram, motion taxonomy). Remaining placeholders, offered as a follow-up in the PR: the explicit/implicit/hybrid comparison table (`1.mdx`), the Unit 2 timeline and pros/cons graphic (`5.mdx`).
- **Published as a Hugging Face Space: done.** [huggingface.co/spaces/bacool/arm-playground](https://huggingface.co/spaces/bacool/arm-playground) (static; direct URL `bacool-arm-playground.static.hf.space`). Re-publish after changes with `~/.claude/scripts/publish-arm-playground-space.py`, which mirrors both pages, `docs/` and this README with the Space's YAML front matter.

## Rejected, with reasons

- **A 3-D, six-joint SO-100.** Unit 2's whole argument is built on the planar two-joint simplification; a 6-DOF arm would obscure it, and CompuTools already does 6-DOF FK/IK well. Not this tool's job.
- **First-order damping (k_d on the velocity-commanded arm).** Tried on 2026-09-26 and measured: with 60 ms latency, k_d = 0.5 only trimmed the error (max 0.78 → 0.58) and the ringing did not die. On a velocity-commanded plant, derivative-on-measurement just divides the effective gain by (1 + k_d). Replaced by the inertia mode (step 7), where PD damping is real physics.
- **An integral term / steady-state disturbance.** Would need a constant disturbance (gravity sag) to be meaningful; Unit 2 doesn't cover it and the field guide only names it. Low value per line of code.
- **Reproducing the course's chapter quiz.** The course owns it; the playground's 23 predict-then-check questions already test the same ideas in a more hands-on way. The progress file uses the course quiz as the exit check.
- **Sound, translations, analytics.** No.
- **Trajectory planning / waypoints.** ArmLab does this well, and Unit 2 doesn't teach it.

## Maybe later

- **Shoulder joint limit** (only the elbow is limited today). Cheap, but the map's tan/grey regions are already busy; add only if a lesson needs it.
- **A Unit 5–7 companion** once Hugging Face releases those units (RL, imitation learning, foundation models). Nothing to build until the material exists.
- **Touch-friendly hover.** On phones there is no hover preview on the configuration map; tapping sets the pose. Acceptable.
