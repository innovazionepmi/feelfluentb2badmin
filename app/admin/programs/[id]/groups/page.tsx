import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'
import GroupCard from '@/components/admin/GroupCard'
import CreateGroupForm from '@/components/admin/CreateGroupForm'

interface Props {
  params: Promise<{ id: string }>
}

const LEVEL_LABELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-red-100 text-red-700 border-red-200',
  A2: 'bg-orange-100 text-orange-700 border-orange-200',
  B1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  B2: 'bg-green-100 text-green-700 border-green-200',
  C1: 'bg-blue-100 text-blue-700 border-blue-200',
  C2: 'bg-purple-100 text-purple-700 border-purple-200',
}

export default async function ProgramGroupsPage({ params }: Props) {
  const { id: programId } = await params

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

  // Carica programma
  const { data: program } = await adminClient
    .from('training_programs')
    .select('*, companies(name)')
    .eq('id', programId)
    .single()

  if (!program) redirect('/admin/programs')

  // Carica tutti i gruppi del programma con i tutor
  const { data: groups } = await adminClient
    .from('groups')
    .select(`
      *,
      profiles!tutor_id (id, full_name, email)
    `)
    .eq('program_id', programId)
    .order('level')
    .order('name')

  // Carica tutti i membri dei gruppi
  const groupIds = (groups || []).map(g => g.id)
  const { data: allMembers } = groupIds.length > 0
    ? await adminClient
        .from('group_members')
        .select(`
          *,
          profiles!participant_id (id, full_name, email)
        `)
        .in('group_id', groupIds)
    : { data: [] }

  // Carica partecipanti del programma con livello assegnato
  const { data: programParticipants } = await adminClient
    .from('program_participants')
    .select(`
      *,
      profiles!participant_id (id, full_name, email)
    `)
    .eq('program_id', programId)
    .not('assigned_level', 'is', null)
    .order('assigned_level')

  // Carica tutor assegnati al programma
  const { data: programTutorRows } = await adminClient
    .from('program_tutors')
    .select('tutor_id')
    .eq('program_id', programId)

  const programTutorIds = (programTutorRows || []).map(r => r.tutor_id)

  const { data: programTutors } = programTutorIds.length > 0
    ? await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', programTutorIds)
        .order('full_name')
    : { data: [] }

  // Calcola partecipanti già in un gruppo (qualsiasi gruppo del programma)
  const participantsInGroups = new Set((allMembers || []).map(m => m.participant_id))

  // Partecipanti con livello assegnato ma non ancora in nessun gruppo
  const unassignedParticipants = (programParticipants || []).filter(
    pp => !participantsInGroups.has(pp.participant_id)
  )

  // Raggruppa i partecipanti non assegnati per livello
  const unassignedByLevel: Record<string, typeof unassignedParticipants> = {}
  for (const pp of unassignedParticipants) {
    const lvl = pp.assigned_level!
    if (!unassignedByLevel[lvl]) unassignedByLevel[lvl] = []
    unassignedByLevel[lvl].push(pp)
  }

  // Costruisci i gruppi con i loro membri
  const groupsWithMembers = (groups || []).map(g => ({
    ...g,
    members: (allMembers || []).filter(m => m.group_id === g.id),
  }))

  // Raggruppa per livello
  const groupsByLevel: Record<string, typeof groupsWithMembers> = {}
  for (const g of groupsWithMembers) {
    if (!groupsByLevel[g.level]) groupsByLevel[g.level] = []
    groupsByLevel[g.level].push(g)
  }

  // --- SERVER ACTIONS ---

  async function createGroup(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const level = formData.get('level') as string
    const tutor_id = (formData.get('tutor_id') as string) || null

    const adminClient = createAdminClient()
    await adminClient
      .from('groups')
      .insert({
        program_id: programId,
        name,
        level,
        tutor_id,
      })

    revalidatePath(`/admin/programs/${programId}/groups`)
  }

  async function deleteGroup(formData: FormData) {
    'use server'
    const group_id = formData.get('group_id') as string
    const adminClient = createAdminClient()

    // Rimuovi prima tutti i membri
    await adminClient
      .from('group_members')
      .delete()
      .eq('group_id', group_id)

    // Poi elimina il gruppo
    await adminClient
      .from('groups')
      .delete()
      .eq('id', group_id)

    revalidatePath(`/admin/programs/${programId}/groups`)
  }

  async function addMember(formData: FormData) {
    'use server'
    const group_id = formData.get('group_id') as string
    const participant_id = formData.get('participant_id') as string
    if (!group_id || !participant_id) return

    const adminClient = createAdminClient()

    // Rimuovi da eventuale gruppo precedente nello stesso programma
    const { data: existingGroups } = await adminClient
      .from('groups')
      .select('id')
      .eq('program_id', programId)

    const existingGroupIds = (existingGroups || []).map(g => g.id)
    if (existingGroupIds.length > 0) {
      await adminClient
        .from('group_members')
        .delete()
        .eq('participant_id', participant_id)
        .in('group_id', existingGroupIds)
    }

    await adminClient
      .from('group_members')
      .insert({ group_id, participant_id })

    revalidatePath(`/admin/programs/${programId}/groups`)
  }

  async function removeMember(formData: FormData) {
    'use server'
    const group_id = formData.get('group_id') as string
    const participant_id = formData.get('participant_id') as string
    const adminClient = createAdminClient()

    await adminClient
      .from('group_members')
      .delete()
      .eq('group_id', group_id)
      .eq('participant_id', participant_id)

    revalidatePath(`/admin/programs/${programId}/groups`)
  }

  async function updateGroupTutor(formData: FormData) {
    'use server'
    const group_id = formData.get('group_id') as string
    const tutor_id = (formData.get('tutor_id') as string) || null
    const adminClient = createAdminClient()

    await adminClient
      .from('groups')
      .update({ tutor_id: tutor_id || null, updated_at: new Date().toISOString() })
      .eq('id', group_id)

    revalidatePath(`/admin/programs/${programId}/groups`)
  }

  async function updateGroupName(formData: FormData) {
    'use server'
    const group_id = formData.get('group_id') as string
    const name = formData.get('name') as string
    const adminClient = createAdminClient()

    await adminClient
      .from('groups')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', group_id)

    revalidatePath(`/admin/programs/${programId}/groups`)
  }

  const totalGroups = groupsWithMembers.length
  const totalAssigned = participantsInGroups.size
  const totalUnassigned = unassignedParticipants.length
  const totalWithLevel = (programParticipants || []).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/admin/programs" className="hover:text-gray-600">Programmi</Link>
            <span>/</span>
            <Link href={`/admin/programs/${programId}`} className="hover:text-gray-600">{program.name}</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Gruppi di conversazione</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gruppi di conversazione</h1>
              <p className="text-sm text-gray-500 mt-0.5">{program.name} · {program.companies?.name}</p>
            </div>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{totalGroups}</div>
            <div className="text-xs text-gray-500 mt-1">Gruppi creati</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{totalAssigned}</div>
            <div className="text-xs text-gray-500 mt-1">Partecipanti assegnati</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">{totalUnassigned}</div>
            <div className="text-xs text-gray-500 mt-1">Da assegnare</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-600">{totalWithLevel}</div>
            <div className="text-xs text-gray-500 mt-1">Con livello assegnato</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Colonna sinistra: crea gruppo + partecipanti da assegnare */}
          <div className="lg:col-span-1 space-y-6">

            {/* Crea nuovo gruppo */}
            <details className="bg-white rounded-lg shadow" open>
              <summary className="px-6 py-4 font-semibold text-gray-900 cursor-pointer select-none">
                + Crea nuovo gruppo
              </summary>
              <div className="px-6 pb-6 border-t pt-4">
                <CreateGroupForm
                  levelLabels={LEVEL_LABELS}
                  tutors={programTutors || []}
                  createGroup={createGroup}
                />
              </div>
            </details>

            {/* Partecipanti non ancora assegnati */}
            <details className="bg-white rounded-lg shadow" open>
              <summary className="px-6 py-4 font-semibold text-gray-900 cursor-pointer select-none">
                Partecipanti da assegnare
                {totalUnassigned > 0 && (
                  <span className="ml-2 text-xs font-normal text-orange-500">
                    ({totalUnassigned} non ancora in un gruppo)
                  </span>
                )}
              </summary>
              <div className="px-6 pb-6 border-t pt-4">
                {totalUnassigned === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    {totalWithLevel === 0
                      ? 'Nessun partecipante ha ancora un livello assegnato.'
                      : 'Tutti i partecipanti con livello sono stati assegnati a un gruppo.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {LEVEL_LABELS.filter(lvl => unassignedByLevel[lvl]?.length > 0).map(lvl => (
                      <div key={lvl}>
                        <div className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded border mb-2 ${LEVEL_COLORS[lvl]}`}>
                          {lvl}
                          <span className="ml-1 font-normal">({unassignedByLevel[lvl].length})</span>
                        </div>
                        <ul className="space-y-1">
                          {unassignedByLevel[lvl].map(pp => (
                            <li key={pp.id} className="text-sm text-gray-700 pl-2 border-l-2 border-gray-200">
                              {pp.profiles?.full_name}
                              <span className="text-xs text-gray-400 ml-1">· {pp.profiles?.email}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>

          </div>

          {/* Colonna destra: gruppi per livello */}
          <div className="lg:col-span-2 space-y-8">

            {totalGroups === 0 ? (
              <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400">
                <p className="text-lg font-medium mb-1">Nessun gruppo creato</p>
                <p className="text-sm">Usa il pannello a sinistra per creare il primo gruppo di conversazione.</p>
              </div>
            ) : (
              LEVEL_LABELS.filter(lvl => groupsByLevel[lvl]?.length > 0).map(lvl => (
                <div key={lvl}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 text-sm font-bold rounded-full border ${LEVEL_COLORS[lvl]}`}>
                      Livello {lvl}
                    </span>
                    <span className="text-sm text-gray-500">
                      {groupsByLevel[lvl].length} {groupsByLevel[lvl].length === 1 ? 'gruppo' : 'gruppi'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupsByLevel[lvl].map(group => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        tutors={programTutors || []}
                        unassignedForLevel={unassignedByLevel[group.level] || []}
                        addMember={addMember}
                        removeMember={removeMember}
                        deleteGroup={deleteGroup}
                        updateGroupTutor={updateGroupTutor}
                        updateGroupName={updateGroupName}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Gruppi senza livello specifico (edge case) */}
            {groupsByLevel[''] && groupsByLevel[''].length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 text-sm font-bold rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                    Livello non definito
                  </span>
                </div>
                <div className="space-y-4">
                  {groupsByLevel[''].map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      tutors={programTutors || []}
                      unassignedForLevel={[]}
                      addMember={addMember}
                      removeMember={removeMember}
                      deleteGroup={deleteGroup}
                      updateGroupTutor={updateGroupTutor}
                      updateGroupName={updateGroupName}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
