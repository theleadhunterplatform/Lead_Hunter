import express from 'express';
import { protect } from '../middleware/auth';
import { requirePlatformAdmin } from '../middleware/platform-admin';
import {
    listPendingSignupUsers,
    approveSignupUser,
    rejectSignupUser,
} from '../controllers/user-approval.controller';

const router = express.Router();

router.use(protect, requirePlatformAdmin);

router.get('/users/pending', listPendingSignupUsers);
router.post('/users/:id/approve', approveSignupUser);
router.post('/users/:id/reject', rejectSignupUser);

export default router;
