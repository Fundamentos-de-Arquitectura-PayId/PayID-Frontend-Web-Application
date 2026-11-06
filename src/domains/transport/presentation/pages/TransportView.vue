<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowUpRight, BusFront, CalendarDays,
  CheckCircle2, ChevronRight, CircleAlert, CreditCard, Pencil, Plus, RefreshCw,
  UserRound, WalletCards, X,
} from 'lucide-vue-next'
import StyledSelect from '@/shared/ui/StyledSelect.component.vue'
import { recordActivity } from '@/shared/services/activityLedger.js'
import { createTransportCard, listFamilyMembers, listPaymentCards, listTransportCards, listTransportTransactions, rechargeTransportCard, updateTransportCardAssignment } from '@/shared/services/payidRepository.js'

const { locale } = useI18n()
const transportCards = ref([])
const paymentCards = ref([])
const familyMembers = ref([])
const transactions = ref([])
const loading = ref(true)
const pageError = ref('')
const paymentCardError = ref('')
const selectedCardId = ref('')
const selectedPaymentCardId = ref('')
const selectedAmount = ref(10)
const manualAmount = ref('')
const rechargeError = ref('')
const isRecharging = ref(false)
const showAddModal = ref(false)
const cardType = ref('Metropolitano')
const otherCardType = ref('')
const cardNumber = ref('')
const familyMemberId = ref('')
const addCardError = ref('')
const isAddingCard = ref(false)
const assignmentModalOpen = ref(false)
const assignmentCard = ref(null)
const assignmentMemberId = ref('')
const isSavingAssignment = ref(false)
const assignmentError = ref('')

const text = computed(() => locale.value === 'es' ? {
  eyebrow: 'PAYID · MOVILIDAD', title: 'Transporte', subtitle: 'Administra tus tarjetas, consulta saldos y recarga desde tu cuenta PayID.',
  totalBalance: 'Saldo en transporte', cards: 'Tarjetas vinculadas', transactions: 'Movimientos recientes',
  addCard: 'Agregar tarjeta', recharge: 'Recargar saldo', rechargeAction: 'Confirmar recarga',
  quickAmounts: 'Elige un monto', customAmount: 'Otro monto', amountPlaceholder: 'Ingresa el monto',
  transportCard: 'Tarjeta de transporte', paymentCard: 'Pagar con', choosePayment: 'Selecciona tu tarjeta PayID',
  noCards: 'Todavía no tienes tarjetas de transporte vinculadas.', addFirst: 'Agrega tu primera tarjeta para empezar a recargar.',
  noPaymentCards: 'No tienes una tarjeta PayID disponible para pagar la recarga.', addPaymentCard: 'Agregar tarjeta PayID',
  lowBalance: 'Saldo bajo', lastRecharge: 'Última recarga', balance: 'Saldo disponible',
  service: 'Movimiento', date: 'Fecha', amount: 'Monto', card: 'Tarjeta', emptyTransactions: 'Aún no hay recargas registradas.',
  loadError: 'No se pudieron cargar las tarjetas de transporte.', retry: 'Reintentar',
  addTitle: 'Vincular tarjeta de transporte', type: 'Tipo de tarjeta', number: 'Número de tarjeta', numberPlaceholder: 'Escribe el número de tu tarjeta',
  other: 'Otra tarjeta', cancel: 'Cancelar', save: 'Vincular tarjeta', close: 'Cerrar',
  selectCard: 'Selecciona una tarjeta de transporte.', selectPayment: 'Selecciona la tarjeta PayID que usarás.',
  amountError: 'Ingresa un monto mayor que cero.', insufficient: 'La tarjeta PayID no tiene saldo suficiente.',
  rechargeSuccess: 'Recarga realizada correctamente.', cardSuccess: 'Tarjeta vinculada correctamente.',
  rechargeFail: 'No se pudo procesar la recarga.', addFail: 'No se pudo vincular la tarjeta.',
  amount: 'Monto', lastFour: '••••', cardNumberRequired: 'Ingresa el número de la tarjeta.',
  transactionsPlural: 'recargas registradas',
} : {
  eyebrow: 'PAYID · MOBILITY', title: 'Transport', subtitle: 'Manage your cards, check balances and top up from your PayID account.',
  totalBalance: 'Transport balance', cards: 'Linked cards', transactions: 'Recent activity',
  addCard: 'Add card', recharge: 'Top up balance', rechargeAction: 'Confirm top up',
  quickAmounts: 'Choose an amount', customAmount: 'Other amount', amountPlaceholder: 'Enter amount',
  transportCard: 'Transport card', paymentCard: 'Pay with', choosePayment: 'Select your PayID card',
  noCards: 'You do not have any transport cards linked yet.', addFirst: 'Add your first card to start topping up.',
  noPaymentCards: 'You do not have a PayID card available to pay for the top up.', addPaymentCard: 'Add PayID card',
  lowBalance: 'Low balance', lastRecharge: 'Last top up', balance: 'Available balance',
  service: 'Activity', date: 'Date', amount: 'Amount', card: 'Card', emptyTransactions: 'No top ups recorded yet.',
  loadError: 'Transport cards could not be loaded.', retry: 'Try again',
  addTitle: 'Link a transport card', type: 'Card type', number: 'Card number', numberPlaceholder: 'Enter your card number',
  other: 'Other card', cancel: 'Cancel', save: 'Link card', close: 'Close',
  selectCard: 'Select a transport card.', selectPayment: 'Select the PayID card to use.',
  amountError: 'Enter an amount greater than zero.', insufficient: 'The PayID card balance is too low.',
  rechargeSuccess: 'Top up completed successfully.', cardSuccess: 'Card linked successfully.',
  rechargeFail: 'The top up could not be processed.', addFail: 'The card could not be linked.',
  amount: 'Amount', lastFour: '••••', cardNumberRequired: 'Enter the card number.',
  transactionsPlural: 'top ups recorded',
})

