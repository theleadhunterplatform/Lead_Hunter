import Redis from 'ioredis';
import config from '../config';

export async function verifyRedisConnection(): Promise<void> {
    const client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
    });

    try {
        await client.connect();
        const pong = await client.ping();
        if (pong !== 'PONG') {
            throw new Error(`Unexpected Redis ping response: ${pong}`);
        }
        const label = config.redis.url.includes('localhost') || config.redis.url.includes('127.0.0.1')
            ? 'local'
            : 'cloud';
        console.log(`✔ Redis connected (${label})`);
    } catch (error: any) {
        const isLocal = config.redis.url.includes('localhost') || config.redis.url.includes('127.0.0.1');
        console.error('❌ Redis connection failed:', error.message);
        if (isLocal) {
            console.error(
                '   Start local Redis: npm run redis:start  (Docker/Memurai) or install Memurai Developer.'
            );
        } else {
            console.error(
                '   Check REDIS_URL / Upstash quota. For dev, use REDIS_URL=redis://localhost:6379'
            );
        }
        throw error;
    } finally {
        client.disconnect();
    }
}
