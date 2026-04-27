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
    <nav className="bg-white border-b border-[var(--ff-border)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex overflow-x-auto gap-1 py-2">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition whitespace-nowrap font-medium"
          >
            ← Dashboard
          </Link>
          <div className="w-px bg-[var(--ff-border)] mx-1 self-stretch" />
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap font-semibold ${
                  isActive
                    ? 'bg-[var(--ff-red-50)] text-[var(--ff-red)] ring-1 ring-[var(--ff-red-100)]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
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