const cardTypeOptions = computed(() => [
  { value: 'Metropolitano', label: 'Metropolitano' },
  { value: 'Lima Pass', label: 'Lima Pass' },
  { value: 'Metro de Lima', label: 'Metro de Lima' },
  { value: 'Otro', label: text.value.other },
])
const requiredCardDigits = computed(() => cardType.value === 'Metropolitano' || cardType.value === 'Lima Pass' ? 10 : cardType.value === 'Metro de Lima' ? 8 : null)
const cardNumberLimit = computed(() => requiredCardDigits.value || 32)
const cardNumberPlaceholder = computed(() => requiredCardDigits.value ? 'Escribe los ' + requiredCardDigits.value + ' dígitos' : 'Código impreso en la tarjeta')
const cardNumberHint = computed(() => {
  if (cardType.value === 'Metropolitano' || cardType.value === 'Lima Pass') return 'Ingresa los 10 dígitos del código que aparece al reverso de la tarjeta.'
  if (cardType.value === 'Metro de Lima') return 'Ingresa 8 dígitos. Si tu tarjeta muestra 7, agrega un 0 al inicio.'
  return 'Ingresa el código impreso en la tarjeta, sin espacios.'
})
const familyMemberOptions = computed(() => [
  { value: '', label: locale.value === 'es' ? 'Mi cuenta' : 'My account' },
  ...familyMembers.value.map((member) => ({ value: member.id, label: `${member.name} · ${member.relationship}` })),
])
const paymentCardOptions = computed(() => [
  { value: '', label: text.value.choosePayment },
  ...paymentCards.value.map((card) => ({
    value: String(card.id),
    label: `${card.brand || 'PayID'} ${text.value.lastFour} ${card.lastFour} · S/ ${money(card.balance)}`,
  })),
])
const selectedCard = computed(() => transportCards.value.find((card) => String(card.id) === String(selectedCardId.value)) || null)
const selectedPaymentCard = computed(() => paymentCards.value.find((card) => String(card.id) === String(selectedPaymentCardId.value)) || null)
const totalBalance = computed(() => transportCards.value.reduce((sum, card) => sum + card.balance, 0))
const selectedRechargeAmount = computed(() => Number(manualAmount.value || selectedAmount.value || 0))
const lowBalanceCards = computed(() => transportCards.value.filter((card) => card.balance < 10).length)

function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {}
    return user.id ?? user.usuarioId ?? user.userId ?? user.Id ?? null
  } catch { return null }
}

function asList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.$values)) return value.$values
  return []
}

function normalizeTransportCard(card) {
  return {
    id: String(card.id ?? card.Id),
    userId: card.userId ?? card.UserId,
    familyMemberId: card.familyMemberId ?? card.FamilyMemberId ?? null,
    familyMemberName: card.familyMemberName ?? card.FamilyMemberName ?? '',
    type: card.type ?? card.Type ?? 'Tarjeta de transporte',
    balance: Number(card.balance ?? card.Balance ?? 0) || 0,
    number: String(card.cardNumber ?? card.CardNumber ?? card.numero ?? card.Number ?? ''),
    lastRechargeDate: card.lastRechargeDate ?? card.LastRechargeDate ?? '',
  }
}

function normalizePaymentCard(card) {
  return {
    id: String(card.id ?? card.Id),
    brand: card.brand ?? card.Brand ?? 'PayID',
    lastFour: String(card.lastFour ?? card.LastFour ?? card.fullNumber ?? card.FullNumber ?? '').slice(-4),
    balance: Number(card.balance ?? card.Balance ?? 0) || 0,
  }
}

function familyNameFor(card) {
  return card.familyMemberName || familyMembers.value.find((member) => String(member.id ?? member.Id) === String(card.familyMemberId))?.name || ''
}

function openAssignment(card) {
  assignmentCard.value = card
  assignmentMemberId.value = card.familyMemberId || ''
  assignmentError.value = ''
  assignmentModalOpen.value = true
}

async function saveAssignment() {
  if (!assignmentCard.value) return
  isSavingAssignment.value = true
  assignmentError.value = ''
  try {
    const updated = await updateTransportCardAssignment(assignmentCard.value.id, assignmentMemberId.value || null)
    transportCards.value = transportCards.value.map(card => card.id === updated.id ? normalizeTransportCard(updated) : card)
    selectedCardId.value = updated.id
    assignmentModalOpen.value = false
    notify(locale.value === 'es' ? 'Asignación de tarjeta actualizada.' : 'Card assignment updated.')
  } catch (cause) {
    assignmentError.value = cause.message || (locale.value === 'es' ? 'No se pudo actualizar la asignación.' : 'The assignment could not be updated.')
  } finally { isSavingAssignment.value = false }
}

function money(value) {
  return new Intl.NumberFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function maskNumber(value) {
  const digits = String(value || '').replace(/\s/g, '')
  return digits ? `••••  ••••  ${digits.slice(-4)}` : 'Tarjeta vinculada'
}

function notify(message) {
  window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message } }))
}

async function loadTransportData() {
  loading.value = true
  pageError.value = ''
  paymentCardError.value = ''
  try {
    const [transport, paymentMethods, movements, members] = await Promise.all([listTransportCards(), listPaymentCards(), listTransportTransactions(), listFamilyMembers()])
    transportCards.value = transport.map(normalizeTransportCard)
    paymentCards.value = paymentMethods.map(normalizePaymentCard)
    transactions.value = movements
    familyMembers.value = members
    if (!selectedCardId.value || !transportCards.value.some(card => card.id === selectedCardId.value)) selectedCardId.value = transportCards.value[0]?.id || ''
    if (!selectedPaymentCardId.value || !paymentCards.value.some(card => card.id === selectedPaymentCardId.value)) selectedPaymentCardId.value = paymentCards.value[0]?.id || ''
  } catch (cause) {
    transportCards.value = []; paymentCards.value = []; transactions.value = []
    pageError.value = cause.message || text.value.loadFail
  } finally { loading.value = false }
}
function chooseTransportCard(id) {
  selectedCardId.value = id
  rechargeError.value = ''
}

function chooseAmount(value) {
  selectedAmount.value = value
  manualAmount.value = ''
  rechargeError.value = ''
}

