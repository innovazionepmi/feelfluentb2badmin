import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const AVAILABLE_LANGUAGES = [
  'Inglese', 'Francese', 'Spagnolo', 'Tedesco', 'Portoghese',
  'Italiano', 'Cinese', 'Giapponese', 'Arabo', 'Russo',
]

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function NewTutorPage({ searchParams }: Props) {
  const { error, success } = await searchParams

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

    // Crea utente senza email automatica (stessa strategia dei partecipanti)
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name, role: 'tutor' },
    })

    if (authError || !newUser?.user) {
      const msg = authError?.message?.includes('already registered')
        ? 'Un utente con questa email esiste già'
        : (authError?.message || 'Errore durante la creazione')
      redirect(`/admin/tutors/new?error=${encodeURIComponent(msg)}`)
    }

    // Crea profilo
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name,
        role: 'tutor',
        personal_room_link: personal_room_link || null,
        languages: languages.length > 0 ? languages : [],
      })

    if (profileError) {
      // Rollback utente auth
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      redirect(`/admin/tutors/new?error=${encodeURIComponent('Errore creazione profilo: ' + profileError.message)}`)
    }

    // Invia email invito via Brevo SMTP (resetPasswordForEmail con client implicit)
    try {
      const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false } }
      )
      await client.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://b2badmin.feelfluent.com/auth/reset-password',
      })
    } catch (emailErr) {
      console.error('Errore invio email tutor:', emailErr)
      // Utente creato correttamente, l'email può essere reinviata manualmente
    }

    redirect('/admin/tutors?success=tutor_created')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/admin/tutors" className="text-[var(--ff-red)] hover:underline text-sm block mb-2">
            ← Torna ai tutor
          </Link>
          <h1 className="text-2xl font-bold">Nuovo Tutor</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠ {decodeURIComponent(error)}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            ✓ Tutor creato. L&apos;email di invito è stata inviata.
          </div>
        )}

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              placeholder="tutor@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Verrà inviata un&apos;email per impostare la password.
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
                    className="rounded border-gray-300 text-[var(--ff-red)] focus:ring-[var(--ff-red)]"
                  />
                  <span className="text-sm text-gray-700">{lang}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-[var(--ff-red)] text-white py-3 rounded-lg hover:bg-[var(--ff-red-700)] transition font-medium"
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
