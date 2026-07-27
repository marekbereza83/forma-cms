import { parseSiteModel } from './schema'
import type { PostItem, SiteModel } from './types'
import type { Violation } from './validation/types'
import { sanitizePostBody } from './validation/collections'
import { prisma } from '../db/prisma'
import type { TenantSession } from '../tenant/client'

/**
 * INVARIANT #5: kazde body posta przechodzi przez sanitizePostBody PRZED zapisem.
 *
 * Robimy to tutaj, w jedynej sciezce zapisu do DB, a nie w kodzie panelu — dzieki
 * temu zadna nowa akcja serwerowa nie moze tego pominac przez zapomnienie.
 * C3 pozostaje siatka bezpieczenstwa: jesli tu zadziala poprawnie, C3 nigdy nie strzeli.
 *
 * Operuje na surowym obiekcie (przed walidacja schematu), wiec kazdy krok jest
 * defensywny — nieznany ksztalt danych przepuszczamy bez zmian, a odrzuci go Zod.
 */
function sanitizePostBodies(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const model = raw as { collections?: { posts?: unknown } }
  const posts = model.collections?.posts
  if (!Array.isArray(posts)) return raw

  return {
    ...model,
    collections: {
      ...model.collections,
      posts: posts.map(post =>
        post && typeof post === 'object' && typeof (post as { body?: unknown }).body === 'string'
          ? { ...post, body: sanitizePostBody((post as { body: string }).body) }
          : post,
      ),
    },
  }
}

/**
 * Slug posta jest tez jego adresem URL (publikacje/<slug>.html). Gdy klient zmienia
 * slug opublikowanego posta, stary adres przestalby dzialac (404) bez sladu — dlatego
 * przy kazdym zapisie porownujemy nowy slug ze slugiem zapisanym wczesniej w DB i,
 * jesli sie rozjechal, dopisujemy stary do previousSlugs. To zrodlo danych dla
 * _redirects.json (patrz export.ts / buildPostRedirects) i 301 w Workerze.
 *
 * Operuje na surowym obiekcie (przed walidacja schematu) — nieznany ksztalt danych
 * przepuszczamy bez zmian, odrzuci go Zod.
 */
function trackPostSlugRedirects(raw: unknown, existingPosts: PostItem[] | undefined): unknown {
  if (!raw || typeof raw !== 'object' || !existingPosts || existingPosts.length === 0) return raw
  const model = raw as { collections?: { posts?: unknown } }
  const posts = model.collections?.posts
  if (!Array.isArray(posts)) return raw

  const existingById = new Map(existingPosts.map(p => [p.id, p]))

  return {
    ...model,
    collections: {
      ...model.collections,
      posts: posts.map(post => {
        if (!post || typeof post !== 'object') return post
        const p = post as { id?: unknown; slug?: unknown; previousSlugs?: unknown }
        const prior = typeof p.id === 'string' ? existingById.get(p.id) : undefined
        if (!prior || prior.slug === p.slug) return post

        const carried = Array.isArray(p.previousSlugs) ? p.previousSlugs : (prior.previousSlugs ?? [])
        const previousSlugs = Array.from(new Set([...carried, prior.slug]))
        return { ...p, previousSlugs }
      }),
    },
  }
}

// KONTRAKT: parseSiteModel musi przejsc PRZED zapisem do DB.
// Jesli rzuci FormaValidationError — nic nie jest zapisane. Nigdy nie omijaj.
export async function saveSite(
  session: TenantSession,
  raw: unknown,
): Promise<{ model: SiteModel; warnings: Violation[] }> {
  const existingRow = await prisma.site.findUnique({ where: { tenantId: session.tenantId } })
  const existingPosts = existingRow
    ? (JSON.parse(existingRow.model) as SiteModel).collections.posts
    : undefined

  // throws FormaValidationError on hard violation
  const withRedirects = trackPostSlugRedirects(sanitizePostBodies(raw), existingPosts)
  const { model, warnings } = parseSiteModel(withRedirects)

  await prisma.$transaction(async (tx) => {
    await tx.site.upsert({
      where:  { tenantId: session.tenantId },
      update: { model: JSON.stringify(model), version: { increment: 1 } },
      create: { tenantId: session.tenantId, model: JSON.stringify(model) },
    })

    await tx.editLog.create({
      data: {
        tenantId: session.tenantId,
        userId:   session.userId,
        action:   'site.save',
        target:   'site',
        before:   existingRow?.model ?? null,
        after:    JSON.stringify(model),
      },
    })
  })

  return { model, warnings }
}
