import ApifyKey from '../models/apify-key.model';
import prisma from '../lib/prisma';
import {
    getWorkerId,
    markApifyKeyExhausted,
    releaseWorkerApifyLease,
    resolveApifyKeyForWorker,
} from '../utils/apify-token-manager.utils';

jest.mock('../models/apify-key.model', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
    },
}));

jest.mock('../lib/prisma', () => ({
    __esModule: true,
    default: {
        apifyKey: {
            update: jest.fn(),
        },
    },
}));

const mockedFind = ApifyKey.find as jest.Mock;
const mockedFindOne = ApifyKey.findOne as jest.Mock;
const mockedUpdate = prisma.apifyKey.update as jest.Mock;

function makeKey(id: string, label: string, commentsUsed = 0) {
    return {
        id,
        _id: id,
        key: `token-${id}`,
        label,
        is_active: true,
        is_deleted: false,
        comments_used: commentsUsed,
        comments_limit: 2500,
        usage_month: new Date().toISOString().slice(0, 7),
    };
}

describe('apify token manager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.WORKER_ID = '';
        mockedUpdate.mockResolvedValue({});
    });

    it('assigns different workers different keys from the pool', async () => {
        mockedFind.mockResolvedValue([makeKey('key-1', 'Token A'), makeKey('key-2', 'Token B')]);
        mockedFindOne.mockImplementation(async (filter: { _id?: string }) => {
            if (filter._id === 'key-1') return makeKey('key-1', 'Token A');
            if (filter._id === 'key-2') return makeKey('key-2', 'Token B');
            return null;
        });

        const workerA = await resolveApifyKeyForWorker('worker-a');
        const workerB = await resolveApifyKeyForWorker('worker-b');

        expect(workerA?.id).toBe('key-1');
        expect(workerB?.id).toBe('key-2');
    });

    it('keeps the same key for a worker until released', async () => {
        mockedFind.mockResolvedValue([makeKey('key-1', 'Token A'), makeKey('key-2', 'Token B')]);
        mockedFindOne.mockImplementation(async (filter: { _id?: string }) => {
            if (filter._id === 'key-1') return makeKey('key-1', 'Token A');
            if (filter._id === 'key-2') return makeKey('key-2', 'Token B');
            return null;
        });

        const first = await resolveApifyKeyForWorker('worker-a');
        const second = await resolveApifyKeyForWorker('worker-a');

        expect(first?.id).toBe('key-1');
        expect(second?.id).toBe('key-1');
    });

    it('rotates worker to a new key after exhaustion', async () => {
        mockedFind
            .mockResolvedValueOnce([makeKey('key-1', 'Token A'), makeKey('key-2', 'Token B')])
            .mockResolvedValueOnce([makeKey('key-2', 'Token B')]);

        mockedFindOne.mockImplementation(async (filter: { _id?: string }) => {
            if (filter._id === 'key-1') return makeKey('key-1', 'Token A');
            if (filter._id === 'key-2') return makeKey('key-2', 'Token B');
            return null;
        });

        const first = await resolveApifyKeyForWorker('worker-a');
        expect(first?.id).toBe('key-1');

        await markApifyKeyExhausted('key-1', 'worker-a');

        const rotated = await resolveApifyKeyForWorker('worker-a');
        expect(rotated?.id).toBe('key-2');
    });

    it('exposes a stable worker id', () => {
        process.env.WORKER_ID = 'render-node-3';
        expect(getWorkerId()).toBe('render-node-3');
    });

    afterEach(async () => {
        await releaseWorkerApifyLease('worker-a');
        await releaseWorkerApifyLease('worker-b');
    });
});
