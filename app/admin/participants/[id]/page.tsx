import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function EditParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const { data: participant } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!participant) {
    redirect('/admin/participants')
  }

  // Recupera aziende
  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .order('name')

  async function updateParticipant(formData: FormData) {
    'use server'
    
    const adminClient = createAdminClient()
    const participantId = formData.get('id') as string
    const full_name = formData.get('full_name') as string
    const email = formData.get('email') as string
    const company_id = formData.get('company_id') as string

    // Aggiorna profilo
    await adminClient
      .from('profiles')
      .update({
        full_name,
        email,
        company_id
      })
      .eq('id', participantId)

    // Aggiorna email in Auth
    await adminClient.auth.admin.updateUserById(participantId, { email })

    revalidatePath('/admin/participants')
    redirect('/admin/participants')
  }

  const inputCls = "w-full px-4 py-2.5 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] text-sm"

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/participants" className="text-xs text-[var(--ff-muted)] hover:text-gray-700 block mb-1">
            ← Torna ai partecipanti
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Modifica Partecipante</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={updateParticipant} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
          <input type="hidden" name="id" value={participant.id} />

          <div className="space-y-5">
            <div>
              <label htmlFor="full_name" className="block text-xs font-semibold text-gray-600 mb-1.5">Nome Completo</label>
              <input type="text" id="full_name" name="full_name" defaultValue={participant.full_name} required className={inputCls} />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input type="email" id="email" name="email" defaultValue={participant.email} required className={inputCls} />
            </div>

            <div>
              <label htmlFor="company_id" className="block text-xs font-semibold text-gray-600 mb-1.5">Azienda</label>
              <select id="company_id" name="company_id" defaultValue={participant.company_id || ''} required className={inputCls}>
                <option value="">-- Seleziona azienda --</option>
                {companies?.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit"
              className="flex-1 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2.5 rounded-lg font-semibold text-sm transition">
              Salva Modifiche
            </button>
            <Link href="/admin/participants"
              className="flex-1 bg-white border border-[var(--ff-border)] text-gray-700 py-2.5 rounded-lg hover:bg-[var(--ff-paper)] font-medium text-sm text-center transition">
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}