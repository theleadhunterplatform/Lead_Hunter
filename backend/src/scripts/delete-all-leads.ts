import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/db';
import prisma from '../lib/prisma';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    await connectDB();

    const leadCount = await prisma.leadPost.count();
    console.log(`Found ${leadCount} leads to delete.`);

    if (leadCount === 0) {
        console.log('No leads to delete.');
        return;
    }

    const [claims, intelligence, scrapedPosts, leads] = await prisma.$transaction([
        prisma.claim.deleteMany(),
        prisma.leadIntelligence.deleteMany(),
        prisma.scrapedPost.deleteMany(),
        prisma.leadPost.deleteMany(),
    ]);

    console.log(`Deleted ${claims.count} claims.`);
    console.log(`Deleted ${intelligence.count} intelligence records.`);
    console.log(`Deleted ${scrapedPosts.count} scraped post links.`);
    console.log(`Deleted ${leads.count} leads.`);
    console.log('All leads removed completely.');
}

main()
    .catch((error) => {
        console.error('Failed to delete leads:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
