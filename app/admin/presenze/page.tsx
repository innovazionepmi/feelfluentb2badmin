import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import AdminNav from '@/components/admin/AdminNav'
import PresenzeClient from './PresenzeClient'

interface Props {
  searchParams: Promise<{ program_id?: string; conversation_id?: string; saved?: string }>
}

export default async function PresenzeRapidePage({ searchParams }: Props) {
  const { program_id, conversation_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role
  if (!role || !['admin', 'tutor'].includes(role)) redirect('/dashboard')

  const adminClient = createAdminClient()

  // Programmi accessibili: admin vede tutto, tutor solo i suoi
  let programs: { id: string; name: string; companies: { name: string } | null }[] = []
  if (role === 'admin') {
    const { data } = await adminClient
      .from('training_programs')
      .select('id, name, companies(name)')
      .order('name')
    programs = (data || []).map(p => ({ ...p, companies: Array.isArray(p.companies) ? p.companies[0] ?? null : (p.companies as any) ?? null }))
  } else {
    // Tutor: programmi a cui è assegnato
    const { data: tutorPrograms } = await adminClient
      .from('program_tutors')
      .select('program_id, training_programs(id, name, companies(name))')
      .eq('tutor_id', user.id)
    programs = (tutorPrograms || []).map(r => {
      const tp = Array.isArray(r.training_programs) ? r.training_programs[0] : (r.training_programs as any)
      return {
        id: tp?.id,
        name: tp?.name,
        companies: Array.isArray(tp?.companies) ? tp.companies[0] ?? null : (tp?.companies as any) ?? null,
      }
    }).filter(p => p.id)
  }

  // Conversazioni del programma selezionato (solo future o recenti ± 7 giorni, ordine desc)
  let conversations: {
    id: string
    scheduled_date: string
    start_time: string
    end_time: string
    status: string
    group: { name: string; level: string }
    sessionNumber: number
  }[] = []

  let members: { participant_id: string; full_name: string; email: string }[] = []
  let existingAttendances: { participant_id: string; status: string; notes: string | null }[] = []
  let selectedConv: (typeof conversations)[0] | null = null

  if (program_id) {
    // Carica conversazioni del programma
    let convQuery = adminClient
      .from('conversations')
      .select('id, scheduled_date, start_time, end_time, status, group_id, groups!group_id(name, level)')
      .eq('program_id', program_id)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: false })
      .order('start_time', { ascending: false })

    // Tutor vede solo le sue
    if (role === 'tutor') {
      convQuery = convQuery.eq('tutor_id', user.id)
    }

    const { data: rawConvs } = await convQuery

    // Calcola numeri progressivi per gruppo
    const groupCounters: Record<string, number> = {}
    const allSorted = [...(rawConvs || [])].reverse() // ascending order for numbering
    for (const c of allSorted) {
      groupCounters[c.group_id] = (groupCounters[c.group_id] || 0) + 1
    }
    const groupProgress: Record<string, number> = {}
    const sessionNumberMap: Record<string, number> = {}
    for (const c of allSorted) {
      groupProgress[c.group_id] = (groupProgress[c.group_id] || 0) + 1
      sessionNumberMap[c.id] = groupProgress[c.group_id]
    }

    conversations = (rawConvs || []).map(c => ({
      id: c.id,
      scheduled_date: c.scheduled_date,
      start_time: c.start_time,
      end_time: c.end_time,
      status: c.status,
      group: Array.isArray(c.groups) ? c.groups[0] ?? { name: '—', level: '' } : (c.groups as any) ?? { name: '—', level: '' },
      sessionNumber: sessionNumberMap[c.id] || 0,
    }))

    // Se conversazione selezionata, carica partecipanti e presenze esistenti
    if (conversation_id) {
      selectedConv = conversations.find(c => c.id === conversation_id) || null

      if (selectedConv) {
        // Trova il group_id della conversazione
        const rawConv = (rawConvs || []).find(c => c.id === conversation_id)
        if (rawConv) {
          const { data: groupMembers } = await adminClient
            .from('group_members')
            .select('participant_id, profiles!participant_id(full_name, email)')
            .eq('group_id', rawConv.group_id)

          members = (groupMembers || []).map(m => ({
            participant_id: m.participant_id,
            full_name: (m.profiles as any)?.full_name || '—',
            email: (m.profiles as any)?.email || '',
          }))

          const { data: att } = await adminClient
            .from('attendances')
            .select('participant_id, status, notes')
            .eq('conversation_id', conversation_id)

          existingAttendances = (att || []).map(a => ({
            participant_id: a.participant_id,
            status: a.status,
            notes: a.notes,
          }))
        }
      }
    }
  }

  // Server action: salva presenze
  async function saveAttendance(formData: FormData) {
    'use server'
    const conv_id = formData.get('conversation_id') as string
    const prog_id = formData.get('program_id') as string
    const attendance_json = formData.get('attendance_json') as string
    const records: { participant_id: string; status: string; notes: string | null }[] = JSON.parse(attendance_json)

    const adminClient = createAdminClient()
    const rows = records.map(r => ({
      conversation_id: conv_id,
      participant_id: r.participant_id,
      status: r.status,
      notes: r.notes,
      recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    await adminClient
      .from('attendances')
      .upsert(rows, { onConflict: 'conversation_id,participant_id' })

    // Marca la conversazione come completata se era schedulata
    await adminClient
      .from('conversations')
      .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conv_id)
      .eq('status', 'scheduled')

    revalidatePath('/admin/presenze')
    redirect(`/admin/presenze?program_id=${prog_id}&conversation_id=${conv_id}&saved=1`)
  }

  const savedParam = (await searchParams).saved === '1'

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Presenze Rapide</h1>
          <p className="text-xs text-[var(--ff-muted)] mt-0.5">Seleziona programma e conversazione per registrare le presenze</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PresenzeClient
          programs={programs}
          conversations={conversations}
          members={members}
          existingAttendances={existingAttendances}
          selectedProgramId={program_id || ''}
          selectedConversationId={conversation_id || ''}
          selectedConv={selectedConv}
          saveAttendance={saveAttendance}
          justSaved={savedParam}
        />
      </main>
    </div>
  )
}
