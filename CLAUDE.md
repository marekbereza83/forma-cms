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

### Renderer contract

`renderPage()` must produce HTML structurally identical to the reference files in `reference/forma-production/`. The acceptance test (`tests/renderer.test.ts`, "rendered DOM matches reference index.html") does a full DOM-diff. Always run this test after changing any section renderer.

Three CSS files must be linked in every rendered page:
- `assets/css/design-system-agency.css`
- `assets/css/forma-layout.css`
- `assets/css/forma-components.css`

The live versions served to clients are in `public/assets/css/`. Exports copy from there.

### Adding a new section renderer

1. Create `src/lib/cms/renderer/sections/<id>.ts` exporting a `render<Name>(section, …ctx)` function.
2. Register it in the `SECTION_REGISTRY` map in `renderer/index.ts`.
3. Add the section to the fixture (`fixtures/forma-site.json`) with `editable: true` on any fields clients should edit.
4. If the section needs pricing context from `index.pricing`, receive it via `ctx.indexPricing` — do not add `price`-type fields to pages other than `index`.
5. Run `npx vitest tests/renderer.test.ts` — the DOM-diff test will fail if the rendered output diverges from the reference HTML; update `reference/forma-production/` when the change is intentional.

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

### Image uploads

`POST /api/upload` accepts a `multipart/form-data` with `file` (PNG/JPEG/WebP, ≤5 MB) and `cardId` (UUID). The route resizes to 800×450 WebP via `sharp`, then stores at `<tenantId>/portfolio-card-<cardId>.webp` in **Cloudflare R2** (S3-compatible). Returns `{ url }` pointing to `R2_PUBLIC_BASE_URL/<key>`. `DELETE /api/upload?filename=<name>` removes the object from R2; failures are accepted (best-effort). SVG uploads are rejected.

### Static export

`exportSite(tenantId)` reads from Prisma, calls `renderStaticSite()`, writes `exports/<tenantId>/*.html` + copies `public/assets/`. Upload images land in `public/uploads/<tenantId>/` and are copied to `exports/<tenantId>/assets/images/`.

---

## Database

**Dual schema:** two Prisma schema files must be kept identical (models only — datasource block may differ):
- `prisma/schema.prisma` — Postgres (production), `provider = "postgresql"`, `url + directUrl`
- `prisma/schema.sqlite.prisma` — SQLite (dev/test), `provider = "sqlite"`, single `url`

`tests/schema-sync.test.ts` fails if the two schemas' model definitions diverge. After any schema change, update **both** files.

**Dev:** SQLite at `prisma/dev.db`. `Site.model` is stored as `String` (JSON-serialized) because SQLite has no native `Json` type. On Postgres, change to `Json`.

**Migrations:** manual TypeScript scripts in `prisma/migrate-*.ts`, not Prisma Migrate. Run them with `npx tsx` (or via `npm run migrate:<name>` shortcuts in `package.json`) after adding pages/sections to the fixture.

**Test DB:** `prisma/test.db`. Created by `tests/globalSetup.ts` which calls `prisma migrate deploy`. Tests share this DB and run sequentially (`fileParallelism: false` in `vitest.config.ts`).

**Seed credentials:**
- `kowalski@test.pl` / `haslo123` → Kancelaria Kowalski
- `nowak@test.pl` / `haslo123` → Kancelaria Nowak

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
- **V6** — `cta-finale.headline` must differ from `hero.headline`.
- **V7** — max 2 `price`-type fields per section.
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
