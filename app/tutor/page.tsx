import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TutorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Profilo tutor
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, email, personal_room_link')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Programmi a cui è assegnato
  const { data: programTutorRows } = await adminClient
    .from('program_tutors')
    .select('program_id, training_programs!program_id(id, name, status, companies!company_id(name))')
    .eq('tutor_id', user.id)

  const programs = (programTutorRows || []).map(r => r.training_programs as any).filter(Boolean)

  // Gruppi che segue (tutor_id = user.id)
  const { data: groups } = await adminClient
    .from('groups')
    .select('id, name, level, program_id')
    .eq('tutor_id', user.id)

  const groupIds = (groups || []).map(g => g.id)

  // Prossime conversazioni dei suoi gruppi
  const today = new Date().toISOString().split('T')[0]
  const { data: upcoming } = groupIds.length > 0
    ? await adminClient
        .from('conversations')
        .select('id, group_id, scheduled_date, start_time, end_time, meeting_link, status, groups!group_id(name, level)')
        .in('group_id', groupIds)
        .eq('status', 'scheduled')
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20)
    : { data: [] }

  // Conversazioni passate (completate)
  const { data: past } = groupIds.length > 0
    ? await adminClient
        .from('conversations')
        .select('id, group_id, scheduled_date, start_time, end_time, status, groups!group_id(name, level)')
        .in('group_id', groupIds)
        .in('status', ['completed', 'cancelled'])
        .order('scheduled_date', { ascending: false })
        .limit(10)
    : { data: [] }

  // Mappa programma per gruppo
  const programMap = new Map((programs || []).map((p: any) => [p.id, p]))

  const STATUS_COLORS: Record<string, string> = {
    setup: 'bg-gray-100 text-gray-600',
    level_checks: 'bg-blue-100 text-blue-700',
    groups_formation: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-purple-100 text-purple-700',
  }
  const STATUS_LABELS: Record<string, string> = {
    setup: 'In configurazione',
    level_checks: 'Level Check',
    groups_formation: 'Formazione gruppi',
    active: 'Attivo',
    completed: 'Completato',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ciao, {profile.full_name} 👋</h1>
        <p className="text-sm text-[var(--ff-muted)] mt-0.5">Benvenuto nella tua area tutor.</p>
      </div>

      {/* Stanza virtuale */}
      {profile.personal_room_link && (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">La tua stanza virtuale</p>
            <p className="text-xs text-[var(--ff-muted)] mt-0.5 truncate max-w-xs">{profile.personal_room_link}</p>
          </div>
          <a
            href={profile.personal_room_link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            Apri stanza →
          </a>
        </div>
      )}

      {/* Prossime conversazioni */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Prossime conversazioni</h2>
        {!upcoming || upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-8 text-center text-[var(--ff-muted)] text-sm">
            Nessuna conversazione programmata.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((conv: any) => {
              const group = Array.isArray(conv.groups) ? conv.groups[0] : conv.groups
              const prog = (groups || []).find(g => g.id === conv.group_id)
              const program = prog ? programMap.get(prog.program_id) : null
              return (
                <div key={conv.id} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}
                      <span className="text-[var(--ff-muted)] font-normal ml-2">
                        {conv.start_time.slice(0, 5)}–{conv.end_time.slice(0, 5)}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--ff-muted)] mt-0.5">
                      Gruppo {group?.name}
                      {program?.name && <span className="ml-1">· {program.name}</span>}
                    </p>
                  </div>
                  {conv.meeting_link && (
                    <a
                      href={conv.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      Entra →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Gruppi */}
      {(groups || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">I miei gruppi</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {(groups || []).map(group => {
              const program = programMap.get(group.program_id)
              return (
                <div key={group.id} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{group.name}</span>
                    {group.level && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-[var(--ff-red-50)] text-[var(--ff-red)]">
                        {group.level}
                      </span>
                    )}
                  </div>
                  {program && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[var(--ff-muted)]">{program.name}</p>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_COLORS[program.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[program.status] || program.status}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Conversazioni passate */}
      {(past || []).length > 0 && (
        <details className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm">
          <summary className="px-5 py-4 text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Conversazioni passate ({past?.length})
          </summary>
          <div className="border-t border-[var(--ff-border)] divide-y divide-[var(--ff-border)]">
            {(past || []).map((conv: any) => {
              const group = Array.isArray(conv.groups) ? conv.groups[0] : conv.groups
              return (
                <div key={conv.id} className="px-5 py-3 flex items-center justify-between gap-4 opacity-70">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}
                      <span className="text-[var(--ff-muted)] font-normal ml-2">
                        {conv.start_time.slice(0, 5)}–{conv.end_time.slice(0, 5)}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--ff-muted)]">Gruppo {group?.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conv.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {conv.status === 'completed' ? 'Completata' : 'Annullata'}
                  </span>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
