import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CompaniesPage() {
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

  // Recupera tutte le aziende
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-[var(--ff-red)] hover:underline text-sm mb-1 block">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Aziende</h1>
          </div>
          <Link
            href="/admin/companies/new"
            className="bg-[var(--ff-red)] text-white px-4 py-2 rounded-lg hover:bg-[var(--ff-red-700)] transition"
          >
            + Nuova Azienda
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!companies || companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Nessuna azienda presente</p>
            <Link
              href="/admin/companies/new"
              className="inline-block bg-[var(--ff-red)] text-white px-6 py-2 rounded-lg hover:bg-[var(--ff-red-700)] transition"
            >
              Crea la prima azienda
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contatti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.contact_email || '-'}</div>
                      <div className="text-sm text-gray-500">{company.contact_phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        company.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.active ? 'Attiva' : 'Inattiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="text-[var(--ff-red)] hover:underline mr-4"
                      >
                        Modifica
                      </Link>
                      <Link
                        href={`/admin/companies/${company.id}/programs`}
                        className="text-green-600 hover:underline"
                      >
                        Programmi
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}