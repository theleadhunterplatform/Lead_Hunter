function pickString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

export function extractScrapedPostId(item: any, platform: string): string | null {
    return (
        item?.id ||
        item?.entityId ||
        item?.tweetId ||
        item?.postId ||
        item?.name ||
        (platform === 'linkedin' ? item?.id : null) ||
        null
    );
}

export function extractScrapedContent(item: any, platform: string): string {
    switch (platform) {
        case 'linkedin':
            return pickString(
                item?.content,
                item?.text,
                item?.commentary,
                item?.article?.title && item?.article?.description
                    ? `${item.article.title}\n${item.article.description}`
                    : '',
                item?.article?.title,
                item?.resharedPost?.content,
                item?.repost?.content
            );
        case 'twitter':
            return pickString(item?.text, item?.full_text, item?.fullText, item?.tweetText, item?.content);
        case 'reddit':
            return pickString(
                item?.body,
                item?.selftext,
                item?.text,
                item?.content,
                item?.title && item?.selftext ? `${item.title}\n${item.selftext}` : '',
                item?.title
            );
        case 'threads':
            return pickString(item?.text, item?.caption, item?.content, item?.postText);
        default:
            return pickString(item?.text, item?.content, item?.body);
    }
}

export function extractScrapedUrl(item: any, platform: string): string {
    switch (platform) {
        case 'linkedin':
            return pickString(item?.linkedinUrl, item?.url);
        case 'twitter':
            return pickString(item?.url, item?.tweetUrl, item?.twitterUrl);
        case 'reddit':
            return pickString(item?.url, item?.permalink);
        default:
            return pickString(item?.url);
    }
}

export function extractScrapedPostedAt(item: any, _platform?: string): Record<string, any> {
    if (!item) return {};

    if (item.postedAt && typeof item.postedAt === 'object' && Object.keys(item.postedAt).length > 0) {
        return item.postedAt;
    }

    let dateStr = item.date || item.createdAt || item.created_at || item.publishedAt || item.published_at;
    let timestamp = typeof item.timestamp === 'number' ? item.timestamp : undefined;

    if (!timestamp && typeof item.created_utc === 'number') {
        timestamp = item.created_utc * 1000;
    } else if (!timestamp && typeof item.taken_at === 'number') {
        timestamp = item.taken_at * 1000;
    }

    if (!dateStr && timestamp) {
        dateStr = new Date(timestamp).toISOString();
    } else if (dateStr && !timestamp) {
        const parsed = new Date(dateStr).getTime();
        if (!isNaN(parsed)) timestamp = parsed;
    }

    let postedAgoShort: string | undefined;
    let postedAgoText: string | undefined;

    if (timestamp && !isNaN(timestamp)) {
        const diffHours = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
        if (diffHours < 1) {
            const mins = Math.max(1, Math.floor(diffHours * 60));
            postedAgoShort = `${mins}m`;
            postedAgoText = `${mins} minutes ago`;
        } else if (diffHours < 24) {
            const hours = Math.floor(diffHours);
            postedAgoShort = `${hours}h`;
            postedAgoText = `${hours} hours ago`;
        } else {
            const days = Math.floor(diffHours / 24);
            postedAgoShort = `${days}d`;
            postedAgoText = `${days} days ago`;
        }
    }

    return {
        ...(dateStr ? { date: dateStr } : {}),
        ...(timestamp ? { timestamp } : {}),
        ...(postedAgoShort ? { postedAgoShort } : {}),
        ...(postedAgoText ? { postedAgoText } : {}),
    };
}

/**
 * Checks if a scraped post is older than maxDays (default: 2 days / 48 hours).
 * Returns true if the post is strictly older than maxDays.
 */
export function isPostOlderThanDays(item: any, _platform?: string, maxDays = 2): boolean {
    if (!item) return false;

    const postedAt = item.postedAt && typeof item.postedAt === 'object' ? item.postedAt : item;

    // 1. Exact numeric timestamp
    const rawTimestamp =
        postedAt.timestamp ||
        item.timestamp ||
        (typeof item.created_utc === 'number' ? item.created_utc * 1000 : null) ||
        (typeof item.taken_at === 'number' ? item.taken_at * 1000 : null);

    if (typeof rawTimestamp === 'number' && !isNaN(rawTimestamp) && rawTimestamp > 0) {
        const tsMs = rawTimestamp < 1e11 ? rawTimestamp * 1000 : rawTimestamp;
        const hoursAgo = (Date.now() - tsMs) / (1000 * 60 * 60);
        return hoursAgo > maxDays * 24;
    }

    // 2. Exact date string
    const dateStr = postedAt.date || item.createdAt || item.created_at || item.date || item.publishedAt;
    if (typeof dateStr === 'string' && dateStr.trim()) {
        const parsed = new Date(dateStr).getTime();
        if (!isNaN(parsed) && parsed > 0) {
            const hoursAgo = (Date.now() - parsed) / (1000 * 60 * 60);
            return hoursAgo > maxDays * 24;
        }
    }

    // 3. Human-readable short string (e.g. '21h', '1d', '3d', '2w', '1mo')
    const agoShort = (postedAt.postedAgoShort || item.postedAgoShort || '').toString().trim().toLowerCase();
    if (agoShort) {
        if (/^\d+[mh]$/.test(agoShort)) {
            return false;
        }
        const dayMatch = agoShort.match(/^(\d+)d$/);
        if (dayMatch) {
            const days = parseInt(dayMatch[1], 10);
            return days > maxDays;
        }
        if (/[wmy]/.test(agoShort)) {
            return true;
        }
    }

    // 4. Human-readable text string (e.g. '3 days ago', '2 weeks ago')
    const agoText = (postedAt.postedAgoText || item.postedAgoText || '').toString().toLowerCase();
    if (agoText) {
        if (agoText.includes('minute') || agoText.includes('hour')) {
            return false;
        }
        const dayMatch = agoText.match(/(\d+)\s+day/);
        if (dayMatch) {
            const days = parseInt(dayMatch[1], 10);
            return days > maxDays;
        }
        if (agoText.includes('week') || agoText.includes('month') || agoText.includes('year')) {
            return true;
        }
    }

    return false;
}
