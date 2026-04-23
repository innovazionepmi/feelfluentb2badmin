import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ImportForm from '@/components/admin/ImportParticipantsForm'

export default async function ImportParticipantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Recupera lista aziende per il select
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm block mb-2">
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Importa Partecipanti da CSV</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">Formato CSV richiesto</h3>
          <p className="text-blue-800 text-sm mb-3">
            Il file CSV deve contenere le seguenti colonne (con intestazione):
          </p>
          <div className="bg-white rounded p-3 font-mono text-sm">
            nome,cognome,email
          </div>
          <p className="text-blue-700 text-sm mt-3">
            Esempio: Mario,Rossi,mario.rossi@email.com
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              Non ci sono aziende attive. Crea prima un azienda.
            </p>
            <Link
              href="/admin/companies/new"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Crea Azienda
            </Link>
          </div>
        ) : (
          <ImportForm companies={companies} />
        )}
      </main>
    </div>
  )
}