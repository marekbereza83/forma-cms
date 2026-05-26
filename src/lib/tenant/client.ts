import { prisma } from '../db/prisma'
import type { SiteModel } from '../cms/types'

export type TenantSession = { tenantId: string; userId: string }

export function getTenantScopedClient(session: TenantSession) {
  const { tenantId } = session

  return {
    getSite: () =>
      prisma.site.findUnique({ where: { tenantId } }).then(row =>
        row ? { ...row, model: JSON.parse(row.model) as SiteModel } : null,
      ),

    // getSiteById: still filters by tenantId from session — client cannot request other tenant's site
    getSiteById: (id: string) =>
      prisma.site.findFirst({ where: { id, tenantId } }).then(row =>
        row ? { ...row, model: JSON.parse(row.model) as SiteModel } : null,
      ),

    getEvents: () => prisma.event.findMany({ where: { tenantId } }),

    getEventById: (id: string) =>
      prisma.event.findFirst({ where: { id, tenantId } }),

    getPosts: () => prisma.post.findMany({ where: { tenantId } }),

    getPostById: (id: string) =>
      prisma.post.findFirst({ where: { id, tenantId } }),

    getEditLog: () =>
      prisma.editLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),

    createEvent: (data: {
      title: string
      date: Date
      description: string
      link?: string
      status?: string
    }) => prisma.event.create({ data: { ...data, tenantId } }),

    createPost: (data: {
      title: string
      body: string
      publishedAt?: Date
      status?: string
    }) => prisma.post.create({ data: { ...data, tenantId } }),
  }
}
