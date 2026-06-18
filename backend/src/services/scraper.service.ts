import LeadPost from '../models/lead-post.model';
import Keyword from '../models/keyword.model';
import config from '../config';
import { getApifyClient, handleApifyLimitError } from '../utils/apify-client.utils';
import { enqueueLeadQualification } from '../utils/qualification-queue.utils';
import { findExistingLeadPost, isDuplicateKeyError } from '../utils/lead-dedup.utils';

export class ScraperService {
    static async scrapeKeyword(keywordId: string, platform: string) {
        const kw = await Keyword.findById(keywordId);
        if (!kw) throw new Error(`Keyword ${keywordId} not found`);

        console.log(`🚀 [ScraperService] Processing ${platform} for keyword: "${kw.text}"`);

        const { client, activeKey } = await getApifyClient();
        let items: any[] = [];

        try {
            if (platform === 'linkedin') {
                const run = await client.actor(config.apify.linkedinActor).call({
                    maxPosts: 20,
                    postedLimit: "1h",
                    searchQueries: [kw.text],
                    sortBy: "date"
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items;
            } else if (platform === 'twitter') {
                const run = await client.actor("watcher.data/search-x-by-keywords").call({
                    keywords: [kw.text],
                    maxItemsPerKeyword: 20,
                    searchType: "tweets",
                    sortBy: "latest"
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items;
            } else if (platform === 'reddit') {
                const run = await client.actor("practicaltools/apify-reddit-api").call({
                    maxItems: 20,
                    searches: [kw.text],
                    sort: "new",
                    time: "hour"
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items;
            } else if (platform === 'threads') {
                const run = await client.actor("watcher.data/search-threads-by-keywords").call({
                    keywords: [kw.text],
                    maxItemsPerKeyword: 20,
                    sortBy: "latest"
                });
                const result = await client.dataset(run.defaultDatasetId).listItems();
                items = result.items;
            }

            console.log(`[ScraperService] Found ${items.length} items for ${platform}: "${kw.text}"`);

            for (const item of items) {
                await this.processScrapedItem(item, platform, kw);
            }

        } catch (error: any) {
            await handleApifyLimitError(error, activeKey);
            console.error(`❌ Error in ScraperService (${platform}):`, error.message);
            throw error;
        }
    }

    private static async processScrapedItem(item: any, platform: string, kw: any) {
        const post_id = item.id || item.entityId || (platform === 'linkedin' ? item.id : null);
        if (!post_id) return;

        const existingPost = await findExistingLeadPost({
            post_id,
            platform,
            url: platform === 'linkedin' ? item.linkedinUrl : item.url,
            content:
                platform === 'linkedin'
                    ? item.content
                    : platform === 'twitter'
                      ? item.text
                      : platform === 'reddit'
                        ? item.body || item.title
                        : item.text,
        });
        if (existingPost) return;

        // Map item to LeadPost model (simplified version of the logic in leadScraper.ts)
        const newPostData: any = {
            post_id,
            platform,
            keyword: kw.text,
            keyword_id: kw._id,
            status: 'pending',
            raw_result: item
        };

        if (platform === 'linkedin') {
            newPostData.url = item.linkedinUrl;
            newPostData.content = item.content;
            newPostData.author = {
                name: item.author?.name,
                url: item.author?.linkedinUrl
            };
        } else if (platform === 'twitter') {
            newPostData.url = item.url;
            newPostData.content = item.text;
            newPostData.author = {
                name: item.author_name || item.author,
                handle: item.author
            };
        } else if (platform === 'reddit') {
            newPostData.url = item.url;
            newPostData.content = item.body || item.title;
            newPostData.author = {
                name: item.username
            };
        } else if (platform === 'threads') {
            newPostData.url = item.url;
            newPostData.content = item.text;
            newPostData.author = {
                name: item.author_name || item.author_username,
                handle: item.author_username
            };
        }

        try {
            const saved = await LeadPost.create(newPostData);
            if (saved?._id) {
                await enqueueLeadQualification(saved._id.toString());
            }
            console.log(`✨ [ScraperService] New ${platform} post saved: ${post_id}`);
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
        }
    }
}
