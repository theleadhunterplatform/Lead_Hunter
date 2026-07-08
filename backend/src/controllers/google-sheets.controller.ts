import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import * as googleSheetsService from '../services/google-sheets.service';
import ErrorResponse from '../utils/error-response.utils';

export const getGoogleSheetsConnectUrl = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const url = googleSheetsService.createGoogleConnectUrl((user._id || user.id).toString());
    return res.status(200).json({ success: true, data: { auth_url: url } });
});

export const handleGoogleSheetsCallback = asyncHandler(async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code || !state) {
        return res.redirect('http://localhost:3000/integrations/google-sheets?status=error&message=Missing+oauth+code');
    }

    try {
        const redirectTo = await googleSheetsService.handleGoogleOAuthCallback(code, state);
        return res.redirect(redirectTo);
    } catch (error: any) {
        const message = encodeURIComponent(error?.message || 'OAuth callback failed');
        const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
        return res.redirect(`${base}/integrations/google-sheets?status=error&message=${message}`);
    }
});

export const getGoogleSheetsStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const data = await googleSheetsService.getGoogleSheetsStatus((user._id || user.id).toString());
    return res.status(200).json({ success: true, data });
});

export const saveGoogleSheetsConfig = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const spreadsheetInput = req.body?.spreadsheet_url || req.body?.spreadsheet_id;
    if (!spreadsheetInput) {
        throw new ErrorResponse('spreadsheet_url or spreadsheet_id is required', 400);
    }

    const data = await googleSheetsService.saveGoogleSheetsTarget(
        (user._id || user.id).toString(),
        spreadsheetInput,
        req.body?.sheet_name
    );
    return res.status(200).json({ success: true, data, message: 'Google Sheet configuration saved.' });
});

export const exportGoogleSheets = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const data = await googleSheetsService.exportClaimsToGoogleSheets((user._id || user.id).toString());
    return res.status(200).json({ success: true, data });
});

export const disconnectGoogleSheets = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    await googleSheetsService.disconnectGoogleSheets((user._id || user.id).toString());
    return res.status(200).json({ success: true, message: 'Google Sheets disconnected.' });
});
