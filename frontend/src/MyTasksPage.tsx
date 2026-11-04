import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent, SyntheticEvent } from 'react'

import { ApiError } from './api/client.ts'
import { getProjects } from './api/projects.ts'
import type { Project } from './api/projects.ts'
import {
  createTask,
  deleteTask,
  getProjectTasks,
  updateTask,
  type CreateTaskInput,
  type Task as ApiTask,
  type UpdateTaskInput,
} from './api/tasks.ts'

type TaskStatus = 'To Do' | 'In Progress' | 'Done'
type TaskPriority = 'Low' | 'Medium' | 'High'
type StatusFilter = 'All' | TaskStatus
type PriorityFilter = 'All' | TaskPriority

type Task = {
  id: string
  title: string
  project: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  dueDateLabel: string
}

const statusLabels: Record<ApiTask['status'], TaskStatus> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const priorityLabels: Record<ApiTask['priority'], TaskPriority> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function parseDueDate(value: string | null): Date | null {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null
  }

  return date
}

function formatDueDate(value: string | null): string {
  const date = parseDueDate(value)
  if (!date) return 'No due date'

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function toDisplayTask(task: ApiTask, project: string): Task {
  const dueDate =
    task.due_date && parseDueDate(task.due_date) ? task.due_date : null

  return {
    id: task.id,
    title: task.title,
    project,
    description: task.description,
    status: statusLabels[task.status],
    priority: priorityLabels[task.priority],
    dueDate,
    dueDateLabel: formatDueDate(dueDate),
  }
}

const statusFilters: StatusFilter[] = [
  'All',
  'To Do',
  'In Progress',
  'Done',
]
const priorityFilters: PriorityFilter[] = ['All', 'Low', 'Medium', 'High']
const taskStatusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
] as const
const taskPriorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

const statusStyles: Record<TaskStatus, string> = {
  'To Do': 'border border-border bg-background text-muted',
  'In Progress': 'border border-primary/15 bg-sage-soft text-primary',
  Done: 'border border-coral/20 bg-coral-soft/70 text-cocoa',
}

const priorityStyles: Record<TaskPriority, string> = {
  Low: 'border border-border bg-background text-muted',
  Medium: 'border border-butter/25 bg-butter-soft/60 text-cocoa',
  High: 'border border-primary/15 bg-sage-soft text-primary',
}

