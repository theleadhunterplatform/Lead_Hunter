import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real data pulled from the external Lead_Hunter API database
const REAL_KEYWORDS = [
  { text: 'hiring digital marketing agency', platforms: ['linkedin', 'twitter', 'reddit', 'threads'] },
]

const REAL_TARGETS = [
  { name: 'Amit Tiwari', url: 'https://www.linkedin.com/in/amittiwari1998', platform: 'linkedin', notes: null },
  { name: 'SIBASANKAR TRIPATHY', url: 'https://www.linkedin.com/in/sibasankar-tripathy-2b542930a', platform: 'linkedin', notes: null },
  { name: 'Mansi Pathak', url: 'https://www.linkedin.com/in/mansi-pathak-873b821b3', platform: 'linkedin', notes: null },
]

async function main() {
  console.log('Seeding keywords from external API...')
  for (const kw of REAL_KEYWORDS) {
    await prisma.keyword.upsert({
      where: { text: kw.text },
      update: { platforms: kw.platforms },
      create: { text: kw.text, platforms: kw.platforms },
    })
  }
  console.log(`  ${REAL_KEYWORDS.length} keyword(s) created`)

  console.log('Seeding watchlist targets from external API...')
  for (const t of REAL_TARGETS) {
    await prisma.sourceProfile.upsert({
      where: { url: t.url },
      update: {},
      create: t,
    })
  }
  console.log(`  ${REAL_TARGETS.length} target(s) created`)

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
