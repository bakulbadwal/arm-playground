# Product

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages at https://bakulbadwal.github.io/arm-playground/inside-a-vla/, as a folder of the Arm Playground repo. Must also work opened straight from the file.

## Users

Primary: the author, an MBA (UVA Darden '27) who isn't an engineer and wants to read the SmolVLA and π0 papers, and a VLA's config file, with the right picture in his head. Secondary: people taking the Hugging Face Robotics Course or reading Hugging Face's *Robot Learning* tutorial who have met "VLA", "action expert" and "flow-matching steps" as words, and anyone the author shares it with.

## Product purpose

Teach the anatomy and compute budget of a vision-language-action model, with SmolVLA as the worked example and π0 as the comparison:

1. **What goes in.** Frames become (size ÷ patch)² patches, ÷ r² after pixel shuffle; the instruction becomes word tokens; the joints become one token.
2. **What a forward pass costs.** About 2 × weights × tokens, plus attention at 4 × width × tokens² per layer.
3. **What each of SmolVLA's efficiency choices buys.** 64 tokens a frame (the backbone's bill drops 20×), half the layers (the backbone and expert halve, the chunk gets 19% cheaper), a narrow expert, a cached prefix.
4. **Where the milliseconds go.** Latency ≈ vision encoder + prefill + steps × expert pass, each the slower of its arithmetic and its weight reads; d = ⌊latency ÷ Δt⌋ is the delay Demos to Deployment's execution strategies hide.

Success: after about 45 minutes of play, the reader can say where the milliseconds go when SmolVLA turns three frames and an instruction into a 50-action chunk, explain what pixel shuffle, layer skipping and KV caching each save and why the vision encoder is what's left, and estimate a VLA's token count and FLOPs from its config.

## Positioning

VLAs are explained by architecture diagrams and a single latency number. Nothing found lets you change one design choice and watch tokens, FLOPs and milliseconds move together, part by part. The lab sits between Fork in the Road (the flow-matching math, linked, not re-taught) and Demos to Deployment (what to do with the delay, linked, not re-taught), and leaves KV caching and serving in general to Inference Kitchen.

## Operating context

Used at a laptop in study sessions, and on a phone when shared. Steps are done in order (0–5, then the field test) but people jump between them. Progress persists in localStorage under `inside-a-vla-v1`. Everything computes instantly; nothing is random.

## Constraints

- Every number comes from `js/core.js`. `ACCEPTANCE.md` lists the verified values; `node tests/check.js` prints them.
- The honesty note (what's exact vs a teaching model) must remain, on the page and in the README.
- Numbers quoted from papers are cited and not altered (see `SOURCES.md`). A number that couldn't be verified isn't quoted.
- The office analogy is the vocabulary: a card = a token, the photo desk = the vision encoder, the bundler = pixel shuffle, word cards = instruction tokens, the joint card = the state token, the tower = the backbone, a floor = a layer, the staff = the weights, the floor meeting = attention, the filing cabinet = the KV cache, the drafting room = the action expert, a draft = one flow-matching step, the work order = the action chunk, the stopwatch = latency, a tick = the control period.

## Brand commitments

- Name: **Inside a VLA**. A sibling of Demos to Deployment, Fork in the Road and Inference Kitchen: same design system, an office-building palette and a mulberry masthead.
- Must not look like "every AI tool" (dark ground, neon accent, glowing cards) or like a corporate SaaS dashboard.
