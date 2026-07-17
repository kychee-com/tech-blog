# Run402 Blog

The Run402 engineering blog — writing about **agent-native programming**:
designing APIs, CLIs, errors, documentation, and infrastructure so coding
agents can use them correctly, predictably, and autonomously.

A static [Astro](https://astro.build) site. **Content lives in Git as
Markdown/MDX — there is no CMS and no database.** It builds to plain static
HTML/CSS/JS with RSS, a sitemap, `robots.txt`, and a Pagefind search index, and
deploys on [Run402](https://run402.com) at `blog.run402.com`.

> Derived from the [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus)
> theme (MIT). See [DESIGN.md](./DESIGN.md) for the architecture and decisions.

## Writing a post

Posts live in **`src/content/post/`**. Add one `.mdx` (or `.md`) file:

```mdx
---
title: "Errors that help agents recover"
description: "A structured error is a fix an agent can apply."
publishDate: "2026-08-01"
# --- everything below is optional ---
updatedDate: "2026-08-03"
draft: false              # true → excluded from prod build, feed, search, routes
tags: ["errors", "api-design"]
pinned: false
series: "Agent-native programming"
# ogImage: "/custom-card.png"   # defaults to a generated per-post card
# skill: { name: "structured-errors", path: "skills/structured-errors" }
---

Your article body in Markdown/MDX. Code blocks, `:::note[Title]` callouts,
and JSON examples all render.
```

Only `title`, `description`, and `publishDate` are required. Invalid frontmatter
**fails the build** with a schema error (`src/content.config.ts`).

- **Drafts:** set `draft: true`. Draft posts are visible in `dev` but excluded
  from the production build, the article index, RSS, the sitemap, search, and
  static routes.
- **Dates:** `publishDate` is required; add `updatedDate` when you revise.
- **Slug:** the filename. `hello-agents.mdx` → `/posts/hello-agents/`.

## Commands

```bash
npm install        # install dependencies (Node >= 22)
npm run dev        # local dev server with hot reload
npm run check      # astro check — validates content schema + types
npm run build      # production build → dist/ (INCLUDING the Pagefind search index)
npm run preview    # serve the production build locally
npm run lint       # biome
```

**`npm run build` is the whole deployable step** — it runs `astro build` and
then indexes the output with Pagefind (`pagefind --site dist`) in one command.
There is no separate post-build step to remember. Search works against the
built site (`npm run preview`), not just in dev.

## What you get

- `/` — home: hero, the newest article, links to everything.
- `/posts/` — the article index (reverse chronological, drafts excluded in prod).
- `/posts/<slug>/` — the article, with TOC, heading anchors, reading time, tags,
  prev/next, and a generated OG image.
- `/about/` — what the blog is.
- Search (Pagefind), RSS (`/rss.xml`), sitemap, `robots.txt`, a web manifest,
  favicons, light/dark themes.

## Deployment

Deployed on Run402 via GitHub Actions. Every push to `main` builds and runs
`run402 sites deploy-dir dist`, which inside Actions exchanges the GitHub OIDC
token for a short-lived Run402 CI session — **no credential is stored in this
repo.** The static `dist/` (search index included) ships to Run402's CAS and
serves from the edge.

**Live:** https://tech-blog.run402.com (project `prj_1784293532542_0002`, org
"Run402"). `blog.run402.com` is a platform-reserved subdomain name and needs a
Run402 operator to release/assign it — see [DESIGN.md](./DESIGN.md) → *Deploying*.
The SSR-migration path is in DESIGN.md → *Going SSR*.

## Git is the source of truth

There is no admin panel and no external content service. To publish, add or edit
a Markdown/MDX file and push. To unpublish, set `draft: true` or delete the file.
The production site is entirely static and reproducible from this repo.
