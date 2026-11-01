import { ApiError, apiClient } from './client.ts'
import { getCsrfToken } from './csrf.ts'

export type Project = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

function isProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const project = value as Record<string, unknown>
  return (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    (typeof project.description === 'string' || project.description === null) &&
    typeof project.created_at === 'string' &&
    typeof project.updated_at === 'string'
  )
}

export async function getProjects(): Promise<Project[]> {
  const result = await apiClient.get<Project[]>('projects')
  if (!Array.isArray(result) || !result.every(isProject)) {
    throw new ApiError(
      'The API returned an invalid projects response.',
      'invalid_response',
    )
  }

  return result
}

export type CreateProjectInput = {
  name: string
  description: string | null
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const csrfToken = getCsrfToken()
  if (!csrfToken) {
    throw new ApiError(
      'The request could not be verified. Refresh the page and try again.',
      'csrf',
    )
  }

  const result = await apiClient.post<unknown>('projects', input, {
    'X-CSRF-Token': csrfToken,
  })
  if (!isProject(result)) {
    throw new ApiError(
      'The API returned an invalid project response.',
      'invalid_response',
    )
  }

  return result
}
