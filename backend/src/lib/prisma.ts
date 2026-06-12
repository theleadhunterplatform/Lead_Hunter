import '../config/database-env';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseMode } from '../config/database-env';

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export const getDatabaseLabel = (): string => {
    return resolveDatabaseMode() === 'local' ? 'SQLite (local file)' : 'Supabase PostgreSQL';
};

export default prisma;
