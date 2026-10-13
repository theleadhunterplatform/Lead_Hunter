import prisma from '../lib/prisma';
import LeadPost from '../models/lead-post.model';
import { isDuplicateKeyError } from '../utils/lead-dedup.utils';

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

async function testConcurrentIngest() {
  console.log('Testing 5 concurrent workers ingesting the exact same lead post...');
  const testId = `synth-test-dup-${Date.now()}`;
  const rawPostData = {
    post_id: testId,
    platform: 'linkedin',
    url: `https://test.com/${testId}`,
    content: 'Duplicate ingestion test content for concurrency check',
    keyword: 'test-dup',
    status: 'pending',
  };

  const WORKERS = 5;
  const barrier = createBarrier(WORKERS);
  let qualificationJobsEnqueued = 0;

  const workerPromises = Array.from({ length: WORKERS }).map(async (_, idx) => {
    await barrier.wait();
    try {
      const saved = await LeadPost.create(rawPostData, { throwOnDuplicate: true });
      if (saved?._id) {
        qualificationJobsEnqueued += 1;
        console.log(`  [Worker ${idx + 1}] Successfully inserted new lead. Enqueued qualification job.`);
      }
      return { worker: idx + 1, inserted: true };
    } catch (error: any) {
      if (isDuplicateKeyError(error)) {
        console.log(`  [Worker ${idx + 1}] Detected duplicate key. Skipped duplicate qualification.`);
        return { worker: idx + 1, inserted: false, duplicate: true };
      }
      throw error;
    }
  });

  const outcomes = await Promise.all(workerPromises);
  const totalInDb = await prisma.leadPost.count({ where: { post_id: testId, platform: 'linkedin' } });

  console.log('\n=== Ingestion Concurrency Results ===');
  console.log(`Workers attempted: ${WORKERS}`);
  console.log(`Workers successfully inserted: ${outcomes.filter((o) => o.inserted).length}`);
  console.log(`Workers caught duplicate: ${outcomes.filter((o) => o.duplicate).length}`);
  console.log(`Qualification jobs enqueued: ${qualificationJobsEnqueued} (EXPECTED: 1)`);
  console.log(`Total records in DB: ${totalInDb} (EXPECTED: 1)`);

  // Cleanup
  await prisma.leadPost.deleteMany({
    where: { post_id: testId },
  });
  await prisma.$disconnect();

  if (qualificationJobsEnqueued === 1 && totalInDb === 1) {
    console.log('✅ TEST PASSED: Exactly 1 insert and 1 qualification job enqueued!');
  } else {
    console.error('❌ TEST FAILED: Duplicate qualification jobs or database records detected!');
    process.exit(1);
  }
}

testConcurrentIngest().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
