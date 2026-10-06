import fs from 'fs';
import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/index.js';

async function inspectDb(label, url) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log(`\n=== DB: ${label} ===`);
    const logs = await p.emailLog.findMany({
      take: 25,
      orderBy: { sentAt: 'desc' },
    });
    console.log(`Recent Email Logs (${logs.length}):`);
    logs.forEach((l) => {
      console.log(`[${l.sentAt?.toISOString() || 'no-date'}] ${l.type} -> ${l.to} | Status: ${l.status} | Subject: "${l.subject}" | Error: ${l.error || 'none'}`);
    });

    const recentApprovedUsers = await p.user.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, email: true, status: true, updatedAt: true },
    });
    console.log('\nRecently Updated ACTIVE Users:');
    recentApprovedUsers.forEach((u) => {
      console.log(`${u.email} (${u.name}) | Updated: ${u.updatedAt.toISOString()}`);
    });
  } catch (e) {
    console.error(`Error on ${label}:`, e.message);
  } finally {
    await p.$disconnect();
  }
}

const envLocal = fs.readFileSync('frontend/apps/web/.env.local', 'utf8');
const matchLocal = envLocal.match(/DATABASE_URL=["']?([^"'\r\n]+)/);

const envProd = fs.readFileSync('frontend/apps/web/.env', 'utf8');
const matchProd = envProd.match(/DATABASE_URL=["']?([^"'\r\n]+)/);

async function main() {
  if (matchLocal) await inspectDb('AP-SOUTH-1 (from .env.local)', matchLocal[1]);
  if (matchProd && matchProd[1] !== matchLocal?.[1]) await inspectDb('AP-NORTHEAST-1 (from .env)', matchProd[1]);
}

main();
