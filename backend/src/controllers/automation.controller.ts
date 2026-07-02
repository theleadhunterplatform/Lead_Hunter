import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import * as settingService from '../services/setting.service';
import { runScraperProducerJob } from '../services/scraper-producer.service';
import {
    AUTO_ENRICHMENT_KEY,
    AUTO_SCRAPE_KEY,
    KEEP_ALIVE_KEY,
    isAutoEnrichmentEnabled,
    isAutoScrapeEnabled,
    isKeepAliveEnabled,
} from '../utils/automation-settings.utils';
import { isKeepAliveConfigured, pingKeepAliveUrls } from '../services/keep-alive.service';
import config from '../config';
import { isEmailConfigured } from '../utils/email.service';

export const getIntelligenceSettings = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        data: {
            is_configured: Boolean(config.openRouter.apiKey?.trim()),
            model: config.openRouter.intelModel,
        },
    });
});

export const getEmailSettings = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        data: {
            is_configured: isEmailConfigured(),
            from: config.email.from,
        },
    });
});

export const getAutomationSettings = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        data: {
            auto_scrape_enabled: await isAutoScrapeEnabled(),
            auto_enrichment_enabled: await isAutoEnrichmentEnabled(),
            keep_alive_enabled: await isKeepAliveEnabled(),
            keep_alive_configured: isKeepAliveConfigured(),
            scrape_interval_minutes: 30,
            keep_alive_interval_minutes: 10,
        },
    });
});

export const updateAutomationSettings = asyncHandler(async (req: Request, res: Response) => {
    const { auto_scrape_enabled, auto_enrichment_enabled, keep_alive_enabled } = req.body ?? {};
    let scrapeTriggered = false;

    if (typeof auto_scrape_enabled === 'boolean') {
        await settingService.updateSetting(
            AUTO_SCRAPE_KEY,
            auto_scrape_enabled,
            'Auto-scrape active keywords and watchlist every 30 minutes'
        );

        if (auto_scrape_enabled) {
            runScraperProducerJob().catch((err) =>
                console.error('[Automation] Immediate scrape failed:', err.message)
            );
            scrapeTriggered = true;
        }
    }

    if (typeof auto_enrichment_enabled === 'boolean') {
        await settingService.updateSetting(
            AUTO_ENRICHMENT_KEY,
            auto_enrichment_enabled,
            'Automatically find contacts when a lead is marked relevant'
        );
    }

    if (typeof keep_alive_enabled === 'boolean') {
        await settingService.updateSetting(
            KEEP_ALIVE_KEY,
            keep_alive_enabled,
            'Ping Render services every 10 minutes to prevent idle sleep'
        );

        if (keep_alive_enabled && isKeepAliveConfigured()) {
            pingKeepAliveUrls().catch((err) =>
                console.error('[Automation] Immediate keep-alive ping failed:', err.message)
            );
        }
    }

    return res.status(200).json({
        success: true,
        data: {
            auto_scrape_enabled: await isAutoScrapeEnabled(),
            auto_enrichment_enabled: await isAutoEnrichmentEnabled(),
            keep_alive_enabled: await isKeepAliveEnabled(),
            keep_alive_configured: isKeepAliveConfigured(),
            scrape_interval_minutes: 30,
            keep_alive_interval_minutes: 10,
            scrape_triggered: scrapeTriggered,
        },
        message: scrapeTriggered
            ? 'Auto-scrape enabled. A scrape run was started immediately.'
            : 'Automation settings updated.',
    });
});
