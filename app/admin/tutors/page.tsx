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
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Tutor</h1>
          <Link
            href="/admin/tutors/new"
            className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
          >
            + Nuovo Tutor
          </Link>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!tutors || tutors.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-12 text-center">
            <p className="text-[var(--ff-muted)] mb-4">Nessun tutor presente</p>
            <Link
              href="/admin/tutors/new"
              className="inline-block bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-6 py-2 rounded-lg text-sm font-semibold"
            >
              Crea il primo tutor
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-[var(--ff-border)] bg-[var(--ff-paper)]">
              <p className="text-xs text-[var(--ff-muted)]">
                Totale: <strong className="text-gray-700">{tutors.length}</strong> tutor
              </p>
            </div>
            <table className="min-w-full divide-y divide-[var(--ff-border)]">
              <thead className="bg-[var(--ff-paper)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Lingue</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Aula</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                {tutors.map((tutor) => (
                  <tr key={tutor.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{tutor.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{tutor.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tutor.languages && tutor.languages.length > 0
                          ? tutor.languages.map((lang: string) => (
                              <span key={lang} className="px-2 py-0.5 text-xs bg-[var(--ff-red-50)] text-[var(--ff-red)] rounded-full font-medium">
                                {lang}
                              </span>
                            ))
                          : <span className="text-sm text-[var(--ff-muted)]">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tutor.personal_room_link ? (
                        <a
                          href={tutor.personal_room_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--ff-red)] hover:underline font-medium"
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
