import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export type DatabaseMode = 'local' | 'supabase';

const LOCAL_DB_FILE = 'file:./data/lead-hunter.db';

export const resolveDatabaseMode = (): DatabaseMode => {
    const explicit = process.env.DB_MODE?.toLowerCase();
    if (explicit === 'local' || explicit === 'supabase') {
        return explicit;
    }
    return process.env.NODE_ENV === 'production' ? 'supabase' : 'local';
};

export const configureDatabaseEnv = (): DatabaseMode => {
    const mode = resolveDatabaseMode();

    if (mode === 'local') {
        process.env.DATABASE_URL = process.env.DATABASE_URL || LOCAL_DB_FILE;

        const relativePath = process.env.DATABASE_URL.replace(/^file:/, '');
        const absolutePath = path.resolve(process.cwd(), relativePath);
        const dataDir = path.dirname(absolutePath);

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        return mode;
    }

    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required when DB_MODE=supabase');
    }

    return mode;
};

// Apply before Prisma client is imported anywhere.
configureDatabaseEnv();
