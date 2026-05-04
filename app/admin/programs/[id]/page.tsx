import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'
import ProgramParticipantActions from '@/components/admin/ProgramParticipantActions'
import BulkAddParticipants from '@/components/admin/BulkAddParticipants'
import ProgramTutors from '@/components/admin/ProgramTutors'

interface Props {
  params: Promise<{ id: string }>
}

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

const LEVEL_LABELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params

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

  // Carica programma con azienda
  const { data: program } = await adminClient
    .from('training_programs')
    .select('*, companies(name)')
    .eq('id', id)
    .single()

  if (!program) redirect('/admin/programs')

  // Carica partecipanti del programma con info profilo
  const { data: programParticipants } = await adminClient
    .from('program_participants')
    .select(`
      *,
      profiles!participant_id (
        id, full_name, email
      )
    `)
    .eq('program_id', id)
    .order('added_at')

  // Carica partecipanti dell'azienda del programma (con created_at per data aggiunta)
  const { data: companyParticipants } = await adminClient
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'participant')
    .eq('company_id', program.company_id)
    .order('full_name')

  // Filtra quelli già nel programma
  const enrolledIds = new Set((programParticipants || []).map(pp => pp.participant_id))
  const availableParticipants = (companyParticipants || []).filter(p => !enrolledIds.has(p.id))

  // Carica gruppi di conversazione del programma
  const { data: conversationGroups } = await adminClient
    .from('groups')
    .select('id, name, level, tutor_id')
    .eq('program_id', id)
    .order('level')

  // Carica tutti i tutor
  const { data: allTutors } = await adminClient
    .from('profiles')
    .select('id, full_name, email, languages')
    .eq('role', 'tutor')
    .order('full_name')

  // Carica tutor associati al programma
  const { data: programTutorRows } = await adminClient
    .from('program_tutors')
    .select('tutor_id')
    .eq('program_id', id)

  const programTutorIds = new Set((programTutorRows || []).map(r => r.tutor_id))

  // Aziende per modifica
  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // --- SERVER ACTIONS ---

  async function updateProgram(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const company_id = formData.get('company_id') as string
    const description = (formData.get('description') as string) || null
    const start_date = formData.get('start_date') as string
    const end_date = (formData.get('end_date') as string) || null
    const status = formData.get('status') as string

    const adminClient = createAdminClient()
    await adminClient
      .from('training_programs')
      .update({ name, company_id, description, start_date, end_date: end_date || null, status, updated_at: new Date().toISOString() })
      .eq('id', id)

    revalidatePath(`/admin/programs/${id}`)
  }

  async function addBulkParticipants(formData: FormData) {
    'use server'
    const participantIds = formData.getAll('participant_ids') as string[]
    if (!participantIds.length) return

    const adminClient = createAdminClient()
    const rows = participantIds.map(participant_id => ({
      program_id: id,
      participant_id,
      level_check_completed: false,
    }))

    const { error } = await adminClient
      .from('program_participants')
      .insert(rows)

    if (error) {
      console.error('[addBulkParticipants] error:', error)
      return
    }

    revalidatePath(`/admin/programs/${id}`)
  }

  async function removeParticipant(formData: FormData) {
    'use server'
    const pp_id = formData.get('pp_id') as string
    const adminClient = createAdminClient()
    await adminClient
      .from('program_participants')
      .delete()
      .eq('id', pp_id)
    revalidatePath(`/admin/programs/${id}`)
  }

  async function assignLevel(formData: FormData) {
    'use server'
    const pp_id = formData.get('pp_id') as string
    const assigned_level = (formData.get('assigned_level') as string) || null
    const level_check_tutor_id = (formData.get('level_check_tutor_id') as string) || null
    const notes = (formData.get('notes') as string) || null
    const adminClient = createAdminClient()
    await adminClient
      .from('program_participants')
      .update({
        assigned_level,
        level_check_tutor_id: level_check_tutor_id || null,
        level_check_completed: !!assigned_level,
        level_check_date: assigned_level ? new Date().toISOString() : null,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pp_id)
    revalidatePath(`/admin/programs/${id}`)
  }

  async function addTutor(formData: FormData) {
    'use server'
    const tutor_id = formData.get('tutor_id') as string
    if (!tutor_id) return
    const adminClient = createAdminClient()
    await adminClient
      .from('program_tutors')
      .insert({ program_id: id, tutor_id })
    revalidatePath(`/admin/programs/${id}`)
  }

  async function removeTutor(formData: FormData) {
    'use server'
    const tutor_id = formData.get('tutor_id') as string
    const adminClient = createAdminClient()
    await adminClient
      .from('program_tutors')
      .delete()
      .eq('program_id', id)
      .eq('tutor_id', tutor_id)
    revalidatePath(`/admin/programs/${id}`)
  }

  const levelCheckDone = (programParticipants || []).filter(pp => pp.level_check_completed).length
  const levelCheckTotal = (programParticipants || []).length
  const assignedTutors = (allTutors || []).filter(t => programTutorIds.has(t.id))
  const availableTutors = (allTutors || []).filter(t => !programTutorIds.has(t.id))
  const groupCount = (conversationGroups || []).length

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/admin/programs" className="text-xs text-[var(--ff-muted)] hover:text-gray-700 mb-1 block">
            ← Programmi
          </Link>
          <div className="flex items-center gap-3 mt-0.5">
            <h1 className="text-xl font-bold text-gray-900">{program.name}</h1>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[program.status]}`}>
              {STATUS_LABELS[program.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--ff-muted)] mt-0.5">{(program.companies as any)?.name}</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats rapide */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{levelCheckTotal}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Partecipanti</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{levelCheckDone}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Level check ok</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">{levelCheckTotal - levelCheckDone}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">In attesa</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{assignedTutors.length}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Tutor</div>
          </div>
          <Link
            href={`/admin/programs/${id}/groups`}
            className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center hover:border-[var(--ff-red-100)] hover:shadow-md transition group"
          >
            <div className="text-3xl font-bold text-gray-800">{groupCount}</div>
            <div className="text-xs text-[var(--ff-red)] font-semibold mt-1 group-hover:underline">
              Gruppi →
            </div>
          </Link>
          <Link
            href={`/admin/programs/${id}/level-checks`}
            className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center hover:border-[var(--ff-red-100)] hover:shadow-md transition group"
          >
            <div className="text-3xl font-bold">🎯</div>
            <div className="text-xs text-[var(--ff-red)] font-semibold mt-1 group-hover:underline">
              Level Check →
            </div>
          </Link>
          <Link
            href={`/admin/programs/${id}/conversations`}
            className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center hover:border-[var(--ff-red-100)] hover:shadow-md transition group"
          >
            <div className="text-3xl font-bold">📅</div>
            <div className="text-xs text-[var(--ff-red)] font-semibold mt-1 group-hover:underline">
              Conversazioni →
            </div>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Colonna sinistra */}
          <div className="lg:col-span-1 space-y-6">

            <details className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm">
              <summary className="px-6 py-4 font-semibold text-gray-900 cursor-pointer select-none text-sm">
                ⚙️ Dati programma
              </summary>
              <form action={updateProgram} className="px-6 pb-6 space-y-4 border-t border-[var(--ff-border)] pt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
                  <input type="text" name="name" required defaultValue={program.name}
                    className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Azienda</label>
                  <select name="company_id" defaultValue={program.company_id}
                    className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]">
                    {(companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Stato</label>
                  <select name="status" defaultValue={program.status}
                    className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]">
                    {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrizione</label>
                  <textarea name="description" rows={2} defaultValue={program.description || ''}
                    className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Inizio</label>
                    <input type="date" name="start_date" defaultValue={program.start_date}
                      className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fine</label>
                    <input type="date" name="end_date" defaultValue={program.end_date || ''}
                      className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]" />
                  </div>
                </div>
                <button type="submit"
                  className="w-full bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2 rounded-lg transition text-sm font-semibold">
                  Salva modifiche
                </button>
              </form>
            </details>

            <details className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm" open>
              <summary className="px-6 py-4 font-semibold text-gray-900 cursor-pointer select-none text-sm">
                👥 Aggiungi partecipanti
                {availableParticipants.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--ff-muted)]">
                    ({availableParticipants.length} disponibili)
                  </span>
                )}
              </summary>
              <div className="px-6 pb-6 border-t border-[var(--ff-border)] pt-4">
                <BulkAddParticipants participants={availableParticipants} addBulkParticipants={addBulkParticipants} />
              </div>
            </details>

            <details className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm" open>
              <summary className="px-6 py-4 font-semibold text-gray-900 cursor-pointer select-none text-sm">
                👩‍🏫 Tutor del programma
                {assignedTutors.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--ff-muted)]">
                    ({assignedTutors.length} assegnati)
                  </span>
                )}
              </summary>
              <div className="px-6 pb-6 border-t border-[var(--ff-border)] pt-4">
                <ProgramTutors assignedTutors={assignedTutors} availableTutors={availableTutors} addTutor={addTutor} removeTutor={removeTutor} />
              </div>
            </details>

          </div>

          {/* Colonna destra: tabella partecipanti */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--ff-border)] flex items-center justify-between bg-[var(--ff-paper)]">
                <h2 className="text-sm font-bold text-gray-900">
                  Partecipanti iscritti
                  <span className="ml-2 text-xs font-normal text-[var(--ff-muted)]">
                    ({levelCheckDone}/{levelCheckTotal} level check)
                  </span>
                </h2>
                {levelCheckTotal > 0 && (
                  <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${levelCheckTotal > 0 ? (levelCheckDone / levelCheckTotal) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>

              {!programParticipants || programParticipants.length === 0 ? (
                <div className="p-8 text-center text-[var(--ff-muted)] text-sm">
                  Nessun partecipante iscritto. Usa il pannello a sinistra per aggiungerne.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-[var(--ff-border)]">
                  <thead className="bg-[var(--ff-paper)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Partecipante</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Level Check</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Livello</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ff-border)]">
                    {programParticipants.map((pp) => (
                      <tr key={pp.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{(pp.profiles as any)?.full_name || '—'}</div>
                          <div className="text-xs text-[var(--ff-muted)]">{(pp.profiles as any)?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {pp.level_check_completed ? (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Completato</span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">In attesa</span>
                          )}
                          {pp.level_check_date && (
                            <div className="text-xs text-[var(--ff-muted)] mt-0.5">
                              {new Date(pp.level_check_date).toLocaleDateString('it-IT')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {pp.assigned_level ? (
                            <span className="px-2 py-1 text-sm font-bold bg-[var(--ff-red-50)] text-[var(--ff-red)] rounded-lg">
                              {pp.assigned_level}
                            </span>
                          ) : (
                            <span className="text-[var(--ff-muted)] text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ProgramParticipantActions
                            pp={pp}
                            tutors={assignedTutors.length > 0 ? assignedTutors : (allTutors || [])}
                            levelLabels={LEVEL_LABELS}
                            assignLevel={assignLevel}
                            removeParticipant={removeParticipant}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
