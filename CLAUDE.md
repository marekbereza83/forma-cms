# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What this repo is

**FORMA CMS** — a multi-tenant CMS that lets clients (Polish law-firm owners) edit content on their websites. One engine serves many tenants. The client edits **content (data)**; the renderer enforces **form (design rules)**. No layout, color, font, or section-structure control is ever given to the client — that separation is the moat.

---

## Commands

```bash
# Development
npm run dev              # Next.js dev server (localhost:3000)

# Build & run production
npm run build && npm run start

# Type-check (no emit)
npx tsc --noEmit

# Regenerate SQLite schema after editing prisma/schema.prisma
npm run schema:sqlite

# Tests (Vitest) — all files share SQLite, must run sequentially
npx vitest               # full suite
npx vitest tests/renderer.test.ts   # single file
npx vitest -t "rendered DOM matches reference index"  # single test by name

# Database
npx prisma migrate dev            # apply/create migrations (dev.db)
npx prisma migrate deploy         # apply existing migrations (used by test globalSetup against test.db)
npx tsx prisma/seed.ts            # seed dev.db with tenants kowalski + nowak

# One-off migration scripts — use npm run migrate:* shortcuts (see package.json)
# or invoke directly: npx tsx prisma/migrate-<name>.ts

# Fixture maintenance
node scripts/update-baseline.js   # re-snapshot conditional-char counts after intentional fixture edit
node scripts/fix-fixture-quotes.js  # replace typographic quotes/dashes with ASCII equivalents

# Database reset (wipes dev.db and re-seeds from fixture)
npm run reset && npm run seed

# Create a new tenant
npx tsx scripts/create-tenant.ts
```

**Environment:** create a `.env.local` with:
```
DATABASE_URL=file:./prisma/dev.db
NEXTAUTH_SECRET=<any-string>
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=<bucket-name>
R2_PUBLIC_BASE_URL=https://<custom-domain-or-r2-public-url>
```
R2 vars are required for image upload. The app will fail-fast at startup if they are absent.

---

## Architecture

### Data flow

```
Client HTTP request
  → Next.js route / Server Action
  → auth() — session carries tenantId
  → getTenantScopedClient(session) — ALL db reads/writes go through this
  → saveSite() → parseSiteModel() — validates before writing
  → Prisma (SQLite dev, Postgres prod)
```

```
GET /preview?page=index
  → renderPage(model, 'index', '/', 'preview')  — server-side HTML
  → returned as text/html — no React hydration of rendered output
```

### Core modules (`src/lib/cms/`)

| File | Purpose |
|---|---|
| `types.ts` | TypeScript interfaces for `SiteModel`, `Field`, all section-specific sub-types |
| `schema.ts` | Zod schemas + **`parseSiteModel()`** — the single entry point for validating + saving a model |
| `fields.ts` | `getEditableFields()` / `setFieldValue()` — immutable field mutation helpers |
| `persistence.ts` | `saveSite(session, raw)` — validates via `parseSiteModel()` then upserts + writes `EditLog` |
| `export.ts` | `renderStaticSite()` / `exportSite()` — produce static `.html` files + copy assets |
| `renderer/index.ts` | `renderPage(model, slug, basePath, linkMode)` — assembles full HTML document |
| `renderer/sections/` | One file per section ID (`hero.ts`, `pricing.ts`, …) |
| `renderer/collections.ts` | `renderEventItem()` — renders a single `EventItem` to HTML |
| `renderer/sections/not-found.ts` | Hardcoded 404 section renderer (variant `'404'`); links via `pageHref` |
| `renderer/hardcoded/redesign-animator.ts` | Inline script injected only on the `index` page (scroll/cursor effects) |
| `validation/hard.ts` | V1–V15 hard validators (block save, Polish error messages) |
| `validation/soft.ts` | W1–W5 soft validators (warnings, non-blocking) |
| `validation/collections.ts` | C1–C4 collection validators + `sanitizePostBody()` for XSS |

