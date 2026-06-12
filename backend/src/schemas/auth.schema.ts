export const registerSchema = {
    type: "object",
    properties: {
        name: { type: "string", minLength: 2 },
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 6 },
        organization_name: { type: "string", minLength: 2 },
        referred_by: { type: "string" }
    },
    required: ["name", "email", "password"],
    additionalProperties: false
};

export const loginSchema = {
    type: "object",
    properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" }
    },
    required: ["email", "password"],
    additionalProperties: false
};
