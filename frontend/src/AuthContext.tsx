import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import { ApiError, apiClient } from './api/client.ts'
import { getCsrfToken } from './api/csrf.ts'

export type AuthenticatedUser = {
  id: string
  email: string
  display_name: string
  created_at: string
}

export type AuthenticationStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error'

type AuthContextValue = {
  user: AuthenticatedUser | null
  status: AuthenticationStatus
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isLoggingOut: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
let currentUserRequest: Promise<AuthenticatedUser | null> | null = null

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.display_name === 'string' &&
    typeof user.created_at === 'string'
  )
}

function getCurrentUser(): Promise<AuthenticatedUser | null> {
  if (currentUserRequest === null) {
    currentUserRequest = apiClient
      .get<unknown>('auth/me')
      .then((result) => {
        if (!isAuthenticatedUser(result)) {
          throw new Error('The authentication response was invalid.')
        }
        return result
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      })
      .finally(() => {
        currentUserRequest = null
      })
  }

  return currentUserRequest
}

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [status, setStatus] = useState<AuthenticationStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const logoutInProgress = useRef(false)

  const refreshUser = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setStatus(currentUser === null ? 'unauthenticated' : 'authenticated')
    } catch {
      setUser(null)
      setStatus('error')
      setError('Unable to verify your session. Please try again.')
    }
  }, [])

  const logout = useCallback(async () => {
    if (logoutInProgress.current) {
      return
    }

    logoutInProgress.current = true
    setIsLoggingOut(true)
    try {
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        throw new Error('The logout request could not be verified.')
      }

      await apiClient.post('auth/logout', undefined, {
        'X-CSRF-Token': csrfToken,
      })
      setUser(null)
      setStatus('unauthenticated')
      setError(null)
    } finally {
      logoutInProgress.current = false
      setIsLoggingOut(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    void getCurrentUser()
      .then((currentUser) => {
        if (!active) {
          return
        }
        setUser(currentUser)
        setStatus(currentUser === null ? 'unauthenticated' : 'authenticated')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setUser(null)
        setStatus('error')
        setError('Unable to verify your session. Please try again.')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading',
        error,
        isLoggingOut,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
