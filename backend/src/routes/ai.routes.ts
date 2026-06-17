import { Router } from 'express';
import { triggerTraining, getTrainingSamples, getAiMetrics, triggerManualTraining } from '../controllers/ai.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/training-samples', getTrainingSamples);
router.get('/metrics', getAiMetrics);
router.post('/train', triggerTraining);
router.post('/train-now', triggerManualTraining);

export default router;
