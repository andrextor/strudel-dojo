// Storage can be missing or throw (private mode, blocked site data); the app must keep working.
export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Progress is a convenience, losing it is acceptable.
  }
}
