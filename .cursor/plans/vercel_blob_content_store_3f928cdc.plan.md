---
name: Vercel Blob content store
overview: Replace GitHub-token-based admin persistence with a canonical JSON snapshot stored in Vercel Blob (`BLOB_READ_WRITE_TOKEN`), and route all server-side catalog/markdown reads through that snapshot when configured—while keeping optional filesystem + bundled JSON fallbacks for local dev and cold-start bootstrap.
todos:
  - id: deps-env
    content: Add @vercel/blob; update .env.example with BLOB_READ_WRITE_TOKEN; remove GitHub vars after cutover
    status: completed
  - id: blob-layer
    content: Implement read/write LibrarySnapshot helpers (put allowOverwrite + multipart, get private)
    status: completed
  - id: load-resolved
    content: Add loadResolvedCatalog + refactor sections-server, loader, /api/data/questions, admin markdown route
    status: completed
  - id: commit-blob
    content: Replace GitHub branch in commit-section with snapshot write; base merge on loadResolvedCatalog
    status: completed
  - id: env-modes-ui
    content: Update lib/env.ts modes, store-status, admin toasts/copy (no redeploy required for content)
    status: completed
  - id: cleanup-github
    content: Remove github-commit.ts and dead imports
    status: completed
  - id: seed-docs
    content: Add seed script + short ops checklist (Blob store + first snapshot)
    status: completed
  - id: optional-auth
    content: Add ADMIN_API_SECRET guard on admin POST routes (recommended)
    status: completed
isProject: false
---

# Migrate admin persistence and runtime reads to Vercel Blob

## Context and constraints

- Today the **study app** loads bundled metadata from [`lib/data/catalog-client.ts`](lib/data/catalog-client.ts) (imports [`catalog.generated.json`](lib/data/catalog.generated.json)) and markdown from [`content.generated.json`](lib/data/content.generated.json); online sync uses [`fetchRemoteLibrary`](lib/offline/library.ts) → [`GET /api/data/sections`](app/api/data/sections/route.ts) + [`GET /api/data/questions`](app/api/data/questions/route.ts), which ultimately read **`data/` + `content/` via filesystem** ([`build-catalog.ts`](lib/data/build-catalog.ts), [`loader.ts`](lib/data/loader.ts)).
- Admin saves today: **local disk** or **GitHub Contents API** ([`commit-section.ts`](lib/admin/commit-section.ts), [`github-commit.ts`](lib/admin/github-commit.ts)).
- **Vercel Blob** ([official SDK](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk)): use `put()` with `access: 'private'`, **`allowOverwrite: true`** for stable pathnames, and **`multipart: true`** for larger snapshots (avoids relying only on the small-body server-upload limit). Reads use `get(urlOrPathname, { access: 'private' })`.
- **Security**: Blob tokens are scoped to the Blob store (narrower blast radius than a GitHub PAT that can rewrite the whole repo), but **admin API routes are currently unauthenticated**—Blob migration increases incentive to add **shared-secret or session checks** on `/api/admin/*` writes.

```mermaid
flowchart LR
  subgraph today [Today]
    FS[data/content dirs]
    GH[GitHub API]
    API[/api/data]
    FS --> buildCatalog
    GH --> commitSection
    buildCatalog --> API
  end
  subgraph target [Target]
    Blob[Vercel Blob snapshot]
    Loader[loadResolvedCatalog]
    Blob --> Loader
    Loader --> API
    AdminSave[POST commit/inline] --> Blob
  end
```

## Target behavior

| Surface                              | Behavior                                                                                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel + `BLOB_READ_WRITE_TOKEN`** | Canonical library = **one private snapshot blob** (JSON). Server loaders and `/api/data/*` prefer snapshot over repo disk. Admin commit **writes snapshot only** (remove GitHub branch). |
| **Vercel without Blob token**        | Remains **blocked** for saves (same UX as today without GitHub).                                                                                                                         |
| **Local dev**                        | Default **filesystem** (`data/` + `content/`) unchanged; optional **`vercel env pull`** so local saves hit Blob for parity.                                                              |
| **Build-time bundle**                | Keep `pnpm catalog` + committed `catalog.generated.json` / `content.generated.json` as **bootstrap baseline** until you optionally slim the repo later.                                  |

## Data model (snapshot)

Define a versioned JSON shape, e.g. `LibrarySnapshot`:

- `version` (number, start at `1`)
- `generatedAt` (ISO string)
- `catalog`: full [`AppCatalog`](lib/data/catalog-client.ts)
- `contentById`: `Record<string, string>` (same as offline bundle)
- `offlineRoutes`: `string[]` (optional but keeps parity with [`buildOfflineRoutes`](lib/data/build-catalog.ts) for precache expectations)

**Stable Blob pathname** (constant), e.g. `interview-atlas/library/snapshot.json`, with `addRandomSuffix: false`, `allowOverwrite: true`, `contentType: 'application/json'`.

## Code changes (by area)

### 1. Dependencies and env

- Add `@vercel/blob` to [`package.json`](package.json).
- Update [`.env.example`](.env.example): document **`BLOB_READ_WRITE_TOKEN`** (from Vercel Storage → Blob store); **remove or deprecate** `GITHUB_TOKEN` / `GITHUB_REPO` / `GITHUB_BRANCH` once migration is complete.

### 2. New Blob layer

