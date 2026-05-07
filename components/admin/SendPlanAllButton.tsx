'use client'

import { useState } from 'react'

interface Props {
  sendPlanToAll: () => Promise<{ sent: number; skipped: number; errors: string[] }>
  participantCount: number
}

export default function SendPlanAllButton({ sendPlanToAll, participantCount }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; skipped: number; errors: string[] } | null>(null)

  const handleClick = async () => {
    if (!confirm(
      `Inviare il piano formativo a tutti i ${participantCount} partecipanti?\n\nVerranno esclusi automaticamente quelli non ancora assegnati a un gruppo.`
    )) return

    setLoading(true)
    setResult(null)
    try {
      const res = await sendPlanToAll()
      setResult(res)
    } catch {
      setResult({ sent: 0, skipped: 0, errors: ['Errore durante l\'invio'] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
            Invio in corso...
          </>
        ) : (
          '✉ Invia piano a tutti i partecipanti'
        )}
      </button>

      {result && (
        <div className={`text-xs rounded-lg px-3 py-2 ${result.errors.length > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
          {result.sent > 0 && <span>✓ {result.sent} email inviate. </span>}
          {result.skipped > 0 && <span className="text-gray-500">{result.skipped} saltati (nessun gruppo). </span>}
          {result.errors.length > 0 && <span>⚠ {result.errors.length} errori.</span>}
        </div>
      )}
    </div>
  )
}
