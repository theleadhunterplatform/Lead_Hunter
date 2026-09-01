import { Router } from 'express';
import { protect } from '../middleware/auth';
import { getMyPlan, listPlans, getMyCredits, cancelSubscription } from '../controllers/plan.controller';

const router = Router();

router.get('/', listPlans);
router.get('/me', protect, getMyPlan);
router.get('/me/credits', protect, getMyCredits);
router.post('/me/cancel', protect, cancelSubscription);

export default router;
