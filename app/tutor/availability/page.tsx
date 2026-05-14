import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AvailabilityForm from '../../../components/admin/AvailabilityForm'
import DeleteAvailabilityButton from '../../../components/admin/DeleteAvailabilityButton'
import { recurrenceLabel } from '@/lib/utils/recurrence'

const TYPE_LABELS: Record<string, string> = {
  level_check: 'Level Check',
  group_session: 'Sessioni gruppo',
  both: 'Entrambi',
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export default async function TutorAvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tutor') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]

  const { data: availabilities } = await supabase
    .from('tutor_availability')
    .select('*')
    .eq('tutor_id', user.id)
    .gte('date', today)
    .order('date')
    .order('start_time')

  async function addAvailability(formData: FormData) {
    'use server'

    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const date = formData.get('date') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const availability_type = (formData.get('availability_type') as string) || 'both'
    const is_recurring = formData.get('is_recurring') === 'on'
    const recurrence_type = (formData.get('recurrence_type') as string)?.trim() || 'weekly'
    const recurrence_end_date = (formData.get('recurrence_end_date') as string)?.trim() || null

    if (!is_recurring) {
      await supabase.from('tutor_availability').insert({
        tutor_id: user.id,
        date,
        start_time,
        end_time,
        availability_type,
        is_recurring: false,
        is_booked: false,
      })
    } else {
      const [y, m, d] = date.split('-').map(Number)
      let current = new Date(y, m - 1, d)
      const dayKey = DAY_KEYS[current.getDay()]
      const recurrence_rule = `weekly_${dayKey}`

      let endDate: Date | null = null
      if (recurrence_end_date) {
        const [ey, em, ed] = recurrence_end_date.split('-').map(Number)
        endDate = new Date(ey, em - 1, ed)
      }

      const slots = []
      while (endDate && current <= endDate) {
        const yyyy = current.getFullYear()
        const mm = String(current.getMonth() + 1).padStart(2, '0')
        const dd = String(current.getDate()).padStart(2, '0')
        slots.push({
          tutor_id: user.id,
          date: `${yyyy}-${mm}-${dd}`,
          start_time,
          end_time,
          availability_type,
          is_recurring: true,
          recurrence_rule,
          recurrence_end_date,
          is_booked: false,
        })

        if (recurrence_type === 'monthly') {
          current = addMonths(current, 1)
        } else {
          current = addWeeks(current, 1)
        }
      }

      if (slots.length > 0) {
        await supabase.from('tutor_availability').insert(slots)
      }
    }

    revalidatePath('/tutor/availability')
  }

  async function deleteAvailability(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const availability_id = formData.get('availability_id') as string
    await supabase
      .from('tutor_availability')
      .delete()
      .eq('id', availability_id)
      .eq('tutor_id', user.id) // sicurezza: solo i propri slot
      .eq('is_booked', false)

    revalidatePath('/tutor/availability')
  }

  return (
    <div className="space-y-6">

      <div>
        <Link href="/tutor" className="text-xs text-[var(--ff-muted)] hover:text-gray-700">
          ← Torna alle conversazioni
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Le mie disponibilità</h1>
        <p className="text-sm text-[var(--ff-muted)] mt-0.5">Gestisci gli slot in cui sei disponibile per sessioni e level check</p>
      </div>

      <AvailabilityForm tutorId={user.id} addAvailability={addAvailability} />

      <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--ff-border)] flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-900">Disponibilità future</h2>
            <span className="text-xs text-[var(--ff-muted)]">{availabilities?.length || 0} slot</span>
          </div>

          {!availabilities || availabilities.length === 0 ? (
            <div className="p-8 text-center text-[var(--ff-muted)] text-sm">
              Nessuna disponibilità impostata. Aggiungi la tua prima disponibilità qui sopra.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--ff-border)]">
              <thead className="bg-[var(--ff-paper)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Orario</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Ricorrente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                {availabilities.map((slot) => (
                  <tr key={slot.id} className="hover:bg-[var(--ff-paper)]">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString('it-IT', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {TYPE_LABELS[slot.availability_type] || slot.availability_type}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        slot.is_booked
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {slot.is_booked ? 'Prenotato' : 'Libero'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {slot.is_recurring ? (
                        <span className="text-[var(--ff-red)]">
                          {recurrenceLabel(slot.recurrence_rule)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Singolo</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {!slot.is_booked && (
                        <DeleteAvailabilityButton
                          availabilityId={slot.id}
                          tutorId={user.id}
                          deleteAvailability={deleteAvailability}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </div>
  )
}
