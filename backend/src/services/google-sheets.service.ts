import { google } from 'googleapis';
import config from '../config';
import ErrorResponse from '../utils/error-response.utils';
import { generateSecureToken } from '../utils/crypto-token.utils';
import * as settingService from './setting.service';
import Claim from '../models/claim.model';

const GOOGLE_SCOPE = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/userinfo.email'];
const OAUTH_STATE_PREFIX = 'google_oauth_state_';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SHEET_NAME = 'Lead_Hunter_Export';
const HEADERS = [
    'claim_id',
    'lead_id',
    'status',
    'lead_name',
    'email',
    'phone',
    'platform',
    'company',
    'lead_url',
    'claimed_at',
    'notes',
];

type GoogleSheetsUserConfig = {
    connected: boolean;
    email?: string | null;
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number | null;
    spreadsheet_id?: string | null;
    sheet_name?: string | null;
    updated_at?: string;
};

function getUserConfigKey(userId: string): string {
    return `google_sheets_user_${userId}`;
}

function getOAuthClient() {
    if (!config.googleOAuth.clientId || !config.googleOAuth.clientSecret || !config.googleOAuth.redirectUri) {
        throw new ErrorResponse('Google OAuth is not configured on server.', 503);
    }

    return new google.auth.OAuth2(
        config.googleOAuth.clientId,
        config.googleOAuth.clientSecret,
        config.googleOAuth.redirectUri
    );
}

async function getUserConfig(userId: string): Promise<GoogleSheetsUserConfig | null> {
    const raw = await settingService.getSetting(getUserConfigKey(userId));
    if (!raw || typeof raw !== 'object') return null;
    return raw as GoogleSheetsUserConfig;
}

async function saveUserConfig(userId: string, cfg: GoogleSheetsUserConfig): Promise<void> {
    await settingService.updateSetting(
        getUserConfigKey(userId),
        {
            ...cfg,
            updated_at: new Date().toISOString(),
        },
        'User Google Sheets integration config'
    );
}

function buildFrontendRedirect(status: 'connected' | 'error', message?: string): string {
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const url = new URL(`${base}/integrations/google-sheets`);
    url.searchParams.set('status', status);
    if (message) url.searchParams.set('message', message);
    return url.toString();
}

function asGoogleSheetsError(err: unknown): ErrorResponse {
    if (err instanceof ErrorResponse) return err;

    const gaxios = err as {
        message?: string;
        response?: {
            status?: number;
            data?: {
                error?: {
                    message?: string;
                    errors?: Array<{ message?: string }>;
                };
            };
        };
    };

    const apiMessage =
        gaxios.response?.data?.error?.message ||
        gaxios.response?.data?.error?.errors?.[0]?.message ||
        gaxios.message ||
        'Google Sheets request failed';
    const status = gaxios.response?.status;

    if (status === 404) {
        return new ErrorResponse(
            'Spreadsheet not found. Check the URL and ensure the sheet is owned by or shared with your connected Google account.',
            400
        );
    }

    if (status === 403) {
        const needsApiEnable =
            /has not been used|is disabled|access not configured/i.test(apiMessage);
        const hint = needsApiEnable
            ? ' Enable the Google Sheets API in Google Cloud Console (APIs & Services → Library → Google Sheets API), then reconnect.'
            : ' Ensure this Google account can edit the spreadsheet.';
        return new ErrorResponse(`Google Sheets access denied.${hint}`, 400);
    }

    if (status === 401) {
        return new ErrorResponse('Google session expired. Click Reconnect Google and try again.', 400);
    }

    return new ErrorResponse(apiMessage, 400);
}

async function withGoogleSheets<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        throw asGoogleSheetsError(err);
    }
}

export async function createGoogleConnectUrl(userId: string): Promise<string> {
    const oauth2Client = getOAuthClient();
    const state = generateSecureToken(16);
    await settingService.updateSetting(
        `${OAUTH_STATE_PREFIX}${state}`,
        { userId, expires_at: Date.now() + OAUTH_STATE_TTL_MS },
        'Temporary Google OAuth state'
    );

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: GOOGLE_SCOPE,
        state,
    });
}

async function resolveOAuthState(state: string): Promise<string> {
    const normalized = state.trim();
    if (!normalized) {
        throw new ErrorResponse('Invalid OAuth state.', 400);
    }

    const raw = await settingService.getSetting(`${OAUTH_STATE_PREFIX}${normalized}`);
    if (!raw || typeof raw !== 'object') {
        throw new ErrorResponse('Invalid OAuth state.', 400);
    }

    const { userId, expires_at } = raw as { userId?: string; expires_at?: number };
    if (!userId || !expires_at || Date.now() > expires_at) {
        throw new ErrorResponse('OAuth state expired. Please connect again.', 400);
    }

    await settingService.deleteSetting(`${OAUTH_STATE_PREFIX}${normalized}`);
    return userId;
}

export async function handleGoogleOAuthCallback(code: string, state: string): Promise<string> {
    const userId = await resolveOAuthState(state);

    const oauth2Client = getOAuthClient();
    const tokenResult = await oauth2Client.getToken(code);
    const tokens = tokenResult.tokens;

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const profile = await oauth2.userinfo.get();

    const existing = await getUserConfig(userId);

    await saveUserConfig(userId, {
        connected: true,
        email: profile.data.email || null,
        access_token: tokens.access_token || existing?.access_token,
        refresh_token: tokens.refresh_token || existing?.refresh_token,
        expiry_date: tokens.expiry_date || existing?.expiry_date || null,
        spreadsheet_id: existing?.spreadsheet_id || null,
        sheet_name: existing?.sheet_name || DEFAULT_SHEET_NAME,
    });

    return buildFrontendRedirect('connected');
}

