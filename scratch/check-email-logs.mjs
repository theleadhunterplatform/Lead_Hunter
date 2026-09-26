import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.emailLog.findMany({
    take: 10,
    orderBy: { sentAt: 'desc' }
  });
  console.log('Recent Email Logs:');
  console.log(JSON.stringify(logs, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
