/**
 * schema-sync — verifies that prisma/schema.prisma and prisma/schema.sqlite.prisma
 * define identical models. The only permitted difference is the datasource block
 * (provider, url, directUrl). Any model field drift fails this test.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(process.cwd())

type ModelMap = Map<string, string[]>

function extractModels(content: string): ModelMap {
  const models: ModelMap = new Map()
  const lines = content.split('\n')
  let current: string | null = null
  let depth = 0
  const fields: string[] = []

  for (const line of lines) {
    const t = line.trim()
    if (!current && /^model\s+\w+\s+\{/.test(t)) {
      current = t.split(/\s+/)[1]
      depth = 1
      fields.length = 0
      continue
    }
    if (current) {
      for (const ch of t) if (ch === '{') depth++; else if (ch === '}') depth--
      if (depth === 0) {
        models.set(current, [...fields])
        current = null
        continue
      }
      if (t && !t.startsWith('//')) fields.push(t)
    }
  }
  return models
}

describe('Schema sync', () => {
  it('postgres and sqlite schemas define identical models', () => {
    const pg     = readFileSync(resolve(ROOT, 'prisma/schema.prisma'), 'utf-8')
    const sqlite = readFileSync(resolve(ROOT, 'prisma/schema.sqlite.prisma'), 'utf-8')

    const pgModels     = extractModels(pg)
    const sqliteModels = extractModels(sqlite)

    expect([...sqliteModels.keys()].sort()).toEqual([...pgModels.keys()].sort())

    for (const [name, pgFields] of pgModels) {
      expect(sqliteModels.get(name)).toEqual(pgFields)
    }
  })
})
