import { requireSupabase } from '../../../../shared/services/supabase.js'
import { saveSupabaseSession } from '../../infrastructure/persistence/supabase-session.js'

export async function registerUseCase({ nombre, email, password, dni, fechaNacimiento, esUniversitario, segmento }) {
  const normalizedEmail = String(email).trim().toLowerCase()
  const profile = {
    nombre: String(nombre).trim(),
    dni: String(dni).trim(),
    fechaNacimiento,
    esUniversitario: Boolean(esUniversitario),
    segmento: segmento || (esUniversitario ? 'student' : 'family'),
    perfil: esUniversitario ? 'Estudiante universitario' : 'Padre, madre o apoderado',
  }

  const { data, error } = await requireSupabase().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: profile,
      emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/login`,
    },
  })

  if (error) {
    const message = String(error.message || '').toLowerCase()
    const code = String(error.code || error.error_code || '').toLowerCase()
    if (code === 'signup_disabled' || message.includes('email signups are disabled') || message.includes('signups not allowed')) {
      throw new Error('EMAIL_SIGNUPS_DISABLED')
    }
    if (code === 'over_email_send_rate_limit' || message.includes('email rate limit exceeded')) {
      throw new Error('EMAIL_RATE_LIMIT')
    }
    if (message.includes('already registered') || message.includes('already been registered')) {
      throw new Error('EMAIL_ALREADY_REGISTERED')
    }
    throw error
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('EMAIL_ALREADY_REGISTERED')
  }

  localStorage.setItem(`payid:segment:${normalizedEmail}`, profile.segmento)
  if (data.session) saveSupabaseSession(data.session, { ...profile, email: normalizedEmail })
  return { user: data.user, needsEmailConfirmation: !data.session }
}
