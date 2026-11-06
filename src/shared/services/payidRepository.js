import { requireSupabase } from './supabase.js'

const client = () => requireSupabase()

async function userId() {
  const { data, error } = await client().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Inicia sesión para continuar.')
  return data.user.id
}

function throwIf(error) { if (error) throw error }

function cleanActivityDescription(value) {
  return String(value || '').replace(/\s*[?·–-]?\s*(?:simulad[oa]s?|no se realiz)[\s\S]*$/i, '').trim()
}

export async function listFamilyMembers() {
  const owner = await userId()
  const { data, error } = await client().from('family_members').select('*').eq('user_id', owner).order('created_at', { ascending: true })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, name: row.name, relationship: row.relationship, documentType: row.document_type, documentNumber: row.document_number, birthDate: row.birth_date, phone: row.phone }))
}

export async function saveFamilyMember(payload, id = null) {
  const owner = await userId()
  const values = { user_id: owner, name: payload.name.trim(), relationship: payload.relationship, document_type: payload.documentType || 'DNI', document_number: payload.documentNumber.trim(), birth_date: payload.birthDate || null, phone: payload.phone || null }
  const query = id ? client().from('family_members').update(values).eq('id', id) : client().from('family_members').insert(values)
  const { data, error } = await query.select('*').single()
  throwIf(error)
  return { id: data.id, name: data.name, relationship: data.relationship, documentType: data.document_type, documentNumber: data.document_number, birthDate: data.birth_date, phone: data.phone }
}

export async function deleteFamilyMember(id) {
  const owner = await userId()
  const { error } = await client().from('family_members').delete().eq('user_id', owner).eq('id', id)
  throwIf(error)
}

export async function listWalletCards() {
  const owner = await userId()
  const { data, error } = await client().from('wallet_cards').select('*').eq('user_id', owner).order('created_at', { ascending: false })
  throwIf(error)
  return data || []
}

export async function saveWalletCard(payload, id = null) {
  const owner = await userId()
  const values = {
    user_id: owner,
    family_member_id: payload.familyMemberId || null,
    category: payload.category,
    instrument_type: payload.instrumentType.trim(),
    issuer: payload.issuer.trim(),
    network: payload.category === 'bank' ? (payload.network || '') : '',
    label: payload.label.trim(),
    holder_name: payload.holderName.trim(),
    identifier: payload.identifier.trim(),
    expires_on: payload.expiresOn || null,
    balance: payload.balance === '' || payload.balance == null ? null : Number(payload.balance),
    status: payload.status || 'active',
    notes: payload.notes?.trim() || '',
    updated_at: new Date().toISOString(),
  }
  const query = id
    ? client().from('wallet_cards').update(values).eq('user_id', owner).eq('id', id)
    : client().from('wallet_cards').insert(values)
  const { data, error } = await query.select('*').single()
  throwIf(error)
  return data
}

export async function deleteWalletCard(id) {
  const owner = await userId()
  const { error } = await client().from('wallet_cards').delete().eq('user_id', owner).eq('id', id)
  throwIf(error)
}

export async function listDocuments() {
  const owner = await userId()
  const { data, error } = await client().from('documents').select('*').eq('user_id', owner).order('created_at', { ascending: false })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, familyMemberId: row.family_member_id, type: row.document_type, number: row.document_number, fullName: row.full_name, issueDate: row.issue_date, expirationDate: row.expiration_date, statusKey: row.status, storagePath: row.storage_path, createdAt: row.created_at }))
}

export async function createDocument(payload) {
  const owner = await userId()
  const { data, error } = await client().from('documents').insert({
    user_id: owner,
    family_member_id: payload.familyMemberId || null,
    document_type: payload.type,
    document_number: payload.number,
    full_name: payload.fullName || '',
    issue_date: payload.issueDate || null,
    expiration_date: payload.expirationDate || null,
    status: payload.status || 'pending',
    storage_path: payload.storagePath || null,
  }).select('*').single()
  throwIf(error)
  return { id: data.id, familyMemberId: data.family_member_id, type: data.document_type, number: data.document_number, fullName: data.full_name, issueDate: data.issue_date, expirationDate: data.expiration_date, statusKey: data.status, storagePath: data.storage_path, createdAt: data.created_at }
}

