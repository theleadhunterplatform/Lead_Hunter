import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/db';
import prisma from '../lib/prisma';
import { updateSetting } from '../services/setting.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    const apiKey = process.argv[2];
    if (!apiKey) {
        console.error('Usage: ts-node src/scripts/set-hunter-key.ts <api_key>');
        process.exit(1);
    }

    await connectDB();
    await updateSetting('hunter_api_key', apiKey, 'Hunter.io Email Verifier API Key');
    console.log('Hunter.io API key saved.');
}

main()
    .catch((error) => {
        console.error('Failed to save Hunter key:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
