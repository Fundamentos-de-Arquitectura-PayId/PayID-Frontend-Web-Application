<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { jsPDF } from 'jspdf'
import {
  Activity, ArrowDown, ArrowUp, ArrowUpDown, BarChart3, CheckCircle2,
  ChevronLeft, ChevronRight, CircleAlert, Clock3, CreditCard, Download,
  Eye, FileDown, Filter, Plus, ReceiptText, Search, TrendingUp, WalletCards, X,
  UsersRound, ShieldCheck,
} from 'lucide-vue-next'
import { createPayment, listFamilyMembers, listPayments } from '@/shared/services/payidRepository.js'
import { recordActivity } from '@/shared/services/activityLedger.js'
import StyledSelect from '@/shared/ui/StyledSelect.component.vue'
import CalendarDatePicker from '@/shared/ui/CalendarDatePicker.component.vue'

const { locale } = useI18n()
const payments = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const statusFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const currentPage = ref(1)
const pageSize = 10
const sortKey = ref('date')
const sortDirection = ref('desc')
const showStatistics = ref(false)
const selectedPayment = ref(null)
const familyMembers = ref([])
const householdMode = computed(() => {
  const session = readSession()
  const segment = String(session.segmento || session.segment || session.tipoPerfil || session.profileType || session.role || '').toLowerCase()
  return /famil|padre|madre|apoderad|guardian/.test(segment)
})
const showExpenseModal = ref(false)
const savingExpense = ref(false)
const expenseError = ref('')
const memberFilter = ref('all')
const categoryFilter = ref('all')
const expenseForm = ref(blankExpense())

function blankExpense() {
  return { service: '', category: 'Hogar', amount: '', date: new Date().toISOString().slice(0, 10), method: 'Tarjeta PayID', familyMemberId: '', description: '' }
}

const strings = computed(() => locale.value === 'es' ? {
  title: 'Historial de pagos', subtitle: 'Consulta y administra los movimientos de tu tarjeta PayID.',
  total: 'Total pagado', transactions: 'Movimientos', average: 'Promedio por pago', recent: 'Último movimiento',
  activity: 'Actividad de pagos', search: 'Buscar servicio, referencia o método…', all: 'Todos los estados',
  from: 'Desde', to: 'Hasta', export: 'Exportar CSV', statistics: 'Estadísticas', hideStats: 'Ocultar estadísticas',
  service: 'Servicio', date: 'Fecha', amount: 'Monto', method: 'Método', status: 'Estado', actions: 'Acciones',
  showing: 'Mostrando', of: 'de', items: 'movimientos', empty: 'No encontramos movimientos con estos filtros.',
  noPayments: 'Aún no tienes pagos registrados.', retry: 'Reintentar', loading: 'Cargando movimientos…',
  completed: 'Completado', pending: 'Pendiente', failed: 'Rechazado',
  monthTrend: 'Pagos por mes', categories: 'Gastos por servicio', details: 'Detalle del movimiento',
  reference: 'Referencia', card: 'Medio de pago', close: 'Cerrar', receipt: 'Descargar constancia',
  registered: 'Registrado',
} : {
  title: 'Payment history', subtitle: 'Review and manage your PayID card transactions.',
  total: 'Total paid', transactions: 'Transactions', average: 'Average payment', recent: 'Latest transaction',
  activity: 'Payment activity', search: 'Search service, reference or method…', all: 'All statuses',
  from: 'From', to: 'To', export: 'Export CSV', statistics: 'Statistics', hideStats: 'Hide statistics',
  service: 'Service', date: 'Date', amount: 'Amount', method: 'Method', status: 'Status', actions: 'Actions',
  showing: 'Showing', of: 'of', items: 'transactions', empty: 'No transactions match these filters.',
  noPayments: 'You do not have any recorded payments yet.', retry: 'Try again', loading: 'Loading transactions…',
  completed: 'Completed', pending: 'Pending', failed: 'Declined',
  monthTrend: 'Payments by month', categories: 'Spending by service', details: 'Transaction details',
  reference: 'Reference', card: 'Payment method', close: 'Close', receipt: 'Download receipt',
  registered: 'Recorded',
})

function readSession() {
  try { return JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {} } catch { return {} }
}

function normalizePayment(raw, index = 0) {
  const id = raw.id ?? raw.Id ?? raw.pagoId ?? raw.paymentId ?? `payment-${index}`
  return {
    id: String(id),
    service: String(raw.servicio ?? raw.Servicio ?? raw.service ?? raw.categoria ?? raw.category ?? raw.concepto ?? raw.description ?? raw.descripcion ?? 'Pago PayID'),
    amount: Number(raw.monto ?? raw.Monto ?? raw.amount ?? raw.total ?? raw.importe ?? 0) || 0,
    date: raw.fecha ?? raw.Fecha ?? raw.createdAt ?? raw.date ?? raw.paymentDate ?? raw.fechaPago ?? '',
    status: String(raw.estado ?? raw.status ?? raw.paymentStatus ?? 'Registrado'),
    method: String(raw.metodoPago ?? raw.method ?? raw.medio ?? raw.paymentMethod ?? 'Tarjeta PayID'),
    reference: String(raw.referencia ?? raw.reference ?? raw.operationId ?? raw.codigo ?? id),
    description: String(raw.descripcion ?? raw.description ?? raw.detalle ?? ''),
    category: String(raw.categoria ?? raw.Categoria ?? raw.category ?? raw.Category ?? 'Otros'),
    familyMemberId: raw.familyMemberId ?? raw.FamilyMemberId ?? null,
    source: raw,
  }
}

