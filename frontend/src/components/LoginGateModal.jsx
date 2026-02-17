import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// LoginGateModal — blocking centered modal after N messages.
// Blurs background, disables chat until authenticated; explains why.
// ---------------------------------------------------------------------------

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    background: 'rgba(26, 26, 26, 0.98)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 24px 48px -12px rgba(0,0,0,0.6)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.5,
  },
  cta: {
    marginTop: 20,
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#10a37f',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
  },
}

export function LoginGateModal({ open, onLoginClick }) {
  const { login } = useAuth()

  if (!open) return null

  const handleLogin = () => {
    if (typeof onLoginClick === 'function') {
      onLoginClick()
    } else {
      login({})
    }
  }

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="login-gate-title">
      <div style={styles.modal}>
        <h2 id="login-gate-title" style={styles.title}>Sign in to continue</h2>
        <p style={styles.message}>
          Sign in to continue and save your conversation.
        </p>
        <button type="button" style={styles.cta} onClick={handleLogin}>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
