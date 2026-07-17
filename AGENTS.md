# AGENTS.md

Operational notes for coding agents working in this repo. Keep it accurate.

## What this is

The Run402 engineering blog: a **static** Astro site, content in Git as MDX,
deployed on Run402. Canonical and live URL: `tech-blog.run402.com`
(`blog.run402.com` is the desired future home but is platform-reserved — do not
switch canonical URLs to it until an operator releases the name). No CMS, no
database, no runtime render calls. See [DESIGN.md](./DESIGN.md) for the why.

## Where things live

- **Posts:** `src/content/post/*.mdx` — the only content surface.
- **Schema:** `src/content.config.ts` — the post frontmatter contract.
- **Skills:** `skills/<name>/SKILL.md` (+ `references/`) — companion Agent
  Skills; linked from a post via `skill: {name, path}` frontmatter, rendered by
  `src/components/blog/SkillCard.astro`.
- **Roadmap:** `src/pages/roadmap.astro` — hand-authored entries array; update
  statuses when articles publish.
- **Config:** `astro.config.ts`, `src/site.config.ts` (metadata, nav, code themes).
- **Theme/tokens:** `src/styles/global.css` (OKLCH palette, light + dark).
- **Deploy:** `.github/workflows/deploy.yml` (keyless OIDC → Run402).

## Validate before you commit

```bash
npm run check      # content schema + types
npm run build      # full static build INCLUDING the Pagefind search index
```

Both must pass. `npm run build` is the complete deployable step — never rely on
a separate post-build command.

## Rules

- **Git content is canonical.** Publish/unpublish by adding, editing, or setting
  `draft: true` on files. There is no admin UI or database.
- **Production is static** (`output: 'static'`). Don't introduce SSR, a database,
  a UI framework, analytics, comments, or external font/script requests. If a
  dynamic route is genuinely needed, follow DESIGN.md → *Going SSR* (a config
  flip to the `@run402/astro` preset), don't hand-roll it.
- **Preserve draft filtering** — `getAllPosts()` in `src/data/post.ts` gates on
  `import.meta.env.PROD`. Drafts must stay out of prod indexes, feeds, search,
  and routes.
- **Canonical URLs stay under `tech-blog.run402.com`** (`src/site.config.ts`
  `url`). RSS, sitemap, and OG URLs derive from it. Flip to `blog.run402.com`
  only when that reserved subdomain is actually assigned and serving.
- **Don't reintroduce Astro Cactus starter branding** — demo author, social
  links, webmentions, the `notes` collection, placeholder copy, cactus icons.
  It was deliberately removed.
- **This is a standalone repo.** Do not add coupling to `run402-private` or the
  gateway; consume Run402 over the public CLI/SDK only.
