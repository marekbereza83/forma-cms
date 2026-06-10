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

# Tests (Vitest) — all files share SQLite, must run sequentially
npx vitest               # full suite
npx vitest tests/renderer.test.ts   # single file

# Database
npx prisma migrate dev            # apply/create migrations (dev.db)
npx prisma migrate deploy         # apply existing migrations (used by test globalSetup against test.db)
npx ts-node prisma/seed.ts        # seed dev.db with tenants kowalski + nowak

# One-off migration scripts (run after schema/fixture changes)
npx ts-node prisma/migrate-nav-labels.ts
npx ts-node prisma/migrate-add-proces.ts
# ... etc. — check prisma/ for migration scripts by name

# Fixture maintenance
node scripts/update-baseline.js   # re-snapshot conditional-char counts after intentional fixture edit
node scripts/fix-fixture-quotes.js  # replace typographic quotes/dashes with ASCII equivalents
```

**Environment:** create a `.env.local` with `DATABASE_URL=file:./prisma/dev.db` and `NEXTAUTH_SECRET=<any-string>`.

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
| `validation/hard.ts` | V1–V13 hard validators (block save, Polish error messages) |
| `validation/soft.ts` | W1–W4 soft validators (warnings, non-blocking) |
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

### Static export

`exportSite(tenantId)` reads from Prisma, calls `renderStaticSite()`, writes `exports/<tenantId>/*.html` + copies `public/assets/`. Upload images land in `public/uploads/<tenantId>/` and are copied to `exports/<tenantId>/assets/images/`.

---

## Database

**Dev:** SQLite at `prisma/dev.db`. The Prisma schema uses `String` for `Site.model` (JSON serialized) because SQLite has no native `Json` type. On Postgres, change to `Json`.

**Migrations:** manual TypeScript scripts in `prisma/migrate-*.ts`, not Prisma Migrate. Run them with `npx ts-node` after adding pages/sections to the fixture.

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

## Hard validation rules (V1–V13)

See `src/lib/cms/validation/hard.ts` for the full list. Key invariants:
- **V1** — `price`-type amounts must be numeric strings (e.g. `"4 500"`); vague strings like `"zapytaj"` are rejected.
- **V2/V3/V4** — `hero`, `pricing`, `cta-finale` sections on the index page are required and cannot be removed.
- **V6** — `cta-finale.headline` must differ from `hero.headline`.
- **V7** — max 2 `price`-type fields per section.
- **V12** — no emoji in headline/label/tag fields.
- **V13** — `portfolio.cards` must have 1–4 entries.

All error messages are in Polish. Soft warnings (W1–W4) do not block save.

---

## Critical invariants — never break these

1. **Always call `parseSiteModel()`** before writing a `SiteModel`. Never call `SiteModelSchema.parse()` directly from panel code.
2. **Always use `getTenantScopedClient(session)`** for every DB query. Never trust `tenantId` from the HTTP body or query string.
3. **Never offer the client control over layout, fonts, colors, or section structure.** Any such proposal contradicts the product model.
4. **`cennik-detail` has no price fields** — it reads pricing from `ctx.indexPricing`. Do not add `price`-type fields to that section.
