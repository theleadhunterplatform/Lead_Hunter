import prisma from '../lib/prisma';
import { trainModel } from './ocr.service';
import { getSetting, updateSetting } from './setting.service';

export const MIN_TRAINING_SAMPLES = 8;
const METRICS_KEY = 'local_ai_metrics';

const MANUAL_LABEL_HINTS = [
    'Manually marked',
    'Rejected during admin review',
    'Rejected during bulk admin review',
];

function isManualTrainingLabel(qualificationReason?: string | null): boolean {
    if (!qualificationReason) return false;
    return MANUAL_LABEL_HINTS.some((hint) => qualificationReason.includes(hint));
}

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
    message?: string;
};

export async function getTrainingSamples(): Promise<TrainingSample[]> {
    const labeled = await prisma.leadPost.findMany({
        where: {
            is_deleted: false,
            is_training_data: true,
            status: { in: ['relevant', 'irrelevant'] },
            NOT: { content: '' },
        },
        select: { content: true, status: true, qualification_reason: true, updated_at: true },
        orderBy: { updated_at: 'desc' },
        take: 500,
    });

    const unique = new Map<string, TrainingSample>();
    for (const post of labeled) {
        const content = post.content.trim();
        if (content.length <= 10) continue;

        const sample: TrainingSample = {
            content,
            label: post.status as 'relevant' | 'irrelevant',
        };

        const key = `${post.status}:${content.slice(0, 200)}`;
        unique.set(key, sample);

        // Manual admin labels are duplicated so the model prioritizes your corrections.
        if (isManualTrainingLabel(post.qualification_reason)) {
            unique.set(`${key}:manual`, sample);
        }
    }

    return Array.from(unique.values());
}

export async function getLocalAiMetrics(): Promise<LocalAiMetrics> {
    const samples = await getTrainingSamples();
    const stored = (await getSetting(METRICS_KEY)) as LocalAiMetrics | null;
    const relevant_count = samples.filter((s) => s.label === 'relevant').length;
    const irrelevant_count = samples.length - relevant_count;

    if (samples.length < MIN_TRAINING_SAMPLES) {
        return {
            accuracy: stored?.accuracy ?? null,
            samples: samples.length,
            relevant_count,
            irrelevant_count,
            last_trained_at: stored?.last_trained_at ?? null,
            model_ready: false,
            status: 'collecting',
            message: `Learning from your labels: ${samples.length}/${MIN_TRAINING_SAMPLES} manually marked leads collected.`,
        };
    }

    if (stored?.status === 'training') {
        return {
            ...stored,
            samples: samples.length,
            relevant_count,
            irrelevant_count,
        };
    }

    if (stored?.model_ready) {
        return {
            ...stored,
            samples: samples.length,
            relevant_count,
            irrelevant_count,
            status: 'ready',
            message: `Local AI active · ${stored.accuracy ?? 0}% accuracy on ${stored.samples} training examples.`,
        };
    }

    return {
        accuracy: null,
        samples: samples.length,
        relevant_count,
        irrelevant_count,
        last_trained_at: null,
        model_ready: false,
        status: 'collecting',
        message: `${samples.length} labeled leads ready. Auto-training will run shortly.`,
    };
}

async function saveMetrics(metrics: Partial<LocalAiMetrics>) {
    const current = ((await getSetting(METRICS_KEY)) as LocalAiMetrics | null) || {};
    await updateSetting(METRICS_KEY, { ...current, ...metrics }, 'Local AI model training metrics');
}

export async function executeAutoTraining(): Promise<void> {
    const samples = await getTrainingSamples();

    if (samples.length < MIN_TRAINING_SAMPLES) {
        await saveMetrics({
            samples: samples.length,
            relevant_count: samples.filter((s) => s.label === 'relevant').length,
            irrelevant_count: samples.filter((s) => s.label !== 'relevant').length,
            model_ready: false,
            status: 'collecting',
            accuracy: null,
            message: `Need ${MIN_TRAINING_SAMPLES - samples.length} more labeled leads before the model can train.`,
        });
        return;
    }

    await saveMetrics({
        status: 'training',
        samples: samples.length,
        message: 'Training local AI on latest labeled leads...',
    });

    const result = await trainModel(samples);

    if (!result.success) {
        await saveMetrics({
            status: 'unavailable',
            model_ready: false,
            message: result.message || 'AI service unavailable. Start python main.py in the ai/ folder.',
        });
        console.error('[AutoTrain] Failed:', result.error || result.message);
        return;
    }

    const metrics = result.metrics || {};
    await saveMetrics({
        accuracy: metrics.accuracy ?? null,
        samples: metrics.samples ?? samples.length,
        relevant_count: metrics.relevant_count ?? samples.filter((s) => s.label === 'relevant').length,
        irrelevant_count: metrics.irrelevant_count ?? samples.filter((s) => s.label !== 'relevant').length,
        last_trained_at: new Date().toISOString(),
        model_ready: true,
        status: 'ready',
        accuracy_note: metrics.accuracy_note,
        message: `Local AI updated · ${metrics.accuracy ?? 0}% accuracy.`,
    });

    console.log(`✅ [AutoTrain] Model updated (${metrics.accuracy}% accuracy, ${metrics.samples} samples)`);
}
