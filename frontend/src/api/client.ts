export type ApiErrorCode =
  | 'configuration'
  | 'network'
  | 'http'
  | 'invalid_response'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export type ApiResult<T> = T | string | undefined

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  if (!apiBaseUrl) {
    throw new ApiError(
      'The API URL is not configured.',
      'configuration',
    )
  }

  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(
      `${apiBaseUrl}/${path.replace(/^\/+/, '')}`,
      {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    )
  } catch {
    throw new ApiError(
      'Unable to reach the API. Check your connection and try again.',
      'network',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      'The request could not be completed.',
      'http',
      response.status,
    )
  }

  if (response.status === 204) {
    return undefined
  }

  let responseBody: string
  try {
    responseBody = await response.text()
  } catch {
    throw new ApiError(
      'The API response could not be read.',
      'invalid_response',
      response.status,
    )
  }

  if (!responseBody) {
    return undefined
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    return responseBody
  }

  try {
    const data: unknown = JSON.parse(responseBody)
    return data as T
  } catch {
    throw new ApiError(
      'The API returned an invalid response.',
      'invalid_response',
      response.status,
    )
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
