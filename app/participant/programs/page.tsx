import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Per ogni programma in level_checks: controlla se ha già uno slot prenotato
  const programIds = (enrollments || [])
    .filter(e => (e.training_programs as any)?.status === 'level_checks')
    .map(e => e.program_id)

  const { data: mySlots } = programIds.length > 0
    ? await adminClient
        .from('level_check_slots')
        .select('program_id, status, date, start_time, end_time')
        .eq('participant_id', user.id)
        .in('program_id', programIds)
    : { data: [] }

  const mySlotsByProgram = new Map((mySlots || []).map(s => [s.program_id, s]))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">I miei programmi</h1>

      {!enrollments || enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)] text-sm">
          Non sei ancora iscritto a nessun programma.
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((e) => {
            const program = e.training_programs as any
            const mySlot = mySlotsByProgram.get(e.program_id)
            const needsLevelCheck = program?.status === 'level_checks' && !e.level_check_completed

            return (
              <div key={e.id} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold text-gray-900">{program?.name}</h2>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[program?.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[program?.status] || program?.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ff-muted)]">{(program?.companies as any)?.name}</p>
                    {e.assigned_level && (
                      <p className="text-sm mt-2">
                        Livello assegnato:{' '}
                        <span className="font-bold text-[var(--ff-red)]">{e.assigned_level}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {needsLevelCheck && !mySlot && (
                      <Link
                        href={`/participant/programs/${e.program_id}/level-check`}
                        className="inline-block bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Prenota Level Check
                      </Link>
                    )}
                    {needsLevelCheck && mySlot && mySlot.status === 'booked' && (
                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 mb-1">
                          Prenotato
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
