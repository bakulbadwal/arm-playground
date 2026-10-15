# Sources

Every figure the page quotes from a paper, with where it comes from. Checked against the arXiv full texts (via the Hugging Face paper mirror), the LeRobot repository (v0.6.1 and main at 53feaef, 2026-10-14) and the original ACT code, on 2026-10-15.

## Robot Learning: A Tutorial

Capuano, Pascal, Zouitine, Wolf & Aractingi, [arXiv:2510.12403](https://arxiv.org/abs/2510.12403) (v1, 14 Oct 2025). §4 "Robot (Imitation) Learning" covers behaviour cloning and compounding errors / covariate shift (Fig. 20, citing Ross et al. 2011), generative models, Action Chunking with Transformers, Diffusion Policy, and "Optimized Inference" (the asynchronous algorithm with the sequential, async and sync-limit regimes, Fig. 32). §5 "Generalist Robot Policies" covers π0 and SmolVLA. The Hugging Face Robotics Course distils it; Units 0–2 are published.

## Behaviour cloning and DAgger

Ross, Gordon & Bagnell, [*A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning*](https://arxiv.org/abs/1011.0686) (AISTATS 2011).

- Theorem 2.1 (credited to Ross & Bagnell 2010): "Let E_{s∼d_π*}[ℓ(s,π)] = ε, then J(π) ≤ J(π*) + T²ε." §1: a classifier "can make as many as T²ε mistakes in expectation over T-steps."
- Theorem 3.2: "if N is Õ(uT) … J(π̂) ≤ J(π*) + uTε_N + O(1)": linear in T.
- Algorithm 3.1: π_i = β_i·π* + (1 − β_i)·π̂_i. "We will typically use β_1 = 1 … Then we could choose β_i = p^{i−1}." The parameter-free β_i = I(i = 1) "often performs best in practice."
- The 2010 AISTATS paper itself was not opened; its bound is quoted as the 2011 paper restates it.

## ACT

Zhao, Kumar, Levine & Finn, [*Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware*](https://arxiv.org/abs/2304.13705) (RSS 2023).

- Chunk size k = 100 (Table III); teleoperation and recording at 50 Hz (§V).
- Temporal ensembling (§IV-A, Algorithm 2): "we query the policy at every timestep"; w_i = exp(−m·i), "where w_0 is the weight for the oldest action"; "a smaller m means faster incorporation."
- **m = 0.01 is from the released code**, not the paper: `act/imitate_episodes.py`, `k = 0.01; exp_weights = np.exp(-k * np.arange(...))`, with `query_frequency = 1` when ensembling.
- Ablation (§VI-A, Fig. 8): success "improves drastically from 1% at k = 1 to 44% at k = 100" (ensembling off, four simulated settings); temporal ensembling adds 3.3% for ACT.
- LeRobot's ACT (`configuration_act.py`): chunk_size = 100, n_action_steps = 100, temporal_ensemble_coeff defaults to None; with ensembling on, "`n_action_steps` must be 1 … the policy needs to be queried every step." Its `ACTTemporalEnsembler` docstring gives 0.01 as the original value.

## π0

Black et al., [*π0: A Vision-Language-Action Flow Model for General Robot Control*](https://arxiv.org/abs/2410.24164) (2024). Chunks of H = 50 ("we use H=50 for our tasks"); 10 flow-matching integration steps; on 50 Hz robots it re-infers "every 0.5 seconds (after executing 25 actions)"; "We tried temporal ensembling … and found that it hurt policy performance." (The 73 ms on-board latency figure is widely quoted from Table I; it was not seen directly, so the page quotes the RTC paper's 76 ms instead.)

## SmolVLA and LeRobot's async inference

Shukor et al., [*SmolVLA: A Vision-Language-Action Model for Affordable and Efficient Robotics*](https://arxiv.org/abs/2506.01844) (2025).

- 450M parameters, ~100M in the action expert; first 16 LLM layers; 10 flow-matching steps; chunks of n = 50.
- The real-robot experiments run at "a real-world frame-rate of 30 frames per second" (Δt ≈ 33 ms), the Δt in the no-starvation condition below.
- §3.3, Algorithm 1: send an observation when |A_t|/n < g; g = 0 is the "sequential limit", g = 1 sends every timestep; the queue never runs dry when g ≥ (E[ℓ_S]/Δt)/n. Near-duplicate observations are filtered, but an empty queue always triggers one. The overlap aggregation is not given as a formula in the paper.
- §4.6, Fig. 5: completion time Sync 13.75 s vs Async 9.70 s on average ("∼30% faster"); in a fixed 60 s, 19 cubes placed async against 9 sync; success rates 78.3% sync, 73.3% async on average.
- [LeRobot async docs](https://huggingface.co/docs/lerobot/async) and code (v0.6.1 `configs.py`): `chunk_size_threshold` defaults to **0.5 in code** (the docs table says 0.7; its own examples use 0.5), triggering when `qsize / action_chunk_size <= threshold`; `aggregate_fn_name` defaults to `"weighted_average"` = 0.3·old + 0.7·new, with `latest_only`, `average` (0.5/0.5) and `conservative` (0.7/0.3) as options. Actions are indexed by timestep. The module lives under `src/lerobot/async_inference` in v0.6.1.

## Real-Time Chunking

Black, Galliker & Levine, [*Real-Time Execution of Action Chunking Flow Policies*](https://arxiv.org/abs/2506.07339) (2025).

- §2: inference delay d := ⌊δ/Δt⌋, execution horizon s, d ≤ s ≤ H − d; async inference "must start inference at s − d".
- Method: "freezing actions guaranteed to execute and 'inpainting' the rest", with ΠGDM guidance (eq. 2), weight clip β = 5 (A.2), s = max(d, s_min).
- Soft mask, eq. 5: W_i = 1 for i < d; c_i(e^{c_i} − 1)/(e − 1) for d ≤ i < H − s; 0 for i ≥ H − s; c_i = (H − s − i)/(H − s − d + 1).
- §4.2: π0.5 with H = 50, Δt = 20 ms, 5 denoising steps; model latency "76ms for the baselines and 97ms for RTC", plus 10–20 ms of network, so d ≈ 6; injected +100 ms and +200 ms give d ≈ 11 and 16.
- Results: robust to delays "in excess of 300 milliseconds"; "20% faster than synchronous inference"; synchronous inference "degrades linearly" with delay. Temporal ensembling "performs poorly across the board" in simulation and can't run on the robots at +100 ms ("protective stop is triggered"). Naive async: "naively switching chunks as soon as the new one is ready". Bidirectional decoding uses "significantly more compute".
