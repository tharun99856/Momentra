export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode = 401
  constructor(message = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ConflictError extends Error {
  public readonly statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  public readonly statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class BadRequestError extends Error {
  public readonly statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

/**
 * Maps a known error class to an HTTP status code and returns a JSON-ready object.
 */
export function toApiError(err: unknown): { status: number; body: { error: string } } {
  if (
    err instanceof AuthenticationError ||
    err instanceof ConflictError ||
    err instanceof ValidationError ||
    err instanceof ForbiddenError ||
    err instanceof NotFoundError ||
    err instanceof BadRequestError
  ) {
    return { status: err.statusCode, body: { error: err.message } }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('not found')) return { status: 404, body: { error: err.message } }
    if (msg.includes('forbidden') || msg.includes('access denied'))
      return { status: 403, body: { error: err.message } }
  }
  console.error('[api error]', err)
  return { status: 500, body: { error: 'Internal server error' } }
}
