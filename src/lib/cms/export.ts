import { mkdirSync, writeFileSync, copyFileSync, readdirSync, existsSync, statSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import type { SiteModel } from './types'
import { renderPage } from './renderer/index'

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

  copyDir(join(publicDir, 'assets'), join(outputDir, 'assets'))
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

  collectAssets(join(publicDir, 'assets'), 'assets', out)
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
