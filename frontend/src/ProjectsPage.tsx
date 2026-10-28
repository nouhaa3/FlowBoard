import { useState } from 'react'

type ProjectStatus = 'In Progress' | 'Completed' | 'Planned'
type StatusFilter = 'All' | ProjectStatus

type Project = {
  name: string
  description: string
  status: ProjectStatus
  completedTasks: number
  totalTasks: number
}

const projects: Project[] = [
  {
    name: 'Website refresh',
    description: 'A clearer, faster experience for our customers.',
    status: 'In Progress',
    completedTasks: 12,
    totalTasks: 20,
  },
  {
    name: 'Q4 brand campaign',
    description: 'Bring the next seasonal campaign from brief to launch.',
    status: 'In Progress',
    completedTasks: 5,
    totalTasks: 12,
  },
  {
    name: 'Product launch',
    description: 'Coordinate the final details for our upcoming release.',
    status: 'Completed',
    completedTasks: 16,
    totalTasks: 16,
  },
  {
    name: 'Design system',
    description: 'A shared foundation for consistent product experiences.',
    status: 'In Progress',
    completedTasks: 9,
    totalTasks: 15,
  },
  {
    name: 'Customer research',
    description: 'Understand the needs shaping our next product direction.',
    status: 'Planned',
    completedTasks: 0,
    totalTasks: 8,
  },
  {
    name: 'Mobile app beta',
    description: 'Prepare a focused beta release for early users.',
    status: 'Completed',
    completedTasks: 10,
    totalTasks: 10,
  },
]

const filters: StatusFilter[] = [
  'All',
  'In Progress',
  'Completed',
  'Planned',
]

const statusStyles: Record<ProjectStatus, string> = {
  'In Progress': 'border border-primary/15 bg-sage-soft text-primary',
  Completed: 'border border-primary/20 bg-primary text-primary-foreground shadow-sm',
  Planned: 'border border-border bg-background text-muted',
}

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

function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const normalizedSearch = search.trim().toLocaleLowerCase()

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      project.name.toLocaleLowerCase().includes(normalizedSearch) ||
      project.description.toLocaleLowerCase().includes(normalizedSearch)
    const matchesStatus =
      statusFilter === 'All' || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const hasActiveFilters = search.length > 0 || statusFilter !== 'All'

  function clearFilters() {
    setSearch('')
    setStatusFilter('All')
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
          disabled
          title="Project creation is not available yet"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground opacity-60 shadow-tactile sm:w-auto"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          New Project
          <span className="sr-only">(not available yet)</span>
        </button>
      </section>

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
              value={statusFilter}
              onChange={(event) => {
                const selectedFilter = filters.find(
                  (filter) => filter === event.currentTarget.value,
                )
                if (selectedFilter) setStatusFilter(selectedFilter)
              }}
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 font-semibold text-foreground outline-none sm:flex-none"
            >
              {filters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
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

        {filteredProjects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const progress = Math.round(
                (project.completedTasks / project.totalTasks) * 100,
              )

              return (
                <li
                  key={project.name}
                  className="min-w-0 rounded-panel border border-border bg-surface p-5 shadow-panel transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-tactile sm:p-6"
                >
                  <article aria-labelledby={`project-${project.name}`}>
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-sage-soft text-primary shadow-sm">
                        <ProjectMark />
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[project.status]}`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <h3
                      id={`project-${project.name}`}
                      className="mt-5 truncate text-base font-semibold tracking-tight text-foreground"
                    >
                      {project.name}
                    </h3>
                    <p className="mt-2 min-h-10 text-sm leading-5 text-muted">
                      {project.description}
                    </p>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-foreground">
                          Progress
                        </span>
                        <span className="text-muted">{progress}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${project.name} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        aria-valuetext={`${progress}% complete`}
                        className="h-2 overflow-hidden rounded-full bg-background shadow-inner"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-muted">
                        {project.completedTasks} of {project.totalTasks} tasks
                        completed
                      </p>
                    </div>
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
              No projects found
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Try a different search or status, or clear your filters to see all
              projects.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Clear search and filters
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default ProjectsPage
