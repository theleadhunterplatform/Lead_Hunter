import dotenv from 'dotenv';
import path from 'path';
import { seedRBAC } from '../utils/seed-rbac.utils';
import connectDB from '../config/db';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        console.log('🚀 Manual Seed Execution Started...');
        await connectDB();
        await seedRBAC();
        console.log('✅ Manual Seed Completed Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Manual Seed Failed:', error);
        process.exit(1);
    }
};

run();
