'use strict'
const fs = require('fs')
const path = require('path')

// Chars present in the fixture that are outside strict ASCII+Polish whitelist.
// These are allowed but their per-field counts are tracked — any increase = likely AI injection.
// U+2014 em dash, U+2022 bullet, U+2265 >=, U+00A9 copyright
const CONDITIONAL = ['—', '•', '≥', '©']

const ROOT = path.join(__dirname, '..')
const BASELINE_PATH = path.join(ROOT, 'fixtures', 'forma-site.baseline.json')
const FIXTURE_PATH = path.join(ROOT, 'fixtures', 'forma-site.json')

function computeCounts(fixture) {
  const result = {}
  for (const page of fixture.pages) {
    for (const section of page.sections) {
      for (const [fieldName, field] of Object.entries(section.fields)) {
        const key = `${section.id}.${fieldName}`
        const serialized = JSON.stringify(field.value)
        const counts = {}
        for (const char of CONDITIONAL) {
          let n = 0
          for (const c of serialized) { if (c === char) n++ }
          if (n > 0) counts[char] = n
        }
        if (Object.keys(counts).length > 0) result[key] = counts
      }
    }
  }
  return result
}

const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'))
const current = computeCounts(fixture)

let existing = {}
if (fs.existsSync(BASELINE_PATH)) {
  existing = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
}

const allKeys = new Set([...Object.keys(existing), ...Object.keys(current)])
const diffs = []

for (const key of [...allKeys].sort()) {
  const base = existing[key] || {}
  const now = current[key] || {}
  const fieldDiffs = []
  for (const char of CONDITIONAL) {
    const b = base[char] || 0
    const n = now[char] || 0
    if (b !== n) {
      const cp = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
      const direction = n > b ? 'wzrost' : 'spadek'
      fieldDiffs.push(`    '${char}' U+${cp}: ${b} -> ${n}  (${direction})`)
    }
  }
  if (fieldDiffs.length > 0) {
    diffs.push(`  ${key}:\n${fieldDiffs.join('\n')}`)
  }
}

if (diffs.length === 0) {
  console.log('Diff baseline: brak zmian - baseline jest aktualny.')
  process.exit(0)
}

console.log('Diff baseline:')
console.log(diffs.join('\n'))
console.log('')
fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2), 'utf8')
console.log('Zaktualizowano fixtures/forma-site.baseline.json.')
console.log('UWAGA: commituj baseline osobnym commitem z opisem dlaczego te zmiany sa intencjonalne.')
