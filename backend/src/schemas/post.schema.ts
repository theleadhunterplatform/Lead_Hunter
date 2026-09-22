export const manualContactSchema = {
    type: "object",
    properties: {
        email: { type: "string" },
        phone: { type: "string" },
        note: { type: "string", maxLength: 500 },
        credit_cost: { type: ["number", "null"] },
        creditCost: { type: ["number", "null"] }
    },
    additionalProperties: false
};

export const labelPostSchema = {
    type: "object",
    properties: {
        status: { type: "string", enum: ["pending", "relevant", "irrelevant"] },
        is_training_data: { type: "boolean" }
    },
    additionalProperties: false
};
