'use client'

import { useState, useTransition } from 'react'
import AvailabilityCalendar from './AvailabilityCalendar'
import { recurrenceLabel } from '@/lib/utils/recurrence'

interface Slot {
  id: string
  date: string
  start_time: string
  end_time: string
  availability_type: string
  is_booked: boolean
  is_recurring: boolean
  recurrence_rule: string | null
}

const TYPE_LABELS: Record<string, string> = {
  level_check: 'Level Check',
  group_session: 'Sessioni gruppo',
  both: 'Entrambi',
}

interface Props {
  initialSlots: Slot[]
  tutorId: string
  deleteAvailability: (formData: FormData) => Promise<void>
}

export default function AvailabilityManager({ initialSlots, tutorId, deleteAvailability }: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = (slotId: string) => {
    if (!confirm('Eliminare questo slot di disponibilità?')) return
    setDeletingId(slotId)
    const formData = new FormData()
    formData.set('availability_id', slotId)
    formData.set('tutor_id', tutorId)
    startTransition(async () => {
      await deleteAvailability(formData)
      setSlots(prev => prev.filter(s => s.id !== slotId))
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Toggle vista */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Disponibilità future
          <span className="ml-2 text-sm font-normal text-gray-500">({slots.length} slot)</span>
        </h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-1.5 transition ${view === 'list' ? 'bg-[var(--ff-red)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            📋 Lista
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-1.5 transition ${view === 'calendar' ? 'bg-[var(--ff-red)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            📅 Calendario
          </button>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Nessuna disponibilità impostata per le date future.
        </div>
      ) : view === 'calendar' ? (
        <AvailabilityCalendar slots={slots} onDeleteSlot={handleDelete} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orario</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ricorrenza</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slots.map((slot) => (
                <tr key={slot.id} className={`hover:bg-gray-50 ${deletingId === slot.id ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3 text-sm text-gray-900">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('it-IT', {
                      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 font-mono">
                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900">
                    {TYPE_LABELS[slot.availability_type] || slot.availability_type}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      slot.is_booked ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {slot.is_booked ? 'Prenotato' : 'Libero'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {slot.is_recurring ? (
                      <span className="text-[var(--ff-red)] text-xs font-medium">
                        ↻ {recurrenceLabel(slot.recurrence_rule)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Singolo</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {!slot.is_booked && (
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={isPending}
                        className="text-red-600 hover:underline text-sm disabled:opacity-40"
                      >
                        {deletingId === slot.id ? '...' : 'Elimina'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
