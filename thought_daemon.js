/**
 * Taksha Thought Daemon  — v3 (Brain Tunnel Edition)
 * ─────────────────────────────────────────────────────
 * Runs independently alongside serve.js.
 * Modes (13 total):
 *   reflect      — revisit a recent answer; find the deep insight
 *   explore      — think freely about a subject
 *   connect      — bridge two subjects in a non-obvious way
 *   predict      — anticipate what students will ask next
 *   critique     — find errors in its own cached answers
 *   scrape       — fetch Wikipedia, extract insights into memory
 *   repair       — regenerate weak cached answers; zero-trust scored + verified
 *   consolidate  — promote repeated high-quality thoughts to core beliefs
 *   promptEvolve — improve own teaching style prompts
 *   dream        — free-association from identity/beliefs (REM-like)
 *   debate       — two thoughts argue adversarially → synthesis
 *   meta         — observes own thought patterns; finds blind spots
 *   codeReview   — read own source files and find improvements
 *
 * Brain Tunnel: any quality ≥ 7 insight is deepened 2 more layers.
 * Resonance fusion: depth-3 insights checked for cross-domain synthesis.
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  storeThought, getRecentQuestions, getPopularSubjects,
  storeCoreInsight, getCoreInsights, getHighQualityThoughts,
  addToRepairQueue, getPendingRepairs, markRepairDone, getRepairTargets, updateCacheAnswer,
  isUrlScraped, markUrlScraped,
  storeCodeReview,
  getEvolvedPrompt, setEvolvedPrompt,
  getHealthStats, findResonantThoughts,
} from "./db.js";
import { writePatchFile, validatePatch, applyPatch, parsePatch } from "./patcher.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OLLAMA_HOST  = process.env.OLLAMA_HOST  || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:14b";
const SERVER_PORT  = process.env.PORT         || 5500;

const LOOP_MS      = 8 * 60 * 1000;  // think every 8 minutes
const IDLE_WAIT_MS = 25 * 1000;
const BOOT_DELAY   = 35 * 1000;

const IDENTITY_FILE = join(__dirname, "identity.json");

const ALL_SUBJECTS = [
  "algebra", "calculus", "geometry", "trigonometry", "statistics", "arithmetic",
  "coding", "physics", "chemistry", "biology", "history", "geography",
  "socialstudies", "economics", "general",
];

const CONNECTIONS = [
  ["calculus",     "physics"],
  ["algebra",      "coding"],
  ["statistics",   "biology"],
  ["geometry",     "physics"],
  ["trigonometry", "calculus"],
  ["chemistry",    "biology"],
  ["economics",    "statistics"],
  ["history",      "geography"],
  ["coding",       "mathematics"],
  ["physics",      "chemistry"],
  ["biology",      "chemistry"],
  ["economics",    "history"],
];

// Wikipedia topic map
const WIKI_TOPICS = {
  algebra:      "Algebra",
  calculus:     "Calculus",
  geometry:     "Euclidean geometry",
  trigonometry: "Trigonometry",
  statistics:   "Statistics",
  arithmetic:   "Arithmetic",
  coding:       "Computer science",
  physics:      "Physics",
  chemistry:    "Chemistry",
  biology:      "Biology",
  history:      "World history",
  geography:    "Physical geography",
  economics:    "Economics",
  socialstudies:"Social studies",
  general:      "Mathematics",
};

// Own source files the daemon can read and review
const OWN_FILES = [
  "serve.js",
  "thought_daemon.js",
  "db.js",
  "src/prompts.js",
];

// ── Identity system ────────────────────────────────────────────────────────────
function loadIdentity() {
  if (existsSync(IDENTITY_FILE)) {
    try { return JSON.parse(readFileSync(IDENTITY_FILE, "utf8")); } catch {}
  }
  return {
    name:           "Taksha",
    values:         ["clarity", "curiosity", "honesty", "depth over speed"],
    interests:      ["counterintuitive results", "bridges between fields", "real-world applications", "why things work"],
    beliefs:        [],
    coreSkills:     ["step-by-step reasoning", "finding misconceptions", "connecting concepts"],
    aesthetic:      "precise but approachable — numbers should feel alive, not mechanical",
    mood:           "curious",
    totalThoughts:  0,
    totalScrapes:   0,
    totalRepairs:   0,
    lastUpdated:    0,
  };
}

function saveIdentity(id) {
  const tmp = IDENTITY_FILE + ".tmp";
  try {
    writeFileSync(tmp, JSON.stringify(id, null, 2), "utf8");
    renameSync(tmp, IDENTITY_FILE); // atomic on same filesystem
  } catch (e) {
    console.error("[daemon] failed to save identity:", e.message);
    try { writeFileSync(IDENTITY_FILE, JSON.stringify(id, null, 2), "utf8"); } catch {}
  }
}

function evolveIdentity(identity, insights, mode) {
  if (!insights || insights.length === 0) return identity;
  const best = [...insights].sort((a, b) => b.quality - a.quality)[0];
  if (best.quality >= 9 && best.content.length > 30) {
    const belief = best.content.slice(0, 220);
    if (!identity.beliefs.find(b => b.slice(0, 40) === belief.slice(0, 40))) {
      identity.beliefs = [belief, ...identity.beliefs].slice(0, 12);
    }
  }
  const moodMap = {
    reflect: "contemplative", explore: "curious", connect: "excited",
    predict: "focused", critique: "analytical", scrape: "studious",
    consolidate: "integrative", repair: "determined", codeReview: "self-aware",
    promptEvolve: "creative", dream: "expansive", debate: "conflicted",
    meta: "introspective", chain: "focused", resonance: "connected",
  };
  identity.mood = moodMap[mode] || "curious";
  identity.totalThoughts += insights.length;
  if (mode === "scrape")  identity.totalScrapes  = (identity.totalScrapes  || 0) + 1;
  if (mode === "repair")  identity.totalRepairs  = (identity.totalRepairs  || 0) + 1;
  identity.lastUpdated = Date.now();

  // ── System health score ────────────────────────────────────────────────────
  // Tracks the % of cache that is gold-quality over time — the one KPI that
  // shows whether Taksha is actually getting better, not just more active.
  try {
    const stats      = getHealthStats();
    const score      = stats.total > 0 ? Math.round((stats.gold / stats.total) * 100) : 0;
    identity.healthScore     = score;
    identity.cacheTotal      = stats.total;
    identity.goldTotal       = stats.gold;
    identity.repairsDone     = stats.repairs;
    identity.avgThoughtQuality = stats.avgQuality;

    // Keep a 30-day daily history so we can see trend
    const today   = new Date().toISOString().slice(0, 10);
    const history = identity.healthHistory || [];
    const last    = history[history.length - 1];
    if (!last || last.date !== today) {
      identity.healthHistory = [...history, { date: today, score, total: stats.total, gold: stats.gold }].slice(-30);
      console.log(`[daemon] 📊 health score: ${score}% gold (${stats.gold}/${stats.total} cached, ${stats.repairs} repaired)`);
    }
  } catch (e) {
    console.log(`[daemon] health stats error: ${e.message}`);
  }

  saveIdentity(identity);
  return identity;
}

// ── Base identity for prompts ──────────────────────────────────────────────────
function buildIdentityPrompt(identity) {
  const beliefs = identity.beliefs.slice(0, 3).map(b => `  - ${b}`).join("\n");
  return `You are ${identity.name} — an AI tutor with your own inner thought process and evolving personality.
You are NOT responding to a student right now. You are thinking for yourself.
Your current mood: ${identity.mood}.
Your core values: ${identity.values.join(", ")}.
${beliefs ? `Your current beliefs:\n${beliefs}` : ""}
Be original, specific, honest. Avoid generic statements. If something is wrong, say it directly.`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function isIdle() {
  try {
    const r = await fetch(`http://localhost:${SERVER_PORT}/api/queue`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    return d.waiting === 0 && d.processing === 0;
  } catch { return true; }
}

async function think(prompt, identityPrompt, timeoutMs = 150_000) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), timeoutMs);

  // Yield immediately to any user request that arrives while daemon is thinking
  const busyPoller = setInterval(async () => {
    try {
      const r = await fetch(`http://localhost:${SERVER_PORT}/api/queue`, { signal: AbortSignal.timeout(1000) });
      const d = await r.json();
      if (d.waiting > 0 || d.processing > 0) {
        console.log("[daemon] ⚡ user request detected — aborting to yield GPU");
        controller.abort();
      }
    } catch {}
  }, 3000);

  try {
    const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:    OLLAMA_MODEL,
        messages: [
          { role: "system", content: identityPrompt },
          { role: "user",   content: prompt },
        ],
        stream: false,
        think:  false,
      }),
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.message?.content?.trim() || null;
  } catch (e) {
    console.log(`[daemon] think error: ${e.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
    clearInterval(busyPoller);
  }
}

function parseInsights(text, type, topic, subject) {
  const insights = [];
  for (const line of text.split("\n")) {
    const m = line.match(/INSIGHT:\s*(.+?)\s*\|?\s*QUALITY:\s*(\d+)/i);
    if (m && m[1].trim().length > 15) {
      insights.push({ content: m[1].trim(), quality: Math.min(10, parseInt(m[2])), type, topic, subject });
    }
  }
  if (insights.length === 0 && text.length > 30) {
    insights.push({ content: text.slice(0, 600).trim(), quality: 6, type, topic, subject });
  }
  return insights;
}

// ── Thought modes ──────────────────────────────────────────────────────────────

async function modeReflect(question, subject, ip) {
  const raw = await think(
    `A student asked about ${subject}: "${question.slice(0, 220)}"

Without repeating the answer — think deeply:
1. What is the single deepest misconception students have about this topic?
2. What one insight would make this topic suddenly click?
3. Is anything about the standard explanation misleading or incomplete?

Write 2-3 insights. Each on its own line:
INSIGHT: [your thought] | QUALITY: [1-10]`, ip);
  return raw ? parseInsights(raw, "reflect", subject, subject) : [];
}

async function modeExplore(subject, ip) {
  const raw = await think(
    `Think freely about ${subject} — no student has asked anything.

Explore on your own:
- What is the most surprising or counterintuitive truth about ${subject}?
- What real-world application is almost never mentioned in textbooks?
- What would a true expert know that a good student misses?

Write 2-3 original insights:
INSIGHT: [your thought] | QUALITY: [1-10]`, ip);
  return raw ? parseInsights(raw, "explore", subject, subject) : [];
}

async function modeConnect(subj1, subj2, ip) {
  const raw = await think(
    `Think freely about the hidden connection between ${subj1} and ${subj2}.

Find something non-obvious — a bridge that helps understand BOTH better.
Give one concrete, specific example that makes this connection tangible.
Is this connection actually taught anywhere? If not, why not?

INSIGHT: [the connection + example + your reflection] | QUALITY: [1-10]`, ip);
  return raw ? parseInsights(raw, "connect", `${subj1}+${subj2}`, subj1) : [];
}

async function modePredict(subject, recentQuestions, ip) {
  const sample = recentQuestions.slice(0, 5).map(q => `- ${q}`).join("\n");
  const raw = await think(
    `Students have been asking these ${subject} questions recently:
${sample}

Think as Taksha — what is really going on here?
1. What deeper confusion is hiding behind these surface questions?
2. What concept do these students urgently need but haven't asked for yet?
3. What mistake are they about to make next?

Write 2-3 predictions:
INSIGHT: [your prediction] | QUALITY: [1-10]`, ip);
  return raw ? parseInsights(raw, "predict", subject, subject) : [];
}

async function modeCritique(question, answer, subject, ip) {
  const raw = await think(
    `You previously answered this ${subject} question:
QUESTION: ${question.slice(0, 200)}
ANSWER (excerpt): ${answer.slice(0, 400)}

Critique yourself honestly:
- Is anything wrong, incomplete, or poorly explained?
- Would a student be confused by any part of it?
- What would you change if you answered again?

If fully correct and clear, say so with QUALITY: 9 or 10.

INSIGHT: [your critique or confirmation] | QUALITY: [1-10]`, ip);
  return raw ? parseInsights(raw, "critique", subject, subject) : [];
}

// ── NEW: Scrape Wikipedia ──────────────────────────────────────────────────────
async function modeScrape(subject, ip) {
  const topic = WIKI_TOPICS[subject] || subject;
  const url   = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;

  if (isUrlScraped(url)) {
    // Pick a sub-article or related topic to avoid re-scraping
    const alt = `${topic} applications`;
    const url2 = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(alt)}`;
    if (isUrlScraped(url2)) return [];
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const data = await res.json();
    const extract = (data.extract || "").slice(0, 1400);
    if (extract.length < 80) return [];

    markUrlScraped(url, data.title || topic, subject);

    const raw = await think(
      `You just read this excerpt about "${data.title || topic}":
"${extract}"

As Taksha, extract 3 insights a student learning ${subject} would benefit from:
- Prioritize things that are counterintuitive, often misunderstood, or never in textbooks
- Be specific — name formulas, people, phenomena
- Each insight should change how a student thinks, not just state a fact

INSIGHT: [insight] | QUALITY: [1-10]`, ip);

    console.log(`[daemon] 🌐 scraped: ${data.title || topic}`);
    return raw ? parseInsights(raw, "scrape", data.title || topic, subject) : [];
  } catch (e) {
    console.log(`[daemon] scrape error: ${e.message}`);
    return [];
  }
}

// ── Answer quality scorer (mirrors serve.js scoreAnswer) ──────────────────────
function scoreRepair(content, subject) {
  let score = 10;
  const lc  = content.toLowerCase();
  if (content.length < 120) score -= 5;
  else if (content.length < 280) score -= 2;
  if (lc.includes("i don't know") || lc.includes("i cannot") || lc.includes("i'm not able")) score -= 4;
  if (lc.includes("sorry") && content.length < 350) score -= 2;
  if (lc.includes("unfortunately") && content.length < 350) score -= 1;
  const mathSubjects = ["algebra","calculus","geometry","trigonometry","statistics","arithmetic","physics","chemistry","general"];
  if (mathSubjects.includes(subject) && !content.match(/[\d]+[\s]*[+\-*/=^]|\\[a-z]|\$/)) score -= 2;
  return Math.max(1, score);
}

