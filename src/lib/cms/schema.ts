import { z } from 'zod'
import type { SiteModel } from './types'
import type { Violation } from './validation/types'
import { validateSiteModel, FormaValidationError } from './validation/index'

const FieldSchema = z.object({
  type: z.enum(['text', 'richtext', 'price', 'stat', 'cta', 'contact', 'list', 'image']),
  value: z.unknown(),
  editable: z.boolean(),
  constraints: z.record(z.unknown()).optional(),
})

const SectionSchema = z.object({
  id: z.string(),
  recipe: z.string(),
  fields: z.record(FieldSchema),
})

const PageMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  canonical: z.string(),
  ogTitle: z.string(),
  ogDescription: z.string(),
  ogUrl: z.string(),
  variant: z.enum(['legal', '404']).optional(),
})

const PageSchema = z.object({
  slug: z.string(),
  navLabel: z.string().optional(),
  meta: PageMetaSchema.optional(),
  sections: z.array(SectionSchema),
})

const SiteMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  ogDescription: z.string(),
  canonical: z.string(),
  ogImage: z.string(),
  brandName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  contactPhoneDisplay: z.string(),
  gaId: z.string().optional(),
})

export const EventItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  date: z.string(),
  description: z.string(),
  link: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'archived']),
})

export const PostItemSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  title: z.string().min(1),
  publishedAt: z.string().optional(),
  excerpt: z.string().optional(),
  body: z.string(),
  status: z.enum(['draft', 'published']),
  previousSlugs: z.array(z.string()).optional(),
})

export const SiteModelSchema = z.object({
  tenantId: z.string(),
  archetype: z.enum(['trust-led', 'authority-led']),
  designSystem: z.literal('forma'),
  meta: SiteMetaSchema,
  pages: z.array(PageSchema),
  collections: z.object({
    events: z.array(EventItemSchema),
    posts: z.array(PostItemSchema),
  }),
})

/**
 * SINGLE ENTRY POINT FOR SITEMODEL PERSISTENCE.
 * All code that reads or writes a SiteModel MUST go through this function.
 * KROK 4 (auth) and KROK 5 (panel) must NOT call SiteModelSchema.parse() directly.
 *
 * Throws ZodError on structural failure.
 * Throws FormaValidationError if any hard (V*) or collection (C*) rule is violated.
 * Returns { model, warnings } — warnings (W*) do not block save.
 */
export function parseSiteModel(json: unknown): { model: SiteModel; warnings: Violation[] } {
  const model = SiteModelSchema.parse(json) as SiteModel
  const { errors, warnings } = validateSiteModel(model)
  if (errors.length > 0) throw new FormaValidationError(errors)
  return { model, warnings }
}
