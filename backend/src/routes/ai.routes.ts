import { Router } from 'express';
import { triggerTraining } from '../controllers/ai.controller';
import { protect } from '../middleware/auth';

const router = Router();

// All routes here are protected
router.use(protect);

router.post('/train', triggerTraining);

export default router;