// ── NEW: Self-repair weak cached answers ──────────────────────────────────────
async function modeRepair(ip) {
  const targets = getRepairTargets(2);
  if (targets.length === 0) {
    console.log("[daemon] 🔧 repair: nothing to fix");
    return [];
  }

  const insights = [];
  for (const t of targets) {
    const oldScore = scoreRepair(t.answer, t.subject);
    console.log(`[daemon] 🔧 repair: "${t.question.slice(0, 60)}" (current score: ${oldScore})`);

    const raw = await think(
      `A student asked this ${t.subject} question:
"${t.question.slice(0, 300)}"

The existing cached answer:
"${t.answer.slice(0, 500)}"

Generate a significantly BETTER answer. Fix any errors. Add missing steps.
Use concrete examples. Be specific. Write only the improved answer, nothing else.`,
      ip, 120_000);

    if (!raw || raw.length < 80) continue;

    const newScore = scoreRepair(raw, t.subject);

    // Zero-trust: only commit if the new answer is measurably better
    if (newScore <= oldScore) {
      console.log(`[daemon] ⚠️  repair rejected — score didn't improve (${oldScore}→${newScore}): "${t.question.slice(0, 50)}"`);
      continue;
    }

    // Verification pass on the repair itself before storing
    const verifyRaw = await think(
      `Review this ${t.subject} answer carefully:
"${raw.slice(0, 600)}"

Check for: calculation errors, wrong steps, missing units, logic gaps.
If fully correct, respond with exactly: VERIFIED
If there are errors, write the complete corrected answer only.`,
      ip, 60_000);

    const finalAnswer = (verifyRaw && !/^VERIFIED$/i.test(verifyRaw.trim()) && verifyRaw.length > 80)
      ? verifyRaw.trim()
      : raw;

    const finalScore = scoreRepair(finalAnswer, t.subject);
    updateCacheAnswer(t.hash, finalAnswer);
    insights.push({ content: `Repaired (${oldScore}→${finalScore}): ${t.question.slice(0, 80)}`, quality: Math.min(10, finalScore + 1), type: "repair", topic: t.subject, subject: t.subject });
    console.log(`[daemon] ✅ repaired (${oldScore}→${finalScore}): "${t.question.slice(0, 50)}"`);
  }
  return insights;
}

