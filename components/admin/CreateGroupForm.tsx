'use client'

import { useState, useTransition } from 'react'

interface Tutor {
  id: string
  full_name: string
  email: string
}

interface Props {
  levelLabels: string[]
  tutors: Tutor[]
  createGroup: (formData: FormData) => Promise<void>
}

export default function CreateGroupForm({ levelLabels, tutors, createGroup }: Props) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [tutorId, setTutorId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !level) return

    const formData = new FormData()
    formData.set('name', name.trim())
    formData.set('level', level)
    if (tutorId) formData.set('tutor_id', tutorId)

    startTransition(async () => {
      await createGroup(formData)
      setName('')
      setLevel('')
      setTutorId('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome gruppo</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="es. Gruppo B1 - Mattina"
          required
          disabled={isPending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Livello</label>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          required
          disabled={isPending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] disabled:opacity-50"
        >
          <option value="">— Seleziona livello —</option>
          {levelLabels.map(lvl => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tutor (opzionale)</label>
        <select
          value={tutorId}
          onChange={e => setTutorId(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] disabled:opacity-50"
        >
          <option value="">— Nessun tutor —</option>
          {tutors.map(t => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
        {tutors.length === 0 && (
          <p className="text-xs text-gray-400 mt-1 italic">Nessun tutor assegnato al programma.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!name.trim() || !level || isPending}
        className="w-full bg-[var(--ff-red)] text-white py-2 rounded-lg hover:bg-[var(--ff-red-700)] transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? 'Creazione...' : 'Crea gruppo'}
      </button>
    </form>
  )
}
