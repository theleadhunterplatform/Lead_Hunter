import { ApifyClient } from 'apify-client';
import ApifyKey from '../models/apify-key.model';
import config from '../config';

export type ApifyKeyRecord = Awaited<ReturnType<typeof ApifyKey.find>>[number];

export async function getApifyClient(): Promise<{ client: ApifyClient; activeKey: ApifyKeyRecord | null }> {
    const activeKeys = await ApifyKey.find({ is_active: true, is_deleted: false }, { sort: { created_at: 1 } });
    const activeKey = activeKeys[0] || null;
    const apiToken = activeKey ? activeKey.key : config.apify.token;

    if (!apiToken) {
        throw new Error('No active Apify tokens available.');
    }

    return { client: new ApifyClient({ token: apiToken }), activeKey };
}

export function isApifyLimitError(error: any): boolean {
    return error?.statusCode === 402 ||
        error?.statusCode === 403 ||
        error?.message?.includes('usage limit reached');
}

export async function handleApifyLimitError(error: any, activeKey: ApifyKeyRecord | null): Promise<void> {
    if (isApifyLimitError(error) && activeKey) {
        console.warn(`⚠️ Token limit reached for ${activeKey.label || 'current key'}. Rotating...`);
        activeKey.is_active = false;
        await activeKey.save();
    }
}
