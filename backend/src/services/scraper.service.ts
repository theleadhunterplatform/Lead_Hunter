import LeadPost from '../models/lead-post.model';
import Keyword from '../models/keyword.model';
import config from '../config';
import { getApifyClient, handleApifyLimitError } from '../utils/apify-client.utils';
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
import * as settingService from './setting.service';

export class ScraperService {
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

        try {
            const dbPrimary = await settingService.getSetting('primary_scraper_engine');
            if (dbPrimary && typeof dbPrimary === 'string' && dbPrimary.trim()) {
                primary = dbPrimary.trim().toLowerCase();
            }
            const dbFallbacks = await settingService.getSetting('fallback_scraper_engines');
            if (Array.isArray(dbFallbacks) && dbFallbacks.length > 0) {
                fallbacks = dbFallbacks.map((f: any) => String(f).trim().toLowerCase()).filter(Boolean);
            }
        } catch {
            // keep config defaults
        }

        const plan = [primary, ...fallbacks.filter((f) => f !== primary)];
        return Array.from(new Set(plan));
    }

    private static async scrapeWithApify(platform: string, phrase: string): Promise<any[]> {
        const { client, activeKey } = await getApifyClient();
        try {
            if (platform === 'linkedin') {
                const run = await client.actor(config.apify.linkedinActor).call({
                    maxPosts: 20,
                    postedLimit: '24h',
                    searchQueries: [phrase],
                    sortBy: 'date',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                return result.items || [];
            } else if (platform === 'twitter') {
                const run = await client.actor('watcher.data/search-x-by-keywords').call({
                    keywords: [phrase],
                    maxItemsPerKeyword: 20,
                    searchType: 'tweets',
                    sortBy: 'latest',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                return result.items || [];
            } else if (platform === 'reddit') {
                const run = await client.actor('practicaltools/apify-reddit-api').call({
                    maxItems: 20,
                    searches: [phrase],
                    sort: 'new',
                    time: 'day',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                return result.items || [];
            } else if (platform === 'threads') {
                const run = await client.actor('watcher.data/search-threads-by-keywords').call({
                    keywords: [phrase],
                    maxItemsPerKeyword: 20,
                    sortBy: 'latest',
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                return result.items || [];
            }
            return [];
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
            throw new Error(`All scraper engines failed for ${platform} "${phrase}": ${errors.join(' | ')}`);
        }

        console.log(`[ScraperService] Found ${items.length} items for ${platform}: "${phrase}" (via ${successEngine || 'none'})`);

        let skipped = 0;
        let saved = 0;
        for (const item of items) {
            const ingested = await this.processScrapedItem(item, platform, kw, phrase);
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
        phrase: string
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

        const newPostData: any = {
            post_id,
            platform,
            keyword: phrase,
            keyword_id: kw._id,
            status: 'pending',
            raw_result: item,
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
                ...(emailInContent ? { emails: [{ email: emailInContent, source: 'post_text', status: 'verified' }] } : {}),
                ...(phoneInContent ? { phone_numbers: [{ number: phoneInContent, source: 'post_text' }] } : {}),
            },
            ...(emailInContent || phoneInContent ? { enrichment_status: 'found' } : {}),
        };

        if (platform === 'linkedin') {
            newPostData.author = {
                name: item.author?.name,
                url: item.author?.linkedinUrl,
                publicIdentifier: item.author?.publicIdentifier,
                info: item.author?.info,
                website: item.author?.website,
            };
        } else if (platform === 'twitter') {
            const handle = (item.author || item.authorUsername || item.userName || '').replace(/^@/, '');
            newPostData.author = {
                name: item.author_name || item.authorName || item.author?.name || item.author,
                handle: item.author || item.authorUsername || item.userName,
                url: handle ? `https://x.com/${handle}` : undefined,
            };
        } else if (platform === 'reddit') {
            const username = item.username || item.author;
            newPostData.author = {
                name: username,
                handle: username,
                url: username ? `https://www.reddit.com/user/${username}` : undefined,
            };
        } else if (platform === 'threads') {
            const handle = item.author_username;
            newPostData.author = {
                name: item.author_name || item.author_username,
                handle: item.author_username,
                url: handle ? `https://www.threads.net/@${handle.replace(/^@/, '')}` : undefined,
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
