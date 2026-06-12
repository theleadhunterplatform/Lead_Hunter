export const createApifyKeySchema = {
    type: "object",
    properties: {
        key: { type: "string", minLength: 1 },
        label: { type: "string" }
    },
    required: ["key"],
    additionalProperties: false
};

export const updateApifyKeySchema = {
    type: "object",
    properties: {
        key: { type: "string", minLength: 1 },
        label: { type: "string" },
        is_active: { type: "boolean" }
    },
    additionalProperties: false
};
