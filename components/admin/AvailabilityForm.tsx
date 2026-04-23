'use client'

import { useState } from 'react'

interface Props {
  tutorId: string
  addAvailability: (formData: FormData) => Promise<void>
}

const DAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

export default function AvailabilityForm({ tutorId, addAvailability }: Props) {
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedDate, setSelectedDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mostra il giorno della settimana della data selezionata
  const selectedDayName = selectedDate
    ? DAY_NAMES[new Date(selectedDate + 'T00:00:00').getDay()]
    : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const form = e.currentTarget
    const formData = new FormData(form)

    if (isRecurring) {
      formData.set('is_recurring', 'on')
      formData.set('recurrence_type', recurrenceType) // weekly o monthly
    } else {
      formData.delete('is_recurring')
      formData.delete('recurrence_type')
      formData.delete('recurrence_end_date')
    }

    await addAvailability(formData)
    setSubmitting(false)
    form.reset()
    setIsRecurring(false)
    setRecurrenceType('weekly')
    setSelectedDate('')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Aggiungi disponibilità</h2>

      <input type="hidden" name="tutor_id" value={tutorId} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Data <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="date"
            name="date"
            required
            min={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
            Ora inizio <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            id="start_time"
            name="start_time"
            required
            step="900"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
            Ora fine <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            id="end_time"
            name="end_time"
            required
            step="900"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="availability_type" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo disponibilità
        </label>
        <select
          id="availability_type"
          name="availability_type"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="both">Level check e sessioni gruppo</option>
          <option value="level_check">Solo Level Check</option>
          <option value="group_session">Solo sessioni gruppo</option>
        </select>
      </div>

      {/* Toggle ricorrente */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Disponibilità ricorrente</span>
        </label>
      </div>

      {isRecurring && (
        <div className="border border-blue-100 bg-blue-50 rounded-lg p-4 space-y-3">
          <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Impostazioni ricorrenza</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequenza
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence_type_ui"
                  value="weekly"
                  checked={recurrenceType === 'weekly'}
                  onChange={() => setRecurrenceType('weekly')}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Ogni settimana
                  {selectedDayName && recurrenceType === 'weekly' && (
                    <span className="ml-1 text-blue-600 font-medium">(ogni {selectedDayName})</span>
                  )}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence_type_ui"
                  value="monthly"
                  checked={recurrenceType === 'monthly'}
                  onChange={() => setRecurrenceType('monthly')}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">Ogni mese (stesso giorno)</span>
              </label>
            </div>
            {!selectedDate && isRecurring && recurrenceType === 'weekly' && (
              <p className="text-xs text-orange-600 mt-1">Seleziona prima una data per vedere il giorno della settimana.</p>
            )}
          </div>

          <div>
            <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fino a (data fine ricorrenza) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="recurrence_end_date"
              name="recurrence_end_date"
              required={isRecurring}
              min={selectedDate || today}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Salvataggio...' : 'Aggiungi disponibilità'}
      </button>
    </form>
  )
}
