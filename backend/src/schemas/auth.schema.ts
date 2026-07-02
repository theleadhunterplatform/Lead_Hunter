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

export const forgotPasswordSchema = {
    type: "object",
    properties: {
        email: { type: "string", format: "email" },
    },
    required: ["email"],
    additionalProperties: false,
};

export const resetPasswordSchema = {
    type: "object",
    properties: {
        token: { type: "string", minLength: 10 },
        password: { type: "string", minLength: 6 },
    },
    required: ["token", "password"],
    additionalProperties: false,
};

export const changePasswordSchema = {
    type: "object",
    properties: {
        current_password: { type: "string" },
        new_password: { type: "string", minLength: 6 },
    },
    required: ["current_password", "new_password"],
    additionalProperties: false,
};
