import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

interface CSVRow {
  nome: string
  cognome: string
  email: string
}

// Funzione che invia email in background senza bloccare la risposta
async function sendEmailsInBackground(
  users: { id: string; email: string }[], 
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  // Ricrea il client admin qui (importante: deve essere ricreato in questo contesto)
  const { createServerClient } = await import('@supabase/ssr')
  
  const adminSupabase = createServerClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  )

  console.log(`Inizio invio email in background a ${users.length} utenti...`)
  
  for (let i = 0; i < users.length; i++) {
    try {
      console.log(`Invio email ${i + 1}/${users.length} a ${users[i].email}`)
      
      await adminSupabase.auth.admin.inviteUserByEmail(users[i].email)
      
      console.log(`✓ Email inviata a ${users[i].email}`)
      
      // Delay di 20 secondi tra ogni email (tranne l'ultima)
      if (i < users.length - 1) {
        console.log('Attendo 20 secondi prima della prossima email...')
        await new Promise(resolve => setTimeout(resolve, 20000))
      }
    } catch (error: any) {
      console.error(`✗ Errore email ${users[i].email}:`, error.message)
    }
  }
  
  console.log('✓ Tutte le email inviate in background')
}

export async function POST(request: NextRequest) {
  try {
    // Client normale per verificare autenticazione
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Verifica che sia admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Leggi i dati dal form
    const formData = await request.formData()
    const file = formData.get('file') as File
    const company_id = formData.get('company_id') as string

    if (!file || !company_id) {
      return NextResponse.json({ error: 'File e azienda richiesti' }, { status: 400 })
    }

    // Leggi il contenuto del file
    const text = await file.text()

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'Errore nel parsing CSV', 
        details: parseResult.errors 
      }, { status: 400 })
    }

    const rows = parseResult.data

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vuoto' }, { status: 400 })
    }

    // Valida che ci siano le colonne necessarie
    const firstRow = rows[0]
    if (!('nome' in firstRow) || !('cognome' in firstRow) || !('email' in firstRow)) {
      return NextResponse.json({ 
        error: 'CSV deve contenere le colonne: nome, cognome, email' 
      }, { status: 400 })
    }

    let created = 0
    let errors: string[] = []

    // Client admin per creare utenti
    const adminSupabase = createAdminClient()

    // Array per tenere traccia degli utenti creati
    const createdUsers: { id: string; email: string }[] = []

    console.log(`Inizio creazione di ${rows.length} utenti...`)

    for (const row of rows) {
      const { nome, cognome, email } = row

      // Validazione base
      if (!nome || !cognome || !email) {
        errors.push(`Riga incompleta: ${JSON.stringify(row)}`)
        continue
      }

      if (!email.includes('@')) {
        errors.push(`Email non valida: ${email}`)
        continue
      }

      try {
        console.log(`Creando utente: ${email}`)
        
        // Crea utente SENZA inviare email automatica
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
          email,
          email_confirm: false,
          user_metadata: {
            full_name: `${nome} ${cognome}`,
            role: 'participant'
          }
        })

        if (authError) {
          // Se l'utente esiste già, salta
          if (authError.message.includes('already registered')) {
            errors.push(`${email}: Utente già esistente`)
            continue
          }
          errors.push(`${email}: ${authError.message}`)
          continue
        }

        // Crea profilo
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            full_name: `${nome} ${cognome}`,
            role: 'participant',
            company_id
          })

        if (profileError) {
          errors.push(`${email}: Errore creazione profilo - ${profileError.message}`)
          continue
        }

        created++
        createdUsers.push({ id: authData.user.id, email })
        console.log(`✓ Utente creato: ${email}`)
        
      } catch (err: any) {
        errors.push(`${email}: ${err.message}`)
      }
    }

    console.log(`Creazione completata: ${created} utenti creati`)

    // Invia email in background (non blocca la risposta)
    if (createdUsers.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      // Avvia invio email in background senza aspettare
      sendEmailsInBackground(createdUsers, supabaseUrl, supabaseServiceKey)
        .catch(error => console.error('Errore invio email background:', error))
    }

    // Risponde immediatamente senza aspettare le email
    return NextResponse.json({
      success: true,
      created,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${created} partecipanti creati con successo. Le email di invito verranno inviate a breve.`
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Errore durante import', 
      details: error.message 
    }, { status: 500 })
  }
}