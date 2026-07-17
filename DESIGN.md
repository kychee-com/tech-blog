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

`blog.run402.com` is a **managed subdomain** (the `*.run402.com` wildcard) — not
a custom domain. No Cloudflare-for-SaaS / DNS work; claiming subdomain `blog`
*is* `blog.run402.com`.

**One-time provision** (operator, holding the platform deploy wallet — mirrors
`apps/console/provision.ts`):

1. Create a Run402 project owned by the **run402 org** (`cb31d1c5-…`, wallet
   `0xad170eff…` — the org `skmeld`/`krello`/`kychon` live in).
2. Deploy the site once so the subdomain has a release to point at.
3. Claim the `blog` managed subdomain.
4. Create a GitHub-OIDC CI binding for subject
   `repo:kychee-com/tech-blog:ref:refs/heads/main` (or an `environment:` subject),
   `--action deploy`.
5. Set the repo variable `RUN402_PROJECT_ID` to the new `prj_…`.

**Every push** then deploys keyless via the workflow:
`npm ci → npm run check → npm run build → run402 deploy apply --dir dist`.

The managed subdomain tracks the project's live release, so CI ships only the
site (a CI session can't claim subdomains — content-only by design).

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
