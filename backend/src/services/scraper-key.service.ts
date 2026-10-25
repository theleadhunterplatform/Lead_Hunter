import crypto from 'crypto';
import axios from 'axios';
import { getSetting, updateSetting } from './setting.service';
import config from '../config';
import logger from '../utils/logger';

export interface ScraperKeyItem {
    id: string;
    key: string;
    label: string | null;
    is_active: boolean;
    is_exhausted: boolean;
    error_message?: string | null;
    created_at: string;
    last_used_at?: string | null;
}

export type ScraperEngine = 'scrapedog' | 'crawlbase';

export function normalizeEngine(engine: string): ScraperEngine {
    const lower = (engine || '').trim().toLowerCase();
    if (lower === 'scrapedog' || lower === 'scrapingdog') return 'scrapedog';
    if (lower === 'crawlbase') return 'crawlbase';
    throw new Error(`Unsupported scraper engine: ${engine}. Supported engines: scrapedog, crawlbase`);
}

function getSettingKey(engine: ScraperEngine): string {
    return engine === 'scrapedog' ? 'scrapedog_keys' : 'crawlbase_keys';
}

function getLegacySingleKey(engine: ScraperEngine): string | null {
    if (engine === 'scrapedog') {
        return config.scrapedog.apiKey || null;
    }
    return config.crawlbase.token || null;
}

/**
 * Retrieve all configured keys for a scraper engine.
 */
export async function getAllScraperKeys(rawEngine: string): Promise<ScraperKeyItem[]> {
    const engine = normalizeEngine(rawEngine);
    const settingKey = getSettingKey(engine);
    const rawList = await getSetting(settingKey);

    let list: ScraperKeyItem[] = [];
    if (Array.isArray(rawList)) {
        list = rawList.map((item: any) => ({
            id: String(item.id || crypto.randomUUID()),
            key: String(item.key || '').trim(),
            label: item.label ? String(item.label).trim() : null,
            is_active: item.is_active !== false,
            is_exhausted: Boolean(item.is_exhausted),
            error_message: item.error_message ? String(item.error_message) : null,
            created_at: item.created_at || new Date().toISOString(),
            last_used_at: item.last_used_at || null,
        })).filter(k => k.key.length > 0);
    }

    // If list is empty but a single legacy key was set in env or DB, auto-populate it
    const legacyKey = getLegacySingleKey(engine);
    if (legacyKey && !list.some(k => k.key === legacyKey)) {
        list.push({
            id: crypto.randomUUID(),
            key: legacyKey,
            label: `${engine === 'scrapedog' ? 'Scrapingdog' : 'Crawlbase'} Primary (Env)`,
            is_active: true,
            is_exhausted: false,
            error_message: null,
            created_at: new Date().toISOString(),
        });
    }

    return list;
}

/**
 * Add a single key to the engine pool.
 */
export async function addScraperKey(
    rawEngine: string,
    input: { key: string; label?: string | null }
): Promise<ScraperKeyItem> {
    const engine = normalizeEngine(rawEngine);
    const key = (input.key || '').trim();
    if (!key) {
        throw new Error('API Key or Token cannot be empty');
    }

    const currentKeys = await getAllScraperKeys(engine);
    const existing = currentKeys.find(k => k.key === key);
    if (existing) {
        if (!existing.is_active || existing.is_exhausted) {
            existing.is_active = true;
            existing.is_exhausted = false;
            existing.error_message = null;
            if (input.label) existing.label = input.label.trim();
            await updateSetting(getSettingKey(engine), currentKeys);
            return existing;
        }
        throw new Error('This key/token is already configured in the pool');
    }

    const newKeyRecord: ScraperKeyItem = {
        id: crypto.randomUUID(),
        key,
        label: input.label?.trim() || `Key ${currentKeys.length + 1}`,
        is_active: true,
        is_exhausted: false,
        error_message: null,
        created_at: new Date().toISOString(),
    };

    currentKeys.unshift(newKeyRecord);
    await updateSetting(getSettingKey(engine), currentKeys);
    return newKeyRecord;
}

/**
 * Bulk add keys to the pool.
 */
export async function bulkAddScraperKeys(
    rawEngine: string,
    items: Array<{ key: string; label?: string | null }>
): Promise<{ added: number; updated: number; keys: ScraperKeyItem[] }> {
    const engine = normalizeEngine(rawEngine);
    const currentKeys = await getAllScraperKeys(engine);
    let added = 0;
    let updated = 0;

    for (const item of items) {
        const key = (item.key || '').trim();
        if (!key) continue;

        const existing = currentKeys.find(k => k.key === key);
        if (existing) {
            existing.is_active = true;
            existing.is_exhausted = false;
            existing.error_message = null;
            if (item.label) existing.label = item.label.trim();
            updated++;
        } else {
            currentKeys.push({
                id: crypto.randomUUID(),
                key,
                label: item.label?.trim() || `Key ${currentKeys.length + 1}`,
                is_active: true,
                is_exhausted: false,
                error_message: null,
                created_at: new Date().toISOString(),
            });
            added++;
        }
    }

    await updateSetting(getSettingKey(engine), currentKeys);
    return { added, updated, keys: currentKeys };
}

/**
 * Update key attributes (label, active status).
 */
