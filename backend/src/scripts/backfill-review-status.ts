import prisma from '../lib/prisma';

async function backfillReviewStatus() {
    const approved = await prisma.leadPost.updateMany({
        where: {
            is_deleted: false,
            status: 'relevant',
            intelligence: { not: null },
            OR: [{ review_status: null }, { review_status: 'awaiting_review' }],
        },
        data: { review_status: 'approved' },
    });

    const awaiting = await prisma.leadPost.updateMany({
        where: {
            is_deleted: false,
            status: 'relevant',
            intelligence: null,
            OR: [{ review_status: null }, { review_status: 'approved' }],
        },
        data: { review_status: 'awaiting_review' },
    });

    const rejected = await prisma.leadPost.updateMany({
        where: {
            is_deleted: false,
            status: 'irrelevant',
            review_status: null,
        },
        data: { review_status: 'rejected' },
    });

    console.log(`Backfill complete: ${approved.count} approved, ${awaiting.count} awaiting review, ${rejected.count} rejected.`);
}

backfillReviewStatus()
    .catch((error) => {
        console.error('Backfill failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
