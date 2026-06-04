#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "agency-agents-main");
const OUT_FILE = path.join(ROOT, "data", "nexa-agency-agent-pack.json");

const SKIP_DIRS = new Set([".git", ".github", "integrations", "scripts", "examples"]);
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "are", "agent", "agents",
  "youre", "their", "will", "must", "have", "has", "use", "using", "when", "what", "how", "why", "can",
  "cua", "cho", "toi", "anh", "em", "ban", "nhung", "khong", "mot", "cac", "voi", "trong", "nexa"
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripMarkdown(value = "") {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.replace(/\[|\]\([^)]+\)/g, ""))
    .replace(/[#>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plain(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) return [{}, content];
  const end = content.indexOf("\n---", 4);
  if (end < 0) return [{}, content];
  const raw = content.slice(4, end);
  const meta = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    meta[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return [meta, content.slice(end + 4)];
}

function sectionExcerpt(content, headingWords, maxChars) {
  const lines = content.split(/\r?\n/);
  const matchesHeading = (line) => {
    if (!/^#{2,4}\s+/.test(line)) return false;
    const text = plain(line);
    return headingWords.some((word) => text.includes(word));
  };
  const start = lines.findIndex(matchesHeading);
  if (start < 0) return "";
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{2,3}\s+/.test(line) && collected.length) break;
    if (/^\s*$/.test(line)) continue;
    collected.push(line);
    if (stripMarkdown(collected.join(" ")).length >= maxChars) break;
  }
  return stripMarkdown(collected.join(" ")).slice(0, maxChars).trim();
}

function keywordsFor(text, limit = 22) {
  const counts = new Map();
  for (const token of plain(text).replace(/[^a-z0-9]+/g, " ").split(/\s+/)) {
    if (token.length < 3 || STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function inferCategory(file) {
  const rel = path.relative(SOURCE_DIR, file).split(path.sep);
  return rel.length > 1 ? rel[0] : "general";
}

function buildAgent(file) {
  const content = fs.readFileSync(file, "utf8");
  const [meta, body] = parseFrontmatter(content);
  const title = body.match(/^#\s+(.+)$/m)?.[1] || meta.name || path.basename(file, ".md");
  const category = inferCategory(file);
  const description = stripMarkdown(meta.description || sectionExcerpt(body, ["core mission"], 360));
  const mission = sectionExcerpt(body, ["core mission", "mission"], 700);
  const rules = sectionExcerpt(body, ["critical rules", "rules"], 700);
  const workflow = sectionExcerpt(body, ["workflow", "process"], 700);
  const deliverables = sectionExcerpt(body, ["deliverables", "capabilities"], 900);
  const success = sectionExcerpt(body, ["success metrics", "successful"], 500);
  const searchableText = [
    meta.name,
    title,
    category,
    description,
    meta.vibe,
    mission,
    rules,
    workflow,
    deliverables,
    success
  ].join(" ");
  return {
    id: path.relative(SOURCE_DIR, file).replace(/\\/g, "/").replace(/\.md$/, ""),
    name: stripMarkdown(meta.name || title).replace(/\s+Agent$/i, ""),
    category,
    source: path.relative(ROOT, file).replace(/\\/g, "/"),
    description,
    vibe: stripMarkdown(meta.vibe || ""),
    mission,
    rules,
    workflow,
    deliverables,
    success,
    tags: keywordsFor(searchableText)
  };
}

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Missing source folder: ${SOURCE_DIR}`);
  }
  const files = walk(SOURCE_DIR)
    .filter((file) => !["README.md", "CONTRIBUTING.md", "CONTRIBUTING_zh-CN.md"].includes(path.basename(file)))
    .sort();
  const agents = files.map(buildAgent).filter((agent) => agent.name && agent.description);
  const categories = {};
  for (const agent of agents) {
    categories[agent.category] = (categories[agent.category] || 0) + 1;
  }
  const pack = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "agency-agents-main",
    license: "MIT",
    agentCount: agents.length,
    categories,
    agents
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Built ${agents.length} agents -> ${path.relative(ROOT, OUT_FILE)}`);
}

main();
