import { scraperWorker } from './scraper.worker';
import { intelligenceWorker } from './intelligence.worker';
import { ocrWorker } from './ocr.worker';

export const initWorkers = () => {
    console.log('👷 Workers Initialized and Listening...');
    
    // Explicitly reference them to ensure they are initialized
    scraperWorker.on('ready', () => console.log('✔ Scraper Worker Ready'));
    intelligenceWorker.on('ready', () => console.log('✔ Intelligence Worker Ready'));
    ocrWorker.on('ready', () => console.log('✔ OCR Worker Ready'));
};
