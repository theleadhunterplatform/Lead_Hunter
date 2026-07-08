import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as userApprovalService from '../services/user-approval.service';

// @desc    List users awaiting signup approval
// @route   GET /api/admin/users/pending
// @access  Platform admin
export const listPendingSignupUsers = asyncHandler(
    async (_req: Request, res: Response, _next: NextFunction) => {
        const users = await userApprovalService.listPendingSignupUsers();
        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    }
);

// @desc    Approve a pending signup
// @route   POST /api/admin/users/:id/approve
// @access  Platform admin
export const approveSignupUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const actor = req.user as any;
    const user = await userApprovalService.approveSignupUser(
        req.params.id as string,
        actor._id?.toString() || actor.id
    );

    res.status(200).json({
        success: true,
        message: 'User approved. They can now log in.',
        data: user,
    });
});

// @desc    Reject a pending signup
// @route   POST /api/admin/users/:id/reject
// @access  Platform admin
export const rejectSignupUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const actor = req.user as any;
    const user = await userApprovalService.rejectSignupUser(
        req.params.id as string,
        actor._id?.toString() || actor.id,
        req.body?.reason
    );

    res.status(200).json({
        success: true,
        message: 'User rejected.',
        data: user,
    });
});
