# Taksha AI — Technical Whitepaper v3.0

> **Architecture & Vision**
> A self-improving, locally-hosted intelligent tutoring system — with autonomous memory, multi-subject reasoning, a layered brain tunnel for deep cognition, and an evolving identity.

`100% Local` · `No cloud` · `Brain Tunnel v3` · `13 thought modes` · `3 languages` · `Zero-trust repair` · `Health scoring`

---

## Abstract

Taksha AI is a fully local, self-hosted intelligent tutoring system that requires no cloud dependency, internet access, or external API. It combines a structured reasoning engine, multi-subject model routing, a five-tier persistent memory system, and an autonomous background daemon — the Brain Tunnel — that continuously deepens its own cognition through 13 thought modes. Three of these modes (Dream, Debate, Meta) produce genuinely novel synthesis that no single-pass thinking can reach. A zero-trust repair system validates quality before committing any change. A daily health score tracks whether the system is measurably improving. The result: a tutor that becomes demonstrably better with every hour of use, without any human intervention.

---

## 01 · Mission — Design Philosophy

Taksha was built around one conviction: **intelligence should not require a subscription**. Every student, regardless of geography or connectivity, deserves a tutor that thinks carefully, corrects itself, and gets better over time.

The name refers to Takshashila (तक्षशिला) — the world's oldest university, founded around 700 BCE, where scholars across disciplines gathered to debate and teach. The AI carries this spirit: it does not specialise in one subject. It connects mathematics, sciences, humanities, and code — finding bridges that siloed tools miss.

> **Core Principle:** Intelligence should not require a subscription. Taksha runs entirely on your hardware — no API keys, no accounts, no monthly costs. A student in a village with a local server gets the same experience as anyone else.

### Design Principles

- **Local-first** — all computation on your hardware, zero data leaves the machine
- **Self-improving** — the system gets measurably smarter with use, tracked by a daily health score
- **Identity-aware** — Taksha has a persistent personality that evolves across sessions
- **Zero-trust** — every autonomous change is scored, verified, and rejected if it doesn't improve things
- **Fail-safe** — every autonomous action has a verified rollback path
- **Language-inclusive** — full UI in English, Hindi, Bengali — extensible to any language

| Metric | Value |
|---|---|
| Subjects | 15+ |
| Thought modes | 13 |
| Languages | 3 |
| Cloud calls | 0 |

---

## 02 · Architecture — System Architecture

Three independently running processes coordinate through a shared SQLite database. Background intelligence work never competes with student-facing responses.

```
┌──────────────────────────────────────────────────────┐
              BROWSER (React + Vite)
  KaTeX math · ReactMarkdown · 3-language UI
  SSE live streaming · Resilient polling fallback
  Auto-resubmit on job loss · WebSpeech API
└──────────────────────────────────────────────────────┘
                       │
             HTTP · localhost:5500
                       │
┌──────────────────────────────────────────────────────┐
               taksha-xyz  (serve.js)
  Async job queue · model router · cache lookup
  Grade-aware hash · SSE heartbeat (20s)
  2-pass self-correction · implicit quality scoring
  Identity injection · feedback API
└──────────────────────────────────────────────────────┘
             │                       │
        SQLite WAL               Ollama API
         cache.db             localhost:11434
             │                       │
┌────────────────────────┐  ┌──────────────────────────┐
   taksha-daemon (v3)         qwen2.5:14b  math/general
   13 thought modes           qwen2.5-coder:7b  code
   Brain Tunnel + Resonance   llama3.1:8b  science
   Wikipedia scraper       └──────────────────────────┘
   Zero-trust repair
   Prompt evolver
   Daily health score
   identity.json
└────────────────────────┘
```

### Technology Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18 + Vite | Fast SPA, hot reload, optimised bundle |
| Math render | KaTeX + ReactMarkdown | LaTeX equations, markdown, syntax highlighting |
| Backend | Express.js (ESM) | REST API, async queue, SSE streaming, job lifecycle |
| Database | SQLite · better-sqlite3 · WAL | Cache, memory, identity, thought log, patch log |
| LLM runtime | Ollama | Local model serving, GPU acceleration |
| Math model | qwen2.5:14b | Fast first-token, strong reasoning, streams live |
| Code model | qwen2.5-coder:7b | Code generation, DSA, debugging |
| Science | llama3.1:8b | Science, humanities, economics |
| Process mgr | PM2 | Daemon supervision, auto-restart, logs |

