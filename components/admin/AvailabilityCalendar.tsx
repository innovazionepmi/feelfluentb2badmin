'use client'

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useState } from 'react'
import { recurrenceLabel } from '@/lib/utils/recurrence'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { it }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

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

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Slot
}

const TYPE_COLORS: Record<string, string> = {
  level_check: '#3b82f6',    // blue
  group_session: '#8b5cf6',  // purple
  both: '#10b981',           // green
}

const TYPE_LABELS: Record<string, string> = {
  level_check: 'Level Check',
  group_session: 'Sessione Gruppo',
  both: 'Entrambi',
}

interface Props {
  slots: Slot[]
  onDeleteSlot: (id: string) => void
}

export default function AvailabilityCalendar({ slots, onDeleteSlot }: Props) {
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const events: CalendarEvent[] = slots.map(slot => {
    const [h_start, m_start] = slot.start_time.split(':').map(Number)
    const [h_end, m_end] = slot.end_time.split(':').map(Number)
    const baseDate = new Date(slot.date + 'T00:00:00')

    const start = new Date(baseDate)
    start.setHours(h_start, m_start, 0)

    const end = new Date(baseDate)
    end.setHours(h_end, m_end, 0)

    return {
      id: slot.id,
      title: `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)} · ${TYPE_LABELS[slot.availability_type] || slot.availability_type}${slot.is_booked ? ' 🔒' : ''}`,
      start,
      end,
      resource: slot,
    }
  })

  const eventStyleGetter = (event: CalendarEvent) => {
    const color = TYPE_COLORS[event.resource.availability_type] || '#6b7280'
    return {
      style: {
        backgroundColor: event.resource.is_booked ? '#f97316' : color,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '11px',
        padding: '1px 4px',
        opacity: event.resource.is_booked ? 0.8 : 1,
      },
    }
  }

  const messages = {
    month: 'Mese',
    week: 'Settimana',
    day: 'Giorno',
    today: 'Oggi',
    previous: '‹',
    next: '›',
    noEventsInRange: 'Nessuna disponibilità in questo periodo.',
    showMore: (total: number) => `+${total} altri`,
    agenda: 'Agenda',
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900">Calendario disponibilità</h2>
        <div className="flex gap-3 text-xs ml-auto flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-blue-500"></span> Level Check</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-purple-500"></span> Sessione Gruppo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-emerald-500"></span> Entrambi</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-orange-500"></span> Prenotato</span>
        </div>
      </div>

      <div style={{ height: 520 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => setSelectedSlot(event.resource)}
          messages={messages}
          culture="it"
          views={['month', 'week', 'day']}
          startAccessor="start"
          endAccessor="end"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      {/* Popup dettaglio slot selezionato */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedSlot(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Dettaglio slot</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Data</dt>
                <dd className="font-medium">
                  {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('it-IT', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Orario</dt>
                <dd className="font-medium">{selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipo</dt>
                <dd className="font-medium">{TYPE_LABELS[selectedSlot.availability_type]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Stato</dt>
                <dd>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${selectedSlot.is_booked ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                    {selectedSlot.is_booked ? 'Prenotato' : 'Libero'}
                  </span>
                </dd>
              </div>
              {selectedSlot.is_recurring && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Ricorrenza</dt>
                  <dd className="text-blue-600 font-medium">
                    {recurrenceLabel(selectedSlot.recurrence_rule)}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex gap-3 mt-5">
              {!selectedSlot.is_booked && (
                <button
                  onClick={() => {
                    onDeleteSlot(selectedSlot.id)
                    setSelectedSlot(null)
                  }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                >
                  Elimina slot
                </button>
              )}
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
