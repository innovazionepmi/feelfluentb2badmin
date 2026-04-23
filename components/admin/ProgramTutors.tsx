'use client'

import { useState, useTransition } from 'react'

interface Tutor {
  id: string
  full_name: string
  email: string
  languages?: string[]
}

interface Props {
  assignedTutors: Tutor[]
  availableTutors: Tutor[]
  addTutor: (formData: FormData) => Promise<void>
  removeTutor: (formData: FormData) => Promise<void>
}

export default function ProgramTutors({
  assignedTutors,
  availableTutors,
  addTutor,
  removeTutor,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedTutorId, setSelectedTutorId] = useState('')

  const handleAdd = () => {
    if (!selectedTutorId) return
    const formData = new FormData()
    formData.set('tutor_id', selectedTutorId)
    startTransition(async () => {
      await addTutor(formData)
      setSelectedTutorId('')
    })
  }

  const handleRemove = (tutorId: string, tutorName: string) => {
    if (!confirm(`Rimuovere ${tutorName} dal programma?`)) return
    const formData = new FormData()
    formData.set('tutor_id', tutorId)
    startTransition(async () => {
      await removeTutor(formData)
    })
  }

  return (
    <div className="space-y-4">
      {/* Tutor già assegnati */}
      {assignedTutors.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Nessun tutor assegnato al programma.</p>
      ) : (
        <ul className="space-y-2">
          {assignedTutors.map(t => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{t.full_name}</div>
                <div className="text-xs text-gray-400 truncate">{t.email}</div>
                {t.languages && t.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.languages.map(lang => (
                      <span
                        key={lang}
                        className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(t.id, t.full_name)}
                disabled={isPending}
                className="text-red-400 hover:text-red-600 transition text-xs whitespace-nowrap flex-shrink-0 disabled:opacity-40"
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Aggiungi tutor */}
      {availableTutors.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedTutorId}
            onChange={e => setSelectedTutorId(e.target.value)}
            disabled={isPending}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">— Aggiungi tutor —</option>
            {availableTutors.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name}
                {t.languages && t.languages.length > 0 ? ` (${t.languages.join(', ')})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedTutorId || isPending}
            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? '...' : 'Aggiungi'}
          </button>
        </div>
      )}

      {availableTutors.length === 0 && assignedTutors.length > 0 && (
        <p className="text-xs text-gray-400 italic">Tutti i tutor sono già nel programma.</p>
      )}
    </div>
  )
}
