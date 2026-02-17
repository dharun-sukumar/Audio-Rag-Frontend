import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'

// ---------------------------------------------------------------------------
// useLoginGate — shows blocking modal after N messages (configurable).
// - When messageCount >= threshold and not authenticated, gate is active.
// - Prevents further sends until authenticated.
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLD = 3

export function useLoginGate(threshold = DEFAULT_THRESHOLD) {
  const { isAuthenticated } = useAuth()
  const { messageCount } = useChat()
  const [gateActive, setGateActive] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setGateActive(false)
      return
    }
    setGateActive(messageCount >= threshold)
  }, [isAuthenticated, messageCount, threshold])

  const canSend = isAuthenticated || !gateActive

  return { gateActive, canSend }
}