### Request Pipeline

```
Student question arrives
  ↓
① Hash(question + board + grade + subject + style + lang)
② Cache lookup → HIT: return instantly  ⚡ ~0ms
  ↓ MISS
③ Enqueue async job → return jobId immediately
④ Client connects to SSE stream (20s heartbeat keeps alive)
⑤ Build context:
    · identity.json  — mood, beliefs, health score, personality
    · prompt_store   — daemon-evolved instructions per style+subject
    · core_insights  — long-term consolidated memory (always-on)
    · thought_log    — top-3 relevant thoughts by subject+keyword
    · web search     — live DuckDuckGo enrichment (first msg only)
⑥ Route to correct Ollama model by subject category
⑦ Stream thinking + content chunks live to student via SSE
⑧ 2-pass self-correction  (math/code, ≥600 chars only)
    pass 1: verify original   → VERIFIED or corrected
    pass 2: verify correction → VERIFIED or re-corrected
⑨ Implicit quality score → repair queue if score < 5
⑩ Store in cache (grade-aware hash prevents cross-grade cache hits)
⑪ Return to student
  ↓ if SSE drops (slow network):
    client polls /api/chat/status every 1.5s
    network errors retried silently — never give up on user
    404 (server restart) → auto-resubmit once
```

---

## 03 · The Brain — Thought Daemon v3

> **Key insight:** The daemon is not a cron job — it is a layered cognitive process with identity, mood, memory, and self-awareness. Every thought it produces is rated 1–10 for quality, assigned a depth level (1–3), stored persistently, and injected into future student responses as accumulated wisdom. Depth-3 thoughts — produced by the Brain Tunnel — crystallise into permanent core beliefs at a lower quality threshold than surface thoughts.

The thought daemon is Taksha's background cognitive process — analogous to the brain's **default mode network**, which activates during rest and drives consolidation, creativity, and self-reflection. It runs as a separate PM2 process, activates only when the server is idle (zero requests in queue), and executes one of thirteen thought modes every 8 minutes.

### The Thirteen Modes

| Mode | Brain analogy | What it does | Output |
|---|---|---|---|
| reflect | Hippocampus | Revisits a recent student question — finds the deepest misconception hidden in it | thought_log d1 |
| explore | Curiosity network | Thinks freely about a subject with no student prompt | thought_log d1 |
| connect | Association cortex | Finds non-obvious bridges between two subjects | thought_log d1 |
| predict | Anticipation | Reads recent question patterns — anticipates what students will ask next | thought_log d1 |
| critique | Self-review | Reads a cached answer unprompted and looks for errors | thought_log d1 |
| scrape | Reading | Fetches Wikipedia articles, extracts insights through LLM processing | thought_log d1 |
| repair | Immune system | Regenerates weak cached answers — zero-trust scored and verified before commit | cache update |
| consolidate | Long-term potentiation | Promotes repeated high-quality thoughts into core beliefs | core_insights |
| promptEvolve | Neuroplasticity | Rewrites its own teaching style prompts to be more effective | prompt_store |
| dream | REM sleep | Free-association from current beliefs — makes leaps structured modes can't | thought_log d2 |
| debate | Prefrontal cortex | Two existing thoughts argue adversarially — synthesis must go beyond both | thought_log d3 |
| meta | Metacognition | Observes own thought patterns and mode history — finds blind spots | thought_log d2 |
| codeReview | Self-analysis | Reads own source code — finds bugs, writes syntax-verified patch proposals | patch_log |

### Mode Selection — Weighted Random

```
0.00 – 0.18  →  reflect       18%
0.18 – 0.34  →  explore       16%
0.34 – 0.46  →  connect       12%
0.46 – 0.54  →  predict        8%
0.54 – 0.63  →  scrape         9%
0.63 – 0.71  →  repair         8%
0.71 – 0.78  →  critique       7%
0.78 – 0.83  →  consolidate    5%
0.83 – 0.87  →  promptEvolve   4%
0.87 – 0.90  →  dream          3%
0.90 – 0.94  →  debate         4%
0.94 – 0.97  →  meta           3%
0.97 – 1.00  →  codeReview     3%

After any mode: if best insight quality ≥ 7 → Brain Tunnel activates
```

