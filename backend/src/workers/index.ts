export const initWorkers = async () => {
    // Load workers after HTTP port is open — avoids slow Redis connects blocking Render deploy
    const [
        { scraperWorker },
        { intelligenceWorker },
        { ocrWorker },
        { aiTrainWorker },
        { enrichmentWorker },
    ] = await Promise.all([
        import('./scraper.worker'),
        import('./intelligence.worker'),
        import('./ocr.worker'),
        import('./ai-train.worker'),
        import('./enrichment.worker'),
    ]);

    console.log('👷 Workers Initialized and Listening...');

    scraperWorker.on('ready', () => console.log('✔ Scraper Worker Ready'));
    intelligenceWorker.on('ready', () => console.log('✔ Intelligence Worker Ready'));
    ocrWorker.on('ready', () => console.log('✔ Qualification Worker Ready'));
    aiTrainWorker.on('ready', () => console.log('✔ AI Train Worker Ready'));
    enrichmentWorker.on('ready', () => console.log('✔ Enrichment Worker Ready'));
};
