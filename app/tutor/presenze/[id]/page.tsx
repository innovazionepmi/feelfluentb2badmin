import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import TutorAttendanceForm from '@/components/tutor/TutorAttendanceForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TutorPresenzePage({ params }: Props) {
  const { id: conversationId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Dati conversazione
  const { data: conv } = await adminClient
    .from('conversations')
    .select('id, group_id, tutor_id, scheduled_date, start_time, end_time, status, notes, groups!group_id(id, name, level, tutor_id)')
    .eq('id', conversationId)
    .single()

  if (!conv) redirect('/tutor')

  const group = Array.isArray(conv.groups) ? conv.groups[0] : conv.groups as any

  // Verifica che il tutor sia assegnato a questa conversazione o al gruppo
  const isAuthorized = conv.tutor_id === user.id || group?.tutor_id === user.id
  if (!isAuthorized) redirect('/tutor')

  // Numero sessione
  const { data: prevConvs } = await adminClient
    .from('conversations')
    .select('id')
    .eq('group_id', conv.group_id)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })

  const sessionNumber = ((prevConvs || []).findIndex(c => c.id === conversationId) + 1) || 1

  // Membri del gruppo
  const { data: members } = await adminClient
    .from('group_members')
    .select('participant_id, profiles!participant_id(full_name, email)')
    .eq('group_id', conv.group_id)

  // Presenze esistenti
  const { data: existingAttendances } = await adminClient
    .from('attendances')
    .select('participant_id, status, notes, entry_time, exit_time')
    .eq('conversation_id', conversationId)

  const membersFormatted = (members || []).map(m => ({
    participant_id: m.participant_id,
    full_name: (m.profiles as any)?.full_name || '—',
    email: (m.profiles as any)?.email || '',
  }))

  const attendancesFormatted = (existingAttendances || []).map(a => ({
    participant_id: a.participant_id,
    status: a.status || '',
    notes: a.notes || '',
    entry_time: (a as any).entry_time?.slice(0, 5) || '',
    exit_time: (a as any).exit_time?.slice(0, 5) || '',
  }))

  async function saveAttendance(formData: FormData): Promise<{ error?: string }> {
    'use server'
    const attendance_json = formData.get('attendance_json') as string
    const records: {
      participant_id: string
      status: string
      notes: string | null
      entry_time: string | null
      exit_time: string | null
    }[] = JSON.parse(attendance_json)

    const adminClient = createAdminClient()
    const rows = records.map(r => ({
      conversation_id: conversationId,
      participant_id: r.participant_id,
      status: r.status,
      notes: r.notes,
      entry_time: r.entry_time || null,
      exit_time: r.exit_time || null,
      recorded_by: user!.id,
      recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await adminClient
      .from('attendances')
      .upsert(rows, { onConflict: 'conversation_id,participant_id' })

    if (error) return { error: error.message }

    revalidatePath(`/tutor/presenze/${conversationId}`)
    return {}
  }

  const dateLabel = new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/tutor" className="text-xs text-[var(--ff-muted)] hover:text-gray-700">
          ← Torna alle conversazioni
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Presenze</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-[var(--ff-muted)]">
          <span className="capitalize">{dateLabel}</span>
          <span>·</span>
          <span>{conv.start_time.slice(0, 5)}–{conv.end_time.slice(0, 5)}</span>
          <span>·</span>
          <span>Gruppo {group?.name} · Lez. {sessionNumber}</span>
        </div>
      </div>

      {membersFormatted.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)] text-sm">
          Nessun partecipante assegnato a questo gruppo.
        </div>
      ) : (
        <TutorAttendanceForm
          conversationId={conversationId}
          members={membersFormatted}
          existingAttendances={attendancesFormatted}
          saveAttendance={saveAttendance}
        />
      )}
    </div>
  )
}