function CreateTaskModal({
  projects,
  isProjectsLoading,
  hasProjectsLoadError,
  onClose,
  onCreated,
  onRetryProjects,
}: {
  projects: Project[]
  isProjectsLoading: boolean
  hasProjectsLoadError: boolean
  onClose: () => void
  onCreated: (projectId: string, task: ApiTask) => void
  onRetryProjects: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const submissionInProgress = useRef(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] =
    useState<NonNullable<CreateTaskInput['status']>>('todo')
  const [priority, setPriority] =
    useState<NonNullable<CreateTaskInput['priority']>>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    titleRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id)
    }
  }, [projectId, projects])

  function closeDialog() {
    if (submissionInProgress.current) return
    dialogRef.current?.close()
    onClose()
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    closeDialog()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionInProgress.current) return

    setErrorMessage(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage('Enter a task title to continue.')
      titleRef.current?.focus()
      return
    }
    if (trimmedTitle.length > 200) {
      setErrorMessage('Task titles must be 200 characters or fewer.')
      titleRef.current?.focus()
      return
    }
    if (!projectId) {
      setErrorMessage('Choose a project for this task.')
      return
    }

    submissionInProgress.current = true
    setIsSubmitting(true)
    try {
      const task = await createTask(projectId, {
        title: trimmedTitle,
        description: description.trim() || null,
        status,
        priority,
        due_date: dueDate || null,
      })
      dialogRef.current?.close()
      onCreated(projectId, task)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'csrf') {
        setErrorMessage(
          'Security verification failed. Please refresh the page and try again.',
        )
      } else if (error instanceof ApiError && error.status === 422) {
        setErrorMessage('Check the task details and try again.')
      } else if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Your session has expired. Sign in again to create a task.')
      } else if (error instanceof ApiError && error.status === 403) {
        setErrorMessage('We could not verify this request. Refresh and try again.')
      } else if (error instanceof ApiError && error.status === 404) {
        setErrorMessage('That project is no longer available. Choose another project.')
      } else {
        setErrorMessage('We could not create your task. Please try again.')
      }
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-task-title"
      aria-describedby="create-task-description"
      aria-modal="true"
      className="project-create-dialog fixed inset-0 m-0 grid h-dvh w-screen max-h-none max-w-none place-items-center overflow-y-auto bg-transparent p-4 text-foreground"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <section className="project-create-panel my-auto w-full max-w-lg rounded-[1.75rem] border border-border bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Make it happen
            </p>
            <h2
              id="create-task-title"
              className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Create a task
            </h2>
            <p
              id="create-task-description"
              className="mt-2 text-sm leading-6 text-muted"
            >
              Add a clear next step to one of your projects.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={isSubmitting}
            onClick={closeDialog}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition-colors hover:bg-sage-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        {isProjectsLoading ? (
          <p role="status" className="mt-7 rounded-xl bg-background px-4 py-5 text-sm text-muted">
            Loading your projects...
          </p>
        ) : hasProjectsLoadError ? (
          <div role="alert" className="mt-7 rounded-xl border border-coral/25 bg-coral-soft/60 p-4">
            <p className="text-sm leading-5 text-cocoa">
              We could not load your projects. Try again before creating a task.
            </p>
            <button
              type="button"
              onClick={onRetryProjects}
              className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Retry loading projects
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-7 rounded-xl border border-border bg-background p-5 text-center">
            <p className="text-sm leading-6 text-muted">
              You need to create a project before you can add a task.
            </p>
            <a
              href="/projects"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-tactile"
            >
              Go to Projects
            </a>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
                Task title <span className="text-coral" aria-hidden="true">*</span>
                <span className="ml-auto text-xs font-normal text-muted">
                  {title.length}/200
                </span>
              </span>
              <input
                ref={titleRef}
                autoComplete="off"
                autoFocus
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Draft project brief"
                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Project <span className="text-coral" aria-hidden="true">*</span>
              </span>
              <select
                required
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
                Description <span className="text-xs font-normal text-muted">Optional</span>
                <span className="ml-auto text-xs font-normal text-muted">
                  {description.length}/10,000
                </span>
              </span>
              <textarea
                maxLength={10_000}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add helpful context or details."
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    const selected = taskStatusOptions.find(
                      (option) => option.value === event.target.value,
                    )
                    if (selected) setStatus(selected.value)
                  }}
                  className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  {taskStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => {
                    const selected = taskPriorityOptions.find(
                      (option) => option.value === event.target.value,
                    )
                    if (selected) setPriority(selected.value)
                  }}
                  className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  {taskPriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Due date <span className="text-xs font-normal text-muted">Optional</span>
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </label>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-coral/25 bg-coral-soft/60 px-4 py-3 text-sm leading-5 text-cocoa"
              >
                {errorMessage}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={closeDialog}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-sage-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-tactile transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        )}

        {!isProjectsLoading && !hasProjectsLoadError && projects.length === 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <button
              type="button"
              onClick={closeDialog}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-sage-soft sm:w-auto"
            >
              Close
            </button>
          </div>
        )}
      </section>
    </dialog>
  )
}

