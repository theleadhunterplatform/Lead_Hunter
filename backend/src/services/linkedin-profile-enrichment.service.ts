import axios from 'axios';
import config from '../config';
import { getApifyClient } from '../utils/apify-client.utils';
import {
    extractEmailFromText,
    extractPhoneFromText,
} from '../utils/lead-enrichment.utils';
import { extractDomainFromUrl } from '../utils/email-pattern.utils';

export type LinkedInProfileData = {
    email?: string | null;
    phone?: string | null;
    name?: string;
    first_name?: string;
    last_name?: string;
    headline?: string;
    company_name?: string;
    company_domain?: string | null;
    linkedin_public_id?: string;
    website?: string | null;
};

function pickProfileField(profile: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        const value = profile[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
}

function normalizeProfileItem(item: Record<string, any>): LinkedInProfileData {
    const website =
        pickProfileField(item, ['website', 'companyWebsite', 'external_url', 'companyWebsiteUrl']) as string | null;

    const companyDomain =
        extractDomainFromUrl(website || '') ||
        extractDomainFromUrl(pickProfileField(item, ['companyUrl', 'companyLinkedinUrl']) as string || '') ||
        null;

    const bioText = [
        pickProfileField(item, ['about', 'summary', 'bio', 'headline']),
        pickProfileField(item, ['companyName', 'company_name']),
    ].filter(Boolean).join(' ');

    const emailFromProfile =
        pickProfileField(item, ['email', 'workEmail', 'personalEmail']) ||
        extractEmailFromText(bioText);

    const phoneFromProfile =
        pickProfileField(item, ['mobileNumber', 'phone', 'phoneNumber']) ||
        extractPhoneFromText(bioText);

    const fullName = pickProfileField(item, ['fullName', 'name']) as string | undefined;
    const firstName = (pickProfileField(item, ['firstName', 'first_name']) as string) || fullName?.split(' ')[0];
    const lastName =
        (pickProfileField(item, ['lastName', 'last_name']) as string) ||
        fullName?.split(' ').slice(-1)[0];

    const publicId =
        pickProfileField(item, ['publicIdentifier', 'linkedin_public_id', 'username']) as string | undefined ||
        (pickProfileField(item, ['linkedinUrl', 'linkedinPublicUrl', 'url']) as string | undefined)?.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1];

    return {
        email: emailFromProfile as string | null,
        phone: phoneFromProfile as string | null,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        headline: pickProfileField(item, ['headline', 'jobTitle', 'title']) as string | undefined,
        company_name: pickProfileField(item, ['companyName', 'company_name', 'currentCompany']) as string | undefined,
        company_domain: companyDomain,
        linkedin_public_id: publicId || undefined,
        website,
    };
}

export async function scrapeLinkedInAuthorProfile(authorUrl?: string): Promise<LinkedInProfileData | null> {
    if (!authorUrl?.includes('linkedin.com/in/')) return null;

    try {
        const { client } = await getApifyClient();
        const run = await client.actor(config.apify.linkedinProfileActor).call({
            profileUrls: [authorUrl],
            urls: [authorUrl],
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (!items?.length) return null;

        const profile = normalizeProfileItem(items[0] as Record<string, any>);

        if (profile.website && !profile.email) {
            try {
                const response = await axios.get(profile.website, { timeout: 8000 });
                if (typeof response.data === 'string') {
                    profile.email = extractEmailFromText(response.data) || profile.email;
                    profile.phone = extractPhoneFromText(response.data) || profile.phone;
                }
            } catch {
                // website scrape is best-effort
            }
        }

        return profile;
    } catch (error: any) {
        console.warn('[LinkedInProfile] Apify scrape failed:', error.message);
        return null;
    }
}
