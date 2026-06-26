import axios from 'axios';
import config from '../config';
import { getSetting } from '../services/setting.service';
import { markHunterRateLimited } from './hunter-usage.utils';

export async function getHunterApiKey(): Promise<string | null> {
    const fromDb = await getSetting('hunter_api_key');
    if (fromDb) return fromDb;
    const fromEnv = config.hunter?.apiKey;
    return fromEnv || null;
}

export async function verifyEmailWithHunter(email: string): Promise<{
    verified: boolean;
    result?: string;
} | null> {
    const apiKey = await getHunterApiKey();
    if (!apiKey) return null;

    try {
        const response = await axios.get('https://api.hunter.io/v2/email-verifier', {
            params: { email, api_key: apiKey },
            timeout: 10000,
        });

        const result = response.data?.data?.result as string | undefined;
        const verified = result === 'deliverable' || result === 'valid' || result === 'accept_all';
        return { verified, result };
    } catch (error: any) {
        if (error.response?.status === 429) {
            await markHunterRateLimited();
        }
        console.warn('[Hunter] Email verification failed:', error.message);
        return null;
    }
}

export interface HunterFindResult {
    email: string;
    score: number;
    verificationStatus?: string;
    position?: string;
    company?: string;
}

export async function findEmailWithHunter(options: {
    domain?: string;
    company?: string;
    linkedinHandle?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
}): Promise<HunterFindResult | null> {
    const apiKey = await getHunterApiKey();
    if (!apiKey) return null;

    const params: Record<string, string | number> = { api_key: apiKey, max_duration: 15 };

    if (options.linkedinHandle) {
        params.linkedin_handle = options.linkedinHandle;
    } else if (options.domain) {
        params.domain = options.domain;
    } else if (options.company) {
        params.company = options.company;
    } else {
        return null;
    }

    if (!options.linkedinHandle) {
        if (options.firstName && options.lastName) {
            params.first_name = options.firstName;
            params.last_name = options.lastName;
        } else if (options.fullName) {
            params.full_name = options.fullName;
        } else {
            return null;
        }
    }

    try {
        const response = await axios.get('https://api.hunter.io/v2/email-finder', {
            params,
            timeout: 25000,
        });

        const data = response.data?.data;
        if (!data?.email) return null;

        return {
            email: String(data.email).toLowerCase(),
            score: Number(data.score) || 0,
            verificationStatus: data.verification?.status,
            position: data.position,
            company: data.company,
        };
    } catch (error: any) {
        if (error.response?.status === 404) return null;
        if (error.response?.status === 429) {
            await markHunterRateLimited();
        }
        console.warn('[Hunter] Email finder failed:', error.response?.data?.errors || error.message);
        return null;
    }
}

export async function findEmailWithHunterMulti(options: {
    linkedinHandle?: string;
    domain?: string;
    company?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    domainFromEmail?: string;
}): Promise<HunterFindResult | null> {
    const attempts: Array<Parameters<typeof findEmailWithHunter>[0]> = [];

    if (options.linkedinHandle) {
        attempts.push({ linkedinHandle: options.linkedinHandle });
    }
    if (options.domain && (options.firstName || options.lastName || options.fullName)) {
        attempts.push({
            domain: options.domain,
            firstName: options.firstName,
            lastName: options.lastName,
            fullName: options.fullName,
        });
    }
    if (options.domainFromEmail && (options.firstName || options.lastName || options.fullName)) {
        attempts.push({
            domain: options.domainFromEmail,
            firstName: options.firstName,
            lastName: options.lastName,
            fullName: options.fullName,
        });
    }
    if (options.company && (options.firstName || options.lastName || options.fullName)) {
        attempts.push({
            company: options.company,
            firstName: options.firstName,
            lastName: options.lastName,
            fullName: options.fullName,
        });
    }

    for (const attempt of attempts) {
        const result = await findEmailWithHunter(attempt);
        if (result) return result;
    }

    return null;
}
