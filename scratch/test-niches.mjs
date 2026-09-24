import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/default.js'
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.leadPost.findMany({
    where: { review_status: 'approved', is_deleted: false },
    select: { niche: true },
    distinct: ['niche']
  })
  console.log('Distinct approved lead niches:', rows.map(r => r.niche))
  
  // Also check some user profiles and their servicesOffered
  const users = await prisma.user.findMany({
    take: 5,
    select: { email: true, servicesOffered: true }
  })
  console.log('Sample users & servicesOffered:', users)
}

main().finally(() => prisma.$disconnect())
