import axios from 'axios';
import { extractAllPhonesFromHtml } from './lead-enrichment.utils';

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const JUNK_DOMAINS = new Set([
    'example.com', 'test.com', 'email.com', 'youremail.com',
    'sentry.io', 'wixpress.com', 'googleapis.com', 'w3.org',
    'schema.org', 'gravatar.com', 'wordpress.com', 'domain.com',
    'mysite.com', 'yourdomain.com'
]);

const FILE_EXT_BLACKLIST = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.svg', '.webp', '.ico'];

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

const CONTACT_SUBPATHS = [
    '',
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
];

export interface CrawledContacts {
    emails: string[];
    phones: string[];
    website: string;
}

function isValidEmail(email: string): boolean {
    const lower = email.toLowerCase().trim();
    if (FILE_EXT_BLACKLIST.some(ext => lower.endsWith(ext))) return false;
    const parts = lower.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    if (JUNK_DOMAINS.has(domain)) return false;
    return true;
}

/**
 * Extracts all valid email addresses from text or HTML markup.
 */
export function extractEmailsFromHtml(html: string): string[] {
    const matches = html.match(EMAIL_REGEX) || [];
    const unique = new Set<string>();
    for (const match of matches) {
        if (isValidEmail(match)) {
            unique.add(match.toLowerCase());
        }
    }
    return Array.from(unique);
}

/**
 * Crawls a website or Link-in-bio (Linktree, Stan, portfolio, etc.) to discover emails and phones.
 */
export async function crawlWebsiteForContacts(
    rawUrl: string,
    timeoutMs: number = 6000
): Promise<CrawledContacts | null> {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    let targetUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
    }

    let parsed: URL;
    try {
        parsed = new URL(targetUrl);
    } catch {
        return null;
    }

    // Skip giant social media networks that require logins (LinkedIn, Instagram itself)
    const host = parsed.hostname.toLowerCase();
    if (host.includes('linkedin.com') || host.includes('instagram.com') || host.includes('twitter.com') || host.includes('x.com')) {
        return null;
    }

    const emailsFound = new Set<string>();
    const phonesFound = new Set<string>();

    const isLinkInBio = host.includes('linktr.ee') || host.includes('stan.store') || host.includes('beacons.ai') || host.includes('bio.link') || host.includes('linkr.bio');
    const pathsToTry = isLinkInBio ? [''] : CONTACT_SUBPATHS;

    for (const subpath of pathsToTry) {
        try {
            const pageUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}${subpath}`;
            const response = await axios.get(pageUrl, {
                timeout: timeoutMs,
                maxRedirects: 3,
                headers: BROWSER_HEADERS,
                responseType: 'text',
                validateStatus: (status) => status >= 200 && status < 400,
            });

            if (typeof response.data === 'string') {
                const html = response.data;
                const emails = extractEmailsFromHtml(html);
                for (const e of emails) emailsFound.add(e);

                const phones = extractAllPhonesFromHtml(html);
                for (const p of phones) phonesFound.add(p);

                // If on homepage of Linktree/Bio aggregator, look for outgoing personal website links
                if (isLinkInBio) {
                    const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
                    for (const m of mailtoMatches) {
                        const clean = m.replace(/^mailto:/i, '').trim();
                        if (isValidEmail(clean)) emailsFound.add(clean.toLowerCase());
                    }
                }

                // If we found an email, stop early to save time
                if (emailsFound.size > 0) break;
            }
        } catch {
            // Proceed to next subpath
        }
    }

    if (emailsFound.size === 0 && phonesFound.size === 0) {
        return null;
    }

    return {
        emails: Array.from(emailsFound),
        phones: Array.from(phonesFound),
        website: targetUrl,
    };
}
