# Product

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages at https://bakulbadwal.github.io/arm-playground/wet-paint/, as a folder of the Arm Playground repo. Must also work opened straight from the file.

## Users

Primary: the author, an MBA (UVA Darden '27) who isn't an engineer and wants to read the imitation-learning and generalist-policy chapters of Hugging Face's *Robot Learning: A Tutorial* (and the ACT, SmolVLA and Real-Time Chunking papers) with the right picture in his head. Secondary: people taking the Hugging Face Robotics Course who want the material after Unit 2 (the course has published Units 0–2; this lab covers imitation learning and real-time execution ahead of the course), and anyone the author shares it with.

## Product purpose

Teach the two things that break a copied robot policy in the real world, and how the field fixes each:

1. **Drift.** Behaviour cloning only ever saw the master on the line, so the first small mistake takes it somewhere its notebook has no page for, and mistakes compound (Ross & Bagnell). DAgger fixes it by having the expert label the states the learner actually visits.
2. **Time.** A big policy takes longer to think than one control tick, so it plans in chunks. Thinking while stopped leaves blobs; thinking while moving makes seams between chunks; averaging overlapping chunks (ACT's temporal ensembling) is smooth but averages two good plans into a bad one; ordering ahead (SmolVLA's async inference) keeps the queue full; Real-Time Chunking makes the new chunk continue the actions it is too late to change.

Success: after about 75 minutes of play, the reader can explain why BC drifts and DAgger doesn't, why π0 and SmolVLA predict 50 actions at a time, why synchronous inference stalls, why naive async switching zigzags at the fork, and what RTC's frozen prefix and soft mask do, and can read the "Optimized Inference" section of the tutorial and the RTC paper's method section without a glossary.

## Positioning

The interactive robot-learning demos are about one policy running (LeRobot.js, browser ACT demos with MuJoCo) or about the math of one generative model (Fork in the Road, Diffusion Explorer). The compounding-error and DAgger demos are lecture slides and racing-game videos. Nothing found lets you put the same toy policy through every execution strategy with the latency dialled up, and count the blobs, kinks and side flips. That is this lab.

## Operating context

Used at a laptop in study sessions, and on a phone when shared. Steps are done in order (0–7, review board, field test) but people jump between them. Progress persists in localStorage. Nothing computes until a button is pressed; long fleets run in small slices so the page stays responsive.

## Constraints

- Every number comes from `js/core.js` (the real algorithms on a seeded toy street). `ACCEPTANCE.md` lists the verified values; `node tests/check.js` prints them.
- The honesty note (what's exact vs a teaching model) must remain, on the page and in the README.
- Numbers quoted from papers are cited and not altered (see `SOURCES.md`).
- The street analogy is the vocabulary: the striper = the robot, its steering rule = the policy, the master = the human demonstrator (teleoperating from the kerb), the logbook = the demonstrations, the apprentice's notebook = the training set it looks things up in, a pothole = a disturbance, the master riding along = DAgger, a work order of 50 waypoints = an action chunk, the drafting desk = inference and its think time = latency, a blob = a stop with the nozzle open, a kink = a seam between chunks, the wet cement = the fork in the demonstrations, the committee = temporal ensembling, ordering ahead = asynchronous inference, tracing paper = Real-Time Chunking.

## Brand commitments

- Name: **Wet Paint**. A sibling of Inference Kitchen, Policy Pond and Fork in the Road: same design system, a Main Street palette and a road-works orange masthead.
- Must not look like "every AI tool" (dark ground, neon accent, glowing cards) or like a corporate SaaS dashboard.
