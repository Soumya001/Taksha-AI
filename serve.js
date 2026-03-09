import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { readFileSync, existsSync } from "fs";
import { cacheGet, cacheSet, cacheStats, makeHash, maybeGC, markGold, deleteBad, getRelevantThoughts, getCoreInsights, addToRepairQueue, getCodeReviews, getEvolvedPrompt } from "./db.js";

const IDENTITY_FILE = join(dirname(fileURLToPath(import.meta.url)), "identity.json");
function getIdentityContext() {
  try {
    if (!existsSync(IDENTITY_FILE)) return "";
    const id = JSON.parse(readFileSync(IDENTITY_FILE, "utf8"));
    const beliefs = (id.beliefs || []).slice(0, 2).map(b => `  • ${b}`).join("\n");
    return `\n\n[Taksha's current state — mood: ${id.mood || "curious"}${beliefs ? `\nCore beliefs:\n${beliefs}` : ""}]`;
  } catch { return ""; }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(join(__dirname, "dist")));

// ── Config ───────────────────────────────────────────────────────────────────
const OLLAMA_HOST      = process.env.OLLAMA_HOST      || "http://localhost:11434";
const OLLAMA_MODEL     = process.env.OLLAMA_MODEL     || "qwen2.5:14b";
const OLLAMA_MODEL_CS  = process.env.OLLAMA_MODEL_CS  || "qwen2.5-coder:7b";
const OLLAMA_MODEL_SCI = process.env.OLLAMA_MODEL_SCI || "llama3.1:8b";
const MAX_QUEUE        = 50; // reject beyond this — prevents unbounded memory growth

// Subject → category routing
const SUBJECT_CATEGORY = {
  arithmetic: "math", algebra: "math", geometry: "math",
  trigonometry: "math", calculus: "math", statistics: "math", wordproblems: "math",
  coding: "cs",
  physics: "science", chemistry: "science", biology: "science",
  history: "humanities", geography: "humanities", socialstudies: "humanities", economics: "humanities",
  general: "math",
};

// ── Implicit answer quality scorer ────────────────────────────────────────────
// No user rating needed — passive signals decide if answer goes to repair queue
function scoreAnswer(content, subject) {
  let score = 10;
  const lc  = content.toLowerCase();
  const cat = SUBJECT_CATEGORY[subject] || "math";

  // Too short
  if (content.length < 120) score -= 5;
  else if (content.length < 280) score -= 2;

  // Uncertainty / evasion language
  if (lc.includes("i don't know") || lc.includes("i cannot") || lc.includes("i'm not able")) score -= 4;
  if (lc.includes("sorry") && content.length < 350) score -= 2;
  if (lc.includes("unfortunately") && content.length < 350) score -= 1;

  // Subject-specific: math should have numbers/equations
  if (cat === "math" && !content.match(/[\d]+[\s]*[+\-*/=^]|\\[a-z]|\$/) ) score -= 2;
  // Code answers should have code
  if (cat === "cs" && !content.includes("```") && content.length < 500) score -= 2;

  return Math.max(1, score);
}

// Detect if current question is a confusion follow-up to a previous assistant answer
function detectConfusedFollowup(messages) {
  if (messages.length < 3) return null;
  const last = messages[messages.length - 1];
  if (last?.role !== "user") return null;
  const text = (typeof last.content === "string" ? last.content : "").toLowerCase();
  const confusionWords = ["again", "explain more", "don't understand", "didn't get", "confused", "what do you mean", "still not clear", "not clear", "can you redo", "wrong", "incorrect"];
  if (!confusionWords.some(w => text.includes(w))) return null;
  // The message just before the current user message must be from assistant (not another user)
  const prevMsg = messages[messages.length - 2];
  if (!prevMsg || prevMsg.role !== "assistant") return null;
  // Find the previous user question (2 back)
  const prevUser = [...messages].slice(0, -1).reverse().find(m => m.role === "user");
  return prevUser ? (typeof prevUser.content === "string" ? prevUser.content : "") : null;
}

function pickModel(subject) {
  const cat = SUBJECT_CATEGORY[subject] || "math";
  if (cat === "cs")                     return { model: OLLAMA_MODEL_CS,  useThink: false };
  if (cat === "science")                return { model: OLLAMA_MODEL_SCI, useThink: false };
  if (cat === "humanities")             return { model: OLLAMA_MODEL_SCI, useThink: false };
  const model = OLLAMA_MODEL;
  return { model, useThink: model.startsWith("deepseek-r1") };
}

