import { execSync } from 'child_process'

export function setup() {
  const env = { ...process.env, DATABASE_URL: 'file:./test.db' }
  // Regenerate Prisma client from the SQLite schema so tests always work,
  // even after running a production migration (which generates a PG client).
  execSync('npx prisma generate --schema=prisma/schema.sqlite.prisma', { env, stdio: 'inherit' })
  // Push schema to test.db without checking migration_lock.toml.
  execSync('npx prisma db push --schema=prisma/schema.sqlite.prisma --skip-generate --accept-data-loss', { env, stdio: 'inherit' })
}
