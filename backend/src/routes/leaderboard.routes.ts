import { Router } from 'express';
import { getLeaderboard, earnPoints } from '../controllers/leaderboard.controller';
import { protect } from '../middleware/auth';

const router = Router();

// Publicly viewable leaderboard
router.get('/', getLeaderboard);

// Protected actions for earning/managing points
router.post('/earn', protect, earnPoints);

export default router;