async function loadPayments() {
  loading.value = true
  error.value = ''
  const session = readSession()
  const userId = session.id ?? session.usuarioId ?? session.userId ?? session.Id
  if (userId === undefined || userId === null || userId === '') {
    payments.value = []
    error.value = locale.value === 'es' ? 'Inicia sesión para consultar tus movimientos.' : 'Sign in to view your transactions.'
    loading.value = false
    return
  }
  try {
    const response = await listPayments()
    const payload = Array.isArray(response) ? response : response?.data ?? response?.items ?? response?.pagos ?? response?.$values ?? []
    payments.value = Array.isArray(payload)
      ? payload.filter((item) => {
        const recordUserId = item.usuarioId ?? item.userId ?? item.UserId ?? item.UsuarioId
        return recordUserId === undefined || recordUserId === null || String(recordUserId) === String(userId)
      }).map(normalizePayment)
      : []
    if (householdMode.value) {
      try { familyMembers.value = await listFamilyMembers() } catch { familyMembers.value = [] }
    }
  } catch (cause) {
    if (cause?.status === 404) payments.value = []
    else error.value = cause?.message || (locale.value === 'es' ? 'No se pudieron cargar los pagos. Comprueba tu conexión.' : 'Payments could not be loaded. Check your connection.')
  } finally {
    loading.value = false
  }
}

function localDate(value) {
  if (!value) return null
  const text = String(value)
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dateKey(value) {
  const date = localDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value) {
  const date = localDate(value)
  return date ? new Intl.DateTimeFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : '—'
}

const moneyFormat = computed(() => new Intl.NumberFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }))
function formatMoney(value) { return moneyFormat.value.format(Number(value) || 0) }

const statusOptions = computed(() => {
  const statuses = [...new Set(payments.value.map((payment) => payment.status))]
  return [{ value: 'all', label: strings.value.all }, ...statuses.map((value) => ({ value, label: value }))]
})

const filteredPayments = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase(locale.value)
  return payments.value.filter((payment) => {
    const day = dateKey(payment.date)
    const matchesQuery = !query || [payment.service, payment.reference, payment.method, payment.status, payment.description].join(' ').toLocaleLowerCase(locale.value).includes(query)
    const matchesStatus = statusFilter.value === 'all' || payment.status === statusFilter.value
    const matchesFrom = !dateFrom.value || (day && day >= dateFrom.value)
    const matchesTo = !dateTo.value || (day && day <= dateTo.value)
    const matchesMember = memberFilter.value === 'all' || String(payment.familyMemberId ?? '') === String(memberFilter.value)
    const matchesCategory = categoryFilter.value === 'all' || payment.category === categoryFilter.value
    return matchesQuery && matchesStatus && matchesFrom && matchesTo && matchesMember && matchesCategory
  })
})

const sortedPayments = computed(() => [...filteredPayments.value].sort((a, b) => {
  const left = sortKey.value === 'date' ? (dateKey(a.date) || '') : sortKey.value === 'amount' ? a.amount : String(a[sortKey.value] ?? '')
  const right = sortKey.value === 'date' ? (dateKey(b.date) || '') : sortKey.value === 'amount' ? b.amount : String(b[sortKey.value] ?? '')
  let compare = typeof left === 'number' ? left - right : String(left).localeCompare(String(right), locale.value, { numeric: true, sensitivity: 'base' })
  if (!left && right) compare = 1
  else if (left && !right) compare = -1
  return compare * (sortDirection.value === 'asc' ? 1 : -1)
}))

const totalPages = computed(() => Math.max(1, Math.ceil(sortedPayments.value.length / pageSize)))
const pagePayments = computed(() => sortedPayments.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const firstItem = computed(() => sortedPayments.value.length ? (currentPage.value - 1) * pageSize + 1 : 0)
const lastItem = computed(() => Math.min(currentPage.value * pageSize, sortedPayments.value.length))
const totalPaid = computed(() => payments.value.reduce((sum, payment) => sum + payment.amount, 0))
const averagePayment = computed(() => payments.value.length ? totalPaid.value / payments.value.length : 0)
const latestPayment = computed(() => [...payments.value].sort((a, b) => (dateKey(b.date) || '').localeCompare(dateKey(a.date) || ''))[0])
const last30DaysTotal = computed(() => {
  const now = new Date()
  const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  return payments.value.filter((payment) => { const date = localDate(payment.date); return date && date >= threshold }).reduce((sum, payment) => sum + payment.amount, 0)
})

const monthlyTotals = computed(() => {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + offset, 1)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const total = payments.value.reduce((sum, payment) => {
      const parsed = localDate(payment.date)
      return parsed && parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth() ? sum + payment.amount : sum
    }, 0)
    return { key, label: new Intl.DateTimeFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { month: 'short' }).format(date), total }
  })
  const max = Math.max(...months.map((month) => month.total), 1)
  return months.map((month) => ({ ...month, height: Math.max(month.total ? 12 : 3, month.total / max * 100) }))
})

const categoryTotals = computed(() => {
  const totals = new Map()
  payments.value.forEach((payment) => {
    const key = householdMode.value ? payment.category : payment.service
    totals.set(key, (totals.get(key) || 0) + payment.amount)
  })
  const values = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const max = Math.max(...values.map(([, value]) => value), 1)
  return values.map(([name, value]) => ({ name, value, width: Math.max(value ? 5 : 0, value / max * 100) }))
})

function sortBy(key) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDirection.value = key === 'date' ? 'desc' : 'asc' }
  currentPage.value = 1
}

