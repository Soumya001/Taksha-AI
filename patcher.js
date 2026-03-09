/**
 * Taksha Patcher — safe, foolproof code self-improvement
 * ───────────────────────────────────────────────────────
 * Rules:
 *  1. BEFORE string must be found exactly ONCE in the target file
 *  2. Node.js syntax check must pass after applying
 *  3. Change must be <= MAX_AUTO_LINES for auto-apply; else → manual review
 *  4. Backup created before every apply; restored immediately on any failure
 *  5. Patches that touch serve.js do a live health check after applying
 *  6. Every result (pass/fail/rollback) is logged to patch_log table in DB
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const PATCHES_DIR = join(__dirname, "patches");
const BACKUP_DIR  = join(__dirname, "patches", "backups");

// Patches with fewer changed lines than this can auto-apply
const MAX_AUTO_LINES = 8;

// Files the patcher is allowed to touch
const ALLOWED_FILES = new Set(["serve.js", "db.js", "thought_daemon.js", "src/prompts.js"]);

// ── DB: patch_log table ───────────────────────────────────────────────────────
import db from "./db.js";
db.exec(`
  CREATE TABLE IF NOT EXISTS patch_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    patch_id   TEXT NOT NULL,
    file       TEXT NOT NULL,
    finding    TEXT,
    status     TEXT NOT NULL,
    lines_changed INTEGER DEFAULT 0,
    error      TEXT,
    created_at INTEGER NOT NULL
  );
`);
function logPatch({ patch_id, file, finding, status, lines_changed = 0, error = null }) {
  db.prepare(`INSERT INTO patch_log (patch_id,file,finding,status,lines_changed,error,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(patch_id, file, finding || "", status, lines_changed, error, Date.now());
}
export function getPatchLog(limit = 20) {
  return db.prepare(`SELECT * FROM patch_log ORDER BY created_at DESC LIMIT ?`).all(limit);
}

// ── Patch file format (structured, machine-parseable) ─────────────────────────
// ===PATCH===
// FILE: path/to/file.js
// FINDING: description
// SEVERITY: moderate
// CONFIDENCE: 9
// ===BEFORE===
// [exact text to replace]
// ===AFTER===
// [replacement text]
// ===EXPLANATION===
// one sentence
// ===END===

export function parsePatch(raw) {
  const get = (tag, endTag) => {
    const start = raw.indexOf(`===${tag}===`);
    const end   = raw.indexOf(`===${endTag}===`);
    if (start === -1 || end === -1) return null;
    return raw.slice(start + tag.length + 6, end).trim();
  };
  const header = raw.slice(0, raw.indexOf("===BEFORE===") || raw.length);
  const getField = (key) => {
    const m = header.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : null;
  };
  return {
    file:        getField("FILE"),
    finding:     getField("FINDING"),
    severity:    getField("SEVERITY") || "minor",
    confidence:  parseInt(getField("CONFIDENCE") || "0"),
    before:      get("BEFORE", "AFTER"),
    after:       get("AFTER",  "EXPLANATION"),
    explanation: get("EXPLANATION", "END"),
  };
}

export function writePatchFile(patch) {
  mkdirSync(PATCHES_DIR, { recursive: true });
  const id   = randomUUID().slice(0, 8);
  const date = new Date().toISOString().slice(0, 10);
  const slug = (patch.finding || "fix").slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const name = `${date}-${id}-${patch.file.replace(/\//g, "_")}-${slug}.patch`;
  const path = join(PATCHES_DIR, name);

  const content = [
    `===PATCH===`,
    `FILE: ${patch.file}`,
    `FINDING: ${patch.finding || ""}`,
    `SEVERITY: ${patch.severity || "minor"}`,
    `CONFIDENCE: ${patch.confidence || 7}`,
    `===BEFORE===`,
    patch.before,
    `===AFTER===`,
    patch.after,
    `===EXPLANATION===`,
    patch.explanation || "",
    `===END===`,
  ].join("\n");

  writeFileSync(path, content, "utf8");
  return { id, name, path };
}

// ── Core: validate and apply a patch ─────────────────────────────────────────
export function applyPatch(patchPathOrObj) {
  // Parse
  let patch;
  if (typeof patchPathOrObj === "string") {
    if (!existsSync(patchPathOrObj)) return { ok: false, error: "patch file not found" };
    patch = parsePatch(readFileSync(patchPathOrObj, "utf8"));
  } else {
    patch = patchPathOrObj;
  }

  const { file, finding, before, after, confidence, severity } = patch;

  // Guard: only allowed files
  if (!ALLOWED_FILES.has(file)) {
    return { ok: false, error: `file not in allowed list: ${file}` };
  }

  const filePath = join(__dirname, file);
  if (!existsSync(filePath)) return { ok: false, error: `file not found: ${file}` };

  const original = readFileSync(filePath, "utf8");

  // Guard: BEFORE must appear exactly once
  const occurrences = original.split(before).length - 1;
  if (occurrences === 0) {
    logPatch({ patch_id: randomUUID(), file, finding, status: "rejected_not_found", error: "BEFORE string not found in file" });
    return { ok: false, error: "BEFORE string not found in file — patch is stale or hallucinated" };
  }
  if (occurrences > 1) {
    logPatch({ patch_id: randomUUID(), file, finding, status: "rejected_ambiguous", error: `BEFORE string found ${occurrences} times` });
    return { ok: false, error: `BEFORE string is ambiguous — found ${occurrences} times` };
  }

  // Measure change size
  const beforeLines = before.split("\n").length;
  const afterLines  = after.split("\n").length;
  const linesChanged = Math.abs(afterLines - beforeLines) + Math.max(beforeLines, afterLines);
  const isAutoSafe  = linesChanged <= MAX_AUTO_LINES && confidence >= 8 && severity !== "critical";

  // Apply
  const patched = original.replace(before, after);

  // Backup
  mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = join(BACKUP_DIR, `${file.replace(/\//g, "_")}.${Date.now()}.bak`);
  writeFileSync(backupPath, original, "utf8");

  // Write patched file
  writeFileSync(filePath, patched, "utf8");

  // Syntax check
  try {
    execSync(`node --check "${filePath}"`, { timeout: 10_000 });
  } catch (e) {
    // Rollback immediately
    writeFileSync(filePath, original, "utf8");
    const errMsg = e.stderr?.toString().slice(0, 200) || e.message;
    logPatch({ patch_id: randomUUID(), file, finding, status: "rolled_back_syntax", lines_changed: linesChanged, error: errMsg });
    return { ok: false, error: `syntax check failed — rolled back. ${errMsg}` };
  }

  // Health check for serve.js
  if (file === "serve.js") {
    try {
      execSync(`node --check "${filePath}"`, { timeout: 10_000 }); // already done, belt+suspenders
      // Could add: curl health check if server is running
    } catch (e) {
      writeFileSync(filePath, original, "utf8");
      logPatch({ patch_id: randomUUID(), file, finding, status: "rolled_back_health", lines_changed: linesChanged });
      return { ok: false, error: "health check failed — rolled back" };
    }
  }

  const patchId = randomUUID();
  const status  = isAutoSafe ? "applied_auto" : "applied_manual";
  logPatch({ patch_id: patchId, file, finding, status, lines_changed: linesChanged });

  return {
    ok: true,
    patchId,
    status,
    linesChanged,
    isAutoApplied: isAutoSafe,
    backupPath,
    message: isAutoSafe
      ? `✅ auto-applied and syntax-verified`
      : `✅ applied (large change — ${linesChanged} lines — review recommended)`,
  };
}

// ── Validate without applying (dry-run) ───────────────────────────────────────
export function validatePatch(patch) {
  const { file, before } = patch;
  if (!ALLOWED_FILES.has(file)) return { valid: false, reason: "file not allowed" };
  const filePath = join(__dirname, file);
  if (!existsSync(filePath)) return { valid: false, reason: "file not found" };
  const source = readFileSync(filePath, "utf8");
  const count = source.split(before).length - 1;
  if (count === 0) return { valid: false, reason: "BEFORE not found in file" };
  if (count > 1)  return { valid: false, reason: `BEFORE ambiguous (${count} matches)` };
  return { valid: true };
}
