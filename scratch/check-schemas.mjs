import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

async function check(url, name) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  try {
    const keys = await prisma.apifyKey.findMany();
    console.log(`${name} keys count:`, keys.length);
    console.log(`${name} keys:`, keys.map(k => ({ label: k.label, key: k.key.slice(0, 15), active: k.is_active, deleted: k.is_deleted })));
  } catch (e) {
    console.log(`${name} error:`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const base = 'postgresql://postgres.hbhggojqtgwfxnmclcut:theleadhunterbydss@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
  const pPublic = new PrismaClient({ datasources: { db: { url: base } } });
  const pOracle = new PrismaClient({ datasources: { db: { url: base + '?schema=oracle' } } });

  console.log('PUBLIC Users:', await pPublic.user.count());
  console.log('ORACLE Users:', await pOracle.user.count());

  console.log('PUBLIC Targets:', await pPublic.sourceProfile.count());
  console.log('ORACLE Targets:', await pOracle.sourceProfile.count());

  console.log('PUBLIC ApifyKeys:', await pPublic.apifyKey.count());
  console.log('ORACLE ApifyKeys:', await pOracle.apifyKey.count());

  await pPublic.$disconnect();
  await pOracle.$disconnect();
}

main().catch(console.error);
