# Pewee

<img src="public/Pewee..png" alt="Pewee" width="96" />

_Just write. Just publish._

Pewee is a minimal, self-hosted, open-source blog with a built-in CMS dashboard, built with Next.js and MongoDB. Clone it, run `npm run setup`, answer a few questions, and deploy it as your own blog. No need to hunt through the code to rebrand it.

- **Reading experience:** a quiet, typographic dark theme, a floating table of contents, reading time, and share links.
- **CMS dashboard:** a rich-text (Tiptap) editor with live preview, plus create, edit, archive and delete.
- **SEO:** per-post metadata, Open Graph and Twitter cards, JSON-LD, a `sitemap.xml`, `robots.txt` and an RSS feed.
- **Fast:** pages are statically generated and refresh as soon as you publish.
- **Yours in two minutes:** an interactive setup wizard configures your name, URL, author, SEO, social links, logo, MongoDB and admin account. All public branding lives in one file, `pewee.config.json`.

---

## Contents

- [Quick start](#quick-start)
- [First-time setup (`npm run setup`)](#first-time-setup)
- [MongoDB setup](#mongodb-setup)
- [Environment variables](#environment-variables)
- [Branding configuration](#branding-configuration)
- [Using the CMS dashboard](#using-the-cms-dashboard)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Scripts](#scripts)

---

## Quick start

Requirements: **Node.js 20.9+**, npm, and a MongoDB database (see [MongoDB setup](#mongodb-setup)). You can also connect the database later.

```bash
git clone https://github.com/anshumancodes/Pewee.git my-blog
cd my-blog
npm install
npm run setup               # answer the questions; this configures everything
npm run dev
```

- Blog: http://localhost:3000
- CMS sign-in: http://localhost:3000/auth (redirects to your CMS route, `/dashboard` by default, once you're signed in)

That's it: clone → install → setup → start publishing.

---

## First-time setup

`npm run setup` is an interactive wizard that turns Pewee into *your* blog. It asks, in groups:

| Group | What it asks |
| ----- | ------------ |
| **Blog identity** | Name, tagline, what the blog is about, language, author name and optional bio. |
| **Website** | Site URL (normalised, no trailing slash), public contact email, timezone for post dates, and optional GitHub, X/Twitter, LinkedIn, Instagram, YouTube and website links. Handles like `@you` are expanded to full URLs. |
| **SEO** | Default title, meta description, keywords, Open Graph title and description, X/Twitter card style and handle, and whether search engines should index the site. It suggests good defaults from your name, tagline and description, and you can edit them. |
| **Branding assets** | Optional custom logo, favicon and social sharing image. Local files are validated and copied to `public/brand/`, and a URL works for the sharing image. Skip any of these to keep the Pewee defaults. |
| **MongoDB** | Connect now (the URI is typed hidden and never printed, and you can test the connection) or configure it later. |
| **CMS** | The dashboard route (default `/dashboard`), the admin email, and optionally creating the admin account now. |

You then see a summary and confirm before anything is written. The wizard writes:

- **`pewee.config.json`**: public branding and SEO. Commit this file.
- **`public/brand/`**: copies of any logo, favicon or sharing image you supplied. Commit these too.
- **`.env`**: `MONGO_DB_URI`, `DB_NAME`, `ADMIN_EMAIL` and a generated `JWT_SECRET`. `.env` is git-ignored and its values are never printed.

The admin password is typed hidden and passed straight to `npm run create-admin`, which stores only a bcrypt hash. It's never written to a file.

**Running it again is safe.** Pewee detects an existing configuration and shows the current settings. You can then update them (current values are pre-filled), reset branding, or exit. It never touches posts, users or other database records. It changes only the `.env` keys it manages, keeps every other line, and asks before replacing an existing value. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> at any time to quit without saving.

```bash
npm run setup               # set up, or update existing settings
npm run setup -- --reset    # reset pewee.config.json to the Pewee defaults (asks first)
```

> Restart `npm run dev` after changing the CMS route. Rebuild for production after any change.

---

## MongoDB setup

Pewee stores posts and admin accounts in MongoDB through Mongoose. You don't need to create collections or run migrations; they're created on first use.

The easiest path is to get a connection string (below) and paste it when `npm run setup` asks. If you picked "configure later", add `MONGO_DB_URI` and `DB_NAME` to `.env` yourself (see [`.env.example`](.env.example)), then run `npm run setup` again or `npm run create-admin`.

### Option A: MongoDB Atlas (hosted, free tier available)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, allow your IP for local development. For serverless hosts like Vercel, allow `0.0.0.0/0`.
4. Click **Connect → Drivers** and copy the connection string:
   ```
   MONGO_DB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
   DB_NAME=pewee
   ```

### Option B: local MongoDB

```bash
docker run -d --name pewee-mongo -p 27017:27017 mongo:7
```

```
MONGO_DB_URI=mongodb://localhost:27017
DB_NAME=pewee
```

### Data model

| Collection | Purpose |
| ---------- | ------- |
| `blogs`    | Posts: `title`, `slug`, `content` (HTML), `author`, `coverImg`, `archived`, `series`, `createdBy`, `deletedBy`, plus timestamps. Deleting a post is a soft delete that sets `deletedBy`. |
| `users`    | CMS accounts: `Name`, `username`, `email`, `password` (bcrypt hash), `role` (`ADMIN` / `USER`). Only `ADMIN` users can sign in to the dashboard. |
| `series`   | Optional grouping of posts into a series (schema is ready for future use). |

---

## Environment variables

`npm run setup` writes these for you. They're all documented in [`.env.example`](.env.example). Only secrets and deployment settings live here. Branding lives in `pewee.config.json`.

| Variable              | Required          | Description |
| --------------------- | ----------------- | ----------- |
| `MONGO_DB_URI`        | ✅                | MongoDB connection string. |
| `DB_NAME`             | recommended       | Database name. Optional if the URI already includes one. |
| `JWT_SECRET`          | ✅ in production  | Secret that signs CMS sessions. Generate one with `openssl rand -base64 32`. |
| `ADMIN_EMAIL`         | optional          | Default email for `npm run create-admin`. |
| `NEXT_PUBLIC_APP_URL` | optional          | Overrides `siteUrl` from `pewee.config.json`, e.g. for preview deployments. No trailing slash. |
| `NEXT_PUBLIC_GA_ID`   | optional          | Google Analytics ID (`G-…`). Analytics is off when this is empty. |

> `NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them.

---

## Branding configuration

**All public branding lives in [`pewee.config.json`](pewee.config.json)**, the single source of truth. `npm run setup` generates it, and you can also edit it by hand. [`src/site.config.ts`](src/site.config.ts) reads it and exposes it to the app.

```jsonc
{
  "configured": true,                  // set by the wizard
  "siteName": "My Engineering Notes",  // navbar, footer, dashboard, <title> suffix, RSS, JSON-LD
  "tagline": "Notes from my engineering journey",
  "description": "What the blog is about (RSS feed, structured data)",
  "siteUrl": "https://example.com",    // canonical URLs, Open Graph, sitemap, robots, RSS
  "language": "en", "locale": "en_US", // <html lang>, og:locale, date formatting
  "timezone": "Europe/London",         // post dates ("" = server timezone)
  "contactEmail": "",
  "author": { "name": "John Doe", "bio": "" },   // default post author, metadata, JSON-LD
  "seo": {
    "title": "…", "description": "…", "keywords": [],
    "ogTitle": "", "ogDescription": "",           // "" = same as title/description
    "ogImage": "/brand/og-image.png",             // default share image (path in /public or URL)
    "twitterCard": "summary_large_image",         // or "summary"
    "twitterHandle": "johndoe",                   // adds twitter:site / twitter:creator
    "robots": "index, follow"                     // or "noindex, nofollow", …
  },
  "socials": { "github": "", "twitter": "", "linkedin": "", "instagram": "", "youtube": "", "website": "" },
  "branding": { "logo": "/brand/logo.png", "favicon": "/brand/logo.png", "themeColor": "#161616", "showCredit": true },
  "cms": { "path": "/dashboard" }
}
```

Post titles, excerpts, authors and cover images always take precedence over these defaults on article pages.

Secrets never go in this file. Keep them in `.env`.

A few rarely-changed options, such as the announcement banner and the article "Discuss" link, are still set directly in `src/site.config.ts`. The visual theme (colors and fonts) is defined with CSS variables at the top of [`src/app/globals.css`](src/app/globals.css).

---

## Using the CMS dashboard

### 1. Create an admin account

`npm run setup` can do this for you. To create or reset an account separately:

```bash
npm run create-admin
# or non-interactively:
ADMIN_PASSWORD='a-strong-password' npm run create-admin -- --email you@example.com --name "Your Name" --username yourname
```

If you run the command again with an existing email, Pewee promotes that user to admin and resets their password. Use this to recover a lost password.

### 2. Sign in

Go to **`/auth`** and sign in. Sessions last 8 hours and use an HTTP-only cookie.

The dashboard lives at `/dashboard` by default. If you chose a different route in setup (`cms.path`, e.g. `/admin`), the dashboard is served there, `/dashboard` redirects to it, and both are protected. The routes below assume the default.

### 3. Write and manage posts

| Page | What you can do |
| ---- | --------------- |
| `/dashboard` | Overview: total, published, archived and deleted counts, plus recent posts. |
| `/dashboard/manage-blog` | Create a post (the slug is generated from the title), edit, preview, archive or unarchive, and delete. |

- **Publish:** a new post goes live as soon as you save it.
- **Archive:** hides a post from the public site, sitemap and feed while keeping it in the CMS.
- **Delete:** soft-deletes the post. It disappears from the CMS and the site, but the document stays in MongoDB.
- Slugs must be 15–100 characters and content at least 100 characters.

Every create, edit, archive and delete immediately refreshes the home page, `/blog`, the post page, `sitemap.xml` and `rss.xml`.

---

## Deployment

Pewee is a standard Next.js app and runs anywhere that supports Node.js.

### Vercel

1. Run `npm run setup` locally, then commit `pewee.config.json` (and `public/brand/` if you added assets) and push your fork to GitHub. Import it in Vercel.
2. Add the environment variables from your `.env`: `MONGO_DB_URI`, `DB_NAME`, `JWT_SECRET` and, optionally, `NEXT_PUBLIC_GA_ID`. Your site URL comes from `pewee.config.json`.
3. In MongoDB Atlas **Network Access**, allow `0.0.0.0/0`. Vercel uses dynamic IPs, and the build itself reads from the database to pre-render pages.
4. Deploy, then run `npm run create-admin` locally against the production database to create your login.

### Any Node.js host (VPS, Railway, Render, Fly.io, …)

```bash
npm ci
npm run build
npm start          # serves on PORT (default 3000)
```

Set the same environment variables on the host, and deploy with your committed `pewee.config.json`. If the build environment can't reach MongoDB, the build still succeeds. Pages render empty at first and fill in on the next request after the hourly revalidation, or as soon as you publish.

### After deploying

- Visit `/sitemap.xml`, `/robots.txt` and `/rss.xml` to confirm your URL is correct.
- Submit the sitemap in Google Search Console.

---

## Project structure

```
pewee.config.json             ← branding and SEO (generated by npm run setup)
src/
├── site.config.ts            ← reads pewee.config.json for the app
├── proxy.ts                  ← protects the CMS route (Next.js middleware)
├── app/
│   ├── page.tsx              ← home: post list
│   ├── blog/page.tsx         ← /blog: post list
│   ├── blog/[slug]/page.tsx  ← article page (metadata, JSON-LD, TOC)
│   ├── auth/page.tsx         ← CMS sign-in
│   ├── dashboard/            ← CMS (overview, manage posts)
│   ├── api/admin/            ← login (POST) / logout (DELETE)
│   ├── api/blog/             ← post CRUD API
│   ├── sitemap.ts, robots.ts ← SEO
│   └── rss.xml/route.ts      ← RSS 2.0 feed
├── components/               ← navbar, footer, blog cards, TOC, editor
├── db/dbconnect.ts           ← cached Mongoose connection
├── lib/
│   ├── blog.ts               ← server-side post queries and helpers
│   ├── auth.ts               ← JWT session helpers
│   └── revalidate.ts         ← cache refresh after CMS changes
└── schemas/                  ← Mongoose models (Blog, User, Series)
scripts/
├── setup.mjs                 ← interactive setup wizard (npm run setup)
├── setup/                    ← wizard helpers: prompts, validation, file I/O
└── create-admin.mjs          ← create or reset an admin account
```

---

## API reference

All responses use the shape `{ statuscode, data, message }`. Write endpoints need an admin session cookie, which you get by signing in at `/auth`.

| Method | Route | Auth | Description |
| ------ | ----- | ---- | ----------- |
| `POST`   | `/api/admin`               | –     | Sign in with `{ email, password }`. |
| `DELETE` | `/api/admin`               | –     | Sign out. |
| `GET`    | `/api/blog/fetch/all`      | –     | Published posts. Supports `?page=&limit=` (max 50). Admins can add `includeArchived=true`. |
| `GET`    | `/api/blog/fetch/:slug`    | –     | A single published post. Admins can also fetch archived posts. |
| `POST`   | `/api/blog/create`         | admin | Create a post: `{ title, slug, author, content, coverImg? }`. |
| `PATCH`  | `/api/blog/update`         | admin | Update a post: `{ slug, title?, content?, author?, coverImg?, archived?, newSlug? }`. |
| `DELETE` | `/api/blog/delete`         | admin | Soft-delete a post: `{ slug }`. |

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run setup`        | Interactive first-time setup, or update your branding (safe to re-run). |
| `npm run dev`          | Start the dev server. |
| `npm run build`        | Create a production build. |
| `npm start`            | Serve the production build. |
| `npm run lint`         | Run ESLint. |
| `npm run typecheck`    | Run the TypeScript type check. |
| `npm run create-admin` | Create or reset a CMS admin account. |

---

## Roadmap

- Newsletter: posts flow through one publish path (`src/lib/revalidate.ts` is called on every create and update), so an "on publish" email hook can go there later without touching the blog or the CMS.
