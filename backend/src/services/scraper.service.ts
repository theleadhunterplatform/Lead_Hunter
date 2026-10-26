import LeadPost from '../models/lead-post.model';
import Keyword from '../models/keyword.model';
import config from '../config';
import { getApifyClient, handleApifyLimitError, recordApifyCommentUsage } from '../utils/apify-client.utils';
import { enqueueLeadQualification } from '../utils/qualification-queue.utils';
import { findExistingLeadPost, isDuplicateKeyError } from '../utils/lead-dedup.utils';
import { shouldIngestScrapedPost } from '../utils/scraped-post-gate.utils';
import { splitKeywordPhrases } from '../utils/keyword-phrases.utils';
import {
    extractScrapedContent,
    extractScrapedPostId,
    extractScrapedUrl,
    extractScrapedPostedAt,
    extractScrapedEngagement,
    isPostOlderThanDays,
} from '../utils/scraped-item.utils';
import { extractEmailFromText, extractPhoneFromText } from '../utils/lead-enrichment.utils';

import { ScrapedogScraperService } from './scrapedog-scraper.service';
import { CrawlbaseScraperService } from './crawlbase-scraper.service';
import { ScrapingBeeScraperService } from './scrapingbee-scraper.service';
import { ZenRowsScraperService } from './zenrows-scraper.service';
import { ZyteScraperService } from './zyte-scraper.service';
import * as settingService from './setting.service';
import { recordScrapeExecution, getLatestScrapeMetrics } from '../utils/scraper-tool.utils';

export class ScraperService {
    static async getLastScrapeMetrics() {
        return getLatestScrapeMetrics();
    }

    static async scrapeKeyword(keywordId: string, platform: string) {
        const kw = await Keyword.findById(keywordId);
        if (!kw) throw new Error(`Keyword ${keywordId} not found`);

        const phrases = splitKeywordPhrases(kw.text);
        if (phrases.length === 0) {
            console.warn(`[ScraperService] Keyword ${keywordId} has no usable search phrases`);
            return;
        }

        if (phrases.length > 1) {
            console.log(
                `[ScraperService] Split keyword into ${phrases.length} phrases for ${platform}`
            );
        }

        for (const phrase of phrases) {
            await this.scrapePhrase(platform, phrase, kw);
        }
    }

    private static async resolveEnginePlan(): Promise<string[]> {
        let primary = config.scraper?.primaryEngine || 'apify';
        let fallbacks = config.scraper?.fallbackEngines ? [...config.scraper.fallbackEngines] : ['scrapedog', 'crawlbase'];
        let paused: string[] = [];

        try {
            const dbPrimary = await settingService.getSetting('primary_scraper_engine');
            if (dbPrimary && typeof dbPrimary === 'string' && dbPrimary.trim()) {
                primary = dbPrimary.trim().toLowerCase();
            }
            const dbFallbacks = await settingService.getSetting('fallback_scraper_engines');
            if (Array.isArray(dbFallbacks) && dbFallbacks.length > 0) {
                fallbacks = dbFallbacks.map((f: any) => String(f).trim().toLowerCase()).filter(Boolean);
            }
            const dbPaused = await settingService.getSetting('paused_scraper_engines');
            if (Array.isArray(dbPaused)) {
                paused = dbPaused.map((p: any) => String(p).trim().toLowerCase()).filter(Boolean);
            }
        } catch {
            // keep config defaults
        }

        const plan = [primary, ...fallbacks.filter((f) => f !== primary)];
        const uniquePlan = Array.from(new Set(plan));
        const activePlan = uniquePlan.filter((engine) => !paused.includes(engine));

        if (activePlan.length === 0 && paused.length > 0) {
            console.warn(`⚠️ [ScraperService] All configured scraping engines are currently paused: [${paused.join(', ')}]`);
        }

        return activePlan;
    }

