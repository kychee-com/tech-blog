# Design notes — Run402 blog

A lightweight record of the decisions behind this repo, so a future agent (or
human) can change it without re-deriving them. Not a spec; the code is the
spec. When a decision here goes stale, fix the decision.

## What this is

The Run402 engineering blog — a static Astro site about **agent-native
programming**. Content is Markdown/MDX in Git. No CMS, no database, no runtime
API calls to render an article. It deploys on Run402 and is served at
`blog.run402.com`.

It is also a **dogfood**: a real first-party site shipped on the same platform
we sell, so deploy and maintenance friction reaches us before it reaches a
customer's agent.

## The four decisions

**1 · Its own repo, not a monorepo app.** This lives in `kychee-com/tech-blog`,
public + MIT, alongside the other demo apps (`kychon`, `krello`, `skmeld`) —
not inside `run402-private/apps/`. Rationale: maximal openness, and a clean
demo of building *on* Run402 with the public CLI/SDK rather than reaching into
platform internals. It carries its own `package.json` and lockfile; nothing
here couples to the gateway.

**2 · CI/CD via GitHub Actions + keyless OIDC.** `.github/workflows/deploy.yml`
builds and deploys on every push to `main`. `run402 deploy apply` inside
Actions automatically exchanges the GitHub OIDC token for a short-lived,
deploy-scoped Run402 CI session (`permissions: id-token: write`). No Run402
credential is stored in the repo — the same federation the operator console
uses.

**3 · Binary assets are a non-issue.** Astro's `dist/` carries binary — the
Pagefind index (`.pf_*`), the satori-generated OG PNGs, favicons. The real
Run402 deploy path (`/content/v1` + `/apply/v1`, CAS keyed by SHA-256 of the
raw bytes) is byte-native — it is literally how every Run402 site ships images.
The `run402` CLI's `--dir` upload handles it. (The only text-only shortcut is
`run402-private/apps/_deploy`, which we don't use.)

**4 · Static now, genuinely SSR-ready.** `output: 'static'` today because the
blog has no dynamic routes and a credential-free `npm run build` is the right
default. It is SSR-ready in the honest sense: `@run402/astro`'s preset
(`output: 'server'` + per-route `export const prerender = true`) is the shipped,
documented model, and the installed Astro (7.0.4) is inside its peer range
(`>=6 <8`) — verified. See **Going SSR** below; the flip is real config, not a
rewrite.

## Stack

- **Astro 7** (from the current Astro Cactus baseline, v8.2.0), `output: 'static'`.
- **MDX** content via Astro Content Collections (`src/content.config.ts`).
- **Expressive Code** for code blocks (`night-owl` dark / `github-light` light).
- **Pagefind** for build-time search (folded into `npm run build`).
- **satori** for per-post OG images (`src/pages/og-image/`), local, build-time.
- **Tailwind 4** `@theme` tokens for the palette; no UI framework, no runtime JS
  framework, no external fonts.

Dropped from Cactus: webmentions, the `notes` collection, social-link demo
content, the `postinstall` sharp force-rebuild, prettier (biome only).

## Visual system

Palette derives from the run402.com brand: a near-black canvas with a neon-green
accent (`#00ff9f`, the terminal `>$` mark) and calm greys. Tokens live in
`src/styles/global.css` as OKLCH custom properties.

- **Dark is native** (near-black `oklch(0.13 …)`, neon-green accent). **Light is
  an intentional warm paper** (`oklch(0.985 …)`, a *deep* emerald accent that is
  readable on white) — not an inversion. Both were tuned separately.
- **Signature motif:** the `>` terminal prompt. It prefixes section eyebrows
  (`.eyebrow`, mono + uppercase) and the footer, plus the `402 · Payment
  Required` footer note and the `>$` logo mark. Used sparingly.
- **Type:** system sans for body/headings (readability), mono for code, labels,
  and technical accents. No Google Fonts.
- **Backdrop:** a low-contrast terminal grid behind content (`body::before`),
  masked to fade near the top. Decorative, `pointer-events: none`.
