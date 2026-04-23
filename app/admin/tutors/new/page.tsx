import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const AVAILABLE_LANGUAGES = [
  'Inglese', 'Francese', 'Spagnolo', 'Tedesco', 'Portoghese',
  'Italiano', 'Cinese', 'Giapponese', 'Arabo', 'Russo',
]

export default async function NewTutorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  async function createTutor(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const full_name = formData.get('full_name') as string
    const personal_room_link = formData.get('personal_room_link') as string
    const languages = formData.getAll('languages') as string[]

    const adminClient = createAdminClient()

    // Crea utente in Supabase Auth e invia email di invito
    const { data: newUser, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name,
        role: 'tutor',
      }
    })

    if (error || !newUser?.user) {
      console.error('Errore creazione tutor:', error)
      // In produzione gestire con un redirect con messaggio di errore
      return
    }

    // Crea il profilo con tutti i dati
    await adminClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name,
        role: 'tutor',
        personal_room_link: personal_room_link || null,
        languages: languages.length > 0 ? languages : [],
      })

    redirect('/admin/tutors')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/tutors" className="text-blue-600 hover:underline text-sm block mb-2">
            Torna ai tutor
          </Link>
          <h1 className="text-2xl font-bold">Nuovo Tutor</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={createTutor} className="bg-white rounded-lg shadow p-6 space-y-5">

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mario Rossi"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tutor@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Verrà inviata un&apos;email di invito per impostare la password.
            </p>
          </div>

          <div>
            <label htmlFor="personal_room_link" className="block text-sm font-medium text-gray-700 mb-1">
              Link aula personale
            </label>
            <input
              type="url"
              id="personal_room_link"
              name="personal_room_link"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{lang}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Crea Tutor e invia invito
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
