/**
 * Browser client for the VidyaGram API.
 *
 * The app is designed to keep working without a server: when `api.enabled` is
 * false, or the API cannot be reached, the store falls back to the on-device
 * sample dataset. Every failure is surfaced to the caller so the UI can tell
 * the user what actually happened instead of pretending a save succeeded.
 */
import type { ApiRuntimeConfig, ApiResponse, Attempt, BootstrapPayload, DB, SafeUser } from '@vidyagram/shared'
import type { SignupInput } from '@vidyagram/shared/contracts'

const DEFAULT_BASE_URL = '/api/v1'
const DEFAULT_TIMEOUT_MS = 8000

/** Reads the public runtime config; safe to call before React renders. */
export function readApiConfig(): ApiRuntimeConfig {
  const raw = typeof window === 'undefined' ? undefined : window.VIDYAGRAM_CONFIG?.api
  const timeout = Number(raw?.timeoutMs)
  return {
    enabled: raw?.enabled === true,
    baseUrl: typeof raw?.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim().replace(/\/+$/, '') : DEFAULT_BASE_URL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? Math.min(timeout, 30000) : DEFAULT_TIMEOUT_MS,
  }
}

/** A failed API call. `status === 0` means the request never reached the server. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

export interface ProfilePatch {
  name?: string
  phone?: string | null
  language?: string
  lowDataMode?: boolean
  reduceMotion?: boolean
  textSize?: 'normal' | 'large'
  avatarColor?: string
}

export interface ApiClient {
  readonly config: ApiRuntimeConfig
  bootstrap(): Promise<BootstrapPayload>
  login(identifier: string, password: string): Promise<BootstrapPayload>
  signup(input: SignupInput): Promise<BootstrapPayload>
  logout(): Promise<void>
  updateProfile(patch: ProfilePatch): Promise<{ user: SafeUser; db: DB }>
  submitQuizAttempt(quizId: string, answers: Record<string, string>): Promise<Attempt>
  releaseQuiz(quizId: string): Promise<void>
}

export function createApiClient(config: ApiRuntimeConfig = readApiConfig()): ApiClient {
  const root = config.baseUrl

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs)
    let response: Response
    try {
      response = await fetch(`${root}${path}`, {
        credentials: 'include',
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers || {}),
        },
        signal: controller.signal,
      })
    } catch {
      throw new ApiRequestError('network_error', 'Could not reach the school server.', 0)
    } finally {
      clearTimeout(timer)
    }

    const body = (await response.json().catch(() => null)) as ApiResponse<T> | null
    if (!body || typeof body !== 'object' || !('ok' in body)) {
      throw new ApiRequestError('bad_response', 'The school server returned an unreadable response.', response.status)
    }
    if (!response.ok || body.ok === false) {
      const error = body.ok === false ? body.error : undefined
      throw new ApiRequestError(
        error?.code || 'http_error',
        error?.message || 'The request failed.',
        response.status,
      )
    }
    return body.data
  }

  const post = <T>(path: string, payload?: unknown) =>
    request<T>(path, { method: 'POST', body: payload === undefined ? undefined : JSON.stringify(payload) })

  return {
    config,
    bootstrap: () => request<BootstrapPayload>('/bootstrap'),
    login: (identifier, password) => post<BootstrapPayload>('/auth/login', { identifier, password }),
    signup: (input) => post<BootstrapPayload>('/auth/signup', input),
    logout: async () => {
      await post<{ signedOut: boolean }>('/auth/logout')
    },
    updateProfile: (patch) => request<{ user: SafeUser; db: DB }>('/me', { method: 'PATCH', body: JSON.stringify(patch) }),
    submitQuizAttempt: async (quizId, answers) => {
      const data = await post<{ attempt: Attempt }>(`/quizzes/${encodeURIComponent(quizId)}/attempts`, { answers })
      return data.attempt
    },
    releaseQuiz: async (quizId) => {
      await post<{ quiz: unknown }>(`/quizzes/${encodeURIComponent(quizId)}/release`)
    },
  }
}
