import { createContext, useContext, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// AuthContext — single source of truth for authentication state.
// Safe for SSR: state is client-only; no localStorage in initial state.
// Wire login/logout to your provider (e.g. Firebase) in the provider component.
// ---------------------------------------------------------------------------

const AuthContext = createContext(null)

export function AuthProvider({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser)

  const isAuthenticated = Boolean(user)

  const login = useCallback((userPayload) => {
    setUser(userPayload)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
