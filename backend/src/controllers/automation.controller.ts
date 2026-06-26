import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import * as settingService from '../services/setting.service';
import { runScraperProducerJob } from '../services/scraper-producer.service';
import {
    AUTO_ENRICHMENT_KEY,
    AUTO_SCRAPE_KEY,
    isAutoEnrichmentEnabled,
    isAutoScrapeEnabled,
} from '../utils/automation-settings.utils';

export const getAutomationSettings = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        data: {
            auto_scrape_enabled: await isAutoScrapeEnabled(),
            auto_enrichment_enabled: await isAutoEnrichmentEnabled(),
            scrape_interval_minutes: 30,
        },
    });
});

export const updateAutomationSettings = asyncHandler(async (req: Request, res: Response) => {
    const { auto_scrape_enabled, auto_enrichment_enabled } = req.body ?? {};
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

    return res.status(200).json({
        success: true,
        data: {
            auto_scrape_enabled: await isAutoScrapeEnabled(),
            auto_enrichment_enabled: await isAutoEnrichmentEnabled(),
            scrape_interval_minutes: 30,
            scrape_triggered: scrapeTriggered,
        },
        message: scrapeTriggered
            ? 'Auto-scrape enabled. A scrape run was started immediately.'
            : 'Automation settings updated.',
    });
});
