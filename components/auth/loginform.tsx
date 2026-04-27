'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  // Gestisce il link di reset password con flusso implicito (hash-based)
  // Supabase invia #access_token=...&type=recovery nel fragment
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      window.location.href = '/auth/reset-password' + hash
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (error: any) {
      setError(error.message || 'Credenziali non valide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--ff-border)] shadow-md p-8">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-[var(--ff-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--ff-red)] focus:border-transparent outline-none transition"
            placeholder="tua@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-[var(--ff-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--ff-red)] focus:border-transparent outline-none transition"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-[var(--ff-red-50)] border border-[var(--ff-red-100)] text-[var(--ff-red-700)] px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-sm"
        >
          {loading ? 'Caricamento...' : 'Accedi'}
        </button>

        <div className="text-center">
          <a
            href="/login/forgot-password"
            className="text-sm text-[var(--ff-muted)] hover:text-[var(--ff-red)] transition"
          >
            Password dimenticata?
          </a>
        </div>
      </form>
    </div>
  )
}
