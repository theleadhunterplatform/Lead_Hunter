import prisma from '../lib/prisma';
import LeadPost from '../models/lead-post.model';

export function extractLinkedInActivityId(str?: string | null): string | null {
    if (!str) return null;
    const match = str.match(/(?:activity|share)[:\-](\d+)/i) || str.match(/urn:li:(?:activity|share):(\d+)/i) || str.match(/^(\d{18,20})$/);
    if (match) return match[1];
    return null;
}

export function extractTwitterTweetId(str?: string | null): string | null {
    if (!str) return null;
    const match = str.match(/status\/(\d+)/i) || str.match(/^(\d{15,22})$/);
    if (match) return match[1];
    return null;
}

export function extractRedditPostId(str?: string | null): string | null {
    if (!str) return null;
    const match = str.match(/\/comments\/([a-zA-Z0-9]+)/i) || str.match(/^([a-zA-Z0-9]{5,10})$/);
    if (match) return match[1];
    return null;
}

export function getLeadDedupKey(lead: {
    platform: string;
    post_id: string;
    url: string;
    content: string;
}): string {
    const activityId = extractLinkedInActivityId(lead.url) || extractLinkedInActivityId(lead.post_id);
    if (activityId) {
        return `${lead.platform}:activity:${activityId}`;
    }

    const tweetId = extractTwitterTweetId(lead.url) || extractTwitterTweetId(lead.post_id);
    if (tweetId) {
        return `${lead.platform}:tweet:${tweetId}`;
    }

    const redditId = extractRedditPostId(lead.url) || extractRedditPostId(lead.post_id);
    if (redditId) {
        return `${lead.platform}:reddit:${redditId}`;
    }

    const url = lead.url?.trim();
    if (url && url !== '#' && !url.startsWith('manual://')) {
        return `${lead.platform}:url:${url.toLowerCase()}`;
    }

    const content = lead.content?.trim();
    if (content && content.length >= 40) {
        return `${lead.platform}:content:${content.slice(0, 100)}`;
    }

    return `${lead.platform}:post_id:${lead.post_id}`;
}

export async function findExistingLeadPost(options: {
    post_id?: string;
    platform: string;
    url?: string | null;
    content?: string | null;
    email?: string | null;
    phone?: string | null;
}) {
    const { post_id, platform, url, content, email, phone } = options;
    const base = { platform, is_deleted: false };

    if (post_id) {
        const byId = await LeadPost.findOne({ ...base, post_id });
        if (byId) return byId;
    }

    if (email && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();
        const byEmail = await prisma.leadPost.findFirst({
            where: { is_deleted: false, email: normalizedEmail },
        });
        if (byEmail) return byEmail;
    }

    if (phone && phone.trim()) {
        const cleanPhone = phone.trim();
        const byPhone = await prisma.leadPost.findFirst({
            where: {
                is_deleted: false,
                content: { contains: cleanPhone },
            },
        });
        if (byPhone) return byPhone;
    }

    // Platform-specific universal identifier matching (Cross-Tool Deduplication)
    // Ensures if Tool A (e.g. Apify) scraped Post A, Tool B (e.g. Scrapingdog/Crawlbase) cannot duplicate it
    if (platform === 'linkedin') {
        const activityId = extractLinkedInActivityId(url) || extractLinkedInActivityId(post_id);
        if (activityId) {
            const byActivity = await prisma.leadPost.findFirst({
                where: {
                    ...base,
                    OR: [
                        { url: { contains: activityId } },
                        { post_id: { contains: activityId } },
                    ],
                },
            });
            if (byActivity) return byActivity;
        }
    } else if (platform === 'twitter') {
        const tweetId = extractTwitterTweetId(url) || extractTwitterTweetId(post_id);
        if (tweetId) {
            const byTweet = await prisma.leadPost.findFirst({
                where: {
                    ...base,
                    OR: [
                        { url: { contains: tweetId } },
                        { post_id: tweetId },
                    ],
                },
            });
            if (byTweet) return byTweet;
        }
    } else if (platform === 'reddit') {
        const redditId = extractRedditPostId(url) || extractRedditPostId(post_id);
        if (redditId) {
            const byReddit = await prisma.leadPost.findFirst({
                where: {
                    ...base,
                    OR: [
                        { url: { contains: redditId } },
                        { post_id: redditId },
                    ],
                },
            });
            if (byReddit) return byReddit;
        }
    }

    const normalizedUrl = url?.trim();
    if (normalizedUrl && normalizedUrl !== '#' && !normalizedUrl.startsWith('manual://')) {
        const byUrl = await prisma.leadPost.findFirst({
            where: { ...base, url: normalizedUrl },
        });
        if (byUrl) return byUrl;
    }

    const trimmedContent = content?.trim();
    if (trimmedContent && trimmedContent.length >= 40) {
        const byContent = await prisma.leadPost.findFirst({
            where: { ...base, content: trimmedContent },
        });
        if (byContent) return byContent;

        // Substring / prefix match for first 80 clean characters (avoids duplicate scrape if whitespace changes)
        const cleanPrefix = trimmedContent.replace(/\s+/g, ' ').slice(0, 80);
        if (cleanPrefix.length >= 40) {
            const byPrefix = await prisma.leadPost.findFirst({
                where: { ...base, content: { contains: cleanPrefix } },
            });
            if (byPrefix) return byPrefix;
        }
    }

    return null;
}

export function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
    );
}

function scoreLeadForKeep(lead: {
    id: string;
    claimed_count: number;
    enrichment_status: string | null;
    email: string | null;
    intelligence: string | null;
    created_at: Date;
}) {
    let score = 0;
    if (lead.claimed_count > 0) score += 100;
    if (lead.email) score += 50;
    if (lead.intelligence) score += 30;
    if (lead.enrichment_status === 'found') score += 20;
    return score;
}

export async function removeDuplicateLeads(): Promise<{
    groups: number;
    removed: number;
    kept: number;
}> {
    const leads = await prisma.leadPost.findMany({
        where: { is_deleted: false },
        select: {
            id: true,
            post_id: true,
            platform: true,
            url: true,
            content: true,
            claimed_count: true,
            enrichment_status: true,
            email: true,
            intelligence: true,
            created_at: true,
        },
        orderBy: { created_at: 'asc' },
    });

    const groups = new Map<string, typeof leads>();
    for (const lead of leads) {
        const key = getLeadDedupKey(lead);
        const bucket = groups.get(key) || [];
        bucket.push(lead);
        groups.set(key, bucket);
    }

    const toRemove: string[] = [];
    let duplicateGroups = 0;

    for (const [, bucket] of groups) {
        if (bucket.length <= 1) continue;
        duplicateGroups++;

        const sorted = [...bucket].sort((a, b) => {
            const scoreDiff = scoreLeadForKeep(b) - scoreLeadForKeep(a);
            if (scoreDiff !== 0) return scoreDiff;
            return a.created_at.getTime() - b.created_at.getTime();
        });

        const [, ...dupes] = sorted;
        toRemove.push(...dupes.map((l) => l.id));
    }

    if (toRemove.length > 0) {
        await prisma.leadPost.updateMany({
            where: { id: { in: toRemove } },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }

    return {
        groups: duplicateGroups,
        removed: toRemove.length,
        kept: leads.length - toRemove.length,
    };
}
