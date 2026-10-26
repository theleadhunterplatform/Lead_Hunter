import prisma from '../lib/prisma';
import * as settingService from '../services/setting.service';

export interface EngineScrapeMetric {
    last_scraped_at: string | null;
    last_platform?: string | null;
    last_keyword?: string | null;
    items_found?: number;
    status?: 'success' | 'idle' | 'running' | 'error';
    error?: string | null;
}

export interface LastScrapeMetrics {
    last_scraped_at: string | null;
    last_engine: string | null;
    last_platform: string | null;
    last_target_or_keyword: string | null;
    engines: {
        apify: EngineScrapeMetric;
        scrapedog: EngineScrapeMetric;
        crawlbase: EngineScrapeMetric;
    };
}

/**
 * Resolves the scraping tool used for a lead post.
 * Checks explicit fields first, then falls back based on metadata/source.
 */
export function resolveScraperEngine(post: any): string {
    if (!post) return 'apify';
    if (post.scraper_engine) return post.scraper_engine.toLowerCase().trim();
    if (post.contact_info?.scraper_engine) return String(post.contact_info.scraper_engine).toLowerCase().trim();
    if (post.raw_result?._scraper_engine) return String(post.raw_result._scraper_engine).toLowerCase().trim();
    if (post.raw_result?.scraper_engine) return String(post.raw_result.scraper_engine).toLowerCase().trim();
    if (post.source_type === 'watchlist' || post.source_profile) return 'apify';
    if (post.raw_result?.source === 'scrapedog' || post.raw_result?.engine === 'scrapedog') return 'scrapedog';
    if (post.raw_result?.source === 'crawlbase' || post.raw_result?.engine === 'crawlbase') return 'crawlbase';
    if (post.source === 'manual') return 'manual';
    if (post.source === 'seed') return 'mock';
    return 'apify';
}

/**
 * Persists an execution event for a scraping engine and updates overall last scrape time.
 */
export async function recordScrapeExecution(
    engine: string,
    platform: string,
    targetOrKeyword: string,
    itemsFound = 0,
    status: 'success' | 'running' | 'error' = 'success',
    error?: string
): Promise<void> {
    try {
        const normalizedEngine = (engine || 'apify').toLowerCase().trim();
        const nowIso = new Date().toISOString();

        const currentMetrics: LastScrapeMetrics = (await settingService.getSetting('last_scrape_metrics')) || {
            last_scraped_at: null,
            last_engine: null,
            last_platform: null,
            last_target_or_keyword: null,
            engines: {
                apify: { last_scraped_at: null },
                scrapedog: { last_scraped_at: null },
                crawlbase: { last_scraped_at: null },
            },
        };

        const engineMap = currentMetrics.engines || ({} as any);

        const updatedMetric: EngineScrapeMetric = {
            last_scraped_at: nowIso,
            last_platform: platform,
            last_keyword: targetOrKeyword,
            items_found: itemsFound,
            status,
            error: error || null,
        };

        if (normalizedEngine === 'scrapedog' || normalizedEngine === 'scrapingdog') {
            engineMap.scrapedog = updatedMetric;
        } else if (normalizedEngine === 'crawlbase') {
            engineMap.crawlbase = updatedMetric;
        } else {
            engineMap.apify = updatedMetric;
        }

        const newMetrics: LastScrapeMetrics = {
            last_scraped_at: nowIso,
            last_engine: normalizedEngine,
            last_platform: platform,
            last_target_or_keyword: targetOrKeyword,
            engines: engineMap,
        };

        await settingService.updateSetting('last_scrape_metrics', newMetrics, 'Last scrape execution metrics');
    } catch (err: any) {
        console.warn('⚠️ [ScraperTool] Failed to record scrape execution metric:', err.message);
    }
}

/**
 * Retrieves the latest scrape timing, automatically reconciling with the newest
 * lead_posts or source_profiles in the database if no recent metric exists.
 */
export async function getLatestScrapeMetrics(): Promise<LastScrapeMetrics> {
    let metrics: LastScrapeMetrics | null = null;
    try {
        metrics = await settingService.getSetting('last_scrape_metrics');
    } catch {
        // fallback to database queries
    }

    const defaultMetrics: LastScrapeMetrics = metrics || {
        last_scraped_at: null,
        last_engine: null,
        last_platform: null,
        last_target_or_keyword: null,
        engines: {
            apify: { last_scraped_at: null },
            scrapedog: { last_scraped_at: null },
            crawlbase: { last_scraped_at: null },
        },
    };

    // Reconcile with latest database records
    try {
        const [latestLead, latestProfile] = await Promise.all([
            prisma.leadPost.findFirst({
                where: {
                    is_deleted: false,
                    source: { notIn: ['manual', 'seed'] },
                },
                orderBy: { created_at: 'desc' },
                select: {
                    created_at: true,
                    platform: true,
                    keyword: true,
                    source: true,
                    source_type: true,
                    raw_result: true,
                    contact_info: true,
                },
            }),
            prisma.sourceProfile.findFirst({
                where: { last_scraped_at: { not: null } },
                orderBy: { last_scraped_at: 'desc' },
                select: { last_scraped_at: true, name: true, platform: true },
            }),
        ]);

        const leadTs = latestLead?.created_at ? new Date(latestLead.created_at).getTime() : 0;
        const profileTs = latestProfile?.last_scraped_at ? new Date(latestProfile.last_scraped_at).getTime() : 0;
        const recordedTs = defaultMetrics.last_scraped_at ? new Date(defaultMetrics.last_scraped_at).getTime() : 0;

        const maxDbTs = Math.max(leadTs, profileTs);

        if (maxDbTs > recordedTs) {
            const isLeadNewer = leadTs >= profileTs;
            const newIso = new Date(maxDbTs).toISOString();

            if (isLeadNewer && latestLead) {
                const detectedEngine = resolveScraperEngine(latestLead);
                defaultMetrics.last_scraped_at = newIso;
                defaultMetrics.last_engine = detectedEngine;
                defaultMetrics.last_platform = latestLead.platform;
                defaultMetrics.last_target_or_keyword = latestLead.keyword;

                if (detectedEngine === 'scrapedog' && !defaultMetrics.engines.scrapedog.last_scraped_at) {
                    defaultMetrics.engines.scrapedog.last_scraped_at = newIso;
                } else if (detectedEngine === 'crawlbase' && !defaultMetrics.engines.crawlbase.last_scraped_at) {
                    defaultMetrics.engines.crawlbase.last_scraped_at = newIso;
                } else if (!defaultMetrics.engines.apify.last_scraped_at) {
                    defaultMetrics.engines.apify.last_scraped_at = newIso;
                }
            } else if (latestProfile) {
                defaultMetrics.last_scraped_at = newIso;
                defaultMetrics.last_engine = 'apify';
                defaultMetrics.last_platform = latestProfile.platform || 'linkedin';
                defaultMetrics.last_target_or_keyword = `watchlist:${latestProfile.name}`;
                if (!defaultMetrics.engines.apify.last_scraped_at) {
                    defaultMetrics.engines.apify.last_scraped_at = newIso;
                }
            }
        }
    } catch (err: any) {
        console.warn('⚠️ [ScraperTool] Failed to reconcile latest scrape from DB:', err.message);
    }

    return defaultMetrics;
}
