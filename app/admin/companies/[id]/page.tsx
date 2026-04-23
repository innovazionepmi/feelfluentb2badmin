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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/companies" className="text-blue-600 hover:underline text-sm block mb-2">
            ← Torna alle aziende
          </Link>
          <h1 className="text-2xl font-bold">Modifica Azienda</h1>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={updateCompany} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Azienda
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={company.name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
              Email contatto
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              defaultValue={company.contact_email || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contatto@azienda.it"
            />
          </div>

          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefono
            </label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              defaultValue={company.contact_phone || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+39 02 123456"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="active"
                defaultChecked={company.active}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Azienda attiva</span>
            </label>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Salva modifiche
            </button>
            <Link
              href="/admin/companies"
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition text-center font-medium"
            >
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
