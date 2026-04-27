'use client'

import { useState, useMemo } from 'react'

interface Group {
  id: string
  name: string
  level: string
  tutor_id: string | null
  tutor: { id: string; full_name: string } | null
}

interface Tutor {
  id: string
  full_name: string
  personal_room_link: string | null
}

interface Props {
  groups: Group[]
  tutors: Tutor[]
  programEndDate: string | null
  createConversation: (formData: FormData) => Promise<void>
}

const DURATIONS = [30, 45, 60, 90]
const DAY_NAMES_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function countWeeklyOccurrences(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  let current = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  let count = 0
  while (current <= end) {
    count++
    current.setDate(current.getDate() + 7)
  }
  return count
}

const inputCls = "w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] bg-white"
const labelCls = "block text-xs font-semibold text-gray-600 mb-1"

export default function CreateConversationForm({ groups, tutors, programEndDate, createConversation }: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedTutorId, setSelectedTutorId] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [scheduledDate, setScheduledDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(programEndDate || '')
  const [submitting, setSubmitting] = useState(false)

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId)
    const group = groups.find(g => g.id === groupId)
    if (group?.tutor_id) {
      setSelectedTutorId(group.tutor_id)
      const tutor = tutors.find(t => t.id === group.tutor_id)
      setMeetingLink(tutor?.personal_room_link || '')
    } else {
      setSelectedTutorId('')
      setMeetingLink('')
    }
  }

  const handleTutorChange = (tutorId: string) => {
    setSelectedTutorId(tutorId)
    const tutor = tutors.find(t => t.id === tutorId)
    setMeetingLink(tutor?.personal_room_link || '')
  }

  const endTime = addMinutes(startTime, duration)

  const dayName = useMemo(() => {
    if (!scheduledDate) return ''
    const [y, m, d] = scheduledDate.split('-').map(Number)
    return DAY_NAMES_IT[new Date(y, m - 1, d).getDay()]
  }, [scheduledDate])

  const occurrenceCount = useMemo(
    () => isRecurring ? countWeeklyOccurrences(scheduledDate, recurrenceEndDate) : 1,
    [isRecurring, scheduledDate, recurrenceEndDate]
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('end_time', endTime)
    formData.set('is_recurring', String(isRecurring))
    formData.set('recurrence_end_date', isRecurring ? recurrenceEndDate : '')
    await createConversation(formData)
    setSubmitting(false)
    form.reset()
    setSelectedGroupId('')
    setSelectedTutorId('')
    setMeetingLink('')
    setStartTime('09:00')
    setDuration(60)
    setScheduledDate('')
    setIsRecurring(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div>
        <label className={labelCls}>Gruppo</label>
        <select name="group_id" required value={selectedGroupId} onChange={e => handleGroupChange(e.target.value)} className={inputCls}>
          <option value="">— Seleziona gruppo —</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.level} · {g.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Tutor</label>
        <select name="tutor_id" required value={selectedTutorId} onChange={e => handleTutorChange(e.target.value)} className={inputCls}>
          <option value="">— Seleziona tutor —</option>
          {tutors.map(t => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{isRecurring ? 'Prima data' : 'Data'}</label>
          <input type="date" name="scheduled_date" required value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ora inizio</label>
          <input type="time" name="start_time" required value={startTime}
            onChange={e => setStartTime(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Durata</label>
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`flex-1 py-1.5 text-sm rounded-lg border font-semibold transition ${
                duration === d
                  ? 'bg-[var(--ff-red)] text-white border-[var(--ff-red)]'
                  : 'bg-white text-gray-700 border-[var(--ff-border)] hover:border-[var(--ff-red)]'
              }`}
            >
              {d}&apos;
            </button>
          ))}
        </div>
        <input type="hidden" name="duration_minutes" value={duration} />
        <p className="text-xs text-[var(--ff-muted)] mt-1">Fine prevista: {endTime}</p>
      </div>

      <div>
        <label className={labelCls}>Link meeting</label>
        <input type="url" name="meeting_link" required value={meetingLink}
          onChange={e => setMeetingLink(e.target.value)}
          placeholder="https://meet.google.com/..."
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Note (opzionale)</label>
        <textarea name="notes" rows={2} className={`${inputCls} resize-none`} />
      </div>

      {/* Toggle ricorrente */}
      <div className="border-t border-[var(--ff-border)] pt-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setIsRecurring(!isRecurring)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-[var(--ff-red)]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm font-semibold text-gray-700">Ricorrente (settimanale)</span>
        </label>

        {isRecurring && (
          <div className="mt-3 space-y-3">
            <div>
              <label className={labelCls}>Ultima data</label>
              <input type="date" value={recurrenceEndDate}
                onChange={e => setRecurrenceEndDate(e.target.value)}
                min={scheduledDate || undefined}
                className={inputCls} />
            </div>

            {scheduledDate && recurrenceEndDate && occurrenceCount > 0 && (
              <div className="bg-[var(--ff-red-50)] border border-[var(--ff-red-100)] rounded-lg px-3 py-2 text-xs text-[var(--ff-red-700)]">
                Verranno create <strong>{occurrenceCount} conversazioni</strong>
                {dayName && <>, ogni <strong>{dayName}</strong></>}
                , dalle <strong>{startTime}</strong> alle <strong>{endTime}</strong>
              </div>
            )}

            {scheduledDate && recurrenceEndDate && occurrenceCount === 0 && (
              <p className="text-xs text-[var(--ff-red)]">La data di fine è precedente alla data di inizio.</p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || (isRecurring && occurrenceCount === 0)}
        className="w-full bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2.5 rounded-lg transition text-sm font-bold disabled:opacity-50"
      >
        {submitting
          ? 'Salvataggio...'
          : isRecurring && occurrenceCount > 1
            ? `Crea ${occurrenceCount} conversazioni`
            : 'Crea conversazione'}
      </button>
    </form>
  )
}
