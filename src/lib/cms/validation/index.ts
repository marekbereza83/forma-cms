import type { SiteModel } from '../types'
import type { ValidationResult } from './types'
import { validateHard } from './hard'
import { validateSoft } from './soft'
import { validateCollections } from './collections'

export { FormaValidationError } from './types'
export type { Violation, ValidationResult } from './types'
export { sanitizePostBody } from './collections'

export function validateSiteModel(model: SiteModel): ValidationResult {
  const errors = [
    ...validateHard(model),
    ...validateCollections(model.collections.events, model.collections.posts),
  ]
  const warnings = validateSoft(model)
  return { errors, warnings }
}
