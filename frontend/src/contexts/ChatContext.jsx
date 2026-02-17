import { createContext, useContext, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// ChatContext — holds messages and message count for gating logic.
// useLoginGate() uses messageCount to trigger the hard gate after N messages.
// ---------------------------------------------------------------------------

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])

  const messageCount = messages.length

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const setMessagesOverride = useCallback((nextMessages) => {
    setMessages(Array.isArray(nextMessages) ? nextMessages : [])
  }, [])

  const value = {
    messages,
    messageCount,
    addMessage,
    setMessages: setMessagesOverride,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
