// One-off: sync the redesign-animator <script> block in the reference HTML
// with the current redesignAnimatorScript export.
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { redesignAnimatorScript } from '../src/lib/cms/renderer/hardcoded/redesign-animator'

const refPath = join(__dirname, '..', 'reference', 'forma-production', 'index.html')
const html = readFileSync(refPath, 'utf-8')

const startMarker = '<!-- redesign-animator Web Component -->'
const start = html.indexOf(startMarker)
if (start === -1) throw new Error('start marker not found')
const end = html.indexOf('</script>', start)
if (end === -1) throw new Error('closing </script> not found')

const updated = html.slice(0, start) + redesignAnimatorScript + html.slice(end + '</script>'.length)
writeFileSync(refPath, updated, 'utf-8')
console.log('reference index.html animator block updated')
