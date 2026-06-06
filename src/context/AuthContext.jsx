import { createContext, useContext, useState, useCallback } from 'react'
import { signIn as signInApi } from '../api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'apex_user'

function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)
  const [loading, setLoading] = useState(false)

  const signIn = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const data = await signInApi({ email, password })
      setUser(data.user)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user))
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
