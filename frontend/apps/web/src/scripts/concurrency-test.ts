import { db } from '../lib/db';
import { creditService } from '../lib/services/credits';

const MAX_CLAIMS_PER_LEAD = 25;

function createBarrier(count: number) {
  let waiters: Array<() => void> = [];
  return {
    async wait() {
      if (waiters.length + 1 >= count) {
        const all = waiters;
        waiters = [];
        all.forEach((resolve) => resolve());
        return;
      }
      await new Promise<void>((resolve) => {
        waiters.push(resolve);
      });
    },
  };
}

async function cleanupSyntheticData() {
  console.log('🧹 Cleaning up synthetic test data...');
  try {
    await db.userLeadState.deleteMany({
      where: {
        OR: [
          { leadId: { startsWith: 'synth-audit-' } },
          { user: { email: { endsWith: '@audit.local' } } },
        ],
      },
    });
    await db.auditLog.deleteMany({
      where: {
        user: { email: { endsWith: '@audit.local' } },
      },
    });
    await db.creditAccount.deleteMany({
      where: {
        user: { email: { endsWith: '@audit.local' } },
      },
    });
    await db.leadPost.deleteMany({
      where: {
        id: { startsWith: 'synth-audit-' },
      },
    });
    await db.lead.deleteMany({
      where: {
        id: { startsWith: 'synth-audit-' },
      },
    });
    await db.user.deleteMany({
      where: {
        email: { endsWith: '@audit.local' },
      },
    });
  } catch (err: any) {
    console.warn('Cleanup warning:', err.message);
  }
}

// ATOMIC PATCHED reveal implementation
async function patchedReveal(userId: string, leadId: string) {
  const CREDIT_COST = 1;

  return db.$transaction(
    async (tx) => {
      // 1. Fast check if already unlocked
      const existing = await tx.userLeadState.findUnique({
        where: { userId_leadId: { userId, leadId } },
      });
      if (existing?.isRevealed) {
        return { alreadyRevealed: true, coinsUsed: 0 };
      }

      // 2. Idempotent reservation for this user via native ON CONFLICT DO NOTHING:
      await tx.$executeRaw`
        INSERT INTO "public"."UserLeadState" ("id", "userId", "leadId", "isRevealed", "isSaved", "status", "lastActionDate")
        VALUES (gen_random_uuid()::text, ${userId}, ${leadId}, false, true, 'saved', NOW())
        ON CONFLICT ("userId", "leadId") DO NOTHING;
      `;

      // Atomically transition isRevealed from false to true
      const claimMarked = await tx.userLeadState.updateMany({
        where: { userId, leadId, isRevealed: false },
        data: {
          isRevealed: true,
          revealedAt: new Date(),
          isSaved: true,
          status: 'saved',
        },
      });

      // If count is 0, another concurrent request by the same user already unlocked it!
      if (claimMarked.count === 0) {
        return { alreadyRevealed: true, coinsUsed: 0 };
      }

      // 3. Atomically enforce the strict 25-claim limit on the lead row
      // This update locks the lead_posts row and verifies claimed_count < 25 atomically
      const bumped = await tx.leadPost.updateMany({
        where: { id: leadId, claimed_count: { lt: MAX_CLAIMS_PER_LEAD } },
        data: { claimed_count: { increment: 1 } },
      });

      if (bumped.count === 0) {
        const err = new Error('LEAD_ALREADY_CLAIMED');
        (err as any).code = 'LEAD_ALREADY_CLAIMED';
        throw err;
      }

      // 4. Deduct credits atomically
      await creditService.deductInTx(tx, userId, CREDIT_COST, 'lead_reveal', { leadId });

      return { alreadyRevealed: false, coinsUsed: CREDIT_COST };
    },
    { timeout: 15000 },
  );
}

