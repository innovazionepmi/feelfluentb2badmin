import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

interface Props {
  params: Promise<{ id: string }>
}

const LEVEL_LABELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default async function LevelChecksPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: program } = await adminClient
    .from('training_programs')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!program) redirect('/admin/programs')

  const { data: programTutorRows } = await adminClient
    .from('program_tutors')
    .select('tutor_id, profiles!tutor_id(id, full_name)')
    .eq('program_id', id)

  const programTutors = (programTutorRows || []).map(r => r.profiles as any)

  const { data: slots } = await adminClient
    .from('level_check_slots')
    .select('*, tutor:profiles!tutor_id(full_name), participant:profiles!participant_id(full_name, email)')
    .eq('program_id', id)
    .order('date')
    .order('start_time')

  async function createSlot(formData: FormData) {
    'use server'
    const tutor_id = formData.get('tutor_id') as string
    const date = formData.get('date') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const adminClient = createAdminClient()
    await adminClient.from('level_check_slots').insert({
      program_id: id,
      tutor_id,
      date,
      start_time,
      end_time,
      status: 'available',
    })
    revalidatePath(`/admin/programs/${id}/level-checks`)
  }

  async function deleteSlot(formData: FormData) {
    'use server'
    const slot_id = formData.get('slot_id') as string
    const adminClient = createAdminClient()
    await adminClient.from('level_check_slots').delete().eq('id', slot_id).eq('status', 'available')
    revalidatePath(`/admin/programs/${id}/level-checks`)
  }

  async function completeSlot(formData: FormData) {
    'use server'
    const slot_id = formData.get('slot_id') as string
    const participant_id = formData.get('participant_id') as string
    const assigned_level = formData.get('assigned_level') as string
    const adminClient = createAdminClient()

    const { data: slot } = await adminClient
      .from('level_check_slots')
      .select('tutor_id, date')
      .eq('id', slot_id)
      .single()

    if (!slot) return

    await adminClient
      .from('level_check_slots')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', slot_id)

    await adminClient
      .from('program_participants')
      .update({
        level_check_completed: true,
        assigned_level,
        level_check_date: slot.date,
        level_check_tutor_id: slot.tutor_id,
        updated_at: new Date().toISOString(),
      })
      .eq('program_id', id)
      .eq('participant_id', participant_id)

    revalidatePath(`/admin/programs/${id}/level-checks`)
    revalidatePath(`/admin/programs/${id}`)
  }

  const available = (slots || []).filter(s => s.status === 'available').length
  const booked = (slots || []).filter(s => s.status === 'booked').length
  const completed = (slots || []).filter(s => s.status === 'completed').length

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href={`/admin/programs/${id}`} className="text-xs text-[var(--ff-muted)] hover:text-gray-700 mb-1 block">
            ← {program.name}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Slot Level Check</h1>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{available}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Disponibili</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">{booked}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Prenotati</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{completed}</div>
            <div className="text-xs text-[var(--ff-muted)] mt-1">Completati</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Aggiungi slot</h2>
              {programTutors.length === 0 ? (
                <p className="text-sm text-[var(--ff-muted)]">
                  Nessun tutor assegnato al programma.{' '}
                  <Link href={`/admin/programs/${id}`} className="text-[var(--ff-red)] hover:underline">
                    Aggiungine uno prima.
                  </Link>
                </p>
              ) : (
                <form action={createSlot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tutor</label>
                    <select name="tutor_id" required
                      className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]">
                      <option value="">Seleziona tutor</option>
                      {programTutors.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
                    <input type="date" name="date" required
                      className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Inizio</label>
                      <input type="time" name="start_time" required
                        className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Fine</label>
                      <input type="time" name="end_time" required
                        className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]" />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2 rounded-lg transition text-sm font-semibold">
                    Aggiungi slot
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--ff-border)] bg-[var(--ff-paper)]">
                <h2 className="text-sm font-bold text-gray-900">Slot programmati</h2>
              </div>
              {!slots || slots.length === 0 ? (
                <div className="p-8 text-center text-[var(--ff-muted)] text-sm">
                  Nessuno slot creato. Aggiungine uno dalla form a sinistra.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-[var(--ff-border)]">
                  <thead className="bg-[var(--ff-paper)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase">Orario</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase">Tutor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase">Partecipante</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase">Stato</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ff-border)]">
                    {(slots as any[]).map((slot) => (
                      <tr key={slot.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(slot.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {slot.tutor?.full_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {slot.participant ? (
                            <div>
                              <div className="font-semibold text-gray-900">{slot.participant.full_name}</div>
                              <div className="text-xs text-[var(--ff-muted)]">{slot.participant.email}</div>
                            </div>
                          ) : <span className="text-[var(--ff-muted)]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {slot.status === 'available' && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Disponibile</span>
                          )}
                          {slot.status === 'booked' && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Prenotato</span>
                          )}
                          {slot.status === 'completed' && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Completato</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {slot.status === 'available' && (
                            <form action={deleteSlot} className="inline">
                              <input type="hidden" name="slot_id" value={slot.id} />
                              <button type="submit" className="text-xs text-red-500 hover:underline">Elimina</button>
                            </form>
                          )}
                          {slot.status === 'booked' && slot.participant_id && (
                            <form action={completeSlot} className="flex items-center gap-2">
                              <input type="hidden" name="slot_id" value={slot.id} />
                              <input type="hidden" name="participant_id" value={slot.participant_id} />
                              <select name="assigned_level" required
                                className="text-xs border border-[var(--ff-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)]">
                                <option value="">Livello</option>
                                {LEVEL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                              <button type="submit" className="text-xs text-green-600 font-semibold hover:underline">
                                Completa
                              </button>
                            </form>
                          )}
                          {slot.status === 'completed' && (
                            <span className="text-xs text-[var(--ff-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
