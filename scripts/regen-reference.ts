import { readFileSync, writeFileSync } from 'fs'
import { renderPage } from '../src/lib/cms/renderer/index'

const fixture = JSON.parse(readFileSync('fixtures/forma-site.json', 'utf8'))
const pages = ['index', 'kontakt', 'portfolio', 'proces', 'legal-notice', 'privacy-policy', '404']

for (const slug of pages) {
  const html = renderPage(fixture, slug, '', 'static')
  const path = slug === 'index'
    ? 'reference/forma-production/index.html'
    : slug === '404'
      ? 'reference/forma-production/404.html'
      : `reference/forma-production/${slug}.html`
  writeFileSync(path, html, 'utf8')
  process.stdout.write(`wrote ${path}\n`)
}
