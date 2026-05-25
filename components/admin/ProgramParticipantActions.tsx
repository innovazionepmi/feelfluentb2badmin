'use client'

import { useState } from 'react'

interface Tutor {
  id: string
  full_name: string
  email: string
  languages?: string[]
}

interface ProgramParticipant {
  id: string
  participant_id: string
  assigned_level: string | null
  level_check_completed: boolean
  level_check_tutor_id: string | null
  notes: string | null
  profiles?: {
    full_name: string
    email: string
  }
}

interface Props {
  pp: ProgramParticipant
  tutors: Tutor[]
  levelLabels: string[]
  assignLevel: (formData: FormData) => Promise<{ ok: boolean; error?: string }>
  removeParticipant: (formData: FormData) => Promise<void>
  sendPlan: (participantId: string) => Promise<{ ok: boolean; reason?: string }>
}

export default function ProgramParticipantActions({
  pp,
  tutors,
  levelLabels,
  assignLevel,
  removeParticipant,
  sendPlan,
}: Props) {
  const [showLevelForm, setShowLevelForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [levelError, setLevelError] = useState<string | null>(null)
  const [sendingPlan, setSendingPlan] = useState(false)
  const [planResult, setPlanResult] = useState<{ ok: boolean; reason?: string } | null>(null)

  const handleSendPlan = async () => {
    setSendingPlan(true)
    setPlanResult(null)
    const res = await sendPlan(pp.participant_id)
    setPlanResult(res)
    setSendingPlan(false)
    if (res.ok) setTimeout(() => setPlanResult(null), 4000)
  }

  const handleAssignLevel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setLevelError(null)
    const formData = new FormData(e.currentTarget)
    const result = await assignLevel(formData)
    setSubmitting(false)
    if (result.ok) {
      setShowLevelForm(false)
    } else {
      setLevelError(result.error || 'Errore durante il salvataggio')
    }
  }

  const handleRemove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirm(`Rimuovere ${pp.profiles?.full_name} dal programma?`)) return
    const formData = new FormData(e.currentTarget)
    await removeParticipant(formData)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <button
          onClick={() => setShowLevelForm(!showLevelForm)}
          className="text-[var(--ff-red)] hover:underline"
        >
          {pp.level_check_completed ? 'Modifica livello' : 'Assegna livello'}
        </button>

        <button
          onClick={handleSendPlan}
          disabled={sendingPlan}
          className="text-blue-600 hover:underline disabled:opacity-50"
        >
          {sendingPlan ? 'Invio...' : 'Invia piano'}
        </button>

        {planResult && (
          <span className={`text-xs font-medium ${planResult.ok ? 'text-green-600' : 'text-orange-600'}`}>
            {planResult.ok ? '✓ Piano inviato' : `⚠ ${planResult.reason || 'Errore'}`}
          </span>
        )}

        <form onSubmit={handleRemove} className="inline">
          <input type="hidden" name="pp_id" value={pp.id} />
          <button type="submit" className="text-red-500 hover:underline">
            Rimuovi
          </button>
        </form>
      </div>

      {showLevelForm && (
        <form
          onSubmit={handleAssignLevel}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-sm"
        >
          <input type="hidden" name="pp_id" value={pp.id} />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Livello assegnato</label>
            <select
              name="assigned_level"
              defaultValue={pp.assigned_level || ''}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)]"
            >
              <option value="">— Seleziona livello —</option>
              {levelLabels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tutor che ha fatto il level check</label>
            <select
              name="level_check_tutor_id"
              defaultValue={pp.level_check_tutor_id || ''}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)]"
            >
              <option value="">— Seleziona tutor —</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
            <textarea
              name="notes"
              defaultValue={pp.notes || ''}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] resize-none"
              placeholder="Note sul level check..."
            />
          </div>

          {levelError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{levelError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[var(--ff-red)] text-white py-1.5 rounded hover:bg-[var(--ff-red-700)] transition text-xs font-medium disabled:opacity-50"
            >
              {submitting ? '...' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={() => setShowLevelForm(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded hover:bg-gray-300 transition text-xs font-medium"
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
