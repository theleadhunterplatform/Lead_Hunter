import express from 'express';
import { 
    triggerLinkedIn, 
    triggerLinkedInActivity,
    triggerTwitter, 
    triggerReddit,
    triggerThreads,
    triggerAllScrapers,
} from '../controllers/scraper.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('scraper:run'));

router.post('/all', triggerAllScrapers);
router.post('/linkedin', triggerLinkedIn);
router.post('/linkedin-activity', triggerLinkedInActivity);
router.post('/twitter', triggerTwitter);
router.post('/reddit', triggerReddit);
router.post('/threads', triggerThreads);

export default router;
