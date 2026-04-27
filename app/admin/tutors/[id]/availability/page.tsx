import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import AdminNav from '../../../../../components/admin/AdminNav'
import AvailabilityForm from '../../../../../components/admin/AvailabilityForm'
import AvailabilityManager from '../../../../../components/admin/AvailabilityManager'

interface Props {
  params: Promise<{ id: string }>
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

export default async function TutorAvailabilityPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: tutor } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', id)
    .eq('role', 'tutor')
    .single()

  if (!tutor) redirect('/admin/tutors')

  // Recupera TUTTE le disponibilità ordinate per data
  const { data: availabilities, error: availError } = await adminClient
    .from('tutor_availability')
    .select('*')
    .eq('tutor_id', id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (availError) {
    console.error('[availability] query error:', availError)
  }

  // Separa future e passate in base alla data locale
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const futureSlots = (availabilities || []).filter(s => s.date >= todayStr)
  const pastSlots = (availabilities || []).filter(s => s.date < todayStr)

  async function addAvailability(formData: FormData) {
    'use server'

    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    const tutor_id = formData.get('tutor_id') as string
    const date = formData.get('date') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const availability_type = (formData.get('availability_type') as string) || 'both'
    const is_recurring = formData.get('is_recurring') === 'on'
    const recurrence_type = (formData.get('recurrence_type') as string)?.trim() || 'weekly' // 'weekly' | 'monthly'
    const recurrence_end_date = (formData.get('recurrence_end_date') as string)?.trim() || null

    const adminClient = createAdminClient()

    if (!is_recurring) {
      const { error } = await adminClient.from('tutor_availability').insert({
        tutor_id,
        date,
        start_time,
        end_time,
        availability_type,
        is_recurring: false,
        is_booked: false,
      })
      if (error) console.error('[addAvailability] insert error:', error)
    } else {
      // Calcola recurrence_rule dal giorno della settimana della data di inizio
      const [y, m, d] = date.split('-').map(Number)
      let current = new Date(y, m - 1, d)
      const dayKey = DAY_KEYS[current.getDay()] // es. 'monday'
      // Il constraint accetta: weekly_monday, weekly_tuesday, ecc.
      // Per monthly usiamo 'weekly_monday' ecc. come convenzione (il DB non ha un tipo monthly separato)
      // quindi usiamo sempre weekly_<day> come recurrence_rule e gestiamo il passo in JS
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
          tutor_id,
          date: `${yyyy}-${mm}-${dd}`,
          start_time,
          end_time,
          availability_type,
          is_recurring: true,
          recurrence_rule,        // es. 'weekly_monday'
          recurrence_end_date,
          is_booked: false,
        })

        // Avanza di 1 settimana o 1 mese in base al tipo scelto
        if (recurrence_type === 'monthly') {
          current = addMonths(current, 1)
        } else {
          current = addWeeks(current, 1)
        }
      }

      if (slots.length > 0) {
        const { error } = await adminClient.from('tutor_availability').insert(slots)
        if (error) console.error('[addAvailability] bulk insert error:', error)
      }
    }

    revalidatePath(`/admin/tutors/${tutor_id}/availability`)
  }

  async function deleteAvailability(formData: FormData) {
    'use server'
    const availability_id = formData.get('availability_id') as string
    const tutor_id = formData.get('tutor_id') as string
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('tutor_availability')
      .delete()
      .eq('id', availability_id)
      .eq('is_booked', false)
    if (error) console.error('[deleteAvailability] error:', error)
    revalidatePath(`/admin/tutors/${tutor_id}/availability`)
  }

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Disponibilità: {tutor.full_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{tutor.email}</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Form aggiunta */}
        <AvailabilityForm tutorId={id} addAvailability={addAvailability} />

        {/* Manager: lista + calendario */}
        <AvailabilityManager
          initialSlots={futureSlots}
          tutorId={id}
          deleteAvailability={deleteAvailability}
        />

        {/* Slot passati collassati */}
        {pastSlots.length > 0 && (
          <details className="bg-white rounded-lg shadow">
            <summary className="px-6 py-4 cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
              Mostra {pastSlots.length} slot passati
            </summary>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Orario</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastSlots.map(slot => (
                    <tr key={slot.id} className="text-gray-400">
                      <td className="px-5 py-2 text-sm">
                        {new Date(slot.date + 'T00:00:00').toLocaleDateString('it-IT', {
                          weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-5 py-2 text-sm font-mono">
                        {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          slot.is_booked ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {slot.is_booked ? 'Prenotato' : 'Scaduto'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </main>
    </div>
  )
}
