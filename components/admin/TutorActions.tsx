'use client'

import Link from 'next/link'

interface Props {
  tutorId: string
  tutorEmail: string
  tutorName: string
  sendInvite: (formData: FormData) => Promise<void>
  deleteTutor: (formData: FormData) => Promise<void>
}

export default function TutorActions({
  tutorId,
  tutorEmail,
  tutorName,
  sendInvite,
  deleteTutor,
}: Props) {

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (confirm(`Eliminare il tutor ${tutorName}?`)) {
      const formData = new FormData(e.currentTarget)
      await deleteTutor(formData)
    }
  }

  return (
    <div className="text-sm flex items-center gap-3">
      <form action={sendInvite} className="inline">
        <input type="hidden" name="email" value={tutorEmail} />
        <button type="submit" className="text-blue-600 hover:underline">
          Invia invito
        </button>
      </form>

      <Link
        href={`/admin/tutors/${tutorId}`}
        className="text-green-600 hover:underline"
      >
        Modifica
      </Link>

      <Link
        href={`/admin/tutors/${tutorId}/availability`}
        className="text-purple-600 hover:underline"
      >
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
