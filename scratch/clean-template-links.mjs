import fs from 'fs';
import { PrismaClient } from './frontend/apps/web/node_modules/@prisma/client/index.js';

async function updateDb(url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const tpl = await prisma.broadcastTemplate.findUnique({ where: { id: 'tpl-auto-account-approved' } });
    if (tpl) {
      let body = tpl.body;
      body = body.replace('📄 [Link/Attachment: Hunters Onboarding Deck]', '📄 [Hunters Onboarding Deck]');
      body = body.replace('🔗 [Link: Join the Exclusive Community Here]', '🔗 [Join the Exclusive Community Here]');
      await prisma.broadcastTemplate.update({
        where: { id: 'tpl-auto-account-approved' },
        data: { body }
      });
      console.log('Updated template in DB:', url.split('@')[1]?.split('/')[0] || 'db');
    }
  } catch (e) {
    console.error('Error updating:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

const envLocal = fs.readFileSync('frontend/apps/web/.env.local', 'utf8');
const envProd = fs.readFileSync('frontend/apps/web/.env', 'utf8');

const matchLocal = envLocal.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const matchProd = envProd.match(/DATABASE_URL=["']?([^"'\r\n]+)/);

async function main() {
  if (matchLocal) await updateDb(matchLocal[1]);
  if (matchProd && matchProd[1] !== matchLocal?.[1]) await updateDb(matchProd[1]);
}

main();
