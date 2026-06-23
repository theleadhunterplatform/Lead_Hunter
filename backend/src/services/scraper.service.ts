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
} from '../utils/scraped-item.utils';

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

        const { client, activeKey } = await getApifyClient();

        try {
            for (const phrase of phrases) {
                await this.scrapePhrase(client, platform, phrase, kw);
            }
        } catch (error: any) {
            await handleApifyLimitError(error, activeKey);
            console.error(`❌ Error in ScraperService (${platform}):`, error.message);
            throw error;
        }
    }

    private static async scrapePhrase(client: any, platform: string, phrase: string, kw: any) {
        console.log(`🚀 [ScraperService] Processing ${platform} for keyword: "${phrase}"`);

        let items: any[] = [];

        if (platform === 'linkedin') {
            const run = await client.actor(config.apify.linkedinActor).call({
                maxPosts: 20,
                postedLimit: '24h',
                searchQueries: [phrase],
                sortBy: 'date',
            });
            const result = await client.dataset(run.defaultDatasetId).listItems();
            items = result.items;
        } else if (platform === 'twitter') {
            const run = await client.actor('watcher.data/search-x-by-keywords').call({
                keywords: [phrase],
                maxItemsPerKeyword: 20,
                searchType: 'tweets',
                sortBy: 'latest',
            });
            const result = await client.dataset(run.defaultDatasetId).listItems();
            items = result.items;
        } else if (platform === 'reddit') {
            const run = await client.actor('practicaltools/apify-reddit-api').call({
                maxItems: 20,
                searches: [phrase],
                sort: 'new',
                time: 'week',
            });
            const result = await client.dataset(run.defaultDatasetId).listItems();
            items = result.items;
        } else if (platform === 'threads') {
            const run = await client.actor('watcher.data/search-threads-by-keywords').call({
                keywords: [phrase],
                maxItemsPerKeyword: 20,
                sortBy: 'latest',
            });
            const result = await client.dataset(run.defaultDatasetId).listItems();
            items = result.items;
        }

        console.log(`[ScraperService] Found ${items.length} items for ${platform}: "${phrase}"`);

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

        const content = extractScrapedContent(item, platform);
        const gate = shouldIngestScrapedPost(content || '', phrase, platform);
        if (!gate.ok) {
            console.log(`⏭️ [ScraperService] Skip ${platform}/${post_id}: ${gate.reason}`);
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

        const newPostData: any = {
            post_id,
            platform,
            keyword: phrase,
            keyword_id: kw._id,
            status: 'pending',
            raw_result: item,
            url,
            content,
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
            newPostData.author = {
                name: item.author_name || item.authorName || item.author?.name || item.author,
                handle: item.author || item.authorUsername || item.userName,
            };
        } else if (platform === 'reddit') {
            newPostData.author = {
                name: item.username || item.author,
            };
        } else if (platform === 'threads') {
            newPostData.author = {
                name: item.author_name || item.author_username,
                handle: item.author_username,
            };
        }

        try {
            const saved = await LeadPost.create(newPostData);
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
