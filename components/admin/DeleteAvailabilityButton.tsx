'use client'

interface Props {
  availabilityId: string
  tutorId: string
  deleteAvailability: (formData: FormData) => Promise<void>
}

export default function DeleteAvailabilityButton({ availabilityId, tutorId, deleteAvailability }: Props) {
  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (confirm('Eliminare questo slot di disponibilità?')) {
      const formData = new FormData(e.currentTarget)
      await deleteAvailability(formData)
    }
  }

  return (
    <form onSubmit={handleDelete} className="inline">
      <input type="hidden" name="availability_id" value={availabilityId} />
      <input type="hidden" name="tutor_id" value={tutorId} />
      <button type="submit" className="text-red-600 hover:underline text-sm">
        Elimina
      </button>
    </form>
  )
}