export async function listPayments() {
  const owner = await userId()
  const { data, error } = await client().from('payments').select('*').eq('user_id', owner).order('occurred_at', { ascending: false })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, familyMemberId: row.family_member_id, service: row.service, category: row.category, description: row.description, method: row.method, amount: Number(row.amount), date: row.occurred_at, status: row.status, reference: row.reference, paymentCardId: row.payment_card_id }))
}

export async function createPayment(payload) {
  const owner = await userId()
  const { data, error } = await client().from('payments').insert({
    user_id: owner,
    family_member_id: payload.familyMemberId || null,
    payment_card_id: payload.paymentCardId || null,
    service: payload.service,
    category: payload.category || 'Otros',
    description: payload.description || '',
    method: payload.method || 'Tarjeta PayID',
    amount: Number(payload.amount),
    occurred_at: payload.date || new Date().toISOString(),
    status: payload.status || 'registered',
    reference: payload.reference || crypto.randomUUID(),
  }).select('*').single()
  throwIf(error)
  return { id: data.id, familyMemberId: data.family_member_id, service: data.service, category: data.category, description: data.description, method: data.method, amount: Number(data.amount), date: data.occurred_at, status: data.status, reference: data.reference, paymentCardId: data.payment_card_id }
}

export async function listPaymentCards() {
  const owner = await userId()
  const { data, error } = await client().from('payment_cards').select('*').eq('user_id', owner).order('created_at', { ascending: false })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, familyMemberId: row.family_member_id, brand: row.brand, lastFour: row.last_four, expiryMonth: row.expiry_month, expiryYear: row.expiry_year, balance: Number(row.balance), demo: row.is_demo }))
}

export async function getPayIdProfile() {
  const owner = await userId()
  const { data, error } = await client().from('profiles').select('*').eq('id', owner).single()
  throwIf(error)
  let avatarUrl = ''
  if (data.avatar_path) {
    const { data: signed, error: signedError } = await client().storage.from('payid-profile-photos').createSignedUrl(data.avatar_path, 60 * 60 * 24 * 7)
    throwIf(signedError)
    avatarUrl = signed.signedUrl
  }
  return { id: data.id, email: data.email, nombre: data.full_name, dni: data.dni || '', fechaNacimiento: data.birth_date || '', segmento: data.segment, perfil: data.segment === 'family' ? 'Padre, madre o apoderado' : 'Estudiante universitario', profilePhoto: avatarUrl, avatarPath: data.avatar_path || null }
}

export async function updatePayIdPassword(currentPassword, newPassword) {
  const auth = client().auth
  const { data: session, error: sessionError } = await auth.getUser()
  throwIf(sessionError)
  if (!session.user?.email) throw new Error('No se pudo verificar el correo de la cuenta.')
  const { error: verifyError } = await auth.signInWithPassword({ email: session.user.email, password: currentPassword })
  if (verifyError) throw new Error('La contraseña actual no es correcta.')
  const { error } = await auth.updateUser({ password: newPassword })
  throwIf(error)
}

export async function uploadProfilePhoto(file, previousPath = null) {
  const owner = await userId()
  const extension = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${owner}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client().storage.from('payid-profile-photos').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' })
  throwIf(uploadError)
  const { error: profileError } = await client().from('profiles').update({ avatar_path: path }).eq('id', owner)
  if (profileError) { await client().storage.from('payid-profile-photos').remove([path]); throw profileError }
  const { error: metadataError } = await client().auth.updateUser({ data: { avatar_path: path } })
  if (metadataError) throw metadataError
  if (previousPath) await client().storage.from('payid-profile-photos').remove([previousPath])
  const { data, error } = await client().storage.from('payid-profile-photos').createSignedUrl(path, 60 * 60 * 24 * 7)
  throwIf(error)
  return { path, url: data.signedUrl }
}

