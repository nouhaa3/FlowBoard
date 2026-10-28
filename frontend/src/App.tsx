import { useEffect, useState } from 'react'
import MyTasksPage from './MyTasksPage.tsx'
import ProjectsPage from './ProjectsPage.tsx'
import { useTheme } from './ThemeProvider.tsx'

type IconName = 'overview' | 'tasks' | 'projects' | 'calendar' | 'settings'
type ActivePage = 'overview' | 'projects' | 'myTasks'
type MetricIconName = 'projects' | 'tasks' | 'progress' | 'completed'
type TaskStatus = 'To Do' | 'In Progress' | 'Done'

const summaryMetrics: {
  label: string
  value: number
  icon: MetricIconName
}[] = [
  { label: 'Total Projects', value: 8, icon: 'projects' },
  { label: 'Total Tasks', value: 24, icon: 'tasks' },
  { label: 'In Progress', value: 7, icon: 'progress' },
  { label: 'Completed', value: 12, icon: 'completed' },
]

const recentTasks: {
  title: string
  project: string
  dueDate: string
  dueDateLabel: string
  status: TaskStatus
}[] = [
  {
    title: 'Finalize onboarding flow',
    project: 'Website refresh',
    dueDate: '2026-10-30',
    dueDateLabel: 'Oct 30, 2026',
    status: 'In Progress',
  },
  {
    title: 'Review campaign brief',
    project: 'Q4 brand campaign',
    dueDate: '2026-10-29',
    dueDateLabel: 'Oct 29, 2026',
    status: 'To Do',
  },
  {
    title: 'Prepare launch checklist',
    project: 'Product launch',
    dueDate: '2026-10-27',
    dueDateLabel: 'Oct 27, 2026',
    status: 'Done',
  },
  {
    title: 'Update component library',
    project: 'Design system',
    dueDate: '2026-10-31',
    dueDateLabel: 'Oct 31, 2026',
    status: 'In Progress',
  },
  {
    title: 'Share weekly project update',
    project: 'Website refresh',
    dueDate: '2026-11-02',
    dueDateLabel: 'Nov 2, 2026',
    status: 'To Do',
  },
]

const statusStyles: Record<TaskStatus, string> = {
  'To Do': 'border border-border bg-background text-muted',
  'In Progress': 'bg-primary/10 text-primary',
  Done: 'border border-border bg-surface text-foreground',
}

