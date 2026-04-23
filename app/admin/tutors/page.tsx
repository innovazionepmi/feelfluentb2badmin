import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import TutorActions from '../../../components/admin/TutorActions'
import AdminNav from '../../../components/admin/AdminNav'

export default async function TutorsPage() {
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

  const { data: tutors } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'tutor')
    .order('full_name')

  async function deleteTutor(formData: FormData) {
    'use server'
    const userId = formData.get('user_id') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.deleteUser(userId)
    revalidatePath('/admin/tutors')
  }

  async function sendInvite(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.inviteUserByEmail(email)
    revalidatePath('/admin/tutors')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm block mb-2">
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Gestione Tutor</h1>
          </div>
          <Link
            href="/admin/tutors/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Nuovo Tutor
          </Link>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!tutors || tutors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Nessun tutor presente</p>
            <Link
              href="/admin/tutors/new"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Crea il primo tutor
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <p className="text-sm text-gray-600">
                Totale tutor: <strong>{tutors.length}</strong>
              </p>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lingue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tutors.map((tutor) => (
                  <tr key={tutor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tutor.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{tutor.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tutor.languages && tutor.languages.length > 0
                          ? tutor.languages.map((lang: string) => (
                              <span key={lang} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {lang}
                              </span>
                            ))
                          : <span className="text-sm text-gray-400">-</span>
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tutor.personal_room_link ? (
                        <a
                          href={tutor.personal_room_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Link aula
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">Non impostato</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <TutorActions
                        tutorId={tutor.id}
                        tutorEmail={tutor.email}
                        tutorName={tutor.full_name}
                        sendInvite={sendInvite}
                        deleteTutor={deleteTutor}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