export async function deleteProfilePhoto(path) {
  const owner = await userId()
  if (path) { const { error } = await client().storage.from('payid-profile-photos').remove([path]); throwIf(error) }
  const { error } = await client().from('profiles').update({ avatar_path: null }).eq('id', owner)
  throwIf(error)
  const { error: metadataError } = await client().auth.updateUser({ data: { avatar_path: null } })
  throwIf(metadataError)
}

export async function saveDemoPaymentCard(card) {
  const owner = await userId()
  const { data, error } = await client().from('payment_cards').insert({ user_id: owner, brand: card.brand || 'PayID', last_four: String(card.lastFour).slice(-4), expiry_month: card.expiryMonth || null, expiry_year: card.expiryYear || null, balance: Number(card.balance) || 0, is_demo: true }).select('*').single()
  throwIf(error)
  return { id: data.id, brand: data.brand, lastFour: data.last_four, balance: Number(data.balance), demo: true }
}

export async function listTransportCards() {
  const owner = await userId()
  const { data, error } = await client().from('transport_cards').select('*').eq('user_id', owner).order('created_at', { ascending: false })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, familyMemberId: row.family_member_id, type: row.operator, cardNumber: row.card_number, balance: Number(row.balance), lastRechargeDate: row.last_recharge_at }))
}

export async function createTransportCard(payload) {
  const owner = await userId()
  const { data, error } = await client().from('transport_cards').insert({ user_id: owner, family_member_id: payload.familyMemberId || null, operator: payload.type, card_number: payload.number, balance: Number(payload.balance) || 0 }).select('*').single()
  throwIf(error)
  return { id: data.id, familyMemberId: data.family_member_id, type: data.operator, cardNumber: data.card_number, balance: Number(data.balance), lastRechargeDate: data.last_recharge_at }
}

export async function updateTransportCardAssignment(id, familyMemberId = null) {
  const owner = await userId()
  const { data, error } = await client().from('transport_cards').update({ family_member_id: familyMemberId || null }).eq('user_id', owner).eq('id', id).select('*').single()
  throwIf(error)
  return { id: data.id, familyMemberId: data.family_member_id, type: data.operator, cardNumber: data.card_number, balance: Number(data.balance), lastRechargeDate: data.last_recharge_at }
}

export async function setTransportCardBalance(id, balance) {
  const owner = await userId()
  const amount = Number(balance)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('El saldo debe ser un monto válido.')
  const { data, error } = await client().from('transport_cards').update({ balance: amount, last_recharge_at: new Date().toISOString() }).eq('user_id', owner).eq('id', id).select('*').single()
  throwIf(error)
  return { id: data.id, familyMemberId: data.family_member_id, type: data.operator, cardNumber: data.card_number, balance: Number(data.balance), lastRechargeDate: data.last_recharge_at }
}

export async function listTransportTransactions() {
  const owner = await userId()
  const { data, error } = await client().from('transport_transactions').select('*, transport_cards(operator)').eq('user_id', owner).order('created_at', { ascending: false })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, cardId: row.transport_card_id, cardType: row.transport_cards?.operator || 'Transporte', amount: Number(row.amount), status: row.status, reference: row.reference, date: row.created_at, description: `Recarga ${row.transport_cards?.operator || 'transporte'}` }))
}

export async function rechargeTransportCard(transportCardId, paymentCardId, amount) {
  const { data, error } = await client().rpc('payid_recharge_transport', { p_transport_card_id: transportCardId, p_payment_card_id: paymentCardId, p_amount: amount })
  throwIf(error)
  return data
}

export async function listNotifications() {
  const owner = await userId()
  const { data, error } = await client().from('notifications').select('*').eq('user_id', owner).order('created_at', { ascending: false })
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, title: row.title, message: cleanActivityDescription(row.message), type: row.type, date: row.created_at, status: row.is_read ? 2 : 1, isRead: row.is_read, sourceActivityId: row.source_activity_id }))
}