function downloadCsv() {
  const headings = [strings.value.service, strings.value.date, strings.value.amount, strings.value.method, strings.value.status, strings.value.reference]
  const cell = (value) => {
    const safe = String(value ?? '').replace(/^([=+\-@])/, "'$1")
    return `"${safe.replace(/"/g, '""')}"`
  }
  const rows = filteredPayments.value.map((payment) => [payment.service, formatDate(payment.date), payment.amount.toFixed(2), payment.method, payment.status, payment.reference])
  const content = '\uFEFF' + [headings, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'payid-historial-de-pagos.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function downloadReceipt(payment) {
  const pdf = new jsPDF()
  pdf.setFillColor(49, 90, 67)
  pdf.roundedRect(16, 16, 178, 34, 4, 4, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.text('PAYID  /  IDENTIDAD DIGITAL', 25, 28)
  pdf.setFontSize(19)
  pdf.text(locale.value === 'es' ? 'Constancia de pago' : 'Payment receipt', 25, 41)
  pdf.setTextColor(45, 58, 49)
  pdf.setFontSize(11)
  const lines = [
    [strings.value.service, payment.service],
    [strings.value.amount, formatMoney(payment.amount)],
    [strings.value.date, formatDate(payment.date)],
    [strings.value.status, payment.status],
    [strings.value.card, payment.method],
    [strings.value.reference, payment.reference],
  ]
  lines.forEach(([label, value], index) => {
    const y = 70 + index * 18
    pdf.setTextColor(125, 137, 127)
    pdf.text(label, 22, y)
    pdf.setTextColor(45, 58, 49)
    pdf.text(String(value || '—').slice(0, 70), 92, y)
    pdf.setDrawColor(232, 237, 233)
    if (index < lines.length - 1) pdf.line(22, y + 5, 188, y + 5)
  })
  pdf.setTextColor(130, 141, 133)
  pdf.setFontSize(9)
  pdf.text(locale.value === 'es' ? 'Comprobante generado desde PayID.' : 'Receipt generated by PayID.', 22, 190)
  pdf.save(`payid-comprobante-${payment.reference || payment.id}.pdf`)
}

function statusTone(status) {
  const value = String(status).toLocaleLowerCase(locale.value)
  if (/complet|pagad|aprob|success|registrad/.test(value)) return 'complete'
  if (/pend|proces|en curso/.test(value)) return 'pending'
  if (/rechaz|fall|cancel|declin|error/.test(value)) return 'failed'
  return 'neutral'
}

const expenseCategoryOptions = ['Hogar', 'Alimentación', 'Servicios', 'Educación', 'Salud', 'Transporte', 'Otros'].map(value => ({ value, label: value }))
const expenseMethodOptions = ['Tarjeta PayID', 'Efectivo', 'Transferencia', 'Otra tarjeta'].map(value => ({ value, label: value }))
const expenseMemberOptions = computed(() => [
  { value: '', label: 'Mi cuenta' },
  ...familyMembers.value.map(member => ({ value: String(member.id ?? member.Id), label: `${member.name ?? member.Name} · ${member.relationship ?? member.Relationship ?? 'Familiar'}` })),
])
const householdCategoryOptions = computed(() => [
  { value: 'all', label: 'Todas las categorías' },
  ...[...new Set([...expenseCategoryOptions.map(option => option.value), ...payments.value.map(payment => payment.category)])].map(value => ({ value, label: value })),
])
const currentMonthTotal = computed(() => {
  const now = new Date()
  return payments.value.filter(payment => { const date = localDate(payment.date); return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).reduce((sum, payment) => sum + payment.amount, 0)
})
const memberName = (id) => familyMembers.value.find(member => String(member.id ?? member.Id) === String(id))?.name ?? familyMembers.value.find(member => String(member.id ?? member.Id) === String(id))?.Name ?? ''

function openExpenseModal() {
  expenseForm.value = blankExpense()
  expenseError.value = ''
  showExpenseModal.value = true
}

async function saveExpense() {
  const session = readSession()
  const userId = session.id ?? session.usuarioId ?? session.userId ?? session.Id
  const amount = Number(expenseForm.value.amount)
  if (!expenseForm.value.service.trim() || !Number.isFinite(amount) || amount <= 0 || !expenseForm.value.date) {
    expenseError.value = 'Completa el concepto, un monto válido y la fecha.'
    return
  }
  savingExpense.value = true
  expenseError.value = ''
  const payload = {
    familyMemberId: expenseForm.value.familyMemberId || null,
    service: expenseForm.value.service.trim(),
    category: expenseForm.value.category,
    description: expenseForm.value.description.trim(),
    method: expenseForm.value.method,
    amount,
    date: new Date(`${expenseForm.value.date}T12:00:00`).toISOString(),
    status: 'registered',
  }
  try {
    const result = await createPayment(payload)
    const saved = normalizePayment(result)
    payments.value = [saved, ...payments.value.filter(item => item.id !== saved.id)]
    await recordActivity({ kind: 'payment', title: saved.service, detail: `Monto: ${formatMoney(saved.amount)} · ${saved.category} · ${saved.method}`, date: saved.date, status: 'Registrado', reference: saved.reference })
    showExpenseModal.value = false
    window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message: 'Gasto agregado correctamente.' } }))
  } catch (cause) {
    expenseError.value = cause?.message || 'No se pudo guardar el gasto. Inténtalo nuevamente.'
  } finally { savingExpense.value = false }
}

watch([searchQuery, statusFilter, dateFrom, dateTo, memberFilter, categoryFilter], () => { currentPage.value = 1 })
watch(sortedPayments, () => { if (currentPage.value > totalPages.value) currentPage.value = totalPages.value })
onMounted(loadPayments)
</script>