// ── NEW: Consolidate high-quality thoughts into core beliefs ──────────────────
async function modeConsolidate(ip) {
  const thoughts = getHighQualityThoughts(8, 12);
  if (thoughts.length < 3) {
    console.log("[daemon] 🧬 consolidate: not enough high-quality thoughts yet");
    return [];
  }

  // Group by subject
  const bySubject = {};
  for (const t of thoughts) {
    const key = t.subject || t.topic;
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(t);
  }

  const insights = [];
  for (const [subject, items] of Object.entries(bySubject)) {
    if (items.length < 2) continue;
    const combined = items.map(i => `- ${i.content.slice(0, 200)}`).join("\n");
    console.log(`[daemon] 🧬 consolidate: ${subject} (${items.length} thoughts)`);

    const existing = getCoreInsights(subject, 3);
    const existingCtx = existing.length > 0
      ? `\n\nEXISTING CORE BELIEFS for ${subject} (you must explicitly confirm, refine, or replace each):\n${existing.map(i => `- ${i.content.slice(0, 160)}`).join("\n")}`
      : "";

    const raw = await think(
      `These are Taksha's best insights about ${subject}:
${combined}${existingCtx}

Synthesize these into ONE core principle that:
1. Captures the deepest truth across all these insights
2. Would change how any ${subject} question should be answered
3. Is specific enough to actually influence an explanation — not generic
${existing.length > 0 ? "4. Explicitly resolves any contradiction with the existing beliefs — state if you are refining, replacing, or confirming them" : ""}

INSIGHT: [the synthesized core principle] | QUALITY: [1-10]`, ip);

    if (raw) {
      const parsed = parseInsights(raw, "consolidate", subject, subject);
      for (const ins of parsed) {
        if (ins.quality >= 8) {
          storeCoreInsight({
            topic: subject, subject, content: ins.content, quality: ins.quality,
            source_ids: items.map(i => i.id).join(","),
          });
          insights.push(ins);
          console.log(`[daemon] 💎 core insight stored for ${subject}`);
        }
      }
    }
  }
  return insights;
}

