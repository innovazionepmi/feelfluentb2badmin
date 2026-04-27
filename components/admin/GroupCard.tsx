'use client'

import { useState, useTransition } from 'react'

interface Tutor {
  id: string
  full_name: string
  email: string
}

interface ParticipantProfile {
  id: string
  full_name: string
  email: string
}

interface Member {
  id: string
  group_id: string
  participant_id: string
  joined_at: string
  profiles: ParticipantProfile | null
}

interface UnassignedParticipant {
  id: string
  participant_id: string
  assigned_level: string | null
  profiles: ParticipantProfile | null
}

interface Group {
  id: string
  name: string
  level: string
  tutor_id: string | null
  profiles: Tutor | null
  members: Member[]
}

interface Props {
  group: Group
  tutors: Tutor[]
  unassignedForLevel: UnassignedParticipant[]
  addMember: (formData: FormData) => Promise<void>
  removeMember: (formData: FormData) => Promise<void>
  deleteGroup: (formData: FormData) => Promise<void>
  updateGroupTutor: (formData: FormData) => Promise<void>
  updateGroupName: (formData: FormData) => Promise<void>
}

export default function GroupCard({
  group,
  tutors,
  unassignedForLevel,
  addMember,
  removeMember,
  deleteGroup,
  updateGroupTutor,
  updateGroupName,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedParticipantId, setSelectedParticipantId] = useState('')
  const [selectedTutorId, setSelectedTutorId] = useState(group.tutor_id || '')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(group.name)

  const handleAddMember = () => {
    if (!selectedParticipantId) return
    const formData = new FormData()
    formData.set('group_id', group.id)
    formData.set('participant_id', selectedParticipantId)
    startTransition(async () => {
      await addMember(formData)
      setSelectedParticipantId('')
    })
  }

  const handleRemoveMember = (participantId: string, name: string) => {
    if (!confirm(`Rimuovere ${name} dal gruppo?`)) return
    const formData = new FormData()
    formData.set('group_id', group.id)
    formData.set('participant_id', participantId)
    startTransition(async () => {
      await removeMember(formData)
    })
  }

  const handleDeleteGroup = () => {
    if (!confirm(`Eliminare il gruppo "${group.name}"? Tutti i membri verranno rimossi.`)) return
    const formData = new FormData()
    formData.set('group_id', group.id)
    startTransition(async () => {
      await deleteGroup(formData)
    })
  }

  const handleTutorChange = (newTutorId: string) => {
    setSelectedTutorId(newTutorId)
    const formData = new FormData()
    formData.set('group_id', group.id)
    formData.set('tutor_id', newTutorId)
    startTransition(async () => {
      await updateGroupTutor(formData)
    })
  }

  const handleSaveName = () => {
    if (!editName.trim() || editName.trim() === group.name) {
      setIsEditingName(false)
      setEditName(group.name)
      return
    }
    const formData = new FormData()
    formData.set('group_id', group.id)
    formData.set('name', editName.trim())
    startTransition(async () => {
      await updateGroupName(formData)
      setIsEditingName(false)
    })
  }

  const memberCount = group.members.length

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-100 overflow-hidden ${isPending ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') { setIsEditingName(false); setEditName(group.name) }
                }}
                autoFocus
                className="flex-1 px-2 py-1 border border-[var(--ff-red)] rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              />
              <button
                onClick={handleSaveName}
                disabled={isPending}
                className="text-xs text-[var(--ff-red)] hover:text-blue-800 font-medium"
              >
                Salva
              </button>
              <button
                onClick={() => { setIsEditingName(false); setEditName(group.name) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Annulla
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">{group.name}</h3>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-gray-300 hover:text-gray-500 transition flex-shrink-0"
                title="Rinomina gruppo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">
            {memberCount} {memberCount === 1 ? 'partecipante' : 'partecipanti'}
          </div>
        </div>

        <button
          onClick={handleDeleteGroup}
          disabled={isPending}
          className="text-red-300 hover:text-red-500 transition flex-shrink-0"
          title="Elimina gruppo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* Tutor assegnato */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tutor</label>
          <select
            value={selectedTutorId}
            onChange={e => handleTutorChange(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 bg-white"
          >
            <option value="">— Nessun tutor —</option>
            {tutors.map(t => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>

        {/* Membri */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Membri</label>
          {group.members.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nessun partecipante nel gruppo.</p>
          ) : (
            <ul className="space-y-1.5">
              {group.members.map(member => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {member.profiles?.full_name || '—'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{member.profiles?.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.participant_id, member.profiles?.full_name || 'il partecipante')}
                    disabled={isPending}
                    className="text-red-300 hover:text-red-500 transition flex-shrink-0 disabled:opacity-40"
                    title="Rimuovi dal gruppo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Aggiungi partecipante */}
        {unassignedForLevel.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Aggiungi partecipante</label>
            <div className="flex gap-2">
              <select
                value={selectedParticipantId}
                onChange={e => setSelectedParticipantId(e.target.value)}
                disabled={isPending}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 bg-white"
              >
                <option value="">— Seleziona partecipante —</option>
                {unassignedForLevel.map(pp => (
                  <option key={pp.participant_id} value={pp.participant_id}>
                    {pp.profiles?.full_name || pp.profiles?.email || pp.participant_id}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedParticipantId || isPending}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isPending ? '...' : 'Aggiungi'}
              </button>
            </div>
          </div>
        )}

        {unassignedForLevel.length === 0 && group.members.length > 0 && (
          <p className="text-xs text-gray-400 italic">
            Tutti i partecipanti di livello {group.level} sono già in un gruppo.
          </p>
        )}
      </div>
    </div>
  )
}