<template>
  <main class="payments-page">
    <header class="payments-heading">
      <div>
        <span class="payments-eyebrow"><WalletCards :size="14" /> PAYID · {{ locale === 'es' ? 'MOVIMIENTOS' : 'TRANSACTIONS' }}</span>
        <h1>{{ householdMode ? 'Pagos del hogar' : strings.title }}</h1>
        <p>{{ householdMode ? 'Registra y organiza los gastos de tu familia desde tu identidad PayID.' : strings.subtitle }}</p>
      </div>
      <div class="payments-heading-actions">
        <button v-if="householdMode" class="add-expense-button" type="button" @click="openExpenseModal"><Plus :size="17" />Agregar gasto</button>
        <button class="stats-toggle" type="button" :aria-expanded="showStatistics" @click="showStatistics = !showStatistics"><BarChart3 :size="17" />{{ showStatistics ? strings.hideStats : strings.statistics }}</button>
      </div>
    </header>

    <section v-if="error" class="payments-error" role="alert"><CircleAlert :size="18" /><span>{{ error }}</span><button type="button" @click="loadPayments"><Activity :size="15" />{{ strings.retry }}</button></section>

    <section v-if="householdMode" class="household-summary" aria-label="Resumen mensual del hogar">
      <article><span class="household-summary-icon"><WalletCards :size="17" /></span><div><small>Gastos de este mes</small><strong>{{ formatMoney(currentMonthTotal) }}</strong><span>Todos los medios de pago</span></div></article>
      <article><span class="household-summary-icon"><ReceiptText :size="17" /></span><div><small>Gastos registrados</small><strong>{{ payments.length }}</strong><span>En tu cuenta familiar</span></div></article>
      <article><span class="household-summary-icon"><UsersRound :size="17" /></span><div><small>Integrantes vinculados</small><strong>{{ familyMembers.length }}</strong><span>Personas organizadas</span></div></article>
    </section>
    <section v-else class="payment-stats" aria-label="Resumen de pagos">
      <article class="payment-stat"><div class="stat-copy"><span>{{ strings.total }}</span><strong>{{ loading ? '—' : formatMoney(totalPaid) }}</strong><small><TrendingUp :size="13" />{{ formatMoney(last30DaysTotal) }} · {{ locale === 'es' ? 'últimos 30 días' : 'last 30 days' }}</small></div><span class="stat-icon tone-green"><WalletCards :size="18" /></span></article>
      <article class="payment-stat"><div class="stat-copy"><span>{{ strings.transactions }}</span><strong>{{ loading ? '—' : payments.length }}</strong><small><Activity :size="13" />{{ locale === 'es' ? 'movimientos registrados' : 'recorded transactions' }}</small></div><span class="stat-icon tone-blue"><ReceiptText :size="18" /></span></article>
      <article class="payment-stat"><div class="stat-copy"><span>{{ strings.average }}</span><strong>{{ loading ? '—' : formatMoney(averagePayment) }}</strong><small><BarChart3 :size="13" />{{ locale === 'es' ? 'por movimiento' : 'per transaction' }}</small></div><span class="stat-icon tone-violet"><BarChart3 :size="18" /></span></article>
      <article class="payment-stat"><div class="stat-copy"><span>{{ strings.recent }}</span><strong class="recent-date">{{ loading ? '—' : (latestPayment ? formatDate(latestPayment.date) : '—') }}</strong><small><Clock3 :size="13" />{{ latestPayment?.service || strings.noPayments }}</small></div><span class="stat-icon tone-amber"><Clock3 :size="18" /></span></article>
    </section>

    <section v-if="showStatistics" class="analytics-grid">
      <article class="analytics-card"><header><div><span class="section-kicker">{{ strings.activity }}</span><h2>{{ strings.monthTrend }}</h2></div><span class="analytics-icon"><Activity :size="17" /></span></header>
        <div class="monthly-chart"><div v-for="month in monthlyTotals" :key="month.key" class="month-column"><span class="month-value">{{ month.total ? formatMoney(month.total) : '—' }}</span><div class="month-track"><div class="month-bar" :style="{ height: month.height + '%' }"></div></div><span class="month-label">{{ month.label }}</span></div></div>
      </article>
      <article class="analytics-card"><header><div><span class="section-kicker">{{ strings.activity }}</span><h2>{{ householdMode ? 'Gastos por categoría' : strings.categories }}</h2></div><span class="analytics-icon"><CreditCard :size="17" /></span></header>
        <div v-if="categoryTotals.length" class="category-list"><div v-for="item in categoryTotals" :key="item.name" class="category-row"><div><span>{{ item.name }}</span><strong>{{ formatMoney(item.value) }}</strong></div><div class="category-track"><span :style="{ width: item.width + '%' }"></span></div></div></div>
        <div v-else class="analytics-empty">{{ strings.noPayments }}</div>
      </article>
    </section>

    <section class="transactions-card">
      <header class="transactions-heading"><div><span class="section-kicker">{{ strings.activity }}</span><h2>{{ strings.title }}</h2><p>{{ filteredPayments.length }} {{ strings.items }}</p></div><button class="export-button" type="button" :disabled="!filteredPayments.length" @click="downloadCsv"><Download :size="16" />{{ strings.export }}</button></header>
      <div class="transaction-filters">
        <label class="transaction-search"><Search :size="17" /><input v-model="searchQuery" type="search" :placeholder="strings.search" /></label>
        <div v-if="householdMode" class="status-picker"><StyledSelect v-model="memberFilter" :options="[{ value: 'all', label: 'Todos los integrantes' }, ...expenseMemberOptions]" placeholder="Integrante" aria-label="Filtrar por integrante" /></div>
        <div v-if="householdMode" class="status-picker"><StyledSelect v-model="categoryFilter" :options="householdCategoryOptions" placeholder="Categoría" aria-label="Filtrar por categoría" /></div>
        <div class="status-picker"><StyledSelect v-model="statusFilter" :options="statusOptions" :placeholder="strings.all" :aria-label="strings.status" /></div>
        <div class="date-picker"><CalendarDatePicker v-model="dateFrom" :placeholder="locale === 'es' ? 'Desde' : 'From'" :aria-label="strings.from" /></div>
        <div class="date-picker"><CalendarDatePicker v-model="dateTo" :placeholder="locale === 'es' ? 'Hasta' : 'To'" :aria-label="strings.to" /></div>
        <button v-if="searchQuery || statusFilter !== 'all' || dateFrom || dateTo || memberFilter !== 'all' || categoryFilter !== 'all'" class="reset-button" type="button" :aria-label="locale === 'es' ? 'Limpiar filtros' : 'Clear filters'" @click="searchQuery = ''; statusFilter = 'all'; dateFrom = ''; dateTo = ''; memberFilter = 'all'; categoryFilter = 'all'"><X :size="15" /></button>
      </div>

      <div v-if="loading" class="payment-table-skeleton" role="status" :aria-label="strings.loading"><span v-for="row in 5" :key="row" class="payment-skeleton-row"><i v-for="column in 6" :key="column"></i></span></div>
      <div v-else-if="!error" class="table-scroll">
        <table class="transactions-table">
          <thead><tr>
            <th><button class="sort-control" type="button" @click="sortBy('service')">{{ strings.service }}<ArrowUp v-if="sortKey === 'service' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'service'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
            <th><button class="sort-control" type="button" @click="sortBy('date')">{{ strings.date }}<ArrowUp v-if="sortKey === 'date' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'date'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
            <th><button class="sort-control" type="button" @click="sortBy('method')">{{ strings.method }}<ArrowUp v-if="sortKey === 'method' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'method'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
            <th><button class="sort-control" type="button" @click="sortBy('status')">{{ strings.status }}<ArrowUp v-if="sortKey === 'status' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'status'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
            <th class="amount-heading"><button class="sort-control" type="button" @click="sortBy('amount')">{{ strings.amount }}<ArrowUp v-if="sortKey === 'amount' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'amount'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
            <th>{{ strings.actions }}</th>
          </tr></thead>
          <tbody>
            <tr v-for="payment in pagePayments" :key="payment.id">
              <td><div class="service-cell"><span class="service-icon"><CreditCard :size="16" /></span><span><strong>{{ payment.service }}</strong><small>{{ householdMode ? `${payment.category} · ${memberName(payment.familyMemberId) || 'Mi cuenta'}` : `${strings.reference} · ${payment.reference}` }}</small></span></div></td>
              <td>{{ formatDate(payment.date) }}</td>
              <td><span class="method-label"><WalletCards :size="15" />{{ payment.method }}</span></td>
              <td><span class="payment-status" :class="statusTone(payment.status)"><i></i>{{ payment.status || strings.registered }}</span></td>
              <td class="amount-cell">{{ formatMoney(payment.amount) }}</td>
              <td><div class="row-actions"><button type="button" :aria-label="strings.details" :title="strings.details" @click="selectedPayment = payment"><Eye :size="16" /></button><button type="button" :aria-label="strings.receipt" :title="strings.receipt" @click="downloadReceipt(payment)"><FileDown :size="16" /></button></div></td>
            </tr>
            <tr v-if="!pagePayments.length"><td colspan="6" class="empty-table"><span class="empty-icon"><Filter :size="19" /></span><strong>{{ payments.length ? strings.empty : strings.noPayments }}</strong><small>{{ locale === 'es' ? 'Prueba cambiando los filtros o vuelve más tarde.' : 'Try changing the filters or check back later.' }}</small></td></tr>
          </tbody>
        </table>
      </div>
      <footer v-if="!loading && !error && sortedPayments.length" class="table-pagination"><p>{{ strings.showing }} <strong>{{ firstItem }}–{{ lastItem }}</strong> {{ strings.of }} <strong>{{ sortedPayments.length }}</strong> {{ strings.items }}</p><nav :aria-label="locale === 'es' ? 'Paginación de pagos' : 'Payment pagination'"><button type="button" aria-label="Previous page" :disabled="currentPage === 1" @click="currentPage--"><ChevronLeft :size="16" /></button><button v-for="page in totalPages" :key="page" type="button" :class="{ current: page === currentPage }" :aria-current="page === currentPage ? 'page' : undefined" @click="currentPage = page">{{ page }}</button><button type="button" aria-label="Next page" :disabled="currentPage === totalPages" @click="currentPage++"><ChevronRight :size="16" /></button></nav></footer>
    </section>

    <Teleport to="body"><div v-if="selectedPayment" class="payment-modal-backdrop" @click.self="selectedPayment = null"><section class="payment-modal" role="dialog" aria-modal="true" :aria-label="strings.details"><header><span class="modal-icon"><ReceiptText :size="20" /></span><div><h2>{{ strings.details }}</h2><p>{{ selectedPayment.service }}</p></div><button class="modal-close" type="button" :aria-label="strings.close" @click="selectedPayment = null"><X :size="18" /></button></header><dl><div><dt>{{ strings.service }}</dt><dd>{{ selectedPayment.service }}</dd></div><div><dt>{{ strings.amount }}</dt><dd class="modal-amount">{{ formatMoney(selectedPayment.amount) }}</dd></div><div><dt>{{ strings.date }}</dt><dd>{{ formatDate(selectedPayment.date) }}</dd></div><div><dt>{{ strings.status }}</dt><dd>{{ selectedPayment.status }}</dd></div><div><dt>{{ strings.card }}</dt><dd>{{ selectedPayment.method }}</dd></div><div><dt>{{ strings.reference }}</dt><dd>{{ selectedPayment.reference }}</dd></div><div v-if="selectedPayment.description"><dt>{{ locale === 'es' ? 'Detalle' : 'Description' }}</dt><dd>{{ selectedPayment.description }}</dd></div></dl><footer><button class="export-button" type="button" @click="downloadReceipt(selectedPayment)"><FileDown :size="16" />{{ strings.receipt }}</button><button class="close-button" type="button" @click="selectedPayment = null">{{ strings.close }}</button></footer></section></div></Teleport>

    <Teleport to="body"><div v-if="showExpenseModal" class="payment-modal-backdrop" @click.self="showExpenseModal = false"><section class="payment-modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title"><header><span class="modal-icon"><WalletCards :size="20" /></span><div><h2 id="expense-modal-title">Registrar gasto del hogar</h2><p>Guarda un movimiento para organizar las finanzas familiares.</p></div><button class="modal-close" type="button" aria-label="Cerrar" @click="showExpenseModal = false"><X :size="18" /></button></header><form class="expense-form" @submit.prevent="saveExpense"><label>Concepto<input v-model.trim="expenseForm.service" maxlength="120" required placeholder="Ej. Compra de alimentos" /></label><div class="expense-form-row"><label>Categoría<StyledSelect v-model="expenseForm.category" :options="expenseCategoryOptions" aria-label="Categoría del gasto" /></label><label>Monto (S/)<input v-model="expenseForm.amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label></div><div class="expense-form-row"><label>Fecha<CalendarDatePicker v-model="expenseForm.date" placeholder="dd/mm/aaaa" aria-label="Fecha del gasto" /></label><label>Medio de pago<StyledSelect v-model="expenseForm.method" :options="expenseMethodOptions" aria-label="Medio de pago" /></label></div><label>Asignar a<StyledSelect v-model="expenseForm.familyMemberId" :options="expenseMemberOptions" placeholder="Mi cuenta" aria-label="Asignar gasto a integrante" /></label><label>Nota (opcional)<textarea v-model.trim="expenseForm.description" maxlength="240" rows="2" placeholder="Agrega un detalle útil para tu familia" /></label><p class="expense-disclaimer"><ShieldCheck :size="15" />Este registro organiza tus gastos; no realiza ningún cargo a una tarjeta.</p><p v-if="expenseError" class="form-error" role="alert">{{ expenseError }}</p><footer><button class="close-button" type="button" @click="showExpenseModal = false">Cancelar</button><button class="stats-toggle" type="submit" :disabled="savingExpense">{{ savingExpense ? 'Guardando…' : 'Guardar gasto' }}</button></footer></form></section></div></Teleport>
  </main>
