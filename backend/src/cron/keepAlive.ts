import cron from 'node-cron';
import { isKeepAliveEnabled } from '../utils/automation-settings.utils';
import { isKeepAliveConfigured, KEEP_ALIVE_INTERVAL, pingKeepAliveUrls } from '../services/keep-alive.service';
import prisma from '../lib/prisma';

/** Ping Render URLs every 10 min so free-tier services don't idle-sleep. */
export const initKeepAliveCron = () => {
    if (!isKeepAliveConfigured()) {
        console.log('ℹ Keep-alive cron skipped — set FRONTEND_URL, AI_SERVICE_URL, or KEEP_ALIVE_URLS.');
        return;
    }

    cron.schedule(KEEP_ALIVE_INTERVAL, async () => {
        if (!(await isKeepAliveEnabled())) return;

        console.log('--- [KeepAlive] Pinging services ---');
        try {
            await pingKeepAliveUrls();
        } catch (error: any) {
            console.error('❌ [KeepAlive] Ping failed:', error.message);
        }

        // Ping Supabase DB to prevent free-tier auto-pause
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (dbErr: any) {
            console.error('❌ [KeepAlive] DB ping failed:', dbErr.message);
        }
    });

    console.log(`✔ Keep-alive cron initialized: every 10 min`);
};
