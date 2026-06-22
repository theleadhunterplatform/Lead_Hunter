import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/db';
import prisma from '../lib/prisma';
import { shouldIngestScrapedPost } from '../utils/scraped-post-gate.utils';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    await connectDB();

    const posts = await prisma.leadPost.findMany({
        where: {
            is_deleted: false,
            source_type: 'keyword',
            status: { in: ['pending', 'relevant'] },
        },
        select: {
            id: true,
            content: true,
            keyword: true,
            platform: true,
            status: true,
        },
    });

    let marked = 0;
    for (const post of posts) {
        const gate = shouldIngestScrapedPost(post.content || '', post.keyword || '', post.platform);
        if (gate.ok) continue;

        await prisma.leadPost.update({
            where: { id: post.id },
            data: {
                status: 'irrelevant',
                review_status: 'rejected',
                qualification_reason: `IRRELEVANT (retroactive): ${gate.reason}`,
            },
        });
        marked += 1;
    }

    console.log(
        `Retroactive gate cleanup: checked ${posts.length} keyword leads, marked ${marked} as noise.`
    );
}

main()
    .catch((error) => {
        console.error('Cleanup failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
