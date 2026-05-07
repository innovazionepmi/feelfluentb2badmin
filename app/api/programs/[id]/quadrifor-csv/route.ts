import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorizzato', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return new NextResponse('Non autorizzato', { status: 403 })

  const conversationId = request.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) return new NextResponse('conversation_id richiesto', { status: 400 })

  const adminClient = createAdminClient()

  // Dettagli conversazione
  const { data: conv } = await adminClient
    .from('conversations')
    .select('id, group_id, scheduled_date, start_time, end_time, groups!group_id(id, name)')
    .eq('id', conversationId)
    .single()

  if (!conv) return new NextResponse('Conversazione non trovata', { status: 404 })

  const groupName: string =
    Array.isArray(conv.groups)
      ? (conv.groups[0] as any)?.name || 'Gruppo'
      : (conv.groups as any)?.name || 'Gruppo'

  // Numero di sessione = posizione cronologica nel gruppo
  const { data: allGroupConvs } = await adminClient
    .from('conversations')
    .select('id')
    .eq('group_id', conv.group_id)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })

  const sessionNumber =
    ((allGroupConvs || []).findIndex(c => c.id === conversationId) + 1) || 1

  // Membri del gruppo
  const { data: members } = await adminClient
    .from('group_members')
    .select('participant_id, profiles!participant_id(full_name, email)')
    .eq('group_id', conv.group_id)

  // Presenze per questa conversazione
  const { data: attendances } = await adminClient
    .from('attendances')
    .select('participant_id, status, entry_time, exit_time')
    .eq('conversation_id', conversationId)

  const attMap = new Map(
    (attendances || []).map(a => [a.participant_id, a])
  )

  // Formattazione data: DD.MM.YYYY
  const [y, mo, d] = conv.scheduled_date.split('-')
  const dateFormatted = `${d}.${mo}.${y}`

  const N = sessionNumber
  const headers = [
    'Email',
    'Nome',
    'Cognome',
    'Gruppo',
    `Data lezione ${N}`,
    `Ora ingresso lezione ${N}`,
    `Ora uscita lezione ${N}`,
  ]

  const rows = (members || []).map(m => {
    const p = Array.isArray(m.profiles) ? (m.profiles[0] as any) : (m.profiles as any)
    const fullName: string = p?.full_name || ''
    const spaceIdx = fullName.indexOf(' ')
    const nome = spaceIdx >= 0 ? fullName.slice(0, spaceIdx) : fullName
    const cognome = spaceIdx >= 0 ? fullName.slice(spaceIdx + 1) : ''
    const email: string = p?.email || ''

    const att = attMap.get(m.participant_id)
    const isPresent = att?.status === 'present'
    const entryTime: string = isPresent ? ((att?.entry_time as string | undefined)?.slice(0, 5) ?? '') : ''
    const exitTime: string = isPresent ? ((att?.exit_time as string | undefined)?.slice(0, 5) ?? '') : ''

    return [
      email,
      nome,
      cognome,
      groupName,
      isPresent ? dateFormatted : '',
      entryTime,
      exitTime,
    ]
  })

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const csvLines = [
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ]
  const csvContent = '﻿' + csvLines.join('\r\n') // BOM per Excel

  const filename = `presenze_${groupName.replace(/\s+/g, '_')}_lezione${N}.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
