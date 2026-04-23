'use client'

import { useState } from 'react'

interface Props {
  userId: string
  userEmail: string
  confirmUser: (formData: FormData) => Promise<void>
  resendInvite: (formData: FormData) => Promise<void>
}

export default function UserConfirmButton({ userId, userEmail, confirmUser, resendInvite }: Props) {
  const [loading, setLoading] = useState<'confirm' | 'resend' | null>(null)

  const handleConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirm(`Abilitare manualmente l'account di ${userEmail}?`)) return
    setLoading('confirm')
    const formData = new FormData(e.currentTarget)
    await confirmUser(formData)
    setLoading(null)
  }

  const handleResend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading('resend')
    const formData = new FormData(e.currentTarget)
    await resendInvite(formData)
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <form onSubmit={handleConfirm} className="inline">
        <input type="hidden" name="user_id" value={userId} />
        <button
          type="submit"
          disabled={loading !== null}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition disabled:opacity-50 text-xs font-medium"
        >
          {loading === 'confirm' ? '...' : 'Abilita ora'}
        </button>
      </form>

      <form onSubmit={handleResend} className="inline">
        <input type="hidden" name="email" value={userEmail} />
        <button
          type="submit"
          disabled={loading !== null}
          className="text-blue-600 hover:underline disabled:opacity-50 text-xs"
        >
          {loading === 'resend' ? '...' : 'Rinvia invito'}
        </button>
      </form>
    </div>
  )
}
