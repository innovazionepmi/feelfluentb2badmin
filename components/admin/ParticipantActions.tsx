'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

interface InviteState {
  success: boolean
  message: string
}

interface Props {
  participantId: string
  participantEmail: string
  participantName: string
  sendPasswordReset: (prevState: InviteState | null, formData: FormData) => Promise<InviteState>
  deleteParticipant: (formData: FormData) => Promise<void>
}

function InviteButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[var(--ff-red)] hover:underline disabled:opacity-50"
    >
      {pending ? 'Invio...' : 'Invia invito'}
    </button>
  )
}

export default function ParticipantActions({
  participantId,
  participantEmail,
  participantName,
  sendPasswordReset,
  deleteParticipant,
}: Props) {
  const [inviteState, inviteAction] = useActionState(sendPasswordReset, null)

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (confirm(`Eliminare ${participantName}?`)) {
      const formData = new FormData(e.currentTarget)
      await deleteParticipant(formData)
    }
  }

  return (
    <div className="text-sm space-x-3">
      <form action={inviteAction} className="inline">
        <input type="hidden" name="email" value={participantEmail} />
        <InviteButton />
      </form>
      {inviteState && (
        <span className={inviteState.success ? 'text-green-600' : 'text-red-500'}>
          {inviteState.message}
        </span>
      )}

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