export async function markNotificationRead(id = null) {
  const owner = await userId()
  let query = client().from('notifications').update({ is_read: true }).eq('user_id', owner)
  if (id) query = query.eq('id', id)
  const { error } = await query
  throwIf(error)
}

export async function createActivityEvent(entry) {
  const owner = await userId()
  const { data, error } = await client().from('activity_events').insert({ user_id: owner, kind: entry.kind, title: entry.title, detail: entry.detail || '', status: entry.status || 'registered', reference: entry.reference || '', metadata: entry.metadata || {}, occurred_at: entry.date || new Date().toISOString() }).select('id').single()
  throwIf(error)
  const reminder = entry.kind === 'document' && entry.metadata?.expirationDate
  const title = reminder ? `${entry.title} por vencer` : entry.kind === 'payment' ? `Gasto registrado: ${entry.title}` : entry.title
  const type = reminder ? 'reminder' : entry.kind === 'payment' || entry.kind === 'transport' ? 'movement' : 'system'
  const message = reminder ? `Fecha de vencimiento: ${entry.metadata.expirationDate}` : cleanActivityDescription(entry.detail) || 'Nueva actividad de tu cuenta PayID.'
  const notification = await client().from('notifications').insert({ user_id: owner, type, title, message, source_activity_id: data.id })
  throwIf(notification.error)
  return data.id
}

export async function listActivityEvents() {
  const owner = await userId()
  const { data, error } = await client().from('activity_events').select('*').eq('user_id', owner).order('occurred_at', { ascending: false }).limit(500)
  throwIf(error)
  return (data || []).map(row => ({ id: row.id, kind: row.kind, title: row.title, detail: row.detail, status: row.status, reference: row.reference, metadata: row.metadata, date: row.occurred_at }))
}

export async function getStudentCredential() {
  const owner = await userId()
  const { data, error } = await client().from('student_credentials').select('*').eq('user_id', owner).maybeSingle()
  throwIf(error)
  return data ? { educationType: data.education_type, institution: data.institution, program: data.program, studentCode: data.student_code, campus: data.campus, academicPeriod: data.academic_period, validUntil: data.valid_until, verificationStatus: data.verification_status } : null
}

export async function saveStudentCredential(profile) {
  const owner = await userId()
  const { data, error } = await client().from('student_credentials').upsert({ user_id: owner, education_type: profile.educationType, institution: profile.institution.trim(), program: profile.program.trim(), student_code: profile.studentCode.trim(), campus: profile.campus || '', academic_period: profile.academicPeriod || '', valid_until: profile.validUntil || null }, { onConflict: 'user_id' }).select('*').single()
  throwIf(error)
  return { educationType: data.education_type, institution: data.institution, program: data.program, studentCode: data.student_code, campus: data.campus, academicPeriod: data.academic_period, validUntil: data.valid_until, verificationStatus: data.verification_status }
}

export async function updateProfile(profile) {
  const auth = client().auth
  const { data: current, error: currentError } = await auth.getUser()
  throwIf(currentError)
  if (!current.user) throw new Error('Inicia sesión para actualizar el perfil.')
  const { data, error } = await auth.updateUser({ data: { nombre: profile.name.trim(), dni: profile.dni || null, fechaNacimiento: profile.birthDate || null } })
  throwIf(error)
  const { error: profileError } = await client().from('profiles').update({ full_name: profile.name.trim(), dni: profile.dni || null, birth_date: profile.birthDate || null }).eq('id', current.user.id)
  throwIf(profileError)
  return { id: data.user.id, nombre: profile.name.trim(), email: data.user.email, dni: profile.dni || '', fechaNacimiento: profile.birthDate || '' }
}

export async function signedDocumentUrl(path) {
  if (!path) return null
  const { data, error } = await client().storage.from('payid-documents').createSignedUrl(path, 60 * 10)
  throwIf(error)
  return data.signedUrl
}

export async function uploadDocumentFile(file, documentId) {
  const owner = await userId()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${owner}/${documentId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client().storage.from('payid-documents').upload(path, file, { upsert: false, contentType: file.type })
  throwIf(error)
  return path
}
