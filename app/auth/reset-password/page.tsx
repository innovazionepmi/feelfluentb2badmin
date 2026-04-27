'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const hash = window.location.hash.slice(1) // rimuove il '#'
    const params = new URLSearchParams(hash)

    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const type = params.get('type')

    if (access_token && refresh_token && type === 'recovery') {
      // Flusso implicito: imposto la sessione manualmente dai token nel hash
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setSessionError('Link non valido o scaduto. Richiedi un nuovo link di reset.')
        } else {
          setReady(true)
        }
      })
    } else {
      // Flusso PKCE: la sessione è già stata stabilita dal callback server-side
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true)
        } else {
          setSessionError('Link non valido o scaduto. Richiedi un nuovo link di reset.')
        }
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Le password non coincidono.')
      return
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">FeelFluent B2B</h1>
          <p className="text-gray-600">Nuova password</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-5xl">✓</div>
              <p className="text-gray-800 font-medium">Password aggiornata!</p>
              <p className="text-sm text-gray-500">Verrai reindirizzato alla dashboard...</p>
            </div>
          ) : sessionError ? (
            <div className="text-center space-y-4">
              <div className="text-red-500 text-4xl">✕</div>
              <p className="text-red-700 font-medium text-sm">{sessionError}</p>
              <a href="/login/forgot-password" className="block text-sm text-[var(--ff-red)] hover:underline mt-2">
                Richiedi un nuovo link
              </a>
            </div>
          ) : !ready ? (
            <div className="text-center py-8 text-gray-400 text-sm">Verifica del link in corso...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-gray-600">Scegli la tua nuova password.</p>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nuova password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--ff-red)] focus:border-transparent"
                  placeholder="Minimo 8 caratteri"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Conferma password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--ff-red)] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--ff-red)] text-white py-3 rounded-lg hover:bg-[var(--ff-red-700)] disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? 'Salvataggio...' : 'Salva nuova password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
