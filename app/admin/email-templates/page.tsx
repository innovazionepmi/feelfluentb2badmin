import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import AdminNav from '@/components/admin/AdminNav'
import EmailTemplateForm from './EmailTemplateForm'

// Definizione dei template disponibili con le variabili supportate
const TEMPLATE_DEFS = [
  {
    key: 'level_check_booked',
    name: 'Level Check — Prenotazione confermata',
    description: 'Inviata al partecipante quando prenota un appuntamento di Level Check.',
    variables: ['{{participantName}}', '{{programName}}', '{{date}}', '{{startTime}}', '{{endTime}}', '{{tutorName}}', '{{roomLinkHtml}}'],
  },
  {
    key: 'level_check_cancelled',
    name: 'Level Check — Annullato',
    description: 'Inviata al partecipante quando il Level Check viene annullato.',
    variables: ['{{participantName}}', '{{programName}}', '{{date}}', '{{startTime}}', '{{endTime}}'],
  },
  {
    key: 'level_check_completed',
    name: 'Level Check — Completato (con livello)',
    description: 'Inviata al partecipante quando gli viene assegnato un livello.',
    variables: ['{{participantName}}', '{{programName}}', '{{level}}'],
  },
  {
    key: 'plan_email',
    name: 'Piano formativo',
    description: 'Inviata al partecipante con il calendario completo delle conversazioni.',
    variables: ['{{participantName}}', '{{programName}}', '{{level}}', '{{groupName}}', '{{tutorName}}', '{{conversationsTable}}', '{{levelRow}}'],
  },
]

const DEFAULTS: Record<string, { subject: string; html_body: string }> = {
  level_check_booked: {
    subject: 'Prenotazione Level Check confermata — {{programName}}',
    html_body: `<p>Ciao {{participantName}},</p>
<p>La tua prenotazione per il <strong>Level Check</strong> del programma <strong>{{programName}}</strong> è confermata.</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Data</td><td style="padding:4px 0;font-weight:600;">{{date}}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Orario</td><td style="padding:4px 0;font-weight:600;">{{startTime}} – {{endTime}}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Tutor</td><td style="padding:4px 0;font-weight:600;">{{tutorName}}</td></tr>
</table>
{{roomLinkHtml}}
<p>A presto,<br/>Il team FeelFluent</p>`,
  },
  level_check_cancelled: {
    subject: 'Level Check annullato — {{programName}}',
    html_body: `<p>Ciao {{participantName}},</p>
<p>Il tuo Level Check del <strong>{{date}}</strong> ({{startTime}}–{{endTime}}) per il programma <strong>{{programName}}</strong> è stato annullato.</p>
<p>Puoi prenotare un nuovo slot accedendo alla tua area personale.</p>
<p>A presto,<br/>Il team FeelFluent</p>`,
  },
  level_check_completed: {
    subject: 'Level Check completato — livello {{level}}',
    html_body: `<p>Ciao {{participantName}},</p>
<p>Il tuo Level Check per il programma <strong>{{programName}}</strong> è stato completato.</p>
<p>Il livello assegnato è: <strong style="font-size:1.2em;">{{level}}</strong></p>
<p>Sarai presto inserito in un gruppo di conversazione. Ti aggiorneremo non appena sarà disponibile.</p>
<p>A presto,<br/>Il team FeelFluent</p>`,
  },
  plan_email: {
    subject: 'Il tuo piano di formazione — {{programName}}',
    html_body: `<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#222;">
  <p>Ciao <strong>{{participantName}}</strong>,</p>
  <p>Ecco il tuo piano di formazione personalizzato per il programma <strong>{{programName}}</strong>.</p>

  <table style="border-collapse:collapse;margin:20px 0;width:100%;max-width:340px;">
    {{levelRow}}
    <tr>
      <td style="padding:6px 16px 6px 0;color:#666;font-size:14px;">Gruppo</td>
      <td style="padding:6px 0;font-weight:600;">{{groupName}}</td>
    </tr>
    <tr>
      <td style="padding:6px 16px 6px 0;color:#666;font-size:14px;">Tutor</td>
      <td style="padding:6px 0;font-weight:600;">{{tutorName}}</td>
    </tr>
  </table>

  <h3 style="margin-top:28px;margin-bottom:12px;font-size:15px;color:#333;border-bottom:2px solid #f0f0f0;padding-bottom:6px;">
    Calendario conversazioni
  </h3>

  {{conversationsTable}}

  <p style="margin-top:32px;color:#888;font-size:13px;">
    Per qualsiasi necessità contatta il tuo responsabile formazione.<br/>
    Il team <strong>FeelFluent</strong>
  </p>
</div>`,
  },
}

