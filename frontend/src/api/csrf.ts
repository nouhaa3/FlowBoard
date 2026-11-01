export function getCsrfToken(): string | null {
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('flowboard_csrf='))

  if (!cookie) {
    return null
  }

  try {
    return decodeURIComponent(cookie.slice('flowboard_csrf='.length)) || null
  } catch {
    return null
  }
}
