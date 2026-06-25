import {
    extractAllPhonesFromText,
    extractPhoneFromText,
    pickFirstPhone,
    type PhoneSource,
} from './lead-enrichment.utils';
import { discoverPhonesFromWebsites, domainToWebsiteUrl } from './website-phone-discovery.utils';
import { findPhoneViaGooglePlaces } from './google-places-phone.utils';

export type PhoneDiscoveryHit = {
    phone: string;
    source: PhoneSource;
    message: string;
};

export type PhoneDiscoveryContext = {
    content?: string | null;
    author?: {
        name?: string | null;
        info?: string | null;
        website?: string | null;
    } | null;
    profileData?: {
        website?: string | null;
        company_domain?: string | null;
        company_name?: string | null;
        headline?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
    } | null;
    contactInfo?: {
        company_name?: string | null;
        company_domain?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
    } | null;
};

async function safeStep<T>(label: string, fn: () => Promise<T | null>): Promise<T | null> {
    try {
        return await fn();
    } catch (error: any) {
        console.warn(`[PhoneDiscovery] ${label} failed:`, error?.message || error);
        return null;
    }
}

function hit(phone: string | null | undefined, source: PhoneSource, message: string): PhoneDiscoveryHit | null {
    if (!phone?.trim()) return null;
    return { phone: phone.trim(), source, message };
}

/** Free / low-cost phone sources before paid APIs. Each step is isolated — failures never break enrichment. */
export async function runFreePhoneDiscovery(ctx: PhoneDiscoveryContext): Promise<PhoneDiscoveryHit | null> {
    const authorText = [ctx.author?.info, ctx.author?.website].filter(Boolean).join(' ');
    const authorPhone = pickFirstPhone(
        extractPhoneFromText(authorText),
        extractPhoneFromText(ctx.profileData?.headline || '')
    );
    const authorHit = hit(authorPhone, 'author_info', 'Phone found in LinkedIn author info.');
    if (authorHit) return authorHit;

    const contentPhones = extractAllPhonesFromText(ctx.content || '');
    if (contentPhones.length > 1) {
        const extra = hit(contentPhones[1], 'post_text', 'Additional phone found in post content.');
        if (extra) return extra;
    }

    const websiteResult = await safeStep('website', async () => {
        const { phone, sourceUrl } = await discoverPhonesFromWebsites([
            ctx.profileData?.website,
            ctx.author?.website,
            domainToWebsiteUrl(ctx.profileData?.company_domain),
            domainToWebsiteUrl(ctx.contactInfo?.company_domain),
        ]);

        if (!phone) return null;
        return hit(
            phone,
            'website',
            sourceUrl
                ? `Phone found on company website (${sourceUrl}).`
                : 'Phone found on company website.'
        );
    });
    if (websiteResult) return websiteResult;

    const mapsPhone = await safeStep('google_maps', async () => {
        const phone = await findPhoneViaGooglePlaces({
            companyName: ctx.profileData?.company_name || ctx.contactInfo?.company_name,
            city: ctx.profileData?.city || ctx.contactInfo?.city,
            state: ctx.profileData?.state || ctx.contactInfo?.state,
            country: ctx.profileData?.country || ctx.contactInfo?.country,
        });
        return hit(phone, 'google_maps', 'Phone found via Google Maps business listing.');
    });

    return mapsPhone;
}
