import '../config/database-env';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseMode } from '../config/database-env';

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Retry initial connection — Supabase pooler can drop idle connections
async function connectWithRetry(retries = 5, delayMs = 3000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await prisma.$connect();
            return;
        } catch (err: any) {
            console.error(`[Prisma] Connection attempt ${attempt}/${retries} failed:`, err.message);
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
                console.error('[Prisma] All connection attempts failed. Continuing — queries will retry per-request.');
            }
        }
    }
}

connectWithRetry();

export const getDatabaseLabel = (): string => {
    return resolveDatabaseMode() === 'local' ? 'SQLite (local file)' : 'Supabase PostgreSQL';
};

export default prisma;
