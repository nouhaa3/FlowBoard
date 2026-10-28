import { useState } from 'react'

type TaskStatus = 'To Do' | 'In Progress' | 'Done'

type CalendarTask = {
  id: string
  title: string
  project: string
  dueDate: string
  status: TaskStatus
}

type CalendarDay = {
  date: Date
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
}

const calendarTasks: CalendarTask[] = [
  {
    id: 'onboarding',
    title: 'Finalize onboarding flow',
    project: 'Website refresh',
    dueDate: '2026-10-30',
    status: 'In Progress',
  },
  {
    id: 'campaign-brief',
    title: 'Review campaign brief',
    project: 'Q4 brand campaign',
    dueDate: '2026-10-29',
    status: 'To Do',
  },
  {
    id: 'launch-checklist',
    title: 'Prepare launch checklist',
    project: 'Product launch',
    dueDate: '2026-10-27',
    status: 'Done',
  },
  {
    id: 'components',
    title: 'Update component library',
    project: 'Design system',
    dueDate: '2026-10-31',
    status: 'In Progress',
  },
  {
    id: 'weekly-update',
    title: 'Share weekly project update',
    project: 'Website refresh',
    dueDate: '2026-11-02',
    status: 'To Do',
  },
  {
    id: 'research-participants',
    title: 'Confirm research participants',
    project: 'Customer research',
    dueDate: '2026-11-03',
    status: 'In Progress',
  },
  {
    id: 'release-notes',
    title: 'Document release notes',
    project: 'Mobile app beta',
    dueDate: '2026-11-05',
    status: 'To Do',
  },
  {
    id: 'campaign-assets',
    title: 'Archive final campaign assets',
    project: 'Q4 brand campaign',
    dueDate: '2026-10-26',
    status: 'Done',
  },
]

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const statusStyles: Record<TaskStatus, string> = {
  'To Do': 'border border-butter/25 bg-butter-soft/60 text-cocoa',
  'In Progress': 'border border-primary/15 bg-sage-soft text-primary',
  Done: 'border border-coral/20 bg-coral-soft/70 text-cocoa',
}

const statusMarkerStyles: Record<TaskStatus, string> = {
  'To Do': 'border border-butter bg-butter-soft',
  'In Progress': 'bg-primary',
  Done: 'bg-coral',
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function addMonths(date: Date, amount: number) {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const day = Math.min(
    date.getDate(),
    getDaysInMonth(targetMonth.getFullYear(), targetMonth.getMonth()),
  )

  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day)
}

