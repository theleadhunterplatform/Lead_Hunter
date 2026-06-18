import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/db';
import prisma from '../lib/prisma';
import { getSetting } from '../services/setting.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    await connectDB();
    const cc = await getSetting('contact_compass_token');
    const hunter = await getSetting('hunter_api_key');
    console.log('Contact Compass:', cc ? `configured (${cc.slice(0, 4)}...${cc.slice(-4)})` : 'NOT configured');
    console.log('Hunter.io:', hunter ? `configured (${hunter.slice(0, 4)}...${hunter.slice(-4)})` : 'NOT configured');
}

main()
    .finally(() => prisma.$disconnect());
