import { aiTrainQueue } from '../queues';
import { MIN_TRAINING_SAMPLES } from '../services/ai-training.service';

const AUTO_TRAIN_JOB_ID = 'auto-retrain-local-ai';
const AUTO_TRAIN_DELAY_MS = 3000;

export async function scheduleAutoTrain(): Promise<void> {
    try {
        const existing = await aiTrainQueue.getJob(AUTO_TRAIN_JOB_ID);
        if (existing) {
            const state = await existing.getState();
            if (state === 'waiting' || state === 'delayed' || state === 'active') {
                return;
            }
            await existing.remove();
        }

        await aiTrainQueue.add(
            'auto-retrain',
            {},
            {
                jobId: AUTO_TRAIN_JOB_ID,
                delay: AUTO_TRAIN_DELAY_MS,
                removeOnComplete: true,
                removeOnFail: false,
            }
        );
    } catch (error: any) {
        if (!String(error?.message || '').toLowerCase().includes('job')) {
            console.error('[AutoTrain] Failed to schedule:', error.message);
        }
    }
}

export { MIN_TRAINING_SAMPLES };
