import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'
import QuadriforExport from '@/components/admin/QuadriforExport'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PresenzeRiepilogoPage({ params }: Props) {
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

  // Gruppi del programma
  const { data: groups } = await adminClient
    .from('groups')
    .select('id, name, level')
    .eq('program_id', programId)
    .order('name')

  const groupIds = (groups || []).map(g => g.id)

  // Conversazioni di tutti i gruppi (ordine cronologico)
  const { data: conversations } = groupIds.length > 0
    ? await adminClient
        .from('conversations')
        .select('id, group_id, scheduled_date, start_time, status')
        .in('group_id', groupIds)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true })
    : { data: [] }

  // Numero progressivo per gruppo
  const sessionNumbers: Record<string, number> = {}
  const groupCounters: Record<string, number> = {}
  for (const conv of (conversations || [])) {
    groupCounters[conv.group_id] = (groupCounters[conv.group_id] || 0) + 1
    sessionNumbers[conv.id] = groupCounters[conv.group_id]
  }

  // Membri di tutti i gruppi
  const { data: allMembers } = groupIds.length > 0
    ? await adminClient
        .from('group_members')
        .select('group_id, participant_id, profiles!participant_id(full_name, email)')
        .in('group_id', groupIds)
    : { data: [] }

  // Presenze
  const conversationIds = (conversations || []).map(c => c.id)
  const { data: allAttendances } = conversationIds.length > 0
    ? await adminClient
        .from('attendances')
        .select('conversation_id, participant_id, status, entry_time, exit_time')
        .in('conversation_id', conversationIds)
    : { data: [] }

  // attendanceMap[participantId][conversationId]
  const attendanceMap: Record<string, Record<string, {
    status: string
    entry_time: string | null
    exit_time: string | null
  }>> = {}
  for (const att of (allAttendances || [])) {
    if (!attendanceMap[att.participant_id]) attendanceMap[att.participant_id] = {}
    attendanceMap[att.participant_id][att.conversation_id] = {
      status: att.status,
      entry_time: (att as any).entry_time ?? null,
      exit_time: (att as any).exit_time ?? null,
    }
  }

  // Membri per gruppo
  const membersByGroup: Record<string, any[]> = {}
  for (const m of (allMembers || [])) {
    if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = []
    membersByGroup[m.group_id].push(m)
  }

  // Conversazioni per gruppo
  const convsByGroup: Record<string, any[]> = {}
  for (const c of (conversations || [])) {
    if (!convsByGroup[c.group_id]) convsByGroup[c.group_id] = []
    convsByGroup[c.group_id].push(c)
  }

  // Dati per QuadriforExport
  const convsForExport = (conversations || []).map(c => {
    const group = (groups || []).find(g => g.id === c.group_id)
    return {
      id: c.id,
      group_id: c.group_id,
      group_name: group?.name || '—',
      session_number: sessionNumbers[c.id],
      scheduled_date: c.scheduled_date,
    }
  })

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-[var(--ff-muted)]">
            <Link href="/admin/programs" className="hover:text-gray-600">Programmi</Link>
            <span>/</span>
            <Link href={`/admin/programs/${programId}`} className="hover:text-gray-600">{program.name}</Link>
            <span>/</span>
            <span className="text-gray-700 font-semibold">Presenze</span>
          </div>
          <div className="mt-1">
            <h1 className="text-xl font-bold text-gray-900">Riepilogo Presenze</h1>
            <p className="text-xs text-[var(--ff-muted)] mt-0.5">
              {program.name} · {(program.companies as any)?.name}
            </p>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Export Quadrifor */}
        <QuadriforExport programId={programId} conversations={convsForExport} />

        {/* Matrici presenze per gruppo */}
        {(groups || []).length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 text-center text-[var(--ff-muted)]">
            <p className="text-lg font-medium mb-1">Nessun gruppo</p>
            <p className="text-sm">Crea prima i gruppi e assegna i partecipanti.</p>
          </div>
        ) : (
          (groups || []).map(group => {
            const members = membersByGroup[group.id] || []
            const convs = convsByGroup[group.id] || []

            if (members.length === 0 && convs.length === 0) return null

            // Calcola totali presenze per partecipante
            const presenceCount = (participantId: string) =>
              convs.filter(c => attendanceMap[participantId]?.[c.id]?.status === 'present').length

            return (
              <div key={group.id} className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
                {/* Header gruppo */}
                <div className="px-6 py-3 bg-[var(--ff-paper)] border-b border-[var(--ff-border)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                    {group.level && (
                      <span className="ml-2 text-xs text-[var(--ff-muted)]">({group.level})</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--ff-muted)]">
                    {members.length} partecipanti · {convs.length} lezioni
                  </span>
                </div>

                {members.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-[var(--ff-muted)] italic">
                    Nessun partecipante nel gruppo.
                  </div>
                ) : convs.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-[var(--ff-muted)] italic">
                    Nessuna conversazione programmata.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--ff-paper)]">
                          {/* Colonna fissa partecipante */}
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--ff-muted)] whitespace-nowrap sticky left-0 bg-[var(--ff-paper)] z-10 min-w-[200px] border-r border-[var(--ff-border)]">
                            Partecipante
                          </th>
                          {/* Colonne lezioni */}
                          {convs.map(conv => (
                            <th
                              key={conv.id}
                              className="px-3 py-2 text-center text-xs font-semibold text-[var(--ff-muted)] whitespace-nowrap"
                            >
                              <div>Lez. {sessionNumbers[conv.id]}</div>
                              <div className="text-[10px] font-normal text-gray-400">
                                {new Date(conv.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </div>
                            </th>
                          ))}
                          {/* Colonna totale */}
                          <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--ff-muted)] whitespace-nowrap border-l border-[var(--ff-border)]">
                            Totale
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ff-border)]">
                        {members.map(m => {
                          const p = Array.isArray(m.profiles)
                            ? (m.profiles[0] as any)
                            : (m.profiles as any)
                          const attRow = attendanceMap[m.participant_id] || {}
                          const total = presenceCount(m.participant_id)

                          return (
                            <tr key={m.participant_id} className="hover:bg-[var(--ff-paper)] transition-colors">
                              {/* Partecipante */}
                              <td className="px-4 py-2 sticky left-0 bg-white border-r border-[var(--ff-border)] z-10">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                                  {p?.full_name || '—'}
                                </div>
                                <div className="text-xs text-[var(--ff-muted)] truncate max-w-[180px]">
                                  {p?.email}
                                </div>
                              </td>

                              {/* Celle presenze */}
                              {convs.map(conv => {
                                const att = attRow[conv.id]
                                if (!att) {
                                  return (
                                    <td key={conv.id} className="px-3 py-2 text-center">
                                      <span className="text-gray-300">—</span>
                                    </td>
                                  )
                                }
                                if (att.status === 'present') {
                                  const entry = att.entry_time?.slice(0, 5)
                                  const exit = att.exit_time?.slice(0, 5)
                                  return (
                                    <td key={conv.id} className="px-3 py-2 text-center">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-green-600 font-bold text-base leading-none">✓</span>
                                        {(entry || exit) && (
                                          <span className="text-[10px] text-gray-400 leading-tight whitespace-nowrap">
                                            {entry || '?'}–{exit || '?'}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  )
                                }
                                if (att.status === 'absent') {
                                  return (
                                    <td key={conv.id} className="px-3 py-2 text-center">
                                      <span className="text-red-400 font-bold text-base">✗</span>
                                    </td>
                                  )
                                }
                                if (att.status === 'justified') {
                                  return (
                                    <td key={conv.id} className="px-3 py-2 text-center">
                                      <span className="text-orange-400 font-bold text-base" title="Giustificato">G</span>
                                    </td>
                                  )
                                }
                                return (
                                  <td key={conv.id} className="px-3 py-2 text-center">
                                    <span className="text-gray-300">—</span>
                                  </td>
                                )
                              })}

                              {/* Totale */}
                              <td className="px-3 py-2 text-center border-l border-[var(--ff-border)]">
                                <span className={`text-xs font-bold ${
                                  total === 0
                                    ? 'text-gray-400'
                                    : total === convs.length
                                    ? 'text-green-600'
                                    : 'text-orange-500'
                                }`}>
                                  {total}/{convs.length}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
