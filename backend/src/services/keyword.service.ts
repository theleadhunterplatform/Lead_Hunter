import Keyword from '../models/keyword.model';
import ErrorResponse from '../utils/error-response.utils';

export const getAllKeywords = async () => {
    return await Keyword.find({ is_deleted: false }, { sort: { created_at: -1 } });
};

export const getKeywordById = async (id: string) => {
    const keyword = await Keyword.findOne({ _id: id, is_deleted: false });
    if (!keyword) {
        throw new ErrorResponse(`Keyword not found with id of ${id}`, 404);
    }
    return keyword;
};

export const createKeyword = async (data: { text: string; platforms?: string[] }) => {
    // Check if keyword exists (including soft deleted)
    const existing = await Keyword.findOne({ text: data.text.trim() });
    
    if (existing) {
        if (existing.is_deleted) {
            existing.is_deleted = false;
            existing.deleted_at = null;
            existing.is_active = true;
            if (data.platforms) existing.platforms = data.platforms;
            await existing.save();
            return existing;
        }
        throw new ErrorResponse('Keyword already exists', 400);
    }

    return await Keyword.create({
        text: data.text.trim(),
        platforms: data.platforms || ['linkedin']
    });
};

export const updateKeyword = async (id: string, data: any) => {
    const keyword = await Keyword.findOneAndUpdate(
        { _id: id, is_deleted: false },
        data,
        { new: true, runValidators: true }
    );

    if (!keyword) {
        throw new ErrorResponse(`Keyword not found with id of ${id}`, 404);
    }

    return keyword;
};

export const deleteKeyword = async (id: string) => {
    const keyword = await Keyword.findById(id);

    if (!keyword) {
        throw new ErrorResponse(`Keyword not found with id of ${id}`, 404);
    }

    // Soft delete
    keyword.is_deleted = true;
    keyword.deleted_at = new Date();
    keyword.is_active = false;
    await keyword.save();

    return keyword;
};
export const bulkCreateKeywords = async (data: { texts: string[]; platforms: string[] }) => {
    const results = [];
    for (const text of data.texts) {
        if (!text.trim()) continue;
        try {
            const kw = await createKeyword({ text: text.trim(), platforms: data.platforms });
            results.push(kw);
        } catch (err) {
            // Skip duplicates in bulk add
            console.log(`Skipping duplicate: ${text}`);
        }
    }
    return results;
};

export const bulkUpdateKeywords = async (ids: string[], updateData: any) => {
    return await Keyword.updateMany(
        { _id: { $in: ids }, is_deleted: false },
        { $set: updateData },
        { runValidators: true }
    );
};

export const bulkDeleteKeywords = async (ids: string[]) => {
    return await Keyword.updateMany(
        { _id: { $in: ids } },
        { 
            $set: { 
                is_deleted: true, 
                deleted_at: new Date(),
                is_active: false 
            } 
        }
    );
};
