import prisma from '../lib/prisma';
import { trainModel } from './ocr.service';
import { getSetting, updateSetting } from './setting.service';
import { isManuallyLabeled } from '../utils/training-label.utils';

export const MIN_TRAINING_SAMPLES = 8;
export const MIN_NEW_LABELS_BEFORE_RETRAIN = 5;
const METRICS_KEY = 'local_ai_metrics';
const TRAIN_STATE_KEY = 'auto_train_state';

const RECENT_SAMPLE_MS = 30 * 24 * 60 * 60 * 1000;

export async function isLocalAiModelReady(): Promise<boolean> {
    const stored = (await getSetting(METRICS_KEY)) as LocalAiMetrics | null;
    return Boolean(stored?.model_ready);
}

export type TrainingSample = {
    content: string;
    label: 'relevant' | 'irrelevant';
};

export type LocalAiMetrics = {
    accuracy: number | null;
    samples: number;
    relevant_count: number;
    irrelevant_count: number;
    last_trained_at: string | null;
    model_ready: boolean;
    status: 'collecting' | 'training' | 'ready' | 'unavailable';
    accuracy_note?: string;
    vectorizer?: string;
    message?: string;
};

function pushWeighted(
    bucket: TrainingSample[],
    sample: TrainingSample,
    times: number
) {
    for (let i = 0; i < times; i += 1) {
        bucket.push(sample);
    }
}

