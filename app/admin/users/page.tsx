import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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

interface Props {
  searchParams: Promise<{ invited?: string; invite_error?: string }>
}

export default async function UsersManagementPage({ searchParams }: Props) {
  const { invited, invite_error } = await searchParams

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

  const { data: authUsers } = await adminClient.auth.admin.listUsers()

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('*')
    .order('full_name')

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

  const allUsers = (authUsers?.users || []).map(authUser => ({
    ...authUser,
    profile: profilesMap.get(authUser.id),
  }))

  const unconfirmed = allUsers.filter(u => !u.email_confirmed_at)
  const confirmed = allUsers.filter(u => u.email_confirmed_at)

  async function confirmUser(formData: FormData) {
    'use server'
    const userId = formData.get('user_id') as string
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(userId, { email_confirm: true })
    revalidatePath('/admin/users')
  }

  async function resendInvite(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false } }
    )
    await client.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://b2badmin.feelfluent.com/auth/reset-password',
    })
    revalidatePath('/admin/users')
  }

  async function inviteAdmin(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string).trim().toLowerCase()
    const full_name = (formData.get('full_name') as string).trim()

    if (!email || !full_name) {
      redirect('/admin/users?invite_error=Compila+tutti+i+campi')
    }

    const adminClient = createAdminClient()

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name },
    })

    if (createError) {
      redirect(`/admin/users?invite_error=${encodeURIComponent(createError.message)}`)
    }

    const userId = newUser.user.id

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: userId, email, full_name, role: 'admin' })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId)
      redirect(`/admin/users?invite_error=${encodeURIComponent(profileError.message)}`)
    }

    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false } }
    )
    await client.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://b2badmin.feelfluent.com/auth/reset-password',
    })

    redirect(`/admin/users?invited=${encodeURIComponent(email)}`)
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

        {/* Invita nuovo admin */}
        <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Invita nuovo amministratore</h2>
          <p className="text-xs text-[var(--ff-muted)] mb-4">
            Verrà creato un account con ruolo admin e inviata un&apos;email per impostare la password.
          </p>

          {invited && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">
              ✓ Invito inviato a <strong>{invited}</strong>
            </div>
          )}
          {invite_error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              ⚠ {invite_error}
            </div>
          )}

          <form action={inviteAdmin} className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Nome completo</label>
              <input
                name="full_name"
                type="text"
                required
                placeholder="Es. Mario Rossi"
                className="text-sm px-3 py-2 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] w-52 bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@esempio.com"
                className="text-sm px-3 py-2 border border-[var(--ff-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ff-red)] w-64 bg-white"
              />
            </div>
            <button
              type="submit"
              className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0"
            >
              Invia invito
            </button>
          </form>
        </div>

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