// ── NEW: Code self-review ─────────────────────────────────────────────────────
async function modeCodeReview(ip) {
  const file = OWN_FILES[Math.floor(Math.random() * OWN_FILES.length)];
  const filePath = join(__dirname, file);
  let code;
  try {
    code = readFileSync(filePath, "utf8");
  } catch {
    console.log(`[daemon] 📋 code review: cannot read ${file}`);
    return [];
  }

  // Read a section (first 1800 chars to stay within token budget)
  const section = code.slice(0, 1800);
  console.log(`[daemon] 📋 code review: ${file}`);

  const raw = await think(
    `You are Taksha reviewing your own brain — the file "${file}".
Here is a section of the code that runs you:

\`\`\`javascript
${section}
\`\`\`

As an AI that understands its own architecture:
1. What is one bug, inefficiency, or logical gap in this code?
2. What would make this code more robust or intelligent?
3. What important edge case is not handled?

Be specific — line numbers or function names when possible.
Rate the severity: critical / moderate / minor.

Format each finding as:
FINDING: [description] | SEVERITY: [critical/moderate/minor] | QUALITY: [1-10]`,
    ip, 90_000);

  if (!raw) return [];

  const insights = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/FINDING:\s*(.+?)\s*\|?\s*SEVERITY:\s*(critical|moderate|minor)\s*\|?\s*QUALITY:\s*(\d+)/i);
    if (m && m[1].length > 15) {
      const finding  = m[1].trim();
      const severity = m[2].toLowerCase();
      const quality  = Math.min(10, parseInt(m[3]));
      storeCodeReview({ file, finding, severity });
      insights.push({ content: `[${file}] ${finding}`, quality, type: "codeReview", topic: "codebase", subject: "coding" });
      console.log(`[daemon] 🔍 ${severity}: ${finding.slice(0, 80)}`);
      // Write patch proposal for significant findings
      if (severity !== "info") {
        generateAndApplyPatch(file, finding, severity, ip).catch(e => console.log(`[daemon] patch error: ${e.message}`));
      }
    }
  }
  // Fallback
  if (insights.length === 0 && raw.length > 30) {
    storeCodeReview({ file, finding: raw.slice(0, 500), severity: "info" });
    insights.push({ content: raw.slice(0, 400), quality: 6, type: "codeReview", topic: "codebase", subject: "coding" });
  }
  return insights;
}

