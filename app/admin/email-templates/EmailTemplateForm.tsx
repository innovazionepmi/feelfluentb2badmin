'use client'

import { useState } from 'react'

interface Props {
  templateKey: string
  name: string
  description: string
  variables: string[]
  subject: string
  html_body: string
  updatedAt?: string
  saveTemplate: (formData: FormData) => Promise<void>
  resetTemplate: (formData: FormData) => Promise<void>
}

export default function EmailTemplateForm({
  templateKey, name, description, variables,
  subject: initialSubject, html_body: initialBody,
  updatedAt, saveTemplate, resetTemplate,
}: Props) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(formData: FormData) {
    await saveTemplate(formData)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleReset(formData: FormData) {
    await resetTemplate(formData)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--ff-border)] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-start justify-between gap-4 hover:bg-[var(--ff-paper)] transition text-left"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{name}</span>
            {updatedAt && (
              <span className="text-xs text-[var(--ff-muted)]">
                Modificato: {new Date(updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--ff-muted)] mt-0.5">{description}</p>
        </div>
        <span className="text-gray-400 shrink-0 mt-0.5">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--ff-border)]">
          {/* Variabili disponibili */}
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-600 mb-2">Variabili disponibili:</p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map(v => (
                <code
                  key={v}
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 font-mono cursor-pointer hover:bg-blue-100"
                  title="Clicca per copiare"
                  onClick={() => navigator.clipboard?.writeText(v)}
                >
                  {v}
                </code>
              ))}
            </div>
          </div>

          <form action={handleSave} className="px-6 pb-6 space-y-4 pt-2">
            <input type="hidden" name="key" value={templateKey} />

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Oggetto (subject)</label>
              <input
                type="text"
                name="subject"
                required
                defaultValue={initialSubject}
                className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Corpo HTML</label>
              <textarea
                name="html_body"
                required
                rows={14}
                defaultValue={initialBody}
                className="w-full px-3 py-2 border border-[var(--ff-border)] rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ff-red)] resize-y"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                className="bg-[var(--ff-red)] hover:bg-[var(--ff-red-700)] text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                {saved ? '✓ Salvato' : 'Salva template'}
              </button>

              <form action={handleReset}>
                <input type="hidden" name="key" value={templateKey} />
                <button
                  type="submit"
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium"
                  onClick={(e) => {
                    if (!confirm('Ripristinare il testo predefinito? Le modifiche salvate verranno sovrascritte.')) {
                      e.preventDefault()
                    }
                  }}
                >
                  Ripristina default
                </button>
              </form>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