async function recharge() {
  rechargeError.value = ''
  if (!selectedCard.value) { rechargeError.value = text.value.selectCard; return }
  if (!selectedPaymentCard.value) { rechargeError.value = text.value.noPaymentCards; return }
  const amount = selectedRechargeAmount.value
  if (!Number.isFinite(amount) || amount <= 0) { rechargeError.value = text.value.amountError; return }
  isRecharging.value = true
  const cardType = selectedCard.value.type
  const cardId = selectedCard.value.id
  try {
    await rechargeTransportCard(cardId, selectedPaymentCard.value.id, amount)
    await loadTransportData()
    await recordActivity({ kind: 'transport', title: 'Recarga ' + cardType, detail: 'Monto: S/ ' + money(amount), date: new Date().toISOString(), status: 'Registrado', reference: cardId })
    manualAmount.value = ''
    selectedAmount.value = 10
    notify(locale.value === 'es' ? 'Recarga registrada correctamente.' : 'Top-up recorded successfully.')
  } catch (cause) { rechargeError.value = cause.message || text.value.rechargeFail }
  finally { isRecharging.value = false }
}
function openAddCard() {
  cardType.value = 'Metropolitano'
  otherCardType.value = ''
  cardNumber.value = ''
  familyMemberId.value = ''
  addCardError.value = ''
  showAddModal.value = true
}

watch(cardType, () => { cardNumber.value = ''; addCardError.value = '' })

function updateCardNumber(event) {
  const raw = event.target.value
  cardNumber.value = requiredCardDigits.value
    ? raw.replace(/\D/g, '').slice(0, requiredCardDigits.value)
    : raw.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 32)
  addCardError.value = ''
}

async function addTransportCard() {
  const type = cardType.value === 'Otro' ? otherCardType.value.trim() : cardType.value
  const normalizedNumber = requiredCardDigits.value ? cardNumber.value.replace(/\D/g, '') : cardNumber.value.trim()
  if (!normalizedNumber) { addCardError.value = text.value.cardNumberRequired; return }
  if (requiredCardDigits.value && normalizedNumber.length !== requiredCardDigits.value) {
    addCardError.value = locale.value === 'es' ? `El número debe tener exactamente ${requiredCardDigits.value} dígitos.` : `The card number must contain exactly ${requiredCardDigits.value} digits.`
    return
  }
  if (!type) { addCardError.value = locale.value === 'es' ? 'Indica el tipo de tarjeta.' : 'Enter the card type.'; return }
  isAddingCard.value = true
  addCardError.value = ''
  try {
    const card = normalizeTransportCard(await createTransportCard({ type, number: normalizedNumber, balance: 0, familyMemberId: familyMemberId.value || null }))
    transportCards.value = [card, ...transportCards.value]
    selectedCardId.value = card.id
    await recordActivity({ kind: 'transport', title: 'Tarjeta ' + card.type + ' vinculada', detail: maskNumber(card.number), status: 'Registrada', reference: card.id })
    showAddModal.value = false
    notify(locale.value === 'es' ? 'Tarjeta a?adida y guardada en tu cuenta PayID.' : 'Card added to your PayID account.')
  } catch (cause) { addCardError.value = cause.message || text.value.addFail }
  finally { isAddingCard.value = false }
}
onMounted(loadTransportData)
</script>