    private static async scrapeWithApify(platform: string, phrase: string): Promise<any[]> {
        const { client, activeKey } = await getApifyClient();
        try {
            let items: any[] = [];
            if (platform === 'linkedin') {
                const run = await client.actor(config.apify.linkedinActor).call({
                    maxPosts: 20,
                    postedLimit: '24h',
                    searchQueries: [phrase],
                    sortBy: 'date',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items || [];
            } else if (platform === 'twitter') {
                const run = await client.actor('watcher.data/search-x-by-keywords').call({
                    keywords: [phrase],
                    maxItemsPerKeyword: 20,
                    searchType: 'tweets',
                    sortBy: 'latest',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items || [];
            } else if (platform === 'reddit') {
                const run = await client.actor('practicaltools/apify-reddit-api').call({
                    maxItems: 20,
                    searches: [phrase],
                    sort: 'new',
                    time: 'day',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items || [];
            } else if (platform === 'threads') {
                const run = await client.actor('watcher.data/search-threads-by-keywords').call({
                    keywords: [phrase],
                    maxItemsPerKeyword: 20,
                    sortBy: 'latest',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items || [];
            }

            if (items.length > 0 && activeKey) {
                await recordApifyCommentUsage(activeKey, items.length);
            }
            return items;
        } catch (error: any) {
            await handleApifyLimitError(error, activeKey);
            throw error;
        }
    }

    private static async scrapePhrase(platform: string, phrase: string, kw: any) {
        console.log(`🚀 [ScraperService] Processing ${platform} for keyword: "${phrase}"`);

        const engines = await this.resolveEnginePlan();
        let items: any[] = [];
        let successEngine = '';
        const errors: string[] = [];

        for (const engine of engines) {
            try {
                if (engine === 'apify') {
                    console.log(`[ScraperService] Attempting Apify for "${phrase}" on ${platform}...`);
                    items = await this.scrapeWithApify(platform, phrase);
                    successEngine = 'apify';
                } else if (engine === 'scrapedog') {
                    const isConfigured = await ScrapedogScraperService.isConfigured();
                    if (!isConfigured) {
                        console.log(`[ScraperService] Scrapedog not configured, skipping.`);
                        continue;
                    }
                    console.log(`[ScraperService] Attempting Scrapedog for "${phrase}" on ${platform}...`);
                    items = await ScrapedogScraperService.scrapeKeyword(platform, phrase);
                    successEngine = 'scrapedog';
                } else if (engine === 'crawlbase') {
                    const isConfigured = await CrawlbaseScraperService.isConfigured();
                    if (!isConfigured) {
                        console.log(`[ScraperService] Crawlbase not configured, skipping.`);
                        continue;
                    }
                    console.log(`[ScraperService] Attempting Crawlbase for "${phrase}" on ${platform}...`);
                    items = await CrawlbaseScraperService.scrapeKeyword(platform, phrase);
                    successEngine = 'crawlbase';
                } else if (engine === 'scrapingbee') {
                    const isConfigured = await ScrapingBeeScraperService.isConfigured();
                    if (!isConfigured) {
                        console.log(`[ScraperService] ScrapingBee not configured, skipping.`);
                        continue;
                    }
                    console.log(`[ScraperService] Attempting ScrapingBee for "${phrase}" on ${platform}...`);
                    items = await ScrapingBeeScraperService.scrapeKeyword(platform, phrase);
                    successEngine = 'scrapingbee';
                } else if (engine === 'zenrows') {
                    const isConfigured = await ZenRowsScraperService.isConfigured();
                    if (!isConfigured) {
                        console.log(`[ScraperService] ZenRows not configured, skipping.`);
                        continue;
                    }
                    console.log(`[ScraperService] Attempting ZenRows for "${phrase}" on ${platform}...`);
                    items = await ZenRowsScraperService.scrapeKeyword(platform, phrase);
                    successEngine = 'zenrows';
                } else if (engine === 'zyte') {
                    const isConfigured = await ZyteScraperService.isConfigured();
                    if (!isConfigured) {
                        console.log(`[ScraperService] Zyte not configured, skipping.`);
                        continue;
                    }
                    console.log(`[ScraperService] Attempting Zyte for "${phrase}" on ${platform}...`);
                    items = await ZyteScraperService.scrapeKeyword(platform, phrase);
                    successEngine = 'zyte';
                }

                if (items && items.length >= 0) {
                    console.log(`✔ [ScraperService] Successfully retrieved ${items.length} items via ${successEngine}`);
                    break;
                }
            } catch (err: any) {
                console.warn(`⚠️ [ScraperService] Engine "${engine}" failed for "${phrase}" on ${platform}: ${err.message}`);
                errors.push(`${engine}: ${err.message}`);
            }
        }

        if (!successEngine && errors.length > 0) {
            await recordScrapeExecution(engines[0] || 'apify', platform, phrase, 0, 'error', errors.join(' | '));
            throw new Error(`All scraper engines failed for ${platform} "${phrase}": ${errors.join(' | ')}`);
        }

        const activeEngine = successEngine || 'apify';
        await recordScrapeExecution(activeEngine, platform, phrase, items.length, 'success');

        console.log(`[ScraperService] Found ${items.length} items for ${platform}: "${phrase}" (via ${activeEngine})`);

        let skipped = 0;
        let saved = 0;
        for (const item of items) {
            const ingested = await this.processScrapedItem(item, platform, kw, phrase, activeEngine);
            if (!ingested) skipped += 1;
            else saved += 1;
        }

        if (skipped > 0) {
            console.log(
                `[ScraperService] "${phrase}" on ${platform}: saved ${saved}, skipped ${skipped}/${items.length}`
            );
        }
    }

    private static async processScrapedItem(
        item: any,
        platform: string,
        kw: any,
        phrase: string,
        engine = 'apify'
    ): Promise<boolean> {
        const post_id = extractScrapedPostId(item, platform);
        if (!post_id) return false;

        // Age filter: skip posts older than 2 days (48 hours)
        if (isPostOlderThanDays(item, platform, 2)) {
            console.log(`⏭️ [ScraperService] Skip ${platform}/${post_id}: older than 2 days`);
            return false;
        }

        const content = extractScrapedContent(item, platform);
        const gate = shouldIngestScrapedPost(content || '', phrase, platform);
        if (!gate.ok) {
            console.log(`⏭️ [ScraperService] Skip ${platform}/${post_id}: ${gate.reason}`);
            return false;
        }

        const engagement = extractScrapedEngagement(item, platform);
        // Saturated post filter: Skip posts where competition is oversaturated (>100 comments)
        if (engagement.comments > 100) {
            console.log(`⏭️ [ScraperService] Skip ${platform}/${post_id}: oversaturated (${engagement.comments} comments)`);
            return false;
        }

        const url = extractScrapedUrl(item, platform);
        const existingPost = await findExistingLeadPost({
            post_id,
            platform,
            url,
            content,
        });
        if (existingPost) return false;

        const emailInContent = extractEmailFromText(content);
        const phoneInContent = extractPhoneFromText(content);

        const raw_result = {
            ...(item || {}),
            _scraper_engine: engine,
        };

        const newPostData: any = {
            post_id,
            platform,
            keyword: phrase,
            keyword_id: kw._id,
            status: 'pending',
            raw_result,
            scraper_engine: engine,
            url,
            content,
            engagement,
            posted_at: extractScrapedPostedAt(item, platform),
            ...(emailInContent ? {
                email: emailInContent,
                email_source: 'post_text',
                email_status: 'verified',
            } : {}),
            ...(phoneInContent ? {
                phone: phoneInContent,
                phone_source: 'post_text',
            } : {}),
            contact_info: {
                scraper_engine: engine,
                ...(emailInContent ? { emails: [{ email: emailInContent, source: 'post_text', status: 'verified' }] } : {}),
                ...(phoneInContent ? { phone_numbers: [{ number: phoneInContent, source: 'post_text' }] } : {}),
            },
            ...(emailInContent || phoneInContent ? { enrichment_status: 'found' } : {}),
        };

        if (platform === 'linkedin') {
            const authorObj = typeof item.author === 'object' && item.author !== null ? item.author : {};
            const rawName = authorObj.name || (typeof item.author === 'string' ? item.author : undefined);
            const finalName = typeof rawName === 'object' && rawName !== null ? (rawName.name || 'Unknown') : (rawName || 'Unknown');
            newPostData.author = {
                name: String(finalName || 'Unknown'),
                url: authorObj.linkedinUrl || item.authorUrl,
                publicIdentifier: authorObj.publicIdentifier,
                info: authorObj.info,
                website: authorObj.website,
            };
        } else if (platform === 'twitter') {
            const rawAuthor = item.author;
            const authorName = typeof rawAuthor === 'object' && rawAuthor !== null
                ? (rawAuthor.name || rawAuthor.handle || '')
                : (item.author_name || item.authorName || rawAuthor || '');
            const rawHandle = item.authorUsername || item.userName || (typeof rawAuthor === 'object' ? rawAuthor?.handle : rawAuthor) || '';
            const handle = typeof rawHandle === 'string' ? rawHandle.replace(/^@/, '') : '';
            const finalName = typeof authorName === 'object' && authorName !== null ? (authorName.name || 'Unknown') : (authorName || 'Unknown');
            newPostData.author = {
                name: String(finalName || 'Unknown'),
                handle: handle || undefined,
                url: handle ? `https://x.com/${handle}` : (typeof rawAuthor === 'object' ? rawAuthor?.url : undefined),
            };
        } else if (platform === 'reddit') {
            const rawAuthor = item.author;
            const authorName = typeof rawAuthor === 'object' && rawAuthor !== null
                ? (rawAuthor.name || rawAuthor.handle || '')
                : (item.username || rawAuthor || '');
            const finalName = typeof authorName === 'object' && authorName !== null ? (authorName.name || 'Unknown') : (authorName || 'Unknown');
            newPostData.author = {
                name: String(finalName || 'Unknown'),
                handle: String(finalName || 'Unknown'),
                url: finalName && finalName !== 'Unknown' ? `https://www.reddit.com/user/${finalName}` : (typeof rawAuthor === 'object' ? rawAuthor?.url : undefined),
            };
        } else if (platform === 'threads') {
            const rawAuthor = item.author;
            const handle = item.author_username || (typeof rawAuthor === 'object' ? rawAuthor?.handle : undefined);
            const authorName = typeof rawAuthor === 'object' && rawAuthor !== null
                ? (rawAuthor.name || handle || '')
                : (item.author_name || handle || '');
            const finalName = typeof authorName === 'object' && authorName !== null ? (authorName.name || 'Unknown') : (authorName || 'Unknown');
            newPostData.author = {
                name: String(finalName || 'Unknown'),
                handle: handle,
                url: handle ? `https://www.threads.net/@${String(handle).replace(/^@/, '')}` : (typeof rawAuthor === 'object' ? rawAuthor?.url : undefined),
            };
        }

        try {
            const saved = await LeadPost.create(newPostData, { throwOnDuplicate: true });
            if (saved?._id) {
                await enqueueLeadQualification(saved._id.toString());
            }
            console.log(`✨ [ScraperService] New ${platform} post saved: ${post_id}`);
            return true;
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
            return false;
        }
    }
}