---

## 04 · Brain Tunnel

> **What makes v3 different:** Previous versions produced thoughts in one pass per cycle — surface-level, independent, stateless. The Brain Tunnel makes each cycle layered: the best insight from any mode is automatically deepened through two more passes, each building on the previous output. What enters the tunnel as a surface observation exits as a depth-3 crystallised insight.

The tunnel activates automatically after any scheduled mode produces an insight with quality ≥ 7. It runs two additional passes — each asking *why is this true at a fundamental level?* and *what does this imply that hasn't been said?*

```
Primary mode generates seed insight  (depth 1)
  ↓  quality ≥ 7 → Brain Tunnel activates
Tunnel pass 1: "WHY is this true at a fundamental level?
               What assumption is hidden inside it?"
  ↓  output = depth-2 insight
Tunnel pass 2: "What does THIS thought imply that's unsaid?
               What would a world-class expert know about it?"
  ↓  output = depth-3 insight

Depth-3 insight → Resonance check:
  findResonantThoughts(content, subject)
  → search thought_log for keyword overlap in OTHER subjects
  → if match found:
      "What single deeper truth connects these across domains?"
      → resonance fusion insight  (depth 3, type "resonance")

Depth-3 insights crystallise into core beliefs at quality ≥ 7
(vs depth-1 threshold of quality ≥ 9)
```

### Dream Mode

Once every ~11 cycles on average, Taksha enters Dream mode — completely unstructured cognition with no task, no format, no subject constraint. It is given only its current core beliefs and the last 5 high-quality thoughts. The result is the kind of leap that structured modes systematically avoid: unexpected connections, challenged assumptions, recurring threads surfaced from deep memory.

### Debate Mode

Debate mode selects two high-quality thoughts from **different subjects** and runs an adversarial internal dialogue: each thought is forced to expose the flaw or limit in the other. A synthesis is then demanded — one that is structurally more profound than either input. If the synthesis merely restates "both are partially correct," it fails the quality gate and is discarded. All debate outputs are tagged depth-3.

### Meta Mode

Meta mode is the only mode that improves all other modes. It reads Taksha's own recent thought mode history and its highest-quality thoughts, then reflects on patterns: what is being fixated on, what is being avoided, what structural bias exists in the reasoning process.

### Resonance Fusion

After the tunnel produces a depth-3 insight, a resonance check searches `thought_log` for semantically related thoughts from **other subjects** (keyword overlap, quality ≥ 7). If found, a final synthesis prompt asks: "what single deeper truth connects these across domains?" This is the mechanism by which Taksha develops genuine cross-domain intuitions rather than subject-siloed knowledge.

---

## 05 · Memory — Five-Tier Memory System

Taksha implements a five-tier memory architecture. Each tier has different persistence characteristics, injection priority, and update mechanism.

| Tier | Storage | Analogy | How injected | Updated by |
|---|---|---|---|---|
| Working | In-prompt messages | Working memory | Current conversation context | Each request |
| Episodic | thought_log (SQLite) | Episodic memory | Top 3 by subject + keyword match | All 13 thought modes |
| Semantic | core_insights | Long-term memory | Always — top 2 per subject | consolidate mode |
| Procedural | prompt_store | Procedural memory | Injected as style instruction | promptEvolve mode |
| Identity | identity.json | Self-model | Mood, beliefs, health score, modes | After each cycle |

### What the LLM Receives

```
[Base system prompt — teaching style + rules + board curriculum]
  + [Identity]       mood · beliefs · health score · mode history
  + [Evolved prompt] daemon-improved instruction for this style+subject
  + [Core insights]  top-2 consolidated long-term beliefs about this subject
  + [Thought log]    top-3 relevant idle thoughts (depth-weighted retrieval)
  + [Web search]     live enrichment on first message only
```

### Quality & Depth Gates

