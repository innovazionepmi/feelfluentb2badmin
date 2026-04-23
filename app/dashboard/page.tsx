import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Conta le entità
  const { count: companiesCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  const { count: programsCount } = await supabase
    .from('training_programs')
    .select('*', { count: 'exact', head: true })

  const { count: participantsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'participant')

  const { count: tutorsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'tutor')

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FeelFluent B2B Admin</h1>
            <p className="text-sm text-gray-600">{profile?.full_name} - {profile?.role}</p>
          </div>
          <form action={handleLogout}>
            <button
              type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </form>
        </div>

      </header>
      {profile?.role === 'admin' && <AdminNav />}

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aziende</h3>
            <p className="text-4xl font-bold text-blue-600 mb-4">{companiesCount || 0}</p>
            <Link href="/admin/companies" className="text-blue-600 hover:underline text-sm">
              Gestisci aziende
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Programmi</h3>
            <p className="text-4xl font-bold text-green-600 mb-4">{programsCount || 0}</p>
            <Link href="/admin/programs" className="text-blue-600 hover:underline text-sm">
              Gestisci programmi
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Partecipanti</h3>
            <p className="text-4xl font-bold text-purple-600 mb-4">{participantsCount || 0}</p>
            <Link href="/admin/participants" className="text-blue-600 hover:underline text-sm">
              Gestisci partecipanti
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tutor</h3>
            <p className="text-4xl font-bold text-orange-600 mb-4">{tutorsCount || 0}</p>
            <Link href="/admin/tutors" className="text-blue-600 hover:underline text-sm">
              Gestisci tutor
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Azioni Rapide</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/admin/companies/new"
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <div className="text-4xl mb-2">+</div>
              <p className="font-medium text-gray-900">Nuova Azienda</p>
            </Link>

            <Link
              href="/admin/participants/import"
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <div className="text-4xl mb-2">↑</div>
              <p className="font-medium text-gray-900">Importa Partecipanti CSV</p>
            </Link>

            <Link
              href="/admin/tutors/new"
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-purple-500 hover:bg-purple-50 transition text-center"
            >
              <div className="text-4xl mb-2">👩‍🏫</div>
              <p className="font-medium text-gray-900">Nuovo Tutor</p>
            </Link>

            <Link
              href="/admin/users"
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-orange-500 hover:bg-orange-50 transition text-center"
            >
              <div className="text-4xl mb-2">✓</div>
              <p className="font-medium text-gray-900">Abilita Utenti</p>
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Benvenuto!</h3>
          <p className="text-blue-700">Sistema pronto. Inizia creando un azienda o importando partecipanti.</p>
        </div>
      </main>
    </div>
  )
}