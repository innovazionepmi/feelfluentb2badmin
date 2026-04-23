'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/companies',    label: '🏢 Aziende' },
  { href: '/admin/programs',     label: '📋 Programmi' },
  { href: '/admin/participants', label: '👥 Partecipanti' },
  { href: '/admin/tutors',       label: '👩‍🏫 Tutor' },
  { href: '/admin/users',        label: '✅ Abilita Utenti' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex overflow-x-auto gap-1 py-2">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition whitespace-nowrap"
          >
            ← Dashboard
          </Link>
          <div className="w-px bg-gray-200 mx-1 self-stretch" />
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
