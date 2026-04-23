import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import ParticipantActions from '@/components/admin/ParticipantActions'
import AdminNav from '@/components/admin/AdminNav'
import ParticipantsFilter from '@/components/admin/ParticipantsFilter'

interface Props {
  searchParams: Promise<{ company_id?: string; program_id?: string }>
}

export default async function ParticipantsPage({ searchParams }: Props) {
  const { company_id, program_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  // Carica aziende e programmi per i filtri
  const [{ data: companies }, { data: programs }] = await Promise.all([
    adminClient.from('companies').select('id, name').eq('active', true).order('name'),
    adminClient.from('training_programs').select('id, name, company_id').order('name'),
  ])

  // Costruisce la query partecipanti
  let query = adminClient
    .from('profiles')
    .select('*, companies(name)')
    .eq('role', 'participant')
    .order('full_name')

  if (company_id) {
    query = query.eq('company_id', company_id)
  }

  const { data: allParticipants } = await query

  // Filtra per programma: trova i participant_id iscritti al programma
  let participants = allParticipants || []
  if (program_id) {
    const { data: enrolled } = await adminClient
      .from('program_participants')
      .select('participant_id')
      .eq('program_id', program_id)

    const enrolledIds = new Set((enrolled || []).map(r => r.participant_id))
    participants = participants.filter(p => enrolledIds.has(p.id))
  }

  async function deleteParticipant(formData: FormData) {
    'use server'
    const userId = formData.get('user_id') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.deleteUser(userId)
    revalidatePath('/admin/participants')
  }

  async function sendPasswordReset(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.inviteUserByEmail(email)
    revalidatePath('/admin/participants')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm block mb-2">
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Gestione Partecipanti</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/participants/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Nuovo
            </Link>
            <Link
              href="/admin/participants/import"
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Importa CSV
            </Link>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ParticipantsFilter
            companies={companies || []}
            programs={programs || []}
            selectedCompany={company_id || ''}
            selectedProgram={program_id || ''}
            total={participants.length}
          />

          {participants.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Nessun partecipante trovato con i filtri selezionati.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{participant.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{participant.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{participant.companies?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(participant.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4">
                      <ParticipantActions
                        participantId={participant.id}
                        participantEmail={participant.email}
                        participantName={participant.full_name}
                        sendPasswordReset={sendPasswordReset}
                        deleteParticipant={deleteParticipant}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
