import { WorkerOptions } from 'bullmq';
import config from '../config';
import { redisConnection } from './connection';

const isDev = config.env !== 'production';

/** Shared BullMQ worker settings — slower polling in dev to save Redis commands. */
export function createWorkerOptions(overrides: Partial<WorkerOptions> = {}): WorkerOptions {
    const devPolling = isDev
        ? { drainDelay: 5000, stalledInterval: 120_000 }
        : {};

    return {
        ...devPolling,
        ...overrides,
        connection: redisConnection,
    };
}
