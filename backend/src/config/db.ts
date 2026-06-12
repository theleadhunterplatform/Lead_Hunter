import prisma, { getDatabaseLabel } from '../lib/prisma';

export const isTransactionSupported = true;

const connectDB = async (): Promise<void> => {
    try {
        await prisma.$connect();
        console.log(`Database connected: ${getDatabaseLabel()}`);
    } catch (error: any) {
        console.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
};

export const disconnectDB = async (): Promise<void> => {
    await prisma.$disconnect();
};

export default connectDB;
