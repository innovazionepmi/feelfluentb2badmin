'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

interface State {
  success: boolean
  message: string
}

interface Props {
  inviteAdmin: (prevState: State | null, formData: FormData) => Promise<State>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 shrink-0"
    >
      {pending ? 'Invio...' : 'Invia invito'}
    </button>
  )
}

export default function InviteAdminForm({ inviteAdmin }: Props) {
  const [state, action] = useActionState(inviteAdmin, null)

  return (
    <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Invita nuovo amministratore</h2>
      <p className="text-xs text-[var(--ff-muted)] mb-4">
        Verrà creato un account con ruolo admin e inviata un&apos;email per impostare la password.
      </p>

      <form action={action} className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Nome completo</label>
          <input
            name="full_name"
            type="text"
            required
            placeholder="Es. Mario Rossi"
            className="text-sm px-3 py-2 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] w-52 bg-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@esempio.com"
            className="text-sm px-3 py-2 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] w-64 bg-white"
          />
        </div>
        <SubmitButton />

        {state && (
          <span className={`text-sm font-medium ${state.success ? 'text-green-600' : 'text-red-500'}`}>
            {state.success ? '✓' : '⚠'} {state.message}
          </span>
        )}
      </form>
    </div>
  )
}
