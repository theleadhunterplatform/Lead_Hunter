import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as leaderboardService from '../services/leaderboard.service';

// @desc    Get top users for leaderboard
// @route   GET /api/leaderboard
// @access  Public (or Private)
export const getLeaderboard = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { limit } = req.query;
    const users = await leaderboardService.getLeaderboardData({
        limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

// @desc    Mock endpoint to earn points (for testing/demo)
// @route   POST /api/leaderboard/earn
// @access  Private
export const earnPoints = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { points, reason } = req.body;
    
    if (!points || points <= 0) {
        return res.status(400).json({ success: false, message: 'Valid points amount required' });
    }

    const user = await leaderboardService.addPoints((req.user as any)._id, points, reason || 'Manual Activity');

    return res.status(200).json({
        success: true,
        message: `Earned ${points} points!`,
        data: {
            current_points: user?.points,
            current_tokens: user?.tokens
        }
    });
});
