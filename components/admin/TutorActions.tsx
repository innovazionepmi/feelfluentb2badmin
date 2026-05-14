'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'

interface InviteState {
  success: boolean
  message: string
}

interface Props {
  tutorId: string
  tutorEmail: string
  tutorName: string
  sendInvite: (prevState: InviteState | null, formData: FormData) => Promise<InviteState>
  deleteTutor: (formData: FormData) => Promise<{ error?: string }>
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

export default function TutorActions({
  tutorId,
  tutorEmail,
  tutorName,
  sendInvite,
  deleteTutor,
}: Props) {
  const [inviteState, inviteAction] = useActionState(sendInvite, null)
  const router = useRouter()

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirm(`Eliminare il tutor ${tutorName}?\n\nVerranno rimossi anche le assegnazioni ai programmi e agli slot level check.`)) return
    const formData = new FormData(e.currentTarget)
    const result = await deleteTutor(formData)
    if (result?.error) {
      alert(`Errore durante l'eliminazione: ${result.error}`)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="text-sm flex items-center gap-3 flex-wrap">
      <form action={inviteAction} className="inline">
        <input type="hidden" name="email" value={tutorEmail} />
        <InviteButton />
      </form>

      {inviteState && (
        <span className={`text-xs font-medium ${inviteState.success ? 'text-green-600' : 'text-red-500'}`}>
          {inviteState.message}
        </span>
      )}

      <Link href={`/admin/tutors/${tutorId}`} className="text-green-600 hover:underline">
        Modifica
      </Link>

      <Link href={`/admin/tutors/${tutorId}/availability`} className="text-purple-600 hover:underline">
        Disponibilità
      </Link>

      <form onSubmit={handleDelete} className="inline">
        <input type="hidden" name="user_id" value={tutorId} />
        <button type="submit" className="text-red-600 hover:underline">
          Elimina
        </button>
      </form>
    </div>
  )
}
