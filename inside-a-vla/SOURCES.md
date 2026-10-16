# Sources

Every figure the page quotes from a paper, a released config or the LeRobot code, with where it comes from. Checked on 2026-10-15 against the full texts on the Hugging Face paper mirror (`hf://papers/<id>/paper.md`, which reproduces the arXiv HTML: SmolVLA v1, π0 v3, SmolVLM v1, PaliGemma v2, RTC v2), the released configs on the Hugging Face Hub, and the LeRobot repository (`main` at `297774f`) and the Hugging Face blog repository, fetched from GitHub. Numbers the page *computes* (token counts, weight counts, FLOPs, toy milliseconds) come from `js/core.js` and are listed in [`ACCEPTANCE.md`](ACCEPTANCE.md).

## SmolVLA

Shukor et al., [*SmolVLA: A Vision-Language-Action Model for Affordable and Efficient Robotics*](https://arxiv.org/abs/2506.01844) (2025).

- **Architecture (§3.1).** "SmolVLA is composed of two main components: (i) a pretrained VLM tasked with perception and (ii) an action expert." The VLM is SmolVLM-2, which "relies on SigLIP … to encode visual features for SmolLM2 language decoder". "Sensorimotor states are projected into a single token via a linear layer." Figure 1: the model discards "the last L − N layers".
- **64 tokens per frame (§3.1, "Visual tokens reduction").** "To obtain a faster inference time, we do not use tiling. We use the global image only, in addition to a pixel shuffle operation, limiting the visual tokens to 64 per frame."
- **Layer skipping (§3.1).** "setting N to half the total layers (N = L/2) offers a good tradeoff between speed and performance, effectively halving the LLM and action expert's computational cost."
- **Expert width (§3.1).** "we use a reduced hidden size of 0.75 × d for v_θ, where d is the VLM's hidden dimension."
- **Interleaved attention (§3.1).** "we employ an interleaved approach, where each block contains either a CA or a SA layer … CA layers cross-attend the VLM's keys and values, while SA layers allow the action tokens in v_θ to attend to each other. We employ a causal attention mask for the SA layers."
- **Control rate (§3.3).** "With a real-world frame-rate of 30 frames per second, Δt = 33ms"; the queue never runs dry when g ≥ (E[ℓ_S]/Δt)/n.
- **Implementation details (§4.3).** "resizing the images to 512×512, for consistency with the VLM input size"; "chunks of n = 50 actions"; "During inference, the flow matching is fixed to 10 steps"; "Our main model, contains 450 million parameters, with approximately 100 million dedicated to the action expert. We use only the first 16 layers of the large language model (LLM) within the VLM."
- **π0 as a baseline (§4.4).** "a total model size of 3.3 billion parameters … accepts three RGB images, sensorimotor states, and a language instruction."
- **Table 2 (LIBERO, average success).** SmolVLA (0.45B) 87.3; π0 (3.3B, pretrained on robot data) 86.0. Text below it: "compared to π0, SmolVLA is around 40% faster to train and consumes 6× less memory."
- **Table 3 (SO100 real robot, average success).** SmolVLA (0.45B) 78.3; π0 61.7 (the table labels it "3.5B").
- **§4.6, Figure 5.** Async completes the task "in 9.7 seconds, compared to 13.75 seconds in the synchronous setting (∼30% faster)". The page quotes only the "~30% faster".
- **Ablations (§4.7, LIBERO average success; models trained from scratch, VLM frozen).**
  - Table 6: CA 79.0, SA 74.5, CA+SA 85.5.
  - Table 7: bidirectional 67.5, causal 74.5.
  - Table 8 (VLM layers kept, N): 8 → 75.0, 16 → 78.5, 24 → 79.5, 32 → 80.3; Skip %2 75.5; VLM-256M 75.8. Caption: "Skipping layers from a large VLM (here 500M parameters) yields better results than downsizing the VLM."
  - Table 12 (chunk size n): 1 → 50.0, 10 → 84.0, 30 → 78.5, 50 → 80.3, 100 → 74.5.
  - (Table 9, expert width, is in `core.js` for reference but not shown: ×1.00 82.3, ×0.75 77.5, ×0.50 80.3, ×0.25 73.8. Several ablation tables share an 80.3 baseline row, so the ablations were not all run at the released configuration.)
- **No inference time in milliseconds** is reported for SmolVLA in the paper; the page says so.

The [SmolVLA blog post](https://huggingface.co/blog/smolvla) (`smolvla.md` in the huggingface/blog repo) adds: "a 512×512 image is compressed into just 64 tokens, instead of 1024, using PixelShuffle", and the expert is "~100M parameters".

## SmolVLM

Marafioti et al., [*SmolVLM: Redefining small and efficient multimodal models*](https://arxiv.org/abs/2504.05299) (2025).

- §2.2: pixel shuffle "reduces the total number of visual tokens by a factor of r², where r is the shuffle ratio … smaller VLMs benefit from more aggressive compression (r = 4) as the reduced token count eases attention overhead."
- §4 (model variants): "SmolVLM-500M: A mid-range model with the same 93M SigLIP-B/16 paired with the larger SmolLM2-360M."

## π0

Black et al., [*π0: A Vision-Language-Action Flow Model for General Robot Control*](https://arxiv.org/abs/2410.24164) (2024).

- §IV: action chunk "H = 50 for our tasks"; images "2 or 3 images per robot"; "We use 10 integration steps (corresponding to δ = 0.1)"; "inference can be implemented efficiently by caching the attention keys and values for the prefix o_t and only recomputing the suffix corresponding to the action tokens for each integration step"; "PaliGemma is an open-source 3 billion parameter VLM … We add 300M parameters for the action expert … for a total of 3.3 billion parameters." The action expert "uses a full bidirectional attention mask, so that all action tokens attend to each other."
- Appendix A-B: Gemma 2B "{width=2048, depth=18, mlp_dim=16,384, num_heads=18, num_kv_heads=1, head_dim=256}"; the expert is downsized "to {width=1024, mlp_dim=4096}, resulting in a parameter count of ∼300M". Blockwise causal mask with three blocks; the state is its own block so its keys and values "can be cached during sampling". (The paper prints num_heads = 18; LeRobot's Gemma configs, and Gemma-2B itself, use 8, which is what `core.js` uses. Width 2048 = 8 × 256.)
- Appendix A-D: "Table I summarizes the computation time for this operation with 3 camera images. The operations were timed on an NVIDIA GeForce RTX 4090"; "for all other robots, which run at 50Hz, we run inference every 0.5 seconds (after executing 25 actions)."
- **Not verified, not quoted:** the body of Table I (the per-part inference times and the on-board total widely quoted as 73 ms). The mirror's text does not include the table's numbers and arXiv itself was not reachable from the checking environment. The page instead quotes the RTC paper's 46 ms prefill figure, which cites π0.

## PaliGemma

Beyer et al., [*PaliGemma: A versatile 3B VLM for transfer*](https://arxiv.org/abs/2407.07726) (2024).

- Abstract: "based on the SigLIP-So400m vision encoder and the Gemma-2B language model."
- §3.2: "We train Stage1 at resolution 224px (hence, N_img = 256 image tokens)."

## Real-Time Chunking

Black, Galliker & Levine, [*Real-Time Execution of Action Chunking Flow Policies*](https://arxiv.org/abs/2506.07339) (2025).

- §2: "with an RTX 4090 GPU, the 3 billion parameter π0 VLA spends 46ms on the KV cache prefill alone, before any denoising steps [π0], and targets a 50Hz control frequency (Δt = 20 ms)."
- §2: "We define d := ⌊δ/Δt⌋ and call this quantity the inference delay, corresponding to number of controller timesteps between when o_t is received and when A_t is available."

## Released configs (Hugging Face Hub)

- [`lerobot/smolvla_base`](https://huggingface.co/lerobot/smolvla_base/blob/main/config.json): `chunk_size` 50, `n_action_steps` 50, `num_steps` 10, `resize_imgs_with_padding` [512, 512], `tokenizer_max_length` 48, `pad_language_to` "max_length", `num_vlm_layers` 16, `num_expert_layers` 0 (≤ 0 means as many as the VLM layers kept), `self_attn_every_n_layers` 2, `expert_width_multiplier` 0.75, `attention_mode` "cross_attn", `vlm_model_name` "HuggingFaceTB/SmolVLM2-500M-Video-Instruct". Three camera inputs in the base config.
- [`HuggingFaceTB/SmolVLM2-500M-Video-Instruct`](https://huggingface.co/HuggingFaceTB/SmolVLM2-500M-Video-Instruct/blob/main/config.json): text model 32 layers, hidden 960, intermediate 2560, 15 heads, 5 key-value heads, head_dim 64, vocabulary 49,280; vision hidden 768, patch 16, image size 512, 12 heads; `scale_factor` 4. The vision config doesn't set its depth or MLP size, so the transformers defaults apply (`SmolVLMVisionConfig`: 12 layers, intermediate 3072).
- [`google/siglip-so400m-patch14-224`](https://huggingface.co/google/siglip-so400m-patch14-224/blob/main/config.json): vision 27 layers, hidden 1152, intermediate 4304, patch 14.

## LeRobot code

[huggingface/lerobot](https://github.com/huggingface/lerobot), `main` at `297774f`:

- `policies/smolvla/configuration_smolvla.py`: the defaults above, except that the code's own default is `pad_language_to = "longest"`; it is the released `smolvla_base` config that pads to `max_length` (48). `processor_smolvla.py` passes the config's choice to the tokenizer.
- `policies/smolvla/smolvlm_with_expert.py`: keeps the first `num_vlm_layers` text layers; the expert copies the text config with `hidden_size × expert_width_multiplier` and `intermediate_size = get_intermediate_size(...)` (720 → 2048), one expert layer per VLM layer kept; on cross-attention layers the expert's `k_proj` and `v_proj` (320 × 320) are applied to the VLM's cached keys and values, all 241 of them, on every denoising step (`forward_cross_attn_layer`), which is why `core.js` counts those two matrices over 241 tokens rather than 50; self-attention stays on `layer_idx % self_attn_every_n_layers == 0`, and on those layers the action tokens' keys and values are appended to the cached prefix, so they read the prefix too.
- `policies/smolvla/modeling_smolvla.py`: `embed_prefix` (images, language, one state token), `sample_actions` (prefix once with `use_cache`, then `num_steps` × `denoise_step`), `denoise_step` (prefix fully visible, causal mask within the chunk).
- `policies/pi0/configuration_pi0.py` and `modeling_pi0.py`: `DEFAULT_IMAGE_SIZE = 224`, `tokenizer_max_length = 48` (`processor_pi0.py` pads to `max_length`), `num_inference_steps = 10`, `chunk_size = 50`; Gemma configs `gemma_2b` {2048, 18, 16384, 8 heads, 1 kv head, 256} and `gemma_300m` {1024, 18, 4096, 8, 1, 256}; vocabulary 257,152. `embed_suffix` re-embeds the state token with the noisy actions in every `denoise_step` (51 suffix tokens a step), where the paper says the state's keys and values can be cached; `core.js` follows the paper and counts the state once.

## Series links

[Fork in the Road](https://bakulbadwal.github.io/fork-in-the-road/) teaches flow matching and the denoising steps (step 7); [Demos to Deployment](https://bakulbadwal.github.io/arm-playground/demos-to-deployment/) teaches what to do with the inference delay d (asynchronous inference, step 5, and Real-Time Chunking, step 7); [Inference Kitchen](https://bakulbadwal.github.io/inference-kitchen/) covers serving, batching and KV caching in general.
