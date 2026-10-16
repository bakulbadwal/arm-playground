# Design: Inside a VLA

Inside a VLA uses the design system recorded in [Inference Kitchen's DESIGN.md](https://github.com/bakulbadwal/inference-kitchen/blob/master/DESIGN.md): a Busytown cross-section spread, flat gouache fields on warm paper, one warm-brown outline, and every object wearing a hand-lettered label. Buttons are painted signs, readouts are price tags on a nail, predictions are sticky notes, takeaways are chalked on a wood-framed board, and the glossary is a menu board. The type is Grandstander for signboards, Patrick Hand for labels and Andika for body text. The CSS and the page framework (nav, predictions, tooltips, say-it-out-loud, field test) are Demos to Deployment's, rethemed; the drawing primitives and the Busytown worker in `js/art.js` are shared with it.

This file records only what the office changes.

## Palette additions

| Token | Hex | Use |
|---|---|---|
| mast / mast-d | `#7B3A63` / `#5A2748` | a mulberry office sign: masthead, footer, roofs and scene boards, replacing the kitchen's brick, the pond's blue, the square's green, Main Street's road-works orange, Eye Exam's teal and Dual Controls' learner-plate red |
| photo | `#246A9C` | the photo desk (vision encoder) and photo cards, in every chart |
| conn | `#9CCBEA` | the bundler's projector (the connector) |
| staff | `#5E4A94` | the tower's staff work (the backbone's matrix multiplies) |
| meet | `#B8A3DC` | the tower's meetings (the backbone's attention) |
| expert / expert-d | `#E2701C` / `#A84E0F` | the drafting room, its drafts and the work order's lines |
| word | `#F4C430` | word cards (instruction tokens) |
| stcard | `#5FA03C` | the joint card (the state token) |

Each part keeps its colour in every canvas, legend, readout and scene: blue is always the photo desk, purple the tower, orange the drafting room. Mulberry is reserved for the building and the masthead, never for data. Hatching on a timeline bar means that stage is waiting on memory.

## New objects

- **The cut frame** (step 0): one camera frame drawn as a little scene (gripper, red cube, cardboard box), ruled into its tiles, with every r × r bundle outlined in blue and one picked out in red; beside it the prefix as blocks of cards, one square block per camera, the 48 word cards, the joint card.
- **The prefix bill** (step 1): a stacked bar of photo desk, projector, tower staff and tower meetings in GFLOP, scaled to the most any bundle size costs, so turning the bundler off visibly fills the bar.
- **The tower curve** (step 1): the tower's GFLOP against the number of cards; staff work is a straight line, meetings the lilac band that widens with the square; dashed marks at SmolVLA (241), π0 (816) and SmolVLA without the bundler (3,121).
- **The floors chart** (step 2): whole-chunk GFLOP at N = 4…32 as stacked bars, with SmolVLA's Table 8 success rates as green dots on a second axis that starts at 70 (labelled).
- **The reading map** (step 3): for each kind of drafting floor, a grid of the 50 lines against every card they can read, drawn to one scale: blue for the filed prefix, an orange triangle for the causal mask.
- **The stopwatch timeline** (steps 4 and 5): photo desk, tower and each draft as bars in milliseconds, with the robot's ticks below, red for those that pass while the office works, and the chunk-ready line with d.
- **Work orders** (step 5): three goals for the builder, each with a circle that turns green and a note naming the levers that met it.

## Scenes

Six hand-built SVG scenes, 960 × 400, one per step, assembled in `js/art.js` from a drawn cast:

- **the robot**: a generic small yellow arm on a table reaching for a red cube beside a cardboard box, with three cameras (pole, wrist, side);
- **the mailroom**: a light table with a photo ruled into tiles, a stapler bundling tiles onto a card, a typewriter with the request "put the cube in the box", an out-tray to the tower;
- **the tower**: a brick cross-section with numbered floors, staff at desks and cards on belts; in step 2, 32 thin floors with the top sixteen dark behind a "closed" sign and a rope at floor 16;
- **one floor up close**: a row of desks every card passes, and a round meeting table with every card joined to every other;
- **the filing cabinet**: four drawers, one open with cards in it, fed by a glass chute;
- **the drafting room**: slanted drafting tables with drafters, a clipboard work order with the drawn lines in orange and the rest dashed ("draft 7 of 10"), crumpled earlier drafts, a stopwatch;
- **the stopwatch street**: the office front with a big clock, a paper banner timeline with the robot's ticks, the robot waiting ("tick, tick…");
- **two offices**: a slim sixteen-floor SmolVLA and a wide eighteen-floor π0, each with its mailroom and drafting annex.

Each scene labels its objects with their VLA meaning ("photo desk = vision encoder"). The arm is a generic arm, not any company's product.
