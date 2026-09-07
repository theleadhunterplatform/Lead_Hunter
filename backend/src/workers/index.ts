import { scraperWorker } from './scraper.worker';
import { intelligenceWorker } from './intelligence.worker';
import { ocrWorker } from './ocr.worker';
import { aiTrainWorker } from './ai-train.worker';
import { enrichmentWorker } from './enrichment.worker';
import { titlingWorker } from './titling.worker';

const workers = [
    { worker: scraperWorker, name: 'Scraper' },
    { worker: intelligenceWorker, name: 'Intelligence' },
    { worker: ocrWorker, name: 'Qualification' },
    { worker: aiTrainWorker, name: 'AiTrain' },
    { worker: enrichmentWorker, name: 'Enrichment' },
    { worker: titlingWorker, name: 'Titling' },
];

export const initWorkers = () => {
    console.log('👷 Workers Initialized and Listening...');

    workers.forEach(({ worker, name }) => {
        worker.on('ready', () => console.log(`✔ ${name} Worker Ready`));

        worker.on('stalled', (jobId) => {
            console.warn(`⚠ [${name}Worker] Job ${jobId} stalled — will be retried`);
        });

        worker.on('error', (err) => {
            console.error(`🚨 [${name}Worker] Worker error:`, err.message);
        });
    });
};
