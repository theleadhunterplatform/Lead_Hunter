import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { updateToken, getToken, updateHunterKey, getHunterKey, updateContactOutToken, getContactOutToken, updateApolloKey, getApolloKey } from '../controllers/contact.controller';
import { getAutomationSettings, updateAutomationSettings, getIntelligenceSettings } from '../controllers/automation.controller';

const router = express.Router();

router.use(protect);

router.get('/automation', authorize('scraping:manage'), getAutomationSettings);
router.patch('/automation', authorize('scraping:manage'), updateAutomationSettings);
router.get('/intelligence', authorize('lead:hunt'), getIntelligenceSettings);

router.post('/contact-compass-token', authorize('scraping:manage'), updateToken);
router.get('/contact-compass-token', authorize('scraping:manage'), getToken);
router.post('/hunter-api-key', authorize('scraping:manage'), updateHunterKey);
router.get('/hunter-api-key', authorize('scraping:manage'), getHunterKey);
router.post('/contactout-api-token', authorize('scraping:manage'), updateContactOutToken);
router.get('/contactout-api-token', authorize('scraping:manage'), getContactOutToken);
router.post('/apollo-api-key', authorize('scraping:manage'), updateApolloKey);
router.get('/apollo-api-key', authorize('scraping:manage'), getApolloKey);

export default router;
