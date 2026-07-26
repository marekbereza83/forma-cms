'use server'
import { auth } from '@/lib/auth'
import { getTenantScopedClient } from '@/lib/tenant/client'
import { saveSite } from '@/lib/cms/persistence'
import { FormaValidationError } from '@/lib/cms/validation/types'

/**
 * Zapisuje wylacznie kolekcje publikacji.
 *
 * Model wczytujemy z bazy i podmieniamy tylko collections.posts, zamiast przyjmowac
 * caly SiteModel z przegladarki — dzieki temu rownolegla edycja tresci stron w drugiej
 * karcie nie zostanie nadpisana starym snapshotem z tej zakladki.
 *
 * Sanityzacja body NIE dzieje sie tutaj — robi ja saveSite() (invariant #5), zeby
 * zadna sciezka zapisu nie mogla jej pominac.
 */
export async function savePosts(posts: unknown) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const tenantSession = { tenantId: session.user.tenantId, userId: session.user.userId }
  const db = getTenantScopedClient(tenantSession)
  const site = await db.getSite()
  if (!site) throw new Error('Brak strony dla tego konta')

  const model = {
    ...site.model,
    collections: { ...site.model.collections, posts },
  }

  try {
    const { warnings } = await saveSite(tenantSession, model)
    return { success: true as const, warnings }
  } catch (e) {
    if (e instanceof FormaValidationError) {
      return { success: false as const, errors: e.violations }
    }
    throw e
  }
}