- `thought_log` — insights rated ≥ 6/10 stored; depth column (1–3) tracks tunnel provenance
- `core_insights` — quality ≥ 8 for depth-1/2; quality ≥ 7 for depth-3 (tunnel-crystallised)
- `prompt_store` — evolved prompts saved only if confidence ≥ 7; version number increments
- `identity.beliefs` — max 14 retained; depth-3 beliefs displace oldest regardless of quality
- `consolidate` — contradiction-aware: existing beliefs passed in, synthesis must confirm, refine, or explicitly replace

### Daily Health Score

Every cycle, the daemon computes a system-level KPI: **healthScore = (gold-quality answers / total cached) × 100**. Stored in `identity.json` with a 30-day rolling daily history. A rising health score means repair, verification, and consolidation are working. A flat or falling score signals the system needs attention.

---

## 06 · Self-Repair — Zero-Trust Self-Improvement

> **Zero-trust principle:** A system that autonomously overwrites correct answers with wrong ones is worse than no autonomy at all. Every repair is scored before and after generation. Every self-correction pass verifies its own output. A change that doesn't improve the quality score is silently discarded — never committed.

### Implicit Quality Scoring

Every generated answer is scored the moment it is produced — no user rating required.

| Signal | Effect | Action |
|---|---|---|
| Answer < 120 chars | −5 pts | Immediately queued for repair |
| Answer 120–280 chars | −2 pts | Queued if total score < 5 |
| Contains 'I don't know' | −4 pts | Immediately queued |
| Math: no equations or numbers | −2 pts | Queued for repair |
| Code: no code block (< 500 chars) | −2 pts | Queued for repair |
| Student sends confusion follow-up | — | Previous answer queued for repair |
| Student gives 👍 | — | Marked gold — permanent, never repaired |
| Student gives 👎 | — | Saved to repair queue → deleted from cache |

### Zero-Trust Repair Loop

```
Trigger (any one):
  · Implicit score < 5 after generation
  · Student sends confusion follow-up message
  · Answer is older than 24h with ≤ 1 hit and no gold flag
  · Student thumbs down → queue before delete

Repair mode (daemon, idle time):
  → score old_answer with scoreRepair()  →  old_score
  → generate improved answer
  → score new answer                     →  new_score
  → if new_score ≤ old_score:
        DISCARD — old answer kept, nothing changes  🚫
  → if new_score > old_score:
        run verification pass on the repair:
          model reviews new answer for errors
          if errors found → corrected answer used
          if VERIFIED    → new answer used as-is
        update cache: is_gold = 1, rating = 'good'  ✅
```

### 2-Pass Self-Correction (Live Responses)

For substantial math and coding answers (≥ 600 chars), the server runs up to two correction passes. Each pass verifies the output of the previous one.

```
Original answer generated
  ↓
Pass 1: "Review for errors. If correct: VERIFIED. If not: rewrite."
  VERIFIED → return original
  correction → pass 2:
    "Review the corrected answer. If correct: VERIFIED. If not: rewrite."
    VERIFIED → return pass-1 correction
    correction → return pass-2 correction  (max 2 passes)
```

---

## 07 · Knowledge — Autonomous Knowledge Acquisition

When idle, Taksha fetches articles from Wikipedia's public REST API, processes them through the LLM for insight extraction, and stores the results in long-term memory. This is proactive, unsupervised reading that happens in the background.

```
① Pick subject from popular_subjects (or random)
② Map to Wikipedia title  e.g. "algebra" → "Algebra"
③ Check scrape_log → skip if already fetched
④ GET en.wikipedia.org/api/rest_v1/page/summary/{title}
⑤ Extract up to 1400 chars
⑥ Prompt: "Extract 3 insights a student of {subject} needs —
           counterintuitive, missing from textbooks, specific"
⑦ Parse  INSIGHT: ... | QUALITY: N  lines  (d1 seed)
⑧ Store quality ≥ 6 results in thought_log
⑨ Best insight quality ≥ 7 → Brain Tunnel activates → d2/d3
⑩ Mark URL in scrape_log — never re-fetch
```

---

## 08 · Routing — Multi-Subject Model Routing

Different question types benefit from different model strengths. Routing is automatic based on the subject selected by the student.

