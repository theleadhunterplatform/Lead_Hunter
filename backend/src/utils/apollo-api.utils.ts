import axios from 'axios';
import config from '../config';
import { getSetting } from '../services/setting.service';

export async function getApolloApiKey(): Promise<string | null> {
    const fromDb = await getSetting('apollo_api_key');
    if (fromDb) return fromDb;
    return config.apollo?.apiKey || null;
}

function extractApolloPhones(person: Record<string, any>): string[] {
    const phones: string[] = [];
    const push = (value: unknown) => {
        if (typeof value === 'string' && value.trim()) phones.push(value.trim());
    };

    push(person?.phone);
    push(person?.mobile_phone);
    push(person?.corporate_phone);
    push(person?.organization?.phone);
    push(person?.organization?.primary_phone?.number);
    push(person?.organization?.sanitized_phone);

    for (const entry of person?.phone_numbers || []) {
        push(entry?.sanitized_number);
        push(entry?.raw_number);
        push(entry?.number);
    }

    return phones;
}

function extractApolloEmails(person: Record<string, any>): string[] {
    const emails: string[] = [];
    const push = (value: unknown) => {
        if (typeof value === 'string' && value.includes('@')) emails.push(value.trim().toLowerCase());
    };

    push(person?.email);
    for (const entry of person?.contact_emails || []) {
        push(entry?.email);
    }

    return emails;
}

export type ApolloLookupResult = {
    phones: string[];
    emails: string[];
    contactInfo: Record<string, any>;
};

/** Sync Apollo match — may return corporate/direct phones; mobile often needs webhook. */
export async function findPhonesWithApollo(linkedinUrl: string): Promise<ApolloLookupResult | null> {
    const apiKey = await getApolloApiKey();
    if (!apiKey) return null;

    if (!linkedinUrl?.includes('linkedin.com/in/')) return null;

    try {
        const response = await axios.post(
            'https://api.apollo.io/api/v1/people/match',
            {},
            {
                params: {
                    linkedin_url: linkedinUrl,
                    reveal_phone_number: true,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': apiKey,
                },
                timeout: 25000,
            }
        );

        const person = response.data?.person;
        if (!person) return null;

        const phones = extractApolloPhones(person);
        const emails = extractApolloEmails(person);

        if (phones.length === 0 && emails.length === 0) return null;

        return {
            phones,
            emails,
            contactInfo: {
                name: person.name,
                first_name: person.first_name,
                last_name: person.last_name,
                title: person.title,
                headline: person.headline,
                company_name: person.organization?.name || person.organization_name,
                company_domain: person.organization?.primary_domain,
                linkedin_public_id: person.linkedin_url?.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1],
            },
        };
    } catch (error: any) {
        if (error.response?.status === 404) return null;
        console.warn('[Apollo] Lookup failed:', error.response?.data || error.message);
        return null;
    }
}
