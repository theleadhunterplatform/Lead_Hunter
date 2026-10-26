import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
    updateToken,
    getToken,
    updateHunterKey,
    getHunterKey,
    updateContactOutToken,
    getContactOutToken,
    updateApolloKey,
    getApolloKey,
    updateOpenRouterKey,
    getOpenRouterKey,
    updateScrapedogKey,
    getScrapedogKey,
    updateCrawlbaseToken,
    getCrawlbaseToken,
    getScraperEngineSettings,
    updateScraperEngineSettings,
    toggleScraperEnginePause,
    getLastScrapeStatus,
    getEnrichmentProviderSettings,
    toggleEnrichmentProviderPause,
} from '../controllers/contact.controller';
import { getAutomationSettings, updateAutomationSettings, getIntelligenceSettings, getEmailSettings } from '../controllers/automation.controller';

const router = express.Router();

router.use(protect);

router.get('/automation', authorize('scraping:manage'), getAutomationSettings);
router.patch('/automation', authorize('scraping:manage'), updateAutomationSettings);
router.get('/intelligence', authorize('lead:hunt'), getIntelligenceSettings);
router.get('/email', authorize('user:read'), getEmailSettings);

router.post('/contact-compass-token', authorize('scraping:manage'), updateToken);
router.get('/contact-compass-token', authorize('scraping:manage'), getToken);
router.post('/hunter-api-key', authorize('scraping:manage'), updateHunterKey);
router.get('/hunter-api-key', authorize('scraping:manage'), getHunterKey);
router.post('/contactout-api-token', authorize('scraping:manage'), updateContactOutToken);
router.get('/contactout-api-token', authorize('scraping:manage'), getContactOutToken);
router.post('/apollo-api-key', authorize('scraping:manage'), updateApolloKey);
router.get('/apollo-api-key', authorize('scraping:manage'), getApolloKey);
router.post('/openrouter-api-key', authorize('scraping:manage'), updateOpenRouterKey);
router.get('/openrouter-api-key', authorize('scraping:manage'), getOpenRouterKey);

router.post('/scrapedog-api-key', authorize('scraping:manage'), updateScrapedogKey);
router.get('/scrapedog-api-key', authorize('scraping:manage'), getScrapedogKey);
router.post('/crawlbase-token', authorize('scraping:manage'), updateCrawlbaseToken);
router.get('/crawlbase-token', authorize('scraping:manage'), getCrawlbaseToken);
router.get('/scraper-engines', authorize('scraping:manage'), getScraperEngineSettings);
router.post('/scraper-engines', authorize('scraping:manage'), updateScraperEngineSettings);
router.post('/scraper-engines/toggle-pause', authorize('scraping:manage'), toggleScraperEnginePause);
router.get('/last-scrape', authorize('scraping:manage'), getLastScrapeStatus);
router.get('/enrichment-providers/paused', authorize('scraping:manage'), getEnrichmentProviderSettings);
router.post('/enrichment-providers/toggle-pause', authorize('scraping:manage'), toggleEnrichmentProviderPause);

export default router;
