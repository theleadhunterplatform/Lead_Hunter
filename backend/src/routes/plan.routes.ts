import { Router } from 'express';
import { protect } from '../middleware/auth';
import { getMyPlan, listPlans } from '../controllers/plan.controller';

const router = Router();

router.get('/', listPlans);
router.get('/me', protect, getMyPlan);

export default router;
