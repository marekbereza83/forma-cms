import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.site.findMany().then(s => s.forEach(x => console.log(x.tenantId))).finally(() => p.$disconnect())
