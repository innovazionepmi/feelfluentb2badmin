import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

  if (profile?.role !== 'admin') {
    redirect('/no-access')
  }

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

  const kpis = [
    { label: 'Aziende',       count: companiesCount,    href: '/admin/companies',    emoji: '🏢' },
    { label: 'Programmi',     count: programsCount,     href: '/admin/programs',     emoji: '📋' },
    { label: 'Partecipanti',  count: participantsCount, href: '/admin/participants', emoji: '👥' },
    { label: 'Tutor',         count: tutorsCount,        href: '/admin/tutors',       emoji: '👩‍🏫' },
  ]

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">

      {/* Header */}
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Image
            src="/logo-feelfluent.svg"
            alt="FeelFluent"
            width={160}
            height={37}
            priority
            unoptimized
          />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-[var(--ff-muted)]">{profile?.role}</p>
            </div>
            <form action={handleLogout}>
              <button
                type="submit"
                className="text-sm px-4 py-2 rounded-lg border border-[var(--ff-border)] text-gray-600 hover:bg-[var(--ff-paper)] transition font-medium"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {profile?.role === 'admin' && <AdminNav />}

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, count, href, emoji }) => (
            <Link key={href} href={href} className="group block bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6 hover:border-[var(--ff-red-100)] hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--ff-muted)] font-medium mb-1">{label}</p>
                  <p className="text-4xl font-bold text-gray-900">{count ?? 0}</p>
                </div>
                <span className="text-2xl">{emoji}</span>
              </div>
              <p className="text-xs text-[var(--ff-red)] font-semibold mt-4 group-hover:underline">
                Gestisci →
              </p>
            </Link>
          ))}
        </div>

        {/* Azioni Rapide */}
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Azioni Rapide</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: '/admin/companies/new',       icon: '🏢', label: 'Nuova Azienda' },
              { href: '/admin/participants/new',     icon: '👤', label: 'Nuovo Partecipante' },
              { href: '/admin/participants/import',  icon: '⬆', label: 'Importa CSV' },
              { href: '/admin/users',                icon: '✅', label: 'Abilita Utenti' },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="border border-dashed border-[var(--ff-border)] rounded-lg p-5 hover:border-[var(--ff-red)] hover:bg-[var(--ff-red-50)] transition text-center group"
              >
                <div className="text-3xl mb-2">{icon}</div>
                <p className="text-sm font-semibold text-gray-700 group-hover:text-[var(--ff-red)]">{label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Welcome */}
        <div className="bg-[var(--ff-red-50)] border border-[var(--ff-red-100)] rounded-xl p-6">
          <h3 className="text-sm font-bold text-[var(--ff-red-700)] mb-1">Benvenuto!</h3>
          <p className="text-sm text-gray-700">Sistema pronto. Inizia creando un&apos;azienda o importando partecipanti.</p>
        </div>

      </main>
    </div>
  )
}
