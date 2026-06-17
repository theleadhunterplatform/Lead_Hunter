import { scraperWorker } from './scraper.worker';
import { intelligenceWorker } from './intelligence.worker';
import { ocrWorker } from './ocr.worker';
import { aiTrainWorker } from './ai-train.worker';
import { enrichmentWorker } from './enrichment.worker';

export const initWorkers = () => {
    console.log('👷 Workers Initialized and Listening...');
    
    scraperWorker.on('ready', () => console.log('✔ Scraper Worker Ready'));
    intelligenceWorker.on('ready', () => console.log('✔ Intelligence Worker Ready'));
    ocrWorker.on('ready', () => console.log('✔ Qualification Worker Ready'));
    aiTrainWorker.on('ready', () => console.log('✔ AI Train Worker Ready'));
    enrichmentWorker.on('ready', () => console.log('✔ Enrichment Worker Ready'));
};