// ── Request Queue ─────────────────────────────────────────────────────────────
const jobs       = new Map();  // jobId → { status, result, error, createdAt }
const jobStreams  = new Map();  // jobId → SSE emit fn (when client is streaming)
const queue      = [];
let processing   = false;

function enqueue(jobId, handler) {
  jobs.set(jobId, { status: "waiting", result: null, error: null, createdAt: Date.now() });
  queue.push({ jobId, handler });
  processNext();
}

async function processNext() {
  if (processing || queue.length === 0) return;
  processing = true;
  const { jobId, handler } = queue.shift();
  const job = jobs.get(jobId);
  if (!job) { processing = false; processNext(); return; }
  job.status = "processing";

  // Push updated queue positions to all still-waiting SSE clients
  queue.forEach((item, idx) => {
    const e = jobStreams.get(item.jobId);
    if (e) e("queued", { position: idx + 1 });
  });

  // Wait briefly so the SSE client has time to connect before we grab emit
  await new Promise(r => setTimeout(r, 500));

  const emit = jobStreams.get(jobId) ?? null;
  if (emit) emit("processing", { position: 0 });

  try {
    job.result = await handler(emit);
    job.status = "done";
    if (emit) emit("done", {
      content:       job.result.content       ?? "",
      canvas:        job.result.canvas        ?? null,
      thinking:      job.result.thinking      ?? null,
      selfCorrected: job.result.selfCorrected ?? false,
    });
  } catch (err) {
    job.error  = err.message || "Unknown error";
    job.status = "error";
    if (emit) emit("appError", { error: job.error });
  } finally {
    jobStreams.delete(jobId);
  }

  processing = false;
  const cutoff = Date.now() - 600_000;
  for (const [id, j] of jobs) {
    if ((j.status === "done" || j.status === "error") && j.createdAt < cutoff) jobs.delete(id);
  }
  maybeGC();
  processNext();
}

// ── Term normalisation — fix inconsistent transliterations from qwen ──────────
const BN_FIXES = [
  [/লগারিথম/g,   "লগারিদম"],
  [/লগারিদ্ম/g,  "লগারিদম"],
  [/ত্রিকোণমেত্রি/g, "ত্রিকোণমিতি"],
  [/জিওমেট্রি/g, "জ্যামিতি"],
  [/ক্যালকুলেশন/g, "গণনা"],
];
const HI_FIXES = [
  [/लॉगरिथम/g,  "लघुगणक"],
  [/लघुगणित/g,  "लघुगणक"],
];
function normaliseTerms(text, lang) {
  const fixes = lang === "bn" ? BN_FIXES : lang === "hi" ? HI_FIXES : [];
  return fixes.reduce((t, [pat, rep]) => t.replace(pat, rep), text);
}

// ── Post-process: surgical math fix — only touches non-LaTeX spans ────────────
function fixMathFormatting(text) {
  // 1. Remove qwen-style duplicates: "$a$ a" → "$a$", "$x$ x" → "$x$"
  //    Pattern: $<token>$ followed by the same plain token as literal text
  let out = text.replace(/\$([^$\n]+?)\$\s+([^\s$]{1,12})(?=[\s,\.;:\)\]]|$)/g, (match, latex, plain) => {
    // strip LaTeX commands to get the "plain" rendering of the latex
    const latexPlain = latex.replace(/\\[a-zA-Z]+\s*/g, "").replace(/[{}^_]/g, "").trim();
    if (latexPlain === plain.trim()) return `$${latex}$`; // duplicate — drop the plain copy
    return match; // not a duplicate
  });

  // 2. Split on existing LaTeX spans, process only plain-text segments
  const parts = out.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // already LaTeX — leave untouched
    return part
      .replace(/\b([a-zA-Z])\s*=\s*(-?[\d.]+)\b/g, "$$$1 = $2$")
      .replace(/\(([^)]+)\)\s*\/\s*(\d+)/g, (_, n, d) => `$\\frac{${n}}{${d}}$`)
      .replace(/(Δ\s*=\s*[^\n$]+)/g, m => `$${m.trim()}$`);
  }).join("");
}

