'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Program { id: string; name: string; companies: { name: string } | null }
interface ConvSummary {
  id: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
  group: { name: string; level: string }
  sessionNumber: number
}
interface Member { participant_id: string; full_name: string; email: string }
interface AttRec { participant_id: string; status: string; notes: string | null }

interface Props {
  programs: Program[]
  conversations: ConvSummary[]
  members: Member[]
  existingAttendances: AttRec[]
  selectedProgramId: string
  selectedConversationId: string
  selectedConv: ConvSummary | null
  saveAttendance: (formData: FormData) => Promise<void>
  justSaved: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-red-100 text-red-700', A2: 'bg-orange-100 text-orange-700',
  B1: 'bg-yellow-100 text-yellow-700', B2: 'bg-green-100 text-green-700',
  C1: 'bg-blue-100 text-blue-700', C2: 'bg-purple-100 text-purple-700',
}

const STATUS_OPTIONS = [
  { value: 'present',   label: '✓ Presente',     cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'absent',    label: '✗ Assente',       cls: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'justified', label: '~ Giustificato',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function PresenzeClient({
  programs, conversations, members, existingAttendances,
  selectedProgramId, selectedConversationId, selectedConv,
  saveAttendance, justSaved,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: string; notes: string }>>(() => {
    const init: Record<string, { status: string; notes: string }> = {}
    for (const m of members) {
      const existing = existingAttendances.find(a => a.participant_id === m.participant_id)
      init[m.participant_id] = { status: existing?.status || 'present', notes: existing?.notes || '' }
    }
    return init
  })

  const handleProgramChange = (pid: string) => {
    router.push(pid ? `/admin/presenze?program_id=${pid}` : '/admin/presenze')
  }

  const handleConvChange = (cid: string) => {
    router.push(cid
      ? `/admin/presenze?program_id=${selectedProgramId}&conversation_id=${cid}`
      : `/admin/presenze?program_id=${selectedProgramId}`)
  }

  const handleSave = async () => {
    if (!selectedConversationId || !selectedProgramId) return
    setSaving(true)
    const formData = new FormData()
    formData.set('conversation_id', selectedConversationId)
    formData.set('program_id', selectedProgramId)
    formData.set('attendance_json', JSON.stringify(
      Object.entries(attendanceState).map(([participant_id, d]) => ({
        participant_id, status: d.status, notes: d.notes || null,
      }))
    ))
    await saveAttendance(formData)
    setSaving(false)
  }

  const presentCount = Object.values(attendanceState).filter(a => a.status === 'present').length
  const absentCount  = Object.values(attendanceState).filter(a => a.status === 'absent').length
  const justCount    = Object.values(attendanceState).filter(a => a.status === 'justified').length

  return (
    <div className="space-y-6">

      {/* Step 1 + 2 — selettori affiancati */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Programma */}
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-5">
          <p className="text-xs font-bold text-[var(--ff-muted)] uppercase tracking-wide mb-3">
            1 · Programma
          </p>
          {programs.length === 0 ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Nessun programma disponibile.</p>
          ) : (
            <div className="space-y-2">
              {programs.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProgramChange(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition ${
                    selectedProgramId === p.id
                      ? 'border-[var(--ff-red)] bg-[var(--ff-red-50)] font-bold text-[var(--ff-red)]'
                      : 'border-[var(--ff-border)] hover:bg-[var(--ff-paper)] text-gray-700 font-medium'
                  }`}
                >
                  <span className="block leading-tight">{p.name}</span>
                  {p.companies?.name && (
                    <span className="text-xs text-[var(--ff-muted)] font-normal">{p.companies.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversazione */}
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-5">
          <p className="text-xs font-bold text-[var(--ff-muted)] uppercase tracking-wide mb-3">
            2 · Conversazione
          </p>
          {!selectedProgramId ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Seleziona prima un programma.</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Nessuna conversazione trovata per questo programma.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {conversations.map(c => {
                const isActive = selectedConversationId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => handleConvChange(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition ${
                      isActive
                        ? 'border-[var(--ff-red)] bg-[var(--ff-red-50)]'
                        : 'border-[var(--ff-border)] hover:bg-[var(--ff-paper)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded shrink-0 ${LEVEL_COLORS[c.group.level] || 'bg-gray-100 text-gray-700'}`}>
                        {c.group.level}
                      </span>
                      <span className={`font-semibold ${isActive ? 'text-[var(--ff-red)]' : 'text-gray-800'}`}>
                        {c.group.name} <span className="font-normal text-[var(--ff-muted)]">#{c.sessionNumber}</span>
                      </span>
                      {c.status === 'completed' && (
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--ff-muted)] mt-0.5 capitalize">
                      {formatDate(c.scheduled_date)} · {c.start_time.slice(0,5)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step 3 — Presenze */}
      {selectedConv && members.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">

          {/* Header conversazione */}
          <div className="px-6 py-4 bg-[var(--ff-paper)] border-b border-[var(--ff-border)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${LEVEL_COLORS[selectedConv.group.level] || 'bg-gray-100 text-gray-700'}`}>
                {selectedConv.group.level}
              </span>
              <h2 className="text-sm font-bold text-gray-900">
                {selectedConv.group.name} · Sessione #{selectedConv.sessionNumber}
              </h2>
              <span className="text-sm text-[var(--ff-muted)]">—</span>
              <span className="text-sm text-gray-700 capitalize">
                {formatDate(selectedConv.scheduled_date)} · {selectedConv.start_time.slice(0,5)}–{selectedConv.end_time.slice(0,5)}
              </span>
            </div>
            {/* Sommario rapido */}
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-green-700 font-semibold">{presentCount} presenti</span>
              <span className="text-red-600 font-semibold">{absentCount} assenti</span>
              <span className="text-yellow-700 font-semibold">{justCount} giustificati</span>
              <span className="text-[var(--ff-muted)] ml-auto">{members.length} partecipanti totali</span>
            </div>
          </div>

          {/* Lista partecipanti */}
          {justSaved && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-semibold">
              ✓ Presenze salvate con successo!
            </div>
          )}

          <div className="divide-y divide-[var(--ff-border)]">
            {members.map((m, i) => {
              const att = attendanceState[m.participant_id] || { status: 'present', notes: '' }
              return (
                <div key={m.participant_id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    {/* Numero + nome */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[var(--ff-paper)] border border-[var(--ff-border)] text-xs font-bold text-[var(--ff-muted)] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{m.full_name}</p>
                        <p className="text-xs text-[var(--ff-muted)] truncate">{m.email}</p>
                      </div>
                    </div>

                    {/* Status buttons */}
                    <div className="flex gap-2 shrink-0">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAttendanceState(prev => ({
                            ...prev,
                            [m.participant_id]: { ...prev[m.participant_id], status: opt.value },
                          }))}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            att.status === opt.value
                              ? opt.cls + ' shadow-sm'
                              : 'border-[var(--ff-border)] bg-white text-[var(--ff-muted)] hover:bg-[var(--ff-paper)]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note (visibile solo se assente o giustificato) */}
                  {(att.status === 'absent' || att.status === 'justified') && (
                    <div className="mt-2 ml-10">
                      <input
                        type="text"
                        placeholder="Note opzionali..."
                        value={att.notes}
                        onChange={e => setAttendanceState(prev => ({
                          ...prev,
                          [m.participant_id]: { ...prev[m.participant_id], notes: e.target.value },
                        }))}
                        className="w-full text-xs px-3 py-1.5 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] bg-white"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer salva */}
          <div className="px-6 py-4 bg-[var(--ff-paper)] border-t border-[var(--ff-border)] flex items-center justify-between gap-4">
            <p className="text-xs text-[var(--ff-muted)]">
              {presentCount}/{members.length} presenti registrati
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-6 py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : '✓ Salva presenze'}
            </button>
          </div>
        </div>
      )}

      {/* Stato: conversazione selezionata ma nessun partecipante */}
      {selectedConv && members.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)]">
          <p className="text-lg">👥</p>
          <p className="text-sm mt-2">Nessun partecipante assegnato a questo gruppo.</p>
        </div>
      )}

      {/* Stato: nessuna conversazione selezionata */}
      {selectedProgramId && !selectedConversationId && (
        <div className="bg-white rounded-xl border border-dashed border-[var(--ff-border)] p-10 text-center text-[var(--ff-muted)]">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm">Seleziona una conversazione per registrare le presenze.</p>
        </div>
      )}
    </div>
  )
}
