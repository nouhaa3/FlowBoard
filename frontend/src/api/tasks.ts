import { ApiError, apiClient } from './client.ts'
import { getCsrfToken } from './csrf.ts'

export type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  updated_at: string
}

export type CreateTaskInput = {
  title: string
  description?: string | null
  status?: 'todo' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string | null
}

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const task = value as Record<string, unknown>
  return (
    typeof task.id === 'string' &&
    typeof task.project_id === 'string' &&
    typeof task.title === 'string' &&
    (typeof task.description === 'string' || task.description === null) &&
    (task.status === 'todo' ||
      task.status === 'in_progress' ||
      task.status === 'done') &&
    (task.priority === 'low' ||
      task.priority === 'medium' ||
      task.priority === 'high') &&
    (typeof task.due_date === 'string' || task.due_date === null) &&
    typeof task.created_at === 'string' &&
    typeof task.updated_at === 'string'
  )
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const result = await apiClient.get<Task[]>(
    `projects/${encodeURIComponent(projectId)}/tasks`,
  )
  if (!Array.isArray(result) || !result.every(isTask)) {
    throw new ApiError(
      'The API returned an invalid tasks response.',
      'invalid_response',
    )
  }

  return result
}

export async function createTask(
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const csrfToken = getCsrfToken()
  if (!csrfToken) {
    throw new ApiError(
      'The request could not be verified. Refresh the page and try again.',
      'csrf',
    )
  }

  const result = await apiClient.post<unknown>(
    `projects/${encodeURIComponent(projectId)}/tasks`,
    input,
    { 'X-CSRF-Token': csrfToken },
  )
  if (!isTask(result)) {
    throw new ApiError(
      'The API returned an invalid task response.',
      'invalid_response',
    )
  }

  return result
}
