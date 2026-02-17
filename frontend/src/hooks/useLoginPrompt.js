import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// useLoginPrompt — controls soft prompt visibility and persistence.
// - Reads/writes localStorage only in useEffect (SSR-safe, no hydration mismatch).
// - Prompt is hidden until after mount, then we decide from localStorage + auth.
// - On logout only (auth true -> false), clear dismissal so the prompt can show again.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'auth_login_prompt_dismissed'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function useLoginPrompt() {
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [storageChecked, setStorageChecked] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const prevAuthRef = useRef(isAuthenticated)

  // After mount: read persisted dismissal from localStorage (client-only).
  // Don't show prompt until we've read storage — avoids flash on remount (e.g. every keypress).
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const storage = getStorage()
    if (!storage) {
      setStorageChecked(true)
      return
    }
    const saved = storage.getItem(STORAGE_KEY)
    setDismissed(saved === 'true')
    setStorageChecked(true)
  }, [mounted])

  // When user logs out (transition from authenticated to not), clear dismissal.
  useEffect(() => {
    if (!mounted) return
    const wasAuth = prevAuthRef.current
    prevAuthRef.current = isAuthenticated
    if (wasAuth && !isAuthenticated) {
      const storage = getStorage()
      if (storage) storage.removeItem(STORAGE_KEY)
      setDismissed(false)
    }
  }, [isAuthenticated, mounted])

  const dismiss = useCallback(() => {
    setDismissed(true)
    const storage = getStorage()
    if (storage) storage.setItem(STORAGE_KEY, 'true')
  }, [])

  // Only show after we've read localStorage so remounts (e.g. on keypress) don't flash the card.
  const showPrompt = mounted && storageChecked && !isAuthenticated && !dismissed

  return { showPrompt, dismiss }
}
