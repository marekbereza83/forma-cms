export interface Violation {
  rule: string    // "V1", "W2", "C3"
  field: string   // "pricing.standard.amount"
  message: string // po polsku
}

export interface ValidationResult {
  errors: Violation[]
  warnings: Violation[]
}

export class FormaValidationError extends Error {
  readonly violations: Violation[]

  constructor(violations: Violation[]) {
    super(
      `Walidacja FORMA nie powiodła się (${violations.length} błąd/y): ` +
      violations.map(v => `[${v.rule}] ${v.message}`).join('; ')
    )
    this.name = 'FormaValidationError'
    this.violations = violations
  }
}
