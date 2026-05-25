import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ program_id?: string; view?: string }>
}

export default async function TutorDashboardPage({ searchParams }: Props) {
  const { program_id: filterProgram, view = 'upcoming' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, personal_room_link')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Programmi a cui il tutor è assegnato
  const { data: programTutorRows } = await adminClient
    .from('program_tutors')
    .select('program_id, training_programs!program_id(id, name, status, companies!company_id(name))')
    .eq('tutor_id', user.id)

  const programs = (programTutorRows || [])
    .map(r => r.training_programs as any)
    .filter(Boolean)

  const programIds = programs.map((p: any) => p.id)

  if (programIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ciao, {profile.full_name} 👋</h1>
        </div>
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)] text-sm">
          Non sei ancora assegnato a nessun programma.
        </div>
      </div>
    )
  }

  // Tutti i gruppi dei programmi a cui appartiene
  const { data: allGroups } = await adminClient
    .from('groups')
    .select('id, name, level, tutor_id, program_id, profiles!tutor_id(full_name)')
    .in('program_id', programIds)

  const groupIds = (allGroups || []).map(g => g.id)

  // Filtro per programma
  const filteredGroupIds = filterProgram
    ? (allGroups || []).filter(g => g.program_id === filterProgram).map(g => g.id)
    : groupIds

  // Conversazioni
  const today = new Date().toISOString().split('T')[0]

  const { data: conversations } = filteredGroupIds.length > 0
    ? await adminClient
        .from('conversations')
        .select('id, group_id, tutor_id, scheduled_date, start_time, end_time, meeting_link, status, notes')
        .in('group_id', filteredGroupIds)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true })
    : { data: [] }

  const allConvs = conversations || []

  // Filtra per view
  const filtered = allConvs.filter(c => {
    if (view === 'upcoming') return c.scheduled_date >= today && c.status === 'scheduled'
    if (view === 'past') return c.scheduled_date < today || c.status === 'completed'
    return true // 'all'
  })

  // Mappa gruppi e programmi
  const groupMap = new Map((allGroups || []).map(g => [g.id, g]))
  const programMap = new Map(programs.map((p: any) => [p.id, p]))

  // Numero sessione per gruppo
  const sessionNumbers: Record<string, number> = {}
  const groupCounters: Record<string, number> = {}
  for (const c of allConvs) {
    groupCounters[c.group_id] = (groupCounters[c.group_id] || 0) + 1
    sessionNumbers[c.id] = groupCounters[c.group_id]
  }

  const LEVEL_COLORS: Record<string, string> = {
    Basic1: 'bg-blue-100 text-blue-700',
    Basic2: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ciao, {profile.full_name} 👋</h1>
          <p className="text-sm text-[var(--ff-muted)] mt-0.5">
            {programs.length} {programs.length === 1 ? 'programma' : 'programmi'} assegnati
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/tutor/availability"
            className="bg-white border border-[var(--ff-border)] hover:bg-[var(--ff-paper)] text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            📅 Disponibilità
          </Link>
          {profile.personal_room_link && (
            <a
              href={profile.personal_room_link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              🎥 Stanza virtuale
            </a>
          )}
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* Filtro programma */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-[var(--ff-border)] shadow-sm px-1 py-1">
          <Link
            href={`/tutor?view=${view}`}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${!filterProgram ? 'bg-[var(--ff-red)] text-white' : 'text-gray-600 hover:bg-[var(--ff-paper)]'}`}
          >
            Tutti
          </Link>
          {programs.map((p: any) => (
            <Link
              key={p.id}
              href={`/tutor?view=${view}&program_id=${p.id}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${filterProgram === p.id ? 'bg-[var(--ff-red)] text-white' : 'text-gray-600 hover:bg-[var(--ff-paper)]'}`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        {/* Filtro periodo */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-[var(--ff-border)] shadow-sm px-1 py-1">
          {[
            { key: 'upcoming', label: 'Prossime' },
            { key: 'past', label: 'Passate' },
            { key: 'all', label: 'Tutte' },
          ].map(opt => (
            <Link
              key={opt.key}
              href={`/tutor?view=${opt.key}${filterProgram ? `&program_id=${filterProgram}` : ''}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${view === opt.key ? 'bg-[var(--ff-red)] text-white' : 'text-gray-600 hover:bg-[var(--ff-paper)]'}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <span className="text-xs text-[var(--ff-muted)]">{filtered.length} conversazioni</span>
      </div>

      {/* Lista conversazioni */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)] text-sm">
          Nessuna conversazione per i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(conv => {
            const group = groupMap.get(conv.group_id) as any
            const program = group ? programMap.get(group.program_id) as any : null
            const isMyConv = conv.tutor_id === user.id || group?.tutor_id === user.id
            const groupTutor = Array.isArray(group?.profiles) ? group.profiles[0] : group?.profiles
            const sessionN = sessionNumbers[conv.id]

            return (
              <div
                key={conv.id}
                className={`bg-white rounded-xl border shadow-sm px-5 py-4 flex items-center gap-4 flex-wrap ${
                  isMyConv ? 'border-[var(--ff-red-100)]' : 'border-[var(--ff-border)]'
                }`}
              >
                {/* Info principale */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <span className="text-sm text-[var(--ff-muted)]">
                      {conv.start_time.slice(0, 5)}–{conv.end_time.slice(0, 5)}
                    </span>
                    {conv.status === 'completed' && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Completata</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--ff-muted)]">
                    {group?.level && (
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${LEVEL_COLORS[group.level] || 'bg-gray-100 text-gray-700'}`}>
                        {group.level}
                      </span>
                    )}
                    <span>{group?.name}</span>
                    <span>·</span>
                    <span>Lez. {sessionN}</span>
                    {program && <><span>·</span><span>{program.name}</span></>}
                    {!isMyConv && groupTutor?.full_name && (
                      <><span>·</span><span className="text-gray-500">Tutor: {groupTutor.full_name}</span></>
                    )}
                    {isMyConv && (
                      <span className="px-2 py-0.5 font-semibold rounded-full bg-[var(--ff-red-50)] text-[var(--ff-red)]">
                        Tua
                      </span>
                    )}
                  </div>
                  {conv.notes && (
                    <p className="text-xs text-[var(--ff-muted)] italic mt-1">{conv.notes}</p>
                  )}
                </div>

                {/* Azioni */}
                <div className="flex items-center gap-2 shrink-0">
                  {conv.meeting_link && (
                    <a
                      href={conv.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--ff-border)] text-gray-700 hover:bg-[var(--ff-paper)] transition"
                    >
                      🔗 Link
                    </a>
                  )}
                  {isMyConv && (
                    <Link
                      href={`/tutor/presenze/${conv.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--ff-red-100)] bg-[var(--ff-red-50)] text-[var(--ff-red)] hover:bg-red-100 transition font-semibold"
                    >
                      Presenze
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
