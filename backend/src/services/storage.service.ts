import fs from 'fs';
import path from 'path';

export interface IStorageService {
    uploadFile(filePath: string, folder: string): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
}

/**
 * Local Storage implementation for development.
 * Can be easily swapped with an S3Storage implementation for production.
 */
class LocalStorageService implements IStorageService {
    private uploadsBase = path.join(__dirname, '../../uploads');

    async uploadFile(tempPath: string, folder: string): Promise<string> {
        const fileName = path.basename(tempPath);
        const targetDir = path.join(this.uploadsBase, folder);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(tempPath, targetPath);
        
        // Return the relative URL
        return `/uploads/${folder}/${fileName}`;
    }

    async deleteFile(fileUrl: string): Promise<void> {
        const relativePath = fileUrl.replace('/uploads/', '');
        const fullPath = path.join(this.uploadsBase, relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
}

export const storageService = new LocalStorageService();
