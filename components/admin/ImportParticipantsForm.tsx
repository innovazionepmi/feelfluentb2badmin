'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
}

export default function ImportParticipantsForm({ companies }: { companies: Company[] }) {
  const [selectedCompany, setSelectedCompany] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file || !selectedCompany) {
      setError('Seleziona azienda e file CSV')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('company_id', selectedCompany)

      const response = await fetch('/api/participants/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante import')
      }

      setSuccess(`Import completato! ${result.created} partecipanti creati su ${result.total}.`)
      
      if (result.errors && result.errors.length > 0) {
        setError(`Alcuni errori: ${result.errors.slice(0, 3).join(', ')}`)
      }

      // Reset form
      setFile(null)
      setSelectedCompany('')
      
      // Redirect dopo 3 secondi
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <div className="space-y-6">
        <div>
          <label htmlFor="company" className="block text-sm font-medium mb-2">
            Seleziona Azienda
          </label>
          <select
            id="company"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--ff-red)]"
          >
            <option value="">-- Seleziona azienda --</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="csv-file" className="block text-sm font-medium mb-2">
            File CSV
          </label>
          <input
            type="file"
            id="csv-file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2">
              File selezionato: {file.name}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !file || !selectedCompany}
            className="flex-1 bg-[var(--ff-red)] text-white py-3 rounded-lg hover:bg-[var(--ff-red-700)] disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Importazione in corso...' : 'Importa Partecipanti'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Annulla
          </button>
        </div>
      </div>
    </form>
  )
}