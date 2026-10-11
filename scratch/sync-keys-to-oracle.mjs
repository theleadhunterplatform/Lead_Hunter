import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

async function main() {
  const base = 'postgresql://postgres.hbhggojqtgwfxnmclcut:theleadhunterbydss@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
  const pPublic = new PrismaClient({ datasources: { db: { url: base } } });
  const pOracle = new PrismaClient({ datasources: { db: { url: base + '?schema=oracle' } } });

  const publicKeys = await pPublic.apifyKey.findMany();
  console.log('Public keys count:', publicKeys.length);

  let copied = 0;
  for (const k of publicKeys) {
    await pOracle.apifyKey.upsert({
      where: { key: k.key },
      create: {
        id: k.id,
        key: k.key,
        label: k.label,
        comments_used: k.comments_used || 0,
        comments_limit: k.comments_limit || 2500,
        usage_month: k.usage_month,
        is_active: true,
        is_deleted: false,
        created_at: k.created_at,
        updated_at: k.updated_at
      },
      update: {
        is_active: true,
        is_deleted: false,
        label: k.label
      }
    });
    copied++;
  }

  console.log(`Successfully synced ${copied} keys into oracle.apify_keys!`);
  const oracleCount = await pOracle.apifyKey.count();
  console.log('Total keys now in oracle schema:', oracleCount);

  await pPublic.$disconnect();
  await pOracle.$disconnect();
}

main().catch(console.error);
