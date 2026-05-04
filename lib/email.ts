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
