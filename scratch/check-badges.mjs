import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/default.js'

const prisma = new PrismaClient()

async function main() {
  const posts = await prisma.leadPost.findMany({
    where: { review_status: 'approved', is_deleted: false },
    take: 10,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      keyword: true,
      niche: true,
      intelligence: true,
      content: true,
    }
  })

  for (const p of posts) {
    console.log('=== LEAD ===')
    console.log('ID:', p.id)
    console.log('Title:', p.title)
    console.log('Niche Col:', p.niche)
    console.log('Keyword:', p.keyword)
    // Check if intelligence has badges
    const m = (p.intelligence || '').match(/Badges[^\n]*\n+([^\n]+)/i)
    if (m) console.log('AI Badges Raw:', m[1])
    console.log('Content preview:', (p.content || '').slice(0, 150).replace(/\n/g, ' '))
  }
}

main().finally(() => prisma.$disconnect())
