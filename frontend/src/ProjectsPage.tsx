import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent, SyntheticEvent } from 'react'

import { ApiError } from './api/client.ts'
import { createProject, getProjects } from './api/projects.ts'
import type { Project } from './api/projects.ts'

function ProjectMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 7.5h6l2 2h9v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
    </svg>
  )
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (project: Project) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const submissionInProgress = useRef(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    nameRef.current?.focus()

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
    const trimmedName = name.trim()

    if (!trimmedName) {
      setErrorMessage('Enter a project name to continue.')
      nameRef.current?.focus()
      return
    }

    submissionInProgress.current = true
    setIsSubmitting(true)
    try {
      const project = await createProject({
        name: trimmedName,
        description: description.trim() || null,
      })
      dialogRef.current?.close()
      onCreated(project)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'csrf') {
        setErrorMessage(
          'Security verification failed. Please refresh the page and try again.',
        )
      } else if (error instanceof ApiError && error.status === 422) {
        setErrorMessage('Check the project name and description and try again.')
      } else if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Your session has expired. Sign in again to create a project.')
      } else if (error instanceof ApiError && error.status === 403) {
        setErrorMessage('We could not verify this request. Refresh and try again.')
      } else {
        setErrorMessage('We could not create your project. Please try again.')
      }
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-project-title"
      aria-describedby="create-project-description"
      aria-modal="true"
      className="project-create-dialog fixed inset-0 m-0 grid h-dvh w-screen max-h-none max-w-none place-items-center overflow-y-auto bg-transparent p-4 text-foreground"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <section className="project-create-panel my-auto w-full max-w-lg rounded-[1.75rem] border border-border bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              A fresh start
            </p>
            <h2
              id="create-project-title"
              className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Create a project
            </h2>
            <p
              id="create-project-description"
              className="mt-2 text-sm leading-6 text-muted"
            >
              Give your next piece of work a home.
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
              Project name <span className="text-coral" aria-hidden="true">*</span>
              <span className="ml-auto text-xs font-normal text-muted">
                {name.length}/120
              </span>
            </span>
            <input
              ref={nameRef}
              autoComplete="off"
              autoFocus
              maxLength={120}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Website refresh"
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
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
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What would you like to accomplish?"
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
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
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </section>
    </dialog>
  )
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase()

  useEffect(() => {
    let active = true

    setIsLoading(true)
    setLoadError(null)
    void getProjects()
      .then((loadedProjects) => {
        if (active) {
          setProjects(loadedProjects)
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('We could not load your projects. Please try again.')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const filteredProjects = projects.filter((project) => {
    return (
      normalizedSearch.length === 0 ||
      project.name.toLocaleLowerCase().includes(normalizedSearch) ||
      project.description?.toLocaleLowerCase().includes(normalizedSearch) === true
    )
  })

  const hasActiveFilters = search.length > 0

  function clearFilters() {
    setSearch('')
  }

  function handleProjectCreated(project: Project) {
    setProjects((currentProjects) => [project, ...currentProjects])
    setReloadKey((key) => key + 1)
    setSuccessMessage(`Project "${project.name}" created successfully.`)
    setIsCreateModalOpen(false)
  }

  return (
    <div className="space-y-7">
      <section
        aria-labelledby="projects-heading"
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h2
            id="projects-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Projects
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Organize your work and track progress across projects.
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
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          New Project
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

      <section aria-label="Project search and filters">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search projects</span>
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
              placeholder="Search projects"
              className="min-h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-foreground shadow-inner placeholder:text-muted"
            />
          </label>

          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-muted shadow-sm sm:w-auto">
            <span className="shrink-0">Status</span>
            <span className="sr-only">Filter projects by status</span>
            <select
              value="unavailable"
              disabled
              title="Status filtering will be available when task data is connected"
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 font-semibold text-foreground outline-none sm:flex-none"
            >
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
        </div>
      </section>

      <section aria-label="Projects" aria-live="polite">
        <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {filteredProjects.length} of {projects.length} projects
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
            className="rounded-panel border border-border bg-surface px-6 py-12 text-center shadow-panel"
            role="status"
          >
            <span
              aria-hidden="true"
              className="mx-auto block size-6 animate-spin rounded-full border-2 border-border border-t-primary"
            />
            <p className="mt-4 text-sm text-muted">Loading your projects...</p>
          </div>
        ) : loadError ? (
          <div
            className="rounded-panel border border-coral/25 bg-surface px-6 py-10 text-center shadow-panel"
            role="alert"
          >
            <h3 className="text-base font-semibold text-foreground">
              Projects are unavailable
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-5 min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-tactile"
            >
              Try again
            </button>
          </div>
        ) : filteredProjects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              return (
                <li
                  key={project.id}
                  className="min-w-0 rounded-panel border border-border bg-surface p-5 shadow-panel transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-tactile sm:p-6"
                >
                  <article aria-labelledby={`project-${project.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-sage-soft text-primary shadow-sm">
                        <ProjectMark />
                      </span>
                    </div>

                    <h3
                      id={`project-${project.id}`}
                      className="mt-5 truncate text-base font-semibold tracking-tight text-foreground"
                    >
                      {project.name}
                    </h3>
                    <p className="mt-2 min-h-10 whitespace-pre-line text-sm leading-5 text-muted">
                      {project.description || 'No description provided.'}
                    </p>

                  </article>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-panel border border-dashed border-border bg-surface px-6 py-12 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-background text-muted">
              <ProjectMark />
            </span>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {projects.length === 0 ? 'No projects yet' : 'No projects found'}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              {projects.length === 0
                ? 'Your projects will appear here once they have been created.'
                : 'Try a different search or clear it to see all projects.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <CreateProjectModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}

export default ProjectsPage
