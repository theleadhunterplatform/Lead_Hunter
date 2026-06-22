export const createKeywordSchema = {
    type: "object",
    properties: {
        text: { type: "string", minLength: 1, maxLength: 500 },
        platforms: { 
            type: "array", 
            items: { type: "string", enum: ["linkedin", "twitter", "reddit", "threads"] } 
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
            items: { type: "string", enum: ["linkedin", "twitter", "reddit", "threads"] } 
        }
    },
    additionalProperties: false
};
