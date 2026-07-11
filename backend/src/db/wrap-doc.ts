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

            // Capture org id before stripping relation-shaped fields
            const orgValue = data.organization;
            if (typeof orgValue === 'string') {
                data.organizationId = orgValue;
            } else if (orgValue && typeof orgValue === 'object') {
                data.organizationId =
                    (orgValue as any).id || (orgValue as any)._id || data.organizationId;
            }

            delete data.organization;
            delete data.scope;
            delete data.roleId;
            delete data.userId;
            delete data.leadId;
            delete data.lead;
            delete data.user;
            delete data.role;
            delete data.keywordRef;
            delete data.createdAt;
            delete data.updatedAt;
            delete data.created_at;
            delete data.updated_at;
            delete data._id;
            // Never persist password via blanket save() — avoids double-hash / accidental overwrite
            delete data.password;
            delete data.comparePassword;

            const updated = await updateFn(this.id || this._id, data);
            const wrapped = wrapDoc(updated, updateFn, extras);
            Object.keys(this).forEach((key) => delete this[key]);
            Object.assign(this, wrapped);
            return this;
        },
    };

    return doc;
};