function EditTaskModal({
  task,
  onClose,
  onUpdated,
}: {
  task: Task
  onClose: () => void
  onUpdated: (updatedTask: ApiTask) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const submissionInProgress = useRef(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState(
    taskStatusOptions.find((option) => option.label === task.status)?.value ??
      'todo',
  )
  const [priority, setPriority] = useState(
    taskPriorityOptions.find((option) => option.label === task.priority)?.value ??
      'medium',
  )
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    titleRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [])

  function closeDialog() {
    if (submissionInProgress.current) return
    dialogRef.current?.close()
    onClose()
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    closeDialog()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionInProgress.current) return

    setErrorMessage(null)
    setNoticeMessage(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage('Enter a task title to continue.')
      titleRef.current?.focus()
      return
    }
    if (trimmedTitle.length > 200) {
      setErrorMessage('Task titles must be 200 characters or fewer.')
      titleRef.current?.focus()
      return
    }

    const normalizedDescription = description.trim() || null
    const updates: UpdateTaskInput = {}
    if (trimmedTitle !== task.title) updates.title = trimmedTitle
    if (normalizedDescription !== task.description) {
      updates.description = normalizedDescription
    }
    if (status !== taskStatusOptions.find((option) => option.label === task.status)?.value) {
      updates.status = status
    }
    if (
      priority !==
      taskPriorityOptions.find((option) => option.label === task.priority)?.value
    ) {
      updates.priority = priority
    }
    if ((dueDate || null) !== task.dueDate) updates.due_date = dueDate || null

    if (Object.keys(updates).length === 0) {
      setNoticeMessage('No changes to save.')
      return
    }

    submissionInProgress.current = true
    setIsSubmitting(true)
    try {
      const updatedTask = await updateTask(task.id, updates)
      dialogRef.current?.close()
      onUpdated(updatedTask)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'csrf') {
        setErrorMessage(
          'Security verification failed. Please refresh the page and try again.',
        )
      } else if (error instanceof ApiError && error.status === 422) {
        setErrorMessage('Check the task details and try again.')
      } else if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Your session has expired. Sign in again to update this task.')
      } else if (error instanceof ApiError && error.status === 403) {
        setErrorMessage('We could not verify this request. Refresh and try again.')
      } else if (error instanceof ApiError && error.status === 404) {
        setErrorMessage('This task is no longer available. Refresh the task list and try again.')
      } else if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Your session has expired. Sign in again to delete this task.')
      } else if (error instanceof ApiError && error.status === 403) {
        setErrorMessage('We could not verify this request. Refresh and try again.')
      } else if (error instanceof ApiError && error.code === 'network') {
        setErrorMessage('Check your connection and try saving the task again.')
      } else if (error instanceof ApiError && error.status !== null && error.status >= 500) {
        setErrorMessage('The task service is temporarily unavailable. Please try again.')
      } else {
        setErrorMessage('We could not update your task. Please try again.')
      }
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-task-title"
      aria-describedby="edit-task-description"
      aria-modal="true"
      className="project-create-dialog fixed inset-0 m-0 grid h-dvh w-screen max-h-none max-w-none place-items-center overflow-y-auto bg-transparent p-4 text-foreground"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <section className="project-create-panel my-auto w-full max-w-lg rounded-[1.75rem] border border-border bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Make an adjustment
            </p>
            <h2
              id="edit-task-title"
              className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Edit task
            </h2>
            <p
              id="edit-task-description"
              className="mt-2 text-sm leading-6 text-muted"
            >
              Update the details while keeping it in {task.project}.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={isSubmitting}
            onClick={closeDialog}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition-colors hover:bg-sage-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
              Task title <span className="text-coral" aria-hidden="true">*</span>
              <span className="ml-auto text-xs font-normal text-muted">
                {title.length}/200
              </span>
            </span>
            <input
              ref={titleRef}
              autoComplete="off"
              autoFocus
              maxLength={200}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Project</span>
            <input
              readOnly
              value={task.project}
              aria-describedby="edit-task-project-help"
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-muted"
            />
            <span id="edit-task-project-help" className="mt-1 block text-xs text-muted">
              A task cannot be moved to another project here.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
              Description <span className="text-xs font-normal text-muted">Optional</span>
              <span className="ml-auto text-xs font-normal text-muted">
                {description.length}/10,000
              </span>
            </span>
            <textarea
              maxLength={10_000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Status</span>
              <select
                value={status}
                onChange={(event) => {
                  const selected = taskStatusOptions.find(
                    (option) => option.value === event.target.value,
                  )
                  if (selected) setStatus(selected.value)
                }}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                {taskStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Priority</span>
              <select
                value={priority}
                onChange={(event) => {
                  const selected = taskPriorityOptions.find(
                    (option) => option.value === event.target.value,
                  )
                  if (selected) setPriority(selected.value)
                }}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                {taskPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Due date <span className="text-xs font-normal text-muted">Optional</span>
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </label>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl border border-coral/25 bg-coral-soft/60 px-4 py-3 text-sm leading-5 text-cocoa"
            >
              {errorMessage}
            </p>
          )}
          {noticeMessage && (
            <p
              role="status"
              className="rounded-xl border border-primary/20 bg-sage-soft px-4 py-3 text-sm leading-5 text-primary"
            >
              {noticeMessage}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={closeDialog}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-sage-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-tactile transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </dialog>
  )
}

function DeleteTaskDialog({
  task,
  onClose,
  onDeleted,
}: {
  task: Task
  onClose: () => void
  onDeleted: (task: Task) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const requestInProgress = useRef(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    cancelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [])

  function closeDialog() {
    if (requestInProgress.current) return
    dialogRef.current?.close()
    onClose()
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    closeDialog()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog()
    }
  }

  async function handleDelete() {
    if (requestInProgress.current) return

    requestInProgress.current = true
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      await deleteTask(task.id)
      dialogRef.current?.close()
      onDeleted(task)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'csrf') {
        setErrorMessage(
          'Security verification failed. Please refresh the page and try again.',
        )
      } else if (error instanceof ApiError && error.status === 404) {
        setErrorMessage('This task is no longer available. Refresh the task list and try again.')
      } else if (error instanceof ApiError && error.code === 'network') {
        setErrorMessage('Check your connection and try deleting the task again.')
      } else if (error instanceof ApiError && error.status !== null && error.status >= 500) {
        setErrorMessage('The task service is temporarily unavailable. Please try again.')
      } else {
        setErrorMessage('We could not delete this task. Please try again.')
      }
    } finally {
      requestInProgress.current = false
      setIsDeleting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-task-title"
      aria-describedby="delete-task-description"
      aria-modal="true"
      className="project-create-dialog fixed inset-0 m-0 grid h-dvh w-screen max-h-none max-w-none place-items-center overflow-y-auto bg-transparent p-4 text-foreground"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <section className="project-create-panel my-auto w-full max-w-md rounded-[1.75rem] border border-border bg-surface p-6 shadow-panel sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
          This cannot be undone
        </p>
        <h2
          id="delete-task-title"
          className="mt-2 text-2xl font-semibold tracking-tight"
        >
          Delete task?
        </h2>
        <p
          id="delete-task-description"
          className="mt-3 break-words text-sm leading-6 text-muted"
        >
          Are you sure you want to delete <strong className="text-foreground">"{task.title}"</strong>?
          This task will be permanently removed.
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-coral/25 bg-coral-soft/60 px-4 py-3 text-sm leading-5 text-cocoa"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={isDeleting}
            onClick={closeDialog}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-sage-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-coral px-5 text-sm font-semibold text-white shadow-tactile transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isDeleting ? 'Deleting...' : 'Delete Task'}
          </button>
        </div>
      </section>
    </dialog>
  )
}

