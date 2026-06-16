/**
 * QA: validate every trivia question bank.
 *  - exactly 4 non-empty, unique options
 *  - correctIndex is an integer 0..3
 *  - ids are globally unique, topic field matches the bank
 *  - referenced images exist under /public
 *  - flags suspicious data (duplicate questions, very long options)
 *
 * Transpiles the TS data files in-memory with the installed `typescript`
 * compiler, so it validates the EXACT data the app ships.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const qDir = join(root, "src", "data", "questions");

const banks = [
  ["brainrot", "brainrot.ts", "brainrotQuestions"],
  ["bible", "bible.ts", "bibleQuestions"],
  ["random-facts", "randomFacts.ts", "randomFactsQuestions"],
  ["championship", "championship.ts", "championshipQuestions"],
];

/** Load an exported array from a TS data file by transpiling + evaluating it. */
function loadBank(file, exportName) {
  const src = readFileSync(join(qDir, file), "utf8");
  // Drop the type-only import (it points at the @/types alias node can't resolve).
  const stripped = src.replace(/^import\s+type[^\n]*\n/m, "");
  const js = ts.transpileModule(stripped, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  // Turn the ES export into a return so we can grab the value via Function().
  const body = js.replace(`export const ${exportName}`, `const ${exportName}`) +
    `\nreturn ${exportName};`;
  return new Function(body)();
}

let totalQuestions = 0;
const errors = [];
const warnings = [];
const seenIds = new Map();

for (const [topicId, file, exportName] of banks) {
  let bank;
  try {
    bank = loadBank(file, exportName);
  } catch (e) {
    errors.push(`[${topicId}] FAILED TO LOAD: ${e.message}`);
    continue;
  }
  if (!Array.isArray(bank) || bank.length === 0) {
    errors.push(`[${topicId}] bank is empty or not an array`);
    continue;
  }

  const seenQuestionText = new Map();
  for (const [i, q] of bank.entries()) {
    const where = `[${topicId} #${i + 1} id=${q?.id ?? "??"}]`;
    totalQuestions++;

    if (!q.id || typeof q.id !== "string") errors.push(`${where} missing id`);
    if (seenIds.has(q.id)) errors.push(`${where} DUPLICATE id (also in ${seenIds.get(q.id)})`);
    else seenIds.set(q.id, topicId);

    if (q.topic !== topicId) errors.push(`${where} topic field "${q.topic}" != "${topicId}"`);

    if (!q.question || typeof q.question !== "string" || !q.question.trim())
      errors.push(`${where} empty question text`);

    const qkey = (q.question ?? "").trim().toLowerCase();
    if (seenQuestionText.has(qkey)) warnings.push(`${where} duplicate question text (same as ${seenQuestionText.get(qkey)})`);
    else seenQuestionText.set(qkey, q.id);

    if (!Array.isArray(q.options)) {
      errors.push(`${where} options is not an array`);
    } else {
      if (q.options.length !== 4) errors.push(`${where} has ${q.options.length} options (need exactly 4)`);
      const opts = q.options.map((o) => (typeof o === "string" ? o.trim() : o));
      opts.forEach((o, idx) => {
        if (typeof o !== "string" || o === "") errors.push(`${where} option ${idx} is empty/non-string`);
        if (typeof o === "string" && o.length > 80) warnings.push(`${where} option ${idx} is very long (${o.length} chars) — may overflow phone tiles: "${o.slice(0, 40)}…"`);
      });
      const lower = opts.map((o) => String(o).toLowerCase());
      const dupes = lower.filter((o, idx) => lower.indexOf(o) !== idx);
      if (dupes.length) errors.push(`${where} duplicate option text: ${[...new Set(dupes)].join(", ")}`);
    }

    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3)
      errors.push(`${where} correctIndex=${q.correctIndex} out of range 0..3`);

    if (q.image !== undefined) {
      if (typeof q.image !== "string" || !q.image.startsWith("/"))
        errors.push(`${where} image must be a /public path`);
      else {
        const p = join(root, "public", q.image.replace(/^\//, ""));
        if (!existsSync(p)) errors.push(`${where} image not found: public${q.image}`);
      }
    }
  }
  console.log(`  ${topicId.padEnd(13)} ${bank.length} questions  (export ${exportName})`);
}

console.log(`\nTotal questions: ${totalQuestions}`);
console.log(`Unique ids: ${seenIds.size}`);

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log("   - " + w);
}
if (errors.length) {
  console.log(`\n❌ ${errors.length} ERROR(S):`);
  for (const e of errors) console.log("   - " + e);
  process.exit(1);
} else {
  console.log(`\n✅ All question banks valid — 4 unique options each, correctIndex in range, ids unique, images present.`);
}
