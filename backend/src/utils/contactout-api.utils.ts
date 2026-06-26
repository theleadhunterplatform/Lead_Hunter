import axios from 'axios';
import config from '../config';
import { getSetting } from '../services/setting.service';
import { markContactOutRateLimited, recordContactOutCredits } from './contactout-usage.utils';

export async function getContactOutApiToken(): Promise<string | null> {
    const fromDb = await getSetting('contactout_api_token');
    if (fromDb) return fromDb;
    return config.contactOut?.apiToken || null;
}

function pickStrings(...values: unknown[]): string[] {
    const out: string[] = [];
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) out.push(value.trim());
        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === 'string' && item.trim()) out.push(item.trim());
                else if (item && typeof item === 'object' && 'number' in item && typeof (item as any).number === 'string') {
                    out.push((item as any).number.trim());
                }
            }
        }
    }
    return out;
}

export type ContactOutLookupResult = {
    phones: string[];
    emails: string[];
    contactInfo: Record<string, any>;
};

export async function findPhonesWithContactOut(linkedinUrl: string): Promise<ContactOutLookupResult | null> {
    const token = await getContactOutApiToken();
    if (!token) return null;

    if (!linkedinUrl?.includes('linkedin.com/in/')) return null;

    try {
        const response = await axios.get('https://api.contactout.com/v1/people/linkedin', {
            params: {
                profile: linkedinUrl,
                include_phone: true,
            },
            headers: {
                Accept: 'application/json',
                token,
            },
            timeout: 25000,
        });

        const meta = response.data?.meta;
        const creditsRemaining = meta?.credits_remaining;
        if (typeof creditsRemaining === 'number') {
            await recordContactOutCredits(creditsRemaining, meta?.credits_limit ?? null);
        }

        const profile = response.data?.profile || response.data;
        if (!profile) return null;

        const phones = pickStrings(
            profile.phones,
            profile.phone,
            profile.phone_numbers,
            profile.mobile
        );
        const emails = pickStrings(profile.emails, profile.work_emails, profile.personal_emails, profile.email);

        if (phones.length === 0 && emails.length === 0) return null;

        return {
            phones,
            emails: emails.map((e) => e.toLowerCase()),
            contactInfo: {
                name: profile.full_name || profile.name,
                title: profile.title || profile.headline,
                company_name: profile.company || profile.company_name,
                linkedin_public_id: profile.linkedin_url?.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1],
            },
        };
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 404) return null;
        if (status === 403 || status === 429) {
            await markContactOutRateLimited();
        }
        console.warn('[ContactOut] Lookup failed:', error.response?.data || error.message);
        return null;
    }
}