- Add module(s) under e.g. [`lib/content/`](lib/content/) or [`lib/blob/`](lib/blob/):
  - **`readLibrarySnapshot()`**: `get(pathname, { access: 'private' })` → parse JSON → validate minimal shape → return `LibrarySnapshot | null`.
  - **`writeLibrarySnapshot(snapshot)`**: `put(pathname, body, { access: 'private', allowOverwrite: true, multipart: true, contentType: 'application/json' })`.
  - Optional small helper to stringify with stable ordering if you care about diff noise (not required).

### 3. Single “resolved catalog” entrypoint for the server

- Introduce **`loadResolvedCatalog(): Promise<AppCatalog>`** (name flexible) that:
  1. If Blob configured and snapshot exists → **`snapshot.catalog`**.
  2. Else → existing **`buildCatalog()`** from [`build-catalog.ts`](lib/data/build-catalog.ts) (filesystem).

**Critical fix for admin merges**: [`buildCatalogWithSectionUpdate`](lib/admin/commit-section.ts) today calls **`buildCatalog()`** as the base; after Blob adoption, the base must be **`loadResolvedCatalog()`** so the next admin save merges against **blob truth**, not stale deployed disk.

### 4. Refactor loaders and API routes to use resolved catalog + snapshot markdown

- [`lib/data/sections-server.ts`](lib/data/sections-server.ts): use `loadResolvedCatalog()` → `.sections`.
- [`lib/data/loader.ts`](lib/data/loader.ts): derive questions from resolved catalog; **`getSectionData`** should filter snapshot catalog questions by section (or keep fs-only path **only** when Blob absent—avoid divergent logic).
- [`app/api/data/questions/route.ts`](app/api/data/questions/route.ts): build `{ q, content }[]` using **`snapshot.contentById[q.id]`** when snapshot loaded; fallback to reading **`content/`** files as today when snapshot missing.
- [`app/api/admin/content/markdown/route.ts`](app/api/admin/content/markdown/route.ts): resolve markdown by **`markdownPath`** → find question id from resolved catalog → read **`contentById[id]`** when Blob-backed; else fs read.

### 5. Replace GitHub commit path with Blob in [`commit-section.ts`](lib/admin/commit-section.ts)

- Remove usage of [`github-commit.ts`](lib/admin/github-commit.ts) / `commitPayloadToGitHub`.
- New **`blob`** branch:
  - Build merged **`catalog`** (already done).
  - Build **`contentBundle`** with existing **`buildContentBundle`** + **`mergeMarkdownWritesIntoContentBundle`** ([`build-catalog.ts`](lib/data/build-catalog.ts)) so serverless still sees pending markdown in payload writes.
  - **`offlineRoutes`** via **`buildOfflineRoutes(catalog)`**.
  - **`writeLibrarySnapshot({ ... })`** once.
- Keep **filesystem** branch for local writes (`data/`, `content/`, regenerate `lib/data/*.generated.json`) unchanged.

### 6. Env / mode matrix in [`lib/env.ts`](lib/env.ts)

- Replace **`github`** mode with **`blob`** when `BLOB_READ_WRITE_TOKEN` is set (and optionally gate writes with `VERCEL === '1'` if you want local saves to stay filesystem-only unless token present—document choice).
- **`getCommitStoreStatus()`** messages and [`app/api/admin/store-status/route.ts`](app/api/admin/store-status/route.ts) updated accordingly.
- [`app/api/admin/commit/inline/route.ts`](app/api/admin/commit/inline/route.ts): success copy should say **blob updated / no redeploy required** for runtime reads (study app picks up via `/api/data/*` sync); clarify that **SSG precache** still reflects last **deploy** unless you add hooks.

### 7. Remove / archive GitHub-specific code

- Delete or gut [`lib/admin/github-commit.ts`](lib/admin/github-commit.ts).
- Clean imports from [`lib/env.ts`](lib/env.ts) (today imports GitHub config).

### 8. Operational migration

- **`scripts/seed-blob.ts`** (or document one-shot): run locally with `vercel env pull`, call same snapshot builder as prod from current `data/` + `content/`, `put` initial snapshot so production reads are non-empty before first admin save.
- Document **first-deploy checklist**: create Blob store → env var on project → seed snapshot.

### 9. Known tradeoffs (call out in README or admin banner)

- **No git history per file** from Blob (only snapshot versions); use Blob dashboard / periodic exports if audit matters.
- **Service Worker precache** ([`next.config.ts`](next.config.ts) reads [`offline-routes.generated.json`](lib/data/offline-routes.generated.json) at build): new routes added only in Blob **won’t be in precache** until a redeploy or SW strategy changes; online users still work via navigation + API sync.
- **`generateStaticParams`** ([`app/[section]/page.tsx`](app/[section]/page.tsx), [`app/[section]/[category]/[slug]/page.tsx`](app/[section]/[category]/[slug]/page.tsx)) stays **build-time from repo `data/`** unless you add a build step that loads Blob—acceptable if **`dynamicParams`** stays enabled so new paths resolve at runtime (confirm Next 16 default in project).

### 10. Hardening (recommended same PR or fast follow)

- Add **`ADMIN_API_SECRET`** (or similar): require header on **POST** `/api/admin/commit/inline`, generate routes, etc., so Blob token abuse isn’t enough—attackers must also know the secret.

## Verification

- **`pnpm catalog` + `pnpm build`** still succeed.
- Local: commit flow writes filesystem when Blob token absent.
- With pulled token: commit writes snapshot; **`GET /api/data/questions`** reflects changes **without** redeploy.
- Load test snapshot size; if near limits, split into **`snapshot-catalog.json`** + **`snapshot-content.json`** (two blobs, single transactional doc in plan comments—not ideal ACID but rare conflict).
