import axios from 'axios';
import { extractAllPhonesFromHtml, extractAllPhonesFromText } from './lead-enrichment.utils';

const CONTACT_PATHS = [
    '',
    '/contact',
    '/contact-us',
    '/contactus',
    '/about',
    '/about-us',
    '/get-in-touch',
    '/support',
];

const SKIP_HOST_PATTERNS = [
    /linkedin\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
    /twitter\.com/i,
    /x\.com/i,
    /youtube\.com/i,
    /tiktok\.com/i,
    /threads\.net/i,
];

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
};

function shouldSkipWebsiteHost(hostname: string): boolean {
    return SKIP_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function normalizeWebsiteUrl(input?: string | null): string | null {
    if (!input?.trim()) return null;

    let url = input.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }

    try {
        const parsed = new URL(url);
        if (!parsed.hostname || shouldSkipWebsiteHost(parsed.hostname)) return null;
        parsed.hash = '';
        return parsed.origin + parsed.pathname.replace(/\/+$/, '') || parsed.origin;
    } catch {
        return null;
    }
}

export function domainToWebsiteUrl(domain?: string | null): string | null {
    if (!domain?.trim()) return null;
    const cleaned = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!cleaned || cleaned.includes('@')) return null;
    return normalizeWebsiteUrl(`https://${cleaned}`);
}

async function fetchPageText(url: string): Promise<string | null> {
    try {
        const response = await axios.get(url, {
            timeout: 8000,
            maxRedirects: 4,
            headers: BROWSER_HEADERS,
            responseType: 'text',
            validateStatus: (status) => status >= 200 && status < 400,
        });

        return typeof response.data === 'string' ? response.data : null;
    } catch {
        return null;
    }
}

function collectPhonesFromHtml(html: string, found: Set<string>) {
    for (const phone of extractAllPhonesFromHtml(html)) {
        found.add(phone);
    }
    for (const phone of extractAllPhonesFromText(html)) {
        found.add(phone);
    }
}

/**
 * Crawl homepage + common contact paths. Never throws.
 */
export async function discoverPhonesFromWebsite(
    websiteInput?: string | null,
    options?: { maxPages?: number }
): Promise<string[]> {
    const baseUrl = normalizeWebsiteUrl(websiteInput);
    if (!baseUrl) return [];

    const maxPages = options?.maxPages ?? CONTACT_PATHS.length;
    const found = new Set<string>();
    const visited = new Set<string>();

    for (const path of CONTACT_PATHS.slice(0, maxPages)) {
        const pageUrl = path ? `${baseUrl}${path}` : baseUrl;
        if (visited.has(pageUrl)) continue;
        visited.add(pageUrl);

        const html = await fetchPageText(pageUrl);
        if (!html) continue;

        collectPhonesFromHtml(html, found);
        if (found.size > 0) break;
    }

    return [...found];
}

export async function discoverPhonesFromWebsites(
    websites: Array<string | null | undefined>
): Promise<{ phone: string | null; sourceUrl: string | null }> {
    const seen = new Set<string>();

    for (const website of websites) {
        const normalized = normalizeWebsiteUrl(website) || domainToWebsiteUrl(website || undefined);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);

        const phones = await discoverPhonesFromWebsite(normalized);
        if (phones.length > 0) {
            return { phone: phones[0], sourceUrl: normalized };
        }
    }

    return { phone: null, sourceUrl: null };
}
