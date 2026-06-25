import axios from 'axios';
import config from '../config';
import { getApifyClient } from '../utils/apify-client.utils';
import {
    extractEmailFromText,
    extractPhoneFromText,
    pickFirstPhone,
} from '../utils/lead-enrichment.utils';
import { extractDomainFromUrl } from '../utils/email-pattern.utils';
import { discoverPhonesFromWebsite } from '../utils/website-phone-discovery.utils';
import { scrapeLinkedInAuthorProfile, type LinkedInProfileData } from './linkedin-profile-enrichment.service';

export type SocialProfileData = LinkedInProfileData & {
    username?: string;
    profile_url?: string | null;
};

export const ENRICHABLE_PLATFORMS = ['linkedin', 'threads', 'twitter', 'reddit'] as const;
export type EnrichablePlatform = (typeof ENRICHABLE_PLATFORMS)[number];

function pickField(item: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        const value = item[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
}

function extractWebsiteFromText(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s<>"')]+/i);
    return match ? match[0] : null;
}

function profileFromBioText(options: {
    bio?: string | null;
    name?: string | null;
    website?: string | null;
    username?: string | null;
    profile_url?: string | null;
}): SocialProfileData | null {
    const bio = options.bio || '';
    const website = options.website || extractWebsiteFromText(bio);
    const email = extractEmailFromText(bio);
    const phone = extractPhoneFromText(bio);

    if (!email && !phone && !website && !bio.trim()) return null;

    return {
        email,
        phone,
        name: options.name || undefined,
        headline: bio || undefined,
        website,
        company_domain: website ? extractDomainFromUrl(website) : null,
        username: options.username || undefined,
        profile_url: options.profile_url || undefined,
    };
}

function normalizeTwitterHandle(lead: any): string | null {
    const raw = lead.raw_result || {};
    const handle = (
        lead.author?.handle ||
        raw.author ||
        raw.authorUsername ||
        raw.userName ||
        raw.username
    );
    if (!handle || typeof handle !== 'string') return null;
    return handle.replace(/^@/, '').trim() || null;
}

function normalizeRedditUsername(lead: any): string | null {
    const raw = lead.raw_result || {};
    const username = lead.author?.name || lead.author?.handle || raw.username || raw.author;
    if (!username || typeof username !== 'string') return null;
    return username.replace(/^u\//, '').replace(/^@/, '').trim() || null;
}

function normalizeThreadsUsername(lead: any): string | null {
    const url = lead.author?.url || lead.url || '';
    const fromUrl = url.match(/threads\.net\/@([^/?#]+)/)?.[1];
    return (
        fromUrl ||
        lead.author?.handle?.replace(/^@/, '') ||
        lead.raw_result?.author_username ||
        null
    );
}

function profileFromRawResult(lead: any): SocialProfileData | null {
    const raw = lead.raw_result || {};
    if (!raw || typeof raw !== 'object') return null;

    switch (lead.platform) {
        case 'twitter': {
            const bio = [
                pickField(raw, ['userDescription', 'authorDescription', 'description', 'bio']),
                pickField(raw, ['authorBio', 'profileBio']),
            ].filter(Boolean).join(' ');
            const handle = normalizeTwitterHandle(lead);
            return profileFromBioText({
                bio: String(bio || ''),
                name: lead.author?.name || pickField(raw, ['authorName', 'author_name', 'name']),
                website: pickField(raw, ['authorUrl', 'website', 'url']) as string | null,
                username: handle,
                profile_url: handle ? `https://x.com/${handle}` : null,
            });
        }
        case 'reddit': {
            const bio = [
                pickField(raw, ['authorFlair', 'flair']),
                pickField(raw, ['body', 'selftext']),
            ].filter(Boolean).join(' ');
            const username = normalizeRedditUsername(lead);
            return profileFromBioText({
                bio: String(bio || ''),
                name: username,
                username: username || undefined,
                profile_url: username ? `https://www.reddit.com/user/${username}` : null,
            });
        }
        case 'threads': {
            const bio = pickField(raw, ['text', 'caption', 'biography', 'bio']);
            const username = normalizeThreadsUsername(lead);
            return profileFromBioText({
                bio: String(bio || ''),
                name: lead.author?.name || pickField(raw, ['author_name']),
                username: username || undefined,
                profile_url: username ? `https://www.threads.net/@${username}` : null,
            });
        }
        default:
            return null;
    }
}

async function scrapeThreadsProfile(lead: any): Promise<SocialProfileData | null> {
    const username = normalizeThreadsUsername(lead);
    if (!username) return profileFromRawResult(lead);

    try {
        const { client } = await getApifyClient();
        const run = await client.actor('apify/threads-profile-api-scraper').call(
            { usernames: [username] },
            { timeout: 90 }
        );
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (!items?.length) return profileFromRawResult(lead);

        const profile = items[0] as Record<string, any>;
        const bio = profile.biography || '';
        const website = profile.external_url || profile.website || extractWebsiteFromText(bio);
        let email = extractEmailFromText(bio);
        let phone = extractPhoneFromText(bio);

        if (website && (!email || !phone)) {
            const websitePhones = await discoverPhonesFromWebsite(website, { maxPages: 4 });
            phone = phone || pickFirstPhone(...websitePhones);
            if (!email) {
                try {
                    const response = await axios.get(website, { timeout: 8000 });
                    if (typeof response.data === 'string') {
                        email = extractEmailFromText(response.data);
                    }
                } catch {
                    // best-effort
                }
            }
        }

        return {
            email,
            phone,
            name: profile.full_name || lead.author?.name,
            headline: bio,
            website,
            company_domain: website ? extractDomainFromUrl(website) : null,
            username,
            profile_url: `https://www.threads.net/@${username}`,
        };
    } catch (error: any) {
        console.warn('[ThreadsProfile] Scrape failed:', error.message);
        return profileFromRawResult(lead);
    }
}

async function scrapeTwitterProfile(handle: string): Promise<SocialProfileData | null> {
    try {
        const { client } = await getApifyClient();
        const actorId = config.apify.twitterProfileActor || 'apidojo/twitter-user-scraper';
        const run = await client.actor(actorId).call(
            { twitterHandles: [handle], maxItems: 1 },
            { timeout: 90 }
        );
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (!items?.length) return null;

        const profile = items[0] as Record<string, any>;
        const bio = [
            pickField(profile, ['description', 'bio', 'userDescription', 'profile_bio']),
            pickField(profile, ['location']),
        ].filter(Boolean).join(' ');

        const website = pickField(profile, ['url', 'website', 'externalUrl']) as string | null;
        let email = extractEmailFromText(bio);
        let phone = extractPhoneFromText(bio);

        if (website && (!email || !phone)) {
            const websitePhones = await discoverPhonesFromWebsite(website, { maxPages: 4 });
            phone = phone || pickFirstPhone(...websitePhones);
        }

        return {
            email,
            phone,
            name: pickField(profile, ['name', 'fullName', 'displayName']) as string | undefined,
            headline: bio || undefined,
            website,
            company_domain: website ? extractDomainFromUrl(website) : null,
            username: handle,
            profile_url: `https://x.com/${handle}`,
        };
    } catch (error: any) {
        console.warn('[TwitterProfile] Scrape failed:', error.message);
        return null;
    }
}

async function scrapeRedditProfile(username: string): Promise<SocialProfileData | null> {
    try {
        const response = await axios.get(`https://www.reddit.com/user/${username}/about.json`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LeadHunter/1.0; +https://lead-hunter.app)',
            },
            validateStatus: (status) => status >= 200 && status < 500,
        });

        if (response.status === 404 || !response.data?.data) return null;

        const user = response.data.data;
        const subreddit = user.subreddit || {};
        const bio = [subreddit.public_description, subreddit.description].filter(Boolean).join(' ');

        return profileFromBioText({
            bio,
            name: user.name || username,
            username,
            profile_url: `https://www.reddit.com/user/${username}`,
        });
    } catch (error: any) {
        console.warn('[RedditProfile] Lookup failed:', error.message);
        return null;
    }
}

async function attachWebsiteContacts(profile: SocialProfileData): Promise<SocialProfileData> {
    if (!profile.website || (profile.email && profile.phone)) return profile;

    const phones = await discoverPhonesFromWebsite(profile.website, { maxPages: 4 });
    return {
        ...profile,
        phone: profile.phone || pickFirstPhone(...phones),
        email: profile.email || null,
    };
}

/** Platform profile enrichment. Never throws. */
export async function enrichSocialProfileForLead(lead: any): Promise<SocialProfileData | null> {
    try {
        switch (lead.platform as EnrichablePlatform) {
            case 'linkedin': {
                const url = lead.author?.url;
                if (!url?.includes('linkedin.com/in/')) return null;
                return scrapeLinkedInAuthorProfile(url);
            }
            case 'threads': {
                const profile = (await scrapeThreadsProfile(lead)) || profileFromRawResult(lead);
                return profile ? attachWebsiteContacts(profile) : null;
            }
            case 'twitter': {
                const handle = normalizeTwitterHandle(lead);
                const profile =
                    (handle ? await scrapeTwitterProfile(handle) : null) || profileFromRawResult(lead);
                return profile ? attachWebsiteContacts(profile) : null;
            }
            case 'reddit': {
                const username = normalizeRedditUsername(lead);
                const profile =
                    (username ? await scrapeRedditProfile(username) : null) || profileFromRawResult(lead);
                return profile ? attachWebsiteContacts(profile) : null;
            }
            default:
                return null;
        }
    } catch (error: any) {
        console.warn(`[SocialProfile] ${lead.platform} enrichment failed:`, error.message);
        return profileFromRawResult(lead);
    }
}

export function getProfileContactSources(platform: string): {
    phone: 'apify_profile' | 'threads_profile' | 'twitter_profile' | 'reddit_profile';
    email: 'apify_profile' | 'threads_profile' | 'twitter_profile' | 'reddit_profile';
} {
    switch (platform) {
        case 'threads':
            return { phone: 'threads_profile', email: 'threads_profile' };
        case 'twitter':
            return { phone: 'twitter_profile', email: 'twitter_profile' };
        case 'reddit':
            return { phone: 'reddit_profile', email: 'reddit_profile' };
        default:
            return { phone: 'apify_profile', email: 'apify_profile' };
    }
}
