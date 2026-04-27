import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

export default async function NewProgramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Carica aziende attive (con adminClient per bypassare RLS)
  const adminClient = createAdminClient()
  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .order('name')

  async function createProgram(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const name = formData.get('name') as string
    const company_id = formData.get('company_id') as string
    const description = (formData.get('description') as string) || null
    const start_date = formData.get('start_date') as string
    const end_date = (formData.get('end_date') as string) || null

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('training_programs')
      .insert({
        name,
        company_id,
        description,
        start_date,
        end_date: end_date || null,
        status: 'setup',
        created_by: user.id,
      })

    if (error) {
      console.error('[createProgram] error:', error)
      return
    }

    revalidatePath('/admin/programs')
    redirect('/admin/programs')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Nuovo Programma Formativo</h1>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={createProgram} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6 space-y-5">

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome programma <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              placeholder="es. Business English - Acme 2025"
            />
          </div>

          <div>
            <label htmlFor="company_id" className="block text-sm font-medium text-gray-700 mb-1">
              Azienda <span className="text-red-500">*</span>
            </label>
            {companies && companies.length > 0 ? (
              <select
                id="company_id"
                name="company_id"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              >
                <option value="">— Seleziona azienda —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                Nessuna azienda attiva.{' '}
                <Link href="/admin/companies/new" className="underline font-medium">
                  Crea prima un&apos;azienda
                </Link>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] resize-none"
              placeholder="Note sul programma, obiettivi, ecc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Data inizio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                required
                min={today}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                Data fine prevista
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            Il programma verrà creato nello stato <strong>In configurazione</strong>.
            Potrai poi aggiungere partecipanti e tutor dalla pagina di gestione.
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-[var(--ff-red)] text-white py-2.5 rounded-lg hover:bg-[var(--ff-red-700)] transition font-semibold text-sm"
            >
              Crea Programma
            </button>
            <Link
              href="/admin/programs"
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
