import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as authService from '../services/auth.service';
import * as supabaseAuth from '../services/supabase-auth.service';
import ErrorResponse from '../utils/error-response.utils';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.registerUser(req.body);

    res.status(201).json({
        success: true,
        data: result
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.loginUser(req.body);

    res.status(200).json({
        success: true,
        data: result
    });
});

// @desc    Exchange Supabase Auth token (phone OTP) for Lead Hunter JWTs
// @route   POST /api/auth/supabase
// @access  Public
export const supabaseLogin = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const accessToken = req.body?.access_token || req.body?.accessToken;
    if (!accessToken || typeof accessToken !== 'string') {
        throw new ErrorResponse('access_token is required (Supabase session access_token).', 400);
    }

    const data = await supabaseAuth.loginWithSupabaseToken({
        access_token: accessToken,
        name: req.body?.name,
    });

    const status = (data as any).approval_required ? 201 : 200;
    res.status(status).json({
        success: true,
        data,
        message: (data as any).message,
    });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    // req.user is populated by protect middleware
    res.status(200).json({
        success: true,
        data: req.user
    });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.refreshUserToken(req.body.refresh_token);
    res.status(200).json({
        success: true,
        data: result
    });
});

// @desc    Get organization users
// @route   GET /api/auth/organization/users
// @access  Private (Org Admin/System Owner/Admin)
export const getOrganizationUsers = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const orgId = req.headers['x-org-id'] as string;
    const result = await authService.getOrgUsers(req.user as any, orgId);
    res.status(200).json({
        success: true,
        data: result
    });
});

// @desc    Add user to organization
// @route   POST /api/auth/organization/users
// @access  Private (Org Admin/System Owner/Admin)
export const addOrganizationUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.addOrgUser(req.user as any, req.body);
    res.status(201).json({
        success: true,
        data: result
    });
});
// @desc    Toggle user access
// @route   PUT /api/auth/organization/users/:id/access
// @access  Private (Org Admin/System Owner/Admin)
export const toggleUserAccess = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.updateUserAccess(req.user as any, req.params.id as string, req.body.lead_access_enabled);
    res.status(200).json({
        success: true,
        data: result
    });
});

export const deactivateOrganizationUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await authService.deactivateOrgUser(req.user as any, req.params.id as string);
    res.status(200).json({
        success: true,
        message: 'User deactivated',
    });
});

// @desc    Get authorized organizations
// @route   GET /api/auth/organizations
// @access  Private
export const getOrganizations = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.getUserOrganizations(req.user as any);
    res.status(200).json({
        success: true,
        data: result
    });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.requestPasswordReset(req.body.email);
    res.status(200).json({ success: true, ...result });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ success: true, ...result });
});

export const changePassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const result = await authService.changePassword(
        user._id.toString(),
        req.body.current_password,
        req.body.new_password
    );
    res.status(200).json({ success: true, ...result });
});
