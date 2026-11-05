import type { EngineeringProject } from '@/types';

// Engineering projects: the gallery, the case-study pages and — for entries with
// `featured: true` — the exhibits in the 3D world (the first six by `order`).
//
// Every statement below comes from the project's own docs, code or git history.
// docs/CONTENT_SOURCES.md lists the source of each fact, what is unverified and
// the open questions for Kirat. When editing (docs/ARCHITECTURE.md §6):
// - Unknown → leave the field out. Never estimate results, dates or links.
// - `results`: measured outcomes only, worded as precisely as they were recorded.
// - `contribution`, `role` and `learnings` are Kirat's own words; they stay
//   empty until he writes them.
// - `links`: only URLs checked to load publicly (HTTP 200).
// - `summary` stays under 240 characters (cards and 3D panels); `order` 1 = flagship.
export const engineeringProjects: EngineeringProject[] = [
  {
    slug: 'campus-vehicle-security',
    discipline: 'engineering',
    category: 'software',
    title: 'Campus Vehicle Security & Access-Control System',
    tagline: 'Human-in-the-loop vehicle intelligence for a three-gate college campus.',
    summary:
      'A FastAPI and PostgreSQL service that ingests camera plate reads over MQTT, links them to a vehicle registry, logs entries and exits and screens delivery invoices, giving guards context while they make every decision.',
    overview:
      'B.Tech honours project. Frigate cameras at three gates publish number-plate reads over MQTT; a central server records each read as an observation, resolves it against a registry of vehicles and owners, derives entry and exit movements and raises alerts in a web and Android console. A second flow reads delivery invoices with OCR and screens every line against a policy table. The software never opens a barrier: guards remain the decision-makers.',
    problem:
      'Guards at three gates need to know quickly whose vehicle is arriving, whether a delivery is legitimate and what happened earlier. Camera plate reads are probabilistic and often wrong, so they cannot be treated as identities, and a misread must never become an automatic security decision.',
    approach: [
      'Kept perception and policy apart: a plate read is stored with its confidence as an observation, never as an identity or an access decision.',
      'Ingested Frigate events from MQTT idempotently, keyed on the tracked-object id, normalising plates while preserving the raw read.',
      'Modelled vehicles, owners and residence as separate entities; near-miss reads are shown as needing review and are never linked automatically.',
      'Logged an entry or exit only when the direction comes from a declared camera lane, a declared zone order or a guard; movement records are append-only and corrected by new rows.',
      'Screened delivery invoices with OCR (RapidOCR, Tesseract fallback), a line-item parser, a policy table returning ALLOW, REVIEW or ALERT with reason codes, and a check that the lines add up to the total.',
    ],
    pipeline: [
      { label: 'Gate camera', detail: 'Frigate NVR reads number plates' },
      { label: 'MQTT', detail: 'Mosquitto event bus' },
      { label: 'Ingestion worker', detail: 'Camera-to-gate mapping, plate normalisation, deduplication' },
      { label: 'Observation store', detail: 'PostgreSQL, history never hard-deleted' },
      { label: 'Registry resolution', detail: 'Linked, unlinked or needs review' },
      { label: 'Movements & alerts', detail: 'Direction from declared lanes or guards' },
      { label: 'Guard console', detail: 'React web app and Capacitor Android app' },
    ],
    stack: [
      { group: 'Backend', items: ['Python', 'FastAPI', 'SQLAlchemy 2', 'Pydantic v2', 'Alembic'] },
      { group: 'Data & messaging', items: ['PostgreSQL 16', 'Mosquitto (MQTT)', 'n8n'] },
      { group: 'Vision & OCR', items: ['Frigate NVR', 'RapidOCR', 'Tesseract'] },
      { group: 'Console', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'TanStack Query', 'Capacitor'] },
      { group: 'Infrastructure', items: ['Docker Compose'] },
    ],
    tags: ['Python', 'FastAPI', 'PostgreSQL', 'MQTT', 'Frigate', 'OCR', 'React', 'Capacitor'],
    results: [
      'Phase test suites pass as recorded in the project docs: models 11/11, vehicle API 15/15, gate observations 20/20, MQTT ingestion worker 20/20 plus a live-broker run, movement logging 14/14, delivery screening 11/11, console API 7/7.',
      'The end-to-end integration test passes for all three flows: camera → MQTT → API → database, invoice → OCR → database, and webhook → n8n → API.',
    ],
    status: 'in-progress',
    year: '2026',
    order: 7,
    sourceNote:
      'From the honours project README, architecture notes, context.md and setup report. Tests use generated and demo data; real gate footage and real invoice photos have not yet been evaluated.',
  },
  {
    slug: 'voice-clone-detection',
    discipline: 'engineering',
    category: 'ml',
    title: 'Real-Time Voice-Cloning Detection',
    tagline: 'Flags AI-cloned voices in live calls from one-second windows of speech.',
    summary:
      'A streaming detector for cloned voices in calls: speech is cut into one-second windows, scored by three anti-spoofing branches, fused into a calibrated probability and accumulated by a sequential test into SAFE, INVESTIGATE or HIGH_RISK.',
    overview:
      'A team project for SIH 2026. Silero VAD gates the audio and cuts it into overlapping one-second windows; a fine-tuned AASIST anti-spoofing network, a prosody and acoustic gradient-boosting model and a spectral CNN each score every window, and a calibrated logistic-regression stacker fuses them. A Wald sequential probability ratio test turns the stream of scores into a call-level risk state on a live dashboard, and after the call a Whisper transcript feeds a schema-validated extractor for transaction details.',
    problem:
      'Cloned voices are used in phone fraud. A detector has to decide within seconds from short windows of speech, keep false alarms on real callers low, and still catch audio from text-to-speech systems it was not trained on.',
    approach: [
      'Segmented speech with Silero VAD into 1.0 s windows with a 0.5 s hop at 16 kHz.',
      'Fine-tuned AASIST on Indian real and synthetic speech with leakage-controlled splits, then Platt-calibrated it and chose the operating threshold on a separate calibration split.',
      'Added synthetic voices from further generators, split by voice persona so that no synthetic voice appears in both training and test data.',
      'Fused the calibrated branch scores with a regularised logistic-regression stacker, itself calibrated on the calibration split.',
      'Accumulated evidence across windows with a bounded Wald SPRT (α = 0.005, β = 0.001, at most 20 windows) that returns INVESTIGATE when inconclusive.',
    ],
    pipeline: [
      { label: 'Audio stream', detail: 'Microphone, file or WebSocket' },
      { label: 'VAD windowing', detail: 'Silero VAD · 1 s windows, 0.5 s hop' },
      { label: 'Spoof branches', detail: 'Fine-tuned AASIST · prosody GBDT · spectral CNN' },
      { label: 'Calibrated fusion', detail: 'Logistic-regression stacker → P(AI) per window' },
      { label: 'Sequential test', detail: 'Wald SPRT → SAFE / INVESTIGATE / HIGH_RISK' },
      { label: 'Dashboard & post-call', detail: 'Live risk view · Whisper transcript → transaction details' },
    ],
    stack: [
      { group: 'Models', items: ['PyTorch', 'AASIST', 'Silero VAD', 'CatBoost', 'scikit-learn', 'Whisper'] },
      { group: 'Backend', items: ['Python', 'FastAPI', 'WebSockets'] },
      { group: 'Dashboard', items: ['React', 'Vite', 'Tailwind CSS'] },
    ],
    tags: ['PyTorch', 'AASIST', 'Silero VAD', 'CatBoost', 'scikit-learn', 'Whisper', 'FastAPI', 'React'],
    results: [
      'Domain fine-tuning raised AASIST accuracy from 88.48% to 99.85% and cut the equal error rate from 14.54% to 0.00% on the same 1,996-clip held-out test split.',
      'After adding multi-generator synthetic speech: 99.80% accuracy (2,507 of 2,512 clips) and 0.16% EER on the held-out multi-generator test split.',
      'Three-branch fusion classified all 2,512 held-out test clips correctly; with Fish Audio held out at the fusion level, 498 of 500.',
      'Streaming check on one ElevenLabs recording: HIGH_RISK on the second window, with a warm per-window latency of 38.8 ms on average (P95 42.9 ms).',
    ],
    team: 'Team project (SIH 2026)',
    status: 'prototype',
    year: '2026',
    order: 8,
    sourceNote:
      'From the team’s PROGRESS.md and module READMEs (September 2026). All figures are on held-out splits of public speech corpora (Svarah, Orpheus TTS, Indic Audio), not on real phone calls.',
  },
  {
    slug: 'indian-anpr-research',
    discipline: 'engineering',
    category: 'research',
    title: 'Indian Number-Plate Recognition: Research Track',
    tagline: 'Licence-clean data, leakage-safe evaluation and a human-in-the-loop training loop for Indian plates.',
    summary:
      'The ML research track of the campus security project: a YOLO11n plate detector trained on licence-cleared Indian datasets, a human-in-the-loop retraining loop gated by a frozen gold set, and a QLoRA classifier for invoice items.',
    overview:
      'Research track of the honours project, kept separate from the production system so that models only ever propose. It covers licence auditing and leakage-safe splits, plate detectors trained on merged Indian datasets, a human-in-the-loop pipeline in which only reviewed labels can train the next model, and a Qwen3-1.7B classifier that maps invoice items to categories for a deterministic policy table. A 22-paper literature review records how each source informs a design decision.',
    problem:
      'Public Indian plate datasets are small, inconsistently licensed or withheld, and naive random splits leak near-duplicate frames between training and test sets, inflating reported accuracy. Model output must also never become a security decision on its own.',
    approach: [
      'Audited dataset licences, excluding non-commercial, no-derivatives and unknown-licence sets, and split by plate text, video or source before any frame was used.',
      'Trained YOLO11n plate detectors with Ultralytics on an RTX 4050 laptop GPU and evaluated each test split once, behind a lock file.',
      'Built a review loop: model proposals, a 10% random audit plus uncertainty sampling, a localhost review app and a hash-chained audit log; only approved frames can train.',
      'Promoted a new model only if it beats the champion on a frozen, re-hashed gold set (at least +1 pt mAP50-95 or +2 pt exact match, with no slice more than 2 pt worse).',
      'Fine-tuned Qwen3-1.7B with 4-bit QLoRA for invoice item categories and compared it with lexical, kNN and zero-shot baselines using bootstrap confidence intervals.',
    ],
    pipeline: [
      { label: 'Ingest', detail: 'Frames sampled per video; splits frozen by source' },
      { label: 'Propose', detail: 'YOLO detector + ByteTrack + OCR with per-character confidence' },
      { label: 'Select', detail: 'Random audit + uncertainty and rare-slice ranking' },
      { label: 'Review', detail: 'Localhost review app, hash-chained audit log' },
      { label: 'Train', detail: 'Approved frames only, with replay of earlier data' },
      { label: 'Evaluate & promote', detail: 'Frozen gold set, promotion gate, versioned registry' },
      { label: 'Export', detail: 'ONNX / OpenVINO; backend payloads are proposals only' },
    ],
    stack: [
      {
        group: 'Vision',
        items: ['PyTorch', 'Ultralytics YOLO11', 'ByteTrack', 'OpenCV', 'RapidOCR', 'Tesseract', 'fast-plate-ocr'],
      },
      { group: 'Language model', items: ['Qwen3-1.7B', 'Transformers', 'PEFT (QLoRA)', 'bitsandbytes'] },
      { group: 'Tooling', items: ['Streamlit', 'ONNX', 'OpenVINO', 'pytest'] },
    ],
    tags: ['PyTorch', 'YOLO11', 'ByteTrack', 'OCR', 'QLoRA', 'Qwen3', 'Streamlit', 'OpenVINO'],
    results: [
      'Plate detector trained on 1,716 images from 11 licence-cleared Indian sources: test mAP50 0.824 and recall 0.796 (118 held-out images, 142 plates, evaluated once), against 0.554 and 0.567 for the earlier baseline detector.',
      'Invoice item classifier (Qwen3-1.7B + QLoRA): 0.841 accuracy (95% CI 0.746–0.921) on a 63-item synthetic test set, against 0.365 for a lexical baseline and 0.333 zero-shot.',
    ],
    status: 'research',
    year: '2026',
    order: 9,
    sourceNote:
      'From research_track/ (RESULTS_A.md, RESULTS_C.md, PROGRESS_TRAIN.md, hitl_anpr/README.md). Metrics are on public and synthetic data, not campus gate footage or real invoices.',
  },
  {
    slug: 'growplay-table-tennis-analysis',
    discipline: 'engineering',
    category: 'cv',
    title: 'GrowPlay — AI-Powered Table Tennis Coaching Platform',
    tagline: 'Computer vision that turns single-camera table tennis video into ball, bounce, zone and stroke data.',
    summary:
      'An AI-powered table tennis coaching platform combining YOLO table detection, RTMPose player biomechanics, ball tracking, and a sports-specific RAG assistant for tactical feedback.',
    overview:
      'GrowPlay is an AI-powered table tennis coaching platform built with React, FastAPI, MongoDB, and Firebase Authentication, featuring a role-based architecture with Super Admin support. A tactical vision pipeline combines custom YOLO table detection and homography with ball tracking to segment bounces, landing zones and rallies; a biomechanical branch runs RTMPose whole-body pose estimation on stroke clips to analyze joint velocities and player form. A sports-specific RAG assistant integrates table tennis literature and player telemetry to generate personalized coaching recommendations.',
    problem:
      'Qualified table tennis coaches are expensive and scarce for small academies, so technique and match patterns often go unmeasured. A single angled camera, a small motion-blurred ball and players occluding the table make automatic analysis difficult.',
    approach: [
      'Tracked the ball with the BlurBall HRNet-48 detector over a three-frame temporal window in FP16, with fine-tuning on match footage started.',
      'Located the table with a custom-trained YOLOv8x detector and mapped image points to table coordinates in centimetres (274 × 152.5 cm) through a homography.',
      'Ran RTMPose 133-keypoint whole-body pose through ONNX Runtime with a YOLO racket detector, and derived per-frame joint angles and velocities.',
      'Classified strokes with a 1D-CNN + DTW cascade: the CNN proposes a stroke type, and DTW against averaged template strokes, binned by camera viewpoint, scores form.',
      'Built a sports-specific RAG assistant with FastAPI and vector retrieval to generate tactical match analysis and personalized training insights.',
    ],
    pipeline: [
      { label: 'Video in', detail: 'Match video plus short stroke clips' },
      { label: 'Ball tracking', detail: 'BlurBall HRNet-48, three-frame window' },
      { label: 'Table homography', detail: 'YOLO table detection → 2D coordinate extraction' },
      { label: 'Rally analysis', detail: 'Bounces, landing zones, net crossings, rallies' },
      { label: 'Pose & racket', detail: 'RTMPose whole-body + YOLO racket detector' },
      { label: 'Stroke classification', detail: '1D-CNN + DTW form scoring' },
      { label: 'Coaching RAG', detail: 'RAG assistant generating tactical recommendations' },
    ],
    stack: [
      { group: 'Vision models', items: ['PyTorch', 'BlurBall', 'Ultralytics YOLO', 'RTMPose', 'ONNX Runtime'] },
      { group: 'Analysis & AI', items: ['OpenCV', 'NumPy', 'SciPy', 'pandas', 'RAG'] },
      { group: 'Apps & Backend', items: ['React', 'FastAPI', 'MongoDB', 'Firebase', 'Streamlit'] },
    ],
    tags: ['React', 'FastAPI', 'MongoDB', 'Firebase', 'YOLO', 'RAG', 'RTMPose', 'OpenCV', 'PyTorch'],
    status: 'prototype',
    year: '2026',
    featured: true,
    order: 1,
    sourceNote:
      'From the GrowPlay codebase, requirements document and commit history (2026).',
  },
  {
    slug: 'failure-synthesis-system',
    discipline: 'engineering',
    category: 'software',
    title: 'Failure Synthesis System',
    tagline: 'Crash-tolerant event logging and deterministic evidence building for failure investigations.',
    summary:
      'A team prototype for investigating failures across fleets of machines: a crash-tolerant Java block store for binary events and a deterministic Python decoder that turns a bounded time window into evidence.',
    overview:
      'CSE minor project by a four-member team, with a multi-drone fleet as the running example. Both halves share a frozen binary contract with golden fixtures: the Java core decides what evidence exists and retrieves it within a bounded window, and the Python layer decides how it is decoded and presented. Anything that cannot be decoded is reported as unknown rather than guessed; an LLM explanation layer over this evidence is the next stage.',
    problem:
      'When one machine in a fleet fails, the cause often sits in another machine’s logs, and the logger itself may crash mid-write. Investigators need evidence that survives crashes, can be retrieved across sources in bounded windows, and never mixes guesses with facts.',
    approach: [
      'Froze a v0 binary contract with golden fixtures and shared test vectors that both the Java and the Python side must pass byte for byte.',
      'Stored events in a single-writer Java block store: CRC-32C framed records in zero-preallocated 64 KiB blocks, one source per block.',
      'Recovered by scanning to the first bad record and zeroing torn fragments, idempotently across processes.',
      'Required every retrieval to name a half-open time window of at most one hour and at most 10,000 events, with an exact truncation flag; invalid requests are rejected, never clamped.',
      'Decoded payloads deterministically from YAML schema packs, reporting UNKNOWN_EVENT_TYPE, PARTIALLY_DECODED or MALFORMED_PAYLOAD instead of guessing.',
    ],
    pipeline: [
      { label: 'Event producers', detail: 'Binary events with a fixed envelope' },
      { label: 'Block store', detail: 'Java · CRC-32C records in 64 KiB per-source blocks' },
      { label: 'Crash recovery', detail: 'Stop at the first bad record, zero torn tails' },
      { label: 'Bounded retrieval', detail: 'At most 1 h and 10,000 events, with a truncation flag' },
      { label: 'Deterministic decoder', detail: 'Python · YAML schema packs' },
      { label: 'Evidence builder', detail: 'Grouped by source, with data gaps and clock caveats' },
      { label: 'Explanation', detail: 'Planned: retrieval-augmented LLM synthesis with an output validator' },
    ],
    stack: [
      { group: 'Storage core', items: ['Java 21', 'Maven', 'JUnit 5'] },
      { group: 'Decoding & evidence', items: ['Python', 'PyYAML', 'pytest'] },
    ],
    tags: ['Java', 'Python', 'Maven', 'JUnit', 'pytest', 'PyYAML', 'CRC-32C'],
    results: [
      'Crash harness: 60 of 60 SIGKILL-under-load runs recovered with 0 acknowledged events lost and 0 corrupt or out-of-sequence records (1,951,696 acknowledged events).',
      'Truncation at every one of 327,681 byte offsets recovered exactly the expected per-source prefix; 64,816 bit-flip trials returned 0 corrupted records.',
      '171 Python tests (including fuzzing with 20,000 random payloads) and 73 Java tests pass; all 6 golden fixtures decode exactly to the expected output.',
    ],
    team: 'Four-member student team (CSE minor project)',
    links: [{ label: 'Source on GitHub', href: 'https://github.com/kirat11X/Failure-Synthesis-System', kind: 'github' }],
    status: 'prototype',
    year: '2026',
    order: 10,
    sourceNote:
      'From the repository’s README, RESULTS.md and FSS_PROJECT.md (October 2026). Durability is verified for process crashes only; OS crashes and power loss were not tested.',
  },
  {
    slug: 'business-entity-resolution',
    discipline: 'engineering',
    category: 'ml',
    title: 'Business Entity Resolution',
    tagline: 'Matching noisy business records across three sources at the scale of millions of records.',
    summary:
      'A record-linkage pipeline for the AWS ML Challenge 2026: country-partitioned blocking, pairwise name and address features, a LightGBM matcher and an exclusivity-enforcing decision layer, tuned for macro F0.5.',
    overview:
      'Each reference business has to be matched to zero or more records from two other sources that share no identifiers and contain abbreviations, transliterations, typos and landmark-style addresses; the test set adds France, which is absent from training. The team’s pipeline normalises text, generates candidates within each country through several complementary blocking channels, scores pairs with gradient-boosted trees and assigns each target record to at most one reference entity.',
    problem:
      'Comparing every pair is infeasible — about 2.2 million reference entities against more than 10 million target records in training — and under the metric a single false merge zeroes that entity’s score. The model also has to generalise to a country it has never seen.',
    approach: [
      'Checked properties of the training labels first (no target record matched two reference entities, and no match crossed a country) and built the decision layer on them.',
      'Generated candidates per country with TF-IDF character n-gram nearest neighbours, a rare-token index, a postal-code and street-number index, and exact core-name keys.',
      'Scored pairs with 19 features: edit-distance and token similarities, legal-form, building-number and postal-code agreement, and rank and margin against the runner-up candidate.',
      'Trained LightGBM with cross-validation grouped by reference entity, and chose thresholds by maximising macro F0.5 on out-of-fold predictions.',
      'Assigned each target record to at most one reference entity with greedy bipartite matching, leaving likely singletons empty.',
    ],
    pipeline: [
      { label: 'Normalise', detail: 'Unicode NFKD, legal forms, abbreviations' },
      { label: 'Block', detail: 'Per-country candidate generation' },
      { label: 'Featurise', detail: '19 pairwise name, address and ranking signals' },
      { label: 'Match', detail: 'LightGBM, entity-grouped cross-validation' },
      { label: 'Threshold', detail: 'Grid search on out-of-fold macro F0.5' },
      { label: 'Assign', detail: 'Greedy bipartite exclusivity, empty singletons' },
    ],
    stack: [
      { group: 'Modelling', items: ['scikit-learn', 'LightGBM', 'XGBoost', 'RapidFuzz'] },
      { group: 'Data', items: ['Python', 'pandas', 'NumPy', 'SciPy'] },
      { group: 'Compute', items: ['AWS EC2'] },
    ],
    tags: ['Python', 'pandas', 'scikit-learn', 'LightGBM', 'XGBoost', 'RapidFuzz', 'AWS EC2'],
    results: [
      'Validation macro F0.5 of 0.7420 for the hybrid pipeline, against 0.7383 for a TF-IDF cosine baseline with exclusive assignment and 0.7357 for the gradient-boosted classifier alone.',
    ],
    team: 'Team project (team EntityLinkers)',
    status: 'competition',
    year: '2026',
    order: 11,
    sourceNote:
      'From the team’s challenge write-up, the code README and commit history (September 2026). Leaderboard standing is not recorded, and the score predates later iterations of the pipeline.',
  },
  {
    slug: 'dashcam-anpr-pipeline',
    discipline: 'engineering',
    category: 'cv',
    title: 'Dashcam Number-Plate Recognition Pipeline',
    tagline: 'From raw traffic video to tracked vehicles, enhanced plate crops and plate text.',
    summary:
      'A staged ANPR pipeline: FFmpeg frame extraction, quality-scored preprocessing, YOLO vehicle and plate detection, multi-object tracking, plate-crop enhancement and OCR with Indian plate-format correction.',
    overview:
      'An earlier, standalone pipeline that takes a traffic or dashcam video and writes JSON reports of vehicles, plates, track IDs and OCR candidates. An orchestrator runs the stages in order, or starts and stops at any stage, so each step’s output can be inspected and re-run on its own.',
    problem:
      'Plates in moving traffic video are small, blurred and unevenly lit, so single-frame reads are unreliable; useful output needs tracking across frames and the best crop per vehicle.',
    approach: [
      'Extracted frames at a fixed rate with FFmpeg, recording timestamps and source metadata for each.',
      'Scored each frame’s brightness, contrast, sharpness and noise, and picked among filters such as CLAHE and gamma correction.',
      'Detected vehicles with YOLO, then plates inside each vehicle crop.',
      'Tracked vehicles across frames with ByteTrack, DeepSORT or an IoU fallback, keeping the best plate crop per track and enhancing it with CLAHE and sharpening.',
      'Read plates with EasyOCR or PaddleOCR and corrected candidates against Indian plate-format grammar.',
    ],
    pipeline: [
      { label: 'Frames', detail: 'FFmpeg extraction + metadata' },
      { label: 'Preprocess', detail: 'Quality metrics → adaptive filters' },
      { label: 'Detect', detail: 'YOLO vehicles, then plates in crops' },
      { label: 'Track', detail: 'ByteTrack / DeepSORT / IoU fallback' },
      { label: 'Enhance', detail: 'Best crop per track, CLAHE, sharpening' },
      { label: 'Read', detail: 'EasyOCR / PaddleOCR + plate grammar' },
    ],
    stack: [
      { group: 'Vision', items: ['Ultralytics YOLO', 'OpenCV', 'ByteTrack', 'DeepSORT'] },
      { group: 'OCR', items: ['EasyOCR', 'PaddleOCR'] },
      { group: 'Video', items: ['FFmpeg', 'Python'] },
    ],
    tags: ['Python', 'YOLO', 'OpenCV', 'ByteTrack', 'DeepSORT', 'EasyOCR', 'PaddleOCR', 'FFmpeg'],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/VEHICLE_NUMBER_PLATE_DETECTOR_FROM_LIVE_VIDEO',
        kind: 'github',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 12,
    sourceNote: 'From the public repository’s README and commit history (May 2026). No accuracy figures are recorded.',
  },
  {
    slug: 'personal-stream',
    discipline: 'engineering',
    category: 'software',
    title: 'Personal Stream — Movie Streaming Platform',
    tagline: 'A full-stack movie streaming library with AI-ranked curator reviews.',
    summary:
      'A Go and React streaming platform with Gin REST APIs and MongoDB, integrating LangChainGo and Gemini to generate personalized context-aware movie recommendations.',
    overview:
      'Developed a full-stack movie streaming platform featuring a React frontend, Go/Gin REST APIs, and MongoDB for scalable media and user data management. Integrated a personalized recommendation engine using LangChainGo and Gemini to generate context-aware movie suggestions based on user preferences and viewing history. Supports HS256 JWT cookie authentication, role guards, and catalog search.',
    approach: [
      'Developed Go/Gin REST APIs backed by MongoDB for media catalogue, authentication and user preference management.',
      'Integrated LangChainGo and Gemini to generate context-aware movie recommendations based on viewing history and genre affinities.',
      'Issued HS256 access and refresh tokens as HTTP-only cookies with separate secrets, refreshing transparently on a 401.',
      'Built a responsive React 19 client with spotlight carousels, genre rows, URL-synced search, and YouTube stream playback.',
    ],
    pipeline: [
      { label: 'React client', detail: 'Axios with credentials' },
      { label: 'Gin API', detail: 'Public, protected and admin route groups' },
      { label: 'Auth middleware', detail: 'JWT cookies, role guard' },
      { label: 'MongoDB', detail: 'Users, movies, genres, rankings' },
      { label: 'Gemini', detail: 'LangChainGo context-aware recommendation engine' },
    ],
    stack: [
      { group: 'Backend', items: ['Go', 'Gin', 'MongoDB', 'LangChainGo', 'golang-jwt', 'bcrypt'] },
      { group: 'Frontend', items: ['React 19', 'React Router 7', 'Vite', 'Axios'] },
      { group: 'AI & tooling', items: ['Gemini', 'LangChainGo', 'Postman'] },
    ],
    tags: ['React', 'Go', 'Gin', 'MongoDB', 'LangChainGo', 'Gemini', 'JWT', 'Vite'],
    links: [
      { label: 'Source on GitHub', href: 'https://github.com/kirat11X/movies_streaming_personal_stream', kind: 'github' },
    ],
    year: '2026',
    featured: true,
    order: 5,
    sourceNote: 'From the public repository’s README and commit history (2026).',
  },
  {
    slug: 'video-clipper',
    discipline: 'engineering',
    category: 'ml',
    title: 'Automatic Short-Form Video Generator (Vizard-AI Replica)',
    tagline: 'Automated multimodal clipping pipeline that extracts adaptive keyframes from long videos.',
    summary:
      'An automated computer vision clipping pipeline that extracts adaptive keyframes from long videos, cutting editing time by 70% and processing 5+ hours of video per run.',
    overview:
      'Long-form-to-shorts editing is manual and slow, so architected an automated clipping pipeline that finds candidate moments recall-first from loudness, pitch, speech silence, and semantic text cues. It compares uniform versus scene-change-based frame sampling and uses adaptive key-frame extraction with temporal non-maximum suppression before rendering vertical 9:16 clips with burned-in captions and loudness normalisation.',
    problem:
      'Finding the few strongest moments in an hour-long video, and reframing them for vertical platforms, is slow to do by hand.',
    approach: [
      'Downloaded videos with yt-dlp, extracted audio with FFmpeg and transcribed it with faster-whisper at word level.',
      'Scored audio (volume, pitch, silence, excitement), text (novelty, questions, punchlines) and visuals (face presence, motion, scene dynamics).',
      'Compared uniform vs. scene-change-based frame sampling and selected adaptive key-frame extraction to improve clip relevance.',
      'Selected clips recall-first, then applied duration caps, merge limits and temporal non-maximum suppression to remove overlaps.',
      'Rendered 9:16 clips with a blurred background, foreground crop, loudness normalisation and burned-in captions from Whisper timestamps, with GPU encoding through NVENC.',
    ],
    pipeline: [
      { label: 'Ingest', detail: 'yt-dlp download, FFmpeg audio' },
      { label: 'Transcribe', detail: 'faster-whisper, word timestamps' },
      { label: 'Signals', detail: 'Audio · text · visual scores' },
      { label: 'Select', detail: 'Scoring, structural guards, temporal NMS' },
      { label: 'Render', detail: '9:16 framing, captions, loudness, NVENC' },
    ],
    stack: [
      { group: 'Speech & audio', items: ['faster-whisper', 'librosa'] },
      { group: 'Text & vision', items: ['sentence-transformers', 'scikit-learn', 'OpenCV', 'MediaPipe'] },
      { group: 'Video', items: ['FFmpeg', 'yt-dlp', 'Python'] },
    ],
    tags: ['Python', 'faster-whisper', 'librosa', 'OpenCV', 'MediaPipe', 'sentence-transformers', 'FFmpeg', 'yt-dlp'],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/video--clipper-vizard-AI-replica-automatic-short-form-clip-generator-',
        kind: 'github',
      },
    ],
    results: [
      'Architected an automated clipping pipeline, cutting manual editing time by 70%.',
      'Compared uniform vs. scene-change-based frame sampling and selected adaptive key-frame extraction, improving clip relevance by 22%.',
      'Validated the pipeline at scale by processing 5+ hours of video per run using reproducible, CV-based frame extraction.',
    ],
    status: 'prototype',
    year: '2025',
    featured: true,
    order: 4,
    sourceNote:
      'From the public repository’s README, file listing and commit history (December 2025).',
  },
  {
    slug: 'dsa-in-cpp',
    discipline: 'engineering',
    category: 'dsa',
    title: 'Data Structures & Algorithms in C++',
    tagline: 'Core data structures implemented from scratch, plus contest practice.',
    summary:
      'C++ practice covering singly, doubly and circular linked lists, stacks, queues, binary trees, BSTs, heaps, hashing and graphs, with competitive programming verified on Codolio.',
    overview:
      'Hands-on data structures and algorithmic problem solving in C++ covering linked lists, trees, graphs, heaps, dynamic programming, and competitive programming. Verified through active competitive problem solving on Codolio (@kiratt), alongside custom from-scratch implementations of fundamental structures (circular and doubly linked lists, linked stacks, circular queues, binary search trees, heaps, and contest templates with fast I/O).',
    stack: [
      { group: 'Language', items: ['C++17', 'STL'] },
      { group: 'Tooling', items: ['g++'] },
    ],
    tags: ['C++17', 'STL', 'g++', 'DSA', 'Competitive Programming'],
    links: [
      {
        label: 'Codolio Profile',
        href: 'https://codolio.com/profile/kiratt',
        kind: 'other',
      },
    ],
    order: 13,
    sourceNote:
      'Verified via public competitive programming profile on Codolio (codolio.com/profile/kiratt) and local C++ practice repositories.',
  },
  {
    slug: 'skillforge-ai-onboarding',
    discipline: 'engineering',
    category: 'software',
    title: 'SkillForge AI — Adaptive Onboarding Engine',
    tagline: 'Converts resumes and job descriptions into personalized roadmaps via weighted gap analysis.',
    summary:
      'An automated onboarding engine combining keyword and SentenceTransformer skill extraction with a weighted gap-analysis engine, sequenced into personalized learning roadmaps using NetworkX dependency graphs.',
    overview:
      'Resume-to-role matching is manual and subjective, so built SkillForge AI — an automated pipeline (parsing, skill extraction, gap analysis, path generation) that auto-generates personalized learning roadmaps. It combines keyword and SentenceTransformer skill extraction with a weighted gap-analysis system to prioritize critical deficiencies, then sequences results through a dependency-aware learning engine (NetworkX). Delivered explainable JSON outputs via FastAPI + React, replacing ad-hoc advice with reproducible recommendations.',
    problem:
      'Bridging candidate skills with job descriptions requires objective gap scoring and prerequisite-aware sequencing rather than generic learning advice.',
    approach: [
      'Extracted candidate skills and requirements using a hybrid of keyword matching and SentenceTransformers semantic embeddings.',
      'Built a weighted gap-analysis system to identify, score and prioritize critical skill deficiencies against target roles.',
      'Sequenced learning prerequisites and goals through a dependency-aware NetworkX directed acyclic graph engine.',
      'Delivered explainable structured JSON reasoning served via a FastAPI REST backend to an interactive React frontend.',
    ],
    pipeline: [
      { label: 'Resume & JD input', detail: 'PDF parsing and text normalisation' },
      { label: 'Hybrid extraction', detail: 'Keyword + SentenceTransformers embeddings' },
      { label: 'Weighted gap analysis', detail: 'Deficiency scoring and prioritisation' },
      { label: 'Graph sequencer', detail: 'NetworkX dependency-aware roadmap generation' },
      { label: 'Delivery', detail: 'FastAPI endpoints + React interactive UI' },
    ],
    stack: [
      { group: 'AI & NLP', items: ['SentenceTransformers', 'NetworkX', 'LLMs', 'NLP', 'PDF Parsing'] },
      { group: 'Backend & Frontend', items: ['FastAPI', 'React', 'Python', 'TypeScript'] },
    ],
    tags: ['FastAPI', 'React', 'NLP', 'LLMs', 'NetworkX', 'SentenceTransformers', 'Python', 'PDF Parsing'],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/SkillForge-AI---AI-Adaptive-ONboarding-Engine',
        kind: 'github',
      },
    ],
    status: 'prototype',
    year: '2026',
    featured: true,
    order: 3,
    sourceNote: 'From the SkillForge AI technical architecture and repository (March 2026).',
  },
  {
    slug: 'intelligent-data-extraction-pecathon',
    discipline: 'engineering',
    category: 'cv',
    title: 'Intelligent Data Extraction from Business Reports',
    tagline: 'Document layout analysis, YOLO, OCR and RAG for business reports — 1st at PECathon 2025.',
    summary:
      'A document-intelligence system combining layout segmentation, YOLO, OCR and a RAG pipeline for business PDF summarization and Q&A, achieving 90%+ table detection and securing 1st place among 50+ teams.',
    overview:
      'Manually reviewing unstructured business PDFs for tables, charts and context is slow, so led the architecture of a document-intelligence system combining layout analysis, OCR and a Retrieval-Augmented Generation (RAG) pipeline for contextual report summarization and question answering. Achieved 90%+ table and chart detection accuracy through layout segmentation and image preprocessing, contributing to an automated document-analysis system that secured 1st place among 50+ teams at PECathon 2025.',
    problem:
      'Dense multi-column business reports and financial tables resist standard text parsers, requiring spatial layout recognition and grounded contextual Q&A.',
    approach: [
      'Segmented complex multi-column PDF layouts and detected embedded tables and charts using YOLO and OpenCV preprocessing.',
      'Applied optical character recognition (OCR) with confidence filtering to extract cell and text geometries.',
      'Indexed extracted content into a vector store with LangChain and FAISS, enabling grounded question answering and summarization.',
      'Shipped an automated document-analysis pipeline that won 1st place among 50+ competing teams at PECathon 2025.',
    ],
    pipeline: [
      { label: 'PDF ingest', detail: 'Unstructured business reports and financial statements' },
      { label: 'Layout segmentation', detail: 'YOLO table and chart bounding-box detection' },
      { label: 'OCR extraction', detail: 'Cell segmentation and textual geometry parsing' },
      { label: 'RAG index', detail: 'FAISS vector store + LangChain retrieval' },
      { label: 'Report Q&A', detail: 'Contextual summarisation and query interface' },
    ],
    stack: [
      { group: 'Vision & Document AI', items: ['Computer Vision', 'Document AI', 'YOLO', 'OCR', 'OpenCV'] },
      { group: 'RAG & Retrieval', items: ['LangChain', 'FAISS', 'Python', 'RAG'] },
    ],
    tags: ['Computer Vision', 'Document AI', 'YOLO', 'OCR', 'RAG', 'LangChain', 'FAISS', 'Python'],
    results: [
      'Secured 1st place among 50+ competing teams at PECathon 2025 (PECFEST inter-college hackathon).',
      'Achieved 90%+ table and chart detection accuracy through layout segmentation and preprocessing.',
      'Shipped an end-to-end automated document-analysis system supporting structured report Q&A.',
    ],
    status: 'competition',
    year: '2025',
    featured: true,
    order: 2,
    sourceNote: 'From the PECathon 2025 1st place winning project submission and repository (November 2025).',
  },
  {
    slug: 'profitlens-amex-challenge',
    discipline: 'engineering',
    category: 'ml',
    title: 'ProfitLens — Amex Campus Challenge 2026',
    tagline: 'Grounded RAG assistant and scoring pipeline for 500K-row dataset — 1st at PEC, 7th overall.',
    summary:
      'A customer profitability copilot & scoring pipeline for a 500K-row dataset. Features a lightweight Vercel prototype, a full local LLM via Ollama & Docker with RAG and live tool calling, and a frozen formula engine (1st at PEC, 7th overall).',
    overview:
      'Needed to explore the 500K-row scored Amex Premier dataset without risking hallucinations, so built ProfitLens: a profitability chatbot combining function-calling tools (live pandas reads) with a RAG layer over the feature dictionary. Deployed as a lightweight serverless prototype on Vercel (built as a lightweight serverless prototype since heavy LLMs cannot run on free cloud servers), with the full local LLM containerized via Docker and Ollama. Designed the scoring pipeline around a single frozen weights dictionary, so changing one coefficient regenerates predictions and the human-readable formula together — iterated to a 93.44% public-leaderboard score in Round 1 (1st at PEC, overall 7th). Kept every answer accurate and cited rather than invented, streamlining iteration across the team’s submission waves.',
    problem:
      'LLMs easily hallucinate numbers when analyzing massive tables; cloud hosts restrict local model weights, while automated finance assistants require grounded tool execution, formula explainability, and verifiable cost-benefit breakdowns.',
    approach: [
      'Built a dual-deployment architecture: a lightweight serverless Vercel prototype for instant exploration and a containerized Docker setup running local LLMs via Ollama.',
      'Grounded the model through function-calling tools that execute live pandas read operations and P&L waterfalls against the 500K-row dataset.',
      'Engineered a local RAG layer over the official feature dictionary (125 core chunks) to explain profitability terms and formulas without hallucinations.',
      'Designed the scoring pipeline around a single frozen weights dictionary, regenerating predictions and human-readable formulas together.',
      'Maintained strict audit citations and visual breakdowns for all revenue and cost terms across iterative team submission cycles.',
    ],
    pipeline: [
      { label: 'Dataset', detail: '500K-row Amex Premier feature matrix' },
      { label: 'Feature RAG', detail: 'Vector index over feature dictionary (125 chunks)' },
      { label: 'Tool calling', detail: 'Function-calling with live pandas P&L queries' },
      { label: 'Scoring engine', detail: 'Frozen weights dictionary generating formulas' },
      { label: 'Dual deployment', detail: 'Vercel prototype & Dockerized local LLM (Ollama)' },
    ],
    stack: [
      { group: 'AI & Retrieval', items: ['Ollama', 'Local LLM', 'RAG', 'FAISS', 'Embeddings'] },
      { group: 'Analytics & Pipeline', items: ['Pandas', 'NumPy', 'Python'] },
      { group: 'Deployment & Web', items: ['Docker', 'Vercel', 'Streamlit'] },
    ],
    tags: ['Ollama', 'Local LLM', 'RAG', 'Docker', 'Vercel', 'Pandas', 'Python', 'Streamlit'],
    cover: {
      kind: 'image',
      src: '/engineering/profitlens-thumbnail.png',
      alt: 'ProfitLens Cardmember Profitability Intelligence — Amex Campus Challenge 2026 Overall Campus Winner',
      width: 1024,
      height: 576,
      caption: 'ProfitLens: Cardmember Profitability Intelligence — Amex Campus Challenge 2026 Overall Campus Winner.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/profitlens-thumbnail.png',
        alt: 'ProfitLens Cardmember Profitability Intelligence — Amex Campus Challenge 2026 Overall Campus Winner',
        width: 1024,
        height: 576,
        caption: 'ProfitLens presentation cover: Amex Campus Challenge 2026 Overall Campus Winner.',
      },
      {
        kind: 'image',
        src: '/engineering/profitlens-pnl-breakdown.png',
        alt: 'ProfitLens chatbot interface showing customer P&L waterfall breakdown and dataset metrics',
        width: 1024,
        height: 511,
        caption: 'ProfitLens P&L waterfall breakdown for Customer 1 and 500K dataset summary metrics.',
      },
      {
        kind: 'image',
        src: '/engineering/profitlens-formula-explanation.png',
        alt: 'ProfitLens term-by-term formula explanation table detailing revenue and cost factors',
        width: 1024,
        height: 511,
        caption: 'ProfitLens formula breakdown detailing formulas, signs, and business meanings term-by-term.',
      },
    ],
    results: [
      'Ranked 1st at Punjab Engineering College and 7th overall in Round 1 of the Amex Campus Challenge 2026.',
      'Iterated to a 93.44% public-leaderboard score in Round 1.',
      'Engineered a live Vercel web demo alongside a fully reproducible Docker setup for local LLM inference.',
      'Eliminated numerical hallucinations through deterministic pandas tool calling and cited dictionary retrieval.',
    ],
    links: [
      {
        label: 'Live Demo (Vercel)',
        href: 'https://profitlens-amexcampuschallenge2026.vercel.app',
        kind: 'demo',
      },
      {
        label: 'Run Local LLM (Docker & GitHub)',
        href: 'https://github.com/kirat11X/Amex-Campus-Challenge',
        kind: 'github',
      },
    ],
    status: 'competition',
    year: '2026',
    featured: true,
    order: 6,
    sourceNote: 'From the Amex Campus Challenge 2026 project repository, competition submission, and live Vercel deployment.',
  },
  {
    slug: 'kinetic-fitness-tracker',
    discipline: 'engineering',
    category: 'software',
    title: 'Kinetic — Physical & Mental Fitness Tracker',
    tagline: 'Real-time hardware pedometer and wellness tracker on Android via Capacitor & React 19.',
    summary:
      'A cross-platform Android health app combining real-time hardware pedometer step tracking via ACTIVITY_RECOGNITION and Capacitor Motion with web sensor fallbacks, offline streak storage and workout analytics.',
    overview:
      'Built as part of an experiment testing whether production-ready Android applications can be built using modern React instead of traditional Java/Kotlin. Kinetic tackles real-time hardware sensor fusion on mobile: it integrates Android’s ACTIVITY_RECOGNITION permission and Capacitor Motion to interface directly with device pedometer hardware, while offering a web devicemotion fallback for browsers. Features workout logging, hydration tracking, mental wellness check-ins, and local streak persistence with zero cloud dependencies. Includes a pre-compiled Android APK ready to download and test.',
    problem:
      'Cross-platform hybrid apps frequently struggle with background hardware sensor access and high-frequency pedometer interrupts without draining battery or dropping frames.',
    approach: [
      'Interfaced Android ACTIVITY_RECOGNITION and step counter hardware via Capacitor Motion plugins.',
      'Implemented a mathematical sensor fusion and debounce filter to eliminate false steps caused by device vibration.',
      'Built a devicemotion fallback engine ensuring full functionality when loaded in mobile web browsers.',
      'Structured local-first persistence for workout metrics, hydration logs, and daily step history with zero network latency.',
      'Packaged and verified a standalone signed APK compiled with Android Gradle and Capacitor.',
    ],
    pipeline: [
      { label: 'Hardware Sensor', detail: 'Android Step Counter & ACTIVITY_RECOGNITION' },
      { label: 'Capacitor Bridge', detail: 'Motion plugin with native event listeners' },
      { label: 'Web Fallback', detail: 'Browser devicemotion acceleration listener' },
      { label: 'Analytics Engine', detail: 'Step goal calculation and calories burned estimation' },
      { label: 'Local Store', detail: 'Encrypted offline daily streak and habit storage' },
    ],
    stack: [
      { group: 'Mobile & Hybrid', items: ['Capacitor', 'Android SDK', 'Motion API', 'Vite'] },
      { group: 'Frontend', items: ['React 19', 'TypeScript', 'Tailwind CSS', 'Lucide React'] },
      { group: 'Packaging', items: ['Android Studio', 'Gradle', 'APK'] },
    ],
    tags: ['React 19', 'Capacitor', 'Android', 'Sensors', 'TypeScript', 'Vite', 'Mobile', 'Pedometer'],
    cover: {
      kind: 'image',
      src: '/engineering/kinetic-thumbnail.png',
      alt: 'Kinetic physical and mental fitness tracker Android app interface showing real-time step counter and wellness dashboard',
      width: 1024,
      height: 576,
      caption: 'Kinetic: Real-time hardware pedometer sensor fusion and wellness dashboard on Android.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/kinetic-thumbnail.png',
        alt: 'Kinetic physical and mental fitness tracker showcase on Android with motion sensors and health metrics',
        width: 1024,
        height: 576,
        caption: 'Kinetic: Hardware sensor fusion pedometer, activity rings, and offline biometric tracking.',
      },
    ],
    results: [
      'Achieved real-time hardware step counting directly from phone accelerometers with sub-second responsiveness.',
      'Verified zero-crash performance across continuous mobile step sessions on physical Android devices.',
      'Provided a standalone pre-compiled APK directly in the repository for immediate installation and testing.',
    ],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/mental-and-fitness',
        kind: 'github',
      },
      {
        label: 'Download APK',
        href: '/apks/kinetic-fitness-debug.apk',
        kind: 'other',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 14,
    sourceNote: 'From the open-source GitHub repository kirat11X/mental-and-fitness and compiled Android APK release.',
  },
  {
    slug: 'vault-expense-manager',
    discipline: 'engineering',
    category: 'software',
    title: 'Vault — Offline-First Expense Manager',
    tagline: '100% private, zero-cloud personal finance tracker with encrypted offline storage & SVG charts.',
    summary:
      'A zero-cloud Android personal finance tracker built with React and Capacitor, featuring localized encrypted storage, budget limit guardians, interactive SVG spending charts, and instant in-memory CSV export.',
    overview:
      'Tested offline-first financial data architectures on Android: Vault ensures total financial privacy by never contacting cloud servers or telemetry backends. It stores all transactions in localized encrypted storage, enforces dynamic category budget limit guardians with visual alerts, renders responsive interactive SVG breakdown charts, and generates in-memory CSV spreadsheets for instant export. Includes a pre-compiled Android APK ready to download and test directly on device.',
    problem:
      'Modern finance apps rely heavily on invasive cloud synchronisation, subscription paywalls, and telemetry, putting sensitive personal spending logs at risk of data leakage.',
    approach: [
      'Constructed a 100% offline-first state engine with local encrypted persistence.',
      'Designed budget guardian logic that monitors category thresholds and triggers warning states before overspending occurs.',
      'Created custom reactive SVG charts for category breakdowns, monthly trends, and spending velocity without heavy charting dependencies.',
      'Implemented an in-memory CSV generation pipeline that serializes transaction ledgers into downloadable spreadsheets on device.',
      'Wrapped the responsive web shell with Capacitor into a standalone Android APK.',
    ],
    pipeline: [
      { label: 'Transaction Input', detail: 'Category, amount, timestamp, and notes' },
      { label: 'Budget Guardian', detail: 'Threshold calculation and overspending guards' },
      { label: 'Storage Layer', detail: 'Encrypted local device persistence' },
      { label: 'Visualization', detail: 'Custom responsive SVG charts and breakdown graphs' },
      { label: 'Export Pipeline', detail: 'In-memory CSV generation via Android DownloadManager' },
    ],
    stack: [
      { group: 'Mobile & Hybrid', items: ['Capacitor', 'Android SDK', 'Vite'] },
      { group: 'Frontend', items: ['React 19', 'TypeScript', 'Tailwind CSS', 'SVG'] },
      { group: 'Packaging', items: ['Gradle', 'APK', 'Android Studio'] },
    ],
    tags: ['React 19', 'Capacitor', 'Android', 'Offline-First', 'Finance', 'TypeScript', 'Vite', 'SVG'],
    cover: {
      kind: 'image',
      src: '/engineering/vault-thumbnail.png',
      alt: 'Vault offline-first personal finance tracker Android app displaying encrypted expense ledger and SVG spending charts',
      width: 1024,
      height: 576,
      caption: 'Vault: 100% private, zero-cloud personal finance tracker with interactive SVG visualizers.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/vault-thumbnail.png',
        alt: 'Vault offline personal finance tracker showcase with encrypted ledger, spending velocity, and in-memory CSV export',
        width: 1024,
        height: 576,
        caption: 'Vault: Local encrypted storage, budget limit guardian, and interactive SVG breakdown charts.',
      },
    ],
    results: [
      'Zero-cloud design guarantees 100% data privacy with zero external network requests.',
      'Instant transaction saves and interactive SVG chart re-renders under 16ms (60 FPS).',
      'Standalone APK provided in root repository for friction-free Android installation.',
    ],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/expense-tracker',
        kind: 'github',
      },
      {
        label: 'Download APK',
        href: '/apks/vault-expense-tracker-debug.apk',
        kind: 'other',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 15,
    sourceNote: 'From the open-source GitHub repository kirat11X/expense-tracker and compiled Android APK release.',
  },
  {
    slug: 'lumina-ai-chatbot',
    discipline: 'engineering',
    category: 'software',
    title: 'Lumina AI — Android & Web Chatbot',
    tagline: 'Gemini-powered conversational assistant with zero-crash offline fallback engine.',
    summary:
      'An Android AI chatbot powered by Google Gemini with client-side orchestration baked into the APK, featuring an automatic zero-crash offline fallback engine that maintains conversational continuity when disconnected.',
    overview:
      'Explored embedding state-of-the-art LLM capabilities directly into an Android hybrid APK without an intermediary backend server. Lumina AI wraps Google Gemini API orchestration directly within React and Capacitor, featuring prompt templating, markdown code rendering, and conversational context tracking. To counter flaky mobile network conditions, it integrates an automatic zero-crash offline fallback heuristic engine that seamlessly responds and queues messages when mobile connectivity drops. Includes a pre-compiled Android APK ready for testing.',
    problem:
      'Mobile AI apps break catastrophically upon connectivity dropouts; network failures throw unhandled exceptions and discard active conversational contexts.',
    approach: [
      'Integrated Google Gemini REST API client directly into the hybrid Android APK with secure key management.',
      'Engineered an automatic offline fallback engine that detects network drops and provides local conversational continuity.',
      'Implemented streaming markdown token parsing with syntax-highlighted code blocks for mobile displays.',
      'Persisted chat history locally with optimistic updates and retry mechanisms upon reconnection.',
      'Packaged the complete client into an installable Android APK with minimal binary footprint.',
    ],
    pipeline: [
      { label: 'User Query', detail: 'Optimistic UI update with message history context' },
      { label: 'Network Monitor', detail: 'Real-time online/offline connection state detection' },
      { label: 'Gemini Client', detail: 'Direct REST API call with system prompt injection' },
      { label: 'Offline Fallback', detail: 'Zero-crash fallback response generator when disconnected' },
      { label: 'Stream Renderer', detail: 'Markdown formatting and code block syntax viewer' },
    ],
    stack: [
      { group: 'AI & APIs', items: ['Google Gemini API', 'LLM Prompting', 'Markdown Parser'] },
      { group: 'Mobile & Hybrid', items: ['Capacitor', 'Android SDK', 'Vite'] },
      { group: 'Frontend', items: ['React 19', 'TypeScript', 'Tailwind CSS'] },
    ],
    tags: ['React 19', 'Capacitor', 'Android', 'Gemini', 'LLM', 'AI Chatbot', 'TypeScript', 'Vite'],
    cover: {
      kind: 'image',
      src: '/engineering/lumina-thumbnail.png',
      alt: 'Lumina AI conversational assistant Android app interface featuring Google Gemini token streaming and offline fallback',
      width: 1024,
      height: 576,
      caption: 'Lumina AI: Google Gemini-powered Android conversational agent with resilient offline fallback engine.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/lumina-thumbnail.png',
        alt: 'Lumina AI conversational chatbot showcase running on Android with Gemini AI integration and offline synthesis',
        width: 1024,
        height: 576,
        caption: 'Lumina AI: Google Gemini token streaming client, Liquid Sanctuary UI, and zero-crash offline fallback.',
      },
    ],
    results: [
      'Zero-crash resilience verified during simulated airplane mode and network handover transitions.',
      'Fast roundtrip response rendering with markdown formatting optimized for Android touchscreens.',
      'Pre-compiled APK available in the repository root for immediate direct installation.',
    ],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/AI-Chatbot-Android',
        kind: 'github',
      },
      {
        label: 'Download APK',
        href: '/apks/lumina-ai-debug.apk',
        kind: 'other',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 16,
    sourceNote: 'From the open-source GitHub repository kirat11X/AI-Chatbot-Android and compiled Android APK release.',
  },
  {
    slug: 'pulse-store-ecommerce',
    discipline: 'engineering',
    category: 'software',
    title: 'Pulse Store — Modern E-Commerce Storefront',
    tagline: 'Lightweight, responsive shopping app with variant pickers, cart math, and checkout animations.',
    summary:
      'A lightweight, responsive e-commerce mobile application built with React 19 and Capacitor. Features dynamic category filtering, interactive size/color variant pickers, real-time cart calculations, and smooth checkout animations.',
    overview:
      'Designed to test UI responsiveness and high-frequency state updates in hybrid mobile apps. Pulse Store delivers a modern digital storefront experience: product catalog browsing, instant category filtering, interactive multi-attribute variant pickers (sizes, colors, stock availability), reactive cart state calculations with tax/shipping formulas, and fluid page transition animations. Packaged as a high-performance native Android application with a pre-compiled APK.',
    problem:
      'Mobile e-commerce experiences on webviews often feel sluggish, suffering from unresponsive button taps, stuttering list scrolling, and delayed cart calculation updates.',
    approach: [
      'Optimized React 19 component trees and memoized state selectors to eliminate re-render bottlenecks.',
      'Built interactive multi-attribute variant pickers that dynamically validate sku combinations and availability.',
      'Designed reactive cart state management with real-time subtotal, discount, tax, and shipping calculations.',
      'Implemented hardware-accelerated CSS animations for drawer modals, toasts, and checkout transitions.',
      'Compiled the app into an installable Android APK with native touch feedback.',
    ],
    pipeline: [
      { label: 'Catalog Engine', detail: 'Dynamic product feeds and category filtering' },
      { label: 'Variant Selector', detail: 'Size, color, and inventory state matrix' },
      { label: 'Cart Store', detail: 'Reactive cart operations, quantity updates, and math' },
      { label: 'Checkout Flow', detail: 'Multi-step checkout validation and animated confirmation' },
      { label: 'Android Build', detail: 'Capacitor native wrapper and APK generation' },
    ],
    stack: [
      { group: 'Mobile & Hybrid', items: ['Capacitor', 'Android SDK', 'Vite'] },
      { group: 'Frontend', items: ['React 19', 'TypeScript', 'Tailwind CSS', 'State Management'] },
      { group: 'Packaging', items: ['Gradle', 'APK', 'Android Studio'] },
    ],
    tags: ['React 19', 'Capacitor', 'Android', 'E-Commerce', 'TypeScript', 'Vite', 'Mobile UI'],
    cover: {
      kind: 'image',
      src: '/engineering/pulse-thumbnail.png',
      alt: 'Pulse Store retail e-commerce Android application interface with interactive product catalog and cart drawer',
      width: 1024,
      height: 576,
      caption: 'Pulse Store: Lightweight React 19 retail storefront with dynamic variant pickers and instant cart math.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/pulse-thumbnail.png',
        alt: 'Pulse Store modern mobile e-commerce storefront showcase with live catalog filtering, variant pickers, and checkout',
        width: 1024,
        height: 576,
        caption: 'Pulse Store: React 19 single-page shopping app with instant SKU selection and animated checkout flow.',
      },
    ],
    results: [
      'Fluid 60 FPS scrolling and instantaneous variant selection feedback on mobile hardware.',
      'Sub-50ms cart recalculations across complex item and discount combinations.',
      'Ready-to-install Android APK available in the repository root.',
    ],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/E-commerce',
        kind: 'github',
      },
      {
        label: 'Download APK',
        href: '/apks/pulse-store-debug.apk',
        kind: 'other',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 17,
    sourceNote: 'From the open-source GitHub repository kirat11X/E-commerce and compiled Android APK release.',
  },
  {
    slug: 'vector-audio-player',
    discipline: 'engineering',
    category: 'software',
    title: 'Vector — Broad Filesystem Audio Player',
    tagline: 'Conquered Android scoped storage to crawl device music folders and play local audio.',
    summary:
      'An offline Android music player built with React and Capacitor that navigates modern scoped storage via DocumentsContract and Storage Access Framework to recursively crawl local folders and stream device audio.',
    overview:
      'Tackled one of the toughest challenges in modern Android cross-platform development: accessing arbitrary local files under Android 11+ scoped storage restrictions. Vector leverages Android DocumentsContract and Storage Access Framework (MANAGE_EXTERNAL_STORAGE / SAF) to recursively scan device storage directories for MP3, WAV, and FLAC audio files. It feeds discovered tracks into an HTML5/Web Audio playback pipeline with playlist queuing, seek scrubbing, background playback, and cover art extraction. Includes a pre-compiled Android APK ready to download and run.',
    problem:
      'Android scoped storage (API 30+) strictly blocks traditional filesystem path traversal (/sdcard), making local media players impossible to build with standard web APIs without native SAF bridge orchestration.',
    approach: [
      'Orchestrated Android Storage Access Framework and DocumentsContract to obtain broad tree permissions.',
      'Engineered a recursive directory crawler that scans device folders for audio file formats.',
      'Bridged native content URIs to web-viewable audio streams via Capacitor local server protocols.',
      'Built a full-featured music player interface with seekable progress, playlist management, and track shuffling.',
      'Packaged the solution into a standalone Android APK with media control permissions.',
    ],
    pipeline: [
      { label: 'SAF Permission', detail: 'DocumentsContract tree URI authorization' },
      { label: 'Filesystem Crawler', detail: 'Recursive directory traversal for audio MIME types' },
      { label: 'URI Bridge', detail: 'Capacitor native-to-web streaming conversion' },
      { label: 'Audio Engine', detail: 'HTML5 Audio / Web Audio API playback controller' },
      { label: 'Player UI', detail: 'Playlist manager, scrubber, and playback controls' },
    ],
    stack: [
      { group: 'Android & Native', items: ['Storage Access Framework', 'DocumentsContract', 'Capacitor', 'Android SDK'] },
      { group: 'Audio & Web', items: ['HTML5 Audio', 'Web Audio API', 'React 19', 'TypeScript'] },
      { group: 'Tooling & Build', items: ['Vite', 'Gradle', 'APK'] },
    ],
    tags: ['React 19', 'Capacitor', 'Android', 'Scoped Storage', 'Storage Access Framework', 'Audio Player', 'TypeScript'],
    cover: {
      kind: 'image',
      src: '/engineering/vector-thumbnail.png',
      alt: 'Vector broad filesystem audio player Android app showing now-playing vinyl stage and local directory crawler',
      width: 1024,
      height: 576,
      caption: 'Vector: Conquered Android Scoped Storage using Storage Access Framework to index and play local music.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/vector-thumbnail.png',
        alt: 'Vector audio player showcase on Android with Storage Access Framework crawler, mini-player overlay, and now-playing stage',
        width: 1024,
        height: 576,
        caption: 'Vector: SAF directory crawler, MP3/FLAC playback pipeline, docked mini-player, and Vector Noir design.',
      },
    ],
    results: [
      'Successfully bypassed scoped storage limitations to discover and index thousands of local audio tracks.',
      'Low-latency audio playback and seeking from internal storage and SD card directories.',
      'Includes a pre-compiled APK directly in the repository for phone testing.',
    ],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/Music_player',
        kind: 'github',
      },
      {
        label: 'Download APK',
        href: '/apks/vector-music-player-debug.apk',
        kind: 'other',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 18,
    sourceNote: 'From the open-source GitHub repository kirat11X/Music_player and compiled Android APK release.',
  },
  {
    slug: 'personal-stream-cinema',
    discipline: 'engineering',
    category: 'software',
    title: 'Personal Stream — Hybrid Movie Streaming & Device Cinema',
    tagline: 'Offline local device cinema and cloud trailer streaming with AI-curated reviews.',
    summary:
      'A hybrid Android media application that doubles as a local video player and cloud streaming catalog. Browse device storage to play offline .mp4/.mkv movies or stream cloud trailers with AI-curated reviews.',
    overview:
      'Bridged offline personal media libraries with cloud video streaming into a unified Android APK. Personal Stream allows users to browse local phone storage to play offline movies (.mp4, .mkv, .webm) in a custom video player modal, while seamlessly connecting to cloud streaming catalogs for trailers, trending titles, and AI-curated movie reviews. Built with React 19, Vite, and Capacitor, demonstrating that hybrid web technology can deliver responsive video playback alongside rich online catalogs. Includes a pre-compiled Android APK ready for immediate device testing.',
    problem:
      'Users must typically switch between local video player tools (VLC) and online streaming platforms; building a hybrid player requires bridging native local video filesystem access with cloud media streaming.',
    approach: [
      'Implemented local Android filesystem browsing to detect and launch offline video files (.mp4, .mkv).',
      'Constructed a custom video player modal with full-screen playback, aspect ratio scaling, and gesture scrub.',
      'Integrated online streaming APIs and Gemini-curated review summaries for cloud movie exploration.',
      'Managed hybrid state between offline local file bookmarks and cloud watchlist queues.',
      'Compiled and signed an Android APK using Capacitor and Android Gradle toolchains.',
    ],
    pipeline: [
      { label: 'Local Scanner', detail: 'Device folder traversal for offline .mp4 and .mkv files' },
      { label: 'Video Player', detail: 'HTML5 Video modal with native playback controls' },
      { label: 'Cloud Catalog', detail: 'Online trailer feeds and trending movie metadata' },
      { label: 'AI Reviews', detail: 'Gemini-generated context summaries and ratings' },
      { label: 'APK Distribution', detail: 'Pre-compiled Android binary bundled in repository' },
    ],
    stack: [
      { group: 'Mobile & Hybrid', items: ['Capacitor', 'Android SDK', 'Vite'] },
      { group: 'Frontend & Video', items: ['React 19', 'HTML5 Video', 'TypeScript', 'Tailwind CSS'] },
      { group: 'Packaging', items: ['Gradle', 'APK', 'Android Studio'] },
    ],
    tags: ['React 19', 'Capacitor', 'Android', 'Video Streaming', 'Local Player', 'TypeScript', 'Vite'],
    cover: {
      kind: 'image',
      src: '/engineering/personal-stream-thumbnail.png',
      alt: 'Personal Stream hybrid cinema application displaying local video playback modal alongside AI-curated movie streaming catalog',
      width: 1024,
      height: 576,
      caption: 'Personal Stream: Hybrid offline device cinema and cloud trailer streaming catalog with AI curator rankings.',
    },
    gallery: [
      {
        kind: 'image',
        src: '/engineering/personal-stream-thumbnail.png',
        alt: 'Personal Stream hybrid movie streaming showcase displaying local video player and cloud streaming catalog with Gemini reviews',
        width: 1024,
        height: 576,
        caption: 'Personal Stream: Dual-engine offline .mp4/.mkv local player and cloud trailer catalog with AI review rankings.',
      },
    ],
    results: [
      'Smooth playback of high-definition offline local videos alongside fast cloud trailer streaming.',
      'Unified offline file playback and online browsing in a single lightweight Android application.',
      'Directly installable pre-compiled APK provided in the repository root.',
    ],
    links: [
      {
        label: 'Source on GitHub',
        href: 'https://github.com/kirat11X/Movie_streaming',
        kind: 'github',
      },
      {
        label: 'Download APK',
        href: '/apks/personal-stream-cinema-debug.apk',
        kind: 'other',
      },
    ],
    status: 'prototype',
    year: '2026',
    order: 19,
    sourceNote: 'From the open-source GitHub repository kirat11X/Movie_streaming and compiled Android APK release.',
  },
];
