import config from '../config';

const KEEP_ALIVE_INTERVAL = '*/10 * * * *';

function normalizeUrl(url: string, healthPath = false): string {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!healthPath) return trimmed;
    return trimmed.endsWith('/health') ? trimmed : `${trimmed}/health`;
}

export function resolveKeepAliveUrls(): string[] {
    const explicit = process.env.KEEP_ALIVE_URLS?.split(',').map((u) => u.trim()).filter(Boolean);
    if (explicit?.length) return explicit;

    const urls: string[] = [];
    const apiUrl = process.env.RENDER_EXTERNAL_URL || process.env.API_PUBLIC_URL;
    if (apiUrl) urls.push(normalizeUrl(apiUrl, true));
    if (process.env.FRONTEND_URL) urls.push(normalizeUrl(process.env.FRONTEND_URL));
    if (config.aiService.url && !config.aiService.url.includes('localhost')) {
        urls.push(normalizeUrl(config.aiService.url, true));
    }

    return [...new Set(urls)];
}

export function isKeepAliveConfigured(): boolean {
    return resolveKeepAliveUrls().length > 0;
}

export async function pingKeepAliveUrls(): Promise<{ url: string; ok: boolean; status?: number }[]> {
    const urls = resolveKeepAliveUrls();
    if (urls.length === 0) return [];

    const results = await Promise.all(
        urls.map(async (url) => {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(url.includes('-ai-') ? 60_000 : 20_000),
                });
                return { url, ok: response.ok, status: response.status };
            } catch (error: any) {
                console.warn(`[KeepAlive] ${url} failed: ${error.message}`);
                return { url, ok: false };
            }
        })
    );

    for (const result of results) {
        console.log(`[KeepAlive] ${result.url} → ${result.ok ? result.status ?? 'OK' : 'failed'}`);
    }

    return results;
}

export { KEEP_ALIVE_INTERVAL };
