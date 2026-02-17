import { useSoftLoginPrompt } from '../hooks/useSoftLoginPrompt'

/**
 * FloatingLoginPrompt — Soft, non-blocking prompt in bottom-right.
 * Uses useSoftLoginPrompt for session-based lifecycle control.
 */

const styles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 1000,
    width: '320px',
    background: '#171717',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  text: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.5',
    margin: '0 0 16px 0',
  },
  button: {
    width: '100%',
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
}

// Simple keyframe for entry animation
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style')
  styleTag.innerHTML = `
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `
  document.head.appendChild(styleTag)
}

export function FloatingLoginPrompt({ onLogin }) {
  const { showPrompt, dismiss } = useSoftLoginPrompt()

  if (!showPrompt) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Unlock full potential</h3>
        <button 
          style={styles.closeBtn} 
          onClick={dismiss}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="12"></line>
          </svg>
        </button>
      </div>
      <p style={styles.text}>Sign in to save your conversation history and access advanced features.</p>
      <button 
        style={styles.button} 
        onClick={onLogin}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        Sign in with Google
      </button>
    </div>
  )
}
