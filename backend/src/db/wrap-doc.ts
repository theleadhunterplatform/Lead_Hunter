import { toApiDoc } from '../utils/serialize.utils';

type UpdateFn = (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;

const mutableFields = new Set(['save', 'comparePassword', '_id', 'id']);

export const wrapDoc = (
    record: Record<string, unknown>,
    updateFn: UpdateFn,
    extras?: Record<string, unknown>
) => {
    const doc: any = {
        ...toApiDoc(record),
        ...extras,
        async save() {
            const data: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(this)) {
                if (!mutableFields.has(key) && typeof value !== 'function') {
                    data[key] = value;
                }
            }

            delete data.organization;
            delete data.scope;
            delete data.roleId;
            delete data.userId;
            delete data.leadId;
            delete data.createdAt;
            delete data.updatedAt;
            delete data.created_at;
            delete data.updated_at;
            delete data._id;

            if (data.organization && typeof data.organization === 'object') {
                data.organizationId = (data.organization as any).id || (data.organization as any)._id;
            }

            const updated = await updateFn(this.id || this._id, data);
            const wrapped = wrapDoc(updated, updateFn, extras);
            Object.keys(this).forEach((key) => delete this[key]);
            Object.assign(this, wrapped);
            return this;
        },
    };

    return doc;
};