export default async function EmailTemplatesPage() {
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

  // Carica template esistenti da DB
  const { data: dbTemplates } = await adminClient
    .from('email_templates')
    .select('key, subject, html_body, updated_at')

  // Auto-seed: inserisce nel DB i template mancanti con i valori di default
  const existingKeys = new Set((dbTemplates || []).map(t => t.key))
  const missing = TEMPLATE_DEFS
    .filter(def => !existingKeys.has(def.key) && DEFAULTS[def.key])
    .map(def => ({
      key: def.key,
      subject: DEFAULTS[def.key].subject,
      html_body: DEFAULTS[def.key].html_body,
      updated_at: new Date().toISOString(),
    }))

  if (missing.length > 0) {
    await adminClient.from('email_templates').insert(missing)
  }

  // Ricarica dopo il seed (oppure unisci in memoria)
  const allDbTemplates = missing.length > 0
    ? [...(dbTemplates || []), ...missing]
    : (dbTemplates || [])

  const dbMap = Object.fromEntries(allDbTemplates.map(t => [t.key, t]))

  const templates = TEMPLATE_DEFS.map(def => ({
    ...def,
    subject: dbMap[def.key]?.subject ?? '',
    html_body: dbMap[def.key]?.html_body ?? '',
    updatedAt: (dbMap[def.key] as any)?.updated_at as string | undefined,
  }))

  // Server action: salva un template
  async function saveTemplate(formData: FormData) {
    'use server'
    const key = formData.get('key') as string
    const subject = formData.get('subject') as string
    const html_body = formData.get('html_body') as string

    if (!key || !subject || !html_body) return

    const adminClient = createAdminClient()
    await adminClient
      .from('email_templates')
      .upsert({ key, subject, html_body, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    revalidatePath('/admin/email-templates')
  }

  // Server action: ripristina default
  async function resetTemplate(formData: FormData) {
    'use server'
    const key = formData.get('key') as string
    if (!key) return

    const def = DEFAULTS[key]
    if (!def) return

    const adminClient = createAdminClient()
    await adminClient
      .from('email_templates')
      .upsert({ key, subject: def.subject, html_body: def.html_body, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    revalidatePath('/admin/email-templates')
  }

  return (
    <div className="min-h-screen bg-[var(--ff-paper)]">
      <header className="bg-white border-b border-[var(--ff-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Template Email</h1>
          <p className="text-xs text-[var(--ff-muted)] mt-0.5">
            Gestisci i testi delle email automatiche. Le variabili <code className="bg-gray-100 px-1 rounded text-xs">{'{{nome}}'}</code> vengono sostituite automaticamente.
          </p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {templates.map((tpl) => (
          <EmailTemplateForm
            key={tpl.key}
            templateKey={tpl.key}
            name={tpl.name}
            description={tpl.description}
            variables={tpl.variables}
            subject={tpl.subject}
            html_body={tpl.html_body}
            updatedAt={tpl.updatedAt}
            saveTemplate={saveTemplate}
            resetTemplate={resetTemplate}
          />
        ))}
      </main>
    </div>
  )
}
