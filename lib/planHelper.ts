import { createAdminClient } from '@/lib/supabase/server'
import { sendPlanEmail } from '@/lib/email'

export interface ParticipantPlanData {
  email: string
  fullName: string
  level: string | null
  groupName: string
  tutorName: string
  conversations: Array<{
    session_number: number
    scheduled_date: string
    start_time: string
    end_time: string
    meeting_link: string
  }>
}

/**
 * Recupera i dati del piano formativo di un partecipante per un programma specifico.
 * Restituisce null se il partecipante non è assegnato a nessun gruppo del programma.
 */
export async function getParticipantPlan(
  participantId: string,
  programId: string
): Promise<ParticipantPlanData | null> {
  const adminClient = createAdminClient()

  // Profilo e iscrizione in parallelo
  const [profileRes, ppRes, gmRes, programGroupsRes] = await Promise.all([
    adminClient.from('profiles').select('full_name, email').eq('id', participantId).single(),
    adminClient.from('program_participants').select('assigned_level').eq('participant_id', participantId).eq('program_id', programId).single(),
    adminClient.from('group_members').select('group_id').eq('participant_id', participantId),
    adminClient.from('groups').select('id, name, tutor_id, profiles!tutor_id(full_name)').eq('program_id', programId),
  ])

  const profile = profileRes.data
  if (!profile) return null

  const programGroups: any[] = programGroupsRes.data || []
  const programGroupIds = new Set(programGroups.map(g => g.id))

  const memberships: any[] = gmRes.data || []
  const gm = memberships.find(m => programGroupIds.has(m.group_id))
  if (!gm) return null

  const group = programGroups.find(g => g.id === gm.group_id)
  if (!group) return null

  const tutorProfile = Array.isArray(group.profiles) ? group.profiles[0] : group.profiles
  const tutorName: string = tutorProfile?.full_name || '—'

  // Conversazioni del gruppo (solo scheduled e completed, ordine cronologico)
  const { data: convs } = await adminClient
    .from('conversations')
    .select('id, scheduled_date, start_time, end_time, meeting_link')
    .eq('group_id', group.id)
    .in('status', ['scheduled', 'completed'])
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })

  const conversations = (convs || []).map((c: any, idx: number) => ({
    session_number: idx + 1,
    scheduled_date: c.scheduled_date,
    start_time: c.start_time,
    end_time: c.end_time,
    meeting_link: c.meeting_link || '',
  }))

  return {
    email: profile.email,
    fullName: profile.full_name,
    level: ppRes.data?.assigned_level || null,
    groupName: group.name,
    tutorName,
    conversations,
  }
}

/**
 * Invia l'email del piano formativo a un singolo partecipante.
 * Restituisce true se inviata, false se il partecipante non ha gruppo assegnato.
 */
export async function sendPlanToParticipantById(
  participantId: string,
  programId: string,
  programName: string
): Promise<{ ok: boolean; reason?: string }> {
  const plan = await getParticipantPlan(participantId, programId)
  if (!plan) return { ok: false, reason: 'Nessun gruppo assegnato' }

  await sendPlanEmail({
    to: plan.email,
    participantName: plan.fullName,
    programName,
    level: plan.level,
    groupName: plan.groupName,
    tutorName: plan.tutorName,
    conversations: plan.conversations,
  })

  return { ok: true }
}