// ── Canvas JSON validation ────────────────────────────────────────────────────
function parseAndValidateCanvas(raw) {
  const match = raw.match(/\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/);
  if (!match) return { text: raw, canvas: null };
  const text = raw.replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/, "").trim();
  try {
    const canvas = JSON.parse(match[1].trim());
    if (!canvas.type || (!canvas.functions && !canvas.shapes)) {
      console.warn("[canvas] invalid structure, dropping canvas");
      return { text, canvas: null };
    }
    return { text, canvas };
  } catch (e) {
    console.warn("[canvas] JSON parse failed:", e.message, "| raw:", match[1].slice(0, 80));
    return { text, canvas: null };
  }
}

// ── Web search (DuckDuckGo) ───────────────────────────────────────────────────
async function webSearch(query, board) {
  try {
    const boardSuffix = board && board !== "general"
      ? ` ${board} curriculum`
      : " site:ncert.nic.in OR site:khanacademy.org OR site:byjus.com";
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + boardSuffix + " worked solution")}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(2000), // reduced from 5s → 2s
    });
    const html = await res.text();
    const snippets = [];
    for (const pattern of [/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g, /<td class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/g]) {
      let match;
      while ((match = pattern.exec(html)) !== null && snippets.length < 3) { // 5 → 3 snippets
        const t = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (t.length > 40) snippets.push(t);
      }
      if (snippets.length > 0) break;
    }
    return snippets.join("\n");
  } catch { return ""; }
}

