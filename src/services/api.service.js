import { getPayIdProfile, listDocuments, listNotifications, listPayments, listPaymentCards, listTransportCards } from '../shared/services/payidRepository.js'

const response = async promise => ({ data: await promise })

export default {
  getUsuario: () => response(getPayIdProfile()),
  getDocumentosPorUsuario: () => response(listDocuments()),
  getPagosPorUsuario: () => response(listPayments()),
  getNotificacionesPorUsuario: () => response(listNotifications()),
  getProfile: () => response(getPayIdProfile()),
  getTarjetasPorUsuario: () => response(listTransportCards()),
  getTarjetasDePago: () => response(listPaymentCards()),
}
