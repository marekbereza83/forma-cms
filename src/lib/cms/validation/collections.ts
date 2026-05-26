import sanitizeHtml from 'sanitize-html'
import type { EventItem, PostItem } from '../types'
import type { Violation } from './types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Patterns that must never appear in a post body that passed through the sanitizer.
// Presence means the pipeline has a bug (save bypassed sanitizePostBody), not a client error.
const DANGEROUS_SCRIPT_RE = /<script/i
const DANGEROUS_HANDLER_RE = /\bon\w+\s*=/i
const DANGEROUS_SCHEME_RE = /javascript:/i

// Allowlist for sanitizePostBody — covers typical rich-text newsletter content.
// sanitizePostBody is the first line of defence used at SAVE time (KROK 5).
// It cleans silently; Word junk (<span style>, <o:p>) is stripped without error.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'br'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
}

// ── C1: EventItem.date must be YYYY-MM-DD ────────────────────────────────────
export function validateEvents(events: EventItem[]): Violation[] {
  const errors: Violation[] = []
  events.forEach((event, i) => {
    if (!DATE_RE.test(event.date)) {
      errors.push({
        rule: 'C1',
        field: `collections.events[${i}].date`,
        message: `Data "${event.date}" nie pasuje do formatu YYYY-MM-DD`,
      })
    }
  })
  return errors
}

// ── C2: EventItem.title must not be empty ───────────────────────────────────
export function validateEventTitles(events: EventItem[]): Violation[] {
  const errors: Violation[] = []
  events.forEach((event, i) => {
    if (!event.title.trim()) {
      errors.push({
        rule: 'C2',
        field: `collections.events[${i}].title`,
        message: 'Tytuł wydarzenia nie może być pusty',
      })
    }
  })
  return errors
}

// sanitizePostBody — first-line defence, used at SAVE time (KROK 5).
// Silently strips dangerous and unknown markup; harmless Word junk is removed
// without raising an error. Returns safe HTML ready for storage.
export function sanitizePostBody(body: string): string {
  return sanitizeHtml(body, SANITIZE_OPTIONS)
}

// ── C3: PostItem.body must not contain dangerous patterns ────────────────────
// Safety-net validator: fires only when truly dangerous markup is present
// (script tags, event handlers, javascript: scheme). This should never trigger
// in normal operation — if it does, unsanitised content bypassed the save path.
// Does NOT fire on harmless Word/editor junk — that is handled by sanitizePostBody.
export function validatePostBodies(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    const body = post.body
    if (
      DANGEROUS_SCRIPT_RE.test(body) ||
      DANGEROUS_HANDLER_RE.test(body) ||
      DANGEROUS_SCHEME_RE.test(body)
    ) {
      errors.push({
        rule: 'C3',
        field: `collections.posts[${i}].body`,
        message: 'Treść posta zawiera niedozwolony kod (script, event handler lub javascript:)',
      })
    }
  })
  return errors
}

// ── C4: PostItem.publishedAt must be YYYY-MM-DD when present ────────────────
export function validatePostDates(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (post.publishedAt !== undefined && !DATE_RE.test(post.publishedAt)) {
      errors.push({
        rule: 'C4',
        field: `collections.posts[${i}].publishedAt`,
        message: `Data publikacji "${post.publishedAt}" nie pasuje do formatu YYYY-MM-DD`,
      })
    }
  })
  return errors
}

export function validateCollections(
  events: EventItem[],
  posts: PostItem[],
): Violation[] {
  return [
    ...validateEvents(events),
    ...validateEventTitles(events),
    ...validatePostBodies(posts),
    ...validatePostDates(posts),
  ]
}