export async function updateScraperKey(
    rawEngine: string,
    id: string,
    updates: Partial<Pick<ScraperKeyItem, 'label' | 'is_active' | 'is_exhausted' | 'error_message'>>
): Promise<ScraperKeyItem> {
    const engine = normalizeEngine(rawEngine);
    const currentKeys = await getAllScraperKeys(engine);
    const target = currentKeys.find(k => k.id === id);
    if (!target) {
        throw new Error(`Key with ID ${id} not found`);
    }

    if (updates.label !== undefined) target.label = updates.label;
    if (updates.is_active !== undefined) target.is_active = updates.is_active;
    if (updates.is_exhausted !== undefined) target.is_exhausted = updates.is_exhausted;
    if (updates.error_message !== undefined) target.error_message = updates.error_message;

    await updateSetting(getSettingKey(engine), currentKeys);
    return target;
}

/**
 * Delete a single key by ID.
 */
export async function deleteScraperKey(rawEngine: string, id: string): Promise<void> {
    const engine = normalizeEngine(rawEngine);
    const currentKeys = await getAllScraperKeys(engine);
    const filtered = currentKeys.filter(k => k.id !== id);
    await updateSetting(getSettingKey(engine), filtered);
}

/**
 * Bulk delete keys by IDs or all.
 */
export async function bulkDeleteScraperKeys(
    rawEngine: string,
    options: { ids?: string[]; all?: boolean }
): Promise<number> {
    const engine = normalizeEngine(rawEngine);
    if (options.all) {
        await updateSetting(getSettingKey(engine), []);
        return 0;
    }

    const idsToDelete = new Set(options.ids || []);
    const currentKeys = await getAllScraperKeys(engine);
    const remaining = currentKeys.filter(k => !idsToDelete.has(k.id));
    await updateSetting(getSettingKey(engine), remaining);
    return currentKeys.length - remaining.length;
}

/**
 * Pick an active, usable key from the pool.
 * Rotates round-robin based on last_used_at.
 */
export async function resolveActiveScraperKey(rawEngine: string): Promise<{ key: string; id?: string } | null> {
    const engine = normalizeEngine(rawEngine);
    const currentKeys = await getAllScraperKeys(engine);
    const usable = currentKeys.filter(k => k.is_active && !k.is_exhausted && k.key.length > 0);

    if (usable.length === 0) {
        // Fallback to legacy env single key if present
        const legacy = getLegacySingleKey(engine);
        if (legacy) return { key: legacy };
        return null;
    }

    // Sort by last_used_at ascending (nulls first) for even rotation
    usable.sort((a, b) => {
        if (!a.last_used_at) return -1;
        if (!b.last_used_at) return 1;
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
    });

    const chosen = usable[0];
    chosen.last_used_at = new Date().toISOString();
    // Fire-and-forget timestamp update
    updateSetting(getSettingKey(engine), currentKeys).catch(() => {});

    return { key: chosen.key, id: chosen.id };
}

/**
 * Mark a key as exhausted or failed.
 */
export async function markScraperKeyExhausted(
    rawEngine: string,
    keyOrId: string,
    reason: string
): Promise<void> {
    const engine = normalizeEngine(rawEngine);
    const currentKeys = await getAllScraperKeys(engine);
    const target = currentKeys.find(k => k.id === keyOrId || k.key === keyOrId);

    if (target) {
        target.is_exhausted = true;
        target.error_message = reason;
        await updateSetting(getSettingKey(engine), currentKeys);
        logger.warn(`[ScraperKey] Engine '${engine}' key (${target.label || target.key.slice(0, 10)}) marked EXHAUSTED: ${reason}`);
    } else {
        logger.warn(`[ScraperKey] Engine '${engine}' key (${keyOrId.slice(0, 10)}) exhausted: ${reason} (not in pool)`);
    }
}

/**
 * Test/verify a scraper key directly with the provider API.
 */
export async function testScraperKey(
    rawEngine: string,
    keyString: string
): Promise<{ valid: boolean; message: string; credits?: number }> {
    const engine = normalizeEngine(rawEngine);
    const key = (keyString || '').trim();
    if (!key) {
        return { valid: false, message: 'Key is empty' };
    }

    if (engine === 'scrapedog') {
        try {
            const res = await axios.get(`https://api.scrapingdog.com/account?api_key=${encodeURIComponent(key)}`, {
                timeout: 10000,
            });
            const data = res.data;
            const remaining = data?.remainingApiCredits ?? data?.credits;
            return {
                valid: true,
                message: `Valid! Remaining API credits: ${remaining !== undefined ? remaining : 'Available'}`,
                credits: typeof remaining === 'number' ? remaining : undefined,
            };
        } catch (err: any) {
            const status = err.response?.status;
            const dataMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            return {
                valid: false,
                message: status === 401 ? 'Invalid API Key (401 Unauthorized)' : `Check failed (${status || 'error'}): ${dataMsg}`,
            };
        }
    } else {
        // crawlbase
        try {
            const res = await axios.get(`https://api.crawlbase.com/?token=${encodeURIComponent(key)}&url=https://crawlbase.com/ip`, {
                timeout: 15000,
            });
            if (res.status === 200) {
                return {
                    valid: true,
                    message: 'Valid! Successfully authenticated with Crawlbase API.',
                };
            }
            return {
                valid: false,
                message: `Unexpected status: HTTP ${res.status}`,
            };
        } catch (err: any) {
            const status = err.response?.status;
            if (status === 401) {
                return { valid: false, message: 'Invalid token (401 Unauthorized)' };
            }
            if (status === 402) {
                return { valid: false, message: 'Account out of credits or trial expired (402 Payment Required)' };
            }
            if (status === 403) {
                return { valid: false, message: 'Token forbidden (403): Verify this is a Crawling API token' };
            }
            return {
                valid: false,
                message: `Crawlbase error (${status || 'error'}): ${err.message}`,
            };
        }
    }
}
