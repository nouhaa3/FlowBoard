import { useState } from 'react'

type TaskStatus = 'To Do' | 'In Progress' | 'Done'
type TaskPriority = 'Low' | 'Medium' | 'High'
type StatusFilter = 'All' | TaskStatus
type PriorityFilter = 'All' | TaskPriority

type Task = {
  title: string
  project: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  dueDateLabel: string
}

const tasks: Task[] = [
  {
    title: 'Finalize onboarding flow',
    project: 'Website refresh',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2026-10-30',
    dueDateLabel: 'Oct 30, 2026',
  },
  {
    title: 'Review campaign brief',
    project: 'Q4 brand campaign',
    status: 'To Do',
    priority: 'High',
    dueDate: '2026-10-29',
    dueDateLabel: 'Oct 29, 2026',
  },
  {
    title: 'Prepare launch checklist',
    project: 'Product launch',
    status: 'Done',
    priority: 'Medium',
    dueDate: '2026-10-27',
    dueDateLabel: 'Oct 27, 2026',
  },
  {
    title: 'Update component library',
    project: 'Design system',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: '2026-10-31',
    dueDateLabel: 'Oct 31, 2026',
  },
  {
    title: 'Share weekly project update',
    project: 'Website refresh',
    status: 'To Do',
    priority: 'Low',
    dueDate: '2026-11-02',
    dueDateLabel: 'Nov 2, 2026',
  },
  {
    title: 'Confirm research participants',
    project: 'Customer research',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2026-11-03',
    dueDateLabel: 'Nov 3, 2026',
  },
  {
    title: 'Document release notes',
    project: 'Mobile app beta',
    status: 'To Do',
    priority: 'Medium',
    dueDate: '2026-11-05',
    dueDateLabel: 'Nov 5, 2026',
  },
  {
    title: 'Archive final campaign assets',
    project: 'Q4 brand campaign',
    status: 'Done',
    priority: 'Low',
    dueDate: '2026-10-26',
    dueDateLabel: 'Oct 26, 2026',
  },
]

const statusFilters: StatusFilter[] = [
  'All',
  'To Do',
  'In Progress',
  'Done',
]
const priorityFilters: PriorityFilter[] = ['All', 'Low', 'Medium', 'High']

const statusStyles: Record<TaskStatus, string> = {
  'To Do': 'border border-border bg-background text-muted',
  'In Progress': 'bg-primary/10 text-primary',
  Done: 'border border-border bg-surface text-foreground',
}

const priorityStyles: Record<TaskPriority, string> = {
  Low: 'border border-border bg-background text-muted',
  Medium: 'border border-border bg-surface text-foreground',
  High: 'bg-primary/10 text-primary',
}

function MyTasksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>('All')
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

  return (
    <div className="space-y-7">
      <section aria-labelledby="my-tasks-heading">
        <h2
          id="my-tasks-heading"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          My Tasks
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
          Track priorities, deadlines, and progress across your work.
        </p>
      </section>

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
              className="min-h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-muted"
            />
          </label>

          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted">
            <span className="shrink-0">Status</span>
            <span className="sr-only">Filter tasks by status</span>
            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.currentTarget.value)}
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 font-medium text-foreground outline-none"
            >
              {statusFilters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted">
            <span className="shrink-0">Priority</span>
            <span className="sr-only">Filter tasks by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                updatePriorityFilter(event.currentTarget.value)
              }
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 font-medium text-foreground outline-none"
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
            {filteredTasks.length} of {tasks.length} tasks
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredTasks.length > 0 ? (
          <ul className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
            {filteredTasks.map((task, index) => (
              <li
                key={task.title}
                className={`grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4 sm:px-5 ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70"
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
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[task.status]}`}
                  >
                    {task.status}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[task.priority]}`}
                  >
                    {task.priority} priority
                  </span>
                </div>

                <time
                  dateTime={task.dueDate}
                  className="pl-5 text-xs text-muted sm:pl-0 sm:text-sm"
                >
                  <span className="sm:hidden">Due </span>
                  {task.dueDateLabel}
                </time>
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
              No tasks found
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Try changing your search or filters to find the task you&apos;re
              looking for.
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

export default MyTasksPage
