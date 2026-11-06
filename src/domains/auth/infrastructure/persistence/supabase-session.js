import { requireSupabase } from '../../../../shared/services/supabase.js'

const USER_KEY = 'kapakid:user'
const TOKEN_KEY = 'kapakid:token'

export function mapSupabaseUser(authUser, fallback = {}) {
  const metadata = authUser?.user_metadata || {}
  const email = String(authUser?.email || fallback.email || '').trim().toLowerCase()
  const storedSegment = email ? localStorage.getItem(`payid:segment:${email}`) : null
  const segmento = metadata.segmento || metadata.segment || fallback.segmento || storedSegment || 'family'

  return {
    ...fallback,
    id: authUser?.id || fallback.id,
    nombre: metadata.nombre || metadata.full_name || fallback.nombre || email.split('@')[0] || 'Usuario PayID',
    email,
    dni: metadata.dni || fallback.dni || '',
    fechaNacimiento: metadata.fechaNacimiento || metadata.birth_date || fallback.fechaNacimiento || '',
    esUniversitario: segmento === 'student',
    segmento,
    perfil: segmento === 'family' ? 'Padre, madre o apoderado' : 'Estudiante universitario',
    avatarUrl: metadata.avatar_url || fallback.avatarUrl || '',
  }
}

export function saveSupabaseSession(session, fallback = {}) {
  if (!session?.user) return null
  const user = mapSupabaseUser(session.user, fallback)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  // The legacy Render API does not validate Supabase JWTs; never forward them as its bearer token.
  localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new CustomEvent('payid:user-updated', { detail: user }))
  return user
}

export function clearSupabaseSession() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new CustomEvent('payid:user-updated', { detail: null }))
}

export async function restoreSupabaseSession() {
  const { data, error } = await requireSupabase().auth.getSession()
  if (error) throw error
  if (data.session) {
    let fallback = {}
    try { fallback = JSON.parse(localStorage.getItem(USER_KEY) || '{}') } catch { /* Ignore a malformed local profile. */ }
    return saveSupabaseSession(data.session, fallback)
  }
  clearSupabaseSession()
  return null
}

export async function signOutSupabase() {
  const { error } = await requireSupabase().auth.signOut()
  if (error) throw error
  clearSupabaseSession()
}

export function subscribeSupabaseSession() {
  const { data } = requireSupabase().auth.onAuthStateChange((event, session) => {
    if (session) saveSupabaseSession(session)
    else if (event === 'SIGNED_OUT') clearSupabaseSession()
  })
  return () => data.subscription.unsubscribe()
}

export async function sendPasswordReset(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const { error } = await requireSupabase().auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/update-password`,
  })
  if (error) throw error
}

export async function updateSupabasePassword(password) {
  const { data, error } = await requireSupabase().auth.updateUser({ password })
  if (error) throw error
  return data.user
}
