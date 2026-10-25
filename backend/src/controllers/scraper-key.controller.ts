import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as scraperKeyService from '../services/scraper-key.service';

// @desc    Get all keys for a scraper engine
// @route   GET /api/scraper-keys/:engine
// @access  Private (scraping:manage)
export const getScraperKeys = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine } = req.params;
    const keys = await scraperKeyService.getAllScraperKeys(engine as string);

    res.status(200).json({
        success: true,
        engine,
        count: keys.length,
        data: keys,
    });
});

// @desc    Add single key to a scraper engine pool
// @route   POST /api/scraper-keys/:engine
// @access  Private (scraping:manage)
export const addScraperKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine } = req.params;
    const { key, label } = req.body;

    const newKey = await scraperKeyService.addScraperKey(engine as string, { key, label });

    res.status(201).json({
        success: true,
        data: newKey,
    });
});

// @desc    Bulk add keys to a scraper engine pool
// @route   POST /api/scraper-keys/:engine/bulk
// @access  Private (scraping:manage)
export const bulkAddScraperKeys = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'Invalid or empty items array' });
        return;
    }

    const result = await scraperKeyService.bulkAddScraperKeys(engine as string, items);

    res.status(200).json({
        success: true,
        addedCount: result.added,
        updatedCount: result.updated,
        data: result.keys,
    });
});

// @desc    Update a scraper key (label, active state)
// @route   PUT /api/scraper-keys/:engine/:id
// @access  Private (scraping:manage)
export const updateScraperKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine, id } = req.params;
    const updated = await scraperKeyService.updateScraperKey(engine as string, id as string, req.body);

    res.status(200).json({
        success: true,
        data: updated,
    });
});

// @desc    Delete a scraper key
// @route   DELETE /api/scraper-keys/:engine/:id
// @access  Private (scraping:manage)
export const deleteScraperKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine, id } = req.params;
    await scraperKeyService.deleteScraperKey(engine as string, id as string);

    res.status(200).json({
        success: true,
        data: {},
    });
});

// @desc    Bulk delete scraper keys
// @route   DELETE /api/scraper-keys/:engine/bulk
// @access  Private (scraping:manage)
export const bulkDeleteScraperKeys = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine } = req.params;
    const { ids, all } = req.body || {};

    const count = await scraperKeyService.bulkDeleteScraperKeys(engine as string, { ids, all });

    res.status(200).json({
        success: true,
        deletedCount: count,
    });
});

// @desc    Test/verify a scraper key with provider API
// @route   POST /api/scraper-keys/:engine/test
// @access  Private (scraping:manage)
export const testScraperKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { engine } = req.params;
    const { key } = req.body;

    const result = await scraperKeyService.testScraperKey(engine as string, key as string);

    res.status(200).json({
        success: true,
        ...result,
    });
});
