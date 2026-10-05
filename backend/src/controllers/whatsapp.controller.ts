import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import {
    getWhatsAppStatus,
    refreshParticipatingGroups,
    sendGroupMessage,
    dispatchLeadDropAlert,
    initWhatsAppClient,
    setTargetWhatsAppGroup,
} from '../services/whatsapp.service';

/**
 * POST /api/whatsapp/target-group
 * Sets and persists the target WhatsApp community group.
 */
export const setTargetWhatsAppGroupHandler = asyncHandler(async (req: Request, res: Response) => {
    const { groupId, groupName } = req.body || {};
    if (!groupId || typeof groupId !== 'string' || !groupId.trim()) {
        return res.status(400).json({
            success: false,
            message: 'groupId is required',
        });
    }

    const result = await setTargetWhatsAppGroup(groupId, groupName);
    return res.status(200).json({
        success: true,
        message: `Target WhatsApp community group updated to "${result.configuredGroupName || result.configuredGroupId}"`,
        data: result,
    });
});

/**
 * GET /api/whatsapp/status
 * Returns connection state, QR code (if pending), and bot number.
 */
export const getWhatsAppStatusHandler = asyncHandler(async (_req: Request, res: Response) => {
    const status = getWhatsAppStatus();
    return res.status(200).json({
        success: true,
        data: status,
    });
});

/**
 * GET /api/whatsapp/groups
 * Lists all groups the bot number is currently in.
 */
export const getWhatsAppGroupsHandler = asyncHandler(async (_req: Request, res: Response) => {
    const groups = await refreshParticipatingGroups();
    return res.status(200).json({
        success: true,
        data: groups,
    });
});

/**
 * POST /api/whatsapp/test
 * Sends a custom test message to a group.
 */
export const sendWhatsAppTestMessageHandler = asyncHandler(async (req: Request, res: Response) => {
    const { message, groupId } = req.body || {};
    const textToSend = message?.trim() || '🧪 Test message from Lead Hunter Club WhatsApp Bot! Automation is active.';

    const result = await sendGroupMessage(textToSend, groupId);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: result.error || 'Failed to send WhatsApp message',
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Test message sent successfully',
        data: { messageId: result.messageId },
    });
});

/**
 * POST /api/whatsapp/alert
 * Triggers a lead drop announcement manually.
 */
export const triggerLeadDropAlertHandler = asyncHandler(async (req: Request, res: Response) => {
    const { count, categories } = req.body || {};
    const leadCount = typeof count === 'number' && count > 0 ? count : 10;
    const leadCategories = Array.isArray(categories) ? categories : ['Web Dev', 'UI/UX', 'Marketing', 'AI'];

    const result = await dispatchLeadDropAlert(leadCount, leadCategories);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: result.error || 'Failed to dispatch lead drop alert',
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Lead drop alert dispatched successfully to WhatsApp group',
    });
});

/**
 * POST /api/whatsapp/reconnect
 * Forces re-initialization of the WhatsApp client.
 */
export const reconnectWhatsAppHandler = asyncHandler(async (_req: Request, res: Response) => {
    await initWhatsAppClient();
    return res.status(200).json({
        success: true,
        message: 'WhatsApp reconnection initiated',
        data: getWhatsAppStatus(),
    });
});
