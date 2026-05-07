import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  setup:            'In configurazione',
  level_checks:     'Fase: Level Check',
  groups_formation: 'Fase: Formazione gruppi',
  active:           'In corso',
  completed:        'Completato',
}

const STATUS_COLORS: Record<string, string> = {
  setup:            'bg-gray-100 text-gray-600',
  level_checks:     'bg-blue-100 text-blue-700',
  groups_formation: 'bg-yellow-100 text-yellow-700',
  active:           'bg-green-100 text-green-700',
  completed:        'bg-purple-100 text-purple-700',
}

export default async function ParticipantProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const { data: enrollments } = await adminClient
    .from('program_participants')
    .select(`
      id,
      level_check_completed,
      assigned_level,
      program_id,
      training_programs!program_id (
        id, name, status, start_date,
        companies!company_id (name)
      )
    `)
    .eq('participant_id', user.id)
    .order('added_at', { ascending: false })

  // Slot level check prenotati
  const allProgramIds = (enrollments || []).map(e => e.program_id)

  const { data: mySlots } = allProgramIds.length > 0
    ? await adminClient
        .from('level_check_slots')
        .select('program_id, status, date, start_time, end_time')
        .eq('participant_id', user.id)
        .in('program_id', allProgramIds)
    : { data: [] }

  const mySlotsByProgram = new Map((mySlots || []).map(s => [s.program_id, s]))

  // Conversazioni: trova i gruppi del partecipante
  const { data: groupMembers } = await adminClient
    .from('group_members')
    .select('group_id, groups!group_id(id, name, level, program_id)')
    .eq('participant_id', user.id)

  const groupIds = (groupMembers || []).map(gm => gm.group_id)

  const { data: conversations } = groupIds.length > 0
    ? await adminClient
        .from('conversations')
        .select('*, groups!group_id(name, level, program_id), tutor:profiles!tutor_id(full_name, personal_room_link)')
        .in('group_id', groupIds)
        .in('status', ['scheduled', 'completed'])
        .order('scheduled_date')
        .order('start_time')
    : { data: [] }

  // Raggruppa conversazioni per program_id
  const convsByProgram = new Map<string, any[]>()
  for (const conv of (conversations || [])) {
    const pid = (conv.groups as any)?.program_id
    if (!pid) continue
    if (!convsByProgram.has(pid)) convsByProgram.set(pid, [])
    convsByProgram.get(pid)!.push(conv)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">I miei programmi</h1>

      {!enrollments || enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)] text-sm">
          Non sei ancora iscritto a nessun programma.
        </div>
      ) : (
        <div className="space-y-6">
          {enrollments.map((e) => {
            const program = e.training_programs as any
            const mySlot = mySlotsByProgram.get(e.program_id)
            const needsLevelCheck = program?.status === 'level_checks' && !e.level_check_completed
            const programConvs = convsByProgram.get(e.program_id) || []
            const upcoming = programConvs.filter(c => c.scheduled_date >= today && c.status === 'scheduled')
            const past = programConvs.filter(c => c.scheduled_date < today || c.status === 'completed')

            return (
              <div key={e.id} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">

                {/* Header programma */}
                <div className="p-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-base font-bold text-gray-900">{program?.name}</h2>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[program?.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[program?.status] || program?.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ff-muted)]">{(program?.companies as any)?.name}</p>
                    {e.assigned_level && (
                      <p className="text-sm mt-2">
                        Livello assegnato: <span className="font-bold text-[var(--ff-red)]">{e.assigned_level}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-2">
                    {needsLevelCheck && !mySlot && (
                      <Link
                        href={`/participant/programs/${e.program_id}/level-check`}
                        className="inline-block bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Prenota Level Check
                      </Link>
                    )}
                    {needsLevelCheck && mySlot?.status === 'booked' && (
                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 mb-1">
                          Level Check prenotato
                        </span>
                        <p className="text-xs text-gray-700 font-semibold">
                          {new Date(mySlot.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-[var(--ff-muted)]">
                          {mySlot.start_time.slice(0, 5)}–{mySlot.end_time.slice(0, 5)}
                        </p>
                        <Link href={`/participant/programs/${e.program_id}/level-check`}
                          className="text-xs text-[var(--ff-red)] hover:underline mt-1 inline-block">
                          Gestisci prenotazione
                        </Link>
                      </div>
                    )}
                    {e.level_check_completed && (
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        ✓ Level Check completato
                      </span>
                    )}
                  </div>
                </div>

                {/* Conversazioni */}
                {programConvs.length > 0 && (
                  <div className="border-t border-[var(--ff-border)]">

                    {/* Prossime */}
                    {upcoming.length > 0 && (
                      <div className="px-6 py-4">
                        <h3 className="text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide mb-3">
                          Prossime conversazioni
                        </h3>
                        <div className="space-y-2">
                          {upcoming.map((conv: any) => (
                            <div key={conv.id} className="flex items-center justify-between gap-4 bg-[var(--ff-paper)] rounded-lg px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                                  <span className="text-[var(--ff-muted)] font-normal ml-2">
                                    {conv.start_time.slice(0, 5)}–{conv.end_time.slice(0, 5)}
                                  </span>
                                </p>
                                <p className="text-xs text-[var(--ff-muted)] mt-0.5">
                                  Gruppo {conv.groups?.name} · {conv.tutor?.full_name}
                                </p>
                              </div>
                              {conv.tutor?.personal_room_link && (
                                <a
                                  href={conv.tutor.personal_room_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                >
                                  Entra →
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passate */}
                    {past.length > 0 && (
                      <details className="px-6 py-3 border-t border-[var(--ff-border)]">
                        <summary className="text-xs font-semibold text-[var(--ff-muted)] cursor-pointer select-none">
                          Conversazioni passate ({past.length})
                        </summary>
                        <div className="space-y-2 mt-3">
                          {past.map((conv: any) => (
                            <div key={conv.id} className="flex items-center justify-between gap-4 bg-[var(--ff-paper)] rounded-lg px-4 py-3 opacity-70">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                                  <span className="text-[var(--ff-muted)] font-normal ml-2">
                                    {conv.start_time.slice(0, 5)}–{conv.end_time.slice(0, 5)}
                                  </span>
                                </p>
                                <p className="text-xs text-[var(--ff-muted)] mt-0.5">
                                  Gruppo {conv.groups?.name} · {conv.tutor?.full_name}
                                </p>
                              </div>
                              <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                conv.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {conv.status === 'completed' ? 'Completata' : 'Annullata'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
