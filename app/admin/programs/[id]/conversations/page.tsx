import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'
import CreateConversationForm from '@/components/admin/CreateConversationForm'
import ConversationCard from '@/components/admin/ConversationCard'

interface Props {
  params: Promise<{ id: string }>
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export default async function ProgramConversationsPage({ params }: Props) {
  const { id: programId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: program } = await adminClient
    .from('training_programs')
    .select('*, companies(name)')
    .eq('id', programId)
    .single()

  if (!program) redirect('/admin/programs')

  // Gruppi del programma con tutor
  const { data: groups } = await adminClient
    .from('groups')
    .select('id, name, level, tutor_id, profiles!tutor_id(id, full_name)')
    .eq('program_id', programId)
    .order('level')

  // Tutor del programma
  const { data: programTutorRows } = await adminClient
    .from('program_tutors')
    .select('tutor_id')
    .eq('program_id', programId)

  const tutorIds = (programTutorRows || []).map(r => r.tutor_id)
  const { data: tutors } = tutorIds.length > 0
    ? await adminClient
        .from('profiles')
        .select('id, full_name, personal_room_link')
        .in('id', tutorIds)
        .order('full_name')
    : { data: [] }

  // Conversazioni del programma (ordine cronologico crescente)
  const { data: conversations } = await adminClient
    .from('conversations')
    .select(`
      *,
      groups!group_id(name, level),
      profiles!tutor_id(full_name)
    `)
    .eq('program_id', programId)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })

  // Membri di tutti i gruppi
  const groupIds = (groups || []).map(g => g.id)
  const { data: allMembers } = groupIds.length > 0
    ? await adminClient
        .from('group_members')
        .select('group_id, participant_id, profiles!participant_id(full_name, email)')
        .in('group_id', groupIds)
    : { data: [] }

  // Presenze di tutte le conversazioni
  const conversationIds = (conversations || []).map(c => c.id)
  const { data: allAttendances } = conversationIds.length > 0
    ? await adminClient
        .from('attendances')
        .select('conversation_id, participant_id, status, notes, entry_time, exit_time')
        .in('conversation_id', conversationIds)
    : { data: [] }

  // --- SERVER ACTIONS ---

  async function createConversation(formData: FormData) {
    'use server'
    const group_id = formData.get('group_id') as string
    const tutor_id = formData.get('tutor_id') as string
    const scheduled_date = formData.get('scheduled_date') as string
    const start_time = formData.get('start_time') as string
    const duration_minutes = parseInt(formData.get('duration_minutes') as string)
    const end_time = formData.get('end_time') as string
    const meeting_link = formData.get('meeting_link') as string
    const notes = (formData.get('notes') as string) || null
    const is_recurring = formData.get('is_recurring') === 'true'
    const recurrence_end_date = (formData.get('recurrence_end_date') as string) || null

    const base = {
      program_id: programId,
      group_id,
      tutor_id,
      start_time,
      end_time,
      duration_minutes,
      meeting_link,
      notes,
      status: 'scheduled',
    }

    const adminClient = createAdminClient()

    if (!is_recurring || !recurrence_end_date) {
      await adminClient.from('conversations').insert({ ...base, scheduled_date })
    } else {
      const [sy, sm, sd] = scheduled_date.split('-').map(Number)
      const [ey, em, ed] = recurrence_end_date.split('-').map(Number)
      let current = new Date(sy, sm - 1, sd)
      const end = new Date(ey, em - 1, ed)

      const rows = []
      while (current <= end) {
        const yyyy = current.getFullYear()
        const mm = String(current.getMonth() + 1).padStart(2, '0')
        const dd = String(current.getDate()).padStart(2, '0')
        rows.push({ ...base, scheduled_date: `${yyyy}-${mm}-${dd}` })
        current.setDate(current.getDate() + 7)
      }

      if (rows.length > 0) {
        await adminClient.from('conversations').insert(rows)
      }
    }

    revalidatePath(`/admin/programs/${programId}/conversations`)
  }

  async function updateConversationStatus(formData: FormData) {
    'use server'
    const conversation_id = formData.get('conversation_id') as string
    const status = formData.get('status') as string
    const adminClient = createAdminClient()
    await adminClient
      .from('conversations')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)
    revalidatePath(`/admin/programs/${programId}/conversations`)
  }

  async function saveAttendance(formData: FormData) {
    'use server'
    const conversation_id = formData.get('conversation_id') as string
    const attendance_json = formData.get('attendance_json') as string
    const records: { participant_id: string; status: string; notes: string | null; entry_time: string | null; exit_time: string | null }[] = JSON.parse(attendance_json)

    const adminClient = createAdminClient()
    const rows = records.map(r => ({
      conversation_id,
      participant_id: r.participant_id,
      status: r.status,
      notes: r.notes,
      entry_time: r.entry_time || null,
      exit_time: r.exit_time || null,
      recorded_by: null,
      recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    await adminClient
      .from('attendances')
      .upsert(rows, { onConflict: 'conversation_id,participant_id' })

    revalidatePath(`/admin/programs/${programId}/conversations`)
  }

  async function rescheduleConversation(formData: FormData) {
    'use server'
    const conversation_id = formData.get('conversation_id') as string
    const new_date = formData.get('new_date') as string
    const new_start_time = formData.get('new_start_time') as string
    const duration_minutes = parseInt(formData.get('duration_minutes') as string)

    const [h, m] = new_start_time.split(':').map(Number)
    const total = h * 60 + m + duration_minutes
    const new_end_time = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

    const adminClient = createAdminClient()
    await adminClient
      .from('conversations')
      .update({
        scheduled_date: new_date,
        start_time: new_start_time,
        end_time: new_end_time,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    revalidatePath(`/admin/programs/${programId}/conversations`)
  }

  async function deleteConversation(formData: FormData) {
    'use server'
    const conversation_id = formData.get('conversation_id') as string
    const adminClient = createAdminClient()
    await adminClient.from('attendances').delete().eq('conversation_id', conversation_id)
    await adminClient.from('conversations').delete().eq('id', conversation_id)
    revalidatePath(`/admin/programs/${programId}/conversations`)
  }

  // Dati formattati per i componenti
  const groupsFormatted = (groups || []).map(g => ({
    id: g.id,
    name: g.name,
    level: g.level,
    tutor_id: g.tutor_id,
    tutor: Array.isArray(g.profiles) ? g.profiles[0] ?? null : (g.profiles as any) ?? null,
  }))

  const convList = (conversations || []).map(c => ({
    id: c.id,
    group_id: c.group_id,
    scheduled_date: c.scheduled_date,
    start_time: c.start_time,
    end_time: c.end_time,
    duration_minutes: c.duration_minutes,
    meeting_link: c.meeting_link,
    status: c.status,
    notes: c.notes,
    group: Array.isArray(c.groups) ? c.groups[0] : (c.groups as any) ?? { name: '—', level: '' },
    tutor: Array.isArray(c.profiles) ? c.profiles[0] ?? null : (c.profiles as any) ?? null,
  }))

  // Numero progressivo per gruppo (ordine cronologico, già sorted ascending)
  const sessionNumbers: Record<string, number> = {}
  const groupCounters: Record<string, number> = {}
  for (const conv of convList) {
    groupCounters[conv.group_id] = (groupCounters[conv.group_id] || 0) + 1
    sessionNumbers[conv.id] = groupCounters[conv.group_id]
  }

  const totalScheduled = convList.filter(c => c.status === 'scheduled').length
  const totalCompleted = convList.filter(c => c.status === 'completed').length
  const totalCancelled = convList.filter(c => c.status === 'cancelled').length

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-[var(--ff-muted)]">
            <Link href="/admin/programs" className="hover:text-gray-600">Programmi</Link>
            <span>/</span>
            <Link href={`/admin/programs/${programId}`} className="hover:text-gray-600">{program.name}</Link>
            <span>/</span>
            <span className="text-gray-700 font-semibold">Conversazioni</span>
          </div>
          <div className="mt-1">
            <h1 className="text-xl font-bold text-gray-900">Conversazioni</h1>
            <p className="text-xs text-[var(--ff-muted)] mt-0.5">{program.name} · {(program.companies as any)?.name}</p>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{convList.length}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Totale</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-[var(--ff-red)]">{totalScheduled}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Programmate</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{totalCompleted}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Completate</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">{totalCancelled}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Annullate</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Colonna sinistra: crea conversazione */}
          <div className="lg:col-span-1">
            <details className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm" open>
              <summary className="px-6 py-4 font-semibold text-gray-900 cursor-pointer select-none text-sm">
                + Nuova conversazione
              </summary>
              <div className="px-6 pb-6 border-t border-[var(--ff-border)] pt-4">
                {groupsFormatted.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Nessun gruppo creato. <Link href={`/admin/programs/${programId}/groups`} className="text-[var(--ff-red)] hover:underline">Crea i gruppi prima.</Link>
                  </p>
                ) : (
                  <CreateConversationForm
                    groups={groupsFormatted}
                    tutors={tutors || []}
                    programEndDate={program.end_date || null}
                    createConversation={createConversation}
                  />
                )}
              </div>
            </details>
          </div>

          {/* Colonna destra: lista conversazioni */}
          <div className="lg:col-span-2 space-y-4">
            {convList.length === 0 ? (
              <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)]">
                <p className="text-lg font-medium mb-1">Nessuna conversazione</p>
                <p className="text-sm">Usa il pannello a sinistra per crearne una.</p>
              </div>
            ) : (
              convList.map(conv => {
                const members = (allMembers || [])
                  .filter(m => m.group_id === conv.group_id)
                  .map(m => ({
                    participant_id: m.participant_id,
                    full_name: (m.profiles as any)?.full_name || '—',
                    email: (m.profiles as any)?.email || '',
                  }))

                const attendances = (allAttendances || [])
                  .filter(a => a.conversation_id === conv.id)
                  .map(a => ({
                    participant_id: a.participant_id,
                    status: a.status,
                    notes: a.notes,
                    entry_time: (a as any).entry_time ?? null,
                    exit_time: (a as any).exit_time ?? null,
                  }))

                return (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    sessionNumber={sessionNumbers[conv.id]}
                    members={members}
                    attendances={attendances}
                    updateStatus={updateConversationStatus}
                    saveAttendance={saveAttendance}
                    deleteConversation={deleteConversation}
                    rescheduleConversation={rescheduleConversation}
                  />
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
