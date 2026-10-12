import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const one = <T,>(v: T | T[] | null | undefined): T | undefined =>
  Array.isArray(v) ? v[0] : (v ?? undefined)

const hhmm = (t: string) => t.slice(0, 5)

function splitName(fullName: string) {
  const name = (fullName || '').trim()
  const i = name.indexOf(' ')
  return i >= 0
    ? { first: name.slice(0, i), last: name.slice(i + 1).trim() }
    : { first: name, last: '' }
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true }
  row.alignment = { horizontal: 'center' }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorizzato', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return new NextResponse('Non autorizzato', { status: 403 })

  const adminClient = createAdminClient()

  const { data: program } = await adminClient
    .from('training_programs')
    .select('id, name, companies(name)')
    .eq('id', programId)
    .single()
  if (!program) return new NextResponse('Programma non trovato', { status: 404 })

  const [enrollRes, groupsRes, convsRes, programTutorsRes] = await Promise.all([
    adminClient
      .from('program_participants')
      .select('participant_id, assigned_level, profiles!participant_id(full_name, email)')
      .eq('program_id', programId),
    adminClient
      .from('groups')
      .select('id, name, level, tutor_id, profiles!tutor_id(full_name, personal_room_link)')
      .eq('program_id', programId),
    adminClient
      .from('conversations')
      .select('group_id, scheduled_date, start_time, end_time, status')
      .eq('program_id', programId)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true }),
    adminClient
      .from('program_tutors')
      .select('profiles!tutor_id(full_name, personal_room_link)')
      .eq('program_id', programId),
  ])

  const enrollments: any[] = enrollRes.data || []
  const groups: any[] = (groupsRes.data || []).slice().sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'en', { numeric: true })
  )
  const convs: any[] = convsRes.data || []

  const groupIds = groups.map(g => g.id)
  const { data: membersData } = groupIds.length
    ? await adminClient
        .from('group_members')
        .select('group_id, participant_id')
        .in('group_id', groupIds)
    : { data: [] as { group_id: string; participant_id: string }[] }
  const groupByParticipant = new Map<string, string>()
  for (const m of membersData || []) groupByParticipant.set(m.participant_id, m.group_id)

  // Giorno/orario di ogni gruppo: combinazione più frequente tra le sue conversazioni
  const scheduleByGroup = new Map<string, { day: string; time: string }>()
  for (const g of groups) {
    const counts = new Map<string, { day: string; time: string; n: number }>()
    for (const c of convs.filter(c => c.group_id === g.id)) {
      const [y, mo, d] = String(c.scheduled_date).split('-').map(Number)
      const day = WEEKDAYS[new Date(y, mo - 1, d).getDay()]
      const time = `${hhmm(c.start_time)}-${hhmm(c.end_time)}`
      const key = `${day}|${time}`
      const cur = counts.get(key)
      if (cur) cur.n++
      else counts.set(key, { day, time, n: 1 })
    }
    const best = Array.from(counts.values()).sort((a, b) => b.n - a.n)[0]
    if (best) scheduleByGroup.set(g.id, { day: best.day, time: best.time })
  }

  const groupById = new Map(groups.map(g => [g.id, g]))
  const tutorName = (g: any) => one<any>(g.profiles)?.full_name?.trim() || ''

  // Tutor del programma (da gruppi e da assegnazione al programma)
  const tutorLinks = new Map<string, string>()
  for (const g of groups) {
    const p = one<any>(g.profiles)
    if (p?.full_name) tutorLinks.set(p.full_name.trim(), (p.personal_room_link || '').trim())
  }
  for (const r of programTutorsRes.data || []) {
    const p = one<any>((r as any).profiles)
    if (p?.full_name && !tutorLinks.has(p.full_name.trim())) {
      tutorLinks.set(p.full_name.trim(), (p.personal_room_link || '').trim())
    }
  }

  const wb = new ExcelJS.Workbook()

  // --- Participants-groups ---
  const wsP = wb.addWorksheet('Participants-groups')
  wsP.columns = [
    { header: 'Email', key: 'email', width: 40 },
    { header: 'First Name', key: 'first', width: 23 },
    { header: 'Last Name', key: 'last', width: 16 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Group', key: 'group', width: 12 },
    { header: 'DAY Assigned', key: 'day', width: 16 },
    { header: 'Time assigned', key: 'time', width: 16 },
    { header: 'Tutor', key: 'tutor', width: 16 },
    { header: 'Link', key: 'link', width: 40 },
  ]
  styleHeader(wsP)

  const participants = enrollments
    .map(e => {
      const p = one<any>(e.profiles)
      const { first, last } = splitName(p?.full_name || '')
      const g = groupById.get(groupByParticipant.get(e.participant_id) || '')
      return { e, email: p?.email || '', first, last, g }
    })
    .sort((a, b) => a.last.localeCompare(b.last, 'it') || a.first.localeCompare(b.first, 'it'))

  participants.forEach(({ e, email, first, last, g }, i) => {
    const sched = g ? scheduleByGroup.get(g.id) : undefined
    const tutor = g ? tutorName(g) : ''
    const rowNum = i + 2
    wsP.addRow({
      email,
      first,
      last,
      level: e.assigned_level || '',
      group: g?.name || '',
      day: sched?.day || '',
      time: sched?.time || '',
      tutor,
    })
    wsP.getCell(`I${rowNum}`).value = {
      formula: `IFERROR(VLOOKUP(H${rowNum},TutorList!A:B,2,FALSE),"")`,
      result: tutor ? tutorLinks.get(tutor) || '' : '',
    }
  })

  // --- General Calendar ---
  const wsC = wb.addWorksheet('General Calendar')
  wsC.columns = [
    { header: 'Group', key: 'group', width: 12 },
    { header: 'Date', key: 'date', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Time', key: 'time', width: 20 },
  ]
  styleHeader(wsC)
  for (const g of groups) {
    for (const c of convs.filter(c => c.group_id === g.id)) {
      const [y, mo, d] = String(c.scheduled_date).split('-').map(Number)
      wsC.addRow({
        group: g.name,
        date: new Date(Date.UTC(y, mo - 1, d)),
        time: `${hhmm(c.start_time)}-${hhmm(c.end_time)}`,
      })
    }
  }

  // --- Group-Schedule ---
  const wsS = wb.addWorksheet('Group-Schedule')
  wsS.columns = [
    { header: 'Group', key: 'group', width: 12 },
    { header: 'Day', key: 'day', width: 10 },
    { header: 'Time', key: 'time', width: 14 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Tutor', key: 'tutor', width: 16 },
  ]
  styleHeader(wsS)
  for (const g of groups) {
    const sched = scheduleByGroup.get(g.id)
    wsS.addRow({
      group: g.name,
      day: sched?.day || '',
      time: sched?.time || '',
      level: g.level,
      tutor: tutorName(g),
    })
  }

  // --- TutorList ---
  const wsT = wb.addWorksheet('TutorList')
  wsT.columns = [{ width: 16 }, { width: 42 }]
  for (const [name, link] of tutorLinks) wsT.addRow([name, link])

  // --- Group-Tutor ---
  const wsGT = wb.addWorksheet('Group-Tutor')
  wsGT.columns = [
    { header: 'Gruppo', key: 'group', width: 12 },
    { header: 'Tutor', key: 'tutor', width: 17 },
  ]
  styleHeader(wsGT)
  for (const g of groups) wsGT.addRow({ group: g.name, tutor: tutorName(g) })
  wsGT.autoFilter = 'A1:B1'

  // --- Levels ---
  const wsL = wb.addWorksheet('Levels')
  wsL.columns = [{ width: 12 }]
  for (const l of ['Basic1', 'Basic2', 'Medium', 'High']) wsL.addRow([l])

  const buffer = await wb.xlsx.writeBuffer()

  const safe = (s: string) => s.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '')
  const companyName = one<any>(program.companies)?.name || ''
  const filename = `Piano_${safe(companyName) || 'Feel_Fluent'}_${safe(program.name) || 'programma'}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
