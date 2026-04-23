import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

export default async function NewParticipantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .order('name')

  async function createParticipant(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const full_name = formData.get('full_name') as string
    const company_id = (formData.get('company_id') as string) || null

    const adminClient = createAdminClient()

    const { data: newUser, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: 'participant' },
    })

    if (error || !newUser?.user) {
      console.error('Errore creazione partecipante:', error)
      return
    }

    await adminClient.from('profiles').upsert({
      id: newUser.user.id,
      email,
      full_name,
      role: 'participant',
      company_id,
    })

    redirect('/admin/participants')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/participants" className="text-blue-600 hover:underline text-sm block mb-2">
            ← Torna ai partecipanti
          </Link>
          <h1 className="text-2xl font-bold">Nuovo Partecipante</h1>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={createParticipant} className="bg-white rounded-lg shadow p-6 space-y-5">

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mario Rossi"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="mario.rossi@azienda.it"
            />
            <p className="text-xs text-gray-500 mt-1">
              Verrà inviata un&apos;email di invito per impostare la password.
            </p>
          </div>

          <div>
            <label htmlFor="company_id" className="block text-sm font-medium text-gray-700 mb-1">
              Azienda
            </label>
            <select
              id="company_id"
              name="company_id"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Nessuna azienda —</option>
              {(companies || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Crea e invia invito
            </button>
            <Link
              href="/admin/participants"
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition text-center font-medium"
            >
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
