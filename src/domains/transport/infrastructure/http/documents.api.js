import { listTransportCards, setTransportCardBalance } from '../../../../shared/services/payidRepository.js'

export async function apiFindDocumentByUserID() { return listTransportCards() }
export async function apiFindTransportCardBalance(id) {
  const cards = await listTransportCards()
  const card = cards.find(item => String(item.id) === String(id))
  if (!card) throw new Error('No se encontr? la tarjeta de transporte.')
  return { balance: card.balance }
}
export async function apiPatchBalanceByDocumentID(id, payload) {
  const balance = typeof payload === 'number' ? payload : payload.balance
  return setTransportCardBalance(id, balance)
}
