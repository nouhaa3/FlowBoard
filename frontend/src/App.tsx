import { useTheme } from './ThemeProvider.tsx'

function App() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground sm:p-8">
      <section className="w-full max-w-xl rounded-panel border border-border bg-surface p-8 text-center shadow-panel sm:p-12">
        <div className="mb-10 flex justify-end">
          <button
            type="button"
            aria-label={`Switch to ${nextTheme} mode`}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Switch to {nextTheme} mode
          </button>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          FlowBoard
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Your project workspace is ready.
        </p>
      </section>
    </main>
  )
}

export default App
