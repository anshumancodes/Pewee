/** Validators return `true` or a human-readable error message. Normalisers return a cleaned value. */

export function normalizeSiteUrl(value) {
  let v = value.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = `https://${v}`;
  return v.replace(/\/+$/, "");
}

export function validateSiteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "That doesn't look like a URL. Example: https://example.com";
  }
  if (!["http:", "https:"].includes(url.protocol)) return "Use an http:// or https:// URL.";
  if (!url.hostname.includes(".") && url.hostname !== "localhost")
    return "Include the full domain, e.g. https://example.com";
  if (url.pathname !== "/" || url.search || url.hash)
    return "Use the root of your site without a path, e.g. https://example.com";
  return true;
}

export function validateHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? true : "Use an http:// or https:// URL.";
  } catch {
    return "That doesn't look like a valid URL.";
  }
}

export function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : "Please enter a valid email address, e.g. you@example.com";
}

export function validateLanguage(value) {
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    return canonical ? true : "Use a language tag such as en, en-US, fr or pt-BR.";
  } catch {
    return "Use a language tag such as en, en-US, fr or pt-BR.";
  }
}

export function normalizeLanguage(value) {
  try {
    return Intl.getCanonicalLocales(value)[0] ?? value;
  } catch {
    return value;
  }
}

const DEFAULT_REGIONS = {
  en: "US", fr: "FR", de: "DE", es: "ES", it: "IT", pt: "BR", nl: "NL", sv: "SE", pl: "PL",
  ru: "RU", ja: "JP", zh: "CN", ko: "KR", hi: "IN", tr: "TR", id: "ID", ar: "SA", uk: "UA",
};

/** "en" → "en_US", "pt-BR" → "pt_BR" (Open Graph locale format). */
export function toOgLocale(language) {
  const [lang, region] = language.split("-");
  const r = region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : DEFAULT_REGIONS[lang.toLowerCase()];
  return r ? `${lang.toLowerCase()}_${r}` : lang.toLowerCase();
}

export function validateTimezone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return "Unknown timezone. Use an IANA name such as UTC, Europe/London or Asia/Kolkata.";
  }
}

export function systemTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const RESERVED_ROUTES = new Set(["api", "auth", "blog", "_next", "rss.xml", "sitemap.xml", "robots.txt", "favicon.ico"]);

export function normalizeCmsPath(value) {
  const v = value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return v ? `/${v}` : "";
}

export function validateCmsPath(value) {
  const v = value.replace(/^\//, "");
  if (!/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/.test(v))
    return "Use lowercase letters, numbers and dashes, e.g. /dashboard or /admin.";
  if (RESERVED_ROUTES.has(v.split("/")[0])) return `"/${v.split("/")[0]}" is already used by the blog. Pick another route.`;
  return true;
}

export function validateMongoUri(value) {
  if (!/^mongodb(\+srv)?:\/\/\S+$/.test(value))
    return "MongoDB URIs start with mongodb:// or mongodb+srv:// (e.g. from Atlas → Connect → Drivers).";
  return true;
}

export function validateDbName(value) {
  if (value.length > 63) return "Database names must be 63 characters or fewer.";
  if (/[/\\. "$*<>:|?]/.test(value)) return 'Database names cannot contain spaces or any of / \\ . " $ * < > : | ?';
  return true;
}

export function validateUsername(value) {
  return value.length >= 4 && value.length <= 15 ? true : "Username must be between 4 and 15 characters.";
}

export function validatePassword(value) {
  return value.length >= 8 ? true : "Password must be at least 8 characters.";
}

export function maxLength(n) {
  return (value) => (value.length <= n ? true : `Keep it under ${n} characters (currently ${value.length}).`);
}

/* ── Social links: accept a full URL or just a handle ────────────────── */

const SOCIAL_BASES = {
  github: "https://github.com/",
  twitter: "https://x.com/",
  linkedin: "https://www.linkedin.com/in/",
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/@",
};

export function normalizeSocial(key, value) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (key === "website") return normalizeSiteUrl(v);
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(v)) return `https://${v}`; // e.g. github.com/me
  const handle = v.replace(/^@/, "").replace(/^in\//, "");
  return `${SOCIAL_BASES[key]}${handle}`;
}

/** Extract an X/Twitter handle (without @) from a profile URL. */
export function twitterHandleFromUrl(url) {
  const m = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?$/i.exec(url ?? "");
  return m ? m[1] : "";
}
