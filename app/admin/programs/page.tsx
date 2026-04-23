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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Programmi Formativi</h1>
          </div>
          <Link
            href="/admin/programs/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Nuovo Programma
          </Link>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!programs || programs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Nessun programma formativo presente</p>
            <Link
              href="/admin/programs/new"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Crea il primo programma
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <p className="text-sm text-gray-600">
                Totale programmi: <strong>{programs.length}</strong>
              </p>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partecipanti</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {programs.map((program) => (
                  <tr key={program.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{program.name}</div>
                      {program.description && (
                        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{program.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{program.companies?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[program.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[program.status] || program.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {countMap[program.id] || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{new Date(program.start_date).toLocaleDateString('it-IT')}</div>
                      {program.end_date && (
                        <div className="text-xs text-gray-400">
                          → {new Date(program.end_date).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/programs/${program.id}`}
                        className="text-blue-600 hover:underline text-sm font-medium"
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
