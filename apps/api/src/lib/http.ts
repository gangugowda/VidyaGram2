import type { FastifyReply } from 'fastify'
import { ZodError, type ZodType } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, 'validation_error', message, details)
export const unauthorized = (message = 'Sign in to continue.') =>
  new ApiError(401, 'unauthorized', message)
export const forbidden = (message = 'You do not have access to this record.') =>
  new ApiError(403, 'forbidden', message)
export const notFound = (message = 'Record not found.') => new ApiError(404, 'not_found', message)
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, 'conflict', message, details)
export const tooManyRequests = (message = 'Too many attempts. Try again later.') =>
  new ApiError(429, 'rate_limited', message)

/** Parse a payload and convert Zod issues into a stable API error. */
export function parse<T>(schema: ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value)
  } catch (error) {
    if (error instanceof ZodError) {
      throw badRequest(
        'Some fields are invalid.',
        error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      )
    }
    throw error
  }
}

export function ok<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({ ok: true, data })
}
