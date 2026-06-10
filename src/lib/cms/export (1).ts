import { mkdirSync, writeFileSync, copyFileSync, readdirSync, existsSync, statSync } from 'fs'
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

  const uploadsDir = join(publicDir, 'uploads', model.tenantId)
  if (existsSync(uploadsDir)) {
    copyDir(uploadsDir, join(outputDir, 'assets', 'images'))
  }
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
