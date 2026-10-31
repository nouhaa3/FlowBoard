import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { useAuth } from './AuthContext.tsx'
import { ApiError, apiClient } from './api/client.ts'

type AuthMode = 'login' | 'register'

function BrandMark() {
  return (
    <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-tactile">
      F
    </span>
  )
}

function AuthLayout({
  children,
  mode,
}: {
  children: ReactNode
  mode: AuthMode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 font-sans text-foreground sm:px-6 sm:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-panel lg:min-h-[42rem] lg:grid-cols-[1fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-sage-soft p-10 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 size-72 rounded-full bg-butter/35 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-20 size-80 rounded-full bg-coral/20 blur-3xl"
          />
          <a href="/" className="relative z-10 inline-flex w-fit items-center gap-3">
            <BrandMark />
            <span className="text-xl font-semibold tracking-tight">FlowBoard</span>
          </a>

          <div className="relative z-10">
            <div className="mb-8 flex h-64 items-center justify-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 360 260"
                className="h-full w-full max-w-sm"
                fill="none"
              >
                <circle cx="280" cy="51" r="34" fill="var(--butter)" />
                <path
                  d="M280 5v-8m0 108v-8m46-46h8M218 51h8m87-33 6-6m-82 82 6-6m70 0 6 6m-82-82 6 6"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <g transform="rotate(-5 173 140)">
                  <rect x="74" y="58" width="190" height="160" rx="24" fill="var(--border)" />
                  <rect
                    x="64"
                    y="46"
                    width="190"
                    height="160"
                    rx="24"
                    fill="var(--surface)"
                    stroke="var(--border)"
                    strokeWidth="2"
                  />
                  <rect x="88" y="72" width="58" height="8" rx="4" fill="var(--coral)" />
                  <rect x="89" y="103" width="18" height="18" rx="6" fill="var(--sage-soft)" />
                  <path
                    d="m93 112 4 4 7-8"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect x="119" y="109" width="105" height="7" rx="3.5" fill="var(--border)" />
                  <rect x="89" y="137" width="18" height="18" rx="6" fill="var(--butter-soft)" />
                  <rect x="119" y="143" width="88" height="7" rx="3.5" fill="var(--border)" />
                  <rect x="89" y="171" width="18" height="18" rx="6" fill="var(--coral-soft)" />
                  <rect x="119" y="177" width="96" height="7" rx="3.5" fill="var(--border)" />
                </g>
                <g transform="rotate(7 285 190)">
                  <rect x="245" y="160" width="78" height="60" rx="17" fill="var(--coral)" />
                  <path
                    d="m265 190 10 10 21-24"
                    stroke="var(--primary-foreground)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <path
                  d="m55 45 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z"
                  fill="var(--coral)"
                />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              A little more in flow
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight text-cocoa">
              {mode === 'login'
                ? 'Make room for your best work.'
                : 'Build good things, one step at a time.'}
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-muted">
              Bring projects and everyday tasks together in a workspace that feels
              good to use.
            </p>
          </div>
          <p className="relative z-10 text-sm text-muted">
            Thoughtful planning for the work that matters.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md">
            <a href="/" className="mb-9 inline-flex items-center gap-3 lg:hidden">
              <BrandMark />
              <span className="text-lg font-semibold tracking-tight">FlowBoard</span>
            </a>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

function PasswordVisibilityButton({
  visible,
  onToggle,
  label,
}: {
  visible: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
      aria-pressed={visible}
      className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-sm font-medium text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {visible ? 'Hide' : 'Show'}
    </button>
  )
}

export function AuthenticationLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background px-6 font-sans text-foreground"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark />
        <span
          aria-hidden="true"
          className="size-6 animate-spin rounded-full border-2 border-border border-t-primary"
        />
        <p className="text-sm text-muted">Checking your workspace...</p>
      </div>
    </main>
  )
}

export function AuthenticationError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 font-sans text-foreground">
      <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-surface p-7 text-center shadow-panel sm:p-10">
        <div className="mx-auto mb-6 w-fit">
          <BrandMark />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t verify your session</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-tactile transition-transform hover:-translate-y-0.5 active:translate-y-px"
        >
          Try again
        </button>
      </section>
    </main>
  )
}

export function AuthPage() {
  const { refreshUser } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isRegistering = mode === 'register'

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setErrorMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (isRegistering && displayName.trim().length === 0) {
      setErrorMessage('Please enter a display name.')
      return
    }

    if (isRegistering && password !== confirmPassword) {
      setErrorMessage('Those passwords do not match. Please try again.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isRegistering) {
        await apiClient.post('auth/register', {
          display_name: displayName.trim(),
          email: email.trim(),
          password,
        })
      } else {
        await apiClient.post('auth/login', {
          email: email.trim(),
          password,
        })
      }

      await refreshUser()
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('That email and password combination was not recognized.')
      } else if (error instanceof ApiError && error.status === 409) {
        setErrorMessage(
          'An account with this email already exists. Try signing in instead.',
        )
      } else if (error instanceof ApiError && error.status === 422) {
        setErrorMessage(
          'Please check your details. Make sure your name, email, and password meet the requirements.',
        )
      } else {
        setErrorMessage(
          'We could not complete your request. Check your connection and try again.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout mode={mode}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {isRegistering ? 'Start your workspace' : 'Welcome back'}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
        {isRegistering ? 'Create your account' : 'Sign in to FlowBoard'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {isRegistering
          ? 'A calmer place to keep your projects moving.'
          : 'Pick up right where your good work left off.'}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {isRegistering && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Display name</span>
            <input
              autoComplete="name"
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              maxLength={80}
              minLength={1}
              name="displayName"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              required
              value={displayName}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email address</span>
          <input
            autoComplete="email"
            className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            maxLength={320}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Password</span>
          <span className="relative block">
            <input
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 pr-16 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              maxLength={128}
              minLength={isRegistering ? 12 : 1}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegistering ? 'At least 12 characters' : 'Your password'}
              required
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
            />
            <PasswordVisibilityButton
              visible={isPasswordVisible}
              onToggle={() => setIsPasswordVisible((visible) => !visible)}
              label="password"
            />
          </span>
          {isRegistering && (
            <span className="mt-2 block text-xs text-muted">
              Use 12-128 characters.
            </span>
          )}
        </label>

        {isRegistering && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Confirm password</span>
            <input
              autoComplete="new-password"
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              maxLength={128}
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type={isPasswordVisible ? 'text' : 'password'}
              value={confirmPassword}
            />
          </label>
        )}

        {errorMessage && (
          <p
            className="rounded-xl border border-coral/30 bg-coral-soft/60 px-4 py-3 text-sm leading-5 text-cocoa"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-tactile transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? 'Please wait...'
            : isRegistering
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        {isRegistering ? 'Already have an account?' : 'New to FlowBoard?'}{' '}
        <button
          className="font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => changeMode(isRegistering ? 'login' : 'register')}
          type="button"
        >
          {isRegistering ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <p className="mt-8 text-center text-xs leading-5 text-muted">
        By continuing, you agree to use FlowBoard thoughtfully and keep your
        account credentials private.
      </p>
    </AuthLayout>
  )
}
