import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function NewCompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  async function createCompany(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    
    const name = formData.get('name') as string
    const contact_email = formData.get('contact_email') as string
    const contact_phone = formData.get('contact_phone') as string
    const active = formData.get('active') === 'on'

    const { error } = await supabase
      .from('companies')
      .insert({
        name,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        active
      })

    if (error) {
      console.error('Error creating company:', error)
      return
    }

    revalidatePath('/admin/companies')
    redirect('/admin/companies')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/companies" className="text-blue-600 hover:underline text-sm mb-1 block">
            ← Torna alle aziende
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nuova Azienda</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={createCompany} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Azienda *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es: Acme Corporation"
              />
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                Email di Contatto
              </label>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contatto@azienda.it"
              />
            </div>

            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefono di Contatto
              </label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+39 02 1234567"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                name="active"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                Azienda attiva
              </label>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Crea Azienda
            </button>
            <Link
              href="/admin/companies"
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold text-center"
            >
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}