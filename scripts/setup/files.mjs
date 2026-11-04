/** Safe reading/writing of pewee.config.json, .env and branding assets. */
import { readFileSync, existsSync, statSync, mkdirSync, copyFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve, join, extname, relative, isAbsolute, sep } from "node:path";
import { homedir } from "node:os";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const CONFIG_PATH = join(ROOT, "pewee.config.json");
export const ENV_PATH = join(ROOT, ".env");
export const ENV_EXAMPLE_PATH = join(ROOT, ".env.example");
export const PUBLIC_DIR = join(ROOT, "public");
export const BRAND_DIR = join(PUBLIC_DIR, "brand");

/** Pewee's stock branding, used for new setups and for "reset". */
export const DEFAULT_CONFIG = Object.freeze({
  configured: false,
  siteName: "pewee",
  tagline: "Just write. Just publish.",
  description: "A minimal, self-hosted blog. Notes, essays and things learned while building.",
  siteUrl: "http://localhost:3000",
  language: "en",
  locale: "en_US",
  timezone: "",
  contactEmail: "",
  author: { name: "pewee", bio: "" },
  seo: {
    title: "pewee — a minimal blog",
    description: "A minimal, self-hosted blog. Notes, essays and things learned while building.",
    keywords: ["blog", "writing", "notes"],
    ogTitle: "",
    ogDescription: "",
    ogImage: "/Pewee..png",
    twitterCard: "summary_large_image",
    twitterHandle: "",
    robots: "index, follow",
  },
  socials: {
    github: "https://github.com/anshumancodes/Pewee",
    twitter: "",
    linkedin: "",
    instagram: "",
    youtube: "",
    website: "",
  },
  branding: { logo: "/Pewee..png", favicon: "/Pewee..png", themeColor: "#161616", showCredit: true },
  cms: { path: "/dashboard" },
});

export const DEFAULT_ASSET = DEFAULT_CONFIG.branding.logo;

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Deep-merge `over` onto `base` (plain objects only; arrays/scalars replace). */
function merge(base, over) {
  if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = base && typeof base[k] === "object" && !Array.isArray(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return clone(DEFAULT_CONFIG);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    throw new Error(
      `pewee.config.json is not valid JSON (${err.message}). Fix it by hand, or run "npm run setup -- --reset".`
    );
  }
  return merge(clone(DEFAULT_CONFIG), parsed);
}

/** Write a file atomically (temp file + rename) so a crash never leaves it half-written. */
export function writeAtomic(path, contents) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, contents, { mode: path === ENV_PATH ? 0o600 : 0o644 });
  renameSync(tmp, path);
}

export function saveConfig(config) {
  writeAtomic(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
}

/* ── .env ──────────────────────────────────────────────────────────── */

const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t.replace(/\s+#.*$/, "");
}

/** Read a .env file into { exists, lines, values }. */
export function readEnv(path = ENV_PATH) {
  if (!existsSync(path)) return { exists: false, lines: [], values: {} };
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const values = {};
  for (const line of lines) {
    const m = ENV_LINE.exec(line);
    if (m) values[m[1]] = unquote(m[2]);
  }
  return { exists: true, lines, values };
}

function quote(v) {
  return /^[A-Za-z0-9_@%+=:,./\-]*$/.test(v) ? v : `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Apply `updates` ({ KEY: value | null }) to a .env, preserving comments,
 * ordering and every unrelated key. null removes the key. When there is no
 * .env yet, .env.example is used as the template so its comments carry over.
 */
export function buildEnv(current, updates) {
  let lines = current.exists
    ? [...current.lines]
    : existsSync(ENV_EXAMPLE_PATH)
      ? readFileSync(ENV_EXAMPLE_PATH, "utf8").split(/\r?\n/)
      : [];
  const pending = new Map(Object.entries(updates));

  lines = lines.flatMap((line) => {
    const m = ENV_LINE.exec(line);
    if (!m || !pending.has(m[1])) return [line];
    const value = pending.get(m[1]);
    pending.delete(m[1]);
    return value === null ? [] : [`${m[1]}=${quote(value)}`];
  });

  const extra = [...pending].filter(([, v]) => v !== null);
  if (extra.length) {
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (lines.length) lines.push("");
    for (const [k, v] of extra) lines.push(`${k}=${quote(v)}`);
  }
  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}

/* ── Branding assets ───────────────────────────────────────────────── */

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".ico"]);
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

function expandHome(p) {
  return p === "~" || p.startsWith(`~${sep}`) || p.startsWith("~/") ? join(homedir(), p.slice(1)) : p;
}

/**
 * Resolve user input for an image to either a public path ("/brand/logo.png"),
 * an absolute URL, or a local file that needs copying.
 * Returns { kind: "url" | "public" | "file", value, source? } or { error }.
 */
export function resolveAsset(input, { allowUrl = false, allowedExts = IMAGE_EXTS } = {}) {
  const v = input.trim().replace(/^["']|["']$/g, "");
  if (/^https?:\/\//i.test(v)) {
    return allowUrl ? { kind: "url", value: v } : { error: "Please give a local file path, not a URL." };
  }

  // "/foo.png" may mean "public/foo.png"; prefer that if it exists.
  const candidates = v.startsWith("/") ? [join(PUBLIC_DIR, v), v] : [resolve(ROOT, expandHome(v))];
  const file = candidates.find((p) => existsSync(p));
  if (!file) return { error: `File not found: ${v}` };

  const stat = statSync(file);
  if (!stat.isFile()) return { error: `Not a file: ${v}` };
  const ext = extname(file).toLowerCase();
  if (!allowedExts.has(ext)) return { error: `Unsupported file type "${ext || "none"}". Use one of: ${[...allowedExts].join(", ")}` };
  if (stat.size > MAX_ASSET_BYTES) return { error: "That file is larger than 5 MB. Please use a smaller image." };

  const rel = relative(PUBLIC_DIR, file);
  if (!rel.startsWith("..") && !isAbsolute(rel)) {
    return { kind: "public", value: `/${rel.split(sep).join("/")}` };
  }
  return { kind: "file", source: file, ext, value: "" };
}

export const FAVICON_EXTS = new Set([".ico", ".png", ".svg"]);

/** Copy a validated asset into public/brand/<name><ext> and return its public path. */
export function copyAsset(asset, name) {
  mkdirSync(BRAND_DIR, { recursive: true });
  const dest = join(BRAND_DIR, `${name}${asset.ext}`);
  const tmp = `${dest}.${process.pid}.tmp`;
  copyFileSync(asset.source, tmp);
  renameSync(tmp, dest);
  return `/brand/${name}${asset.ext}`;
}