export async function getTrainingSamples(): Promise<TrainingSample[]> {
    const [relevant, irrelevant] = await Promise.all([
        prisma.leadPost.findMany({
            where: {
                is_deleted: false,
                is_training_data: true,
                status: 'relevant',
                NOT: { content: '' },
            },
            select: { content: true, status: true, qualification_reason: true, updated_at: true },
            orderBy: { updated_at: 'desc' },
            take: 300,
        }),
        prisma.leadPost.findMany({
            where: {
                is_deleted: false,
                is_training_data: true,
                status: 'irrelevant',
                NOT: { content: '' },
            },
            select: { content: true, status: true, qualification_reason: true, updated_at: true },
            orderBy: { updated_at: 'desc' },
            take: 300,
        }),
    ]);

    // Prefer a balanced mix so majority "relevant" labels don't drown out junk patterns.
    const maxPerClass = 200;
    const labeled = [
        ...irrelevant.slice(0, maxPerClass),
        ...relevant.slice(0, maxPerClass),
    ];

    const weighted: TrainingSample[] = [];
    const seen = new Set<string>();
    const recentCutoff = Date.now() - RECENT_SAMPLE_MS;

    for (const post of labeled) {
        const content = post.content.trim();
        if (content.length <= 10) continue;

        const sample: TrainingSample = {
            content,
            label: post.status as 'relevant' | 'irrelevant',
        };

        const key = `${sample.label}:${content.slice(0, 200)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const manual = isManuallyLabeled(post.qualification_reason);
        const recent = new Date(post.updated_at).getTime() >= recentCutoff;

        // Upsample minority / manual labels more aggressively.
        let weight = 1;
        if (sample.label === 'irrelevant') weight += 2;
        if (manual) weight += 2;
        if (recent) weight += 1;

        pushWeighted(weighted, sample, weight);
    }

    return weighted;
}

export async function getTrainingSampleCount(): Promise<number> {
    const labeled = await prisma.leadPost.count({
        where: {
            is_deleted: false,
            is_training_data: true,
            status: { in: ['relevant', 'irrelevant'] },
            NOT: { content: '' },
        },
    });
    return labeled;
}

export async function shouldRunAutoTrain(force = false): Promise<boolean> {
    if (force) return true;

    const count = await getTrainingSampleCount();
    if (count < MIN_TRAINING_SAMPLES) return false;

    const state = (await getSetting(TRAIN_STATE_KEY)) as { last_trained_sample_count?: number } | null;
    const lastCount = state?.last_trained_sample_count ?? 0;

    if (lastCount === 0) return true;
    return count - lastCount >= MIN_NEW_LABELS_BEFORE_RETRAIN;
}

export async function getLocalAiMetrics(): Promise<LocalAiMetrics> {
    const uniqueCount = await getTrainingSampleCount();
    const stored = (await getSetting(METRICS_KEY)) as LocalAiMetrics | null;
    // Unique labeled counts (not weighted duplicates used only for training payload).
    const uniqueSamples = await prisma.leadPost.findMany({
        where: {
            is_deleted: false,
            is_training_data: true,
            status: { in: ['relevant', 'irrelevant'] },
            NOT: { content: '' },
        },
        select: { status: true },
    });
    const relevant_count = uniqueSamples.filter((s) => s.status === 'relevant').length;
    const irrelevant_count = uniqueSamples.length - relevant_count;

    if (uniqueCount < MIN_TRAINING_SAMPLES) {
        return {
            accuracy: stored?.accuracy ?? null,
            samples: uniqueCount,
            relevant_count,
            irrelevant_count,
            last_trained_at: stored?.last_trained_at ?? null,
            model_ready: false,
            status: 'collecting',
            message: `Learning from your labels: ${uniqueCount}/${MIN_TRAINING_SAMPLES} labeled leads collected.`,
        };
    }

    if (stored?.status === 'training') {
        return {
            ...stored,
            samples: uniqueCount,
            relevant_count,
            irrelevant_count,
        };
    }

    if (stored?.model_ready) {
        return {
            ...stored,
            samples: uniqueCount,
            relevant_count,
            irrelevant_count,
            status: 'ready',
            message: `Local AI active · ${stored.accuracy ?? 0}% accuracy · ${stored.vectorizer || 'embeddings'}.`,
        };
    }

    return {
        accuracy: null,
        samples: uniqueCount,
        relevant_count,
        irrelevant_count,
        last_trained_at: null,
        model_ready: false,
        status: 'collecting',
        message: `${uniqueCount} labeled leads ready. Auto-training runs after ${MIN_NEW_LABELS_BEFORE_RETRAIN} new labels.`,
    };
}

async function saveMetrics(metrics: Partial<LocalAiMetrics>) {
    const current = ((await getSetting(METRICS_KEY)) as LocalAiMetrics | null) || {};
    await updateSetting(METRICS_KEY, { ...current, ...metrics }, 'Local AI model training metrics');
}

export async function executeAutoTraining(): Promise<void> {
    const samples = await getTrainingSamples();
    const uniqueCount = await getTrainingSampleCount();

    if (uniqueCount < MIN_TRAINING_SAMPLES) {
        await saveMetrics({
            samples: uniqueCount,
            relevant_count: samples.filter((s) => s.label === 'relevant').length,
            irrelevant_count: samples.filter((s) => s.label !== 'relevant').length,
            model_ready: false,
            status: 'collecting',
            accuracy: null,
            message: `Need ${MIN_TRAINING_SAMPLES - uniqueCount} more labeled leads before the model can train.`,
        });
        return;
    }

    await saveMetrics({
        status: 'training',
        samples: uniqueCount,
        message: 'Training local AI on latest labeled leads...',
    });

    const result = await trainModel(samples);

    if (!result.success) {
        const detail = result.error || result.message || 'AI service unavailable';
        await saveMetrics({
            status: 'unavailable',
            model_ready: false,
            message: `AI training failed: ${detail}`,
        });
        console.error('[AutoTrain] Failed:', detail);
        return;
    }

    const metrics = result.metrics || {};

    if (metrics.rolled_back) {
        await saveMetrics({
            status: 'ready',
            model_ready: true,
            message: metrics.message || 'Kept previous model — new training did not improve accuracy.',
        });
        console.warn('[AutoTrain] Rolled back to previous model.');
        return;
    }

    const qualityNote = metrics.quality_warning || metrics.message;
    await saveMetrics({
        accuracy: metrics.accuracy ?? null,
        samples: uniqueCount,
        relevant_count: metrics.relevant_count ?? samples.filter((s) => s.label === 'relevant').length,
        irrelevant_count: metrics.irrelevant_count ?? samples.filter((s) => s.label !== 'relevant').length,
        last_trained_at: new Date().toISOString(),
        model_ready: true,
        status: 'ready',
        accuracy_note: metrics.accuracy_note,
        vectorizer: metrics.vectorizer,
        message: qualityNote
            ? `Local AI updated · ${metrics.accuracy ?? 0}% (${metrics.vectorizer || 'model'}). ${qualityNote}`
            : `Local AI updated · ${metrics.accuracy ?? 0}% accuracy (${metrics.vectorizer || 'model'}).`,
    });

    await updateSetting(
        TRAIN_STATE_KEY,
        { last_trained_sample_count: uniqueCount, last_trained_at: new Date().toISOString() },
        'Auto-train batching state'
    );

    console.log(`✅ [AutoTrain] Model updated (${metrics.accuracy}% accuracy, ${uniqueCount} unique samples)`);
}
