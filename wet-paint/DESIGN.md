# Design: Wet Paint

Wet Paint uses the design system recorded in [Inference Kitchen's DESIGN.md](https://github.com/bakulbadwal/inference-kitchen/blob/master/DESIGN.md): a Busytown cross-section spread, flat gouache fields on warm paper, one warm-brown outline, and every object wearing a hand-lettered label. Buttons are painted signs, readouts are price tags on a nail, predictions are sticky notes, takeaways are chalked on a wood-framed board, and the glossary is a menu board. The type is Grandstander for signboards, Patrick Hand for labels and Andika for body text.

This file records only what Main Street changes.

## Palette additions

| Token | Hex | Use |
|---|---|---|
| asphalt / asphalt-d | `#8F9397` / `#6F7377` | the street surface in every plan-view canvas |
| kerb | `#D6CFC2` | the kerbs and pavements either side of the street |
| chalk line | `#FFFDF6` at 70% | the master's guide line, dashed |
| paint | `#F4C430` (yellow) | the striper's painted line, its blobs, executed waypoints |
| left | `#246A9C` (sky-d) | anything that went round the cement on the left |
| right | `#5E4A94` (lilac-d) | anything that went round on the right |
| cement | `#C9C3B6` with a `#A5321F` rope | the wet-cement patch; tyre tracks in it are cement red |
| cone | `#E2701C` | traffic cones |
| masthead / footer | `#C9561A` / `#9E4313` | a road-works sign, replacing the kitchen's brick, the pond's blue and the square's green |

Side colours are fixed across every canvas, dot and readout: left is always blue, right is always purple, cement is always red. Orange is reserved for cones and the masthead, never for data.

## New objects

- **The street canvas** (`canvas.st`): a plan view of Main Street running left to right, asphalt between kerbs, the master's dashed chalk guide line, the striper's yellow painted line drawn as it goes (thicker where it stood still: a blob), potholes as dark ovals with a crack, and the wet-cement patch with cones and a rope.
- **The notebook map** (step 1–2): a square chart of (offset, heading error) with a cell shaded for every page the notebook has there, demonstration pages in yellow, the master's ride-along pages in green; the apprentice's run is drawn over it as a path.
- **The work order** (steps 3–7): fifty small circles ahead of the striper, where the nozzle should be on each of the next fifty ticks; the ones it will drive are filled yellow, the ones it only previews are white, the frozen ones (RTC) are hatched.
- **The timeline** (steps 3, 5, 6, 7): a Gantt strip under the street, one row for "drafting" (think-time bars) and one for "driving" (one tick per pixel), with stops in brick red.
- **The vote stack** (step 4): for one tick, every chunk that has a vote, stacked oldest first with its weight exp(−m·i) as a bar.
- **The mask chart** (step 7): RTC's soft mask W_i across the 50 entries of a chunk, with the frozen region, the soft region and the free region labelled.
- **Incident folders** (review board): three cases pinned to a cork board, each with a rule to fix, a fleet re-run and a named cause.

## Scenes

Nine hand-built SVG scenes, 960 × 400, one per step plus the review board, assembled in `js/art.js` from a drawn cast:

- **the striper**: a small three-wheeled line-marking robot, school-bus yellow, with a paint tank, a nozzle at the front dripping one drop, and a camera mast;
- **the master**: a road-crew painter in a high-visibility vest and cap, holding a joystick (teleoperation), standing on the kerb;
- **the notebook**: a spiral notebook full of small sketches of the street, some pages dog-eared;
- **the drafting desk**: a little booth on the pavement with a drafting table, a lamp and a stopwatch, where work orders are drawn;
- **the work order**: a clipboard with a strip of fifty dots;
- **the committee**: three or four painters around a table holding up overlapping work orders;
- **the wet-cement patch**: grey, roped off, with cones and a "WET" sign;
- **the duck family**, crossing, for colour only;
- shops along Main Street (bakery, hardware, café, post office) with awnings, as in the town-square scenes.

Each scene labels its objects with their robot-learning meaning ("the master = the human demonstrator"). The striper is a generic line-marking robot, not any company's product.
