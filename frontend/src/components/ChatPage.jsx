import { useState, useCallback } from 'react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { ChatProvider, useChat } from '../contexts/ChatContext'
import { useLoginPrompt } from '../hooks/useLoginPrompt'
import { useLoginGate } from '../hooks/useLoginGate'
import { LoginPrompt } from './LoginPrompt'
import { LoginGateModal } from './LoginGateModal'

// ---------------------------------------------------------------------------
// Message threshold after which the hard gate (LoginGateModal) appears.
// ---------------------------------------------------------------------------
const LOGIN_GATE_MESSAGE_THRESHOLD = 3

// ---------------------------------------------------------------------------
// Inner chat UI: uses contexts and hooks; renders prompt + gate + input.
// ---------------------------------------------------------------------------
function ChatPageContent({ onLoginClick }) {
  const { isAuthenticated, login, logout } = useAuth()
  const { messages, messageCount, addMessage } = useChat()
  const { showPrompt, dismiss } = useLoginPrompt()
  const { gateActive, canSend } = useLoginGate(LOGIN_GATE_MESSAGE_THRESHOLD)

  const [input, setInput] = useState('')

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return
    if (!canSend) return
    addMessage({ role: 'user', content: text })
    setInput('')
  }, [input, canSend, addMessage])

  return (
    <div style={pageStyles.layout}>
      <header style={pageStyles.header}>
        <span style={pageStyles.headerTitle}>Chat</span>
        {isAuthenticated ? (
          <button type="button" style={pageStyles.headerBtn} onClick={() => logout()}>
            Log out
          </button>
        ) : null}
      </header>

      <main style={pageStyles.main}>
        <div style={pageStyles.messages}>
          {messages.length === 0 && (
            <p style={pageStyles.placeholder}>
              Send a message to start. After {LOGIN_GATE_MESSAGE_THRESHOLD} messages, you’ll be prompted to sign in to continue.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={m.role === 'user' ? pageStyles.msgUser : pageStyles.msgAssistant}>
              {m.content}
            </div>
          ))}
        </div>

        <div style={pageStyles.inputRow}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={canSend ? 'Type a message...' : 'Sign in to continue'}
            disabled={!canSend}
            style={{
              ...pageStyles.input,
              opacity: canSend ? 1 : 0.6,
              cursor: canSend ? 'text' : 'not-allowed',
            }}
          />
          <button
            type="button"
            style={pageStyles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || !canSend}
          >
            Send
          </button>
        </div>
      </main>

      {/* Phase 1: soft prompt — bottom-right, non-blocking, dismissible */}
      <LoginPrompt onLoginClick={onLoginClick} />

      {/* Phase 2: hard gate — centered, blocking until authenticated */}
      <LoginGateModal open={gateActive} onLoginClick={onLoginClick} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page-level styles (minimal, dark-themed).
// ---------------------------------------------------------------------------
const pageStyles = {
  layout: {
    minHeight: '100vh',
    background: '#0d0d0d',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  headerBtn: {
    padding: '6px 12px',
    fontSize: 13,
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: 8,
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 720,
    margin: '0 auto',
    width: '100%',
    padding: 24,
  },
  messages: {
    flex: 1,
    marginBottom: 16,
  },
  placeholder: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    margin: 0,
  },
  msgUser: {
    marginBottom: 12,
    padding: '10px 14px',
    background: 'rgba(16, 163, 127, 0.2)',
    borderRadius: 12,
    fontSize: 14,
    marginLeft: 'auto',
    maxWidth: '85%',
  },
  msgAssistant: {
    marginBottom: 12,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    fontSize: 14,
    maxWidth: '85%',
  },
  inputRow: {
    display: 'flex',
    gap: 10,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: 14,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    outline: 'none',
  },
  sendBtn: {
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#10a37f',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    cursor: 'pointer',
  },
}

// ---------------------------------------------------------------------------
// ChatPage — integration example. Wrap with AuthProvider + ChatProvider.
// Pass initialUser to AuthProvider when you have a persisted user (e.g. Firebase).
// Wire onLoginClick to your auth (e.g. Firebase signInWithPopup) so "Continue with Google" works.
// ---------------------------------------------------------------------------
export function ChatPage({ initialUser = null, onLoginClick }) {
  return (
    <AuthProvider initialUser={initialUser}>
      <ChatProvider>
        <ChatPageContent onLoginClick={onLoginClick} />
      </ChatProvider>
    </AuthProvider>
  )
}

export default ChatPage
