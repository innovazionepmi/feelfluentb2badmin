'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/companies',    label: 'Aziende',      icon: '🏢' },
  { href: '/admin/programs',     label: 'Programmi',    icon: '📋' },
  { href: '/admin/participants', label: 'Partecipanti', icon: '👥' },
  { href: '/admin/tutors',       label: 'Tutor',        icon: '👩‍🏫' },
  { href: '/admin/presenze',     label: 'Presenze',     icon: '✅', highlight: true },
  { href: '/admin/users',        label: 'Abilita',      icon: '🔓' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-[var(--ff-border)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 py-3 overflow-x-auto">

          {/* Back to dashboard */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ff-border)] bg-white text-sm text-gray-600 hover:bg-[var(--ff-paper)] transition font-medium shrink-0"
          >
            <span className="text-base leading-none">←</span>
            <span>Dashboard</span>
          </Link>

          <div className="w-px h-6 bg-[var(--ff-border)] mx-0.5 shrink-0" />

          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)

            if (item.highlight && !isActive) {
              // Presenze — always stands out a bit
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ff-red-100)] bg-[var(--ff-red-50)] text-sm text-[var(--ff-red)] font-bold hover:bg-[var(--ff-red)] hover:text-white hover:border-[var(--ff-red)] transition shrink-0"
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition shrink-0 ${
                  isActive
                    ? 'bg-[var(--ff-red)] text-white border-[var(--ff-red)] shadow-sm'
                    : 'bg-white text-gray-700 border-[var(--ff-border)] hover:bg-[var(--ff-paper)] hover:border-gray-300'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
