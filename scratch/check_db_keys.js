const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.apifyKey.findMany();
  console.log('Total Apify keys in DB:', all.length);
  console.log(all.map(k => ({ id: k.id, label: k.label, active: k.is_active, deleted: k.is_deleted, created_at: k.created_at })));
  await prisma.$disconnect();
}

main().catch(console.error);
