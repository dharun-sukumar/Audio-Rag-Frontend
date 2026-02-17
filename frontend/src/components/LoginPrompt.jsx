import { useLoginPrompt } from '../hooks/useLoginPrompt'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// LoginPrompt — floating card bottom-right, non-blocking, dismissible.
// Shown only when useLoginPrompt says so; persists dismissal in localStorage.
// Minimal dark theme; clean fade + slide-up animation via CSS.
// ---------------------------------------------------------------------------

const styles = {
  wrapper: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 90,
    maxWidth: 'calc(100vw - 48px)',
    width: 320,
    opacity: 0,
    transform: 'translateY(12px)',
    animation: 'loginPromptIn 0.35s ease-out forwards',
  },
  card: {
    background: 'rgba(26, 26, 26, 0.98)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
  },
  closeBtn: {
    flexShrink: 0,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
  },
  body: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.45,
  },
  cta: {
    marginTop: 14,
    width: '100%',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    background: '#10a37f',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
}

// Inject keyframes once (no external CSS file required)
if (typeof document !== 'undefined') {
  const id = 'login-prompt-keyframes'
  if (!document.getElementById(id)) {
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes loginPromptIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
  }
}

export function LoginPrompt({ onLoginClick }) {
  const { showPrompt, dismiss } = useLoginPrompt()
  const { login } = useAuth()

  if (!showPrompt) return null

  const handleLogin = () => {
    if (typeof onLoginClick === 'function') {
      onLoginClick()
    } else {
      // Default: caller can pass onLoginClick to wire to their auth (e.g. Firebase).
      login({})
    }
  }

  return (
    <div style={styles.wrapper} role="dialog" aria-label="Sign in prompt">
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>Sign in to save your progress</h3>
          <button
            type="button"
            aria-label="Close"
            style={styles.closeBtn}
            onClick={dismiss}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p style={styles.body}>
          Sign in to unlock the full experience and keep your conversations saved.
        </p>
        <button type="button" style={styles.cta} onClick={handleLogin}>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
