import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.hbhggojqtgwfxnmclcut:theleadhunterbydss@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function main() {
  console.log('--- SYNCING CLAIM COUNTS & UNLOCKING LEADS ---');

  // 1. Fetch all reveals grouped by leadId
  const reveals = await prisma.userLeadState.findMany({
    where: { isRevealed: true },
    select: { leadId: true, userId: true }
  });

  const distinctUsersPerLead = new Map();
  for (const r of reveals) {
    if (!distinctUsersPerLead.has(r.leadId)) {
      distinctUsersPerLead.set(r.leadId, new Set());
    }
    distinctUsersPerLead.get(r.leadId).add(r.userId);
  }

  console.log(`Found ${distinctUsersPerLead.size} leads with user reveals.`);

  // 2. Update each lead's claimed_count to match the distinct user reveal count
  let updatedCount = 0;
  for (const [leadId, userSet] of distinctUsersPerLead.entries()) {
    const actualCount = userSet.size;
    const currentLead = await prisma.leadPost.findUnique({
      where: { id: leadId },
      select: { id: true, title: true, claimed_count: true }
    });

    if (!currentLead) {
      console.warn(`Lead ${leadId} not found in leadPost!`);
      continue;
    }

    if (currentLead.claimed_count !== actualCount) {
      await prisma.leadPost.update({
        where: { id: leadId },
        data: { claimed_count: actualCount }
      });
      console.log(`[Updated] Lead "${currentLead.title || leadId}": claimed_count ${currentLead.claimed_count} -> ${actualCount}`);
      updatedCount++;
    } else {
      console.log(`[Verified] Lead "${currentLead.title || leadId}": claimed_count already correct at ${actualCount}`);
    }
  }

  // 3. Check for any leads that have claimed_count > 0 but 0 user reveals
  const orphanClaimedLeads = await prisma.leadPost.findMany({
    where: {
      claimed_count: { gt: 0 },
      id: { notIn: Array.from(distinctUsersPerLead.keys()) }
    },
    select: { id: true, title: true, claimed_count: true }
  });

  if (orphanClaimedLeads.length > 0) {
    console.log(`Found ${orphanClaimedLeads.length} leads with claimed_count > 0 but no reveals.`);
    for (const orphan of orphanClaimedLeads) {
      console.log(`[Orphan Lead] ${orphan.id} ("${orphan.title}") has claimed_count: ${orphan.claimed_count}`);
    }
  } else {
    console.log('No orphan claimed leads found.');
  }

  console.log(`\nSuccessfully synced ${distinctUsersPerLead.size} leads. Updated ${updatedCount} leads.`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
