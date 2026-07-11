import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/error-response.utils';
import * as outreachService from '../services/outreach.service';

export const generateOutreach = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const claimId = (req.body?.claim_id || req.body?.claimId) as string | undefined;
    if (!claimId) {
        throw new ErrorResponse('claim_id is required', 400);
    }

    const data = await outreachService.generateOutreachDraft(
        (user._id || user.id).toString(),
        claimId,
        {
            tone: req.body?.tone,
            regenerate: req.body?.regenerate === true,
        }
    );

    return res.status(200).json({
        success: true,
        data,
        message: 'Outreach draft generated.',
    });
});

export const getOutreach = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const data = await outreachService.getOutreachDraft(
        (user._id || user.id).toString(),
        req.params.claimId as string
    );
    return res.status(200).json({ success: true, data });
});

export const saveOutreach = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const claimId = req.params.claimId as string;
    const subject = req.body?.subject;
    const body = req.body?.body;

    if (typeof subject !== 'string' || typeof body !== 'string') {
        throw new ErrorResponse('subject and body are required strings', 400);
    }

    const data = await outreachService.saveOutreachDraft(
        (user._id || user.id).toString(),
        claimId,
        subject,
        body
    );

    return res.status(200).json({
        success: true,
        data,
        message: 'Outreach draft saved.',
    });
});
