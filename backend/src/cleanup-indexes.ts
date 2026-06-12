import connectDB, { disconnectDB } from './config/db';

const cleanupIndexes = async () => {
    try {
        await connectDB();
        console.log('PostgreSQL via Supabase does not require manual index cleanup.');
        console.log('Run `npx prisma migrate deploy` to apply schema indexes.');
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await disconnectDB();
    }
};

cleanupIndexes();
