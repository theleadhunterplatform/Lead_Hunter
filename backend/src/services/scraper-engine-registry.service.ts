import config from '../config';
import { getSetting } from './setting.service';
import { ScrapedogScraperService, NormalizedScrapedItem } from './scrapedog-scraper.service';
import { CrawlbaseScraperService } from './crawlbase-scraper.service';
import { ScrapingBeeScraperService } from './scrapingbee-scraper.service';
import { ZenRowsScraperService } from './zenrows-scraper.service';
import { ZyteScraperService } from './zyte-scraper.service';
import { HunterCrawlerService } from './hunter-crawler.service';

export interface ScraperEngineAdapter {
    isConfigured: () => Promise<boolean>;
    scrapeKeyword: (platform: string, phrase: string) => Promise<NormalizedScrapedItem[]>;
    scrapeTargetProfile: (target: any) => Promise<NormalizedScrapedItem[]>;
}

export const SCRAPER_ENGINE_REGISTRY: Record<string, ScraperEngineAdapter> = {
    scrapedog: {
        isConfigured: () => ScrapedogScraperService.isConfigured(),
        scrapeKeyword: (platform, phrase) => ScrapedogScraperService.scrapeKeyword(platform, phrase),
        scrapeTargetProfile: (target) => ScrapedogScraperService.scrapeTargetProfile(target),
    },
    crawlbase: {
        isConfigured: () => CrawlbaseScraperService.isConfigured(),
        scrapeKeyword: (platform, phrase) => CrawlbaseScraperService.scrapeKeyword(platform, phrase),
        scrapeTargetProfile: (target) => CrawlbaseScraperService.scrapeTargetProfile(target),
    },
    scrapingbee: {
        isConfigured: () => ScrapingBeeScraperService.isConfigured(),
        scrapeKeyword: (platform, phrase) => ScrapingBeeScraperService.scrapeKeyword(platform, phrase),
        scrapeTargetProfile: (target) => ScrapingBeeScraperService.scrapeTargetProfile(target),
    },
    zenrows: {
        isConfigured: () => ZenRowsScraperService.isConfigured(),
        scrapeKeyword: (platform, phrase) => ZenRowsScraperService.scrapeKeyword(platform, phrase),
        scrapeTargetProfile: (target) => ZenRowsScraperService.scrapeTargetProfile(target),
    },
    zyte: {
        isConfigured: () => ZyteScraperService.isConfigured(),
        scrapeKeyword: (platform, phrase) => ZyteScraperService.scrapeKeyword(platform, phrase),
        scrapeTargetProfile: (target) => ZyteScraperService.scrapeTargetProfile(target),
    },
    hunter_crawler: {
        isConfigured: () => HunterCrawlerService.isConfigured(),
        scrapeKeyword: (platform, phrase) => HunterCrawlerService.scrapeKeyword(platform, phrase),
        scrapeTargetProfile: (target) => HunterCrawlerService.scrapeTargetProfile(target),
    },
};

/**
 * Resolves the ordered, deduplicated, and unpaused list of active scraper engines.
 */
export async function resolveScraperEnginePlan(): Promise<string[]> {
    let primary = config.scraper?.primaryEngine || 'apify';
    let fallbacks = config.scraper?.fallbackEngines ? [...config.scraper.fallbackEngines] : ['scrapedog', 'crawlbase'];
    let paused: string[] = [];

    try {
        const dbPrimary = await getSetting('primary_scraper_engine');
        if (dbPrimary && typeof dbPrimary === 'string' && dbPrimary.trim()) {
            primary = dbPrimary.trim().toLowerCase();
        }
        const dbFallbacks = await getSetting('fallback_scraper_engines');
        if (Array.isArray(dbFallbacks) && dbFallbacks.length > 0) {
            fallbacks = dbFallbacks.map((f: any) => String(f).trim().toLowerCase()).filter(Boolean);
        }
        const dbPaused = await getSetting('paused_scraper_engines');
        if (Array.isArray(dbPaused)) {
            paused = dbPaused.map((p: any) => String(p).trim().toLowerCase()).filter(Boolean);
        }
    } catch {
        // keep defaults
    }

    const plan = [primary, ...fallbacks.filter((f) => f !== primary)];
    const uniquePlan = Array.from(new Set(plan));
    return uniquePlan.filter((engine) => !paused.includes(engine));
}
