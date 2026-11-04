#!/usr/bin/env node
/**
 * Pewee first-time setup wizard.
 *
 *   npm run setup               interactive setup (safe to re-run)
 *   npm run setup -- --reset    reset branding to the Pewee defaults
 *
 * Public branding is written to pewee.config.json (commit it).
 * Secrets (MongoDB URI, JWT secret) go to .env (git-ignored) and are never printed.
 */
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argv, exit } from "node:process";
import { createPrompter, CancelledError, c, log } from "./setup/ui.mjs";
import * as v from "./setup/validate.mjs";
import {
  ROOT,
  DEFAULT_CONFIG,
  DEFAULT_ASSET,
  ENV_EXAMPLE_PATH,
  FAVICON_EXTS,
  loadConfig,
  saveConfig,
  readEnv,
  buildEnv,
  writeAtomic,
  ENV_PATH,
  resolveAsset,
  copyAsset,
} from "./setup/files.mjs";

const SOCIALS = [
  { key: "github", label: "GitHub", hint: "username or URL" },
  { key: "twitter", label: "X / Twitter", hint: "@handle or URL" },
  { key: "linkedin", label: "LinkedIn", hint: "profile slug or URL" },
  { key: "instagram", label: "Instagram", hint: "username or URL" },
  { key: "youtube", label: "YouTube", hint: "@channel or URL" },
  { key: "website", label: "Other website", hint: "URL" },
];

const ROBOTS_CHOICES = [
  { value: "index, follow", label: "Index and follow", hint: "recommended for public blogs" },
  { value: "noindex, follow", label: "Don't index, follow links" },
  { value: "noindex, nofollow", label: "Don't index or follow", hint: "private or staging sites" },
];

const TWITTER_CARD_CHOICES = [
  { value: "summary_large_image", label: "Large image card", hint: "recommended" },
  { value: "summary", label: "Small summary card" },
];

const clone = (o) => JSON.parse(JSON.stringify(o));
const truncate = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

/* ── SEO suggestions ───────────────────────────────────────────────── */

function suggestTitle(name, tagline) {
  return tagline ? `${name} | ${tagline}` : name;
}
function suggestDescription(description, name) {
  return truncate(description || `Articles, notes and essays from ${name}.`, 160);
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function redact(message, secrets) {
  let out = String(message ?? "");
  for (const s of secrets.filter(Boolean)) out = out.split(s).join("<hidden>");
  return out.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1<credentials>@");
}

async function testMongo(uri, dbName) {
  const { default: mongoose } = await import("mongoose");
  const conn = mongoose.createConnection(uri, {
    ...(dbName && { dbName }),
    serverSelectionTimeoutMS: 8000,
  });
  try {
    await conn.asPromise();
    await conn.db.admin().ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: redact(err?.message, [uri]) };
  } finally {
    await conn.close().catch(() => {});
  }
}

function assetLabel(path, fallback = "Default Pewee asset") {
  return !path || path === DEFAULT_ASSET ? fallback : path;
}

