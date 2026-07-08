import crypto from 'crypto';
import config from '../config';

type EncryptedPayload = {
    __enc: true;
    v: 1;
    iv: string;
    tag: string;
    data: string;
};

const ALGO = 'aes-256-gcm';

function getEncryptionKey(): Buffer | null {
    const raw = config.security.settingsEncryptionKey?.trim();
    if (!raw) return null;

    try {
        const key = Buffer.from(raw, 'base64');
        if (key.length !== 32) return null;
        return key;
    } catch {
        return null;
    }
}

export function canEncryptSettings(): boolean {
    return !!getEncryptionKey();
}

export function encryptSettingValue(value: unknown): unknown {
    const key = getEncryptionKey();
    if (!key) return value;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const plain = JSON.stringify(value);

    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
        __enc: true,
        v: 1,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted.toString('base64'),
    };

    return payload;
}

export function decryptSettingValue(value: unknown): unknown {
    const key = getEncryptionKey();
    if (!key || !value || typeof value !== 'object') return value;

    const payload = value as Partial<EncryptedPayload>;
    if (!payload.__enc || payload.v !== 1 || !payload.iv || !payload.tag || !payload.data) {
        return value;
    }

    try {
        const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(payload.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(payload.data, 'base64')),
            decipher.final(),
        ]).toString('utf8');
        return JSON.parse(decrypted);
    } catch {
        // Keep app functional; caller can still treat this as unavailable setting.
        return null;
    }
}
