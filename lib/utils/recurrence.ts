const RULE_LABELS: Record<string, string> = {
  weekly_monday:    'Ogni lunedì',
  weekly_tuesday:   'Ogni martedì',
  weekly_wednesday: 'Ogni mercoledì',
  weekly_thursday:  'Ogni giovedì',
  weekly_friday:    'Ogni venerdì',
  weekly_saturday:  'Ogni sabato',
  weekly_sunday:    'Ogni domenica',
}

/**
 * Restituisce l'etichetta leggibile della regola di ricorrenza.
 * Se il rule è null o non riconosciuto, restituisce la stringa vuota.
 */
export function recurrenceLabel(rule: string | null): string {
  if (!rule) return ''
  return RULE_LABELS[rule] || rule
}