### Tenant isolation (`src/lib/tenant/client.ts`)

**`getTenantScopedClient(session)`** must be used for every database read/write. It binds `tenantId` from the session (never from the HTTP request). Every Prisma query inside filters by `tenantId`. Bypassing this is a security bug.

### Auth (`src/lib/auth/`)

Auth.js (NextAuth v5) with `Credentials` provider. JWT carries `tenantId`, `userId`, `role`. The `src/types/next-auth.d.ts` file extends the `Session` and `JWT` types to include these fields.

`authorizeUser()` in `src/lib/auth/authorize.ts` enforces login rate-limiting: 5 failed attempts trigger a 15-minute lockout (`lockedUntil` field on `User`). Counters reset on successful login. `src/middleware.ts` is the first line of defence — it redirects unauthenticated requests to `/login` for all panel routes (`/dashboard`, `/edit/*`, `/preview`, `/api/upload`, `/api/export/*`).

### Renderer contract

`renderPage()` must produce HTML structurally identical to the reference files in `reference/forma-production/`. The DOM-diff acceptance tests run against all eight reference pages: `index.html`, `kontakt.html`, `proces.html`, `portfolio.html`, `legal-notice.html`, `privacy-policy.html`, `regulamin.html`, `404.html`. Always run `npx vitest tests/renderer.test.ts` after changing any section renderer, then update the matching reference file when the change is intentional.

Unknown section IDs in `SECTION_REGISTRY` throw `Error` immediately — they do **not** silently skip. An unknown ID means a page renders as an empty `<main>`, which is the hardest failure to notice in production.

Three CSS files must be linked in every rendered page:
- `assets/css/design-system-agency.css`
- `assets/css/forma-layout.css`
- `assets/css/forma-components.css`

The live versions served to clients are in `public/assets/css/`. Exports copy from there.

### Adding a new section renderer

1. Create `src/lib/cms/renderer/sections/<id>.ts` exporting a `render<Name>(section, …ctx)` function.
2. Register it in the `SECTION_REGISTRY` map in `renderer/index.ts`. **Note:** the registry key is the section `id` from the fixture JSON, which may differ from the filename — e.g. key `'formularz'` → file `kontakt-formularz.ts`.
3. Add the section to the fixture (`fixtures/forma-site.json`) with `editable: true` on any fields clients should edit.
4. Add human-readable labels for new editable field keys to the `FIELD_LABELS` map in `src/app/(panel)/edit/fields/FieldsForm.tsx`; otherwise the panel shows the raw key name.
5. If the section needs pricing context from `index.pricing`, receive it via `ctx.indexPricing` — do not add `price`-type fields to pages other than `index`.
6. Run `npx vitest tests/renderer.test.ts` — the DOM-diff test will fail if the rendered output diverges from the reference HTML; update `reference/forma-production/` when the change is intentional. If you added an em-dash, bullet, `≥`, or `©` to the fixture, also run `node scripts/update-baseline.js`.

To regenerate all reference HTML files at once: `npx tsx scripts/regen-reference.ts`.

### Price — single source of truth

`pricing.standard.amount` on the `index` page is the only place where the numeric price is stored. The renderer injects it into:
1. the hero subheadline (inline "od 4 500 zł")
2. the pricing cards on index
3. the `cennik-detail` section on `/proces` (via `ctx.indexPricing`)

The `cennik-detail` section on `proces` has **no `price`-type fields** — it reads from `ctx.indexPricing` passed by `renderPage`. If `indexPricing` is absent it throws (`/cennik-detail/ requires indexPricing`). Known debt: price also appears as free text in `proces.cta-finale.lead` (tracked as DŁUG-CENNIK-1).

### `linkMode`

Every section renderer that emits links accepts a `linkMode: 'static' | 'preview'` parameter:
- `'static'` — href = `kontakt.html` (for exported static files)
- `'preview'` — href = `/preview?page=kontakt` (for the in-panel preview)

