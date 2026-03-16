'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text tracking-tight">Discovery Hub</h1>
          <p className="text-sm text-text-tertiary mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@discoveryhub.app" required autoFocus />
          </div>

          <div>
            <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password" required />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
