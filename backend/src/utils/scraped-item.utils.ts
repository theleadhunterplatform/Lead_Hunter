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
            return pickString(item?.content, item?.text);
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
