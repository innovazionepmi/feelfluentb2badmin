import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { sendLevelCheckBooked, sendLevelCheckCancelled } from '@/lib/email'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ParticipantLevelCheckPage({ params }: Props) {
  const { id: programId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const { data: participantProfile } = await adminClient
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Verifica iscrizione al programma
  const { data: enrollment } = await adminClient
    .from('program_participants')
    .select('id, level_check_completed, assigned_level')
    .eq('program_id', programId)
    .eq('participant_id', user.id)
    .single()

  if (!enrollment) redirect('/participant/programs')

  const { data: program } = await adminClient
    .from('training_programs')
    .select('id, name, status')
    .eq('id', programId)
    .single()

  if (!program || program.status !== 'level_checks') redirect('/participant/programs')

  // Slot già prenotato da questo partecipante
  const { data: mySlot } = await adminClient
    .from('level_check_slots')
    .select('*, tutor:profiles!tutor_id(full_name, personal_room_link)')
    .eq('program_id', programId)
    .eq('participant_id', user.id)
    .in('status', ['booked', 'completed'])
    .maybeSingle()

  // Slot disponibili (solo futuri)
  const today = new Date().toISOString().split('T')[0]
  const { data: availableSlots } = !mySlot
    ? await adminClient
        .from('level_check_slots')
        .select('*, tutor:profiles!tutor_id(full_name)')
        .eq('program_id', programId)
        .eq('status', 'available')
        .gte('date', today)
        .order('date')
        .order('start_time')
    : { data: [] }

  async function bookSlot(formData: FormData) {
    'use server'
    const slot_id = formData.get('slot_id') as string

    const adminClient = createAdminClient()

    // Controlla che non abbia già una prenotazione
    const { data: existing } = await adminClient
      .from('level_check_slots')
      .select('id')
      .eq('program_id', programId)
      .eq('participant_id', user!.id)
      .in('status', ['booked', 'completed'])
      .maybeSingle()

    if (existing) return

    const { data: bookedSlot } = await adminClient
      .from('level_check_slots')
      .select('*, tutor:profiles!tutor_id(full_name, personal_room_link)')
      .eq('id', slot_id)
      .single()

    await adminClient
      .from('level_check_slots')
      .update({
        participant_id: user!.id,
        status: 'booked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', slot_id)
      .eq('status', 'available')

    if (bookedSlot && participantProfile?.email) {
      const t = (bookedSlot as any).tutor
      await sendLevelCheckBooked({
        participantEmail: participantProfile.email,
        participantName: participantProfile.full_name,
        programName: program!.name,
        date: bookedSlot.date,
        startTime: bookedSlot.start_time,
        endTime: bookedSlot.end_time,
        tutorName: t?.full_name || '',
        roomLink: t?.personal_room_link,
      }).catch(console.error)
    }

    revalidatePath(`/participant/programs/${programId}/level-check`)
    revalidatePath('/participant/programs')
  }

  async function cancelBooking(formData: FormData) {
    'use server'
    const slot_id = formData.get('slot_id') as string
    const adminClient = createAdminClient()

    const { data: slot } = await adminClient
      .from('level_check_slots')
      .select('*, tutor:profiles!tutor_id(full_name)')
      .eq('id', slot_id)
      .single()

    await adminClient
      .from('level_check_slots')
      .update({
        participant_id: null,
        status: 'available',
        updated_at: new Date().toISOString(),
      })
      .eq('id', slot_id)
      .eq('participant_id', user!.id)
      .eq('status', 'booked')

    if (slot && participantProfile?.email) {
      const t = (slot as any).tutor
      await sendLevelCheckCancelled({
        participantEmail: participantProfile.email,
        participantName: participantProfile.full_name,
        programName: program!.name,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        tutorName: t?.full_name || '',
      }).catch(console.error)
    }

    revalidatePath(`/participant/programs/${programId}/level-check`)
    revalidatePath('/participant/programs')
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/participant/programs" className="text-xs text-[var(--ff-muted)] hover:text-gray-700">
          ← I miei programmi
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Level Check — {program.name}</h1>
        <p className="text-sm text-[var(--ff-muted)] mt-1">
          Prenota il tuo slot per il Level Check iniziale. Il tutor valuterà il tuo livello di inglese.
        </p>
      </div>

      {enrollment.level_check_completed ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">✓</div>
          <p className="font-semibold text-green-800">Level Check completato</p>
          {enrollment.assigned_level && (
            <p className="text-sm text-green-700 mt-1">
              Livello assegnato: <span className="font-bold">{enrollment.assigned_level}</span>
            </p>
          )}
        </div>
      ) : mySlot ? (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Prenotato</span>
            <span className="text-sm text-gray-700 font-semibold">Il tuo slot è confermato</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-[var(--ff-muted)] mb-0.5">Data</p>
              <p className="font-semibold text-gray-900">
                {new Date(mySlot.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--ff-muted)] mb-0.5">Orario</p>
              <p className="font-semibold text-gray-900">
                {(mySlot as any).start_time.slice(0, 5)} – {(mySlot as any).end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--ff-muted)] mb-0.5">Tutor</p>
              <p className="font-semibold text-gray-900">{(mySlot as any).tutor?.full_name || '—'}</p>
            </div>
          </div>
          {(mySlot as any).tutor?.personal_room_link && (
            <a
              href={(mySlot as any).tutor.personal_room_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
            >
              Entra nella stanza virtuale →
            </a>
          )}
          {mySlot.status === 'booked' && (
            <form action={cancelBooking}>
              <input type="hidden" name="slot_id" value={mySlot.id} />
              <button type="submit" className="text-sm text-red-500 hover:underline">
                Annulla prenotazione
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--ff-border)] bg-[var(--ff-paper)]">
            <h2 className="text-sm font-bold text-gray-900">Slot disponibili</h2>
          </div>
          {!availableSlots || availableSlots.length === 0 ? (
            <div className="p-8 text-center text-[var(--ff-muted)] text-sm">
              Nessuno slot disponibile al momento. Ricontrolla più tardi.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--ff-border)]">
              {(availableSlots as any[]).map((slot) => (
                <li key={slot.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[var(--ff-paper)] transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-[var(--ff-muted)]">
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} · Tutor: {slot.tutor?.full_name || '—'}
                    </p>
                  </div>
                  <form action={bookSlot}>
                    <input type="hidden" name="slot_id" value={slot.id} />
                    <button type="submit"
                      className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap">
                      Prenota
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