function extractSpreadsheetId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch?.[1]) return urlMatch[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
    return null;
}

async function getSheetsClientForUser(userId: string) {
    const cfg = await getUserConfig(userId);
    if (!cfg?.connected || !cfg.access_token) {
        throw new ErrorResponse('Google Sheets is not connected for this user.', 400);
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        access_token: cfg.access_token,
        refresh_token: cfg.refresh_token,
        expiry_date: cfg.expiry_date ?? undefined,
    });

    oauth2Client.removeAllListeners('tokens');
    oauth2Client.on('tokens', (tokens) => {
        void saveUserConfig(userId, {
            ...cfg,
            connected: true,
            access_token: tokens.access_token || cfg.access_token,
            refresh_token: tokens.refresh_token || cfg.refresh_token,
            expiry_date: tokens.expiry_date ?? cfg.expiry_date ?? null,
        });
    });

    return { cfg, sheets: google.sheets({ version: 'v4', auth: oauth2Client }) };
}

async function ensureSheetTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, sheetName: string): Promise<void> {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some((s) => s.properties?.title === sheetName);
    if (exists) return;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: { title: sheetName },
                    },
                },
            ],
        },
    });
}

async function ensureHeaders(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, sheetName: string): Promise<void> {
    const firstRow = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`,
    });

    const rowValues = firstRow.data.values?.[0] || [];
    if (rowValues.length > 0) return;

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!1:1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
    });
}

function normalizeClaimsRows(claims: any[]) {
    return claims.map((claim) => {
        const lead = claim.leadId || {};
        const phone = lead.contact_info?.phone_numbers?.[0]?.number || '';
        return [
            claim._id?.toString?.() || '',
            lead._id?.toString?.() || '',
            claim.status || '',
            lead.author?.name || lead.contact_info?.name || '',
            lead.email || '',
            phone,
            lead.platform || '',
            lead.contact_info?.company_name || '',
            lead.url || '',
            claim.createdAt || claim.timestamp || '',
            claim.notes || '',
        ];
    });
}

export async function getGoogleSheetsStatus(userId: string) {
    const cfg = await getUserConfig(userId);
    if (!cfg) {
        return {
            connected: false,
            email: null,
            spreadsheet_id: null,
            sheet_name: DEFAULT_SHEET_NAME,
        };
    }

    return {
        connected: !!cfg.connected,
        email: cfg.email || null,
        spreadsheet_id: cfg.spreadsheet_id || null,
        sheet_name: cfg.sheet_name || DEFAULT_SHEET_NAME,
    };
}

export async function saveGoogleSheetsTarget(userId: string, spreadsheetInput: string, sheetName?: string) {
    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
    if (!spreadsheetId) {
        throw new ErrorResponse('Invalid Google Sheet URL or spreadsheet ID.', 400);
    }

    const tabName = (sheetName || DEFAULT_SHEET_NAME).trim();
    if (!tabName) {
        throw new ErrorResponse('Sheet tab name is required.', 400);
    }

    const { cfg, sheets } = await getSheetsClientForUser(userId);

    await withGoogleSheets(async () => {
        await sheets.spreadsheets.get({ spreadsheetId });
        await ensureSheetTab(sheets, spreadsheetId, tabName);
        await ensureHeaders(sheets, spreadsheetId, tabName);
    });

    const updated: GoogleSheetsUserConfig = {
        ...cfg,
        connected: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: tabName,
    };
    await saveUserConfig(userId, updated);

    return {
        connected: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: tabName,
    };
}

export async function disconnectGoogleSheets(userId: string) {
    await saveUserConfig(userId, {
        connected: false,
        email: null,
        access_token: undefined,
        refresh_token: undefined,
        expiry_date: null,
        spreadsheet_id: null,
        sheet_name: DEFAULT_SHEET_NAME,
    });
}

export async function exportClaimsToGoogleSheets(userId: string) {
    const { cfg, sheets } = await getSheetsClientForUser(userId);
    if (!cfg.spreadsheet_id) {
        throw new ErrorResponse('No Google Sheet configured. Save a spreadsheet first.', 400);
    }
    const sheetName = cfg.sheet_name || DEFAULT_SHEET_NAME;
    const spreadsheetId = cfg.spreadsheet_id;

    const claims = await Claim.find({ userId }, { populate: 'leadId' });
    if (claims.length === 0) {
        return { exported: 0, skipped: 0, message: 'No claimed leads to export.' };
    }

    return withGoogleSheets(async () => {
        await ensureSheetTab(sheets, spreadsheetId, sheetName);
        await ensureHeaders(sheets, spreadsheetId, sheetName);

        const existing = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A2:A`,
        });
        const existingIds = new Set((existing.data.values || []).map((row) => row[0]));

        const rows = normalizeClaimsRows(claims);
        const pendingRows = rows.filter((row) => !existingIds.has(row[0]));

        if (pendingRows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A:K`,
                valueInputOption: 'RAW',
                requestBody: { values: pendingRows },
            });
        }

        return {
            exported: pendingRows.length,
            skipped: rows.length - pendingRows.length,
            spreadsheet_id: spreadsheetId,
            sheet_name: sheetName,
        };
    });
}
