import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function EditParticipantPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Recupera il partecipante
  const { data: participant } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', params.id)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/participants" className="text-blue-600 hover:underline text-sm block mb-2">
            Torna ai partecipanti
          </Link>
          <h1 className="text-2xl font-bold">Modifica Partecipante</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={updateParticipant} className="bg-white rounded-lg shadow p-6">
          <input type="hidden" name="id" value={participant.id} />
          
          <div className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                defaultValue={participant.full_name}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={participant.email}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="company_id" className="block text-sm font-medium mb-2">
                Azienda
              </label>
              <select
                id="company_id"
                name="company_id"
                defaultValue={participant.company_id || ''}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleziona azienda --</option>
                {companies?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Salva Modifiche
            </button>
            <Link
              href="/admin/participants"
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold text-center leading-[48px]"
            >
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}