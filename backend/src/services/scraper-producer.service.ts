import Keyword from '../models/keyword.model';
import prisma from '../lib/prisma';
import { scraperQueue } from '../queues';

/** Enqueue keyword + watchlist scrape jobs (used by cron and automation toggle). */
export async function runScraperProducerJob(): Promise<{ keywords: number; targets: number }> {
    const activeKeywords = await Keyword.find({
        is_active: true,
        is_deleted: false,
    });

    if (activeKeywords.length === 0) {
        console.log('[ScraperProducer] No active keywords found.');
    } else {
        console.log(`📡 [ScraperProducer] Found ${activeKeywords.length} active keywords. Enqueueing jobs...`);

        for (const kw of activeKeywords) {
            const platforms = kw.platforms || ['linkedin'];

            for (const platform of platforms) {
                const jobId = `scrape-${platform}-${kw._id}-${new Date().toISOString().split('T')[0]}`;

                await scraperQueue.add(
                    `scrape-${platform}-${kw.text}`,
                    {
                        keywordId: kw._id,
                        platform,
                        keywordText: kw.text,
                    },
                    {
                        jobId,
                        removeOnComplete: true,
                    }
                );

                console.log(`  + Enqueued: ${platform} | "${kw.text}"`);
            }
        }
    }

    const activeTargets = await prisma.sourceProfile.findMany({
        where: { is_active: true, platform: 'linkedin' },
    });

    if (activeTargets.length === 0) {
        console.log('[ScraperProducer] No active watchlist targets found.');
    } else {
        console.log(`📡 [ScraperProducer] Found ${activeTargets.length} active watchlist targets. Enqueueing jobs...`);

        for (const target of activeTargets) {
            const jobId = `scrape-target-${target.id}-${new Date().toISOString().split('T')[0]}`;

            await scraperQueue.add(
                `scrape-target-${target.name}`,
                {
                    type: 'target',
                    targetId: target.id,
                    targetName: target.name,
                    targetUrl: target.url,
                },
                {
                    jobId,
                    removeOnComplete: true,
                }
            );

            console.log(`  + Enqueued target: "${target.name}"`);
        }
    }

    console.log('✔ [ScraperProducer] Scrape jobs enqueued.');
    return { keywords: activeKeywords.length, targets: activeTargets.length };
}
