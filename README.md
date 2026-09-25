# Arm Playground

An interactive two-joint planar arm for learning the math in **Unit 2 (Classical Robotics)** of the [Hugging Face Robotics Course](https://huggingface.co/learn/robotics-course). It's one HTML file with no dependencies and no build step. Open `index.html` in a browser.

It's an unofficial companion, not affiliated with Hugging Face. It uses the course's notation (q = [θ₁, θ₂], p(q), J(q)⁺, k_p Δp) so you can move between the course page and the sliders without translating.

## What's in it

Two views side by side, always in sync:
- **Task space**: the arm, the floor and shelf, and the area the hand can reach.
- **Configuration space**: every pixel is one (θ₁, θ₂) pose, coloured by whether it's free, hits the floor, hits the shelf, or is past the joint limit. Click it to set the pose.

| Tab | Course page | What you can do |
|---|---|---|
| 1 · Forward kinematics | unit2/3 | Drive θ₁, θ₂; see p(q) worked with live numbers; unequal links open the workspace's inner hole |
| 2 · Inverse kinematics | unit2/3 | Drag a target; see both closed-form solutions (elbow ±), which ones the floor or shelf blocks, and the closest feasible pose when none works (the `min ‖p(q) − p*‖²` form) |
| 3 · Jacobian & diff-IK | unit2/4 | See J's columns as each joint's "nudge", the manipulability ellipse and det J = l₁l₂ sin θ₂; run q̇ = J⁺ṗ* into a singularity with a plain vs damped inverse |
| 4 · Feedback control | unit2/4 | Track a step, circle or sweep with q̇ = J⁺(ṗ* + k_p Δp); vary gain, control rate, latency and model error; watch smooth → overshoot → unstable (k_p·Δt = 1 and 2) |

Each tab has a "Try this" list of experiments with the result to expect.

## Why another IK demo

Two-link FK/IK visualisers already exist (for example [ArmLab](https://github.com/ishn-kapadia/armlab), [ShareTechnote](https://www.sharetechnote.com/html/WebProgramming/Websim_RoboticsKinematicsI.html) and [CompuTools](https://www.compu-tools.com/robot-kinematics/)). This one adds what Unit 2 argues but doesn't show:
1. **Constraints drawn in configuration space**, so you can see a floor or shelf delete IK solutions.
2. **Discrete-time feedback with latency and model error**, so the course's "start with small k_p" advice becomes something you can break.
3. **The course's exact equations and worked numbers**, not a generic robotics notation.

## Conventions

- Link lengths in abstract units (default l₁ = l₂ = 1). Angles in degrees in the UI, radians in the math.
- θ₂ is the elbow angle **relative to link 1**, so link 2's absolute angle is θ₁ + θ₂.
- The feedback simulation integrates at 2 ms. The controller updates at the chosen rate with zero-order hold, measures the hand with the true geometry (like a camera), builds J from the possibly wrong model lengths, uses a lightly damped pseudo-inverse (λ = 0.02), and clamps joint speeds.
- Collision checks are exact segment-vs-box tests. The configuration-space map uses a 2° grid.
