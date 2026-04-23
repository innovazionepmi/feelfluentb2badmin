'use client'

import { useState, useTransition } from 'react'

interface Participant {
  id: string
  full_name: string
  email: string
  created_at: string
}

interface Props {
  participants: Participant[]         // già filtrati per azienda e non ancora iscritti
  addBulkParticipants: (formData: FormData) => Promise<void>
}

export default function BulkAddParticipants({ participants, addBulkParticipants }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState('')

  const filtered = participants.filter(p =>
    p.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    p.email.toLowerCase().includes(filter.toLowerCase())
  )

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(p => next.delete(p.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(p => next.add(p.id))
        return next
      })
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (selected.size === 0) return
    const formData = new FormData()
    selected.forEach(id => formData.append('participant_ids', id))
    startTransition(async () => {
      await addBulkParticipants(formData)
      setSelected(new Set())
    })
  }

  if (participants.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        Tutti i partecipanti dell&apos;azienda sono già nel programma.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra cerca + seleziona tutti */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista con checkbox */}
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
        {/* Header seleziona tutti */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAll}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs font-medium text-gray-600">
            {allFilteredSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
            {filtered.length !== participants.length && ` (${filtered.length} visibili)`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-400 text-center">Nessun risultato</div>
        ) : (
          filtered.map(p => (
            <label
              key={p.id}
              className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors ${
                selected.has(p.id) ? 'bg-blue-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="rounded border-gray-300 text-blue-600 mt-0.5 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{p.full_name}</div>
                <div className="text-xs text-gray-400 truncate">{p.email}</div>
                <div className="text-xs text-gray-300 mt-0.5">
                  Aggiunto il {new Date(p.created_at).toLocaleDateString('it-IT', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      {/* Footer con count e bottone */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {selected.size > 0
            ? `${selected.size} selezionat${selected.size === 1 ? 'o' : 'i'}`
            : 'Nessuno selezionato'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0 || isPending}
          className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Aggiunta...' : `Aggiungi ${selected.size > 0 ? selected.size : ''} al programma`}
        </button>
      </div>
    </div>
  )
}