<template>
  <main class="transport-page">
    <header class="transport-heading">
      <div><span class="transport-eyebrow"><BusFront :size="14" />{{ text.eyebrow }}</span><h1>{{ text.title }}</h1><p>{{ text.subtitle }}</p></div>
      <button class="add-transport-card" type="button" @click="openAddCard"><Plus :size="17" />{{ text.addCard }}</button>
    </header>


    <div v-if="pageError" class="transport-error" role="alert"><CircleAlert :size="18" /><span>{{ pageError }}</span><button type="button" @click="loadTransportData"><RefreshCw :size="15" />{{ text.retry }}</button></div>

    <template v-else>
      <section class="transport-stats">
        <article class="transport-stat"><span class="transport-stat-icon green"><WalletCards :size="18" /></span><div><small>{{ text.totalBalance }}</small><strong>{{ loading ? '—' : `S/ ${money(totalBalance)}` }}</strong><span>{{ loading ? ' ' : (lowBalanceCards ? `${lowBalanceCards} ${text.lowBalance.toLocaleLowerCase(locale)}` : text.balance) }}</span></div></article>
        <article class="transport-stat"><span class="transport-stat-icon blue"><CreditCard :size="18" /></span><div><small>{{ text.cards }}</small><strong>{{ loading ? '—' : transportCards.length }}</strong><span>{{ loading ? ' ' : text.transportCard }}</span></div></article>
        <article class="transport-stat"><span class="transport-stat-icon amber"><ArrowUpRight :size="18" /></span><div><small>{{ text.transactions }}</small><strong>{{ loading ? '—' : transactions.length }}</strong><span>{{ loading ? ' ' : text.transactionsPlural }}</span></div></article>
      </section>

      <section class="transport-grid">
        <article class="panel cards-panel">
          <header class="panel-heading"><div><span class="panel-kicker">PAYID WALLET</span><h2>{{ text.cards }}</h2></div><button class="small-add-button" type="button" @click="openAddCard"><Plus :size="15" />{{ text.addCard }}</button></header>
          <div v-if="loading" class="panel-message"><span class="loading-spinner"></span>{{ locale === 'es' ? 'Cargando tarjetas…' : 'Loading cards…' }}</div>
          <div v-else-if="!transportCards.length" class="empty-cards"><span class="empty-card-icon"><BusFront :size="22" /></span><strong>{{ text.noCards }}</strong><p>{{ text.addFirst }}</p><button type="button" @click="openAddCard"><Plus :size="16" />{{ text.addCard }}</button></div>
          <div v-else class="transport-card-list">
            <div v-for="(card, index) in transportCards" :key="card.id" class="transport-card-item">
            <button class="transport-card" :class="[{ selected: selectedCardId === card.id }, `card-variant-${index % 3}`]" type="button" @click="chooseTransportCard(card.id)">
              <span class="card-orbit orbit-one"></span><span class="card-orbit orbit-two"></span>
              <span class="card-glow" aria-hidden="true"></span>
              <span class="transport-card-top"><span class="transport-brand"><span class="brand-mark">P</span><strong>PayID</strong><small>TRANSPORT</small></span><span class="card-type-label"><BusFront :size="12"/>{{ card.type }}</span></span>
              <span class="card-number-row"><span class="card-chip" aria-hidden="true"><i></i></span><span class="transport-card-number">{{ maskNumber(card.number) }}</span><span class="contactless-mark" aria-hidden="true">)))</span></span>
              <span class="transport-card-bottom"><span><small>SALDO DISPONIBLE</small><strong><small class="currency-prefix">S/</small> {{ money(card.balance) }}</strong></span><span class="card-state" :class="{ low: card.balance < 10 }"><i></i>{{ card.balance < 10 ? text.lowBalance : (locale === 'es' ? 'ACTIVA' : 'ACTIVE') }}</span></span>
              <span class="transport-card-meta"><span><small>{{ familyNameFor(card) ? 'ASIGNADA A' : (locale === 'es' ? 'TITULAR' : 'CARDHOLDER') }}</small><strong>{{ familyNameFor(card) || 'Mi cuenta PayID' }}</strong></span><span><small>{{ locale === 'es' ? 'N.º DE TARJETA' : 'CARD NUMBER' }}</small><strong>···· {{ String(card.number || '').slice(-4) }}</strong></span></span>
              <span class="transport-card-action"><span>{{ selectedCardId === card.id ? (locale === 'es' ? 'Seleccionada para recarga' : 'Selected for top up') : (locale === 'es' ? 'Seleccionar tarjeta' : 'Select card') }}</span><ChevronRight :size="15" /></span>
            </button>
            <button class="assignment-button" type="button" @click="openAssignment(card)"><UserRound :size="14"/><span>{{ familyNameFor(card) ? `Asignada a ${familyNameFor(card)}` : (locale === 'es' ? 'Asignar familiar' : 'Assign family member') }}</span><Pencil :size="13"/></button>
            </div>
          </div>
        </article>

        <article class="panel recharge-panel">
          <header class="panel-heading"><div><span class="panel-kicker">RECARGA SEGURA</span><h2>{{ text.recharge }}</h2><p>{{ locale === 'es' ? 'Elige una tarjeta y un monto para continuar.' : 'Choose a card and amount to continue.' }}</p></div><span class="secure-icon"><CheckCircle2 :size="18" /></span></header>
          <div v-if="loading" class="panel-message"><span class="loading-spinner"></span>{{ locale === 'es' ? 'Preparando recarga…' : 'Preparing top up…' }}</div>
          <template v-else>
            <div v-if="transportCards.length" class="recharge-form">
              <label class="field-label">{{ text.transportCard }}<StyledSelect v-model="selectedCardId" :options="transportCards.map((card) => ({ value: card.id, label: `${card.type} · ${maskNumber(card.number)} · S/ ${money(card.balance)}` }))" :placeholder="text.transportCard" :aria-label="text.transportCard" /></label>
              <div class="amount-section"><span class="field-label">{{ text.quickAmounts }}</span><div class="amount-options"><button v-for="amount in [5, 10, 20, 30]" :key="amount" type="button" :class="{ active: selectedAmount === amount && !manualAmount }" @click="chooseAmount(amount)">S/ {{ amount }}</button></div></div>
              <label class="field-label">{{ text.customAmount }}<span class="amount-input-wrap"><span>S/</span><input v-model="manualAmount" type="number" inputmode="decimal" min="0.5" step="0.5" :placeholder="text.amountPlaceholder" @input="selectedAmount = null; rechargeError = ''" /></span></label>
              <label class="field-label">{{ text.paymentCard }}<StyledSelect v-model="selectedPaymentCardId" :options="paymentCardOptions" :placeholder="text.choosePayment" :aria-label="text.paymentCard" /></label>
              <div v-if="selectedPaymentCard" class="payment-card-balance"><CreditCard :size="16" /><span>{{ selectedPaymentCard.brand }} {{ text.lastFour }} {{ selectedPaymentCard.lastFour }}</span><strong>S/ {{ money(selectedPaymentCard.balance) }}</strong></div>
              <div v-else class="payment-card-note"><AlertTriangle :size="15" /><span>{{ paymentCardError || text.noPaymentCards }}</span><router-link :to="{ name: 'payment-demo' }">{{ text.addPaymentCard }}</router-link></div>
              <p v-if="rechargeError" class="form-error" role="alert"><CircleAlert :size="15" />{{ rechargeError }}</p>
              <button class="recharge-submit" type="button" :disabled="isRecharging || !selectedCard || !selectedPaymentCard" @click="recharge"><span v-if="isRecharging" class="button-spinner"></span><ArrowDownLeft v-else :size="17" />{{ isRecharging ? (locale === 'es' ? 'Procesando…' : 'Processing…') : text.rechargeAction }}</button>
            </div>
            <div v-else class="recharge-empty"><BusFront :size="21" /><p>{{ text.addFirst }}</p><button type="button" @click="openAddCard">{{ text.addCard }}</button></div>
          </template>
        </article>
      </section>

      <section class="panel activity-panel">
        <header class="panel-heading activity-heading"><div><span class="panel-kicker">MOVIMIENTOS DE TU CUENTA</span><h2>{{ text.transactions }}</h2><p>{{ transactions.length }} {{ text.transactionsPlural }}</p></div><span class="activity-badge"><Activity :size="15" /><span>{{ transportCards.length }} {{ text.cards.toLocaleLowerCase(locale) }}</span></span></header>
        <div v-if="loading" class="panel-message"><span class="loading-spinner"></span>{{ locale === 'es' ? 'Cargando movimientos…' : 'Loading activity…' }}</div>
        <div v-else-if="transactions.length" class="transactions-table-wrap"><table><thead><tr><th>{{ text.service }}</th><th>{{ text.card }}</th><th>{{ text.date }}</th><th>{{ text.amount }}</th></tr></thead><tbody><tr v-for="transaction in transactions.slice(0, 10)" :key="transaction.id"><td><span class="transaction-title"><span class="transaction-icon"><ArrowDownLeft :size="15" /></span><strong>{{ transaction.description }}</strong></span></td><td>{{ transaction.cardType }}</td><td>{{ formatDate(transaction.date) }}</td><td class="transaction-amount">+ S/ {{ money(transaction.amount) }}</td></tr></tbody></table></div>
        <div v-else class="empty-activity"><span><CalendarDays :size="20" /></span><strong>{{ text.emptyTransactions }}</strong><p>{{ locale === 'es' ? 'Tus recargas aparecerán aquí.' : 'Your top ups will appear here.' }}</p></div>
      </section>
    </template>

    <Teleport to="body"><div v-if="assignmentModalOpen" class="transport-modal-backdrop assignment-backdrop" @click.self="assignmentModalOpen = false"><section class="transport-modal assignment-modal" role="dialog" aria-modal="true" :aria-label="locale === 'es' ? 'Cambiar asignación de tarjeta' : 'Change card assignment'"><header><span class="modal-symbol"><UserRound :size="19" /></span><div><h2>{{ locale === 'es' ? 'Asignar tarjeta' : 'Assign card' }}</h2><p>{{ assignmentCard?.type }} · {{ maskNumber(assignmentCard?.number) }}</p></div><button class="modal-close" type="button" :aria-label="text.close" @click="assignmentModalOpen = false"><X :size="18" /></button></header><form @submit.prevent="saveAssignment"><label class="field-label">{{ locale === 'es' ? 'Titular de la tarjeta' : 'Card holder' }}<StyledSelect v-model="assignmentMemberId" :options="familyMemberOptions" :aria-label="locale === 'es' ? 'Titular de la tarjeta' : 'Card holder'" /></label><small class="family-assignment-hint assignment-help">{{ locale === 'es' ? 'Elige “Mi cuenta” para quitar la asignación al familiar.' : 'Choose “My account” to unassign this card from a family member.' }}</small><p v-if="assignmentError" class="form-error" role="alert"><CircleAlert :size="15" />{{ assignmentError }}</p><footer><button class="modal-cancel" type="button" @click="assignmentModalOpen = false">{{ text.cancel }}</button><button class="recharge-submit" type="submit" :disabled="isSavingAssignment"><span v-if="isSavingAssignment" class="button-spinner"></span><UserRound v-else :size="15" />{{ isSavingAssignment ? (locale === 'es' ? 'Guardando…' : 'Saving…') : (locale === 'es' ? 'Guardar asignación' : 'Save assignment') }}</button></footer></form></section></div></Teleport>
    <Teleport to="body"><div v-if="showAddModal" class="transport-modal-backdrop" @click.self="showAddModal = false"><section class="transport-modal" role="dialog" aria-modal="true" :aria-label="text.addTitle"><header><span class="modal-symbol"><BusFront :size="19" /></span><div><h2>{{ text.addTitle }}</h2><p>{{ locale === 'es' ? 'Vincúlala para consultar saldo y recargar.' : 'Link it to check the balance and top up.' }}</p></div><button class="modal-close" type="button" :aria-label="text.close" @click="showAddModal = false"><X :size="18" /></button></header><form @submit.prevent="addTransportCard"><label class="field-label">{{ text.type }}<StyledSelect v-model="cardType" :options="cardTypeOptions" :placeholder="text.type" :aria-label="text.type" /></label><label v-if="cardType === 'Otro'" class="field-label">{{ locale === 'es' ? 'Nombre de tarjeta' : 'Card name' }}<input v-model="otherCardType" type="text" maxlength="40" /></label><label class="field-label">{{ text.number }}<div class="card-number-control"><input :value="cardNumber" type="text" :inputmode="requiredCardDigits ? 'numeric' : 'text'" autocomplete="off" :maxlength="cardNumberLimit" :placeholder="cardNumberPlaceholder" aria-describedby="card-number-hint" @input="updateCardNumber" /><span>{{ cardNumber.length }}/{{ cardNumberLimit }}</span></div><small id="card-number-hint" class="card-number-hint">{{ cardNumberHint }}</small></label><label class="field-label">{{ locale === 'es' ? 'Asignar tarjeta a' : 'Assign card to' }}<StyledSelect v-model="familyMemberId" :options="familyMemberOptions" :aria-label="locale === 'es' ? 'Asignar tarjeta a familiar' : 'Assign card to family member'" /></label><small v-if="!familyMembers.length" class="family-assignment-hint">{{ locale === 'es' ? 'Agrega familiares desde' : 'Add family members in' }} <router-link :to="{ name: 'family' }" @click="showAddModal = false">{{ locale === 'es' ? 'Mi familia' : 'My family' }}</router-link>.</small><p v-if="addCardError" class="form-error" role="alert"><CircleAlert :size="15" />{{ addCardError }}</p><footer><button class="modal-cancel" type="button" @click="showAddModal = false">{{ text.cancel }}</button><button class="recharge-submit" type="submit" :disabled="isAddingCard"><span v-if="isAddingCard" class="button-spinner"></span><Plus v-else :size="16" />{{ isAddingCard ? (locale === 'es' ? 'Guardando…' : 'Saving…') : text.save }}</button></footer></form></section></div></Teleport>
  </main>
