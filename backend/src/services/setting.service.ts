import Setting from '../models/setting.model';

export const getSetting = async (key: string) => {
    const setting = await Setting.findOne({ key, is_deleted: false });
    return setting ? setting.value : null;
};

export const updateSetting = async (key: string, value: any, description?: string) => {
    const setting = await Setting.findOneAndUpdate(
        { key },
        { value, description, is_deleted: false },
        { upsert: true, new: true }
    );
    return setting;
};

export const deleteSetting = async (key: string) => {
    await Setting.findOneAndUpdate({ key }, { is_deleted: true, deleted_at: new Date() });
};