### Panel routes (`src/app/(panel)/`)

| Route | Purpose |
|---|---|
| `/dashboard` | links to edit/preview |
| `/edit/fields` | form for all `editable: true` fields across all pages |
| `/preview` | `GET /preview?page=<slug>` — renders live HTML via `renderPage` |

Fields with `editable: false` are never shown in the panel. Adding new fields to a section: set `editable: true` in the fixture and in whichever section renderer creates the `Field` object; the panel form (`FieldsForm.tsx`) picks them up automatically via `getEditableFields()`.

All panel routes are protected by `src/middleware.ts` (NextAuth matcher). Per-route `auth()` calls inside panel code are a secondary check — do not rely on them alone for new routes.

### Image uploads

`POST /api/upload` accepts a `multipart/form-data` with `file` (PNG/JPEG/WebP, ≤5 MB) and `cardId` (UUID). The route resizes to 800×450 WebP via `sharp`, then stores at `<tenantId>/portfolio-card-<cardId>.webp` in **Cloudflare R2** (S3-compatible). Returns `{ url }` pointing to `R2_PUBLIC_BASE_URL/<key>`. `DELETE /api/upload?filename=<name>` removes the object from R2; failures are accepted (best-effort). SVG uploads are rejected.

### Static export

`exportSite(tenantId)` reads from Prisma, calls `renderStaticSite()`, writes `exports/<tenantId>/*.html` + copies `public/assets/`. Upload images land in `public/uploads/<tenantId>/` and are copied to `exports/<tenantId>/assets/images/`.

---

## Database

**Dual schema — single source of truth:**
- `prisma/schema.prisma` — Postgres (production/Vercel). **Edit this one only.**
- `prisma/schema.sqlite.prisma` — SQLite (dev/test). **Generated** from `schema.prisma`; do not hand-edit (it carries a `DO NOT EDIT` header).

After any change to `schema.prisma`, run `npm run schema:sqlite` to regenerate the SQLite copy, then commit both. `tests/schema-sync.test.ts` fails if they diverge, and CI re-runs the generator and fails on any diff. (Why this matters: the two used to be hand-synced; a cloud-sync tool silently reverted `schema.prisma` while the SQLite copy kept new fields → green local tests, broken Vercel build. The generator + CI gate remove that whole failure mode.)

**Dev:** SQLite at `prisma/dev.db`. `Site.model` is stored as `String` (JSON-serialized) because SQLite has no native `Json` type. On Postgres, change to `Json`.

**Migrations:** manual TypeScript scripts in `prisma/migrate-*.ts`, not Prisma Migrate. Run them with `npx tsx` (or via `npm run migrate:<name>` shortcuts in `package.json`) after adding pages/sections to the fixture.

**Test DB:** `prisma/test.db`. Created by `tests/globalSetup.ts` which calls `prisma db push --schema=prisma/schema.sqlite.prisma`. This also regenerates `@prisma/client` from the SQLite schema — essential because `npm run build` regenerates it from the PostgreSQL schema, which would break the DB-backed test suites. Tests share this DB and run sequentially (`fileParallelism: false` in `vitest.config.ts`).

**Seed credentials:**
- `kowalski@test.pl` / `haslo123` → Kancelaria Kowalski
- `nowak@test.pl` / `haslo123` → Kancelaria Nowak

**Seed is update-skipping:** `prisma/seed.ts` uses `update: {}` on all upserts, so re-running the seed never refreshes existing tenant models. After fixture changes that should be reflected in dev data, run `npm run reset && npm run seed` to wipe and re-seed.

**Cloud-sync risk:** the repo lives in a synced folder. A sync tool has previously reverted `schema.prisma` silently while SQLite kept the new fields, causing a broken Vercel build with green local tests. Always inspect `git diff --staged` before committing to catch reverted files.

