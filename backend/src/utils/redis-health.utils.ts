import Redis from 'ioredis';
import config from '../config';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingOnce(): Promise<boolean> {
    const client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
        family: 4,
    });

    try {
        await client.connect();
        const pong = await client.ping();
        return pong === 'PONG';
    } catch {
        return false;
    } finally {
        client.disconnect();
    }
}

/** Returns true when Redis is reachable; in dev, returns false instead of crashing the API. */
export async function verifyRedisConnection(): Promise<boolean> {
    const isDev = config.env !== 'production';
    const maxAttempts = isDev ? 24 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (await pingOnce()) {
            const label =
                config.redis.url.includes('127.0.0.1') || config.redis.url.includes('localhost')
                    ? 'local'
                    : 'cloud';
            console.log(`✔ Redis connected (${label})`);
            return true;
        }

        if (attempt < maxAttempts) {
            if (attempt === 1) {
                console.log('⏳ Waiting for Redis...');
            }
            await sleep(500);
        }
    }

    const isLocal =
        config.redis.url.includes('localhost') || config.redis.url.includes('127.0.0.1');
    console.error('❌ Redis connection failed after waiting.');

    if (isLocal) {
        console.error('   Redis should start automatically with npm run dev.');
    } else {
        console.error('   Check REDIS_URL / Upstash quota.');
    }

    if (config.env === 'production') {
        console.error('❌ Redis unavailable — API will run but scraping/queues are disabled until REDIS_URL is fixed.');
        return false;
    }

    console.warn('⚠️  Dev mode: starting API without Redis — login works, queues/workers disabled.');
    return false;
}
