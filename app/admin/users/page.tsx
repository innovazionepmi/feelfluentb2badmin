import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import UserConfirmButton from '../../../components/admin/UserConfirmButton'
import AdminNav from '../../../components/admin/AdminNav'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  tutor: 'Tutor',
  participant: 'Partecipante',
  hr_referent: 'Referente HR',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  tutor: 'bg-purple-100 text-purple-800',
  participant: 'bg-blue-100 text-blue-800',
  hr_referent: 'bg-yellow-100 text-yellow-800',
}

export default async function UsersManagementPage() {
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

  // Recupera tutti gli utenti da Auth (include quelli non confermati)
  const { data: authUsers } = await adminClient.auth.admin.listUsers()

  // Recupera tutti i profili
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('*')
    .order('full_name')

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // Combina: mostra tutti gli utenti con stato conferma email
  const allUsers = (authUsers?.users || []).map(authUser => ({
    ...authUser,
    profile: profilesMap.get(authUser.id),
  }))

  // Separa confermati e non confermati
  const unconfirmed = allUsers.filter(u => !u.email_confirmed_at)
  const confirmed = allUsers.filter(u => u.email_confirmed_at)

  async function confirmUser(formData: FormData) {
    'use server'
    const userId = formData.get('user_id') as string
    const adminClient = createAdminClient()

    // Conferma manualmente l'email dell'utente
    await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    revalidatePath('/admin/users')
  }

  async function resendInvite(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.inviteUserByEmail(email)
    revalidatePath('/admin/users')
  }

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Abilita Utenti</h1>
          <p className="text-xs text-[var(--ff-muted)] mt-0.5">Abilita manualmente gli utenti che non hanno confermato l&apos;email</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Sezione: utenti da confermare */}
        {unconfirmed.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--ff-border)] bg-orange-50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
              <h2 className="text-sm font-bold text-orange-900">
                In attesa di conferma ({unconfirmed.length})
              </h2>
            </div>
            <table className="min-w-full divide-y divide-[var(--ff-border)]">
              <thead className="bg-[var(--ff-paper)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Ruolo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Invitato il</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                {unconfirmed.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {u.profile?.full_name || u.user_metadata?.full_name || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-3">
                      {u.profile?.role ? (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ROLE_COLORS[u.profile.role] || 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[u.profile.role] || u.profile.role}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-3">
                      <UserConfirmButton
                        userId={u.id}
                        userEmail={u.email || ''}
                        confirmUser={confirmUser}
                        resendInvite={resendInvite}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {unconfirmed.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium">Tutti gli utenti hanno confermato il loro account.</p>
          </div>
        )}

        {/* Sezione: tutti gli utenti confermati */}
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--ff-border)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            <h2 className="text-sm font-bold text-gray-900">
              Utenti attivi ({confirmed.length})
            </h2>
          </div>
          {confirmed.length === 0 ? (
            <div className="p-8 text-center text-[var(--ff-muted)] text-sm">Nessun utente confermato.</div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--ff-border)]">
              <thead className="bg-[var(--ff-paper)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Ruolo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Confermato il</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ff-muted)] uppercase tracking-wide">Ultimo accesso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--ff-border)]">
                {confirmed.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--ff-paper)] transition-colors">
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                      {u.profile?.full_name || '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{u.email}</td>
                    <td className="px-6 py-3">
                      {u.profile?.role ? (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ROLE_COLORS[u.profile.role] || 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[u.profile.role] || u.profile.role}
                        </span>
                      ) : (
                        <span className="text-[var(--ff-muted)] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--ff-muted)]">
                      {u.email_confirmed_at
                        ? new Date(u.email_confirmed_at).toLocaleDateString('it-IT')
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--ff-muted)]">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Mai'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
