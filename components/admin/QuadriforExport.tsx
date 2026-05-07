'use client'

import { useState } from 'react'

interface ConvOption {
  id: string
  group_id: string
  group_name: string
  session_number: number
  scheduled_date: string
}

interface Props {
  programId: string
  conversations: ConvOption[]
}

export default function QuadriforExport({ programId, conversations }: Props) {
  const [selectedSession, setSelectedSession] = useState<number | ''>('')

  if (conversations.length === 0) return null

  // Numeri di sessione unici (ordinati)
  const sessionNumbers = Array.from(
    new Set(conversations.map(c => c.session_number))
  ).sort((a, b) => a - b)

  // Conversazioni per la sessione selezionata (una per gruppo)
  const selectedConvs =
    selectedSession !== ''
      ? conversations.filter(c => c.session_number === selectedSession)
      : []

  return (
    <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
        📄 Crea file presenze per Quadrifor
      </h2>
      <p className="text-xs text-[var(--ff-muted)] mb-4">
        Seleziona una conversazione e scarica il CSV per ciascun gruppo.
      </p>

      <div className="flex flex-wrap items-start gap-6">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Conversazione
          </label>
          <select
            value={selectedSession}
            onChange={e =>
              setSelectedSession(e.target.value === '' ? '' : parseInt(e.target.value))
            }
            className="px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] min-w-[180px]"
          >
            <option value="">-- Seleziona lezione --</option>
            {sessionNumbers.map(n => (
              <option key={n} value={n}>
                Lezione {n}
              </option>
            ))}
          </select>
        </div>

        {selectedConvs.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-600">
              Scarica CSV per gruppo:
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedConvs.map(conv => (
                <a
                  key={conv.id}
                  href={`/api/programs/${programId}/quadrifor-csv?conversation_id=${conv.id}`}
                  className="inline-flex items-center gap-2 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  ⬇ {conv.group_name}
                </a>
              ))}
            </div>
            {selectedConvs.length === 1 && selectedConvs[0].scheduled_date && (
              <p className="text-xs text-[var(--ff-muted)]">
                {new Date(selectedConvs[0].scheduled_date + 'T00:00:00').toLocaleDateString(
                  'it-IT',
                  { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
