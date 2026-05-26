import { parseSiteModel } from './schema'
import type { SiteModel } from './types'
import type { Violation } from './validation/types'
import { prisma } from '../db/prisma'
import type { TenantSession } from '../tenant/client'

// KONTRAKT: parseSiteModel musi przejsc PRZED zapisem do DB.
// Jesli rzuci FormaValidationError — nic nie jest zapisane. Nigdy nie omijaj.
export async function saveSite(
  session: TenantSession,
  raw: unknown,
): Promise<{ model: SiteModel; warnings: Violation[] }> {
  const { model, warnings } = parseSiteModel(raw) // throws FormaValidationError on hard violation

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