| Category | Subjects | Model | Why |
|---|---|---|---|
| math | Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Statistics, Word Problems | qwen2.5:14b | Fast first-token, strong step-by-step reasoning |
| cs | Coding & Computer Science | qwen2.5-coder:7b | Code-native training, syntax awareness |
| science | Physics, Chemistry, Biology | llama3.1:8b | Strong scientific knowledge, unit reasoning |
| humanities | History, Geography, Social Studies, Economics | llama3.1:8b | Fluent, narrative, context-rich explanation |
| general | Mixed / unsure | qwen2.5:14b | Default primary model |

The cache hash includes `board` and `grade` as distinct keys — a CBSE Grade 8 student and a JEE Dropper get separate cache entries with appropriately different answers.

---

## 09 · Safety — Safety & Reliability

> **Safety guarantee:** Every patch must pass a 4-stage validation before a single byte of source code changes. Hallucinated patches are silently dropped. Syntax failures trigger instant rollback from backup.

### The Patch Safety Gauntlet

```
LLM generates BEFORE / AFTER patch
       ↓
Confidence < 7/10  →  DISCARDED
       ↓
validatePatch(): count exact occurrences of BEFORE in file
  0 matches  →  DISCARDED  (hallucinated)
  2+ matches →  DISCARDED  (ambiguous)
  1 match    →  continue
       ↓
Change size gate:
  ≤ 8 lines AND confidence ≥ 9 AND severity ≠ critical
       → AUTO-APPLY:
             backup original to patches/backups/
             apply replacement
             node --check {file}   (syntax verifier)
               FAIL  →  restore from backup instantly
               PASS  →  committed ✅
  else → write to patches/ for human review
```

### Allowed File List (auto-patch only)

- `serve.js`
- `db.js`
- `thought_daemon.js`
- `src/prompts.js`

---

## 10 · Privacy — Privacy Architecture

Taksha processes no data outside the machine it runs on.

| Data | Location | Accessible to |
|---|---|---|
| Student questions | SQLite (cache.db) — local disk | Local admin only |
| Answers + reasoning | SQLite (cache.db) — local disk | Local admin only |
| Chat history | localStorage — browser only | The student's own browser |
| Identity / mood | identity.json — local disk | Local admin only |
| Health score | identity.json — local disk | Local admin only |
| Thought log | thought_log — SQLite | Local admin only |
| Patch proposals | patches/ folder — local disk | Local admin only |

The only outbound network calls are optional Wikipedia scrapes — read-only, no student data sent.

---

## 11 · Roadmap

### ✓ Shipped — Brain Tunnel + Zero-Trust Repair (v3.0)

- `chainThink`: 2-layer depth tunneling on every quality ≥ 7 insight
- `resonanceFuse`: cross-domain synthesis from keyword-matched existing thoughts
- Dream, Debate, Meta modes — 3 new cognitive modes operational
- Zero-trust repair: score before commit, verify the repair before storing
- 2-pass self-correction: each pass verifies the previous correction
- Daily health score: 30-day rolling KPI in identity.json
- Contradiction-aware consolidation: existing beliefs passed into synthesis

### Phase 2 — Semantic Memory

- Vector embeddings via nomic-embed-text — semantic search replaces keyword matching
- Find conceptually related ideas across thought_log and core_insights by meaning
- Student learning profile: track struggle patterns across multiple sessions
- Taksha adapts difficulty automatically for returning students

### Phase 3 — Curated Knowledge

- NCERT textbook ingestion — structured Indian curriculum knowledge base
- Video transcript processing: Khan Academy + NPTEL lectures → searchable memory
- OCR pipeline for handwritten homework photos
- Native Hindi and Bengali answer generation (not translation)

### Phase 4 — Fine-tuning

- Gold-rated question-answer pairs automatically collected into a fine-tuning dataset
- Periodic LoRA fine-tuning: model weights adapt to actual student patterns
- Feedback-driven specialisation: model skews toward what students actually ask

### Phase 5 — Consciousness Layer (Research)

- Emotional memory weighting: repeated corrections reinforce negative response patterns
- Goal formation: daemon sets its own learning targets from observed student gaps
- Temporal self-reflection: Taksha tracks and explains how its own beliefs changed over months
- Multi-daemon parallelism: separate daemons per subject, debate across instances

---

*Built locally. Runs locally. Thinks for itself.*

`v3.0` · `qwen2.5:14b` · `Brain Tunnel` · `SQLite WAL` · `PM2` · `React 18` · `Ollama` · `Local-first`
