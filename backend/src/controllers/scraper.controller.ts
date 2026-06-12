import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import { scraperQueue } from '../queues';
import Keyword from '../models/keyword.model';
import prisma from '../lib/prisma';

// @desc    Trigger Scrapers manually for a platform
// @route   POST /api/scrapers/:platform
// @access  Private/Admin
const triggerScraper = async (platform: string, res: Response) => {
    const activeKeywords = await Keyword.find({
        is_active: true,
        is_deleted: false,
        platforms: platform
    });

    if (activeKeywords.length === 0) {
        return res.status(200).json({
            success: true,
            message: `No active keywords found for ${platform}`
        });
    }

    for (const kw of activeKeywords) {
        await scraperQueue.add(`manual-scrape-${platform}-${kw.text}`, {
            keywordId: kw._id,
            platform: platform,
            keywordText: kw.text
        }, {
            removeOnComplete: true
        });
    }

    return res.status(200).json({
        success: true,
        message: `${platform} scraper triggered for ${activeKeywords.length} keywords`
    });
};

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