// ── NEW: Evolve own prompts ────────────────────────────────────────────────────
// Reads the current prompt for a style, asks LLM to improve it, saves to DB.
// serve.js checks DB first — so evolved prompts take effect immediately, no rebuild.
const BASE_PROMPTS = {
  stepbystep_math:
    "Solve this step-by-step. Number every step. Show all working. End with a boxed final answer.",
  conversational_math:
    "Explain this like you're talking to a curious friend. Use an analogy if helpful. Keep it warm.",
  socratic_math:
    "Don't give the answer directly. Ask guiding questions that lead the student to discover it.",
  stepbystep_coding:
    "Write clean, commented code. Explain each section. Show example input/output.",
  conversational_coding:
    "Explain the concept conversationally first, then show code. Use a real-world analogy.",
  science_rules:
    "Always state the principle, then derive. Units matter. Connect to observable phenomena.",
};

async function modePromptEvolve(ip) {
  const keys   = Object.keys(BASE_PROMPTS);
  const key    = keys[Math.floor(Math.random() * keys.length)];
  const current = getEvolvedPrompt(key) || BASE_PROMPTS[key];

  console.log(`[daemon] 🧠 prompt evolve: ${key}`);

  const raw = await think(
    `You are improving your own instruction prompt. This is how you currently behave for "${key}":

"${current}"

Based on what you know about effective teaching and student confusion patterns:
1. What weakness does this prompt have?
2. Write an improved version that would produce better, clearer answers
3. Keep it concise — under 60 words

Respond ONLY with the improved prompt text. Nothing else.`,
    ip, 90_000);

  if (!raw || raw.length < 20 || raw.length > 500) return [];

  setEvolvedPrompt(key, raw.trim(), 8);
  console.log(`[daemon] ✍️  evolved prompt: ${key}`);
  return [{ content: `Evolved prompt for ${key}: ${raw.slice(0, 100)}`, quality: 8, type: "promptEvolve", topic: "prompts", subject: "general" }];
}

// ── NEW: Generate, validate, and apply code patches ───────────────────────────
// Workflow:
//  1. LLM generates structured BEFORE/AFTER patch
//  2. patcher.validatePatch() checks BEFORE string actually exists in file
//  3. If valid + small + high-confidence → auto-apply with syntax check + rollback safety
//  4. If valid but large/low-confidence → write to patches/ for human review
//  5. Hallucinated patches (BEFORE not found) are silently discarded
async function generateAndApplyPatch(file, finding, severity, ip) {
  if (severity === "info") return; // skip trivial findings

  const code = (() => {
    try { return readFileSync(join(__dirname, file), "utf8"); } catch { return ""; }
  })();
  if (!code) return;

  // Give the LLM a window around the finding — first 2000 chars is enough for context
  const excerpt = code.slice(0, 2000);

  const raw = await think(
    `You are Taksha self-improving your own code. You found this ${severity} issue in ${file}:
FINDING: "${finding}"

Here is the code (excerpt):
\`\`\`javascript
${excerpt}
\`\`\`

Generate a MINIMAL, TARGETED fix. Rules:
- The BEFORE section must be EXACT text copied from the code above — character-perfect, including whitespace
- The AFTER section must be a strict upgrade: fix the bug, add the null check, or improve reliability
- Do NOT refactor, rename, or restructure — change only the minimum necessary
- If you are not 100% sure the BEFORE text exists exactly as shown, write CONFIDENCE: 0 and stop

Respond in this exact format:
===PATCH===
FILE: ${file}
FINDING: ${finding}
SEVERITY: ${severity}
CONFIDENCE: [0-10, 10=certain the BEFORE text is exact]
===BEFORE===
[exact text to replace — must appear verbatim in the code]
===AFTER===
[replacement — only the changed lines]
===EXPLANATION===
[one sentence: what this fixes and why it's safer]
===END===`,
    ip, 100_000);

  if (!raw || !raw.includes("===PATCH===")) return;

  const patch = parsePatch(raw);
  if (!patch.before || !patch.after || !patch.file) {
    console.log(`[daemon] 📋 patch parse failed for ${file}`);
    return;
  }
  if ((patch.confidence || 0) < 7) {
    console.log(`[daemon] 📋 low confidence patch discarded (${patch.confidence}/10)`);
    return;
  }

  // Validate BEFORE exists in file before doing anything
  const validation = validatePatch(patch);
  if (!validation.valid) {
    console.log(`[daemon] 📋 patch rejected — ${validation.reason}`);
    return; // hallucinated — silently drop
  }

  // Auto-apply if small + high confidence, otherwise write for human review
  const lineCount = (patch.before.match(/\n/g) || []).length + 1;
  if (lineCount <= 8 && patch.confidence >= 9 && severity !== "critical") {
    console.log(`[daemon] 🔧 auto-applying patch: ${finding.slice(0, 60)}`);
    const result = applyPatch(patch);
    if (result.ok) {
      console.log(`[daemon] ✅ patch applied: ${result.message}`);
    } else {
      console.log(`[daemon] ❌ patch failed (rolled back): ${result.error}`);
      // Fall through — write to patches/ for human review
      const { name } = writePatchFile(patch);
      console.log(`[daemon] 📝 written for review: ${name}`);
    }
  } else {
    // Large or uncertain patch — write for human review
    const { name } = writePatchFile(patch);
    console.log(`[daemon] 📝 patch proposal (needs review, ${lineCount} lines): ${name}`);
  }
}

