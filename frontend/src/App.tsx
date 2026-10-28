import { useEffect, useState } from 'react'
import CalendarPage from './CalendarPage.tsx'
import MyTasksPage from './MyTasksPage.tsx'
import ProjectsPage from './ProjectsPage.tsx'
import SettingsPage from './SettingsPage.tsx'
import { useTheme } from './ThemeProvider.tsx'

type IconName = 'overview' | 'tasks' | 'projects' | 'calendar' | 'settings'
type ActivePage = 'overview' | 'projects' | 'myTasks' | 'calendar' | 'settings'
type MetricIconName = 'projects' | 'tasks' | 'progress' | 'completed'
type TaskStatus = 'To Do' | 'In Progress' | 'Done'

const summaryMetrics: {
  label: string
  value: number
  icon: MetricIconName
  detail: string
  iconTone: string
  accentTone: string
}[] = [
  {
    label: 'Total Projects',
    value: 8,
    icon: 'projects',
    detail: 'little worlds for your work',
    iconTone: 'bg-surface text-primary shadow-sm',
    accentTone: 'bg-primary',
  },
  {
    label: 'Total Tasks',
    value: 24,
    icon: 'tasks',
    detail: 'ideas becoming real',
    iconTone: 'bg-surface text-coral shadow-sm',
    accentTone: 'bg-coral',
  },
  {
    label: 'In Progress',
    value: 7,
    icon: 'progress',
    detail: 'one step at a time',
    iconTone: 'bg-surface text-cocoa shadow-sm',
    accentTone: 'bg-butter',
  },
  {
    label: 'Completed',
    value: 12,
    icon: 'completed',
    detail: 'a dozen reasons to smile',
    iconTone: 'bg-sage-soft text-primary shadow-sm',
    accentTone: 'bg-primary/45',
  },
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
  'To Do': 'border border-butter/25 bg-butter-soft/60 text-cocoa',
  'In Progress': 'border border-primary/15 bg-sage-soft text-primary',
  Done: 'border border-coral/20 bg-coral-soft/70 text-cocoa',
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
        : activePage === 'calendar'
          ? 'Calendar'
          : activePage === 'settings'
            ? 'Settings'
          : 'Overview'
  const pageSubtitle =
    activePage === 'projects'
      ? 'Organize your work and track progress across projects.'
      : activePage === 'myTasks'
        ? 'Track priorities, deadlines, and progress across your work.'
        : activePage === 'calendar'
          ? 'See what’s due and plan your month.'
          : activePage === 'settings'
            ? 'Manage your profile, appearance, and workspace preferences.'
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
    } else if (label === 'Calendar') {
      setActivePage('calendar')
    } else if (label === 'Settings') {
      setActivePage('settings')
    }

    closeSidebar()
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground md:flex">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-cocoa/35 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        id="primary-navigation"
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-border bg-surface px-5 py-6 shadow-shell transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:shadow-none ${
          isSidebarOpen
            ? 'visible translate-x-0'
            : 'invisible -translate-x-full md:visible'
        }`}
      >
        <a
          href="#overview"
          className="mb-10 flex items-center gap-3 rounded-xl px-2 py-1 text-foreground"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('Overview')
          }}
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-tactile">
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
              (label === 'My Tasks' && activePage === 'myTasks') ||
              (label === 'Calendar' && activePage === 'calendar') ||
              (label === 'Settings' && activePage === 'settings')

            return (
              <button
                key={label}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigateTo(label)}
                className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-[background-color,color,transform,box-shadow] ${
                  isActive
                    ? 'border-primary/15 bg-sage-soft text-primary shadow-sm'
                    : 'border-transparent text-muted hover:bg-background hover:text-foreground active:translate-y-px'
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
            className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition-[background-color,transform] hover:border-border hover:bg-background active:translate-y-px"
            aria-label="User profile: Alex Morgan, workspace member"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-coral-soft text-sm font-semibold text-cocoa shadow-sm ring-1 ring-coral/20">
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
        <header className="flex min-h-[4.75rem] items-center justify-between gap-4 border-b border-border bg-surface px-4 shadow-[0_2px_10px_rgb(77_56_39/0.04)] sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
              aria-controls="primary-navigation"
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted shadow-sm transition-[background-color,transform,box-shadow] hover:bg-sage-soft hover:text-foreground active:translate-y-px active:shadow-none md:hidden"
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
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-[background-color,transform,box-shadow] hover:bg-sage-soft active:translate-y-px active:shadow-none"
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
          ) : activePage === 'calendar' ? (
            <CalendarPage />
          ) : activePage === 'settings' ? (
            <SettingsPage />
          ) : (
            <>
              <section
                aria-labelledby="welcome-heading"
                className="relative isolate overflow-hidden rounded-[1.75rem] border border-primary/15 bg-sage-soft px-6 py-7 shadow-panel sm:px-8 sm:py-9 lg:px-10 lg:py-10"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-14 -top-20 -z-10 size-64 rounded-full bg-butter/30 blur-2xl sm:right-16 sm:top-[-8rem]"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-20 right-1/4 -z-10 size-48 rounded-full bg-coral/15 blur-2xl"
                />
                <div className="relative z-10 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface/75 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary shadow-sm">
                      <span className="size-1.5 rounded-full bg-coral" />
                      Your workspace
                    </span>
                    <p className="text-xs font-medium text-muted">
                      {currentDate}
                    </p>
                  </div>
                  <h2
                    id="welcome-heading"
                    className="mt-5 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-cocoa sm:text-4xl lg:text-[2.75rem]"
                  >
                    Good afternoon, Nouha
                    <span aria-hidden="true" className="ml-2 inline-block">
                      <svg
                        className="inline size-7 -translate-y-1 text-coral sm:size-8"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 21s-8.5-5.3-8.5-12A4.5 4.5 0 0 1 12 6.7 4.5 4.5 0 0 1 20.5 9c0 6.7-8.5 12-8.5 12Z" />
                      </svg>
                    </span>
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted sm:text-base sm:leading-7">
                    Here&apos;s what&apos;s happening with your projects today.
                  </p>
                  <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    <span aria-hidden="true" className="text-base text-coral">
                      ✦
                    </span>
                    Small steps make lovely progress.
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-4 right-3 hidden w-[18rem] sm:block lg:right-8 lg:w-[21rem]"
                >
                  <svg viewBox="0 0 320 230" fill="none">
                    <circle cx="258" cy="48" r="30" fill="var(--butter)" />
                    <path
                      d="M258 8v-6m0 98v-6m40-46h6m-98 0h6m74-28 5-5m-70 70 5-5m60 0 5 5m-70-70 5 5"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M26 206c17-44 34-57 52-67m-20 58c-2-22-12-34-31-39m46 24c4-19 16-31 34-36"
                      stroke="var(--primary)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M53 184c-17-2-28-12-31-26 17-1 29 8 31 26Zm12-7c1-17 10-28 25-32 1 17-8 29-25 32Z"
                      fill="var(--primary)"
                    />
                    <g transform="rotate(-5 164 126)">
                      <rect
                        x="89"
                        y="43"
                        width="155"
                        height="153"
                        rx="20"
                        fill="var(--border)"
                      />
                      <rect
                        x="81"
                        y="34"
                        width="155"
                        height="153"
                        rx="20"
                        fill="var(--surface)"
                        stroke="var(--border)"
                        strokeWidth="2"
                      />
                      <rect
                        x="101"
                        y="54"
                        width="40"
                        height="7"
                        rx="3.5"
                        fill="var(--coral)"
                      />
                      <rect
                        x="101"
                        y="78"
                        width="16"
                        height="16"
                        rx="5"
                        fill="var(--sage-soft)"
                      />
                      <path
                        d="m105 86 4 4 7-9"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="125"
                        y="82"
                        width="90"
                        height="7"
                        rx="3.5"
                        fill="var(--border)"
                      />
                      <rect
                        x="101"
                        y="109"
                        width="16"
                        height="16"
                        rx="5"
                        fill="var(--butter-soft)"
                      />
                      <rect
                        x="125"
                        y="114"
                        width="76"
                        height="7"
                        rx="3.5"
                        fill="var(--border)"
                      />
                      <rect
                        x="101"
                        y="140"
                        width="16"
                        height="16"
                        rx="5"
                        fill="var(--coral-soft)"
                      />
                      <rect
                        x="125"
                        y="145"
                        width="84"
                        height="7"
                        rx="3.5"
                        fill="var(--border)"
                      />
                    </g>
                    <g transform="rotate(7 255 170)">
                      <rect
                        x="220"
                        y="137"
                        width="75"
                        height="58"
                        rx="15"
                        fill="var(--coral)"
                      />
                      <path
                        d="m238 166 10 9 20-23"
                        stroke="var(--primary-foreground)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <path
                      d="m68 54 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"
                      fill="var(--coral)"
                    />
                  </svg>
                </div>
              </section>

              <section aria-label="Workspace summary" className="mt-7">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {summaryMetrics.map(
                    ({
                      label,
                      value,
                      icon,
                      detail,
                      iconTone,
                      accentTone,
                    }) => (
                    <div
                      key={label}
                      className="relative isolate overflow-hidden rounded-[1.5rem] border border-border bg-surface p-5 shadow-panel transition-transform duration-200 hover:-translate-y-1 sm:p-6"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 top-0 h-1 ${accentTone}`}
                      />
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-sm font-semibold text-foreground">
                          {label}
                        </dt>
                        <span
                          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 ${iconTone}`}
                        >
                          <MetricIcon name={icon} />
                        </span>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        <dd className="text-4xl font-semibold leading-none tracking-tight text-cocoa">
                          {value}
                        </dd>
                        <span
                          aria-hidden="true"
                          className="mb-1 flex items-center gap-1"
                        >
                          <span className={`size-1.5 rounded-full ${accentTone}`} />
                          <span className={`size-1.5 rounded-full ${accentTone} opacity-60`} />
                          <span className={`size-1.5 rounded-full ${accentTone} opacity-30`} />
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-muted">
                        {detail}
                      </p>
                    </div>
                    ),
                  )}
                </dl>
              </section>

              <section
                aria-labelledby="recent-tasks-heading"
                className="mt-8 overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-panel"
              >
                <div className="flex flex-col gap-3 border-b border-border bg-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-butter/30 text-cocoa shadow-sm">
                      <MetricIcon name="tasks" />
                    </span>
                    <div>
                    <h3
                      id="recent-tasks-heading"
                      className="text-base font-semibold tracking-tight"
                    >
                      Recent tasks
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      A few things you&apos;re moving forward.
                    </p>
                    </div>
                  </div>
                  <span className="ml-[3.25rem] w-fit rounded-full border border-butter/40 bg-butter/20 px-3 py-1.5 text-xs font-semibold text-cocoa sm:ml-0">
                    {recentTasks.length} little wins in motion
                  </span>
                </div>

                <ul className="divide-y divide-border">
                  {recentTasks.map((task, index) => (
                    <li
                      key={task.title}
                      className="grid gap-3 px-5 py-4 transition-colors hover:bg-background/70 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(7rem,0.8fr)_auto] sm:items-center sm:gap-4 sm:px-6"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            index % 3 === 0
                              ? 'bg-sage-soft text-primary'
                              : index % 3 === 1
                                ? 'bg-coral/15 text-cocoa'
                                : 'bg-butter/30 text-cocoa'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted sm:hidden">
                          {task.project}
                        </p>
                        </div>
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
                        className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[task.status]}`}
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