function getCalendarDays(month: Date, todayKey: string): CalendarDay[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const monthDayCount = getDaysInMonth(year, monthIndex)
  const visibleDayCount = Math.ceil((firstDayOffset + monthDayCount) / 7) * 7

  return Array.from({ length: visibleDayCount }, (_, index) => {
    const date = new Date(year, monthIndex, index - firstDayOffset + 1)
    const dateKey = getDateKey(date)

    return {
      date,
      dateKey,
      isCurrentMonth: date.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
    }
  })
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )
  const todayKey = getDateKey(new Date())
  const selectedDateKey = getDateKey(selectedDate)
  const calendarDays = getCalendarDays(visibleMonth, todayKey)
  const selectedTasks = calendarTasks.filter(
    (task) => task.dueDate === selectedDateKey,
  )

  function changeMonth(amount: number) {
    const nextSelectedDate = addMonths(selectedDate, amount)
    setSelectedDate(nextSelectedDate)
    setVisibleMonth(
      new Date(
        nextSelectedDate.getFullYear(),
        nextSelectedDate.getMonth(),
        1,
      ),
    )
  }

  function returnToToday() {
    const today = new Date()
    setSelectedDate(today)
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  function selectDate(date: Date) {
    setSelectedDate(date)
    if (date.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Calendar navigation"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {formatMonth(visibleMonth)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Select a day to see its scheduled tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={returnToToday}
            className="min-h-11 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-sm transition-[background-color,transform,box-shadow] hover:bg-sage-soft active:translate-y-px active:shadow-none"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-border bg-surface shadow-sm">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
              className="flex size-11 items-center justify-center rounded-l-xl text-muted transition-colors hover:bg-sage-soft hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="h-5 border-l border-border" />
            <button
              type="button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
              className="flex size-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:bg-sage-soft hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section
        aria-label={`${formatMonth(visibleMonth)} calendar`}
        className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel"
      >
        <div className="grid grid-cols-7 border-b border-border bg-background/60">
          {weekdays.map((weekday) => (
            <div
              key={weekday}
              className="py-3 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted sm:py-3.5 sm:text-xs"
            >
              <span aria-hidden="true" className="sm:hidden">
                {weekday.slice(0, 1)}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                {weekday}
              </span>
              <span className="sr-only">{weekday}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dayTasks = calendarTasks.filter(
              (task) => task.dueDate === day.dateKey,
            )
            const isSelected = day.dateKey === selectedDateKey
            const accessibleTaskSummary =
              dayTasks.length > 0
                ? `, ${dayTasks.length} ${
                    dayTasks.length === 1 ? 'task' : 'tasks'
                  }: ${dayTasks
                    .map((task) => `${task.title}, ${task.status}`)
                    .join('; ')}`
                : ', no tasks'

            return (
              <button
                key={day.dateKey}
                type="button"
                aria-label={`${formatSelectedDate(day.date)}${accessibleTaskSummary}`}
                aria-pressed={isSelected}
                onClick={() => selectDate(day.date)}
                className={`group flex min-h-20 min-w-0 flex-col items-stretch border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-background/70 sm:min-h-28 sm:p-2 ${
                  isSelected ? 'bg-primary/10' : 'bg-surface'
                } ${!day.isCurrentMonth ? 'text-muted/60' : 'text-foreground'}`}
              >
                <span className="flex items-center justify-center sm:justify-start">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-xs font-medium sm:size-8 sm:text-sm ${
                      day.isToday
                        ? 'bg-primary text-primary-foreground'
                        : isSelected
                          ? 'font-semibold text-primary'
                          : ''
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                </span>
                <span className="mt-1 flex min-w-0 flex-col gap-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <span
                      key={task.id}
                      className={`flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[0.55rem] leading-tight sm:gap-1.5 sm:px-1.5 sm:text-[0.68rem] ${
                        task.status === 'In Progress'
                          ? 'bg-sage-soft text-primary'
                          : task.status === 'Done'
                              ? 'border border-coral/20 bg-coral-soft/70 text-cocoa'
                              : 'border border-butter/20 bg-butter-soft/55 text-cocoa'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 shrink-0 rounded-full ${statusMarkerStyles[task.status]}`}
                      />
                      <span className="hidden truncate sm:inline">
                        {task.title}
                      </span>
                      <span className="truncate sm:hidden">
                        {task.title.split(' ')[0]}
                      </span>
                      <span className="sr-only"> — {task.status}</span>
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="truncate px-1 text-[0.55rem] font-medium text-muted sm:px-1.5 sm:text-[0.68rem]">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section
        aria-labelledby="selected-day-heading"
        aria-live="polite"
        className="rounded-panel border border-border bg-surface shadow-panel"
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3
            id="selected-day-heading"
            className="text-base font-semibold tracking-tight"
          >
            {formatSelectedDate(selectedDate)}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {selectedTasks.length === 1
              ? '1 task due'
              : `${selectedTasks.length} tasks due`}
          </p>
        </div>

        {selectedTasks.length > 0 ? (
          <ul className="divide-y divide-border">
            {selectedTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${statusMarkerStyles[task.status]}`}
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
                <span
                  className={`ml-5 w-fit rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm sm:ml-0 ${statusStyles[task.status]}`}
                >
                  {task.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center sm:px-6">
            <p className="text-sm font-medium text-foreground">
              Nothing scheduled for this day
            </p>
            <p className="mt-1 text-sm text-muted">
              Choose another date to see its tasks.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default CalendarPage
