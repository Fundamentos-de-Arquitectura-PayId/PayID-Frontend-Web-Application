import { createPayment, listPayments } from '../../../../shared/services/payidRepository.js'

export async function apiFindPaymentByUserID() { return listPayments() }
export async function apiCreatePayment(payment) {
  return createPayment({
    service: payment.servicio ?? payment.service ?? 'Pago PayID',
    category: payment.categoria ?? payment.category ?? 'Transporte',
    description: payment.descripcion ?? payment.description ?? '',
    method: payment.metodoPago ?? payment.method ?? 'Tarjeta PayID',
    amount: payment.monto ?? payment.amount ?? 0,
    date: payment.fecha ?? payment.date ?? new Date().toISOString(),
    reference: payment.referencia ?? payment.reference,
    familyMemberId: payment.familyMemberId ?? null,
    status: 'simulated',
  })
}
