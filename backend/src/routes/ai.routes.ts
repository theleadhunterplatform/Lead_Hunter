import { Router } from 'express';
import { triggerTraining, getTrainingSamples, getAiMetrics, triggerManualTraining } from '../controllers/ai.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/training-samples', authorize('lead:hunt'), getTrainingSamples);
router.get('/metrics', authorize('lead:hunt'), getAiMetrics);
router.post('/train', authorize('lead:hunt'), triggerTraining);
router.post('/train-now', authorize('lead:hunt'), triggerManualTraining);

export default router;
