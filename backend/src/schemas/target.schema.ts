export const createTargetSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1 },
        url: { type: 'string', minLength: 1 },
        platform: { type: 'string', enum: ['linkedin', 'twitter', 'threads'] },
        notes: { type: ['string', 'null'] },
    },
    required: ['name', 'url'],
    additionalProperties: false,
};

export const updateTargetSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1 },
        url: { type: 'string', minLength: 1 },
        platform: { type: 'string', enum: ['linkedin', 'twitter', 'threads'] },
        notes: { type: ['string', 'null'] },
        is_active: { type: 'boolean' },
    },
    additionalProperties: false,
};
