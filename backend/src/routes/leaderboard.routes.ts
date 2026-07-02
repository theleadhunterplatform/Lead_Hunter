import { Router } from 'express';
import { getLeaderboard, earnPoints } from '../controllers/leaderboard.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', protect, getLeaderboard);

// Platform admins only — not for end-user token farming
router.post('/earn', protect, authorize('*'), earnPoints);

export default router;