async function run() {
  console.log('====================================================');
  console.log('  REVEAL & CLAIM CONCURRENCY AUDIT (PATCHED CODE)   ');
  console.log('====================================================\n');

  await cleanupSyntheticData();

  const results: Record<string, any> = {};

  // -------------------------------------------------------------------------
  // SCENARIO 1: 30 concurrent users claiming a lead with a 25-user limit
  // -------------------------------------------------------------------------
  console.log('👉 [Test 1] 30 concurrent users claiming the same lead (limit 25)...');
  const lead1 = await db.leadPost.create({
    data: {
      id: 'synth-audit-lead-25',
      post_id: 'synth-audit-post-25',
      platform: 'linkedin',
      url: 'https://linkedin.com/feed/synth-audit-25',
      content: 'Synthetic lead for 25-claim limit concurrency audit',
      keyword: 'audit-concurrency',
      status: 'relevant',
      review_status: 'approved',
      intelligence: 'Synthetic intel',
      claimed_count: 0,
    },
  });

  const TOTAL_USERS = 30;
  const users: any[] = [];
  for (let i = 1; i <= TOTAL_USERS; i++) {
    const u = await db.user.create({
      data: {
        id: `synth-user-${i}`,
        name: `Audit User ${i}`,
        email: `synth-user-${i}@audit.local`,
        role: 'user',
        status: 'ACTIVE',
      },
    });
    await db.creditAccount.create({
      data: {
        userId: u.id,
        subscriptionBalance: 10,
        bonusBalance: 0,
        rolloverBalance: 0,
      },
    });
    users.push(u);
  }

  const barrier = createBarrier(TOTAL_USERS);
  const claimPromises = users.map(async (u) => {
    await barrier.wait();
    try {
      const res = await patchedReveal(u.id, lead1.id);
      return { success: true, userId: u.id, res };
    } catch (err: any) {
      return { success: false, userId: u.id, error: err.message };
    }
  });

  const outcomes = await Promise.all(claimPromises);
  const successCount = outcomes.filter((o) => o.success).length;
  const failCount = outcomes.filter((o) => !o.success).length;

  const revealedCountInDb = await db.userLeadState.count({
    where: { leadId: lead1.id, isRevealed: true },
  });
  const postInDb = await db.leadPost.findUnique({
    where: { id: lead1.id },
  });

  console.log(`   - Successful claims: ${successCount} (EXPECTED: 25)`);
  console.log(`   - Failed claims: ${failCount} (EXPECTED: 5)`);
  console.log(`   - Actual UserLeadState rows in DB: ${revealedCountInDb} (EXPECTED: 25)`);
  console.log(`   - LeadPost.claimed_count in DB: ${postInDb?.claimed_count} (EXPECTED: 25)`);

  results.test1 = {
    totalAttempted: TOTAL_USERS,
    successCount,
    failCount,
    revealedCountInDb,
    claimedCountInDb: postInDb?.claimed_count,
    limitEnforcedProperly: revealedCountInDb === 25 && postInDb?.claimed_count === 25,
  };

  // -------------------------------------------------------------------------
  // SCENARIO 2: Single user sends 5 concurrent reveal requests for same lead
  // -------------------------------------------------------------------------
  console.log('\n👉 [Test 2] Single user sends 5 simultaneous reveal requests for same lead...');
  const lead2 = await db.leadPost.create({
    data: {
      id: 'synth-audit-lead-double',
      post_id: 'synth-audit-post-double',
      platform: 'linkedin',
      url: 'https://linkedin.com/feed/synth-audit-double',
      content: 'Synthetic lead for single-user double reveal audit',
      keyword: 'audit-concurrency',
      status: 'relevant',
      review_status: 'approved',
      intelligence: 'Synthetic intel',
      claimed_count: 0,
    },
  });

  const testUser = users[0];
  const creditsBefore = (await db.creditAccount.findUnique({ where: { userId: testUser.id } }))?.subscriptionBalance || 0;

  const REPEATS = 5;
  const barrier2 = createBarrier(REPEATS);
  const doublePromises = Array.from({ length: REPEATS }).map(async () => {
    await barrier2.wait();
    try {
      const res = await patchedReveal(testUser.id, lead2.id);
      return { success: true, res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  const doubleOutcomes = await Promise.all(doublePromises);
  const creditsAfter = (await db.creditAccount.findUnique({ where: { userId: testUser.id } }))?.subscriptionBalance || 0;
  const creditsDeducted = creditsBefore - creditsAfter;
  const postDoubleInDb = await db.leadPost.findUnique({ where: { id: lead2.id } });

  console.log(`   - Successful responses: ${doubleOutcomes.filter((o) => o.success).length}`);
  console.log(`   - Credits before: ${creditsBefore}, Credits after: ${creditsAfter}`);
  console.log(`   - Credits deducted: ${creditsDeducted} (EXPECTED: 1)`);
  console.log(`   - Lead claimed_count in DB: ${postDoubleInDb?.claimed_count} (EXPECTED: 1)`);

  results.test2 = {
    repeats: REPEATS,
    successfulResponses: doubleOutcomes.filter((o) => o.success).length,
    creditsDeducted,
    claimedCountInDb: postDoubleInDb?.claimed_count,
    idempotent: creditsDeducted === 1 && postDoubleInDb?.claimed_count === 1 && doubleOutcomes.filter((o) => o.success).length === REPEATS,
  };

  await cleanupSyntheticData();

  console.log('\n====================================================');
  console.log('AUDIT SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================\n');

  await db.$disconnect();
}

run().catch(async (e) => {
  console.error('Test run failed:', e);
  await cleanupSyntheticData();
  await db.$disconnect();
  process.exit(1);
});
