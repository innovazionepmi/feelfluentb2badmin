import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data: company } = await adminClient.from('companies').select('*').eq('id', id).single()
  if (!company) redirect('/admin/companies')

  async function updateCompany(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const contact_email = (formData.get('contact_email') as string) || null
    const contact_phone = (formData.get('contact_phone') as string) || null
    const active = formData.get('active') === 'on'

    const adminClient = createAdminClient()
    await adminClient
      .from('companies')
      .update({ name, contact_email, contact_phone, active, updated_at: new Date().toISOString() })
      .eq('id', id)

    revalidatePath('/admin/companies')
    redirect('/admin/companies')
  }

  const inputCls = "w-full px-4 py-2.5 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] text-sm"

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/companies" className="text-xs text-[var(--ff-muted)] hover:text-gray-700 block mb-1">
            ← Torna alle aziende
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Modifica Azienda</h1>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={updateCompany} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-gray-600 mb-1.5">Nome Azienda</label>
            <input type="text" id="name" name="name" required defaultValue={company.name} className={inputCls} />
          </div>

          <div>
            <label htmlFor="contact_email" className="block text-xs font-semibold text-gray-600 mb-1.5">Email contatto</label>
            <input type="email" id="contact_email" name="contact_email"
              defaultValue={company.contact_email || ''} className={inputCls}
              placeholder="contatto@azienda.it" />
          </div>

          <div>
            <label htmlFor="contact_phone" className="block text-xs font-semibold text-gray-600 mb-1.5">Telefono</label>
            <input type="tel" id="contact_phone" name="contact_phone"
              defaultValue={company.contact_phone || ''} className={inputCls}
              placeholder="+39 02 123456" />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="active" defaultChecked={company.active} className="w-4 h-4 accent-[var(--ff-red)]" />
              <span className="text-sm font-medium text-gray-700">Azienda attiva</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2.5 rounded-lg transition font-semibold text-sm">
              Salva modifiche
            </button>
            <Link href="/admin/companies"
              className="flex-1 bg-white border border-[var(--ff-border)] text-gray-700 py-2.5 rounded-lg hover:bg-[var(--ff-paper)] transition text-center font-medium text-sm">
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
