'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Company {
  id: string
  name: string
}

interface Program {
  id: string
  name: string
  company_id: string
}

interface Props {
  companies: Company[]
  programs: Program[]
  selectedCompany: string
  selectedProgram: string
  total: number
}

export default function ParticipantsFilter({ companies, programs, selectedCompany, selectedProgram, total }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Se cambia azienda, resetta il programma
    if (key === 'company_id') params.delete('program_id')
    router.push(`${pathname}?${params.toString()}`)
  }

  const reset = () => router.push(pathname)

  const filteredPrograms = selectedCompany
    ? programs.filter(p => p.company_id === selectedCompany)
    : programs

  const hasFilters = selectedCompany || selectedProgram

  return (
    <div className="px-6 py-4 border-b bg-gray-50 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Azienda:</label>
        <select
          value={selectedCompany}
          onChange={e => update('company_id', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tutte</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Programma:</label>
        <select
          value={selectedProgram}
          onChange={e => update('program_id', e.target.value)}
          disabled={filteredPrograms.length === 0}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
        >
          <option value="">Tutti</option>
          {filteredPrograms.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={reset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Azzera filtri
        </button>
      )}

      <span className="ml-auto text-sm text-gray-500">
        {total} partecipant{total === 1 ? 'e' : 'i'}
      </span>
    </div>
  )
}
