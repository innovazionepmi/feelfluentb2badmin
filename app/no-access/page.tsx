import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NoAccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--ff-paper)] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm p-10 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-900">Area riservata</h1>
        <p className="text-sm text-[var(--ff-muted)]">
          Ciao <strong>{profile?.full_name}</strong>, questa area è riservata agli amministratori.
        </p>
        <form action={handleLogout}>
          <button
            type="submit"
            className="mt-2 px-6 py-2 bg-[var(--ff-red)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--ff-red-700)] transition"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  )
}
