import Database from "better-sqlite3";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "cache.db"));

// Ensure WAL mode for concurrent reads
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS question_cache (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    hash         TEXT UNIQUE NOT NULL,
    question     TEXT NOT NULL,
    board        TEXT NOT NULL DEFAULT 'general',
    subject      TEXT NOT NULL DEFAULT 'general',
    style        TEXT NOT NULL DEFAULT 'stepbystep',
    lang         TEXT NOT NULL DEFAULT 'en',
    answer       TEXT NOT NULL,
    canvas_json  TEXT,
    thinking_text TEXT,
    source       TEXT DEFAULT 'model',
    hits         INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    last_hit_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS scrape_queue (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    url      TEXT UNIQUE NOT NULL,
    status   TEXT DEFAULT 'pending',
    subject  TEXT,
    board    TEXT,
    attempted INTEGER DEFAULT 0,
    added_at INTEGER NOT NULL
  );
`);

// Normalise a question string for hashing — strips irrelevant punctuation, preserves operators
function normalise(text) {
  return text.toLowerCase()
    .replace(/[^\w\s\+\-\*\/\=\^\(\)\.\%\!\?]/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function makeHash(question, board, subject, style, lang, grade = "") {
  const key = [normalise(question), board, grade, subject, style, lang].join("|");
  return createHash("sha256").update(key).digest("hex");
}

// Migrations — safe to run every boot
for (const sql of [
  `ALTER TABLE question_cache ADD COLUMN thinking_text TEXT`,
  `ALTER TABLE question_cache ADD COLUMN rating TEXT`,
  `ALTER TABLE question_cache ADD COLUMN is_gold INTEGER DEFAULT 0`,
  `ALTER TABLE question_cache ADD COLUMN verified INTEGER DEFAULT 0`,
  `ALTER TABLE thought_log ADD COLUMN depth INTEGER DEFAULT 1`,
]) { try { db.exec(sql); } catch { /* column already exists */ } }

// ── Cache lookup ──────────────────────────────────────────────────────────────
const stmtGet = db.prepare(`
  SELECT answer, canvas_json, thinking_text FROM question_cache WHERE hash = ?
`);
const stmtHit = db.prepare(`
  UPDATE question_cache SET hits = hits + 1, last_hit_at = ? WHERE hash = ?
`);

export function cacheGet(hash) {
  const row = stmtGet.get(hash);
  if (!row) return null;
  stmtHit.run(Date.now(), hash);
  return { answer: row.answer, canvas_json: row.canvas_json || null, thinking: row.thinking_text || null };
}

// ── Cache insert ──────────────────────────────────────────────────────────────
const stmtInsert = db.prepare(`
  INSERT OR IGNORE INTO question_cache
    (hash, question, board, subject, style, lang, answer, canvas_json, thinking_text, source, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'model', ?)
`);

export function cacheSet(hash, question, board, subject, style, lang, answer, canvas_json, thinking) {
  stmtInsert.run(hash, question, board, subject, style, lang, answer, canvas_json || null, thinking || null, Date.now());
}

// ── Cache stats ───────────────────────────────────────────────────────────────
export function cacheStats() {
  const total     = db.prepare("SELECT COUNT(*) AS n FROM question_cache").get().n;
  const dayAgo    = Date.now() - 86_400_000;
  const hitsToday = db.prepare("SELECT COALESCE(SUM(hits),0) AS n FROM question_cache WHERE last_hit_at > ?").get(dayAgo).n;
  const hitRows   = db.prepare("SELECT COUNT(*) AS n FROM question_cache WHERE hits > 0").get().n;
  return { total, hitsToday, hitRate: total ? Math.round((hitRows / total) * 100) : 0 };
}

// ── Extended tables ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS core_insights (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic      TEXT NOT NULL,
    subject    TEXT,
    content    TEXT NOT NULL,
    quality    INTEGER DEFAULT 8,
    source_ids TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_core_subject ON core_insights(subject);

  CREATE TABLE IF NOT EXISTS repair_queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    question   TEXT NOT NULL,
    board      TEXT DEFAULT 'general',
    subject    TEXT DEFAULT 'general',
    style      TEXT DEFAULT 'stepbystep',
    lang       TEXT DEFAULT 'en',
    old_answer TEXT,
    status     TEXT DEFAULT 'pending',
    added_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scrape_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT UNIQUE NOT NULL,
    title      TEXT,
    subject    TEXT,
    scraped_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS code_review_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file       TEXT NOT NULL,
    finding    TEXT NOT NULL,
    severity   TEXT DEFAULT 'info',
    applied    INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

// ── Thought log ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS thought_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic      TEXT NOT NULL,
    subject    TEXT,
    type       TEXT NOT NULL,
    content    TEXT NOT NULL,
    quality    INTEGER DEFAULT 6,
    used_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_thought_topic   ON thought_log(topic);
  CREATE INDEX IF NOT EXISTS idx_thought_subject ON thought_log(subject);
  CREATE INDEX IF NOT EXISTS idx_thought_quality ON thought_log(quality DESC);
`);

