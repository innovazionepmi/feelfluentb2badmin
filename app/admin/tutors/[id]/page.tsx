import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

const AVAILABLE_LANGUAGES = [
  'Inglese', 'Francese', 'Spagnolo', 'Tedesco', 'Portoghese',
  'Italiano', 'Cinese', 'Giapponese', 'Arabo', 'Russo',
]

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTutorPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: tutor } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'tutor')
    .single()

  if (!tutor) redirect('/admin/tutors')

  async function updateTutor(formData: FormData) {
    'use server'

    const full_name = formData.get('full_name') as string
    const personal_room_link = formData.get('personal_room_link') as string
    const languages = formData.getAll('languages') as string[]

    const adminClient = createAdminClient()

    await adminClient
      .from('profiles')
      .update({
        full_name,
        personal_room_link: personal_room_link || null,
        languages: languages.length > 0 ? languages : [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    revalidatePath('/admin/tutors')
    redirect('/admin/tutors')
  }

  const currentLanguages: string[] = tutor.languages || []

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/tutors" className="text-[var(--ff-red)] hover:underline text-sm block mb-2">
            Torna ai tutor
          </Link>
          <h1 className="text-2xl font-bold">Modifica Tutor</h1>
          <p className="text-sm text-gray-500 mt-1">{tutor.email}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={updateTutor} className="bg-white rounded-lg shadow p-6 space-y-5">

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              defaultValue={tutor.full_name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={tutor.email}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">L&apos;email non è modificabile.</p>
          </div>

          <div>
            <label htmlFor="personal_room_link" className="block text-sm font-medium text-gray-700 mb-1">
              Link aula personale
            </label>
            <input
              type="url"
              id="personal_room_link"
              name="personal_room_link"
              defaultValue={tutor.personal_room_link || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lingue insegnate
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <label key={lang} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="languages"
                    value={lang}
                    defaultChecked={currentLanguages.includes(lang)}
                    className="rounded border-gray-300 text-[var(--ff-red)] focus:ring-[var(--ff-red)]"
                  />
                  <span className="text-sm text-gray-700">{lang}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <Link
              href={`/admin/tutors/${id}/availability`}
              className="inline-flex items-center gap-2 text-purple-600 hover:underline text-sm font-medium"
            >
              Gestisci disponibilità di questo tutor →
            </Link>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white py-2.5 rounded-lg transition font-semibold text-sm"
            >
              Salva modifiche
            </button>
            <Link
              href="/admin/tutors"
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition text-center font-medium"
            >
              Annulla
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
