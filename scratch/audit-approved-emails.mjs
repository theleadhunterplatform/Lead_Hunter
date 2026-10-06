import fs from 'fs';
import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/index.js';

const envLocal = fs.readFileSync('frontend/apps/web/.env.local', 'utf8');
const matchLocal = envLocal.match(/DATABASE_URL=["']?([^"'\r\n]+)/);

async function checkUsers() {
  const prisma = new PrismaClient({ datasources: { db: { url: matchLocal[1] } } });
  try {
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, email: true, plan: true, updatedAt: true },
    });

    console.log(`Checking ${activeUsers.length} ACTIVE users for email status:`);
    console.log('='.repeat(80));

    for (const u of activeUsers) {
      const logs = await prisma.emailLog.findMany({
        where: {
          to: u.email,
          type: 'approved',
        },
        orderBy: { sentAt: 'desc' },
      });

      const sentLog = logs.find((l) => l.status === 'SENT');
      const failedLog = logs.find((l) => l.status === 'FAILED');

      if (sentLog) {
        console.log(`✅ ${u.email.padEnd(35)} | SENT (${sentLog.sentAt.toISOString().slice(0, 16)})`);
      } else if (failedLog) {
        console.log(`❌ ${u.email.padEnd(35)} | FAILED: ${failedLog.error} (${failedLog.sentAt.toISOString().slice(0, 16)})`);
      } else {
        console.log(`⚠️ ${u.email.padEnd(35)} | NO ATTEMPT LOGGED (Updated: ${u.updatedAt.toISOString().slice(0, 16)})`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
