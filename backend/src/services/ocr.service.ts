import fs from 'fs';
import sharp from 'sharp';
import { Jimp } from 'jimp';
import config from '../config';

/**
 * Extracts text from an image using the local AI OCR microservice (EasyOCR)
 * @param imagePath Path to the local image file
 * @returns Extracted text or empty string on failure
 */
export interface AIClassification {
    label: 'relevant' | 'irrelevant';
    confidence: number;
}

export interface OCRResult {
    text: string;
    classification?: AIClassification;
}

/**
 * Extracts text and classifies it using the local AI service
 */
export const extractTextFromImage = async (imagePath: string): Promise<OCRResult> => {
    try {
        if (!fs.existsSync(imagePath)) {
            console.error(`[AI-OCR] Image not found: ${imagePath}`);
            return { text: '' };
        }

        // Sanitize and repair the image before sending to AI
        let fileBuffer: Buffer;
        let mimeType = 'image/png';

        try {
            // Stage 1: Sharp PNG (Strict/Fast)
            fileBuffer = await sharp(imagePath, { failOnError: false }).png().toBuffer();
            console.log(`[AI-OCR] Image repaired (Sharp PNG): ${imagePath}`);
            mimeType = 'image/png';
        } catch (err1: any) {
            try {
                // Stage 2: Sharp JPEG (Forgiving C++)
                fileBuffer = await sharp(imagePath, { failOnError: false }).jpeg().toBuffer();
                console.log(`[AI-OCR] Image repaired (Sharp JPEG Fallback): ${imagePath}`);
                mimeType = 'image/jpeg';
            } catch (err2: any) {
                try {
                    // Stage 3: Jimp (Pure JS - Indestructible)
                    console.log(`[AI-OCR] Sharp failed. Using Jimp (Pure JS) for: ${imagePath}`);
                    const image = await Jimp.read(imagePath);
                    fileBuffer = Buffer.from(await image.getBuffer('image/jpeg'));
                    console.log(`[AI-OCR] Image repaired (Jimp Final Fallback): ${imagePath}`);
                    mimeType = 'image/jpeg';
                } catch (err3: any) {
                    console.error(`[AI-OCR] ALL repairs failed for ${imagePath}: ${err3.message}`);
                    fileBuffer = fs.readFileSync(imagePath);
                    mimeType = 'image/png';
                }
            }
        }

        const fileName = mimeType === 'image/jpeg' ? 'image.jpg' : 'image.png';
        const file = new File([new Uint8Array(fileBuffer)], fileName, { type: mimeType });
        
        const formData = new FormData();
        formData.append('file', file);

        // Call the Python AI Service
        const response = await fetch(`${config.aiService.url}/ocr`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error(`[AI-OCR] Service error: ${response.statusText}`);
            return { text: '' };
        }

        const result = await response.json() as any;
        
        if (result.success) {
            console.log(`[AI-OCR] Successfully extracted text and classified.`);
            return {
                text: result.text || '',
                classification: result.classification
            };
        } else {
            console.warn(`[AI-OCR] Extraction warning: ${result.error}`);
            return { text: '' };
        }
    } catch (error: any) {
        if (error.cause?.code === 'ECONNREFUSED') {
            console.error('[AI-OCR] Service is offline.');
        } else {
            console.error('[AI-OCR] Unexpected error:', error.message);
        }
        return { text: '' };
    }
};

/**
 * Classifies existing text content without re-running OCR
 */