</template>

<style scoped>
.payments-page{display:flex;min-height:100%;flex-direction:column;gap:20px;padding:28px 32px 36px;background:#f5f7f6;color:#25352b}
.payments-heading{display:flex;align-items:center;justify-content:space-between;gap:18px}.payments-heading h1{margin:8px 0 0;color:#24382b;font-size:27px;font-weight:650;letter-spacing:-.04em}.payments-heading p{margin:6px 0 0;color:#79867d;font-size:13px}.payments-eyebrow{display:flex;align-items:center;gap:7px;color:#66816c;font-size:9px;font-weight:750;letter-spacing:.13em}.payments-eyebrow svg{color:#51785a}
.stats-toggle,.export-button,.close-button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:8px;padding:0 14px;border:1px solid #dfe7e1;border-radius:10px;background:#fff;color:#53675a;font-family:inherit;font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background .16s,border-color .16s,color .16s,transform .16s,box-shadow .16s}.stats-toggle:hover,.export-button:hover:not(:disabled){transform:translateY(-1px);border-color:#b8cdbb;background:#f7faf7;color:#315a43;box-shadow:0 4px 11px #315a4314}.stats-toggle{border-color:#315a43;background:#315a43;color:#fff;box-shadow:0 4px 11px #315a4320}.stats-toggle:hover{background:#244a32;color:#fff}.export-button:disabled{color:#aeb8b0;background:#fafbfa;cursor:not-allowed}
.payment-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.payment-stat{display:flex;min-width:0;min-height:112px;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 17px;border:1px solid #e8ede9;border-radius:14px;background:#fff;box-shadow:0 3px 11px rgba(31,50,38,.035)}.stat-copy{display:flex;min-width:0;flex-direction:column;gap:7px}.stat-copy>span{color:#66746a;font-size:12px;font-weight:500}.stat-copy>strong{overflow:hidden;color:#27392d;font-size:23px;font-weight:650;letter-spacing:-.035em;text-overflow:ellipsis;white-space:nowrap}.stat-copy>strong.recent-date{font-size:18px}.stat-copy>small{display:flex;align-items:center;gap:5px;overflow:hidden;color:#849087;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.stat-copy>small svg{flex:none;color:#59a876}.stat-icon{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:50%;background:#f1f5f1}.tone-green{background:#edf7f0;color:#57a777}.tone-blue{background:#edf3fb;color:#6d8eb7}.tone-violet{background:#f1effa;color:#8875bb}.tone-amber{background:#fbf3e8;color:#c48b41}
.payments-error{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #efd5d3;border-radius:11px;background:#fff6f5;color:#99534d;font-size:12px}.payments-error>span{flex:1}.payments-error>svg{flex:none}.payments-error button{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #e8cfcd;border-radius:8px;background:#fff;color:#8f514b;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer}.payments-error button:hover{background:#fcf0ef}
.analytics-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.analytics-card{min-width:0;padding:17px 18px;border:1px solid #e8ede9;border-radius:14px;background:#fff;box-shadow:0 3px 11px rgba(31,50,38,.035)}.analytics-card>header{display:flex;align-items:center;justify-content:space-between}.section-kicker{color:#94a097;font-size:9px;font-weight:750;letter-spacing:.11em;text-transform:uppercase}.analytics-card h2,.transactions-heading h2{margin:5px 0 0;color:#304235;font-size:15px;font-weight:650}.analytics-icon{display:grid;width:33px;height:33px;place-items:center;border:1px solid #e7ece8;border-radius:10px;color:#6d8873}.monthly-chart{display:grid;height:180px;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-top:18px}.month-column{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px}.month-value{max-width:100%;overflow:hidden;color:#78857b;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.month-track{display:flex;width:min(34px,70%);height:112px;align-items:flex-end;overflow:hidden;border-radius:8px;background:#f3f6f3}.month-bar{width:100%;min-height:3px;border-radius:7px 7px 3px 3px;background:linear-gradient(180deg,#78a985,#315a43);transition:height .25s}.month-label{color:#87938a;font-size:10px;text-transform:capitalize}.category-list{display:flex;flex-direction:column;gap:15px;margin-top:22px}.category-row>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px;color:#6f7d73;font-size:11px}.category-row strong{color:#3f5244;font-size:11px;font-weight:600}.category-track{height:7px;overflow:hidden;border-radius:999px;background:#f0f3f0}.category-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#82ad89,#315a43)}.analytics-empty{display:grid;min-height:150px;place-items:center;color:#929e95;font-size:12px}
.transactions-card{overflow:visible;border:1px solid #e6ece7;border-radius:15px;background:#fff;box-shadow:0 5px 17px rgba(31,50,38,.04)}.transactions-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px 14px}.transactions-heading p{margin:5px 0 0;color:#89958d;font-size:11px}.transaction-filters{display:flex;align-items:center;gap:9px;padding:0 18px 14px}.transaction-search{display:flex;min-width:190px;height:42px;flex:1;align-items:center;gap:9px;padding:0 12px;border:1px solid #e1e8e2;border-radius:10px;background:#f8faf8;color:#91a095;transition:border-color .16s,box-shadow .16s,background .16s}.transaction-search:focus-within{border-color:#9bb9a0;background:#fff;box-shadow:0 0 0 3px #315a4310}.transaction-search input{width:100%;border:0;outline:0;background:transparent;color:#34443a;font:inherit;font-size:12px}.transaction-search input::placeholder{color:#9aa59c}.status-picker{width:170px;flex:none}.date-picker{width:145px;flex:none}.reset-button{display:grid;width:34px;height:34px;flex:none;place-items:center;border:1px solid #e2e9e3;border-radius:9px;background:#fff;color:#718075;cursor:pointer}.reset-button:hover{border-color:#bad0be;background:#f3f8f4;color:#315a43}
.table-scroll{width:100%;overflow-x:auto}.transactions-table{width:100%;min-width:830px;border-collapse:collapse;text-align:left}.transactions-table thead{background:#f7f9f7}.transactions-table th{height:40px;padding:0 16px;border-top:1px solid #eef1ee;border-bottom:1px solid #e9eeea;color:#7e8a81;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}.sort-control{display:inline-flex;align-items:center;gap:6px;padding:5px 0;border:0;background:transparent;color:inherit;font:inherit;font-size:inherit;font-weight:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer}.sort-control svg{color:#a2ada4}.sort-control:hover,.sort-control:hover svg{color:#315a43}.transactions-table td{height:62px;padding:9px 16px;border-bottom:1px solid #edf0ed;color:#637168;font-size:12px;white-space:nowrap}.transactions-table tbody tr:last-child td{border-bottom:0}.transactions-table tbody tr:hover{background:#fafcfb}.service-cell{display:flex;align-items:center;gap:10px}.service-icon{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:10px;background:#edf4ef;color:#53775b}.service-cell>span:last-child{display:flex;min-width:0;flex-direction:column;gap:4px}.service-cell strong{overflow:hidden;color:#35483a;font-size:12px;font-weight:600;text-overflow:ellipsis}.service-cell small{color:#98a39a;font-size:10px}.method-label{display:inline-flex;align-items:center;gap:7px;color:#718076}.method-label svg{color:#819486}.payment-status{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:7px;background:#f0f3f1;color:#627067;font-size:10px;font-weight:600}.payment-status i{width:6px;height:6px;border-radius:50%;background:#89948c}.payment-status.complete{background:#edf7ef;color:#4f8059}.payment-status.complete i{background:#5cac70}.payment-status.pending{background:#fff5e8;color:#a57632}.payment-status.pending i{background:#d99a36}.payment-status.failed{background:#fff0ef;color:#a85550}.payment-status.failed i{background:#d66d66}.amount-cell{text-align:right;color:#344a39!important;font-size:13px!important;font-weight:650!important;font-variant-numeric:tabular-nums}.amount-heading{text-align:right}.amount-heading .sort-control{justify-content:flex-end}.row-actions{display:flex;align-items:center;gap:5px}.row-actions button{display:grid;width:31px;height:31px;place-items:center;border:1px solid #e6ece7;border-radius:8px;background:#fff;color:#738178;cursor:pointer;transition:background .15s,border-color .15s,color .15s}.row-actions button:hover{border-color:#bfd2c2;background:#f2f7f3;color:#315a43}.empty-table{height:180px!important;text-align:center!important;white-space:normal!important}.empty-table>*{display:flex;margin-right:auto;margin-left:auto}.empty-icon{display:grid;width:40px;height:40px;place-items:center;margin-bottom:10px!important;border-radius:12px;background:#f1f5f1;color:#819886}.empty-table strong{justify-content:center;color:#56655a;font-size:13px;font-weight:600}.empty-table small{justify-content:center;margin-top:5px;color:#98a39b;font-size:11px}
.table-message{display:flex;min-height:200px;align-items:center;justify-content:center;gap:10px;color:#839087;font-size:12px}.error-message{color:#9f5651}.loading-spinner{width:17px;height:17px;border:2px solid #dce7de;border-top-color:#4b7755;border-radius:50%;animation:spin .75s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.table-pagination{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:14px;padding:9px 17px;border-top:1px solid #edf0ed}.table-pagination p{margin:0;color:#87938a;font-size:11px}.table-pagination strong{color:#516256;font-weight:650}.table-pagination nav{display:flex;align-items:center;gap:5px}.table-pagination nav button{display:grid;min-width:31px;height:31px;place-items:center;padding:0 7px;border:1px solid #e5eae6;border-radius:8px;background:#fff;color:#6e7a71;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s}.table-pagination nav button:hover:not(:disabled):not(.current){border-color:#c7d7ca;background:#f4f8f4;color:#315a43}.table-pagination nav button.current{border-color:#315a43;background:#315a43;color:#fff}.table-pagination nav button:disabled{background:#fafbfa;color:#c4ccc5;cursor:not-allowed}
.payment-modal-backdrop{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;overflow-y:auto;padding:20px;background:rgba(18,29,22,.48);backdrop-filter:blur(4px)}.payment-modal{width:min(100%,480px);max-height:90vh;overflow:auto;border:1px solid #e4ebe5;border-radius:17px;background:#fff;box-shadow:0 24px 70px rgba(16,35,24,.24)}.payment-modal>header{display:flex;align-items:center;gap:11px;padding:18px 20px;border-bottom:1px solid #edf0ed}.modal-icon{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#4c7455}.payment-modal>header>div{min-width:0;flex:1}.payment-modal h2{margin:0;color:#304235;font-size:16px}.payment-modal>header p{margin:4px 0 0;color:#87938a;font-size:11px}.modal-close{display:grid;width:32px;height:32px;place-items:center;border:1px solid #e6ece7;border-radius:8px;background:#fff;color:#748078;cursor:pointer}.payment-modal dl{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin:0;padding:8px 20px}.payment-modal dl>div{padding:12px 0;border-bottom:1px solid #eef1ee}.payment-modal dt{margin-bottom:5px;color:#94a097;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.payment-modal dd{margin:0;color:#425247;font-size:12px;font-weight:550;overflow-wrap:anywhere}.payment-modal dd.modal-amount{color:#315a43;font-size:16px;font-weight:700}.payment-modal>footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px 18px}.close-button:hover{border-color:#cbd8cd;background:#f7f9f7}.payment-modal-backdrop{animation:fade-in .15s ease-out}@keyframes fade-in{from{opacity:0}to{opacity:1}}
@media(max-width:1050px){.payments-page{padding:24px 22px 30px}.payment-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.transaction-filters{flex-wrap:wrap}.transaction-search{flex-basis:100%}}
@media(max-width:680px){.payments-page{gap:15px;padding:19px 14px 25px}.payments-heading{align-items:flex-start}.payments-heading h1{font-size:23px}.payments-heading p{max-width:44ch;font-size:12px}.stats-toggle{min-height:37px;padding:0 10px;font-size:11px}.payment-stats{gap:9px}.payment-stat{min-height:100px;padding:12px}.stat-copy>span{font-size:11px}.stat-copy>strong{font-size:19px}.stat-copy>strong.recent-date{font-size:15px}.stat-copy>small{font-size:9px}.stat-icon{width:30px;height:30px}.analytics-grid{grid-template-columns:1fr}.transactions-heading{align-items:flex-start;padding:16px}.transactions-heading h2{font-size:14px}.transactions-heading p{font-size:10px}.export-button{min-height:36px;padding:0 10px;font-size:10px}.transaction-filters{padding:0 12px 12px;gap:7px}.status-picker{flex:1;width:auto;min-width:145px}.date-picker{flex:1;width:auto;min-width:125px}.transaction-search{min-width:100%;height:40px}.table-pagination{align-items:flex-start;flex-direction:column;padding:12px}.table-pagination nav{width:100%;justify-content:flex-end}.payments-error{align-items:flex-start;font-size:11px}.payment-modal dl{grid-template-columns:1fr}.payment-modal dl>div:last-child{border-bottom:0}}
@media(max-width:420px){.payments-heading{flex-direction:column}.stats-toggle{align-self:flex-start}.payment-stats{grid-template-columns:1fr}.payment-stat{min-height:88px}.payments-error{flex-wrap:wrap}.payments-error>span{flex-basis:calc(100% - 32px)}.payments-error button{margin-left:27px}}
.payments-heading-actions{display:flex;align-items:center;gap:9px}.add-expense-button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:8px;padding:0 14px;border:1px solid #315a43;border-radius:10px;background:#315a43;color:#fff;font-family:inherit;font-size:12px;font-weight:650;cursor:pointer;box-shadow:0 4px 11px #315a4318;transition:transform .16s,background .16s,box-shadow .16s}.add-expense-button:hover{transform:translateY(-1px);background:#244a32;box-shadow:0 6px 14px #315a4326}.household-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.household-summary article{display:flex;min-height:96px;align-items:center;gap:13px;padding:16px;border:1px solid #e8ede9;border-radius:14px;background:#fff;box-shadow:0 3px 11px rgba(31,50,38,.035)}.household-summary-icon{display:grid;width:38px;height:38px;flex:none;place-items:center;border-radius:11px;background:#edf5ef;color:#52775a}.household-summary article>div{display:flex;min-width:0;flex-direction:column;gap:4px}.household-summary small{color:#718076;font-size:11px}.household-summary strong{color:#2e4535;font-size:21px;font-weight:650}.household-summary article>div>span{color:#96a098;font-size:10px}.expense-modal{width:min(100%,540px)}.expense-form{display:flex;flex-direction:column;gap:13px;padding:17px 20px 19px}.expense-form label{display:flex;min-width:0;flex-direction:column;gap:6px;color:#617066;font-size:11px;font-weight:600}.expense-form input,.expense-form textarea{width:100%;min-height:42px;padding:0 11px;border:1px solid #dfe7e0;border-radius:9px;background:#fbfcfb;color:#35463a;font:inherit;font-size:12px;outline:0;transition:border-color .16s,box-shadow .16s,background .16s}.expense-form textarea{min-height:74px;padding:10px 11px;resize:vertical}.expense-form input:focus,.expense-form textarea:focus{border-color:#89aa8e;background:#fff;box-shadow:0 0 0 3px #315a4310}.expense-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.expense-disclaimer{display:flex;align-items:flex-start;gap:7px;margin:0;padding:9px 10px;border:1px solid #e4ece5;border-radius:9px;background:#f7faf7;color:#748278;font-size:10px;line-height:1.45}.expense-disclaimer svg{flex:none;color:#5c8063}.expense-form>footer{display:flex;justify-content:flex-end;gap:8px;padding-top:13px;border-top:1px solid #edf0ed}.expense-form>footer .stats-toggle{min-height:40px}.expense-form .form-error{margin:0}
@media(max-width:850px){.household-summary{grid-template-columns:1fr 1fr}.household-summary article:first-child{grid-column:1/-1}.household-summary .household-summary-icon{width:34px;height:34px}}
@media(max-width:680px){.payments-heading-actions{width:100%;flex-wrap:wrap}.add-expense-button{min-height:37px;font-size:11px}.household-summary{gap:8px}.household-summary article{min-height:83px;padding:12px}.household-summary article strong{font-size:18px}.household-summary article small{font-size:10px}.expense-form{padding:15px}.expense-form-row{grid-template-columns:1fr}}
</style>

<style scoped>
.payment-table-skeleton{display:grid;gap:0;padding:0 18px 12px}.payment-skeleton-row{display:grid;grid-template-columns:1.45fr 1fr 1fr 1fr .8fr .65fr;align-items:center;gap:16px;min-height:55px;border-bottom:1px solid #edf1ed}.payment-skeleton-row i{position:relative;display:block;width:72%;height:11px;overflow:hidden;border-radius:99px;background:#edf1ee}.payment-skeleton-row i:first-child{width:58%}.payment-skeleton-row i:last-child{width:48%}.payment-skeleton-row i::after{position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,#fff9,transparent);content:"";animation:payment-shimmer 1.2s ease-in-out infinite}@keyframes payment-shimmer{100%{transform:translateX(100%)}}@media(max-width:680px){.payment-skeleton-row{grid-template-columns:1.2fr 1fr 1fr;gap:10px}.payment-skeleton-row i:nth-child(n+4){display:none}}@media(prefers-reduced-motion:reduce){.payment-skeleton-row i::after{animation:none}}
</style>