</template>

<style scoped>
.transport-page{display:flex;min-height:100%;flex-direction:column;gap:19px;padding:28px 32px 36px;background:#f5f7f6;color:#26372c}.transport-heading{display:flex;align-items:center;justify-content:space-between;gap:18px}.transport-eyebrow{display:flex;align-items:center;gap:7px;color:#68826d;font-size:9px;font-weight:750;letter-spacing:.13em}.transport-heading h1{margin:8px 0 0;color:#26392d;font-size:27px;font-weight:650;letter-spacing:-.04em}.transport-heading p{margin:6px 0 0;color:#78857c;font-size:13px}.add-transport-card,.small-add-button{display:inline-flex;min-height:41px;align-items:center;justify-content:center;gap:8px;padding:0 14px;border:1px solid #315a43;border-radius:10px;background:#315a43;color:#fff;font-family:inherit;font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background .16s,transform .16s,box-shadow .16s}.add-transport-card:hover,.small-add-button:hover{transform:translateY(-1px);background:#244a32;box-shadow:0 5px 12px #315a4325}.small-add-button{min-height:34px;padding:0 10px;border-color:#e0e8e1;background:#fff;color:#526b58;font-size:11px}.small-add-button:hover{border-color:#bfd1c2;background:#f3f8f4;color:#315a43;box-shadow:none}
.transport-error{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #efd6d4;border-radius:11px;background:#fff6f5;color:#99534d;font-size:12px}.transport-error>span{flex:1}.transport-error button{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #e8cfcd;border-radius:8px;background:#fff;color:#8f514b;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer}
.transport-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.transport-stat{display:flex;min-height:91px;align-items:center;gap:13px;padding:15px 17px;border:1px solid #e7ede8;border-radius:14px;background:#fff;box-shadow:0 3px 11px rgba(31,50,38,.035)}.transport-stat-icon{display:grid;width:38px;height:38px;flex:none;place-items:center;border-radius:11px}.transport-stat-icon.green{background:#edf7f0;color:#57946a}.transport-stat-icon.blue{background:#edf3fa;color:#6c8ab2}.transport-stat-icon.amber{background:#fbf3e8;color:#c28e49}.transport-stat>div{display:flex;min-width:0;flex-direction:column;gap:4px}.transport-stat small{color:#758279;font-size:11px}.transport-stat strong{overflow:hidden;color:#2e4134;font-size:20px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.transport-stat span:last-child{color:#98a39b;font-size:9px}
.transport-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr);align-items:start;gap:15px}.panel{min-width:0;border:1px solid #e7ede8;border-radius:15px;background:#fff;box-shadow:0 4px 15px rgba(31,50,38,.04)}.cards-panel,.recharge-panel,.activity-panel{padding:18px}.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}.panel-heading h2{margin:5px 0 0;color:#304235;font-size:16px;font-weight:650}.panel-heading p{margin:5px 0 0;color:#87938b;font-size:11px}.panel-kicker{color:#98a39b;font-size:9px;font-weight:750;letter-spacing:.11em}.secure-icon{display:grid;width:33px;height:33px;flex:none;place-items:center;border-radius:10px;background:#edf7ef;color:#5b9165}
.transport-card-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:11px}.transport-card{position:relative;isolation:isolate;display:flex;min-width:0;min-height:178px;flex-direction:column;justify-content:space-between;overflow:hidden;padding:14px 15px;border:1px solid rgba(255,255,255,.15);border-radius:14px;background:radial-gradient(circle at 91% 12%,rgba(255,255,255,.18),transparent 31%),linear-gradient(135deg,#315a43,#1e412e);color:#fff;text-align:left;cursor:pointer;transition:transform .17s,box-shadow .17s,border-color .17s}.transport-card:hover{transform:translateY(-2px);box-shadow:0 9px 18px #214a3630}.transport-card.selected{outline:2px solid #7eaa87;outline-offset:2px}.transport-card.card-variant-1{background:radial-gradient(circle at 91% 12%,rgba(255,255,255,.16),transparent 31%),linear-gradient(135deg,#365f70,#234451)}.transport-card.card-variant-2{background:radial-gradient(circle at 91% 12%,rgba(255,255,255,.18),transparent 31%),linear-gradient(135deg,#56644c,#34472e)}.card-orbit{position:absolute;z-index:-1;border:1px solid rgba(255,255,255,.1);border-radius:50%;pointer-events:none}.orbit-one{top:-64px;right:10%;width:145px;height:145px;box-shadow:0 0 0 13px rgba(255,255,255,.025),0 0 0 27px rgba(255,255,255,.02)}.orbit-two{right:-60px;bottom:-110px;width:175px;height:175px}.transport-card-top,.transport-brand{display:flex;align-items:center}.transport-card-top{justify-content:space-between;gap:10px}.transport-brand{gap:7px}.transport-brand strong{font-size:12px;font-weight:650}.brand-mark{display:grid;width:24px;height:24px;place-items:center;border:1px solid #ffffff66;border-radius:8px;background:#ffffff20;font-size:11px;font-weight:700}.card-type-label{max-width:55%;overflow:hidden;padding:5px 8px;border:1px solid #ffffff35;border-radius:99px;background:#142c2330;color:#eff7f0;font-size:8px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.transport-card-number{color:#f0f7f1;font-size:14px;font-weight:550;letter-spacing:.1em}.transport-card-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.transport-card-bottom>span:first-child{display:flex;flex-direction:column;gap:4px}.transport-card-bottom small{color:#ccded0;font-size:7px;font-weight:650;letter-spacing:.12em}.transport-card-bottom strong{color:#fff;font-size:19px;font-weight:650;letter-spacing:-.03em}.card-state{padding:5px 7px;border:1px solid #ffffff30;border-radius:7px;background:#ffffff18;color:#e6f0e7;font-size:8px;font-weight:650}.card-state.low{border-color:#f8d78a55;background:#f8d78a22;color:#ffe5a4}.transport-card-action{display:flex;align-items:center;justify-content:flex-end;gap:3px;margin-top:3px;color:#d5e7d8;font-size:9px;font-weight:550}
.empty-cards,.recharge-empty,.empty-activity{display:flex;min-height:185px;flex-direction:column;align-items:center;justify-content:center;text-align:center}.empty-card-icon,.empty-activity>span{display:grid;width:43px;height:43px;place-items:center;margin-bottom:10px;border-radius:13px;background:#edf4ef;color:#6b8b70}.empty-cards strong,.empty-activity strong{color:#526257;font-size:12px;font-weight:600}.empty-cards p,.empty-activity p,.recharge-empty p{margin:5px 0 12px;color:#929d95;font-size:10px}.empty-cards button,.recharge-empty button{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid #dce7dd;border-radius:8px;background:#fff;color:#47674d;font-family:inherit;font-size:10px;font-weight:600;cursor:pointer}.empty-cards button:hover,.recharge-empty button:hover{background:#f2f7f3}
.recharge-form{display:flex;flex-direction:column;gap:14px}.field-label{display:flex;min-width:0;flex-direction:column;gap:7px;color:#5e6d62;font-size:11px;font-weight:600}.field-label input{width:100%;height:42px;padding:0 11px;border:1px solid #dfe7e0;border-radius:9px;background:#fbfcfb;color:#35463a;font:inherit;font-size:12px;outline:0;transition:border-color .16s,box-shadow .16s}.field-label input:focus{border-color:#89aa8e;background:#fff;box-shadow:0 0 0 3px #315a4310}.amount-section{display:flex;flex-direction:column;gap:8px}.amount-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.amount-options button{height:36px;border:1px solid #e1e9e2;border-radius:9px;background:#fff;color:#647268;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s}.amount-options button:hover{border-color:#bfd2c2;background:#f5f9f5;color:#315a43}.amount-options button.active{border-color:#a6c0a9;background:#edf5ee;color:#315a43}.amount-input-wrap{display:flex;height:42px;align-items:center;gap:8px;padding-left:11px;border:1px solid #dfe7e0;border-radius:9px;background:#fbfcfb;color:#8b998e}.amount-input-wrap:focus-within{border-color:#89aa8e;box-shadow:0 0 0 3px #315a4310}.amount-input-wrap input{height:39px;padding-left:0;border:0;background:transparent}.amount-input-wrap input:focus{box-shadow:none}.payment-card-balance{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #edf1ed;border-radius:9px;background:#fafcfa;color:#738178;font-size:10px}.payment-card-balance svg{flex:none;color:#73907a}.payment-card-balance span{flex:1}.payment-card-balance strong{color:#435849;font-size:11px}.payment-card-note{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:9px 10px;border:1px solid #f0e2c8;border-radius:9px;background:#fffbf3;color:#927345;font-size:10px}.payment-card-note span{flex:1}.payment-card-note a{color:#426a4a;font-weight:650;text-decoration:none}.payment-card-note a:hover{text-decoration:underline}.recharge-submit{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:8px;padding:0 13px;border:1px solid #315a43;border-radius:9px;background:linear-gradient(135deg,#416f51,#294b36);color:#fff;font-family:inherit;font-size:11px;font-weight:650;cursor:pointer;box-shadow:0 4px 10px #315a431b;transition:background .16s,transform .16s,box-shadow .16s}.recharge-submit:hover:not(:disabled){transform:translateY(-1px);background:linear-gradient(135deg,#315a43,#1f3f2b);box-shadow:0 6px 13px #315a4327}.recharge-submit:disabled{opacity:.62;cursor:not-allowed;box-shadow:none}.form-error{display:flex;align-items:flex-start;gap:7px;margin:0;padding:9px 10px;border:1px solid #f0d7d5;border-radius:8px;background:#fff5f4;color:#a34d49;font-size:10px}.form-error svg{flex:none}.button-spinner,.loading-spinner{width:15px;height:15px;border:2px solid #ffffff60;border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}.loading-spinner{border-color:#dce7de;border-top-color:#477651}@keyframes spin{to{transform:rotate(360deg)}}.panel-message{display:flex;min-height:180px;align-items:center;justify-content:center;gap:8px;color:#849087;font-size:11px}
.activity-panel{padding:0}.activity-heading{align-items:center;margin:0;padding:17px 19px;border-bottom:1px solid #edf0ed}.activity-badge{display:flex;align-items:center;gap:6px;color:#7f8c82;font-size:10px}.activity-badge svg{width:15px;height:15px;color:#719078}.transactions-table-wrap{width:100%;overflow-x:auto}.transactions-table-wrap table{width:100%;min-width:600px;border-collapse:collapse;text-align:left}.transactions-table-wrap th{height:38px;padding:0 16px;background:#f7f9f7;color:#859188;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.transactions-table-wrap td{height:54px;padding:9px 16px;border-top:1px solid #edf0ed;color:#67756b;font-size:11px;white-space:nowrap}.transactions-table-wrap tbody tr:hover{background:#fafcfa}.transaction-title{display:flex;align-items:center;gap:9px;color:#405246}.transaction-title strong{font-size:11px;font-weight:550}.transaction-icon{display:grid;width:29px;height:29px;place-items:center;border-radius:9px;background:#edf6ef;color:#61906b}.transaction-amount{text-align:right;color:#4e7958!important;font-size:12px!important;font-weight:650!important;font-variant-numeric:tabular-nums}.transactions-table-wrap th:last-child,.transactions-table-wrap td:last-child{text-align:right}.empty-activity{min-height:150px}
.transport-modal-backdrop{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;overflow-y:auto;padding:20px;background:rgba(18,29,22,.48);backdrop-filter:blur(4px)}.transport-modal{width:min(100%,440px);max-height:90vh;overflow:auto;border:1px solid #e5ebe6;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(16,35,24,.24)}.transport-modal>header{display:flex;align-items:center;gap:11px;padding:17px 19px;border-bottom:1px solid #edf0ed}.modal-symbol{display:grid;width:39px;height:39px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#53785a}.transport-modal>header>div{min-width:0;flex:1}.transport-modal h2{margin:0;color:#304235;font-size:15px}.transport-modal header p{margin:4px 0 0;color:#89958c;font-size:10px}.modal-close{display:grid;width:31px;height:31px;place-items:center;border:1px solid #e6ece7;border-radius:8px;background:#fff;color:#738078;cursor:pointer}.transport-modal form{display:flex;flex-direction:column;gap:14px;padding:18px 19px 20px}.transport-modal form footer{display:flex;justify-content:flex-end;gap:8px;padding-top:13px;border-top:1px solid #edf0ed}.modal-cancel{min-height:40px;padding:0 13px;border:1px solid #e1e8e2;border-radius:9px;background:#fff;color:#657369;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer}.modal-cancel:hover{background:#f7f9f7}
@media(max-width:1050px){.transport-page{padding:24px 22px 30px}.transport-grid{grid-template-columns:minmax(0,1fr)}}@media(max-width:680px){.transport-page{gap:15px;padding:19px 14px 26px}.transport-heading{align-items:flex-start}.transport-heading h1{font-size:23px}.transport-heading p{max-width:42ch;font-size:12px}.add-transport-card{min-height:37px;padding:0 10px;font-size:10px}.transport-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.transport-stat{min-height:83px;padding:11px}.transport-stat-icon{width:33px;height:33px}.transport-stat strong{font-size:17px}.transport-stat small{font-size:10px}.transport-stat span:last-child{font-size:8px}.cards-panel,.recharge-panel{padding:15px}.transport-card-list{grid-template-columns:1fr}.activity-heading{padding:15px}.transactions-table-wrap th,.transactions-table-wrap td{padding-right:12px;padding-left:12px}.transport-error{align-items:flex-start;font-size:10px}}@media(max-width:420px){.transport-heading{flex-direction:column}.add-transport-card{align-self:flex-start}.transport-stats{grid-template-columns:1fr}.transport-stat{min-height:74px}.transport-card{min-height:170px}.amount-options{gap:5px}.amount-options button{font-size:10px}}
.card-member{display:block;margin-top:3px;color:#d5e4d8;font-size:9px;font-weight:500}
.transport-demo-note{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #e7e3cf;border-radius:10px;background:#fffdf5;color:#7e7252;font-size:11px;line-height:1.45}.transport-demo-note svg{flex:none;color:#a2874d}
</style>

<style scoped>
.card-number-control{position:relative;display:flex;align-items:center}.card-number-control input{width:100%;padding-right:62px}.card-number-control>span{position:absolute;right:12px;color:#8a978e;font-size:10px;font-weight:600;font-variant-numeric:tabular-nums}.card-number-hint,.family-assignment-hint{display:block;margin-top:-2px;color:#7e8c82;font-size:10px;font-weight:450;line-height:1.45}.family-assignment-hint{margin-top:-8px}.family-assignment-hint a{color:#416b4b;font-weight:650;text-decoration:none}.family-assignment-hint a:hover{text-decoration:underline}.card-number-control:focus-within>span{color:#416b4b}
.transport-card-item{display:flex;min-width:0;flex-direction:column;gap:7px}.assignment-button{display:flex;min-height:31px;align-items:center;gap:6px;align-self:flex-end;padding:0 9px;border:1px solid #e1e9e2;border-radius:8px;background:#fff;color:#627368;font-family:inherit;font-size:10px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s}.assignment-button svg:first-child{color:#65866d}.assignment-button svg:last-child{opacity:.65}.assignment-button:hover{border-color:#bdd2c1;background:#f2f7f3;color:#315a43}.assignment-modal .assignment-help{margin:-7px 0 0}.assignment-backdrop{animation:assignment-fade .16s ease-out}@keyframes assignment-fade{from{opacity:0}to{opacity:1}}
</style>

<style scoped>
.transport-card{min-height:218px;gap:11px;padding:16px 18px;border:1px solid #ffffff30;border-radius:16px;background:radial-gradient(ellipse at 84% 0%,#ffffff20,transparent 36%),linear-gradient(132deg,#2d5c40 0%,#214a34 55%,#1c3e2c 100%);box-shadow:inset 0 1px 0 #ffffff25,0 9px 22px #1d432d20;transition:transform .2s ease,box-shadow .2s ease,outline-color .2s ease}.transport-card:hover{transform:translateY(-3px);box-shadow:inset 0 1px 0 #ffffff2b,0 15px 28px #1d432d35}.transport-card.selected{outline:2px solid #a8c6a9;outline-offset:2px}.transport-card.card-variant-1{background:radial-gradient(ellipse at 84% 0%,#ffffff20,transparent 36%),linear-gradient(132deg,#345c68 0%,#294b57 58%,#203e49 100%)}.transport-card.card-variant-2{background:radial-gradient(ellipse at 84% 0%,#ffffff20,transparent 36%),linear-gradient(132deg,#526344 0%,#3c5036 58%,#303f2b 100%)}
.card-glow{position:absolute;top:-100px;right:8%;width:230px;height:230px;border:1px solid #ffffff13;border-radius:50%;box-shadow:0 0 0 18px #ffffff07,0 0 0 38px #ffffff05,0 0 0 62px #ffffff03;pointer-events:none}.transport-card-top{position:relative;z-index:1}.transport-brand{gap:8px}.transport-brand small{margin-left:3px;padding-left:10px;border-left:1px solid #ffffff35;color:#d2e3d4;font-size:8px;font-weight:600;letter-spacing:.12em}.brand-mark{width:27px;height:27px;border-radius:9px;background:linear-gradient(145deg,#ffffff32,#ffffff10);box-shadow:inset 0 1px 0 #ffffff40}.card-type-label{display:flex;max-width:46%;align-items:center;gap:6px;padding:6px 9px;border-color:#ffffff38;background:#10291d42;font-size:9px}.card-type-label svg{flex:none;opacity:.85}
.card-number-row{display:flex;align-items:center;gap:12px;min-height:37px}.card-chip{position:relative;display:block;width:34px;height:25px;flex:none;overflow:hidden;border:1px solid #f0dca888;border-radius:6px;background:linear-gradient(135deg,#e8d6a0,#b9a876);box-shadow:inset 0 1px 2px #ffffff8c}.card-chip::before,.card-chip::after,.card-chip i{position:absolute;display:block;border:1px solid #776b4b66;content:""}.card-chip::before{inset:0 10px;border-top:0;border-bottom:0}.card-chip::after{inset:7px 0;border-right:0;border-left:0}.card-chip i{inset:5px 10px;border-radius:3px}.transport-card-number{font-size:15px;font-weight:600;letter-spacing:.13em;text-shadow:0 1px 5px #0f2b1d30}.contactless-mark{margin-left:auto;transform:rotate(90deg);color:#d8e7d9;font-size:14px;letter-spacing:-.18em;opacity:.9}
.transport-card-bottom{align-items:center;padding-bottom:11px;border-bottom:1px solid #ffffff25}.transport-card-bottom>span:first-child{gap:5px}.transport-card-bottom small{font-size:8px;letter-spacing:.13em}.transport-card-bottom strong{font-size:25px;font-weight:650;letter-spacing:-.04em}.currency-prefix{font-size:15px!important;letter-spacing:0!important;opacity:.85}.card-state{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-color:#ffffff32;border-radius:99px;background:#ffffff17;font-size:8px;letter-spacing:.04em}.card-state i{width:6px;height:6px;border-radius:50%;background:#9fe0a7;box-shadow:0 0 0 3px #9fe0a722}.card-state.low i{background:#ffd581;box-shadow:0 0 0 3px #ffd58122}
.transport-card-meta{display:flex;align-items:center;justify-content:space-between;gap:12px}.transport-card-meta>span{display:flex;min-width:0;flex-direction:column;gap:4px}.transport-card-meta>span:last-child{text-align:right}.transport-card-meta small{color:#bcd3c0;font-size:7px;font-weight:650;letter-spacing:.12em}.transport-card-meta strong{overflow:hidden;color:#f4faf4;font-size:10px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.transport-card-action{margin-top:0;color:#e3efe4;font-size:9px;font-weight:650}.transport-card-action svg{transition:transform .16s}.transport-card:hover .transport-card-action svg{transform:translateX(3px)}
@media(max-width:680px){.transport-card{min-height:211px;padding:15px}.transport-card-bottom strong{font-size:23px}.transport-card-meta strong{font-size:9px}}
@media(prefers-reduced-motion:reduce){.transport-card,.transport-card-action svg{transition:none}}
</style>
