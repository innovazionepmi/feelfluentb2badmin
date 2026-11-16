import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/server'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

async function loadDbTemplate(key: string): Promise<{ subject: string; html_body: string } | null> {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('email_templates')
      .select('subject, html_body')
      .eq('key', key)
      .single()
    if (data?.subject && data?.html_body) return data
  } catch {}
  return null
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ─── Interfacce ──────────────────────────────────────────────────────────────

interface LevelCheckEmailData {
  participantEmail: string
  participantName: string
  programName: string
  date: string
  startTime: string
  endTime: string
  tutorName: string
  roomLink?: string | null
}

interface PlanConversation {
  session_number: number
  scheduled_date: string
  start_time: string
  end_time: string
  meeting_link: string
}

interface PlanEmailData {
  to: string
  participantName: string
  programName: string
  level: string | null
  groupName: string
  tutorName: string
  conversations: PlanConversation[]
}

// ─── Default templates (fallback se il record non esiste in DB) ───────────────

const DEFAULTS = {
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

// ─── Send functions ───────────────────────────────────────────────────────────

export async function sendLevelCheckBooked(data: LevelCheckEmailData) {
  const tpl = (await loadDbTemplate('level_check_booked')) ?? DEFAULTS.level_check_booked
  const roomLinkHtml = data.roomLink
    ? `<p>Entra nella stanza virtuale il giorno dell'appuntamento: <a href="${data.roomLink}">${data.roomLink}</a></p>`
    : ''
  const vars: Record<string, string> = {
    participantName: data.participantName,
    programName: data.programName,
    date: formatDate(data.date),
    startTime: data.startTime.slice(0, 5),
    endTime: data.endTime.slice(0, 5),
    tutorName: data.tutorName,
    roomLinkHtml,
  }
  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.participantEmail,
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.html_body, vars),
  })
}

export async function sendLevelCheckCancelled(data: LevelCheckEmailData) {
  const tpl = (await loadDbTemplate('level_check_cancelled')) ?? DEFAULTS.level_check_cancelled
  const vars: Record<string, string> = {
    participantName: data.participantName,
    programName: data.programName,
    date: formatDate(data.date),
    startTime: data.startTime.slice(0, 5),
    endTime: data.endTime.slice(0, 5),
  }
  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.participantEmail,
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.html_body, vars),
  })
}

export async function sendLevelCheckCompleted(data: LevelCheckEmailData & { level: string }) {
  const tpl = (await loadDbTemplate('level_check_completed')) ?? DEFAULTS.level_check_completed
  const vars: Record<string, string> = {
    participantName: data.participantName,
    programName: data.programName,
    level: data.level,
  }
  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.participantEmail,
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.html_body, vars),
  })
}

export async function sendPlanEmail(data: PlanEmailData) {
  const tpl = (await loadDbTemplate('plan_email')) ?? DEFAULTS.plan_email

  const convRows = data.conversations.map(c => {
    const dateLabel = new Date(c.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
    const time = `${c.start_time.slice(0, 5)}–${c.end_time.slice(0, 5)}`
    const link = c.meeting_link
      ? `<a href="${c.meeting_link}" style="color:#C0392B;font-weight:600;">Entra →</a>`
      : '<span style="color:#aaa;">—</span>'
    return `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:700;color:#666;">${c.session_number}</td>
        <td style="padding:8px 12px;text-transform:capitalize;">${dateLabel}</td>
        <td style="padding:8px 12px;font-weight:600;">${time}</td>
        <td style="padding:8px 12px;">${link}</td>
      </tr>`
  }).join('')

  const conversationsTable = data.conversations.length === 0
    ? '<p style="color:#888;font-size:14px;">Nessuna conversazione programmata al momento.</p>'
    : `<table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:8px 12px;text-align:center;color:#666;font-size:12px;text-transform:uppercase;">#</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-size:12px;text-transform:uppercase;">Data</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-size:12px;text-transform:uppercase;">Orario</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-size:12px;text-transform:uppercase;">Link</th>
          </tr>
        </thead>
        <tbody>${convRows}</tbody>
      </table>`

  const levelRow = data.level
    ? `<tr>
        <td style="padding:6px 16px 6px 0;color:#666;font-size:14px;">Livello assegnato</td>
        <td style="padding:6px 0;font-weight:700;font-size:18px;color:#C0392B;">${data.level}</td>
      </tr>`
    : ''

  const vars: Record<string, string> = {
    participantName: data.participantName,
    programName: data.programName,
    level: data.level ?? '',
    groupName: data.groupName,
    tutorName: data.tutorName,
    conversationsTable,
    levelRow,
  }

  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.to,
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.html_body, vars),
  })
}
