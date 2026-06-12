import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as keywordService from '../services/keyword.service';

// @desc    Get all keywords
// @route   GET /api/keywords
// @access  Private
export const getKeywords = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const keywords = await keywordService.getAllKeywords();

    res.status(200).json({
        success: true,
        count: keywords.length,
        data: keywords
    });
});

// @desc    Get single keyword
// @route   GET /api/keywords/:id
// @access  Private
export const getKeyword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const keyword = await keywordService.getKeywordById(req.params.id as string);

    res.status(200).json({
        success: true,
        data: keyword
    });
});

// @desc    Add keyword
// @route   POST /api/keywords
// @access  Private
export const addKeyword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const keyword = await keywordService.createKeyword(req.body);

    res.status(201).json({
        success: true,
        data: keyword
    });
});

// @desc    Update keyword
// @route   PUT /api/keywords/:id
// @access  Private
export const updateKeyword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const keyword = await keywordService.updateKeyword(req.params.id as string, req.body);

    res.status(200).json({
        success: true,
        data: keyword
    });
});

// @desc    Delete keyword (Soft Delete)
// @route   DELETE /api/keywords/:id
// @access  Private
export const deleteKeyword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await keywordService.deleteKeyword(req.params.id as string);

    res.status(200).json({
        success: true,
        data: {}
    });
});
// @desc    Bulk add keywords
// @route   POST /api/keywords/bulk
// @access  Private
export const addBulkKeywords = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const keywords = await keywordService.bulkCreateKeywords(req.body);

    res.status(201).json({
        success: true,
        count: keywords.length,
        data: keywords
    });
});

// @desc    Bulk update keywords
// @route   PUT /api/keywords/bulk
// @access  Private
export const updateBulkKeywords = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { ids, updateData } = req.body;
    const result = await keywordService.bulkUpdateKeywords(ids, updateData);

    res.status(200).json({
        success: true,
        data: result
    });
});

// @desc    Bulk delete keywords
// @route   DELETE /api/keywords/bulk
// @access  Private
export const deleteBulkKeywords = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { ids } = req.body;
    await keywordService.bulkDeleteKeywords(ids);

    res.status(200).json({
        success: true,
        data: {}
    });
});
