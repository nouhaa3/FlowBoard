import { useState } from 'react'
import { useTheme } from './ThemeProvider.tsx'
import {
  DEFAULT_PALETTE,
  paletteOptions,
  type ThemePreference,
} from './ThemeProvider.tsx'

const appearanceOptions: {
  value: ThemePreference
  label: string
  description: string
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'A bright, clear workspace.',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'A comfortable workspace in low light.',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device appearance setting.',
  },
]

function SettingsPage() {
  const {
    themePreference,
    setThemePreference,
    palette,
    setPalette,
    resetPalette,
  } = useTheme()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [taskReminders, setTaskReminders] = useState(false)
  const [weeklySummary, setWeeklySummary] = useState(true)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7">
      <section aria-labelledby="settings-heading">
        <h2
          id="settings-heading"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Settings
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted sm:text-base sm:leading-7">
          Manage your profile, appearance, and workspace preferences.
        </p>
      </section>

      <section
        aria-labelledby="profile-heading"
        className="rounded-panel border border-border bg-surface shadow-panel"
      >
        <div className="border-b border-border px-5 py-5 sm:px-7">
          <h3 id="profile-heading" className="text-base font-semibold">
            Profile
          </h3>
          <p className="mt-1 text-sm text-muted">
            Example profile details. Profile updates are not available yet.
          </p>
        </div>
        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full border border-coral/25 bg-coral-soft text-base font-semibold text-cocoa shadow-sm"
            >
              AM
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Alex Morgan</p>
              <p className="mt-1 text-sm text-muted">Profile avatar preview</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Display name
              </span>
              <input
                type="text"
                value="Alex Morgan"
                readOnly
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-inner"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Email address
              </span>
              <input
                type="email"
                value="alex.morgan@example.com"
                readOnly
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-inner"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled
              title="Profile updates are not available yet"
              className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-60 shadow-tactile"
            >
              Save Changes
            </button>
            <p className="text-xs text-muted">
              Demo profile only. Changes cannot be saved.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="palette-heading"
        className="rounded-panel border border-border bg-surface shadow-panel"
      >
        <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h3 id="palette-heading" className="text-base font-semibold">
              Color palette
            </h3>
            <p className="mt-1 text-sm text-muted">
              Pick a little color for your workspace. It updates every page.
            </p>
          </div>
          <button
            type="button"
            onClick={resetPalette}
            disabled={palette === DEFAULT_PALETTE}
            className="min-h-10 w-fit rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,transform,box-shadow] hover:bg-sage-soft active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset to default
          </button>
        </div>
        <fieldset className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
          <legend className="sr-only">Choose a color palette</legend>
          {paletteOptions.map((option) => {
            const isSelected = palette === option.id

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPalette(option.id)}
                className={`group rounded-2xl border p-4 text-left shadow-sm transition-[background-color,border-color,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-panel active:translate-y-0 active:shadow-sm ${
                  isSelected
                    ? 'border-primary bg-sage-soft/60 ring-2 ring-primary/20'
                    : 'border-border bg-background hover:bg-surface'
                }`}
              >
                <span aria-hidden="true" className="flex gap-1.5">
                  {option.swatches.map((swatch, index) => (
                    <span
                      key={`${option.id}-${index}`}
                      className="h-7 flex-1 rounded-lg border border-black/5 shadow-inner"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </span>
                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {option.name}
                  </span>
                  {isSelected && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
                      Selected
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {option.description}
                </span>
              </button>
            )
          })}
        </fieldset>
      </section>

      <section
        aria-labelledby="appearance-heading"
        className="rounded-panel border border-border bg-surface shadow-panel"
      >
        <div className="border-b border-border px-5 py-5 sm:px-7">
          <h3 id="appearance-heading" className="text-base font-semibold">
            Appearance
          </h3>
          <p className="mt-1 text-sm text-muted">
            Choose how FlowBoard looks on this device.
          </p>
        </div>
        <fieldset className="grid gap-3 p-5 sm:grid-cols-3 sm:p-7">
          <legend className="sr-only">Appearance preference</legend>
          {appearanceOptions.map(({ value, label, description }) => {
            const isSelected = themePreference === value

            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-primary bg-sage-soft/60 shadow-sm'
                    : 'border-border hover:bg-background'
                }`}
              >
                <input
                  type="radio"
                  name="appearance"
                  value={value}
                  checked={isSelected}
                  onChange={() => setThemePreference(value)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {label}
                    {isSelected && (
                      <span className="ml-2 text-xs font-medium text-primary">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {description}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
      </section>

      <section
        aria-labelledby="preferences-heading"
        className="rounded-panel border border-border bg-surface shadow-panel"
      >
        <div className="border-b border-border px-5 py-5 sm:px-7">
          <h3 id="preferences-heading" className="text-base font-semibold">
            Preferences
          </h3>
          <p className="mt-1 text-sm text-muted">
            Example controls for future workspace preferences.
          </p>
        </div>
        <div className="divide-y divide-border px-5 sm:px-7">
          <PreferenceToggle
            label="Email notifications"
            description="A demo preference only; no emails are sent."
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <PreferenceToggle
            label="Task reminders"
            description="A demo preference only; no reminders are scheduled."
            checked={taskReminders}
            onChange={setTaskReminders}
          />
          <PreferenceToggle
            label="Weekly summary"
            description="A local demo setting; this does not create a report."
            checked={weeklySummary}
            onChange={setWeeklySummary}
          />
        </div>
        <p className="px-5 pb-5 text-xs text-muted sm:px-7">
          These preferences are temporary and reset when you leave this page.
          They are not saved or connected to a backend.
        </p>
      </section>
    </div>
  )
}

type PreferenceToggleProps = {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: PreferenceToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 py-5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-label={label}
        className="size-5 shrink-0 cursor-pointer accent-primary"
      />
    </label>
  )
}

export default SettingsPage
