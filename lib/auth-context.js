'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// Map Supabase auth emails to display names
const USER_MAP = {
  'wes@shrsde.com': 'Wes',
  'gibbanella1@gmail.com': 'Gibb',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null
      setUser(u)
      setDisplayName(u ? (USER_MAP[u.email] || u.email) : null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      setUser(u)
      setDisplayName(u ? (USER_MAP[u.email] || u.email) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setDisplayName(null)
  }

  return (
    <AuthContext.Provider value={{ user, displayName, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