// ── Streaming LLM call (used when SSE client is connected) ────────────────────
async function callOllamaStream(ollamaMessages, lang, model, useThink, emit) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 360_000);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ model, messages: ollamaMessages, stream: true, think: useThink }),
      signal:  controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama ${response.status}: ${errText.slice(0, 200)}`);
    }

    let thinkingBuf = "";
    let contentBuf  = "";
    let inThinkTag  = false;
    let remainder   = "";

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text  = remainder + decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        remainder   = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk      = JSON.parse(line);
            const thinkChunk = chunk.message?.thinking ?? "";
            let   contentChunk = chunk.message?.content ?? "";

            // Native thinking field (Ollama ≥ 0.7 + deepseek-r1)
            if (thinkChunk) {
              thinkingBuf += thinkChunk;
              emit("thinking", { chunk: thinkChunk });
            }

            // Fallback: parse <think>…</think> from content stream
            if (!thinkChunk && contentChunk) {
              if (contentChunk.includes("<think>")) { inThinkTag = true; contentChunk = contentChunk.replace("<think>", ""); }
              if (inThinkTag && contentChunk.includes("</think>")) {
                inThinkTag = false;
                const [t, rest] = contentChunk.split("</think>");
                if (t) { thinkingBuf += t; emit("thinking", { chunk: t }); }
                contentChunk = rest ?? "";
              } else if (inThinkTag) {
                thinkingBuf += contentChunk;
                emit("thinking", { chunk: contentChunk });
                contentChunk = "";
              }
            }

            if (contentChunk) {
              contentBuf += contentChunk;
              emit("content", { chunk: contentChunk });
            }
          } catch {}
        }
      }
    } finally { reader.cancel().catch(() => {}); }

    if (thinkingBuf) console.log(`[think-stream] ${thinkingBuf.length} chars`);

    const { text, canvas } = parseAndValidateCanvas(contentBuf);
    const content = fixMathFormatting(normaliseTerms(text, lang));
    return { content, canvas, thinking: thinkingBuf.trim() || null };

  } finally { clearTimeout(timeout); }
}

// ── Core LLM call (non-streaming fallback / self-correction) ──────────────────
async function callOllama(ollamaMessages, lang, model, useThink) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 360_000);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: ollamaMessages, stream: false, think: useThink }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    // DeepSeek-R1: thinking field is separate when think:true
    const thinkingRaw = data.message.thinking || null;
    const thinking    = thinkingRaw ? thinkingRaw.trim() : null;

    // Fallback: parse <think> from content for older Ollama versions
    const raw = data.message.content;
    const thinkMatch = !thinking && raw.match(/^\s*<think>([\s\S]*?)<\/think>\s*/i);
    const finalThinking = thinking || (thinkMatch ? thinkMatch[1].trim() : null);
    const bodyText = thinkMatch ? raw.slice(thinkMatch[0].length).trimStart() : raw;

    if (finalThinking) console.log(`[think] captured ${finalThinking.length} chars`);

    // Extract canvas FIRST (before math fix — prevents regex from corrupting JSON)
    const { text: rawText, canvas } = parseAndValidateCanvas(bodyText);
    const content = fixMathFormatting(normaliseTerms(rawText, lang));
    return { content, canvas, thinking: finalThinking };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Self-correction ───────────────────────────────────────────────────────────
// Only verify long answers with multi-step numeric calculations or code — not every math response
function shouldVerify(content, subject) {
  const cat = SUBJECT_CATEGORY[subject] || "math";
  if (cat === "humanities") return false;
  if (content.length < 600) return false; // skip short answers — fast and usually correct
  const hasDisplayMath = /\$\$[\s\S]+?\$\$/.test(content); // only block-level equations
  const hasCode        = /```[\s\S]{80,}```/.test(content); // only substantial code blocks
  const hasArithmetic  = /=\s*-?[\d.]+/.test(content);     // has a computed result
  return (hasDisplayMath && hasArithmetic) || hasCode;
}

async function verifyAndCorrect(ollamaMessages, originalAnswer, lang, model) {
  const VERIFY_PROMPT = `Review your answer above carefully. Check for:\n- Calculation or arithmetic errors\n- Logic errors or missing steps\n- Code bugs or incorrect output\n- Wrong units\n\nIf you find ANY error, write the COMPLETE corrected answer.\nIf the answer is fully correct, respond with exactly one word: VERIFIED`;

  let current      = originalAnswer;
  let lastCorrection = null;

  // Up to 2 correction passes — each pass verifies the previous output, not the original
  for (let pass = 0; pass < 2; pass++) {
    const verifyMessages = [
      ...ollamaMessages,
      { role: "assistant", content: current },
      { role: "user",      content: VERIFY_PROMPT },
    ];
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ model, messages: verifyMessages, stream: false, think: false }),
        signal:  controller.signal,
      });
      if (!response.ok) return lastCorrection;
      const data = await response.json();
      const text = (data.message?.content || "").trim();
      if (/^VERIFIED$/i.test(text)) {
        // pass 0 verified original → nothing to change
        // pass 1 verified first correction → use that correction
        if (pass === 0) console.log("[verify] original verified — no correction needed");
        else            console.log(`[verify] correction verified on pass ${pass + 1}`);
        return lastCorrection;
      }
      lastCorrection = text;
      current        = text; // next pass checks this correction
      console.log(`[verify] pass ${pass + 1} correction applied (${text.length} chars)`);
    } catch { return lastCorrection; }
    finally { clearTimeout(timeout); }
  }

  return lastCorrection;
}

// ── POST /api/chat — enqueue and return jobId immediately ────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, system, lang, board, grade, subject, style, bypassCache } = req.body;
  const { model, useThink } = pickModel(subject);

  // Validation
  if (!messages || !system)
    return res.status(400).json({ error: "messages and system are required" });
  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: "messages must be a non-empty array" });
  if (queue.length >= MAX_QUEUE)
    return res.status(429).json({ error: "Server busy — too many requests. Try again in a moment.", retryAfter: 30 });

  // Extract the user's latest question text for caching
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
  const questionText = Array.isArray(lastUserMsg?.content)
    ? lastUserMsg.content.find(c => c.type === "text")?.text || ""
    : lastUserMsg?.content || "";

  // Cache lookup — skip GPU entirely if we've seen this before (unless bypassCache)
  if (!bypassCache && questionText.trim().length > 5) {
    const hash = makeHash(questionText, board || "general", subject || "general", style || "stepbystep", lang || "en", grade || "");
    const cached = cacheGet(hash);
    if (cached) {
      console.log(`[cache] hit for: ${questionText.slice(0, 50)}`);
      return res.json({
        jobId: null, position: 0, cached: true,
        content:  cached.answer,
        canvas:   cached.canvas_json ? JSON.parse(cached.canvas_json) : null,
        thinking: cached.thinking || null,
      });
    }
  }

  const jobId   = randomUUID();
  const position = queue.length + (processing ? 1 : 0);

  enqueue(jobId, async (emit) => {
    // Web search — only for first message, skip for follow-ups (already have context)
    const isFirstMessage = messages.filter(m => m.role === "user").length <= 1;
    let searchContext = "";
    if (isFirstMessage && questionText.trim().length > 12) {
      searchContext = await webSearch(questionText, board);
    }

    // Inject relevant thoughts from daemon's thought log
    const thoughts = getRelevantThoughts(subject || "general", questionText, 3);
    const thoughtContext = thoughts.length > 0
      ? `\n\nTAKSHA INNER MEMORY — insights you have generated independently on this topic:\n` +
        thoughts.map(t => `[${t.type}] ${t.content}`).join("\n")
      : "";

    // Inject core_insights (always-on consolidated beliefs)
    const coreInsights = getCoreInsights(subject || "general", 2);
    const coreContext = coreInsights.length > 0
      ? `\n\nTAKSHA CORE BELIEFS about ${subject}:\n` +
        coreInsights.map(c => `• ${c.content}`).join("\n")
      : "";

    // Inject identity/mood context
    const identityCtx = getIdentityContext();

    // Check if daemon evolved the prompt for this style+category
    const cat         = SUBJECT_CATEGORY[subject || "general"] || "math";
    const evolvedKey  = `${style || "stepbystep"}_${cat}`;
    const evolvedPart = getEvolvedPrompt(evolvedKey);
    const evolvedCtx  = evolvedPart ? `\n\n[EVOLVED INSTRUCTION from self-improvement: ${evolvedPart}]` : "";

    const systemWithContext = `${system}${identityCtx}${evolvedCtx}${coreContext}${thoughtContext}${searchContext ? `\n\nWEB SEARCH CONTEXT (use this to enrich your answer):\n${searchContext}` : ""}`;

    const ollamaMessages = [
      { role: "system", content: systemWithContext },
      ...messages.map(m => {
        if (Array.isArray(m.content)) {
          const textPart = m.content.find(c => c.type === "text")?.text || "";
          const hasImage = m.content.some(c => c.type === "image");
          return {
            role: m.role,
            content: hasImage
              ? `[Image uploaded — describe the math problem in text if possible]\n${textPart}`
              : textPart,
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    // Use streaming when SSE client is connected, else blocking call
    let result = emit
      ? await callOllamaStream(ollamaMessages, lang, model, useThink, emit)
      : await callOllama(ollamaMessages, lang, model, useThink);

    // Self-correction pass — only for calculation/code answers, not cached
    if (shouldVerify(result.content, subject)) {
      if (emit) emit("verifying", {});
      const corrected = await verifyAndCorrect(ollamaMessages, result.content, lang, model);
      if (corrected) {
        const { text, canvas } = parseAndValidateCanvas(corrected);
        result = { ...result, content: fixMathFormatting(normaliseTerms(text, lang)), canvas: canvas || result.canvas, selfCorrected: true };
      }
    }

    // Store in cache (including thinking for future cache hits)
    if (questionText.trim().length > 5 && result.content) {
      const hash = makeHash(questionText, board || "general", subject || "general", style || "stepbystep", lang || "en", grade || "");
      cacheSet(hash, questionText, board || "general", subject || "general", style || "stepbystep", lang || "en",
        result.content, result.canvas ? JSON.stringify(result.canvas) : null, result.thinking || null);

      // Implicit quality scoring — no user rating needed
      const implicitScore = scoreAnswer(result.content, subject || "general");
      if (implicitScore < 5) {
        addToRepairQueue({ question: questionText, board: board || "general", subject: subject || "general", style: style || "stepbystep", lang: lang || "en", old_answer: result.content });
        console.log(`[quality] implicit score ${implicitScore}/10 — queued for repair: "${questionText.slice(0, 50)}"`);
      }
    }

    // Confusion follow-up detection — if student seems lost, flag previous answer
    const confusedPrev = detectConfusedFollowup(messages);
    if (confusedPrev && confusedPrev.length > 5) {
      addToRepairQueue({ question: confusedPrev, board: board || "general", subject: subject || "general", style: style || "stepbystep", lang: lang || "en", old_answer: "" });
      console.log(`[quality] confusion follow-up detected — previous answer queued for repair`);
    }

    return result;
  });

  res.json({ jobId, position, cached: false, queueLength: queue.length });
});

// ── GET /api/chat/status/:jobId ───────────────────────────────────────────────
app.get("/api/chat/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found or expired" });

  const queuePos = queue.findIndex(q => q.jobId === req.params.jobId);
  const position = queuePos === -1 ? 0 : queuePos + 1;

  res.json({
    status:       job.status,
    position,
    queueLength:  queue.length,
    content:      job.result?.content       ?? null,
    canvas:       job.result?.canvas        ?? null,
    thinking:     job.result?.thinking      ?? null,
    selfCorrected:job.result?.selfCorrected ?? false,
    error:        job.error ?? null,
  });
});

// ── GET /api/queue ────────────────────────────────────────────────────────────
app.get("/api/queue", (_, res) => {
  res.json({ waiting: queue.length, processing: processing ? 1 : 0, total: jobs.size });
});

// ── GET /api/cache/stats ──────────────────────────────────────────────────────
app.get("/api/cache/stats", (_, res) => res.json(cacheStats()));

// ── POST /api/feedback ────────────────────────────────────────────────────────
app.post("/api/feedback", (req, res) => {
  const { question, board, subject, style, lang, rating } = req.body;
  if (!question || !rating) return res.status(400).json({ error: "question and rating required" });
  const hash = makeHash(question, board || "general", subject || "general", style || "stepbystep", lang || "en");
  if (rating === "good") {
    markGold(hash);
    console.log(`[feedback] 👍 gold: ${question.slice(0, 50)}`);
  } else if (rating === "bad") {
    // Queue for repair before deleting — daemon will regenerate a better answer
    const cached = cacheGet(hash);
    addToRepairQueue({ question, board: board || "general", subject: subject || "general", style: style || "stepbystep", lang: lang || "en", old_answer: cached?.answer || "" });
    deleteBad(hash);
    console.log(`[feedback] 👎 queued for repair + removed: ${question.slice(0, 50)}`);
  }
  res.json({ ok: true });
});

// ── GET /api/brain ─────────────────────────────────────────────────────────────
app.get("/api/brain", async (_, res) => {
  try {
    const id = existsSync(IDENTITY_FILE) ? JSON.parse(readFileSync(IDENTITY_FILE, "utf8")) : {};
    const { getPatchLog } = await import("./patcher.js");
    res.json({ identity: id, codeReviews: getCodeReviews(5), patches: getPatchLog(10) });
  } catch (e) { res.json({ identity: {}, codeReviews: [], patches: [] }); }
});

// ── POST /api/patches/apply ────────────────────────────────────────────────────
app.post("/api/patches/apply", async (req, res) => {
  const { patchFile } = req.body;
  if (!patchFile) return res.status(400).json({ error: "patchFile required" });
  try {
    const { applyPatch, parsePatch } = await import("./patcher.js");
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const raw   = readFileSync(join(__dirname, "patches", patchFile), "utf8");
    const patch = parsePatch(raw);
    const result = applyPatch(patch);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/chat/stream/:jobId — SSE live thinking + content ────────────────
app.get("/api/chat/stream/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found or expired" });

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if present
  res.flushHeaders();

  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  // Race condition: job already finished before SSE connected
  if (job.status === "done") {
    send("done", { content: job.result?.content ?? "", canvas: job.result?.canvas ?? null, thinking: job.result?.thinking ?? null, selfCorrected: job.result?.selfCorrected ?? false });
    return res.end();
  }
  if (job.status === "error") {
    send("appError", { error: job.error });
    return res.end();
  }

  // Send current queue position
  const pos = queue.findIndex(q => q.jobId === req.params.jobId);
  send("queued", { position: pos === -1 ? (processing ? 0 : 1) : pos + 1 });

  jobStreams.set(req.params.jobId, send);

  // Heartbeat — sends a comment every 20s to keep connection alive through proxies/load balancers
  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 20_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    jobStreams.delete(req.params.jobId);
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[server error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Taksha serving on http://localhost:${PORT}`);
  console.log(`Model: ${OLLAMA_MODEL} @ ${OLLAMA_HOST}`);
  console.log(`Dev Vite port: 5175 | Prod port: ${PORT}`);
});