const stmtInsertThought = db.prepare(`
  INSERT INTO thought_log (topic, subject, type, content, quality, depth, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
export function storeThought({ topic, subject, type, content, quality, depth = 1 }) {
  stmtInsertThought.run(topic, subject || topic, type, content, quality, depth, Date.now());
}

// Find existing thoughts that resonate with a new insight (keyword overlap)
export function findResonantThoughts(content, subject, limit = 3) {
  const words = content.toLowerCase()
    .replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter(w => w.length > 5).slice(0, 5);
  if (words.length === 0) return [];
  const cond   = words.map(() => "content LIKE ?").join(" OR ");
  const params = [...words.map(w => `%${w}%`), subject, limit];
  return db.prepare(
    `SELECT id, content, type, topic, subject, quality, depth FROM thought_log
     WHERE (${cond}) AND subject != ? AND quality >= 7
     ORDER BY quality DESC, depth DESC LIMIT ?`
  ).all(...params);
}

export function getRecentQuestions(limit = 5, subject = null) {
  if (subject) {
    return db.prepare(`SELECT question, subject FROM question_cache WHERE subject=? ORDER BY created_at DESC LIMIT ?`).all(subject, limit);
  }
  return db.prepare(`SELECT question, subject FROM question_cache ORDER BY created_at DESC LIMIT ?`).all(limit);
}

export function getPopularSubjects(limit = 3) {
  return db.prepare(`SELECT subject, SUM(hits) AS total FROM question_cache GROUP BY subject ORDER BY total DESC LIMIT ?`)
    .all(limit).map(r => r.subject);
}

export function getRelevantThoughts(subject, questionText, limit = 3) {
  // 1. subject match
  const bySubject = db.prepare(`
    SELECT content, type, topic, quality FROM thought_log
    WHERE (topic LIKE ? OR subject LIKE ?) AND quality >= 6
    ORDER BY quality DESC, created_at DESC LIMIT ?
  `).all(`%${subject}%`, `%${subject}%`, limit);

  if (bySubject.length >= limit) return bySubject;

  // 2. keyword fallback
  const words = questionText.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 4).slice(0, 4);
  if (words.length > 0) {
    const cond   = words.map(() => "content LIKE ?").join(" OR ");
    const params = [...words.map(w => `%${w}%`), limit - bySubject.length];
    const byKw   = db.prepare(`SELECT content, type, topic, quality FROM thought_log WHERE (${cond}) AND quality >= 6 ORDER BY quality DESC LIMIT ?`).all(...params);
    return [...bySubject, ...byKw].slice(0, limit);
  }
  return bySubject;
}

export function thoughtStats() {
  const total  = db.prepare(`SELECT COUNT(*) AS n FROM thought_log`).get().n;
  const recent = db.prepare(`SELECT COUNT(*) AS n FROM thought_log WHERE created_at > ?`).get(Date.now() - 86_400_000).n;
  return { total, last24h: recent };
}

// ── Feedback: mark gold / remove bad ─────────────────────────────────────────
const stmtMarkGold = db.prepare(`UPDATE question_cache SET rating='good', is_gold=1 WHERE hash=?`);
const stmtDeleteBad = db.prepare(`DELETE FROM question_cache WHERE hash=?`);

export function markGold(hash) { stmtMarkGold.run(hash); }
export function deleteBad(hash) { stmtDeleteBad.run(hash); }

export function feedbackStats() {
  const gold = db.prepare(`SELECT COUNT(*) AS n FROM question_cache WHERE is_gold=1`).get().n;
  const bad  = db.prepare(`SELECT COUNT(*) AS n FROM question_cache WHERE rating='bad'`).get().n;
  return { gold, bad };
}

// ── Core insights ─────────────────────────────────────────────────────────────
export function storeCoreInsight({ topic, subject, content, quality, source_ids }) {
  const now = Date.now();
  db.prepare(`INSERT INTO core_insights (topic,subject,content,quality,source_ids,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`)
    .run(topic, subject || topic, content, quality, source_ids || "", now, now);
}
export function getCoreInsights(subject, limit = 2) {
  return db.prepare(`SELECT content, topic FROM core_insights WHERE subject=? OR subject='general' ORDER BY quality DESC, updated_at DESC LIMIT ?`).all(subject, limit);
}
export function getHighQualityThoughts(minQuality = 8, limit = 12) {
  return db.prepare(`SELECT id, content, type, topic, subject, quality FROM thought_log WHERE quality >= ? ORDER BY quality DESC, created_at DESC LIMIT ?`).all(minQuality, limit);
}

// ── Repair queue ──────────────────────────────────────────────────────────────
export function addToRepairQueue({ question, board, subject, style, lang, old_answer }) {
  db.prepare(`INSERT OR IGNORE INTO repair_queue (question,board,subject,style,lang,old_answer,added_at) VALUES (?,?,?,?,?,?,?)`)
    .run(question, board || "general", subject || "general", style || "stepbystep", lang || "en", old_answer || "", Date.now());
}
export function getPendingRepairs(limit = 2) {
  return db.prepare(`SELECT id, question, board, subject, style, lang, old_answer FROM repair_queue WHERE status='pending' ORDER BY added_at ASC LIMIT ?`).all(limit);
}
export function markRepairDone(id) { db.prepare(`UPDATE repair_queue SET status='done' WHERE id=?`).run(id); }
export function getRepairTargets(limit = 3) {
  const cutoff = Date.now() - 86_400_000;
  return db.prepare(`SELECT hash, question, board, subject, style, lang, answer FROM question_cache WHERE hits <= 1 AND is_gold=0 AND created_at < ? AND (rating IS NULL OR rating != 'good') ORDER BY created_at ASC LIMIT ?`).all(cutoff, limit);
}
export function updateCacheAnswer(hash, newAnswer) {
  db.prepare(`UPDATE question_cache SET answer=?, is_gold=1, rating='good' WHERE hash=?`).run(newAnswer, hash);
}

// ── Scrape log ────────────────────────────────────────────────────────────────
export function isUrlScraped(url) { return !!db.prepare(`SELECT 1 FROM scrape_log WHERE url=?`).get(url); }
export function markUrlScraped(url, title, subject) {
  db.prepare(`INSERT OR IGNORE INTO scrape_log (url,title,subject,scraped_at) VALUES (?,?,?,?)`).run(url, title, subject, Date.now());
}

// ── Code review log ───────────────────────────────────────────────────────────
export function storeCodeReview({ file, finding, severity }) {
  db.prepare(`INSERT INTO code_review_log (file,finding,severity,created_at) VALUES (?,?,?,?)`).run(file, finding, severity || "info", Date.now());
}
export function getCodeReviews(limit = 10) {
  return db.prepare(`SELECT * FROM code_review_log ORDER BY created_at DESC LIMIT ?`).all(limit);
}

// ── Prompt evolution store ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS prompt_store (
    key        TEXT PRIMARY KEY,
    content    TEXT NOT NULL,
    version    INTEGER DEFAULT 1,
    quality    INTEGER DEFAULT 7,
    updated_at INTEGER NOT NULL
  );
`);
export function getEvolvedPrompt(key) {
  return db.prepare(`SELECT content FROM prompt_store WHERE key=?`).get(key)?.content || null;
}
export function setEvolvedPrompt(key, content, quality = 7) {
  db.prepare(`INSERT INTO prompt_store (key,content,quality,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET content=excluded.content, quality=excluded.quality, version=version+1, updated_at=excluded.updated_at`)
    .run(key, content, quality, Date.now());
}
export function listEvolvedPrompts() {
  return db.prepare(`SELECT key, version, quality, updated_at FROM prompt_store ORDER BY updated_at DESC`).all();
}

// ── System health stats ───────────────────────────────────────────────────────
export function getHealthStats() {
  const total      = db.prepare("SELECT COUNT(*) AS n FROM question_cache").get().n;
  const gold       = db.prepare("SELECT COUNT(*) AS n FROM question_cache WHERE is_gold=1").get().n;
  const dayAgo     = Date.now() - 86_400_000;
  const hitsToday  = db.prepare("SELECT COUNT(*) AS n FROM question_cache WHERE last_hit_at > ?").get(dayAgo).n;
  const repairs    = db.prepare("SELECT COUNT(*) AS n FROM repair_queue WHERE status='done'").get().n;
  const avgQuality = db.prepare("SELECT AVG(quality) AS q FROM thought_log WHERE created_at > ?").get(dayAgo).q || 0;
  return { total, gold, hitsToday, repairs, avgQuality: Math.round(avgQuality * 10) / 10 };
}

// ── Cleanup: delete stale zero-hit entries older than 30 days ─────────────────
let lastGCTime = 0;
const GC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export function maybeGC() {
  const now = Date.now();
  if (now - lastGCTime < GC_INTERVAL_MS) return;
  lastGCTime = now;
  const cutoff = now - 30 * 86_400_000;
  const deleted = db.prepare("DELETE FROM question_cache WHERE hits = 0 AND created_at < ?").run(cutoff);
  if (deleted.changes > 0) console.log(`[db] GC removed ${deleted.changes} stale entries`);
}

export default db;
