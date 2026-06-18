import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { updateToken, getToken, updateHunterKey, getHunterKey } from '../controllers/contact.controller';

const router = express.Router();

router.use(protect);

router.post('/contact-compass-token', authorize('scraping:manage'), updateToken);
router.get('/contact-compass-token', authorize('scraping:manage'), getToken);
router.post('/hunter-api-key', authorize('scraping:manage'), updateHunterKey);
router.get('/hunter-api-key', authorize('scraping:manage'), getHunterKey);

export default router;
