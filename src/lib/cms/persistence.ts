import { parseSiteModel } from './schema'
import type { SiteModel } from './types'
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

// KONTRAKT: parseSiteModel musi przejsc PRZED zapisem do DB.
// Jesli rzuci FormaValidationError — nic nie jest zapisane. Nigdy nie omijaj.
export async function saveSite(
  session: TenantSession,
  raw: unknown,
): Promise<{ model: SiteModel; warnings: Violation[] }> {
  // throws FormaValidationError on hard violation
  const { model, warnings } = parseSiteModel(sanitizePostBodies(raw))

  await prisma.$transaction(async (tx) => {
    const existing = await tx.site.findUnique({ where: { tenantId: session.tenantId } })

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
        before:   existing?.model ?? null,
        after:    JSON.stringify(model),
      },
    })
  })

  return { model, warnings }
}
