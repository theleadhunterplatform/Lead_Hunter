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

// Reconnect on connection loss (Supabase pooler drops idle connections)
prisma.$connect().catch((err) => {
    console.error('[Prisma] Initial connection failed:', err.message);
});

export const getDatabaseLabel = (): string => {
    return resolveDatabaseMode() === 'local' ? 'SQLite (local file)' : 'Supabase PostgreSQL';
};

export default prisma;
