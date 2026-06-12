import { execSync } from 'child_process'

export function setup() {
  // Use the SQLite schema for test.db (prod schema uses PostgreSQL provider).
  // `db push` creates/updates the schema without checking migration_lock.toml.
  execSync('npx prisma db push --schema=prisma/schema.sqlite.prisma --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  })
}
