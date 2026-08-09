# thblog

Mobile-first personal blog. Public readers get a fast reading experience; you sign in to upload Markdown, convert it to posts, and toggle **public / private**.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Drizzle ORM + SQLite / LibSQL (Turso-ready)
- Better Auth (httpOnly session cookie, 60-day lifetime)
- remark / rehype + Shiki for Markdown → HTML
- Serwist PWA (installable on mobile)

## Quick start

```bash
cp .env.example .env
# edit ADMIN_EMAIL / ADMIN_PASSWORD / BETTER_AUTH_SECRET

npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: [http://localhost:3000/admin](http://localhost:3000/admin).

Default seed credentials (change these):

- Email: `admin@thblog.local`
- Password: `changeme-thblog`

## Markdown format

```md
---
title: Two Sum
slug: two-sum
tags: [arrays, hash-map]
excerpt: Pattern — hashmap for complements
visibility: private
---

## Pattern

Your notes and code here.
```

Upload the file in **Admin**. Visibility in frontmatter is applied on create; you can flip **public / private** anytime in the admin list.

## Visibility rules

| Visibility | Home / tags / RSS / sitemap | Direct URL |
|------------|-----------------------------|------------|
| `public`   | Listed                      | Anyone     |
| `private`  | Hidden                      | Admin only (others get 404) |

## PWA on mobile

1. Deploy (or use HTTPS locally).
2. Open the site in Chrome/Safari.
3. **Add to Home Screen** / Install app.
4. Sign in once on `/admin/login` — the session cookie lasts **60 days** and refreshes while you use the app, so you should not need to log in every open.

Service worker caches public pages/assets. `/admin` and `/api` are network-only so private data is not cached as public.

## Production (Vercel)

1. Create a Turso database (or any LibSQL URL) and set:
   - `DATABASE_URL`
   - `DATABASE_AUTH_TOKEN` (if required)
2. Set `BETTER_AUTH_SECRET` (long random string) and `BETTER_AUTH_URL` to your production origin.
3. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then run `npm run db:setup` against that database (locally with prod env, or via a one-off job).
4. Deploy to Vercel.

```bash
npx vercel
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production |
| `npm run db:push` | Apply schema |
| `npm run db:seed` | Admin user + sample posts |
| `npm run db:setup` | push + seed |

## Project layout

- `src/app` — public pages, admin, API, RSS, sitemap, PWA SW
- `src/lib` — auth, db, markdown pipeline, posts
- `src/components` — UI shell, admin dashboard, reading UX
- `scripts/seed.ts` — admin + sample posts
