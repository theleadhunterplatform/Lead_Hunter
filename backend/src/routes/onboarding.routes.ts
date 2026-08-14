import express, { Request, Response } from 'express';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

// Stub endpoint — returns current user onboarding state
// Extend this as needed when onboarding flow is built
router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        data: {
            completed: true,
            steps: [],
        },
    });
});

router.post('/', (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        data: { completed: true },
    });
});

export default router;