export const classifyText = async (text: string): Promise<AIClassification | null> => {
    try {
        if (!text || text.trim().length === 0) return null;

        const response = await fetch(`${config.aiService.url}/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) return null;

        const result = await response.json() as any;
        if (result.success) {
            return {
                label: result.label,
                confidence: result.confidence
            };
        }
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * Basic text cleanup (still useful for standardizing AI output)
 */
export const cleanExtractedText = (text: string): string => {
    if (!text) return '';
    
    return text
        .replace(/[\n\r]+/g, ' ') // Replace newlines with spaces
        .replace(/\s\s+/g, ' ')   // Replace multiple spaces
        .trim();
};

/**
 * Triggers model retraining on the AI service using labeled leads from the database
 */
const TRAIN_TIMEOUT_MS = 120_000;
const TRAIN_MAX_SAMPLES = 400;
const TRAIN_MAX_CONTENT_CHARS = 1500;

function prepareTrainPayload(samples: Array<{ content: string; label: string }>) {
    const relevant: Array<{ content: string; label: string }> = [];
    const irrelevant: Array<{ content: string; label: string }> = [];
    const seen = new Set<string>();

    for (const sample of samples) {
        const label = sample.label;
        if (label !== 'relevant' && label !== 'irrelevant') continue;

        let content = (sample.content || '').trim();
        if (content.length <= 10) continue;
        if (content.length > TRAIN_MAX_CONTENT_CHARS) {
            content = content.slice(0, TRAIN_MAX_CONTENT_CHARS);
        }

        const key = `${label}:${content.slice(0, 200)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const row = { content, label };
        if (label === 'irrelevant') irrelevant.push(row);
        else relevant.push(row);
    }

    // Keep both classes in the payload (up to half each).
    const half = Math.floor(TRAIN_MAX_SAMPLES / 2);
    return [...irrelevant.slice(0, half), ...relevant.slice(0, half)];
}

async function wakeAiService(baseUrl: string): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20_000);
            const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) return true;
        } catch (err: any) {
            console.warn(`[AI-Train] Wake attempt ${attempt}/3 failed: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    return false;
}

export const trainModel = async (
    samples: Array<{ content: string; label: string }>
): Promise<{ success: boolean; message: string; output?: string; error?: string; metrics?: any }> => {
    const baseUrl = config.aiService.url.replace(/\/+$/, '');
    const payload = prepareTrainPayload(samples);

    if (payload.length < 8) {
        return {
            success: false,
            message: 'Not enough unique labeled samples to train',
            error: `Need at least 8 unique samples, got ${payload.length}`,
        };
    }

    try {
        const awake = await wakeAiService(baseUrl);
        if (!awake) {
            console.warn('[AI-Train] AI service health check failed — attempting train anyway');
        }

        console.log(`[AI-Train] Sending ${payload.length} unique samples to AI service (from ${samples.length} weighted)...`);

        let lastError = 'Bad Gateway';
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), TRAIN_TIMEOUT_MS);
                const response = await fetch(`${baseUrl}/train`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: payload }),
                    signal: controller.signal,
                });
                clearTimeout(timer);

                if (!response.ok) {
                    let errorDetail = response.statusText;
                    try {
                        const errorData = await response.json() as any;
                        errorDetail = errorData.detail || errorData.error || errorData.message || errorDetail;
                    } catch {
                        // ignore non-JSON bodies
                    }

                    lastError = errorDetail;
                    console.error(`[AI-Train] Failed (${response.status}) attempt ${attempt}/2 at ${baseUrl}/train — ${errorDetail}`);

                    if ((response.status === 502 || response.status === 503) && attempt < 2) {
                        await wakeAiService(baseUrl);
                        await new Promise((r) => setTimeout(r, 3000));
                        continue;
                    }

                    return {
                        success: false,
                        message: 'AI Service failed during training',
                        error: errorDetail,
                    };
                }

                const result = await response.json() as any;
                return {
                    success: result.success,
                    message: result.message || 'Training completed',
                    output: result.output,
                    error: result.error,
                    metrics: result.metrics,
                };
            } catch (err: any) {
                lastError = err.name === 'AbortError' ? 'Training timed out after 120s' : err.message;
                console.error(`[AI-Train] Attempt ${attempt}/2 error:`, lastError);
                if (attempt < 2) {
                    await wakeAiService(baseUrl);
                    await new Promise((r) => setTimeout(r, 3000));
                    continue;
                }
            }
        }

        return {
            success: false,
            message: 'Failed to connect to AI Service',
            error: lastError,
        };
    } catch (error: any) {
        console.error('[AI-Train] Connection error:', error.message);
        return {
            success: false,
            message: 'Failed to connect to AI Service',
            error: error.message,
        };
    }
};
