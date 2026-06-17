import { Worker } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { executeAutoTraining } from '../services/ai-training.service';

export const aiTrainWorker = new Worker(
    'ai-train-queue',
    async () => {
        console.log('👷 [AiTrainWorker] Auto-training local AI model...');
        await executeAutoTraining();
    },
    createWorkerOptions({ concurrency: 1 })
);

aiTrainWorker.on('failed', (job, err) => {
    console.error(`🚨 [AiTrainWorker] Job ${job?.id} failed:`, err.message);
});
