process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/lead_hunter_dev'
import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/default.js'

const prisma = new PrismaClient()

async function main() {
  const logs = await prisma.emailLog.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' }
  })
  console.log(`Found ${logs.length} recent email logs:`)
  for (const log of logs) {
    console.log(`- [${log.status}] Type: ${log.type} | To: ${log.to} | Subject: "${log.subject}" | At: ${log.createdAt.toISOString()}${log.error ? ` | Err: ${log.error}` : ''}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
