export const createKeywordSchema = {
    type: "object",
    properties: {
        text: { type: "string", minLength: 1 },
        platforms: { 
            type: "array", 
            items: { type: "string", enum: ["linkedin", "twitter", "reddit"] } 
        }
    },
    required: ["text"],
    additionalProperties: false
};

export const updateKeywordSchema = {
    type: "object",
    properties: {
        text: { type: "string", minLength: 1 },
        is_active: { type: "boolean" },
        platforms: { 
            type: "array", 
            items: { type: "string", enum: ["linkedin", "twitter", "reddit"] } 
        }
    },
    additionalProperties: false
};
