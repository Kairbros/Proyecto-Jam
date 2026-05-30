'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from '@/lib/api'
import type { User, AuthResponse } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateUser: (patch: Partial<User>) => void
}

interface RegisterData {
  username: string
  displayName: string
  email: string
  password: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

function setToken(token: string) {
  localStorage.setItem('access_token', token)
}

function clearToken() {
  localStorage.removeItem('access_token')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.post('auth/refresh')
      .json<AuthResponse>()
      .then(({ accessToken, user }) => {
        setToken(accessToken)
        setAccessToken(accessToken)
        setUser(user)
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user } = await api
      .post('auth/login', { json: { email, password } })
      .json<AuthResponse>()
    setToken(accessToken)
    setAccessToken(accessToken)
    setUser(user)
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    await api.post('auth/register', { json: data })
  }, [])

  const logout = useCallback(async () => {
    await api.post('auth/logout').catch(() => {})
    clearToken()
    setAccessToken(null)
    setUser(null)
  }, [])

  // Merge changes (e.g. new avatar) into the current user so the UI updates instantly
  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev)
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}