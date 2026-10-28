import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
type Theme = Exclude<ThemePreference, 'system'>
export type PaletteId =
  | 'sunset-terracotta'
  | 'lavender-dream'
  | 'mocha-cloud'
  | 'blue-serenity'
  | 'berry-velvet'
  | 'pastel-lagoon'

export type PaletteOption = {
  id: PaletteId
  name: string
  description: string
  swatches: [string, string, string, string, string]
}

export const DEFAULT_PALETTE: PaletteId = 'sunset-terracotta'

export const paletteOptions: PaletteOption[] = [
  {
    id: 'sunset-terracotta',
    name: 'Sunset Terracotta',
    description: 'Rust, peach, cream, and cocoa',
    swatches: ['#9f4f37', '#d98267', '#edb89f', '#f4e8d6', '#604c40'],
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Plum, lavender, mauve, and ivory',
    swatches: ['#684576', '#aa82b7', '#d7bddf', '#f3edf5', '#49394f'],
  },
  {
    id: 'mocha-cloud',
    name: 'Mocha Cloud',
    description: 'Espresso, taupe, mushroom, and rose beige',
    swatches: ['#705345', '#a88c78', '#d3b9a5', '#f2ebe3', '#493b34'],
  },
  {
    id: 'blue-serenity',
    name: 'Blue Serenity',
    description: 'Slate, steel, mist, and dusty blue',
    swatches: ['#4d6b82', '#7898ad', '#b5cbd7', '#edf3f6', '#344451'],
  },
  {
    id: 'berry-velvet',
    name: 'Berry Velvet',
    description: 'Burgundy, berry, raspberry, and blush',
    swatches: ['#873f5d', '#b64d72', '#df9bb1', '#f8edf1', '#4b2d39'],
  },
  {
    id: 'pastel-lagoon',
    name: 'Pastel Lagoon',
    description: 'Aqua, mint, peach, blush, and sage',
    swatches: ['#34766b', '#69a99a', '#9dcec0', '#f2c2ae', '#3c554c'],
  },
]

type ThemeContextValue = {
  theme: Theme
  themePreference: ThemePreference
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
  palette: PaletteId
  setPalette: (palette: PaletteId) => void
  resetPalette: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const THEME_STORAGE_KEY = 'flowboard-theme'
const PALETTE_STORAGE_KEY = 'flowboard-palette'

function isPaletteId(value: string | null): value is PaletteId {
  return paletteOptions.some((palette) => palette.id === value)
}

function getInitialThemePreference(): ThemePreference {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (
    savedTheme === 'light' ||
    savedTheme === 'dark' ||
    savedTheme === 'system'
  ) {
    return savedTheme
  }

  return 'system'
}

function getInitialPalette(): PaletteId {
  const savedPalette = window.localStorage.getItem(PALETTE_STORAGE_KEY)
  return isPaletteId(savedPalette) ? savedPalette : DEFAULT_PALETTE
}

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getInitialThemePreference,
  )
  const [palette, setPalette] = useState<PaletteId>(getInitialPalette)
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  const theme = themePreference === 'system' ? systemTheme : themePreference

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.palette = palette
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette)
  }, [theme, themePreference, palette])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  function toggleTheme() {
    setThemePreference(theme === 'light' ? 'dark' : 'light')
  }

  function resetPalette() {
    setPalette(DEFAULT_PALETTE)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference,
        toggleTheme,
        palette,
        setPalette,
        resetPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
