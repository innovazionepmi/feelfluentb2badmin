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

  const inputCls = "w-full px-4 py-2.5 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] text-sm"

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/participants" className="text-xs text-[var(--ff-muted)] hover:text-gray-700 block mb-1">
            ← Torna ai partecipanti
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Nuovo Partecipante</h1>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={createParticipant} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6 space-y-5">

          <div>
            <label htmlFor="full_name" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome completo <span className="text-[var(--ff-red)]">*</span>
            </label>
            <input type="text" id="full_name" name="full_name" required className={inputCls} placeholder="Mario Rossi" />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Email <span className="text-[var(--ff-red)]">*</span>
            </label>
            <input type="email" id="email" name="email" required className={inputCls} placeholder="mario.rossi@azienda.it" />
            <p className="text-xs text-[var(--ff-muted)] mt-1">
              Verrà inviata un&apos;email di invito per impostare la password.
            </p>
          </div>

          <div>
            <label htmlFor="company_id" className="block text-xs font-semibold text-gray-600 mb-1.5">Azienda</label>
            <select id="company_id" name="company_id" className={inputCls}>
              <option value="">— Nessuna azienda —</option>
              {(companies || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2.5 rounded-lg transition font-semibold text-sm">
              Crea e invia invito
            </button>
            <Link href="/admin/participants"
              className="flex-1 bg-white border border-[var(--ff-border)] text-gray-700 py-2.5 rounded-lg hover:bg-[var(--ff-paper)] transition text-center font-medium text-sm">
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