const navigationItems: { label: string; icon: IconName }[] = [
  { label: 'Overview', icon: 'overview' },
  { label: 'My Tasks', icon: 'tasks' },
  { label: 'Projects', icon: 'projects' },
  { label: 'Calendar', icon: 'calendar' },
  { label: 'Settings', icon: 'settings' },
]

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    tasks: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12 2.25 2.25L15.75 9" />
      </>
    ),
    projects: (
      <path d="M3.5 7.5h6l2 2h9v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .8v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.8l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.8-3H4a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .8-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.8V2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .8l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .8 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.8 3Z" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function MetricIcon({ name }: { name: MetricIconName }) {
  const paths: Record<MetricIconName, React.ReactNode> = {
    projects: (
      <path d="M3.5 7.5h6l2 2h9v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
    ),
    tasks: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m3.5 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2" />
      </>
    ),
    progress: (
      <>
        <path d="M4 19V5m0 14h16" />
        <path d="m7 15 4-4 3 2 5-6" />
      </>
    ),
    completed: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12 2.25 2.25L15.75 9" />
      </>
    ),
  }

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
      {paths[name]}
    </svg>
  )
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState<ActivePage>('overview')
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const pageTitle =
    activePage === 'projects'
      ? 'Projects'
      : activePage === 'myTasks'
        ? 'My Tasks'
        : 'Overview'
  const pageSubtitle =
    activePage === 'projects'
      ? 'Organize your work and track progress across projects.'
      : activePage === 'myTasks'
        ? 'Track priorities, deadlines, and progress across your work.'
        : 'A clear view of your work, all in one place.'
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  useEffect(() => {
    if (!isSidebarOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  function closeSidebar() {
    setIsSidebarOpen(false)
  }

  function navigateTo(label: string) {
    if (label === 'Overview') {
      setActivePage('overview')
    } else if (label === 'Projects') {
      setActivePage('projects')
    } else if (label === 'My Tasks') {
      setActivePage('myTasks')
    }

    closeSidebar()
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground md:flex">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        id="primary-navigation"
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-border bg-surface px-5 py-6 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen
            ? 'visible translate-x-0'
            : 'invisible -translate-x-full md:visible'
        }`}
      >
        <a
          href="#overview"
          className="mb-10 flex items-center gap-3 rounded-lg px-2 py-1 text-foreground"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('Overview')
          }}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight">FlowBoard</span>
        </a>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Workspace
        </p>
        <nav className="flex flex-col gap-1" aria-label="Workspace">
          {navigationItems.map(({ label, icon }) => {
            const isActive =
              (label === 'Overview' && activePage === 'overview') ||
              (label === 'Projects' && activePage === 'projects') ||
              (label === 'My Tasks' && activePage === 'myTasks')

            return (
              <button
                key={label}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigateTo(label)}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-background hover:text-foreground'
                }`}
              >
                <Icon name={icon} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-border pt-5">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-background"
            aria-label="User profile: Alex Morgan, workspace member"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              AM
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                Alex Morgan
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                Workspace member
              </span>
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex min-h-[4.75rem] items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
              aria-controls="primary-navigation"
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-background hover:text-foreground md:hidden"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                {isSidebarOpen ? (
                  <path d="m6 6 12 12M18 6 6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {pageTitle}
              </h1>
              <p className="hidden truncate text-sm text-muted sm:block">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label={`Switch to ${nextTheme} mode`}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <svg
              aria-hidden="true"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {theme === 'light' ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              ) : (
                <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
              )}
            </svg>
            <span className="hidden sm:inline">{nextTheme} mode</span>
          </button>
        </header>

        <main
          id="overview"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10"
        >
          {activePage === 'projects' ? (
            <ProjectsPage />
          ) : activePage === 'myTasks' ? (
            <MyTasksPage />
          ) : (
            <>
              <section
                aria-labelledby="welcome-heading"
                className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-primary">
                    Your workspace
                  </p>
                  <h2
                    id="welcome-heading"
                    className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
                  >
                    Good afternoon, Nouha
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
                    Here&apos;s what&apos;s happening with your projects today.
                  </p>
                </div>
                <p className="text-sm font-medium text-muted sm:pb-1">
                  {currentDate}
                </p>
              </section>

              <section aria-label="Workspace summary" className="mt-8">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {summaryMetrics.map(({ label, value, icon }) => (
                    <div
                      key={label}
                      className="rounded-panel border border-border bg-surface p-5 shadow-panel sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-sm font-medium text-muted">
                          {label}
                        </dt>
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MetricIcon name={icon} />
                        </span>
                      </div>
                      <dd className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                        {value}
                      </dd>
                      <p className="mt-1 text-xs text-muted">Mock data</p>
                    </div>
                  ))}
                </dl>
              </section>

              <section
                aria-labelledby="recent-tasks-heading"
                className="mt-9 overflow-hidden rounded-panel border border-border bg-surface shadow-panel"
              >
                <div className="flex flex-col gap-1 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <h3
                      id="recent-tasks-heading"
                      className="text-base font-semibold tracking-tight"
                    >
                      Recent tasks
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      A quick look at what your team is working on.
                    </p>
                  </div>
                  <span className="mt-2 w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted sm:mt-0">
                    {recentTasks.length} tasks · Mock data
                  </span>
                </div>

                <ul className="divide-y divide-border">
                  {recentTasks.map((task) => (
                    <li
                      key={task.title}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(7rem,0.8fr)_auto] sm:items-center sm:gap-4 sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted sm:hidden">
                          {task.project}
                        </p>
                      </div>
                      <p className="hidden truncate text-sm text-muted sm:block">
                        {task.project}
                      </p>
                      <time
                        dateTime={task.dueDate}
                        className="text-xs text-muted sm:text-sm"
                      >
                        <span className="sm:hidden">Due </span>
                        {task.dueDateLabel}
                      </time>
                      <span
                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[task.status]}`}
                      >
                        {task.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