function printSummary(config, env) {
  const socials = Object.entries(config.socials).filter(([, url]) => url);
  const rows = [
    ["Blog", config.siteName],
    ["Tagline", config.tagline || c.dim("—")],
    ["URL", config.siteUrl],
    ["Author", config.author.name + (config.author.bio ? c.dim("  (with bio)") : "")],
    ["Language", `${config.language}  ${c.dim(`timezone: ${config.timezone || "server default"}`)}`],
    ["SEO title", config.seo.title],
    ["Robots", config.seo.robots],
    ["Social links", socials.length ? socials.map(([k]) => k).join(", ") : c.dim("none")],
    ["Logo", assetLabel(config.branding.logo, "Default Pewee logo")],
    ["Favicon", assetLabel(config.branding.favicon, "Default Pewee favicon")],
    ["Share image", assetLabel(config.seo.ogImage, "Default Pewee image")],
    ["CMS route", config.cms.path],
    ["MongoDB", env.MONGO_DB_URI ? `configured ${c.dim(`(URI hidden, database: ${env.DB_NAME || "from URI"})`)}` : c.yellow("not configured")],
    ["Admin email", env.ADMIN_EMAIL || c.dim("—")],
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  log.info();
  for (const [k, val] of rows) log.info(`  ${c.dim(k.padEnd(width))}  ${val}`);
}

function ensureEnvExample() {
  if (existsSync(ENV_EXAMPLE_PATH)) return false;
  writeFileSync(
    ENV_EXAMPLE_PATH,
    [
      "# Pewee environment variables — copy to .env and fill in.",
      "MONGO_DB_URI=",
      "DB_NAME=pewee",
      "JWT_SECRET=",
      "# NEXT_PUBLIC_APP_URL=   # optional override of siteUrl in pewee.config.json",
      "NEXT_PUBLIC_GA_ID=",
      "",
    ].join("\n")
  );
  return true;
}

/* ── Wizard sections ───────────────────────────────────────────────── */

async function askIdentity(p, cfg, prev, firstRun) {
  log.step("Blog identity");
  cfg.siteName = await p.text("What is your blog's name?", {
    initial: firstRun ? "" : prev.siteName,
    required: true,
    validate: v.maxLength(60),
  });
  cfg.tagline = await p.text("What's your tagline?", {
    initial: firstRun ? "" : prev.tagline,
    hint: "A short line shown under the name in the footer. Optional.",
    validate: v.maxLength(100),
  });
  cfg.description = await p.text("Briefly describe what your blog is about.", {
    initial: firstRun ? "" : prev.description,
    required: true,
    hint: "One or two sentences. Used for the RSS feed and as the basis for SEO defaults.",
    validate: v.maxLength(300),
  });
  cfg.language = await p.text("What is the primary language of your blog?", {
    initial: prev.language || "en",
    required: true,
    hint: "A language tag such as en, en-GB, fr or pt-BR.",
    transform: v.normalizeLanguage,
    validate: v.validateLanguage,
  });
  cfg.locale = v.toOgLocale(cfg.language);

  cfg.author.name = await p.text("What is the author's display name?", {
    initial: firstRun ? "" : prev.author.name,
    required: true,
    hint: "Used as the default post author and in SEO metadata.",
  });
  const wantsBio = await p.confirm("Do you want to add an author bio?", Boolean(prev.author.bio) || firstRun);
  cfg.author.bio = wantsBio
    ? await p.text("Write a short author bio.", {
        initial: prev.author.bio,
        required: true,
        hint: "Used in structured data (search engines).",
        validate: v.maxLength(300),
      })
    : "";
}

async function askWebsite(p, cfg, prev, firstRun) {
  log.step("Website");
  cfg.siteUrl = await p.text("What is your website URL?", {
    initial: firstRun ? "" : prev.siteUrl,
    required: true,
    hint: "Where the blog will live, e.g. https://example.com (trailing slashes are removed).",
    transform: v.normalizeSiteUrl,
    validate: v.validateSiteUrl,
  });
  log.hint(`Using ${cfg.siteUrl}`);

  cfg.contactEmail = await p.text("What is your public contact email?", {
    initial: prev.contactEmail,
    hint: "Optional. Included in structured data. Enter - to clear.",
    validate: v.validateEmail,
  });
  cfg.timezone = await p.text("What is your preferred timezone?", {
    initial: prev.timezone || v.systemTimezone(),
    required: true,
    hint: "Used to display post dates. IANA name, e.g. UTC, Europe/London, Asia/Kolkata.",
    validate: v.validateTimezone,
  });

  const hadSocials = Object.values(prev.socials).some(Boolean);
  const startSocials = firstRun ? Object.fromEntries(SOCIALS.map((s) => [s.key, ""])) : { ...prev.socials };
  if (await p.confirm("Do you want to add social media links?", firstRun || hadSocials)) {
    log.hint("Leave any of these empty to skip. Enter - to remove an existing link.");
    for (const s of SOCIALS) {
      cfg.socials[s.key] = await p.text(`${s.label} ${c.dim(`(${s.hint})`)}`, {
        initial: startSocials[s.key] ?? "",
        transform: (val) => v.normalizeSocial(s.key, val),
        validate: v.validateHttpUrl,
      });
    }
  } else {
    cfg.socials = startSocials;
  }
}

async function askSeo(p, cfg, prev, firstRun) {
  log.step("SEO");
  // Keep values the user customised before; regenerate ones that were still the suggestion.
  const prevTitleSuggestion = suggestTitle(prev.siteName, prev.tagline);
  const prevDescSuggestion = suggestDescription(prev.description, prev.siteName);
  const title =
    !firstRun && prev.seo.title !== prevTitleSuggestion ? prev.seo.title : suggestTitle(cfg.siteName, cfg.tagline);
  const description =
    !firstRun && prev.seo.description !== prevDescSuggestion
      ? prev.seo.description
      : suggestDescription(cfg.description, cfg.siteName);
  const handle = v.twitterHandleFromUrl(cfg.socials.twitter) || (firstRun ? "" : prev.seo.twitterHandle);

  cfg.seo = {
    ...cfg.seo,
    title,
    description,
    keywords: firstRun ? [] : prev.seo.keywords,
    ogTitle: firstRun ? "" : prev.seo.ogTitle,
    ogDescription: firstRun ? "" : prev.seo.ogDescription,
    twitterHandle: handle.replace(/^@/, ""),
    twitterCard: prev.seo.twitterCard || "summary_large_image",
    robots: prev.seo.robots || "index, follow",
  };

  log.info(`\n  ${c.dim("Suggested defaults:")}`);
  log.info(`  ${c.dim("Title")}        ${cfg.seo.title}`);
  log.info(`  ${c.dim("Description")}  ${cfg.seo.description}`);

  if (!(await p.confirm("Review and customise SEO settings?", true))) return;

  cfg.seo.title = await p.text("Default SEO title", {
    initial: cfg.seo.title,
    required: true,
    hint: "Shown in browser tabs and search results. Around 50–60 characters works best.",
    validate: v.maxLength(90),
  });
  cfg.seo.description = await p.text("Default meta description", {
    initial: cfg.seo.description,
    required: true,
    hint: "Shown under your title in search results. Around 150–160 characters works best.",
    validate: v.maxLength(300),
  });
  const keywords = await p.text("Keywords (comma-separated, optional)", {
    initial: cfg.seo.keywords.join(", "),
    hint: "e.g. engineering, javascript, product. Enter - to clear.",
  });
  cfg.seo.keywords = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const ogTitle = await p.text("Default Open Graph title (social shares)", {
    initial: cfg.seo.ogTitle || cfg.seo.title,
    required: true,
    validate: v.maxLength(90),
  });
  const ogDescription = await p.text("Default Open Graph description", {
    initial: cfg.seo.ogDescription || cfg.seo.description,
    required: true,
    validate: v.maxLength(300),
  });
  // Store "" when equal to the SEO defaults so they keep following them.
  cfg.seo.ogTitle = ogTitle === cfg.seo.title ? "" : ogTitle;
  cfg.seo.ogDescription = ogDescription === cfg.seo.description ? "" : ogDescription;

  cfg.seo.twitterCard = await p.select("X / Twitter card style", TWITTER_CARD_CHOICES, cfg.seo.twitterCard);
  cfg.seo.twitterHandle = (
    await p.text("X / Twitter handle for cards (optional)", {
      initial: cfg.seo.twitterHandle ? `@${cfg.seo.twitterHandle}` : "",
      hint: "e.g. @yourname. Enter - to clear.",
      validate: (val) => (/^@?[A-Za-z0-9_]{1,15}$/.test(val) ? true : "Handles are 1–15 letters, numbers or underscores."),
    })
  ).replace(/^@/, "");
  cfg.seo.robots = await p.select("Should search engines index your blog?", ROBOTS_CHOICES, cfg.seo.robots);
}

async function askAsset(p, { question, prompt, current, hint, allowUrl, allowedExts }) {
  const custom = Boolean(current) && current !== DEFAULT_ASSET;
  if (!(await p.confirm(question, custom))) return null;
  let resolved;
  await p.text(prompt, {
    initial: custom ? current : "",
    required: true,
    hint,
    validate: (val) => {
      resolved = resolveAsset(val, { allowUrl, allowedExts });
      return resolved.error ?? true;
    },
  });
  return resolved;
}

async function askBranding(p, cfg, prev) {
  log.step("Branding assets");
  log.hint("Skip any of these to keep the default Pewee assets. Files are copied into public/brand/.");
  const assets = {};

  assets.logo = await askAsset(p, {
    question: "Do you want to use a custom logo?",
    prompt: "Path to your logo file",
    current: prev.branding.logo,
    hint: "PNG, JPG, WebP, SVG… Shown at 20×20 in the navbar, so a square image works best.",
  });
  assets.favicon = await askAsset(p, {
    question: "Do you want a custom favicon?",
    prompt: "Path to your favicon file",
    current: prev.branding.favicon !== prev.branding.logo ? prev.branding.favicon : "",
    hint: ".ico, .png or .svg. If you skip this, your logo is used as the favicon.",
    allowedExts: FAVICON_EXTS,
  });
  assets.ogImage = await askAsset(p, {
    question: "Do you want a custom social sharing image?",
    prompt: "Path or URL of your sharing image",
    current: prev.seo.ogImage !== prev.branding.logo ? prev.seo.ogImage : "",
    hint: "Shown when links are shared and a post has no cover image. 1200×630 PNG/JPG recommended.",
    allowUrl: true,
  });

  cfg.branding.showCredit = await p.confirm('Show a small "Built with Pewee" credit in the footer?', prev.branding.showCredit !== false);
  return assets;
}

async function askMongo(p, env) {
  log.step("MongoDB");
  const out = { updates: {}, uri: env.MONGO_DB_URI || "", status: env.MONGO_DB_URI ? "kept" : "later" };

  if (env.MONGO_DB_URI) {
    log.info(`  A MongoDB connection is already set in .env ${c.dim("(URI hidden)")}.`);
    if (await p.confirm("Keep the existing MongoDB connection?", true)) {
      if (await p.confirm("Test the connection now?", false)) {
        const res = await testMongo(env.MONGO_DB_URI, env.DB_NAME);
        if (res.ok) log.ok("Connected to MongoDB.");
        else log.warn(`Could not connect: ${res.message}`);
      }
      return out;
    }
  } else {
    const mode = await p.select(
      "How do you want to set up MongoDB?",
      [
        { value: "now", label: "Connect an existing MongoDB database now", hint: "Atlas or self-hosted" },
        { value: "later", label: "Configure it later", hint: "the blog needs it before it can run" },
      ],
      "now"
    );
    if (mode === "later") return out;
  }

  for (;;) {
    const uri = await p.text("MongoDB connection URI", {
      required: true,
      secret: true,
      hint: "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ or mongodb://localhost:27017",
      validate: v.validateMongoUri,
    });
    const dbName = await p.text("Database name", {
      initial: env.DB_NAME || "pewee",
      required: true,
      hint: "Pewee creates its collections on first use; existing data is never removed.",
      validate: v.validateDbName,
    });

    if (await p.confirm("Test the connection now?", true)) {
      log.hint("Connecting…");
      const res = await testMongo(uri, dbName);
      if (res.ok) {
        log.ok("Connected to MongoDB.");
      } else {
        log.warn(`Could not connect: ${res.message}`);
        const next = await p.select(
          "What would you like to do?",
          [
            { value: "retry", label: "Re-enter the connection details" },
            { value: "keep", label: "Save these details anyway" },
            { value: "later", label: "Configure MongoDB later" },
          ],
          "retry"
        );
        if (next === "retry") continue;
        if (next === "later") return { ...out, updates: {}, uri: env.MONGO_DB_URI || "", status: env.MONGO_DB_URI ? "kept" : "later" };
      }
    }
    return { updates: { MONGO_DB_URI: uri, DB_NAME: dbName }, uri, dbName, status: "new" };
  }
}

async function askCms(p, cfg, prev, env, mongo) {
  log.step("CMS");
  cfg.cms.path = await p.text("CMS dashboard route", {
    initial: prev.cms.path || "/dashboard",
    required: true,
    hint: "Where the admin dashboard lives. Sign-in stays at /auth.",
    transform: v.normalizeCmsPath,
    validate: v.validateCmsPath,
  });

  const adminEmail = (
    await p.text("Admin email", {
      initial: env.ADMIN_EMAIL || cfg.contactEmail,
      required: true,
      hint: "The email you'll sign in to the CMS with. Stored in .env, not in the public config.",
      validate: v.validateEmail,
    })
  ).toLowerCase();

  if (!mongo.uri) {
    log.hint("The admin account is created in MongoDB, so it'll be set up later with: npm run create-admin");
    return { adminEmail, admin: null };
  }

  const when = await p.select(
    "Set up the admin account now?",
    [
      { value: "now", label: "Yes, create or update it now" },
      { value: "later", label: "Later", hint: "run npm run create-admin" },
    ],
    mongo.status === "kept" ? "later" : "now"
  );
  if (when === "later") return { adminEmail, admin: null };

  const name = await p.text("Admin display name", { initial: cfg.author.name, required: true });
  const suggestedUsername = adminEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 15);
  const username = await p.text("Admin username (4–15 characters)", {
    initial: suggestedUsername.length >= 4 ? suggestedUsername : "",
    required: true,
    validate: v.validateUsername,
  });
  let password;
  for (;;) {
    password = await p.text("Admin password (min 8 characters)", { required: true, secret: true, validate: v.validatePassword });
    const again = await p.text("Confirm password", { required: true, secret: true });
    if (again === password) break;
    log.error("Passwords don't match. Try again.");
  }
  log.hint("If this email already has an account, it's promoted to admin and its password is reset. Posts are untouched.");
  return { adminEmail, admin: { email: adminEmail, name, username, password } };
}

