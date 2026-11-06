import { requireSupabase } from '../../../../shared/services/supabase.js'
import { saveSupabaseSession } from '../../infrastructure/persistence/supabase-session.js'
import { saveDemoPaymentCard } from '../../../../shared/services/payidRepository.js'

export async function loginUseCase({ email, password }) {
  try {
    const identifier = String(email || '').trim()
    const credentials = /^\S+@\S+\.\S+$/.test(identifier)
      ? { email: identifier.toLowerCase(), password }
      : { phone: toPeruvianPhone(identifier), password }
    const { data, error } = await requireSupabase().auth.signInWithPassword(credentials)
    if (error) throw error
    if (!data.session?.user) return false
    saveSupabaseSession(data.session, { email: identifier })
    const pendingCard = readPendingCard(identifier)
    if (pendingCard) {
      const [month, year] = String(pendingCard.expiryDate || '').split('/')
      await saveDemoPaymentCard({ brand: pendingCard.brand, lastFour: pendingCard.lastFour, expiryMonth: Number(month) || null, expiryYear: Number(year) ? 2000 + Number(year) : null, balance: 0 })
      sessionStorage.removeItem('payid:payment:card-pending')
    }
    return true
  } catch (error) {
    const message = String(error?.message || '').toLowerCase()
    const code = String(error?.code || error?.error_code || '').toLowerCase()
    if (code === 'email_not_confirmed' || code === 'email_not_verified' || /email.{0,30}(not|unverified|unverified).{0,20}confirm|confirm.{0,20}email/.test(message)) {
      throw new Error('EMAIL_NOT_CONFIRMED')
    }
    if (code === 'invalid_credentials' || message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      throw new Error('INVALID_CREDENTIALS')
    }
    if (import.meta.env.DEV) console.warn('[PayID auth] Sign-in failed:', { code: code || 'unknown', status: error?.status || null, message: error?.message || 'Unknown error' })
    throw error
  }
}

function readPendingCard(email) {
  try {
    const card = JSON.parse(sessionStorage.getItem('payid:payment:card-pending') || 'null')
    return card && String(card.email).toLowerCase() === String(email).trim().toLowerCase() ? card : null
  } catch { return null }
}

function toPeruvianPhone(value) {
  const digits = String(value).replace(/\D/g, '')
  return digits.startsWith('51') ? `+${digits}` : `+51${digits}`
}
