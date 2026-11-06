import { createActivityEvent } from './payidRepository.js'

export async function recordActivity(entry) {
  const activity = {
    id: entry.id || crypto.randomUUID(),
    kind: entry.kind || 'system',
    title: String(entry.title || 'Actividad PayID'),
    detail: String(entry.detail || ''),
    date: entry.date || new Date().toISOString(),
    status: String(entry.status || 'registered'),
    reference: String(entry.reference || ''),
    metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {},
  }
  try {
    await createActivityEvent(activity)
  } catch (error) {
    // The main action is already saved; keep its UI flow successful and report the history sync issue.
    console.error('No se pudo guardar la actividad en Supabase:', error.message)
  }
  return activity
}