/* ── Main flow ─────────────────────────────────────────────────────── */

async function resetBranding(p) {
  log.info(`\nThis resets ${c.bold("pewee.config.json")} to the Pewee defaults.`);
  log.hint("Your .env, posts, users and files in public/ are not touched.");
  if (!(await p.confirm("Reset branding to the Pewee defaults?", false))) {
    log.info("Nothing changed.");
    return;
  }
  saveConfig(clone(DEFAULT_CONFIG));
  log.ok("Branding reset. Run npm run setup again whenever you're ready to configure your blog.");
}

async function run(p) {
  const prev = loadConfig();
  const envFile = readEnv();
  const env = envFile.values;

  log.info(`\n${c.bold("Welcome to Pewee!")} ${c.dim("Just write. Just publish.")}`);

  if (argv.includes("--reset")) return resetBranding(p);

  const firstRun = !prev.configured;
  if (firstRun) {
    log.info("Let's set up your blog. It takes about two minutes.");
    log.hint("Press Enter to accept a suggestion, or Ctrl+C at any time to quit without saving.");
  } else {
    log.info("This project is already configured. Current settings:");
    printSummary(prev, env);
    const action = await p.select(
      "What would you like to do?",
      [
        { value: "update", label: "Update my settings", hint: "current values are pre-filled" },
        { value: "reset", label: "Reset branding to the Pewee defaults" },
        { value: "exit", label: "Exit without changes" },
      ],
      "update"
    );
    if (action === "exit") return log.info("Nothing changed.");
    if (action === "reset") return resetBranding(p);
  }

  const cfg = clone(prev);
  await askIdentity(p, cfg, prev, firstRun);
  await askWebsite(p, cfg, prev, firstRun);
  await askSeo(p, cfg, prev, firstRun);
  const assets = await askBranding(p, cfg, prev);
  const mongo = await askMongo(p, env);
  const cms = await askCms(p, cfg, prev, env, mongo);

  /* ── Work out .env changes (values never printed) ── */
  const envUpdates = { ...mongo.updates };
  if (!env.JWT_SECRET) envUpdates.JWT_SECRET = randomBytes(32).toString("base64");
  if (cms.adminEmail !== (env.ADMIN_EMAIL ?? "")) envUpdates.ADMIN_EMAIL = cms.adminEmail;

  if (env.NEXT_PUBLIC_APP_URL && env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "") !== cfg.siteUrl) {
    log.warn(`.env sets NEXT_PUBLIC_APP_URL=${env.NEXT_PUBLIC_APP_URL}, which overrides your site URL.`);
    if (await p.confirm("Remove that override so pewee.config.json is used?", true)) envUpdates.NEXT_PUBLIC_APP_URL = null;
  }

  const changedKeys = Object.keys(envUpdates).filter((k) => (env[k] ?? null) !== envUpdates[k]);
  const overwritten = changedKeys.filter((k) => env[k]);

  /* ── Review ── */
  const preview = clone(cfg);
  preview.branding.logo = assets.logo ? assets.logo.value || `/brand/logo${assets.logo.ext}` : DEFAULT_ASSET;
  preview.branding.favicon = assets.favicon
    ? assets.favicon.value || `/brand/favicon${assets.favicon.ext}`
    : preview.branding.logo;
  preview.seo.ogImage = assets.ogImage
    ? assets.ogImage.value || `/brand/og-image${assets.ogImage.ext}`
    : preview.branding.logo;

  log.step("Review");
  printSummary(preview, { ...env, ...Object.fromEntries(Object.entries(envUpdates).filter(([, x]) => x !== null)) });
  if (cms.admin) log.info(`  ${c.dim("Admin account")}  will be created/updated for ${cms.admin.email}`);
  if (changedKeys.length) {
    log.info(`\n  .env: ${envFile.exists ? "update" : "create"} ${changedKeys.join(", ")} ${c.dim("(values hidden)")}`);
  }

  let writeEnv = changedKeys.length > 0;
  if (overwritten.length) {
    log.warn(`This replaces existing values in .env: ${overwritten.join(", ")}. Other entries are kept.`);
    writeEnv = await p.confirm("Overwrite those .env values?", false);
    if (!writeEnv) log.hint(".env will be left exactly as it is.");
  }

  if (!(await p.confirm("Save and apply this configuration?", true))) {
    log.info("Nothing was saved.");
    return;
  }

  /* ── Apply ── */
  for (const [key, name] of [["logo", "logo"], ["favicon", "favicon"], ["ogImage", "og-image"]]) {
    const a = assets[key];
    if (a?.kind === "file") a.value = copyAsset(a, name);
  }
  cfg.branding.logo = assets.logo?.value || DEFAULT_ASSET;
  cfg.branding.favicon = assets.favicon?.value || cfg.branding.logo;
  cfg.seo.ogImage = assets.ogImage?.value || cfg.branding.logo;
  cfg.configured = true;

  saveConfig(cfg);
  log.ok("Saved branding to pewee.config.json");
  if (Object.values(assets).some((a) => a?.kind === "file")) log.ok("Copied branding assets to public/brand/");

  if (writeEnv) {
    writeAtomic(ENV_PATH, buildEnv(envFile, envUpdates));
    log.ok(`${envFile.exists ? "Updated" : "Created"} .env ${c.dim("(git-ignored, secrets not shown)")}`);
    if (envUpdates.JWT_SECRET) log.ok("Generated a random JWT_SECRET for CMS sessions");
  }
  if (ensureEnvExample()) log.ok("Created .env.example");

  // The connection the app will actually use after this run.
  const newDbSaved = mongo.status === "new" && writeEnv;
  const dbReady = newDbSaved || Boolean(env.MONGO_DB_URI);
  let adminCreated = false;
  if (cms.admin && mongo.status === "new" && !writeEnv) {
    log.warn("Skipped creating the admin account because the new MongoDB details weren't saved to .env.");
  } else if (cms.admin && dbReady) {
    log.info();
    const res = spawnSync(process.execPath, [join(ROOT, "scripts", "create-admin.mjs")], {
      cwd: ROOT,
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...process.env,
        MONGO_DB_URI: newDbSaved ? mongo.uri : env.MONGO_DB_URI,
        ...(newDbSaved ? { DB_NAME: mongo.dbName } : env.DB_NAME ? { DB_NAME: env.DB_NAME } : {}),
        ADMIN_EMAIL: cms.admin.email,
        ADMIN_NAME: cms.admin.name,
        ADMIN_USERNAME: cms.admin.username,
        ADMIN_PASSWORD: cms.admin.password,
      },
    });
    adminCreated = res.status === 0;
    if (!adminCreated) log.warn("The admin account wasn't created. Fix the issue above, then run: npm run create-admin");
  }

  /* ── Next steps ── */
  log.info(`\n${c.green(c.bold("Your blog is configured!"))}\n`);
  log.info(c.bold("Next steps:"));
  const steps = [];
  if (!dbReady) {
    steps.push(
      `Add your MongoDB connection to .env (see .env.example):\n       MONGO_DB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/\n       DB_NAME=pewee\n     Then run ${c.cyan("npm run setup")} again or ${c.cyan("npm run create-admin")}.`
    );
  } else if (!adminCreated) {
    steps.push(`${firstRun ? "Create your CMS login" : "Need a (new) CMS login?"} ${c.cyan("npm run create-admin")}`);
  }
  steps.push(`Start the development server: ${c.cyan("npm run dev")}`);
  steps.push(`Open your blog: ${c.cyan("http://localhost:3000")}`);
  steps.push(`Sign in to the CMS at ${c.cyan("http://localhost:3000/auth")} → ${cfg.cms.path}`);
  steps.push(`Commit pewee.config.json${Object.values(assets).some((a) => a?.kind === "file") ? " and public/brand/" : ""} (never commit .env)`);
  steps.forEach((s, i) => log.info(`  ${i + 1}. ${s}`));
  log.hint("\nRe-run npm run setup any time to change these settings. Restart npm run dev to pick up a new CMS route.");
  log.info(`\nHappy publishing!`);
}

if (argv.includes("--help") || argv.includes("-h")) {
  log.info("Usage: npm run setup [-- --reset]\n\n  --reset   Reset branding (pewee.config.json) to the Pewee defaults.");
  exit(0);
}

const prompter = createPrompter();
run(prompter)
  .then(() => prompter.close())
  .catch((err) => {
    prompter.close();
    if (err instanceof CancelledError) {
      log.info(`\n${c.yellow("Setup cancelled.")} Nothing was saved.`);
      exit(130);
    }
    log.error(err?.message ?? String(err));
    exit(1);
  });
