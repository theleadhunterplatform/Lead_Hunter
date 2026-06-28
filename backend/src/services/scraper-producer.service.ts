import Keyword from '../models/keyword.model';
import prisma from '../lib/prisma';
import { scraperQueue } from '../queues';

/** Enqueue keyword + watchlist scrape jobs (used by cron and automation toggle). */
export async function runScraperProducerJob(): Promise<{ keywords: number; targets: number }> {
    console.log('📡 [KeywordScrape] Auto-scrape producer started — uses each keyword\'s enabled platforms');

    const activeKeywords = await Keyword.find({
        is_active: true,
        is_deleted: false,
    });

    if (activeKeywords.length === 0) {
        console.log('[KeywordScrape] No active keywords found.');
    } else {
        console.log(`📡 [KeywordScrape] Found ${activeKeywords.length} active keyword(s). Enqueueing jobs...`);

        for (const kw of activeKeywords) {
            const platforms = kw.platforms?.length ? kw.platforms : ['linkedin'];
            console.log(`  · "${kw.text}" → platforms: [${platforms.join(', ')}]`);

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

                console.log(`  + [${platform}] queued "${kw.text}"`);
            }
        }
    }

    const activeTargets = await prisma.sourceProfile.findMany({
        where: { is_active: true, platform: 'linkedin' },
    });

    if (activeTargets.length === 0) {
        console.log('[KeywordScrape] No active watchlist targets found.');
    } else {
        console.log(
            `📡 [WatchlistScrape] Found ${activeTargets.length} active LinkedIn target(s). Enqueueing jobs...`
        );

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

    console.log('✔ [KeywordScrape] Auto-scrape producer finished enqueueing jobs.');
    return { keywords: activeKeywords.length, targets: activeTargets.length };
}
