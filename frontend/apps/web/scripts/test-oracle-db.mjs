import { PrismaClient } from '../node_modules/.prisma/oracle-client/index.js'

const p = new PrismaClient()

try {
  const count = await p.leadPost.count({ where: { review_status: 'approved', is_deleted: false } })
  console.log('✅ Oracle schema connected. Approved leads:', count)

  const sample = await p.leadPost.findFirst({
    where: { review_status: 'approved', is_deleted: false, intelligence: { not: null } },
    select: { id: true, title: true, platform: true, review_status: true },
  })
  console.log('Sample lead:', JSON.stringify(sample, null, 2))
} catch (e) {
  console.error('❌ ERROR:', e.message)
} finally {
  await p.$disconnect()
}
