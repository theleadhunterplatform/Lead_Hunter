export const labelPostSchema = {
    type: "object",
    properties: {
        status: { type: "string", enum: ["pending", "relevant", "irrelevant"] },
        is_training_data: { type: "boolean" }
    },
    additionalProperties: false
};
