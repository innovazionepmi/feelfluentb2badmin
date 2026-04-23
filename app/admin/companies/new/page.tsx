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

  async function createCompany(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    
    const name = formData.get('name') as string
    const contact_email = formData.get('contact_email') as string
    const contact_phone = formData.get('contact_phone') as string
    const active = formData.get('active') === 'on'

    await supabase
      .from('companies')
      .insert({
        name,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        active
      })

    revalidatePath('/admin/companies')
    redirect('/admin/companies')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/companies" className="text-blue-600 hover:underline text-sm block mb-2">
            Torna alle aziende
          </Link>
          <h1 className="text-2xl font-bold">Nuova Azienda</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={createCompany} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Nome Azienda
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Acme Corporation"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="contact_email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="contatto@azienda.it"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="contact_phone" className="block text-sm font-medium mb-2">
              Telefono
            </label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="+39 02 123456"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className="mr-2"
              />
              <span className="text-sm">Azienda attiva</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Crea Azienda
            </button>
            <Link
              href="/admin/companies"
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 text-center leading-[48px]"
            >
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}