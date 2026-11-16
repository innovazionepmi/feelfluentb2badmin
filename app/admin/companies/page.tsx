import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '../../../components/admin/AdminNav'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data: companies } = await adminClient
    .from('companies')
    .select('*')
    .order('name')

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Aziende</h1>
          <Link
            href="/admin/companies/new"
            className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
          >
            + Nuova Azienda
          </Link>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!companies || companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-12 text-center">
            <p className="text-[var(--ff-muted)] mb-4">Nessuna azienda presente</p>
            <Link
              href="/admin/companies/new"
              className="inline-block bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-6 py-2 rounded-lg transition text-sm font-semibold"
            >
              Crea la prima azienda
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--ff-border)]">
                <thead className="bg-[var(--ff-paper)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Contatti</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Stato</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/admin/companies/${company.id}`} className="text-sm font-semibold text-gray-900 hover:text-[var(--ff-red)]">{company.name}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">{company.contact_email || '—'}</div>
                        <div className="text-xs text-[var(--ff-muted)]">{company.contact_phone || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          company.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {company.active ? 'Attiva' : 'Inattiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/companies/${company.id}`}
                          className="text-[var(--ff-red)] hover:underline font-medium"
                        >
                          Modifica
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-[var(--ff-border)]">
              {companies.map((company) => (
                <div key={company.id} className="p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/companies/${company.id}`} className="font-semibold text-gray-900 hover:text-[var(--ff-red)] text-sm block">{company.name}</Link>
                      {company.contact_email && <div className="text-xs text-[var(--ff-muted)] mt-0.5">{company.contact_email}</div>}
                      {company.contact_phone && <div className="text-xs text-[var(--ff-muted)]">{company.contact_phone}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${company.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {company.active ? 'Attiva' : 'Inattiva'}
                      </span>
                      <Link href={`/admin/companies/${company.id}`} className="text-sm text-[var(--ff-red)] hover:underline font-medium">
                        Modifica →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
