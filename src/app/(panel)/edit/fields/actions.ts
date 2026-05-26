'use server'
import { auth } from '@/lib/auth'
import { saveSite } from '@/lib/cms/persistence'
import { FormaValidationError } from '@/lib/cms/validation/types'

export async function saveFields(model: unknown) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  try {
    const { warnings } = await saveSite(
      { tenantId: session.user.tenantId, userId: session.user.userId },
      model,
    )
    return { success: true as const, warnings }
  } catch (e) {
    if (e instanceof FormaValidationError) {
      return { success: false as const, errors: e.violations }
    }
    throw e
  }
}
