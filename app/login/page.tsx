import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/loginform'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ff-paper)]">
      <div className="max-w-sm w-full px-4">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--ff-red)] text-white font-bold text-xl mb-4 shadow-lg">
            FF
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FeelFluent B2B</h1>
          <p className="text-sm text-[var(--ff-muted)] mt-1">Accedi al pannello di gestione</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
