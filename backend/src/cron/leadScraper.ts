import cron from 'node-cron';
import config from '../config';
import Keyword from '../models/keyword.model';
import prisma from '../lib/prisma';
import { scraperQueue } from '../queues';

/**
 * Initializes the producer cron job that enqueues scraping tasks into BullMQ.
 * This ensures the main process isn't blocked by long-running scraping tasks.
 */
export const initCron = async () => {
    // Schedule the producer job
    cron.schedule(config.cron.interval, async () => {
        console.log('--- [CRON] Triggering Scraper Producer Job ---');
        
        try {
            const activeKeywords = await Keyword.find({
                is_active: true,
                is_deleted: false
            });

            if (activeKeywords.length === 0) {
                console.log('[CRON] No active keywords found.');
                return;
            }

            console.log(`📡 [CRON] Found ${activeKeywords.length} active keywords. Enqueueing jobs...`);

            for (const kw of activeKeywords) {
                // Add a job for each platform the keyword is enabled for
                const platforms = kw.platforms || ['linkedin'];
                
                for (const platform of platforms) {
                    const jobId = `scrape-${platform}-${kw._id}-${new Date().toISOString().split('T')[0]}`;
                    
                    await scraperQueue.add(`scrape-${platform}-${kw.text}`, {
                        keywordId: kw._id,
                        platform: platform,
                        keywordText: kw.text
                    }, {
                        jobId, // Idempotency: prevent duplicate scrapes for the same keyword on the same day
                        removeOnComplete: true,
                    });
                    
                    console.log(`  + Enqueued: ${platform} | "${kw.text}"`);
                }
            }
            
            console.log('✔ [CRON] All keyword scraping jobs enqueued.');

            const activeTargets = await prisma.sourceProfile.findMany({
                where: { is_active: true, platform: 'linkedin' },
            });

            if (activeTargets.length === 0) {
                console.log('[CRON] No active watchlist targets found.');
                return;
            }

            console.log(`📡 [CRON] Found ${activeTargets.length} active watchlist targets. Enqueueing jobs...`);

            for (const target of activeTargets) {
                const jobId = `scrape-target-${target.id}-${new Date().toISOString().split('T')[0]}`;

                await scraperQueue.add(`scrape-target-${target.name}`, {
                    type: 'target',
                    targetId: target.id,
                    targetName: target.name,
                    targetUrl: target.url,
                }, {
                    jobId,
                    removeOnComplete: true,
                });

                console.log(`  + Enqueued target: "${target.name}"`);
            }

            console.log('✔ [CRON] All watchlist scraping jobs enqueued.');
        } catch (error: any) {
            console.error('❌ [CRON] Scraper Producer Job Failed:', error.message);
        }
    });

    console.log(`✔ Scraper Cron Initialized: ${config.cron.interval}`);
};