- **Motion:** only the 260ms theme-toggle colour cross-fade; disabled under
  `prefers-reduced-motion`.

## Content model

`src/content/post/*.mdx`, schema in `src/content.config.ts`. Required: `title`,
`description`, `publishDate`. Optional: `updatedDate`, `draft` (default false),
`tags`, `pinned`, `series`, `coverImage`, `ogImage`, `skill`.

`skill` is a **typed seam only** — an article may later ship an installable
skill that teaches an agent its principle. The field validates; there is
deliberately **no renderer yet** (don't build one speculatively). Drafts are
filtered from all production indexes/feeds/search via `getAllPosts()`
(`src/data/post.ts`) gating on `import.meta.env.PROD`.

## Deploying

Managed subdomains are the `*.run402.com` wildcard — no Cloudflare-for-SaaS /
DNS work; claiming subdomain `<name>` *is* `<name>.run402.com`.

**As provisioned (2026-07-17):**

- **Org:** `57035b1e-…` ("Run402", the internal-apps/dogfood org — also home to
  operator-console, passkeys-demo).
- **Project:** `prj_1784293532542_0002` (`run402 projects provision --name
  tech-blog --org 57035b1e-…`).
- **First release:** `run402 sites deploy-dir dist --project prj_…` (plain-static
  path; `--dir` is the `@run402/astro`-preset slice path and is NOT used here).
- **Live URL:** **https://tech-blog.run402.com** (`run402 subdomains claim
  tech-blog`).
- **CI binding:** `run402 ci link github --repo kychee-com/tech-blog --branch
  main --repository-id <id>` → subject `repo:kychee-com/tech-blog:ref:refs/heads/main`.
- **Repo variable:** `RUN402_PROJECT_ID = prj_1784293532542_0002`.

**Every push** then deploys keyless via `.github/workflows/deploy.yml`:
`npm ci → npm run check → npm run build → run402 sites deploy-dir dist`. The CI
session is exchanged from the GitHub OIDC token; it can ship the `site` slice
but cannot claim subdomains (the managed subdomain already tracks the live
release).

### `blog.run402.com` is reserved

`blog` is on Run402's **reserved-subdomain-name** list — a tenant cannot
self-claim it (`VALIDATION_FAILED: Subdomain "blog" is reserved`), and an admin
release may not override a reserved *word* without a platform-config change. To
move the site to `blog.run402.com`, a Run402 operator must free/assign the name
(then `run402 subdomains claim blog --project prj_…`, or repoint at the edge).
Until then the canonical URL is `tech-blog.run402.com`.

> Note: `src/site.config.ts` still sets `url: https://blog.run402.com/` (the
> intended canonical home). Until `blog` is released, either accept that
> canonical/OG/RSS URLs point at the not-yet-live `blog.run402.com`, or change
> `url` to `https://tech-blog.run402.com/` for a fully self-consistent site.

**Owner-org note:** the intended long-term owner was the `cb31d1c5-…` run402 org
(where skmeld/krello/kychon live), but that org's wallet was not available in
this environment; provisioned under `57035b1e-…` instead. Move later with
`run402 transfer` if desired.

## Going SSR

When a page needs to run at request time:

1. `npm i @run402/astro`
2. `astro.config.ts`: `export default run402()` (preset; default
   `output: 'server'`). Keep `export const prerender = true` on every static
   page — they still build to static assets, byte-identical to today.
3. Deploy via `buildAstroReleaseSlice("dist")` (roots at `dist/run402/client/`,
   **not** `dist/` — see kychee-com/run402#411) instead of `--dir dist`. The
   CLI's `run402 deploy` does this automatically for preset projects.
4. Drop `prerender = true` from the one route that needs SSR.

Nothing else moves. Content collections, the theme, and the search index are
unchanged.

## Open questions / deferred

- **Skill renderer** — deferred until the first article actually ships a skill.
- **OG image for non-post pages** — home/about fall back to the static
  `public/social-card.svg`; per-page satori cards are post-only for now.
- **Owner org confirmation** — provision under the run402 org (`cb31d1c5-…`) per
  the decision above; confirm at provision time.
