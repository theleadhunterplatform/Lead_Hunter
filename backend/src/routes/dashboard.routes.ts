import express from 'express';
import { getStats } from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.get('/stats', getStats);
router.get('/', getStats); // alias — some frontends call /api/dashboard directly

export default router;
