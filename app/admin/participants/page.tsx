import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
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

  const [{ data: companies }, { data: programs }] = await Promise.all([
    adminClient.from('companies').select('id, name').eq('active', true).order('name'),
    adminClient.from('training_programs').select('id, name, company_id').order('name'),
  ])

  let query = adminClient
    .from('profiles')
    .select('*, companies(name)')
    .eq('role', 'participant')
    .order('full_name')

  if (company_id) {
    query = query.eq('company_id', company_id)
  }

  const { data: allParticipants } = await query

  let participants = allParticipants || []
  if (program_id) {
    const { data: enrolled } = await adminClient
      .from('program_participants')
      .select('participant_id')
      .eq('program_id', program_id)

    const enrolledIds = new Set((enrolled || []).map(r => r.participant_id))
    participants = participants.filter(p => enrolledIds.has(p.id))
  }

  async function deleteParticipant(formData: FormData): Promise<{ error?: string }> {
    'use server'
    const userId = formData.get('user_id') as string
    const adminClient = createAdminClient()

    // Elimina prima tutti i dati collegati (ordine importante per le FK)
    await adminClient.from('attendances').delete().eq('participant_id', userId)
    await adminClient.from('group_members').delete().eq('participant_id', userId)
    await adminClient.from('program_participants').delete().eq('participant_id', userId)
    await adminClient.from('level_check_slots').delete().eq('participant_id', userId)

    // Elimina profilo
    await adminClient.from('profiles').delete().eq('id', userId)

    // Elimina utente da Auth
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    revalidatePath('/admin/participants')
    return {}
  }

  async function sendPasswordReset(
    _prevState: { success: boolean; message: string } | null,
    formData: FormData
  ) {
    'use server'
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const email = formData.get('email') as string
    const headersList = await headers()
    const host = headersList.get('host') || 'b2badmin.feelfluent.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectTo = `${protocol}://${host}/auth/reset-password`
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
    revalidatePath('/admin/participants')
    if (error) return { success: false, message: `Errore: ${error.message}` }
    return { success: true, message: 'Invito inviato!' }
  }

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Partecipanti</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/participants/new"
              className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
            >
              + Nuovo
            </Link>
            <Link
              href="/admin/participants/import"
              className="bg-white text-gray-700 border border-[var(--ff-border)] px-4 py-2 rounded-lg hover:bg-[var(--ff-paper)] transition text-sm font-medium"
            >
              Importa CSV
            </Link>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
          <ParticipantsFilter
            companies={companies || []}
            programs={programs || []}
            selectedCompany={company_id || ''}
            selectedProgram={program_id || ''}
            total={participants.length}
          />

          {participants.length === 0 ? (
            <div className="p-12 text-center text-[var(--ff-muted)]">
              Nessun partecipante trovato con i filtri selezionati.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--ff-border)]">
              <thead className="bg-[var(--ff-paper)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azienda</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Creato</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                {participants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{participant.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{participant.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{(participant.companies as any)?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--ff-muted)]">
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
