import { ConnectionOptions } from 'bullmq';
import config from '../config';

export const redisConnection: ConnectionOptions = {
    url: config.redis.url,
    // Add production settings like TLS if needed later
    maxRetriesPerRequest: null,
};
