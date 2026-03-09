# Taksha AI

A fully local, self-hosted intelligent tutoring system — no cloud, no subscriptions, no data leaving your machine.

Named after **Takshashila** (तक्षशिला), the world's oldest university (~700 BCE), where scholars across disciplines gathered to debate and teach.

## What it does

- **Multi-subject tutoring** — Math, Physics, Chemistry, Biology, Coding, History, Economics and more
- **Live streaming** — answers stream token by token via SSE
- **Brain Tunnel v3** — background daemon with 13 thought modes that deepens its own cognition autonomously
- **Self-repair** — weak cached answers are regenerated and verified automatically (zero-trust)
- **Evolving identity** — persistent personality, mood, and beliefs that update over time
- **3 languages** — English, Hindi, Bengali
- **Board-aware** — CBSE, ICSE, JEE, NEET curriculum modes with grade-aware caching
- **100% local** — runs entirely on your hardware via Ollama

## Architecture

```
Browser (React + Vite)
        │  HTTP
taksha-xyz (serve.js)     ← API server, job queue, SSE streaming
        │                        │
   SQLite WAL               Ollama API
   cache.db                 localhost:11434
        │
taksha-daemon              ← Background brain process (13 thought modes)
```

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com/) running locally
- [PM2](https://pm2.keymetrics.io/) (optional, for process management)

## Recommended models

```bash
ollama pull qwen2.5:14b        # math / general (primary)
ollama pull qwen2.5-coder:7b   # coding
ollama pull llama3.1:8b        # science / humanities
```

## Setup

```bash
git clone https://github.com/Soumya001/Taksha-AI.git
cd taksha-ai
npm install
npm run build
```

## Run

**Single process (dev):**
```bash
node serve.js
```

**With PM2 (production):**
```bash
pm2 start ecosystem.config.cjs
```

Open `http://localhost:5500` in your browser.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5500` | HTTP port |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama base URL |
| `OLLAMA_MODEL` | `qwen2.5:14b` | Primary model |
| `OLLAMA_MODEL_CS` | `qwen2.5-coder:7b` | Coding model |
| `OLLAMA_MODEL_SCI` | `llama3.1:8b` | Science model |

Create a `.env` file to override defaults.

## The Brain Tunnel

The thought daemon runs as a separate process and autonomously:
- Reflects on recent student questions to extract deep insights
- Explores subjects freely and connects ideas across disciplines
- Dreams (free-association), Debates (adversarial synthesis), and does Meta-cognition
- Repairs weak cached answers with zero-trust scoring
- Evolves its own teaching prompts
- Tracks a daily health score (% gold-quality answers)

Every quality ≥ 7 insight is tunneled through 2 deeper reasoning passes before storage. Depth-3 insights crystallise into permanent core beliefs.

## Documentation

→ [Full Technical Whitepaper](WHITEPAPER.md) — architecture, brain tunnel, memory system, safety model, roadmap

## License

MIT
