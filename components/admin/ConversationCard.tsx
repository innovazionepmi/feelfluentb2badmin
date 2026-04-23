'use client'

import { useState } from 'react'

interface Member {
  participant_id: string
  full_name: string
  email: string
}

interface Attendance {
  participant_id: string
  status: string
  notes: string | null
}

interface Conversation {
  id: string
  group_id: string
  scheduled_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  meeting_link: string
  status: string
  notes: string | null
  group: { name: string; level: string }
  tutor: { full_name: string } | null
}

interface Props {
  conversation: Conversation
  sessionNumber: number
  members: Member[]
  attendances: Attendance[]
  updateStatus: (formData: FormData) => Promise<void>
  saveAttendance: (formData: FormData) => Promise<void>
  deleteConversation: (formData: FormData) => Promise<void>
  rescheduleConversation: (formData: FormData) => Promise<void>
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programmata',
  completed: 'Completata',
  cancelled: 'Annullata',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-red-100 text-red-700',
  A2: 'bg-orange-100 text-orange-700',
  B1: 'bg-yellow-100 text-yellow-700',
  B2: 'bg-green-100 text-green-700',
  C1: 'bg-blue-100 text-blue-700',
  C2: 'bg-purple-100 text-purple-700',
}
const ATTENDANCE_STATUS = [
  { value: 'present', label: 'Presente' },
  { value: 'absent', label: 'Assente' },
  { value: 'justified', label: 'Giustificato' },
]

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function ConversationCard({
  conversation, sessionNumber, members, attendances,
  updateStatus, saveAttendance, deleteConversation, rescheduleConversation,
}: Props) {
  const [showAttendance, setShowAttendance] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState(conversation.scheduled_date)
  const [newStartTime, setNewStartTime] = useState(conversation.start_time.slice(0, 5))
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: string; notes: string }>>(() => {
    const initial: Record<string, { status: string; notes: string }> = {}
    for (const m of members) {
      const existing = attendances.find(a => a.participant_id === m.participant_id)
      initial[m.participant_id] = { status: existing?.status || 'present', notes: existing?.notes || '' }
    }
    return initial
  })
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const date = new Date(conversation.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  const previewEndTime = addMinutes(newStartTime, conversation.duration_minutes)
  const isCancelled = conversation.status === 'cancelled'
  const presentCount = attendances.filter(a => a.status === 'present').length

  const handleSaveAttendance = async () => {
    setSavingAttendance(true)
    const formData = new FormData()
    formData.set('conversation_id', conversation.id)
    formData.set('attendance_json', JSON.stringify(
      Object.entries(attendanceState).map(([participant_id, data]) => ({
        participant_id, status: data.status, notes: data.notes || null,
      }))
    ))
    await saveAttendance(formData)
    setSavingAttendance(false)
    setShowAttendance(false)
  }

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    const formData = new FormData()
    formData.set('conversation_id', conversation.id)
    formData.set('status', newStatus)
    await updateStatus(formData)
    setUpdatingStatus(false)
  }

  const handleReschedule = async () => {
    setRescheduling(true)
    const formData = new FormData()
    formData.set('conversation_id', conversation.id)
    formData.set('new_date', newDate)
    formData.set('new_start_time', newStartTime)
    formData.set('duration_minutes', String(conversation.duration_minutes))
    await rescheduleConversation(formData)
    setRescheduling(false)
    setShowReschedule(false)
  }

  const handleDelete = async () => {
    if (!confirm('Eliminare questa conversazione?')) return
    setDeleting(true)
    const formData = new FormData()
    formData.set('conversation_id', conversation.id)
    await deleteConversation(formData)
    setDeleting(false)
  }

  return (
    <div className={`bg-white rounded-lg border ${isCancelled ? 'opacity-60 border-gray-200' : 'border-gray-200 shadow-sm'}`}>

      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`mt-0.5 px-2 py-0.5 text-xs font-bold rounded shrink-0 ${LEVEL_COLORS[conversation.group.level] || 'bg-gray-100 text-gray-700'}`}>
            {conversation.group.level}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">
              {conversation.group.name}
              <span className="ml-2 text-gray-400 font-normal">#{sessionNumber}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {date} · {conversation.start_time.slice(0, 5)}–{conversation.end_time.slice(0, 5)} ({conversation.duration_minutes}')
            </div>
            <div className="text-xs text-gray-500">Tutor: {conversation.tutor?.full_name || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {attendances.length > 0 && (
            <span className="text-xs text-gray-400">{presentCount}/{members.length} presenti</span>
          )}
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[conversation.status]}`}>
            {STATUS_LABELS[conversation.status]}
          </span>
        </div>
      </div>

      {conversation.notes && (
        <div className="px-4 pb-2 text-xs text-gray-500 italic">{conversation.notes}</div>
      )}

      {/* Azioni principali */}
      {!isCancelled && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <a
            href={conversation.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            🔗 Link meeting
          </a>

          <button
            onClick={() => { setShowReschedule(!showReschedule); setShowAttendance(false) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              showReschedule ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            📅 Rinvia
          </button>

          <button
            onClick={() => { setShowAttendance(!showAttendance); setShowReschedule(false) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              showAttendance ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Presenze {members.length > 0 && <span className="text-gray-400">({members.length})</span>}
          </button>

          {conversation.status === 'scheduled' && (
            <button
              onClick={() => handleUpdateStatus('completed')}
              disabled={updatingStatus}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition disabled:opacity-50"
            >
              ✓ Completa
            </button>
          )}
          {conversation.status === 'completed' && (
            <button
              onClick={() => handleUpdateStatus('scheduled')}
              disabled={updatingStatus}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Riapri
            </button>
          )}

          <button
            onClick={() => handleUpdateStatus('cancelled')}
            disabled={updatingStatus}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            Annulla
          </button>

          {conversation.status === 'scheduled' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-gray-400 hover:text-red-500 transition ml-auto disabled:opacity-50"
            >
              Elimina
            </button>
          )}
        </div>
      )}

      {isCancelled && (
        <div className="px-4 pb-3 border-t pt-3 flex gap-2">
          <button
            onClick={() => handleUpdateStatus('scheduled')}
            disabled={updatingStatus}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Riattiva
          </button>
          <button
            onClick={() => { setShowReschedule(!showReschedule) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              showReschedule ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            📅 Rinvia
          </button>
        </div>
      )}

      {/* Pannello rinvio */}
      {showReschedule && (
        <div className="border-t bg-orange-50 px-4 py-4">
          <h4 className="text-xs font-semibold text-orange-700 mb-3 uppercase tracking-wide">Rinvia sessione</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nuova data</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nuovo orario</label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => setNewStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Fine prevista: <strong>{previewEndTime}</strong> ({conversation.duration_minutes}' di durata)
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleReschedule}
              disabled={rescheduling || !newDate || !newStartTime}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              {rescheduling ? 'Salvataggio...' : 'Conferma rinvio'}
            </button>
            <button
              onClick={() => setShowReschedule(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Pannello presenze */}
      {showAttendance && members.length > 0 && (
        <div className="border-t bg-gray-50 px-4 py-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Presenze — sessione #{sessionNumber}</h4>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.participant_id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{m.full_name}</div>
                  <div className="text-xs text-gray-400 truncate">{m.email}</div>
                </div>
                <select
                  value={attendanceState[m.participant_id]?.status || 'present'}
                  onChange={e => setAttendanceState(prev => ({
                    ...prev,
                    [m.participant_id]: { ...prev[m.participant_id], status: e.target.value },
                  }))}
                  className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  {ATTENDANCE_STATUS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Note..."
                  value={attendanceState[m.participant_id]?.notes || ''}
                  onChange={e => setAttendanceState(prev => ({
                    ...prev,
                    [m.participant_id]: { ...prev[m.participant_id], notes: e.target.value },
                  }))}
                  className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveAttendance}
            disabled={savingAttendance}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {savingAttendance ? 'Salvataggio...' : 'Salva presenze'}
          </button>
        </div>
      )}

      {showAttendance && members.length === 0 && (
        <div className="border-t bg-gray-50 px-4 py-4 text-sm text-gray-400 italic">
          Nessun partecipante assegnato a questo gruppo.
        </div>
      )}
    </div>
  )
}
