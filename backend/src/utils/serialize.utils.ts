const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const isValidId = (id: string): boolean => UUID_REGEX.test(id) || MONGO_ID_REGEX.test(id);

export const toApiDoc = <T extends Record<string, unknown>>(record: T | null): any => {
    if (!record) return null;

    const doc: Record<string, unknown> = { ...record };

    if (typeof doc.id === 'string') {
        doc._id = doc.id;
    }

    if (doc.organizationId !== undefined) {
        doc.organization = doc.organizationId;
    }

    if (doc.scopeType !== undefined) {
        doc.scope = {
            type: doc.scopeType,
            organizationId: doc.organizationId ?? null,
        };
    }

    if (doc.role && typeof doc.role === 'object') {
        doc.roleId = toApiDoc(doc.role as Record<string, unknown>);
    }

    if (doc.user && typeof doc.user === 'object') {
        doc.userId = toApiDoc(doc.user as Record<string, unknown>);
    }

    if (doc.lead && typeof doc.lead === 'object') {
        doc.leadId = toApiDoc(doc.lead as Record<string, unknown>);
    }

    if (doc.keywordRef && typeof doc.keywordRef === 'object') {
        doc.keyword_id = toApiDoc(doc.keywordRef as Record<string, unknown>);
    }

    return doc;
};

export const toApiDocs = (records: Record<string, unknown>[]): any[] => records.map(toApiDoc);
