# Backlog

Ideas considered and not built, with the reason, so the same discussion doesn't happen twice. Newest first.

## Held for a decision (outward-facing, go out under Bakul's name)

- **Publish as a Hugging Face Space.** Hugging Face's free app hosting; the same `index.html` would live at `huggingface.co/spaces/<user>/arm-playground`, where course learners already browse. Zero code change. Do it only on an explicit yes.
- **Offer the course's missing diagrams upstream.** The course's Unit 2 source (`units/en/unit2/*.mdx`) contains ten `<!-- TODO: ... diagram -->` placeholders. This playground already renders four of them: the two-link arm with θ₁/θ₂ (FK tab), the reachable annulus (FK tab with unequal links), the J(q) velocity micro-diagram (Jacobian tab) and the feedback block diagram (implicitly, feedback tab). Exporting those as static images and opening a discussion or PR on `huggingface/robotics-course` is a real contribution. Do it only on an explicit yes.

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
