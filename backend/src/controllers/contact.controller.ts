import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as settingService from '../services/setting.service';
import { enrichLeadPost } from '../services/enrichment.service';
import { getContactCompassUsage } from '../utils/contact-compass-usage.utils';
import { getHunterUsage } from '../utils/hunter-usage.utils';
import { getContactOutUsage } from '../utils/contactout-usage.utils';
import { getApolloUsage } from '../utils/apollo-usage.utils';

// @desc    Find lead email using Contact Compass
// @route   POST /api/leads/:id/find-email
// @access  Private
export const findLeadEmail = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const force = req.body?.force === true || req.query.force === 'true';
    const result = await enrichLeadPost(req.params.id as string, { force });

    return res.status(200).json({
        success: result.success,
        data: result.data,
        message: result.message,
        enrichment_status: result.status,
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
    const usage = await getContactCompassUsage();

    return res.status(200).json({
        success: true,
        data: {
            token: token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : null,
            is_configured: !!token,
            ...usage,
        }
    });
});

// @desc    Update Hunter.io API Key
// @route   POST /api/settings/hunter-api-key
// @access  Private
export const updateHunterKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { api_key } = req.body;

    if (!api_key) {
        return res.status(400).json({ success: false, message: 'API key is required' });
    }

    await settingService.updateSetting('hunter_api_key', api_key, 'Hunter.io Email Verifier API Key');

    return res.status(200).json({
        success: true,
        message: 'Hunter.io API key updated successfully',
    });
});

// @desc    Get Hunter.io API Key (Masked)
// @route   GET /api/settings/hunter-api-key
// @access  Private
export const getHunterKey = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const apiKey = await settingService.getSetting('hunter_api_key');
    const usage = await getHunterUsage();

    return res.status(200).json({
        success: true,
        data: {
            api_key: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
            ...usage,
            is_configured: !!apiKey,
        },
    });
});

// @desc    Update ContactOut API Token
// @route   POST /api/settings/contactout-api-token
// @access  Private
export const updateContactOutToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
    }

    await settingService.updateSetting('contactout_api_token', token, 'ContactOut API Token');

    return res.status(200).json({
        success: true,
        message: 'ContactOut API token updated successfully',
    });
});

// @desc    Get ContactOut API Token (Masked)
// @route   GET /api/settings/contactout-api-token
// @access  Private
export const getContactOutToken = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const token = await settingService.getSetting('contactout_api_token');
    const usage = await getContactOutUsage();

    return res.status(200).json({
        success: true,
        data: {
            token: token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : null,
            ...usage,
            is_configured: !!token,
        },
    });
});

// @desc    Update Apollo API Key
// @route   POST /api/settings/apollo-api-key
// @access  Private
export const updateApolloKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { api_key } = req.body;

    if (!api_key) {
        return res.status(400).json({ success: false, message: 'API key is required' });
    }

    await settingService.updateSetting('apollo_api_key', api_key, 'Apollo.io API Key');

    return res.status(200).json({
        success: true,
        message: 'Apollo API key updated successfully',
    });
});

// @desc    Get Apollo API Key (Masked)
// @route   GET /api/settings/apollo-api-key
// @access  Private
export const getApolloKey = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const apiKey = await settingService.getSetting('apollo_api_key');
    const usage = await getApolloUsage();

    return res.status(200).json({
        success: true,
        data: {
            api_key: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
            ...usage,
            is_configured: !!apiKey,
        },
    });
});

// @desc    Update OpenRouter API Key
// @route   POST /api/settings/openrouter-api-key
// @access  Private
export const updateOpenRouterKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { api_key } = req.body;

    if (!api_key) {
        return res.status(400).json({ success: false, message: 'API key is required' });
    }

    await settingService.updateSetting('openrouter_api_key', api_key, 'OpenRouter API Key for lead intelligence and outreach');

    return res.status(200).json({
        success: true,
        message: 'OpenRouter API key updated successfully',
    });
});

// @desc    Get OpenRouter API Key (Masked)
// @route   GET /api/settings/openrouter-api-key
// @access  Private
export const getOpenRouterKey = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const dbKey = await settingService.getSetting('openrouter_api_key');
    const envKey = process.env.OPEN_ROUTER_API;
    const activeKey = dbKey || envKey;

    return res.status(200).json({
        success: true,
        data: {
            api_key: activeKey ? `${activeKey.substring(0, 8)}...` : null,
            is_configured: !!activeKey,
            source: dbKey ? 'database' : (envKey ? 'env' : 'none'),
        },
    });
});
