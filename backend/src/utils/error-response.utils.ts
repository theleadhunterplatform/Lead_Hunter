class ErrorResponse extends Error {
    statusCode: number;
    errors?: any[];

    constructor(message: string, statusCode: number, errors?: any[]) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default ErrorResponse;
