import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import { scraperQueue } from '../queues';
import Keyword from '../models/keyword.model';
import prisma from '../lib/prisma';

/** Keyword scrape: LinkedIn only — best buyer signal; social search is too noisy. */
const KEYWORD_SCRAPE_PLATFORMS = ['linkedin'] as const;

async function queuePlatformScrape(platform: string): Promise<{ platform: string; keywords: number }> {
    const activeKeywords = await Keyword.find({
        is_active: true,
        is_deleted: false,
        platforms: platform,
    });

    for (const kw of activeKeywords) {
        await scraperQueue.add(`manual-scrape-${platform}-${kw.text}`, {
            keywordId: kw._id,
            platform,
            keywordText: kw.text,
        }, {
            removeOnComplete: true,
        });
    }

    return { platform, keywords: activeKeywords.length };
}

// @desc    Trigger Scrapers manually for a platform
// @route   POST /api/scrapers/:platform
// @access  Private/Admin
const triggerScraper = async (platform: string, res: Response) => {
    const result = await queuePlatformScrape(platform);

    if (result.keywords === 0) {
        return res.status(200).json({
            success: true,
            message: `No active keywords found for ${platform}`,
        });
    }

    return res.status(200).json({
        success: true,
        message: `${platform} scraper triggered for ${result.keywords} keywords`,
    });
};

export const triggerAllScrapers = asyncHandler(async (_req: Request, res: Response) => {
    const results = await Promise.all(
        KEYWORD_SCRAPE_PLATFORMS.map((platform) => queuePlatformScrape(platform))
    );
    const totalJobs = results.reduce((sum, r) => sum + r.keywords, 0);
    const summary = results
        .filter((r) => r.keywords > 0)
        .map((r) => `${r.platform}: ${r.keywords}`)
        .join(', ');

    return res.status(200).json({
        success: true,
        message: totalJobs === 0
            ? 'No active keywords found for any platform'
            : `Scraping queued for ${totalJobs} keyword jobs (${summary || 'none'})`,
        data: { totalJobs, platforms: results },
    });
});

export const triggerLinkedIn = asyncHandler(async (_req: Request, res: Response) => {
    return triggerScraper('linkedin', res);
});

export const triggerLinkedInActivity = asyncHandler(async (_req: Request, res: Response) => {
    const activeTargets = await prisma.sourceProfile.findMany({
        where: { is_active: true, platform: 'linkedin' },
    });

    if (activeTargets.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No active watchlist targets found for LinkedIn activity scraping',
        });
    }

    for (const target of activeTargets) {
        await scraperQueue.add(`manual-scrape-target-${target.name}`, {
            type: 'target',
            targetId: target.id,
            targetName: target.name,
            targetUrl: target.url,
        }, {
            removeOnComplete: true,
        });
    }

    return res.status(200).json({
        success: true,
        message: `LinkedIn watchlist activity scraper triggered for ${activeTargets.length} targets`,
    });
});

export const triggerTwitter = asyncHandler(async (_req: Request, res: Response) => {
    return triggerScraper('twitter', res);
});

export const triggerReddit = asyncHandler(async (_req: Request, res: Response) => {
    return triggerScraper('reddit', res);
});

export const triggerThreads = asyncHandler(async (_req: Request, res: Response) => {
    return triggerScraper('threads', res);
});
