import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/db';
import prisma from '../lib/prisma';
import { removeDuplicateLeads } from '../utils/lead-dedup.utils';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    await connectDB();
    const result = await removeDuplicateLeads();
    console.log(
        `Duplicate cleanup done: ${result.removed} removed, ${result.kept} kept (${result.groups} duplicate groups).`
    );
}

main()
    .catch((error) => {
        console.error('Duplicate cleanup failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
