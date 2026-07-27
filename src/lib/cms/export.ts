import { mkdirSync, writeFileSync, copyFileSync, readdirSync, existsSync, statSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import type { SiteModel } from './types'
import { renderPage } from './renderer/index'
import { renderPostsListPage, renderPostPage } from './renderer/publikacje'
import { postUrl, postsListUrl } from './urls'

function buildSitemapXml(model: SiteModel): string {
  const today = new Date().toISOString().slice(0, 10)
  const siteRoot = model.meta.canonical.replace(/\/$/, '')
  const pageUrls = model.pages
    .filter(p => p.sections.length > 0 && p.meta?.variant !== 'legal' && p.meta?.variant !== '404')
    .map(p => {
      const loc = p.meta?.canonical ?? (p.slug === 'index' ? model.meta.canonical : `${siteRoot}/${p.slug}.html`)
      const priority = p.slug === 'index' ? '1.0' : '0.8'
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    })

  const publishedPosts = model.collections.posts.filter(p => p.status === 'published')
  const postUrls = publishedPosts.map(p => {
    const lastmod = p.publishedAt ?? today
    return `  <url>\n    <loc>${postUrl(siteRoot, p.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
  })
  const listUrl = publishedPosts.length > 0
    ? [`  <url>\n    <loc>${postsListUrl(siteRoot)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`]
    : []

  const urls = [...pageUrls, ...listUrl, ...postUrls].join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

// Mapa starych adresow publikacji na nowe, dla 301 w Workerze (site-router/src/index.ts
// czyta ten plik jako fallback przed 404). Tylko dla postow ktore SA opublikowane —
// przekierowanie do posta ktory nie generuje pliku (draft) byloby przekierowaniem na 404.
function buildPostRedirects(model: SiteModel): Record<string, string> {
  const redirects: Record<string, string> = {}
  for (const post of model.collections.posts) {
    if (post.status !== 'published' || !post.previousSlugs) continue
    for (const oldSlug of post.previousSlugs) {
      if (oldSlug === post.slug) continue
      redirects[`publikacje/${oldSlug}.html`] = `/publikacje/${post.slug}.html`
    }
  }
  return redirects
}

function buildRobotsTxt(model: SiteModel): string {
  const sitemapUrl = model.meta.canonical.replace(/\/$/, '') + '/sitemap.xml'
  return `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /edit/\nDisallow: /api/\nDisallow: /login\n\nSitemap: ${sitemapUrl}\n`
}

function copyDir(src: string, dest: string): void {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export function renderStaticSite(
  model: SiteModel,
  outputDir: string,
  publicDir: string = resolve(process.cwd(), 'public')
): void {
  mkdirSync(outputDir, { recursive: true })

  for (const page of model.pages) {
    if (page.sections.length === 0) continue
    const html = renderPage(model, page.slug, '', 'static')
    writeFileSync(join(outputDir, `${page.slug}.html`), html, 'utf-8')
  }

  const publishedPosts = model.collections.posts.filter(p => p.status === 'published')
  if (publishedPosts.length > 0) {
    writeFileSync(join(outputDir, 'publikacje.html'), renderPostsListPage(model, '', 'static'), 'utf-8')
    mkdirSync(join(outputDir, 'publikacje'), { recursive: true })
    for (const post of publishedPosts) {
      // basePath="../" — plik lezy w podkatalogu publikacje/, jeden poziom glebiej niz reszta eksportu.
      writeFileSync(join(outputDir, 'publikacje', `${post.slug}.html`), renderPostPage(model, post, '../', 'static'), 'utf-8')
    }
  }

  copyDir(join(publicDir, 'assets'), join(outputDir, 'assets'))
  writeFileSync(join(outputDir, 'sitemap.xml'), buildSitemapXml(model), 'utf-8')
  writeFileSync(join(outputDir, 'robots.txt'), buildRobotsTxt(model), 'utf-8')
  const redirects = buildPostRedirects(model)
  if (Object.keys(redirects).length > 0) {
    writeFileSync(join(outputDir, '_redirects.json'), JSON.stringify(redirects), 'utf-8')
  }
  // Images uploaded to R2/CDN appear as absolute URLs in rendered HTML — no local copy needed.
}

// Recursively collect a directory into an in-memory file map under `prefix`.
// Keys use POSIX separators (used as R2 object keys).
function collectAssets(srcDir: string, prefix: string, out: Record<string, Uint8Array>): void {
  if (!existsSync(srcDir)) return
  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry)
    const key = `${prefix}/${entry}`
    if (statSync(srcPath).isDirectory()) {
      collectAssets(srcPath, key, out)
    } else {
      out[key] = new Uint8Array(readFileSync(srcPath))
    }
  }
}

// In-memory twin of renderStaticSite(): returns { 'index.html': bytes, 'assets/...': bytes }
// instead of writing to disk. Used by lib/cms/publish.ts to push the site to R2.
export function buildStaticSiteFiles(
  model: SiteModel,
  publicDir: string = resolve(process.cwd(), 'public')
): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {}
  const enc = new TextEncoder()

  for (const page of model.pages) {
    if (page.sections.length === 0) continue
    const html = renderPage(model, page.slug, '', 'static')
    out[`${page.slug}.html`] = enc.encode(html)
  }

  const publishedPosts = model.collections.posts.filter(p => p.status === 'published')
  if (publishedPosts.length > 0) {
    out['publikacje.html'] = enc.encode(renderPostsListPage(model, '', 'static'))
    for (const post of publishedPosts) {
      out[`publikacje/${post.slug}.html`] = enc.encode(renderPostPage(model, post, '../', 'static'))
    }
  }

  collectAssets(join(publicDir, 'assets'), 'assets', out)
  out['sitemap.xml'] = enc.encode(buildSitemapXml(model))
  out['robots.txt'] = enc.encode(buildRobotsTxt(model))
  const redirects = buildPostRedirects(model)
  if (Object.keys(redirects).length > 0) {
    out['_redirects.json'] = enc.encode(JSON.stringify(redirects))
  }
  // Images uploaded to R2/CDN appear as absolute URLs in rendered HTML — no local copy needed.
  return out
}

export async function exportSite(
  tenantId: string,
  outputDir?: string,
  publicDir?: string
): Promise<string> {
  const { PrismaClient } = await import('@prisma/client')
  const { parseSiteModel } = await import('./schema')
  const prisma = new PrismaClient()
  try {
    const site = await prisma.site.findFirst({ where: { tenantId } })
    if (!site) throw new Error(`Site not found: ${tenantId}`)
    const { model } = parseSiteModel(JSON.parse(site.model as string))
    const outDir = outputDir ?? resolve(process.cwd(), 'exports', tenantId)
    renderStaticSite(model, outDir, publicDir)
    return outDir
  } finally {
    await prisma.$disconnect()
  }
}
