# Engineering content sources

Companion to `src/data/engineeringProjects.ts`. For every entry it records where each
fact came from, what is still unverified, the questions for Kirat, and the media found
on disk. Research was done read-only on 2026-10-20/21 by the engineering-content
specialist. Paths starting with `~` are on Kirat's machine; nothing was copied into
this repository.

## How the content was checked

- **Facts** come from each project's own README/docs, manifests, source-file headers and
  git history. Where code and docs disagree, the more conservative statement is used and
  the conflict is noted below.
- **Years** come from git history (the local repo, or GitHub's commit history for repos
  that exist only there). No version control → no `year`.
- **Links** are only URLs that returned HTTP 200 to `curl` on 2026-10-21 (see
  [Verified links](#verified-links)). Private (404/401) and empty repos are not linked.
- **Results** are measured outcomes recorded in the docs, quoted with their conditions
  (dataset, split, n). Nothing is rounded up or derived.
- **`contribution`, `role` and `learnings` are empty everywhere.** No document states
  Kirat's personal share in his own words. Git-history evidence is collected under
  [Suggested contribution text](#suggested-contribution-text-for-kirat-to-confirm) for him
  to confirm or rewrite.
- **Not opened:** `.env*`, `*.pem`, keys, credentials, datasets, audio, videos, photos of
  people, plate crops, invoices from real customers, and PDFs other than project specs.
  Teammates are never named here or in the data.

## Summary

| # | Slug | Category | Featured | Status | Year | Public link |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `campus-vehicle-security` | software | yes | in-progress | 2026 | — (public repo is empty) |
| 2 | `voice-clone-detection` | ml | yes | prototype | 2026 | — (repo private) |
| 3 | `indian-anpr-research` | research | yes | research | 2026 | — (same honours repo) |
| 4 | `growplay-table-tennis-analysis` | cv | yes | prototype | 2026 | — (repo private) |
| 5 | `failure-synthesis-system` | software | yes | prototype | 2026 | GitHub |
| 6 | `business-entity-resolution` | ml | yes | competition | 2026 | — (repo private) |
| 7 | `dashcam-anpr-pipeline` | cv | no | prototype | 2026 | GitHub |
| 8 | `personal-stream` | software | no | — | 2026 | GitHub |
| 9 | `video-clipper` | ml | no | prototype | 2025 | GitHub |
| 10 | `dsa-in-cpp` | dsa | no | — | — | — |

The six featured entries fill the six engineering exhibit slots in the 3D world, in this
order. QA's `src/data/content.test.ts` passes (40/40) against this data.

---

## 1. `campus-vehicle-security`

**Sources:** `~/coding/honours/README.md`, `PROJECT_ARCHITECTURE.md`, `context.md`
(§1, §7, §11D Phase 7, §11C Phase 16, §12), `SETUP_REPORT.md` (§7–§12),
`RUN_AND_DIGEST_2026-10-20.md`, `frontend/README.md`, `frontend/package.json`,
`backend/requirements.txt`, listings of `backend/app/{routes,services,models}`,
`docker-compose.yml` (service names only); `git log` (27 commits, all by kirat11X,
dated 2026-10-13; no remote).

| Fact | Source |
| --- | --- |
| B.Tech honours project; three gates; never actuates a barrier | README §1, PROJECT_ARCHITECTURE §1 |
| Stack: FastAPI, SQLAlchemy 2, Pydantic v2, Alembic, PostgreSQL 16, Mosquitto, Frigate 0.18, RapidOCR + Tesseract, n8n, React 19, Vite, Tailwind, TanStack Query, Capacitor 7, Docker Compose | README §3, frontend/README.md, requirements.txt |
| Idempotent ingestion keyed on Frigate's tracked-object id; raw plate kept beside the normalised one | PROJECT_ARCHITECTURE §6, Invariant 3 |
| Near-miss registry matches are display-only; low-confidence reads → needs review | context.md §11D "Slide-6 registry match" |
| Direction only from declared lane / zone order / guard; append-only movement log with correction rows | PROJECT_ARCHITECTURE Invariant 6 amendment, Invariant 8 |
| Invoice screening: OCR → parser → policy table (ALLOW / REVIEW / ALERT + reason codes) → totals check | context.md §11D |
| Test counts 11/11, 15/15, 20/20, 20/20 + live MQTT, 14/14, 11/11, 7/7; E2E 3 pipelines | README §5, SETUP_REPORT §7–§12, context.md §7 (the 2026-10-20 digest re-ran phases 1–4, 6, 16 and E2E: all passed) |
| Status in-progress | README §6 roadmap (phases 5 and 8–15 open) |

**Unverified / caveats**
- Not evaluated on real gate footage (Phase 5B open) or real invoice photos (context.md
  §11D "Limits"). The `sourceNote` says so.
- The docs name the institution; the portfolio text says "a three-gate college campus".
  Kirat can choose to name it.
- Public repo `kirat11X/CVS-ACS--Campus-Vehicle-Security-Access-Control-System` exists
  but is empty, so it is not linked.

**Questions for Kirat**
- Was this a solo honours project? Should a supervisor be credited (only with consent)?
- Push the code (without `.env`, media and weights) to the public CVS-ACS repo so it can be linked?
- Work dates back to September 2026 by file dates. Keep "2026"?
- Screenshots: capture the console (overview, live feed, delivery screening) with the
  seeded demo data?

**Media on disk**
- No console screenshots exist. Capture them after `scripts/seed_demo.py`. The demo
  plates are made-up strings in real plate format: blur them in images (they may match
  real registrations) and never put them in text (QA rejects plate-like strings).
- `~/coding/honours/media/demo/invoice_D-20481.png`: generated by the seed script.
  Probably safe; check before use.
- `~/coding/honours/media/test_invoice.png`, `~/coding/honours/media/test_plate.png`:
  test media from `scripts/generate_test_media.py` (not opened). Check before use.
- **Do not use:** `~/coding/honours/input/*`, `media/input_videos/*` (phone photos of
  invoices, stock traffic videos), `media/invoices/*` (uploaded invoices, may carry real
  names and addresses), `media/gate_demo_*.mp4`, the other `media/*.mp4`, and `TRAINING_VIDEOS/*`
  (real vehicles and plates).
- Diagrams: ASCII topology and pipeline in `PROJECT_ARCHITECTURE.md` §2 and §4. The
  `pipeline` field follows §4.

## 2. `voice-clone-detection`

**Sources:** `~/coding/SIH/main_ai/PROGRESS.md` (latest; §6, §7–§10, §12),
`~/coding/SIH/ai/PROGRESS.md` (earlier copy), `main_ai/Module 2B/README.md`,
headers of `main_ai/realtime_pipeline.py`, `main_ai/src/fusion/fusion_classifier.py`,
`main_ai/src/sprt/wald_sprt.py`, `main_ai/src/call_intelligence/{extractor,transcriber}.py`,
`analyze_call.py`, `backend/main.py` + `requirements.txt`, `frontend/package.json` +
`src/` listing; `git log` (2026-09-04 → 2026-09-08; commits by kirat11X and three other
authors; remote `kirat11X/SIH-2026` → 404, private).

| Fact | Source |
| --- | --- |
| "SIH 2026 AI Voice-Cloning Detection System" | Module 2B README, line 3 ("SIH" is never expanded, so the page says "SIH 2026") |
| 1.0 s windows, 0.5 s hop, 16 kHz, Silero VAD | PROGRESS §4–§5, realtime_pipeline.py |
| AASIST fine-tuning + Platt calibration + Youden threshold; 1,996-clip test: 88.48% → 99.85% accuracy, EER 14.54% → 0.00% | PROGRESS §6.D |
| Multi-generator stage, persona-grouped splits; 2,512-clip test: 99.80% (2,507/2,512), EER 0.16% | PROGRESS §6.E |
| Fusion = regularised logistic-regression stacker, Platt-calibrated; 2,512/2,512; Fish Audio LOGO 498/500 (fusion level only) | main_ai/PROGRESS §12.2–§12.3, fusion_classifier.py |
| Wald SPRT α 0.005, β 0.001, 20-window cap, INVESTIGATE when inconclusive | PROGRESS §12 (roadmap item 3), wald_sprt.py |
| Streaming check: HIGH_RISK at window 2; warm-window latency mean 38.8 ms, P95 42.9 ms | main_ai/PROGRESS §12.4 |
| Post-call Whisper STT + Pydantic-validated extractor | analyze_call.py, call_intelligence/ |
| FastAPI + WebSocket backend; React + Vite + Tailwind dashboard | backend/main.py, frontend/package.json |

**Unverified / caveats**
- Data: Svarah (real speech), Orpheus TTS and Indic Audio (synthetic). All human speech in
  the test splits comes from one corpus, so near-perfect scores partly measure how separable
  the corpora are. There is no evaluation on real calls; the `sourceNote` says so.
- The earlier PROGRESS said Module 2C's result was "not currently reproducible" until its
  checkpoint was restored; the later copy reports it verified. No Module 2C metric is quoted.
- The ElevenLabs streaming check is a single recording.
- The doc's "time-to-alert 1.15 s" conflicts with the window boundaries it lists, so only
  "second window" is quoted.
- A Hugging Face dataset repo referenced in PROGRESS returns 401 (private), so it is not linked.
- Status is "prototype" because no doc says the entry was submitted, shortlisted or judged.

**Questions for Kirat**
- Confirm the contribution text below. What was your role, and how big was the team?
- Is "SIH" the Smart India Hackathon? How far did the team get? If it was entered, the
  status could become `competition`.
- Make `SIH-2026` public (check dataset licences first)?
- A screenshot of the dashboard (`~/coding/SIH/frontend`) would help; none exists on disk.

**Media on disk**
- `~/coding/SIH/main_ai/Module 2B/output/plots/roc_curves.png`, `calibration_curve.png`,
  `feature_importance.png`, `shap_summary.png`, `correlation_matrix.png`: charts with no
  personal data, but from a teammate's branch. Ask before using.
- **Do not use:** audio under `main_ai/data/` and `main_ai/test/` (voice recordings).

## 3. `indian-anpr-research`

**Sources:** `~/coding/honours/research_track/PROJECT_DIGEST.md`, `research.md`
(22-paper review), `irl_significance.md`, `finetune/RESULTS_A.md`, `finetune/RESULTS_C.md`,
`finetune/PROGRESS_TRAIN.md`, `finetune/requirements-train.txt`, `hitl_anpr/README.md`,
`hitl_anpr/pyproject.toml`, `hitl_anpr/requirements.lock`, `track_a/README.md`; registry
log `~/ml-assets/campus/hitl/registry/registry.jsonl` (version metadata only).

| Fact | Source |
| --- | --- |
| 1,716 images from 11 licence-cleared sources; grouped split 1,483 / 115 / 118 | PROGRESS_TRAIN, 2026-10-12 entries |
| Test evaluated once: P .882, R .796, mAP50 .824, mAP50-95 .440 vs baseline P .688, R .567, mAP50 .554, mAP50-95 .276 (118 images, 142 plates) | PROGRESS_TRAIN, final entries |
| Non-commercial, no-derivatives and unknown-licence sets excluded | PROGRESS_TRAIN, 2026-10-11 |
| Qwen3-1.7B, NF4 4-bit QLoRA (r = 16); n = 63; accuracy 0.841 [0.746, 0.921]; lexical 0.365; zero-shot 0.333; kNN 0.540 | RESULTS_C |
| HITL guardrails: video-level splits, dHash leakage checks, review gate, hash-chained log, re-hashed GOLD, promotion thresholds, registry with rollback, ONNX/OpenVINO export, proposals only | hitl_anpr/README.md |
| RTX 4050 laptop GPU | RESULTS_A, PROGRESS_TRAIN |

**Unverified / caveats**
- All metrics are on public licence-cleared or synthetic data. The docs label them "not
  PEC gate performance", and the `sourceNote` repeats that.
- The OCR data gap closed on 2026-10-11, but no OCR training result is recorded, so none is claimed.
- The registry log shows the bootstrap model (v0001) promoted and three later candidates
  (rounds r01–r03) rejected by the promotion gate. It is a machine log, not a document, so it
  is not in `results`. Kirat may want to state it.
- The AWS training stack is prepared, but its docs say "nothing runs unless CONFIRM=1". It is
  left out of `stack`.

**Questions for Kirat**
- Keep this as a separate entry from the platform (same honours project), or merge the two?
- Any OCR or HITL-round results to add?

**Media on disk**
- None suitable. **Do not use:** `~/ml-assets/campus/**` (datasets, plate crops, contact
  sheets of real plates) or `research_track/**/fixtures/*` (registry CSVs with plate-format strings).
- Diagrams: the HITL flow at the top of `hitl_anpr/README.md` (mirrored in `pipeline`) and a
  mermaid diagram in `research_track/track_c/SPECIFICATION.md`.

## 4. `growplay-table-tennis-analysis`

**Sources:** `~/growplay/app/main_cv_model/` (docstrings and headers of `run_pipeline.py`,
`blurball_tracker.py`, `pose_estimator.py`, `stroke_classifier.py`, `train_dtw.py`,
`perspective_detector.py`, `table_detector.py`, `table_calibrator.py`, `contact_sync.py`,
`kinetics.py`, `frontend-representation/representation_app.py`), `skills/GROWPLAY_SKILL.md`
(design notes), `train/README_RESUME.md`, `train/blurball/runs/finetune_v1/training_state.json`
(epoch count only), `models/` listing, `final_output/session_analytics.json` (keys only);
`git log` (20 commits, 2026-06-03 → 2026-06-26, all kirat11X; remote `kirat11X/growplay_cv`
→ 404). Also `~/growplay/brd_TT.docx.pdf` (requirements document, created August 2025),
`~/growplay/prompt.pdf` (design brief), `~/growplay/growplaytracker/` (Flutter + Firebase
prototype: `pubspec.yaml`, `lib/` listing), `~/growplay/app/growplay-workspace/` (React
multi-app scaffold) and the public repo `kirat11X/gtta` (file listing only).

| Fact | Source |
| --- | --- |
| Small academies, shortage of qualified coaches | brd_TT.docx.pdf §1–§2 |
| Two branches; VRAM time-slicing on a 6 GB RTX 4050 | run_pipeline.py docstring |
| BlurBall HRNet-48, FP16, three-frame window; fine-tuning started (epoch 36 of about 80) | blurball_tracker.py, training_state.json, README_RESUME |
| Custom-trained YOLOv8x table detector; table 274 × 152.5 cm | table_detector.py, table_calibrator.py |
| RTMPose 133-keypoint whole-body via ONNX Runtime; YOLO racket detector | pose_estimator.py |
| 1D-CNN + DTW cascade with averaged (DBA) templates binned by viewpoint | stroke_classifier.py, train_dtw.py, perspective_detector.py |
| Earlier prototypes: player tracking, tournaments, role dashboards | growplaytracker/lib/screens, growplay-workspace/apps |

**Unverified / caveats**
- No accuracy figure is recorded anywhere, so there are no `results`.
- The stroke-CNN weights folder is empty and only DTW templates exist. The text describes the
  cascade's design, not a trained accuracy.
- `Table_Tennis_Chatbot/` still carries the psychology-mentor prompt, so no working coaching
  assistant is claimed ("intended to feed coaching tools").
- `year` is "2026" (the CV repo's git history). The BRD (August 2025) and the Flutter prototype
  (September–October 2025 file dates, no git) suggest the product effort began in 2025.

**Questions for Kirat**
- Solo, startup or built for a specific academy? Is there a partner that should, or must not, be named?
- Make `growplay_cv` public, or link `kirat11X/gtta` (super-admin dashboard + Stitch designs,
  HTTP 200)? `gtta` is not linked yet because it contains images I did not open
  (`Super_Admin_growplay/src/assets/file.jpg`, `.../profile_avatar.png`,
  `design/profile/image*.png`). Confirm they don't show real people.
- Any ball-detection or stroke-classification accuracy worth reporting?
- Show the year as "2025 – 2026"?

**Media on disk**
- `~/growplay/app/main_cv_model/final_output/*_blurball.mp4`, `*_match_pose.mp4`: annotated
  tracking and pose overlays. Ideal demo media, but they show real players, so use them only
  with consent or blurred.
- `~/growplay/app/main_cv_model/graphify-out/graph.svg`: auto-generated code-dependency graph
  (no personal data). Could inspire an architecture figure.
- `~/growplay/app/stitch_growplay_super_admin_dashboard/admin_login/screen.png`: Stitch UI
  mockup (not opened).
- Not opened, may show people: `Table_Tennis_Chatbot/file.jpg`, `strokes/Bh_flick/Pasted image.png`,
  `test_*.mp4`, `data_tt/**`.

## 5. `failure-synthesis-system`

**Sources:** `~/coding/minor/README.md`, `RESULTS.md` (2026-10-08), `FSS_PROJECT.md`,
`VERIFICATION_REPORT.md` (issue I1), `DEMO.md`, `PROF_EXPLAINER.md`, title page of
`Minor Project_ Failure Synthesis System.pdf` (team of four, CSE third year; names not
reproduced); `git log` (all commits dated 2026-10-09, authored under Kirat's two git
identities; public remote).

| Fact | Source |
| --- | --- |
| Contract, block store, recovery, bounded retrieval, decode statuses | README "Where the hard rules are enforced", FSS_PROJECT §3–§4 |
| 171 Python and 73 Java tests; 6/6 golden fixtures; crash harness 60/60 runs, 1,951,696 acknowledged events, 0 lost, 0 corrupt; 327,681 truncation offsets; 64,816 bit flips (34,816 + 20,000 + 5,000 + 5,000) | RESULTS.md |
| Team of four; "Java event core being written by a teammate" | proposal PDF title page; FSS_PROJECT status table |
| Process crashes only; OS crash and power loss untested | RESULTS.md "Notes" |

**Unverified / caveats**
- FSS_PROJECT.md later reports 509 Python test cases (501 pass, 8 live skipped). The modules
  behind that number (knowledge/RAG, synthesis, LLM client, validator, presentation) "were added
  by the verification runs and await team review" (VERIFICATION_REPORT I1). That figure is not
  quoted, and the LLM layer is called "planned".
- Kirat's share is not stated. The teammate note on the Java core suggests, but does not say,
  that he worked on the Python side.

**Questions for Kirat**
- Which parts did you build (Python decoder and evidence layer, contract, fixtures)? What was your role?
- The public repo contains the proposal and plan PDFs, which list teammates' names and roll
  numbers, and `DEMO.md` contains a cloud server host name. Consider removing them before the
  portfolio sends visitors there.

**Media on disk**
- No screenshots. The text demos in `~/coding/minor/outputs/*.md` (drone and microservice
  scenarios, a caught hallucination) could become a figure.
- The software-engineering lab PDF has DFD/UML diagrams but carries names. Don't publish it as-is.

## 6. `business-entity-resolution`

**Sources:** `~/coding/aws ml challenge/README.md` (problem statement),
`Documentation_template.md` (team write-up), `code/business_entity_resolution/README.md`,
`requirements.txt`, header of `src/blocking.py`; `git log` (5 commits, 2026-09-25 →
2026-09-27, all kirat11X; remote `kirat11X/aws-` → 404).

| Fact | Source |
| --- | --- |
| AWS ML Challenge 2026; macro F0.5; France only in test | code README title; challenge README |
| Team "EntityLinkers", "Kirat & Team" | write-up header |
| 2,206,821 reference entities; ~10.3 M targets; 0 of 7,638,365 targets match two entities; no cross-country matches; a false merge zeroes an entity's score | write-up §2.1, §3 |
| Blocking channels, 19 features, LightGBM with grouped CV, F0.5 threshold search, greedy bipartite exclusivity | write-up §3–§4, code README |
| Validation macro F0.5: 0.7383 / 0.7357 / 0.7420 | write-up §5 |

**Unverified / caveats**
- The write-up is dated 25 September. The later "Round 2–4" commits (27 September: 9- and
  10-channel blocking, transliteration, calibrated thresholds) are not reflected in the score,
  so the channel count is deliberately not stated.
- The write-up's ">98% recall ceiling", ">99.98% pruning" and per-country "≈0.74 / ≈0.65" are
  approximate and not quoted.
- No leaderboard result is recorded.

**Questions for Kirat:** final leaderboard score or rank? Team size and your role (all five
commits are yours)? Make the repo public?

**Media on disk:** none.

## 7. `dashcam-anpr-pipeline`

**Sources:** public repo `kirat11X/VEHICLE_NUMBER_PLATE_DETECTOR_FROM_LIVE_VIDEO` (README,
file tree and commits via the GitHub API; 3 commits on 2026-05-29, all kirat11X). The local
copy its README mentions lives under `~/Documents/` and was not opened.

**Caveats:** the README notes hard-coded absolute paths, so the status is `prototype`. No
metrics are recorded. The repo holds code and YOLO weights only (no media), so it is clean to link.

**Questions:** is it superseded by the honours work? Any results, or a sample output with
plates blurred?

**Media:** none in the repo. Any output frames would show real plates, so blur them.

## 8. `personal-stream`

**Sources:** `~/coding/OS_ANDROID/movie streaming/README.md` (same as the public repo's),
file listing, GitHub commits (2026-08-04; repo created 2026-05-02).

**Caveats:** `status` is omitted. No doc states a deployment; the README has Render
instructions but no live URL. Its "Validation" section lists commands, not results.

**Questions:** deployed anywhere (live demo link)? What status? Was it coursework (it sits under
`OS_ANDROID`)?

**Media:** `~/coding/OS_ANDROID/movie streaming/docs/screenshot-home.jpg`,
`screenshot-browse.jpg`, `screenshot-recommended.jpg`: real UI screenshots, but they show
copyrighted film posters with actors' faces. Re-capture with neutral artwork, or blur the
posters, before using one as the cover.

## 9. `video-clipper`

**Sources:** public repo
`kirat11X/video--clipper-vizard-AI-replica-automatic-short-form-clip-generator-` (README,
`requirements.txt`, file tree, 8 commits on 2025-12-30). No local copy.

**Caveats:** the README's "Current Status" says the core pipeline is complete and platform
presets are pending, so the status is `prototype`. `evaluate_pipeline.py` exists but no results
are recorded. The repo includes transcript and analysis JSON of a third-party video.

**Questions:** an example output clip from footage you own? Any results from `evaluate_pipeline.py`?

**Media:** none. A short rendered clip from Kirat's own footage would suit both halves of the site.

## 10. `dsa-in-cpp`

**Sources:** `~/coding/cpp/DSAcpp/` (38 `.cpp` files in 14 folders: 13 topics with 34 files,
plus `contests/` with 4), `~/coding/cpp/competitive_programming/README.md` and
`template.cpp` (`problems/` is empty). File dates August–December 2025; no git.

**Caveats:** not under version control. Some files look like copies (for example
`doublyLinkedList (1).cpp`). Contest folder names suggest particular platforms, but none is
documented, so the page says "contest solutions".

**Questions:** competitive-programming profiles with ratings to link? Push the folder to
GitHub? Otherwise consider dropping this entry. It is the weakest of the ten and is kept
only so the DSA category isn't empty.

---

## Verified links

Checked with `curl -s -o /dev/null -w '%{http_code}'` on 2026-10-21:

| URL | HTTP | Used in |
| --- | --- | --- |
| https://github.com/kirat11X/Failure-Synthesis-System | 200 | `failure-synthesis-system` |
| https://github.com/kirat11X/VEHICLE_NUMBER_PLATE_DETECTOR_FROM_LIVE_VIDEO | 200 | `dashcam-anpr-pipeline` |
| https://github.com/kirat11X/movies_streaming_personal_stream | 200 | `personal-stream` |
| https://github.com/kirat11X/video--clipper-vizard-AI-replica-automatic-short-form-clip-generator- | 200 | `video-clipper` |

Checked and **not** linked: `kirat11X/CVS-ACS--Campus-Vehicle-Security-Access-Control-System`
(200, but empty), `kirat11X/growplay_cv` (404), `kirat11X/SIH-2026` (404), `kirat11X/aws-`
(404), `Projection-Design-Club/Lumiere` (404), the Hugging Face dataset in the SIH docs (401),
`kirat11X/gtta` (200, images not yet reviewed), `kirat11X/kaggle-competitions` (empty).

## Suggested contribution text (for Kirat to confirm)

From git authorship only. Nothing below is published until Kirat confirms or rewrites it.

- **voice-clone-detection.** The commit history attributes to kirat11X: project setup;
  Module 1 (VAD windowing); Module 2A (AASIST baseline, domain fine-tuning, Platt calibration,
  test benchmarks); Module 2D (XLS-R embeddings); the integrated multi-branch engine with
  backend integration and the dashboard UI; the real-time session controller and recorder;
  the post-call intelligence layer. Modules 2B and 2C were committed by teammates. Possible text:
  - "Built the VAD windowing front end and the AASIST branch: domain fine-tuning, calibration and held-out benchmarks."
  - "Integrated the detection branches with the FastAPI backend, the live dashboard and the real-time call session controller."
  - "Wrote the post-call layer: Whisper transcription and schema-validated transaction extraction."
- **campus-vehicle-security / indian-anpr-research.** All 27 commits are kirat11X's and no
  teammate is mentioned. If solo, `role: 'Sole developer (B.Tech honours project)'`.
- **growplay-table-tennis-analysis.** All 20 CV-repo commits are kirat11X's.
- **business-entity-resolution.** All 5 commits are kirat11X's; the write-up says "Kirat & Team".
- **dashcam-anpr-pipeline, personal-stream, video-clipper.** Single-author repos on Kirat's
  account; probably solo. Confirm before adding `role`.
- **failure-synthesis-system.** Unknown; see questions above.

## Candidates not included

| Candidate | Evidence | Why not included |
| --- | --- | --- |
| ProfitLens (Amex Campus Challenge 2026, Round 1) | `~/coding/amex/README.md`, `profitlens/README.md`, `PROFITLENS_CONTEXT.md`; public repo `kirat11X/Amex-Campus-Challenge` (200) | Strongest alternate: a Streamlit + Gemini analyst with pandas function-calling tools and a FAISS RAG layer over a 500,000-row scored dataset. Left out to keep the list at ten (no recorded outcome). The public repo also contains the challenge dataset, brief and submission workbooks; check the challenge terms before linking. |
| CCTV intelligence search (`kirat11X/cctv-intelligence`, `kirat11X/VIdeo-Analyser`) | Public READMEs: YOLO detection + CLIP embeddings + FAISS natural-language search, Flask UI | Distinct and interesting, but the public `VIdeo-Analyser` repo contains a `cookies.txt` (not opened) and captured CCTV frames plus an event clip, and `cctv-intelligence` has input videos and frames. Clean them up before showcasing. |
| Lumiere 2026 festival site (`~/lumiere/Lumiere`) | README; git: 2 of 4 commits by kirat11X (scroll-driven hero video with lazy loading, expanded home page) | A club team site; Kirat's part is a front-end feature. The repo is private (404). Could fit the creative/UI side instead. |
| Punjabi LangPortal (`~/language_app_genAI`, public `Language-Portal---Dualingo-Copy`) | README.MD, SENIOR_PROJECT_REVIEW.txt | Its own review lists broken flows (front-end/back-end contract mismatches, unwired buttons). Early prototype. |
| RAG psychology mentor (public `RAG-Based-Psychology-Mentor-AI`) | Public README | Less distinct (RAG chatbot); no evaluation recorded. Alternate. |
| SkillForge AI (public repo) | Public README | Hackathon-style prototype; its slides and video live on Google Drive (not verified). Alternate. |
| Android/Capacitor apps: Lumina AI chatbot, e-commerce, expense tracker, Kinetic mental & fitness, music player (`~/coding/OS_ANDROID/*`) | READMEs, git | Small coursework-style apps. Could be grouped into one "mobile apps" entry if wanted. |
| Web exercises: movies review DB, text RPG, social-media dashboard, counter, Chrome extension (`~/coding/webdev/*`) | READMEs | Learning exercises. |
| Deep-learning notebooks, vision notebook, AIML assignments, database assignment, revision sheets | `~/coding/Deep learning`, `~/coding/vision`, `~/coding/AIML`, `~/coding/database`, `~/coding/revision` | Coursework and notes. |
| `SQL_RL_Env`, `iot-project` (public) | No README | Can't be described from evidence. |
| GrowPlay Flutter tracker (`~/growplay/growplaytracker`) | pubspec.yaml, lib/ | Folded into the GrowPlay entry as an earlier prototype. |
| `~/tbrl` | Directory listing and git metadata only | Video-based fragment-tracking work that appears to have been done for an external organisation. Not reviewed further or included; confirm whether it may be shown at all. |

## Unmapped candidate: "intelligent data extraction from business reports"

No project matches this description directly. The closest evidence:
1. The honours project's **delivery-invoice screening** (OCR → line items → policy table →
   totals check), already in `campus-vehicle-security`, plus a staged VLM line-item
   extractor ("Track B", not approved for training) in the research track.
2. **ProfitLens**: a "digest your own files" tab that ingests uploaded documents and
   spreadsheets for retrieval (not included; see above).
3. **Business entity resolution**: matching noisy business records (included).

Kirat should say which one he meant, or point to the project.

## Security and privacy notes for Kirat (outside this site)

- Public repo `kirat11X/VIdeo-Analyser` contains `cookies.txt` (not opened) and captured
  CCTV frames plus an event clip. Remove them, rotate anything the cookies grant access to,
  and consider rewriting history.
- Public repo `kirat11X/cctv-intelligence` includes input videos and captured frames.
- Public repo `kirat11X/Amex-Campus-Challenge` contains the challenge dataset, brief and
  submission files. Check the challenge terms.
- Public repo `kirat11X/Failure-Synthesis-System` contains PDFs listing teammates' names
  and roll numbers, and a cloud host name in `DEMO.md`.
- No key or `.env` files are tracked in the local repos cited here (checked by file name
  with `git ls-files`; contents not opened).

## Contract notes

The current `EngineeringProject` type covered everything. Two optional additions would help:
- `related?: string[]` (slugs), to cross-link `campus-vehicle-security` ↔ `indian-anpr-research`
  and `dashcam-anpr-pipeline`.
- A structured metric type (`{ value, label, context }`) for showing one headline number on
  cards and 3D panels without parsing `results` strings.
