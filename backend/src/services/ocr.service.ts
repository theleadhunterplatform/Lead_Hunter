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
export const trainModel = async (
    samples: Array<{ content: string; label: string }>
): Promise<{ success: boolean; message: string; output?: string; error?: string; metrics?: any }> => {
    try {
        console.log(`[AI-Train] Sending ${samples.length} labeled samples to AI service...`);
        const response = await fetch(`${config.aiService.url}/train`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: samples }),
        });

        if (!response.ok) {
            let errorDetail = response.statusText;
            try {
                const errorData = await response.json() as any;
                errorDetail = errorData.detail || errorData.error || errorData.message || errorDetail;
            } catch {
                // ignore non-JSON bodies
            }
            console.error(`[AI-Train] Failed (${response.status}) at ${config.aiService.url}/train — ${errorDetail}`);
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
    } catch (error: any) {
        console.error('[AI-Train] Connection error:', error.message);
        return { 
            success: false, 
            message: 'Failed to connect to AI Service',
            error: error.message 
        };
    }
};