---

## Fixture (`fixtures/forma-site.json`)

The canonical `SiteModel` instance. All tests read from it. Two constraints enforced by `tests/renderer.test.ts`:

1. **Character whitelist** — only printable ASCII, Polish diacritics (`ąćęłńóśźżĄĆĘŁŃÓŚŹŻ`), `U+00A0` (non-breaking space used in "4 500"), and four conditional chars (`—`, `•`, `≥`, `©`).
2. **Baseline** — `fixtures/forma-site.baseline.json` tracks conditional-char counts per field. Counts must not increase. After an intentional change, run `node scripts/update-baseline.js`.

**Never** use typographic quotes (`"` `"` `'` `'`), en-dash (`–`), or ellipsis (`…`) in the fixture. Use `scripts/fix-fixture-quotes.js` if they appear.

---

## Test suite (`tests/`)

| File | What it covers |
|---|---|
| `renderer.test.ts` | Full DOM-diff against reference HTML; fixture integrity (char whitelist + baseline) |
| `validation.test.ts` | Hard (V*) and soft (W*) validator rules |
| `persistence-roundtrip.test.ts` | `saveSite()` round-trips through `parseSiteModel()` |
| `panel-fields.test.ts` | `getEditableFields()` / `setFieldValue()` helpers |
| `export.test.ts` | `exportSite()` writes correct HTML files |
| `upload.test.ts` | Image upload/delete API |
| `tenant-isolation.test.ts` | `getTenantScopedClient()` never leaks cross-tenant data |
| `schema-sync.test.ts` | Verifies `schema.prisma` and `schema.sqlite.prisma` have identical model definitions |
| `globalSetup.ts` | Creates `prisma/test.db` before all tests run |

---

## Hard validation rules (V1–V15)

See `src/lib/cms/validation/hard.ts` for the full list. Key invariants:
- **V1** — `price`-type amounts must be numeric strings (e.g. `"4 500"`); vague strings like `"zapytaj"` are rejected.
- **V2/V3/V4** — `hero`, `pricing`, `cta-finale` sections on the index page are required and cannot be removed.
- **V5** — `cta-finale.lead` must not be empty.
- **V6** — `cta-finale.headline` must differ from `hero.headline`.
- **V7** — max 2 `price`-type fields per section.
- **V8** — each pricing package must have at least one feature.
- **V9** — `hero` section must not contain an `image`-type field.
- **V10** — process step numerals must be numeric strings.
- **V11** — footer links count must not exceed 6.
- **V12** — no emoji in headline/label/tag fields.
- **V13** — `portfolio.cards` must have 1–4 entries.
- **V14** — `portfolio-grid.cards` must have 1–12 entries.
- **V15** — portfolio card `link` values must start with `https://` or `http://` (blocks `javascript:`, `data:`, etc.).

Soft warnings (W1–W5) do not block save. All error messages are in Polish.

### Collection validators (C1–C4) + sanitizer

`validation/collections.ts` validates `events` and `posts` collections. **`sanitizePostBody(body)`** (also in this file) is the save-time XSS sanitizer — strips `<script>`, event handlers, and non-allowlisted tags from post bodies. It runs before C3 checks and must be called at save time for any post body received from the client.

---

## Critical invariants — never break these

1. **Always call `parseSiteModel()`** before writing a `SiteModel`. Never call `SiteModelSchema.parse()` directly from panel code.
2. **Always use `getTenantScopedClient(session)`** for every DB query. Never trust `tenantId` from the HTTP body or query string.
3. **Never offer the client control over layout, fonts, colors, or section structure.** Any such proposal contradicts the product model.
4. **`cennik-detail` has no price fields** — it reads pricing from `ctx.indexPricing`. Do not add `price`-type fields to that section.
5. **Always call `sanitizePostBody()`** on post body content before persisting it. C3 is a safety-net, not the primary defence.
