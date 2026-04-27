'use client'

import Link from 'next/link'

interface Props {
  participantId: string
  participantEmail: string
  participantName: string
  sendPasswordReset: (formData: FormData) => Promise<void>
  deleteParticipant: (formData: FormData) => Promise<void>
}

export default function ParticipantActions({
  participantId,
  participantEmail,
  participantName,
  sendPasswordReset,
  deleteParticipant,
}: Props) {
  
  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (confirm(`Eliminare ${participantName}?`)) {
      const formData = new FormData(e.currentTarget)
      await deleteParticipant(formData)
    }
  }

  return (
    <div className="text-sm space-x-3">
      <form action={sendPasswordReset} className="inline">
        <input type="hidden" name="email" value={participantEmail} />
        <button
          type="submit"
          className="text-[var(--ff-red)] hover:underline"
        >
          Invia invito
        </button>
      </form>

      <Link
        href={`/admin/participants/${participantId}`}
        className="text-green-600 hover:underline"
      >
        Modifica
      </Link>

      <form onSubmit={handleDelete} className="inline">
        <input type="hidden" name="user_id" value={participantId} />
        <button
          type="submit"
          className="text-red-600 hover:underline"
        >
          Elimina
        </button>
      </form>
    </div>
  )
}