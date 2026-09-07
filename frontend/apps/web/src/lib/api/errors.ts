export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'AuthError'
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, string[]>) {
    const first = Object.values(details).flat()[0]
    super(first || 'Validation failed', 422, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}
