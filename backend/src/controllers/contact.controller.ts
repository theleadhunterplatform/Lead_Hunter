import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as contactCompassService from '../services/contact-compass.service';
import * as settingService from '../services/setting.service';

// @desc    Find lead email using Contact Compass
// @route   POST /api/leads/:id/find-email
// @access  Private
export const findLeadEmail = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await contactCompassService.findLeadEmail(req.params.id as string);

    return res.status(200).json({
        success: true,
        data: result.data,
        message: result.message
    });
});

// @desc    Update Contact Compass Token
// @route   POST /api/settings/contact-compass-token
// @access  Private
export const updateToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
    }

    await settingService.updateSetting('contact_compass_token', token, 'Contact Compass API Token');

    return res.status(200).json({
        success: true,
        message: 'Token updated successfully'
    });
});

// @desc    Get Contact Compass Token (Masked)
// @route   GET /api/settings/contact-compass-token
// @access  Private
export const getToken = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const token = await settingService.getSetting('contact_compass_token');

    return res.status(200).json({
        success: true,
        data: {
            token: token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : null,
            is_configured: !!token
        }
    });
});
