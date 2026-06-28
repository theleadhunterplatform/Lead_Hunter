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

    if (activeKeywords.length === 0) {
        console.log(`📡 [KeywordScrape] Platform "${platform}": no active keywords configured — skipping`);
        return { platform, keywords: 0 };
    }

    console.log(
        `📡 [KeywordScrape] Platform "${platform}": queuing ${activeKeywords.length} keyword job(s)`
    );

    for (const kw of activeKeywords) {
        console.log(`  + [${platform}] "${kw.text}" (keywordId=${kw._id})`);
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

async function queueKeywordScrape(keyword: { _id?: string; id?: string; text: string; platforms?: string[] }) {
    const keywordId = keyword._id || keyword.id;
    const platforms = KEYWORD_SCRAPE_PLATFORMS.filter((platform) =>
        (keyword.platforms || []).includes(platform)
    );

    for (const platform of platforms) {
        console.log(`📡 [KeywordScrape] Single keyword "${keyword.text}" → platform: ${platform}`);
        await scraperQueue.add(
            `manual-scrape-${platform}-${keywordId}`,
            {
                keywordId,
                platform,
                keywordText: keyword.text,
            },
            { removeOnComplete: true }
        );
    }

    return platforms;
}

// @desc    Trigger scrape for one keyword
// @route   POST /api/scrapers/keyword/:keywordId
// @access  Private/Admin
export const triggerKeywordScrape = asyncHandler(async (req: Request, res: Response) => {
    const kw = await Keyword.findOne({ _id: req.params.keywordId, is_deleted: false });

    if (!kw) {
        return res.status(404).json({ success: false, message: 'Keyword not found' });
    }

    if (!kw.is_active) {
        return res.status(400).json({ success: false, message: 'Keyword is paused — activate it before scraping' });
    }

    const platforms = await queueKeywordScrape(kw);

    if (platforms.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Enable LinkedIn on this keyword to scrape it',
        });
    }

    return res.status(200).json({
        success: true,
        message: `Scraping queued for "${kw.text}" on ${platforms.join(', ')}`,
        data: { keywordId: kw._id || kw.id, platforms },
    });
});

// @desc    Trigger Scrapers manually for a platform
// @route   POST /api/scrapers/:platform
// @access  Private/Admin
const triggerScraper = async (platform: string, res: Response) => {
    console.log(`📡 [KeywordScrape] Manual trigger requested for platform: ${platform}`);
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
    const platformList = KEYWORD_SCRAPE_PLATFORMS.join(', ');
    console.log(
        `📡 [KeywordScrape] Scrape-all requested — keyword platforms: [${platformList}] (manual scrape-all is LinkedIn-only)`
    );

    const results = await Promise.all(
        KEYWORD_SCRAPE_PLATFORMS.map((platform) => queuePlatformScrape(platform))
    );
    const totalJobs = results.reduce((sum, r) => sum + r.keywords, 0);
    const summary = results
        .filter((r) => r.keywords > 0)
        .map((r) => `${r.platform}: ${r.keywords}`)
        .join(', ');

    console.log(
        totalJobs === 0
            ? '📡 [KeywordScrape] Scrape-all finished — no jobs queued'
            : `📡 [KeywordScrape] Scrape-all finished — ${totalJobs} job(s) queued (${summary})`
    );

    return res.status(200).json({
        success: true,
        message: totalJobs === 0
            ? 'No active keywords found for any platform'
            : `Scraping queued for ${totalJobs} keyword job(s) on: ${summary || platformList}`,
        data: { totalJobs, platforms: results, scrape_platforms: [...KEYWORD_SCRAPE_PLATFORMS] },
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
