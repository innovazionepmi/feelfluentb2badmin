import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

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

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export async function sendLevelCheckBooked(data: LevelCheckEmailData) {
  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.participantEmail,
    subject: `Prenotazione Level Check confermata — ${data.programName}`,
    html: `
      <p>Ciao ${data.participantName},</p>
      <p>La tua prenotazione per il <strong>Level Check</strong> del programma <strong>${data.programName}</strong> è confermata.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Data</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.date)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Orario</td><td style="padding:4px 0;font-weight:600;">${data.startTime.slice(0,5)} – ${data.endTime.slice(0,5)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Tutor</td><td style="padding:4px 0;font-weight:600;">${data.tutorName}</td></tr>
      </table>
      ${data.roomLink ? `<p>Entra nella stanza virtuale il giorno dell'appuntamento: <a href="${data.roomLink}">${data.roomLink}</a></p>` : ''}
      <p>A presto,<br/>Il team FeelFluent</p>
    `,
  })
}

export async function sendLevelCheckCancelled(data: LevelCheckEmailData) {
  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.participantEmail,
    subject: `Level Check annullato — ${data.programName}`,
    html: `
      <p>Ciao ${data.participantName},</p>
      <p>Il tuo Level Check del <strong>${formatDate(data.date)}</strong> (${data.startTime.slice(0,5)}–${data.endTime.slice(0,5)}) per il programma <strong>${data.programName}</strong> è stato annullato.</p>
      <p>Puoi prenotare un nuovo slot accedendo alla tua area personale.</p>
      <p>A presto,<br/>Il team FeelFluent</p>
    `,
  })
}

// ─── Piano formativo ─────────────────────────────────────────────────────────

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

export async function sendPlanEmail(data: PlanEmailData) {
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

  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.to,
    subject: `Il tuo piano di formazione — ${data.programName}`,
    html: `
      <div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#222;">
        <p>Ciao <strong>${data.participantName}</strong>,</p>
        <p>Ecco il tuo piano di formazione personalizzato per il programma <strong>${data.programName}</strong>.</p>

        <table style="border-collapse:collapse;margin:20px 0;width:100%;max-width:340px;">
          ${data.level ? `<tr>
            <td style="padding:6px 16px 6px 0;color:#666;font-size:14px;">Livello assegnato</td>
            <td style="padding:6px 0;font-weight:700;font-size:18px;color:#C0392B;">${data.level}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 16px 6px 0;color:#666;font-size:14px;">Gruppo</td>
            <td style="padding:6px 0;font-weight:600;">${data.groupName}</td>
          </tr>
          <tr>
            <td style="padding:6px 16px 6px 0;color:#666;font-size:14px;">Tutor</td>
            <td style="padding:6px 0;font-weight:600;">${data.tutorName}</td>
          </tr>
        </table>

        <h3 style="margin-top:28px;margin-bottom:12px;font-size:15px;color:#333;border-bottom:2px solid #f0f0f0;padding-bottom:6px;">
          Calendario conversazioni
        </h3>

        ${data.conversations.length === 0
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
        }

        <p style="margin-top:32px;color:#888;font-size:13px;">
          Per qualsiasi necessità contatta il tuo responsabile formazione.<br/>
          Il team <strong>FeelFluent</strong>
        </p>
      </div>
    `,
  })
}

// ─── Level Check ─────────────────────────────────────────────────────────────

export async function sendLevelCheckCompleted(data: LevelCheckEmailData & { level: string }) {
  await transporter.sendMail({
    from: `FeelFluent <${process.env.SMTP_FROM}>`,
    to: data.participantEmail,
    subject: `Level Check completato — livello ${data.level}`,
    html: `
      <p>Ciao ${data.participantName},</p>
      <p>Il tuo Level Check per il programma <strong>${data.programName}</strong> è stato completato.</p>
      <p>Il livello assegnato è: <strong style="font-size:1.2em;">${data.level}</strong></p>
      <p>Sarai presto inserito in un gruppo di conversazione. Ti aggiorneremo non appena sarà disponibile.</p>
      <p>A presto,<br/>Il team FeelFluent</p>
    `,
  })
}