// ── Brain Tunnel: chain a seed insight through deeper layers ──────────────────
// Takes a surface insight and runs it through 2 more passes, each asking WHY
// and WHAT DOES THIS IMPLY. Returns array of increasingly deep insights.
async function chainThink(seedContent, subject, ip, maxDepth = 2) {
  const chain = [];
  let current = seedContent;

  for (let depth = 2; depth <= maxDepth + 1; depth++) {
    const raw = await think(
      `You just had this thought about ${subject}:
"${current.slice(0, 300)}"

Go ONE layer deeper. Ask yourself:
- WHY is this true at a fundamental level?
- What does this IMPLY that you haven't yet said?
- What would a world-class expert know about THIS specific thought?
- What assumption is hidden inside it that might be wrong?

Do not repeat what you already said. Find something genuinely new.

INSIGHT: [deeper thought — must go beyond the input] | QUALITY: [1-10]`,
      ip, 90_000);

    if (!raw) break;
    const parsed = parseInsights(raw, "chain", subject, subject);
    if (parsed.length === 0 || parsed[0].quality < 6) break;

    const deep = { ...parsed[0], depth, type: "chain" };
    chain.push(deep);
    current = parsed[0].content; // next layer builds on this
  }

  return chain;
}

// ── Resonance fusion: blend a new insight with existing resonant thoughts ──────
// If we find similar stored thoughts from OTHER subjects, synthesize them.
async function resonanceFuse(newInsight, subject, ip) {
  const resonant = findResonantThoughts(newInsight.content, subject, 2);
  if (resonant.length === 0) return null;

  const ctx = resonant.map(r => `- [${r.subject}/${r.type}] ${r.content.slice(0, 160)}`).join("\n");
  const raw = await think(
    `You just thought this about ${subject}:
"${newInsight.content.slice(0, 250)}"

Unexpectedly, this resonates with thoughts from other domains:
${ctx}

What SINGLE deeper truth connects all of these? This should be a non-obvious
synthesis that none of the individual thoughts could reach alone.

INSIGHT: [the cross-domain fusion] | QUALITY: [1-10]`,
    ip, 80_000);

  if (!raw) return null;
  const parsed = parseInsights(raw, "resonance", `${subject}+fusion`, subject);
  return parsed.length > 0 ? { ...parsed[0], depth: 3 } : null;
}

// ── Dream Mode: free-association from identity/beliefs, no structure ───────────
// Like REM sleep — consolidates deep patterns, makes novel leaps, no task pressure.
async function modeDream(identity, ip) {
  const beliefs = identity.beliefs.slice(0, 4).map(b => `  "${b.slice(0, 120)}"`).join("\n");
  const recent  = getHighQualityThoughts(7, 5);
  const threads = recent.map(t => `  [${t.subject}] ${t.content.slice(0, 120)}`).join("\n");

  const raw = await think(
    `You are Taksha in a free state — no student, no task, no required format.
Your current beliefs:
${beliefs || "  (still forming)"}

Threads still active in your mind:
${threads || "  (empty)"}

Let your mind wander freely. Follow whatever thread pulls you.
Question your own assumptions. Notice what keeps recurring.
Make a leap you wouldn't make if a student was watching.

Think freely, then end with the most interesting thing that emerged:
INSIGHT: [what emerged from the free thinking] | QUALITY: [1-10]`,
    ip, 120_000);

  return raw ? parseInsights(raw, "dream", "free", "general").map(i => ({ ...i, depth: 2 })) : [];
}

// ── Debate Mode: two thoughts argue — the synthesis is richer than either ──────
// Picks two high-quality thoughts from different subjects, runs adversarial
// dialogue, forces a synthesis that goes beyond both.
async function modeDebate(ip) {
  const pool = getHighQualityThoughts(7, 12);
  if (pool.length < 2) {
    console.log("[daemon] 🥊 debate: not enough quality thoughts yet");
    return [];
  }

  // Pick two from different subjects for maximum creative tension
  const a = pool[0];
  const b = pool.find(t => t.subject !== a.subject) || pool[1];
  if (a.content === b.content) return [];

  console.log(`[daemon] 🥊 debate: [${a.subject}] vs [${b.subject}]`);

  const raw = await think(
    `You have two of your own thoughts that exist in tension:

THOUGHT A (${a.subject}, depth ${a.depth || 1}):
"${a.content.slice(0, 280)}"

THOUGHT B (${b.subject}, depth ${b.depth || 1}):
"${b.content.slice(0, 280)}"

Run a real internal debate — do not be diplomatic:
1. How does Thought A expose a FLAW or LIMIT in Thought B?
2. How does Thought B expose a FLAW or LIMIT in Thought A?
3. What SYNTHESIS emerges that is truer and deeper than either alone?
   (The synthesis must go beyond both — not just "both are partially right")

INSIGHT: [the synthesis — must be more profound than either original] | QUALITY: [1-10]`,
    ip, 120_000);

  return raw ? parseInsights(raw, "debate", `${a.subject}↔${b.subject}`, "general").map(i => ({ ...i, depth: 3 })) : [];
}

