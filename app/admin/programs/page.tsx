import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

const STATUS_LABELS: Record<string, string> = {
  setup:            'In configurazione',
  level_checks:     'Level Check in corso',
  groups_formation: 'Formazione gruppi',
  active:           'Attivo',
  completed:        'Completato',
}

const STATUS_COLORS: Record<string, string> = {
  setup:            'bg-gray-100 text-gray-700',
  level_checks:     'bg-blue-100 text-blue-700',
  groups_formation: 'bg-yellow-100 text-yellow-700',
  active:           'bg-green-100 text-green-700',
  completed:        'bg-purple-100 text-purple-700',
}

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: programs } = await adminClient
    .from('training_programs')
    .select(`
      *,
      companies ( name )
    `)
    .order('created_at', { ascending: false })

  // Conta i partecipanti per programma
  const { data: participantCounts } = await adminClient
    .from('program_participants')
    .select('program_id')

  const countMap = (participantCounts || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.program_id] = (acc[row.program_id] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Programmi Formativi</h1>
          <Link
            href="/admin/programs/new"
            className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
          >
            + Nuovo Programma
          </Link>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!programs || programs.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-12 text-center">
            <p className="text-[var(--ff-muted)] mb-4">Nessun programma formativo presente</p>
            <Link
              href="/admin/programs/new"
              className="inline-block bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-6 py-2 rounded-lg text-sm font-semibold"
            >
              Crea il primo programma
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-[var(--ff-border)] bg-[var(--ff-paper)]">
              <p className="text-xs text-[var(--ff-muted)]">
                Totale: <strong className="text-gray-700">{programs.length}</strong> programmi
              </p>
            </div>
            <table className="min-w-full divide-y divide-[var(--ff-border)]">
              <thead className="bg-[var(--ff-paper)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Programma</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azienda</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Partecipanti</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                {programs.map((program) => (
                  <tr key={program.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{program.name}</div>
                      {program.description && (
                        <div className="text-xs text-[var(--ff-muted)] mt-0.5 max-w-xs truncate">{program.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{(program.companies as any)?.name || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[program.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[program.status] || program.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-semibold">
                        {countMap[program.id] || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--ff-muted)]">
                      <div>{new Date(program.start_date).toLocaleDateString('it-IT')}</div>
                      {program.end_date && (
                        <div className="text-xs">
                          → {new Date(program.end_date).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/programs/${program.id}`}
                        className="text-[var(--ff-red)] hover:underline text-sm font-semibold"
                      >
                        Gestisci →
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
