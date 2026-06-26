import { getSetting } from '../services/setting.service';

export const AUTO_SCRAPE_KEY = 'auto_scrape_enabled';
export const AUTO_ENRICHMENT_KEY = 'auto_enrichment_enabled';
export const KEEP_ALIVE_KEY = 'keep_alive_enabled';

function parseBool(value: unknown): boolean {
    return value === true || value === 'true';
}

export async function isAutoScrapeEnabled(): Promise<boolean> {
    return parseBool(await getSetting(AUTO_SCRAPE_KEY));
}

export async function isAutoEnrichmentEnabled(): Promise<boolean> {
    return parseBool(await getSetting(AUTO_ENRICHMENT_KEY));
}

export async function isKeepAliveEnabled(): Promise<boolean> {
    return parseBool(await getSetting(KEEP_ALIVE_KEY));
}