function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [taskRefreshCount, setTaskRefreshCount] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)
  const [hasProjectsLoadError, setHasProjectsLoadError] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>('All')

  useEffect(() => {
    let isCurrent = true

    async function loadProjects() {
      setIsProjectsLoading(true)
      setIsLoading(true)
      setHasLoadError(false)
      setHasProjectsLoadError(false)

      try {
        const loadedProjects = await getProjects()
        if (!isCurrent) return
        setProjects(loadedProjects)
      } catch {
        if (isCurrent) setHasProjectsLoadError(true)
      } finally {
        if (isCurrent) setIsProjectsLoading(false)
      }
    }

    void loadProjects()

    return () => {
      isCurrent = false
    }
  }, [retryCount])

  useEffect(() => {
    if (isProjectsLoading) return

    let isCurrent = true
    if (hasProjectsLoadError) {
      setIsLoading(false)
      setHasLoadError(true)
      return () => {
        isCurrent = false
      }
    }

    if (projects.length === 0) {
      setTasks([])
      setIsLoading(false)
      setHasLoadError(false)
      return () => {
        isCurrent = false
      }
    }

    async function loadTasks() {
      setIsLoading(true)
      setHasLoadError(false)

      try {
        const projectTasks = await Promise.all(
          projects.map((project) => getProjectTasks(project.id)),
        )
        if (!isCurrent) return

        const projectNames = new Map(
          projects.map((project) => [project.id, project.name]),
        )
        setTasks(
          projectTasks.flatMap((tasksForProject) =>
            tasksForProject.map((task) =>
              toDisplayTask(
                task,
                projectNames.get(task.project_id) ?? 'Unknown project',
              ),
            ),
          ),
        )
      } catch {
        if (isCurrent) {
          setTasks([])
          setHasLoadError(true)
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadTasks()

    return () => {
      isCurrent = false
    }
  }, [
    hasProjectsLoadError,
    isProjectsLoading,
    projects,
    taskRefreshCount,
  ])

  const normalizedSearch = search.trim().toLocaleLowerCase()

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      task.title.toLocaleLowerCase().includes(normalizedSearch) ||
      task.project.toLocaleLowerCase().includes(normalizedSearch)
    const matchesStatus =
      statusFilter === 'All' || task.status === statusFilter
    const matchesPriority =
      priorityFilter === 'All' || task.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const hasActiveFilters =
    search.length > 0 ||
    statusFilter !== 'All' ||
    priorityFilter !== 'All'

  function clearFilters() {
    setSearch('')
    setStatusFilter('All')
    setPriorityFilter('All')
  }

  function updateStatusFilter(value: string) {
    const selectedFilter = statusFilters.find((filter) => filter === value)
    if (selectedFilter) setStatusFilter(selectedFilter)
  }

  function updatePriorityFilter(value: string) {
    const selectedFilter = priorityFilters.find((filter) => filter === value)
    if (selectedFilter) setPriorityFilter(selectedFilter)
  }

  function handleTaskCreated(projectId: string, task: ApiTask) {
    const projectName =
      projects.find((project) => project.id === projectId)?.name ??
      'Unknown project'
    setSuccessMessage(`Task "${task.title}" created successfully.`)
    setIsCreateModalOpen(false)
    setTaskRefreshCount((count) => count + 1)
    setTasks((currentTasks) => [
      toDisplayTask(task, projectName),
      ...currentTasks.filter((currentTask) => currentTask.id !== task.id),
    ])
  }

  function handleTaskUpdated(updatedTask: ApiTask) {
    const projectName =
      projects.find((project) => project.id === updatedTask.project_id)?.name ??
      'Unknown project'
    const displayTask = toDisplayTask(updatedTask, projectName)
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === displayTask.id ? displayTask : currentTask,
      ),
    )
    setSuccessMessage(`Task "${updatedTask.title}" updated successfully.`)
    setEditingTask(null)
    setTaskRefreshCount((count) => count + 1)
  }

  function handleTaskDeleted(task: Task) {
    setTasks((currentTasks) =>
      currentTasks.filter((currentTask) => currentTask.id !== task.id),
    )
    setSuccessMessage(`Task "${task.title}" deleted successfully.`)
    setDeletingTask(null)
    setTaskRefreshCount((count) => count + 1)
  }

  function retryLoading() {
    if (hasProjectsLoadError) {
      retryProjects()
    } else {
      setTaskRefreshCount((count) => count + 1)
    }
  }

  function retryProjects() {
    setIsProjectsLoading(true)
    setIsLoading(true)
    setHasLoadError(false)
    setHasProjectsLoadError(false)
    setRetryCount((count) => count + 1)
  }

  return (
    <div className="space-y-7">
      <section
        aria-labelledby="my-tasks-heading"
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2
            id="my-tasks-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            My Tasks
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Track priorities, deadlines, and progress across your work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccessMessage(null)
            setIsCreateModalOpen(true)
          }}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-tactile transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px sm:w-auto"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          New Task
        </button>
      </section>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-primary/20 bg-sage-soft px-4 py-3 text-sm font-medium text-primary"
        >
          {successMessage}
        </p>
      )}

      {isCreateModalOpen && (
        <CreateTaskModal
          projects={projects}
          isProjectsLoading={isProjectsLoading}
          hasProjectsLoadError={hasProjectsLoadError}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleTaskCreated}
          onRetryProjects={retryProjects}
        />
      )}
      {editingTask && (
        <EditTaskModal
          key={editingTask.id}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}
      {deletingTask && (
        <DeleteTaskDialog
          key={deletingTask.id}
          task={deletingTask}
          onClose={() => setDeletingTask(null)}
          onDeleted={handleTaskDeleted}
        />
      )}

      <section aria-label="Task search and filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_auto_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Search tasks and projects</span>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks or projects"
              className="min-h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-foreground shadow-inner placeholder:text-muted"
            />
          </label>

          <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-muted shadow-sm">
            <span className="shrink-0">Status</span>
            <span className="sr-only">Filter tasks by status</span>
            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.currentTarget.value)}
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 font-semibold text-foreground outline-none"
            >
              {statusFilters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-muted shadow-sm">
            <span className="shrink-0">Priority</span>
            <span className="sr-only">Filter tasks by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                updatePriorityFilter(event.currentTarget.value)
              }
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 font-semibold text-foreground outline-none"
            >
              {priorityFilters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section aria-label="Tasks" aria-live="polite">
        <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {isLoading
              ? 'Loading tasks...'
              : `${filteredTasks.length} of ${tasks.length} tasks`}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-primary underline-offset-4 hover:bg-sage-soft hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div
            role="status"
            className="rounded-panel border border-border bg-surface px-6 py-12 text-center text-sm text-muted"
          >
            Loading your tasks...
          </div>
        ) : hasLoadError ? (
          <div
            role="alert"
            className="rounded-panel border border-border bg-surface px-6 py-12 text-center"
          >
            <h3 className="text-base font-semibold text-foreground">
              Tasks couldn&apos;t be loaded
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={retryLoading}
              className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : filteredTasks.length > 0 ? (
          <ul className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
            {filteredTasks.map((task, index) => (
              <li
                key={task.id}
                className={`grid min-w-0 gap-3 p-4 transition-colors hover:bg-background/70 sm:grid-cols-[minmax(0,1.5fr)_auto_auto_auto_auto_auto] sm:items-center sm:gap-4 sm:px-5 ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_var(--sage-soft)]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {task.project}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:contents">
                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[task.status]}`}
                  >
                    {task.status}
                  </span>
                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${priorityStyles[task.priority]}`}
                  >
                    {task.priority} priority
                  </span>
                </div>

                <div className="pl-5 text-xs text-muted sm:pl-0 sm:text-sm">
                  <span className="sm:hidden">Due </span>
                  {task.dueDate ? (
                    <time dateTime={task.dueDate}>{task.dueDateLabel}</time>
                  ) : (
                    <span>{task.dueDateLabel}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
                  <button
                    type="button"
                    aria-label={`Edit ${task.title}`}
                    onClick={() => {
                      setSuccessMessage(null)
                      setEditingTask(task)
                    }}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-sage-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${task.title}`}
                    onClick={() => {
                      setSuccessMessage(null)
                      setDeletingTask(task)
                    }}
                    className="min-h-10 rounded-lg border border-coral/30 bg-coral-soft/50 px-3 text-sm font-semibold text-coral transition-colors hover:bg-coral-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-panel border border-dashed border-border bg-surface px-6 py-12 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex size-11 items-center justify-center rounded-full bg-background text-muted"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="m8.5 12 2.25 2.25L15.75 9" />
              </svg>
            </span>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {tasks.length === 0 ? 'No tasks yet' : 'No tasks found'}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              {tasks.length === 0
                ? 'Tasks from your projects will appear here.'
                : "Try changing your search or filters to find the task you're looking for."}
            </p>
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default MyTasksPage
