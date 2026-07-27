import sanitizeHtml from 'sanitize-html'
import type { EventItem, PostItem } from '../types'
import type { Violation } from './types'
import { POST_CATEGORIES } from '../post-categories'

const MAX_TAGS = 8

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

// ── C5: PostItem.slug musi być kebab-case ────────────────────────────────────
// Slug buduje adres publikacje/<slug>.html — polskie znaki, spacje i wielkie
// litery psułyby URL i kanoniczność, więc odrzucamy je na wejściu.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validatePostSlugs(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (!SLUG_RE.test(post.slug)) {
      errors.push({
        rule: 'C5',
        field: `collections.posts[${i}].slug`,
        message: `Adres "${post.slug}" może zawierać tylko małe litery bez polskich znaków, cyfry i myślniki (np. "etyka-zawodowa")`,
      })
    }
  })
  return errors
}

// ── C6: PostItem.slug musi być unikalny ──────────────────────────────────────
// Dwa posty o tym samym slugu nadpisałyby swój plik przy eksporcie — cicha
// utrata treści, więc blokujemy zapis.
export function validatePostSlugUniqueness(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  const seen = new Map<string, number>()
  posts.forEach((post, i) => {
    const firstIndex = seen.get(post.slug)
    if (firstIndex !== undefined) {
      errors.push({
        rule: 'C6',
        field: `collections.posts[${i}].slug`,
        message: `Adres "${post.slug}" jest już użyty w publikacji nr ${firstIndex + 1} — każdy artykuł musi mieć własny`,
      })
    } else {
      seen.set(post.slug, i)
    }
  })
  return errors
}

// ── C7: opublikowany post musi mieć datę publikacji ──────────────────────────
// Data trafia do listy publikacji i do JSON-LD Article; brak daty przy
// status='published' dałby pustą datę na żywej stronie.
export function validatePublishedPostDates(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (post.status === 'published' && !post.publishedAt) {
      errors.push({
        rule: 'C7',
        field: `collections.posts[${i}].publishedAt`,
        message: `Publikacja "${post.title}" jest oznaczona jako opublikowana — ustaw datę publikacji`,
      })
    }
  })
  return errors
}

// ── C8: opublikowany post musi mieć niepustą treść ───────────────────────────
// Sprawdzamy tekst po usunięciu znaczników — "<p></p>" z edytora to pusty artykuł.
export function validatePublishedPostBodies(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (post.status !== 'published') return
    const text = post.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!text) {
      errors.push({
        rule: 'C8',
        field: `collections.posts[${i}].body`,
        message: `Publikacja "${post.title}" jest oznaczona jako opublikowana — treść nie może być pusta`,
      })
    }
  })
  return errors
}

// ── C9: PostItem.category musi byc jedna z POST_CATEGORIES, jesli ustawiona ─────
export function validatePostCategories(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (post.category !== undefined && !POST_CATEGORIES.includes(post.category)) {
      errors.push({
        rule: 'C9',
        field: `collections.posts[${i}].category`,
        message: `Kategoria "${post.category}" nie jest jedna z dozwolonych: ${POST_CATEGORIES.join(', ')}`,
      })
    }
  })
  return errors
}

// ── C10: PostItem.tags — kazdy niepusty po trim, maks. 8 ───────────────────────
export function validatePostTags(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (!post.tags) return
    if (post.tags.length > MAX_TAGS) {
      errors.push({
        rule: 'C10',
        field: `collections.posts[${i}].tags`,
        message: `Publikacja "${post.title}" ma ${post.tags.length} tagow — maksimum to ${MAX_TAGS}`,
      })
    }
    if (post.tags.some(t => t.trim() === '')) {
      errors.push({
        rule: 'C10',
        field: `collections.posts[${i}].tags`,
        message: `Publikacja "${post.title}" ma pusty tag`,
      })
    }
  })
  return errors
}

// ── C11: PostItem.keyTakeaways — kazdy wpis niepusty po trim ────────────────────
export function validatePostKeyTakeaways(posts: PostItem[]): Violation[] {
  const errors: Violation[] = []
  posts.forEach((post, i) => {
    if (post.keyTakeaways?.some(k => k.trim() === '')) {
      errors.push({
        rule: 'C11',
        field: `collections.posts[${i}].keyTakeaways`,
        message: `Publikacja "${post.title}" ma pusty punkt w kluczowych wnioskach`,
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
    ...validatePostSlugs(posts),
    ...validatePostSlugUniqueness(posts),
    ...validatePublishedPostDates(posts),
    ...validatePublishedPostBodies(posts),
    ...validatePostCategories(posts),
    ...validatePostTags(posts),
    ...validatePostKeyTakeaways(posts),
  ]
}
