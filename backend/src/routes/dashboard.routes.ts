import express from 'express';
import { getStats } from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.get('/stats', getStats);

export default router;
