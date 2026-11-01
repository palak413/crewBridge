/**
 * Which workspace the app area shows:
 * - 'live': signed in; data comes from the CrewBridge API (the httpOnly session cookie authenticates).
 * - 'demo': the browser-only sample workspace, clearly labelled as demo data.
 * - null: neither chosen yet — /app sends the visitor to sign in.
 */
export type WorkspaceMode = 'live' | 'demo'

export const MODE_KEY = 'crewbridge.mode'

export function getMode(): WorkspaceMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY)
    return v === 'live' || v === 'demo' ? v : null
  } catch {
    return null
  }
}

export function setMode(mode: WorkspaceMode | null) {
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode)
    else localStorage.removeItem(MODE_KEY)
  } catch {
    // Storage unavailable: the choice lasts until reload.
  }
}
