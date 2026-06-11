// Generates prisma/schema.sqlite.prisma from prisma/schema.prisma.
//
// WHY: the project needs two Prisma schemas — Postgres for production/Vercel,
// SQLite for local tests (test.db). They must define identical models. Keeping
// them in sync by hand caused a production outage (the Postgres schema was
// silently reverted while the SQLite one kept new fields). schema.prisma is now
// the single source of truth; the SQLite schema is derived mechanically.
//
// Run after any change to schema.prisma:  npm run schema:sqlite
// CI fails (schema-sync.test.ts) if you forget.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'prisma/schema.prisma')
const dst = resolve(root, 'prisma/schema.sqlite.prisma')

const pg = readFileSync(src, 'utf-8')

// Swap the Postgres datasource block for the SQLite one. SQLite has no
// directUrl. Everything else (generator + every model) is copied verbatim,
// which guarantees model-line parity that schema-sync.test.ts asserts.
const sqliteDatasource = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`

const swapped = pg.replace(/datasource\s+db\s*\{[\s\S]*?\n\}/, sqliteDatasource)

if (swapped === pg) {
  console.error('ERROR: datasource block not found in schema.prisma — nothing swapped.')
  process.exit(1)
}

const header = `// AUTO-GENERATED from schema.prisma by scripts/gen-sqlite-schema.mjs — DO NOT EDIT.
// Edit schema.prisma, then run:  npm run schema:sqlite

`

writeFileSync(dst, header + swapped)
console.log('Wrote prisma/schema.sqlite.prisma from prisma/schema.prisma')