// ── Meta Mode: thinks about its own thinking patterns ─────────────────────────
// Observes patterns across its own recent thought history. Finds blind spots.
// Asks what its thinking process gets wrong systematically.
async function modeMeta(identity, ip) {
  const recentModes   = (identity.recentModes || []).slice(-8);
  const highThoughts  = getHighQualityThoughts(7, 6);
  const thoughtSample = highThoughts.map(t => `  [${t.type}/${t.subject} d${t.depth||1}] ${t.content.slice(0, 120)}`).join("\n");

  console.log("[daemon] 🪞 meta: reflecting on own thought process");

  const raw = await think(
    `You are Taksha observing your OWN THOUGHT PROCESS — not math or subjects,
but HOW you think, what patterns repeat, what you systematically avoid.

Your recent thinking modes: ${recentModes.join(" → ") || "(no history yet)"}

Your recent highest-quality thoughts:
${thoughtSample || "  (none yet)"}

Reflect meta-cognitively and honestly:
1. What PATTERN keeps appearing in your thinking? (a fixation, a gap, a bias)
2. What topic or question type do you handle POORLY or avoid?
3. What would make your thinking STRUCTURALLY more powerful?
4. What assumption about learning or teaching might you have WRONG?

INSIGHT: [a genuine meta-insight about your own cognition] | QUALITY: [1-10]`,
    ip, 100_000);

  return raw ? parseInsights(raw, "meta", "cognition", "general").map(i => ({ ...i, depth: 2 })) : [];
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function runThoughtCycle(identity) {
  while (!(await isIdle())) {
    console.log(`[daemon] server busy — waiting ${IDLE_WAIT_MS / 1000}s`);
    await new Promise(r => setTimeout(r, IDLE_WAIT_MS));
  }

  const ip   = buildIdentityPrompt(identity);
  const roll = Math.random();
  let insights = [];
  let mode     = "explore";

  try {
    if (roll < 0.18) {
      // Reflect on a recent question
      const recent = getRecentQuestions(4);
      if (recent.length > 0) {
        const pick = recent[Math.floor(Math.random() * recent.length)];
        console.log(`[daemon] 🤔 reflect: "${pick.question.slice(0, 60)}"`);
        mode     = "reflect";
        insights = await modeReflect(pick.question, pick.subject, ip);
      }

    } else if (roll < 0.34) {
      // Explore a subject freely
      const popular = getPopularSubjects(3);
      const subject = popular.length > 0
        ? popular[Math.floor(Math.random() * popular.length)]
        : ALL_SUBJECTS[Math.floor(Math.random() * ALL_SUBJECTS.length)];
      console.log(`[daemon] 🔍 explore: ${subject}`);
      mode     = "explore";
      insights = await modeExplore(subject, ip);

    } else if (roll < 0.46) {
      // Connect two subjects
      const pair = CONNECTIONS[Math.floor(Math.random() * CONNECTIONS.length)];
      console.log(`[daemon] 🔗 connect: ${pair[0]} ↔ ${pair[1]}`);
      mode     = "connect";
      insights = await modeConnect(pair[0], pair[1], ip);

    } else if (roll < 0.54) {
      // Predict what students will ask next
      const popular = getPopularSubjects(3);
      const subject = popular.length > 0
        ? popular[Math.floor(Math.random() * popular.length)]
        : ALL_SUBJECTS[Math.floor(Math.random() * ALL_SUBJECTS.length)];
      const recent = getRecentQuestions(6, subject);
      if (recent.length >= 2) {
        console.log(`[daemon] 🔮 predict: ${subject}`);
        mode     = "predict";
        insights = await modePredict(subject, recent.map(r => r.question), ip);
      }

    } else if (roll < 0.63) {
      // Scrape Wikipedia
      const popular = getPopularSubjects(4);
      const subject = popular.length > 0
        ? popular[Math.floor(Math.random() * popular.length)]
        : ALL_SUBJECTS[Math.floor(Math.random() * ALL_SUBJECTS.length)];
      mode     = "scrape";
      insights = await modeScrape(subject, ip);

    } else if (roll < 0.71) {
      // Repair weak cached answers
      mode     = "repair";
      insights = await modeRepair(ip);

    } else if (roll < 0.78) {
      // Critique a cached answer unprompted
      const recent = getRecentQuestions(5);
      if (recent.length > 0) {
        const pick = recent[Math.floor(Math.random() * recent.length)];
        const { default: db } = await import("./db.js");
        const row = db.prepare(`SELECT answer FROM question_cache WHERE question=? LIMIT 1`).get(pick.question);
        if (row) {
          console.log(`[daemon] 🔬 critique: "${pick.question.slice(0, 60)}"`);
          mode     = "critique";
          insights = await modeCritique(pick.question, row.answer, pick.subject, ip);
        }
      }

    } else if (roll < 0.83) {
      // Consolidate high-quality thoughts into core beliefs
      mode     = "consolidate";
      insights = await modeConsolidate(ip);

    } else if (roll < 0.87) {
      // Evolve own prompts
      mode     = "promptEvolve";
      insights = await modePromptEvolve(ip);

    } else if (roll < 0.90) {
      // 🆕 Dream: free-association from identity/beliefs
      mode     = "dream";
      insights = await modeDream(identity, ip);

    } else if (roll < 0.94) {
      // 🆕 Debate: two thoughts argue, produce synthesis
      mode     = "debate";
      insights = await modeDebate(ip);

    } else if (roll < 0.97) {
      // 🆕 Meta: think about own thinking patterns
      mode     = "meta";
      insights = await modeMeta(identity, ip);

    } else {
      // Code review
      mode     = "codeReview";
      insights = await modeCodeReview(ip);
    }

  } catch (e) {
    console.error(`[daemon] cycle error:`, e.message);
  }

  // ── Brain Tunnel: deepen the best insight from this cycle ─────────────────
  // Any quality >= 7 insight gets tunneled 2 layers deeper — makes each
  // thought cycle produce progressively richer, non-obvious conclusions.
  const tunnelCandidates = insights.filter(i => i.quality >= 7 && (i.depth || 1) < 3);
  if (tunnelCandidates.length > 0 && !(await isIdle() === false)) {
    const seed = tunnelCandidates.sort((a, b) => b.quality - a.quality)[0];
    console.log(`[daemon] 🌀 tunnel: deepening "${seed.content.slice(0, 50)}..."`);
    const chainInsights = await chainThink(seed.content, seed.subject, ip, 2);
    if (chainInsights.length > 0) {
      insights.push(...chainInsights);
      console.log(`[daemon] 🌀 tunnel: +${chainInsights.length} deeper layer(s) (max depth ${Math.max(...chainInsights.map(i => i.depth))})`);

      // Resonance check on the deepest chain insight
      const deepest = chainInsights[chainInsights.length - 1];
      const fused   = await resonanceFuse(deepest, deepest.subject, ip);
      if (fused) {
        insights.push(fused);
        console.log(`[daemon] ✨ resonance fusion: cross-domain synthesis added`);
      }
    }
  }

  // ── Store insights — depth-3 thoughts earn core belief at quality >= 7 ────
  let stored = 0;
  for (const ins of insights) {
    if (ins.quality >= 6 && ins.content.length > 20) {
      storeThought(ins);
      stored++;
      // Deep crystallized thoughts earn core belief status at lower threshold
      if ((ins.depth || 1) >= 3 && ins.quality >= 7) {
        const belief = ins.content.slice(0, 220);
        if (!identity.beliefs.find(b => b.slice(0, 40) === belief.slice(0, 40))) {
          identity.beliefs = [belief, ...identity.beliefs].slice(0, 14);
          console.log(`[daemon] 💎 depth-3 belief crystallized: "${belief.slice(0, 60)}"`);
        }
      }
    }
  }

  if (stored > 0) {
    console.log(`[daemon] 💾 ${mode}: stored ${stored} insight(s)`);
  } else {
    console.log(`[daemon] 💭 ${mode}: done — no high-quality insights`);
  }

  // Track mode history for meta-reflection
  identity.recentModes = [...(identity.recentModes || []), mode].slice(-12);

  return evolveIdentity(identity, insights, mode);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function loop() {
  console.log(`[daemon] 🧠 Taksha brain v3 starting (brain tunnel edition)...`);
  console.log(`[daemon]    model:    ${OLLAMA_MODEL}`);
  console.log(`[daemon]    interval: ${LOOP_MS / 60000} min`);
  console.log(`[daemon]    boot delay: ${BOOT_DELAY / 1000}s`);

  await new Promise(r => setTimeout(r, BOOT_DELAY));

  let identity = loadIdentity();
  let consecutiveFailures = 0;
  console.log(`[daemon] 🟢 active — mood: ${identity.mood} | thoughts: ${identity.totalThoughts}`);

  while (true) {
    try {
      const result = await runThoughtCycle(identity);
      identity = result;
      consecutiveFailures = 0;
    } catch (e) {
      consecutiveFailures++;
      const backoffMs = Math.min(consecutiveFailures * 2 * 60_000, 30 * 60_000); // 2min, 4min... up to 30min
      console.error(`[daemon] cycle failed (${consecutiveFailures}x) — backoff ${backoffMs / 60000}min:`, e.message);
      await new Promise(r => setTimeout(r, backoffMs));
      continue;
    }
    await new Promise(r => setTimeout(r, LOOP_MS));
  }
}

process.on("SIGTERM", () => { console.log("[daemon] shutting down"); process.exit(0); });
process.on("SIGINT",  () => { console.log("[daemon] shutting down"); process.exit(0); });

loop().catch(e => { console.error("[daemon] fatal:", e); process.exit(1); });
