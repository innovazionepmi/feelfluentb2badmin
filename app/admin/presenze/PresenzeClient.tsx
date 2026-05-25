'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Program  { id: string; name: string; companies: { name: string } | null }
interface Group    { id: string; name: string; level: string }
interface ConvSummary {
  id: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
  group_id: string
  group: { name: string; level: string }
  sessionNumber: number
}
interface Member { participant_id: string; full_name: string; email: string }
interface AttRec { participant_id: string; status: string; notes: string | null }

interface Props {
  programs: Program[]
  groups: Group[]
  conversations: ConvSummary[]
  members: Member[]
  existingAttendances: AttRec[]
  selectedProgramId: string
  selectedGroupId: string
  selectedConversationId: string
  selectedConv: ConvSummary | null
  saveAttendance: (formData: FormData) => Promise<void>
  justSaved: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  Basic1: 'bg-blue-100 text-blue-700',
  Basic2: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-purple-100 text-purple-700',
}

const STATUS_OPTIONS = [
  { value: 'present',   label: '✓ Presente',    cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'absent',    label: '✗ Assente',      cls: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'justified', label: '~ Giustificato', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
]

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

function buildUrl(pid: string, gid: string, cid: string) {
  const p = new URLSearchParams()
  if (pid) p.set('program_id', pid)
  if (gid) p.set('group_id', gid)
  if (cid) p.set('conversation_id', cid)
  return `/admin/presenze${p.toString() ? '?' + p.toString() : ''}`
}

export default function PresenzeClient({
  programs, groups, conversations, members, existingAttendances,
  selectedProgramId, selectedGroupId, selectedConversationId,
  selectedConv, saveAttendance, justSaved,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: string; notes: string }>>(() => {
    const init: Record<string, { status: string; notes: string }> = {}
    for (const m of members) {
      const ex = existingAttendances.find(a => a.participant_id === m.participant_id)
      init[m.participant_id] = { status: ex?.status || 'present', notes: ex?.notes || '' }
    }
    return init
  })

  // Conversazioni filtrate per gruppo selezionato
  const filteredConversations = selectedGroupId
    ? conversations.filter(c => c.group_id === selectedGroupId)
    : conversations

  const handleProgramChange = (pid: string) =>
    router.push(buildUrl(pid, '', ''))

  const handleGroupChange = (gid: string) =>
    router.push(buildUrl(selectedProgramId, gid, ''))

  const handleConvChange = (cid: string) =>
    router.push(buildUrl(selectedProgramId, selectedGroupId, cid))

  const handleSave = async () => {
    if (!selectedConversationId || !selectedProgramId) return
    setSaving(true)
    const fd = new FormData()
    fd.set('conversation_id', selectedConversationId)
    fd.set('program_id', selectedProgramId)
    fd.set('group_id', selectedGroupId)
    fd.set('attendance_json', JSON.stringify(
      Object.entries(attendanceState).map(([participant_id, d]) => ({
        participant_id, status: d.status, notes: d.notes || null,
      }))
    ))
    await saveAttendance(fd)
    setSaving(false)
  }

  const presentCount  = Object.values(attendanceState).filter(a => a.status === 'present').length
  const absentCount   = Object.values(attendanceState).filter(a => a.status === 'absent').length
  const justCount     = Object.values(attendanceState).filter(a => a.status === 'justified').length

  // ── Step stati ──────────────────────────────────────────────────────────
  const stepDone   = (s: number) => {
    if (s === 1) return !!selectedProgramId
    if (s === 2) return !!selectedGroupId
    if (s === 3) return !!selectedConversationId
    return false
  }

  return (
    <div className="space-y-4">

      {/* ── Step bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ff-muted)] mb-2 select-none">
        {['Programma', 'Gruppo', 'Conversazione', 'Presenze'].map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              stepDone(i + 1)
                ? 'bg-[var(--ff-red)] text-white'
                : 'bg-[var(--ff-border)] text-[var(--ff-muted)]'
            }`}>
              {stepDone(i + 1) ? '✓' : i + 1}
            </span>
            <span className={stepDone(i + 1) ? 'text-gray-700' : ''}>{label}</span>
            {i < 3 && <span className="text-[var(--ff-border)]">›</span>}
          </span>
        ))}
      </div>

      {/* ── Selettori ─────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">

        {/* 1 · Programma */}
        <SelectorCard
          step={1}
          title="Programma"
          active={!!selectedProgramId}
        >
          {programs.length === 0 ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Nessun programma disponibile.</p>
          ) : programs.map(p => (
            <SelectorButton
              key={p.id}
              selected={selectedProgramId === p.id}
              onClick={() => handleProgramChange(p.id)}
            >
              <span className="block font-semibold leading-tight">{p.name}</span>
              {p.companies?.name && (
                <span className="text-xs text-[var(--ff-muted)] font-normal">{p.companies.name}</span>
              )}
            </SelectorButton>
          ))}
        </SelectorCard>

        {/* 2 · Gruppo */}
        <SelectorCard
          step={2}
          title="Gruppo"
          active={!!selectedGroupId}
          locked={!selectedProgramId}
        >
          {!selectedProgramId ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Prima seleziona un programma.</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Nessun gruppo trovato.</p>
          ) : groups.map(g => (
            <SelectorButton
              key={g.id}
              selected={selectedGroupId === g.id}
              onClick={() => handleGroupChange(g.id)}
            >
              <span className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-xs font-bold rounded shrink-0 ${LEVEL_COLORS[g.level] || 'bg-gray-100 text-gray-700'}`}>
                  {g.level}
                </span>
                <span className="font-semibold">{g.name}</span>
              </span>
              <span className="text-xs text-[var(--ff-muted)] font-normal mt-0.5">
                {conversations.filter(c => c.group_id === g.id).length} conversazioni
              </span>
            </SelectorButton>
          ))}
        </SelectorCard>

        {/* 3 · Conversazione */}
        <SelectorCard
          step={3}
          title="Conversazione"
          active={!!selectedConversationId}
          locked={!selectedGroupId}
        >
          {!selectedGroupId ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Prima seleziona un gruppo.</p>
          ) : filteredConversations.length === 0 ? (
            <p className="text-sm text-[var(--ff-muted)] italic">Nessuna conversazione trovata.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {filteredConversations.map(c => {
                const isActive = selectedConversationId === c.id
                return (
                  <SelectorButton
                    key={c.id}
                    selected={isActive}
                    onClick={() => handleConvChange(c.id)}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className={`font-semibold ${isActive ? 'text-[var(--ff-red)]' : 'text-gray-800'}`}>
                        Sessione #{c.sessionNumber}
                      </span>
                      {c.status === 'completed' && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">✓</span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--ff-muted)] font-normal capitalize">
                      {new Date(c.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' · '}{c.start_time.slice(0, 5)}
                    </span>
                  </SelectorButton>
                )
              })}
            </div>
          )}
        </SelectorCard>
      </div>

      {/* ── Presenze ──────────────────────────────────────────────────── */}
      {selectedConv && members.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 bg-[var(--ff-paper)] border-b border-[var(--ff-border)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${LEVEL_COLORS[selectedConv.group.level] || 'bg-gray-100 text-gray-700'}`}>
                {selectedConv.group.level}
              </span>
              <h2 className="text-sm font-bold text-gray-900">
                {selectedConv.group.name} · Sessione #{selectedConv.sessionNumber}
              </h2>
              <span className="text-[var(--ff-muted)] text-sm">—</span>
              <span className="text-sm text-gray-700 capitalize">
                {formatDate(selectedConv.scheduled_date)}&nbsp;·&nbsp;
                {selectedConv.start_time.slice(0, 5)}–{selectedConv.end_time.slice(0, 5)}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-green-700 font-semibold">{presentCount} presenti</span>
              <span className="text-red-600 font-semibold">{absentCount} assenti</span>
              <span className="text-yellow-700 font-semibold">{justCount} giustificati</span>
              <span className="text-[var(--ff-muted)] ml-auto">{members.length} totali</span>
            </div>
          </div>

          {justSaved && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-semibold">
              ✓ Presenze salvate con successo!
            </div>
          )}

          {/* Lista */}
          <div className="divide-y divide-[var(--ff-border)]">
            {members.map((m, i) => {
              const att = attendanceState[m.participant_id] || { status: 'present', notes: '' }
              return (
                <div key={m.participant_id} className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-7 h-7 rounded-full bg-[var(--ff-paper)] border border-[var(--ff-border)] text-xs font-bold text-[var(--ff-muted)] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{m.full_name}</p>
                      <p className="text-xs text-[var(--ff-muted)] truncate">{m.email}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
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

          {/* Footer */}
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

      {selectedConv && members.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)]">
          <p className="text-lg">👥</p>
          <p className="text-sm mt-2">Nessun partecipante assegnato a questo gruppo.</p>
        </div>
      )}

      {selectedGroupId && !selectedConversationId && (
        <div className="bg-white rounded-xl border border-dashed border-[var(--ff-border)] p-10 text-center text-[var(--ff-muted)]">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm">Seleziona una conversazione per registrare le presenze.</p>
        </div>
      )}
    </div>
  )
}

// ── Componenti di supporto ───────────────────────────────────────────────────

function SelectorCard({
  step, title, active, locked = false, children,
}: {
  step: number; title: string; active: boolean; locked?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 transition-opacity ${
      locked ? 'opacity-50 pointer-events-none' : ''
    } ${active ? 'border-[var(--ff-red-100)]' : 'border-[var(--ff-border)]'}`}>
      <p className="text-xs font-bold text-[var(--ff-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
          active ? 'bg-[var(--ff-red)] text-white' : 'bg-[var(--ff-border)] text-[var(--ff-muted)]'
        }`}>{step}</span>
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function SelectorButton({
  selected, onClick, children,
}: {
  selected: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition flex flex-col ${
        selected
          ? 'border-[var(--ff-red)] bg-[var(--ff-red-50)] text-[var(--ff-red)]'
          : 'border-[var(--ff-border)] hover:bg-[var(--ff-paper)] text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
