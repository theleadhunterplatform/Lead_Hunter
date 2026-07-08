import Setting from '../models/setting.model';
import {
    canEncryptSettings,
    decryptSettingValue,
    encryptSettingValue,
} from '../utils/settings-crypto.utils';

const SENSITIVE_SETTING_KEYS = new Set([
    'contact_compass_token',
    'contactout_api_token',
    'hunter_api_key',
    'apollo_api_key',
]);

function isSensitiveSettingKey(key: string): boolean {
    return SENSITIVE_SETTING_KEYS.has(key) || key.startsWith('google_sheets_user_');
}

export const getSetting = async (key: string) => {
    const setting = await Setting.findOne({ key, is_deleted: false });
    if (!setting) return null;

    if (isSensitiveSettingKey(key)) {
        return decryptSettingValue(setting.value);
    }

    return setting.value;
};

export const updateSetting = async (key: string, value: any, description?: string) => {
    const nextValue = isSensitiveSettingKey(key) && canEncryptSettings()
        ? encryptSettingValue(value)
        : value;

    const setting = await Setting.findOneAndUpdate(
        { key },
        { value: nextValue, description, is_deleted: false },
        { upsert: true, new: true }
    );
    return setting;
};

export const deleteSetting = async (key: string) => {
    await Setting.findOneAndUpdate({ key }, { is_deleted: true, deleted_at: new Date() });
};
