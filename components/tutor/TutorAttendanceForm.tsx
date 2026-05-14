'use client'

import { useState } from 'react'

interface Member {
  participant_id: string
  full_name: string
  email: string
}

interface AttendanceRecord {
  participant_id: string
  status: string
  notes: string
  entry_time: string
  exit_time: string
}

const ATTENDANCE_STATUS = [
  { value: '', label: '— Non registrato' },
  { value: 'present', label: 'Presente' },
  { value: 'absent', label: 'Assente' },
  { value: 'justified', label: 'Giustificato' },
]

interface Props {
  conversationId: string
  members: Member[]
  existingAttendances: AttendanceRecord[]
  saveAttendance: (formData: FormData) => Promise<{ error?: string }>
}

export default function TutorAttendanceForm({
  members,
  existingAttendances,
  saveAttendance,
}: Props) {
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceRecord>>(() => {
    const initial: Record<string, AttendanceRecord> = {}
    for (const m of members) {
      const existing = existingAttendances.find(a => a.participant_id === m.participant_id)
      initial[m.participant_id] = {
        participant_id: m.participant_id,
        status: existing?.status || '',
        notes: existing?.notes || '',
        entry_time: existing?.entry_time || '',
        exit_time: existing?.exit_time || '',
      }
    }
    return initial
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')

    const formData = new FormData()
    formData.set('attendance_json', JSON.stringify(
      Object.values(attendanceState).map(r => ({
        participant_id: r.participant_id,
        status: r.status,
        notes: r.notes || null,
        entry_time: r.entry_time || null,
        exit_time: r.exit_time || null,
      }))
    ))

    const result = await saveAttendance(formData)
    setSaving(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const presentCount = Object.values(attendanceState).filter(a => a.status === 'present').length

  return (
    <div className="space-y-4">

      {/* Riepilogo veloce */}
      <div className="flex items-center gap-4 text-sm text-[var(--ff-muted)]">
        <span>{members.length} partecipanti</span>
        {presentCount > 0 && (
          <span className="text-green-600 font-semibold">✓ {presentCount} presenti</span>
        )}
      </div>

      {/* Partecipanti */}
      <div className="space-y-3">
        {members.map(m => {
          const state = attendanceState[m.participant_id]
          const isPresent = state?.status === 'present'

          return (
            <div key={m.participant_id} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4">
              {/* Riga 1: nome + status */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{m.full_name}</div>
                  <div className="text-xs text-[var(--ff-muted)] truncate">{m.email}</div>
                </div>
                <select
                  value={state?.status ?? ''}
                  onChange={e => setAttendanceState(prev => ({
                    ...prev,
                    [m.participant_id]: { ...prev[m.participant_id], status: e.target.value },
                  }))}
                  className="text-xs px-2 py-1.5 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] bg-white"
                >
                  {ATTENDANCE_STATUS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Riga 2: orari + note (solo se presente) */}
              {isPresent && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[var(--ff-muted)] shrink-0">Entrata</span>
                    <input
                      type="time"
                      value={state?.entry_time || ''}
                      onChange={e => setAttendanceState(prev => ({
                        ...prev,
                        [m.participant_id]: { ...prev[m.participant_id], entry_time: e.target.value },
                      }))}
                      className="text-xs px-2 py-1 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] w-24 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[var(--ff-muted)] shrink-0">Uscita</span>
                    <input
                      type="time"
                      value={state?.exit_time || ''}
                      onChange={e => setAttendanceState(prev => ({
                        ...prev,
                        [m.participant_id]: { ...prev[m.participant_id], exit_time: e.target.value },
                      }))}
                      className="text-xs px-2 py-1 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] w-24 bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Note..."
                    value={state?.notes || ''}
                    onChange={e => setAttendanceState(prev => ({
                      ...prev,
                      [m.participant_id]: { ...prev[m.participant_id], notes: e.target.value },
                    }))}
                    className="text-xs px-2 py-1 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] flex-1 min-w-[120px] bg-white"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          ⚠ {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50"
      >
        {saving ? 'Salvataggio...' : saved ? '✓ Presenze salvate!' : 'Salva presenze'}
      </button>
    </div>
  )
}
