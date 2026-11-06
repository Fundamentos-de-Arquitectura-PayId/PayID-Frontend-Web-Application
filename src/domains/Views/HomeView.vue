<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BusFront, CalendarDays, Check, WalletCards,
  ChevronLeft, ChevronRight, CircleAlert, CreditCard, FileClock, FileText,
  LayoutDashboard, ShieldCheck, UserRound, GraduationCap,
} from 'lucide-vue-next'
import { listDocuments, listNotifications, listPayments } from '../../shared/services/payidRepository.js'
import SupportChatWidget from '@/domains/support/components/support.component.vue'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend)

const loading = ref(true)
const loadError = ref('')
const user = ref({})
const payments = ref([])
const documents = ref([])
const notifications = ref([])
const charts = ref(false)
const calendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const isFamilyProfile = computed(() => ['family', 'parent', 'guardian', 'padre', 'apoderado', 'padre_apoderado'].includes(String(user.value.segmento || user.value.segment || '').trim().toLowerCase()))
const cardHolder = computed(() => user.value.nombre || user.value.name || user.value.email?.split('@')[0] || 'Cuenta PayID')
const cardProfileLabel = computed(() => isFamilyProfile.value ? 'Padre, madre o apoderado' : 'Estudiante de educación superior')
const maskedIdentity = computed(() => {
  const dniDocument = documents.value.find((document) => /dni|identidad/i.test(String(document.tipo || document.type || document.tipoDocumento || '')))
  const identityNumber = user.value.dni || user.value.DNI || user.value.numeroDocumento || user.value.documentNumber || dniDocument?.numero || dniDocument?.number || ''
  const digits = String(identityNumber).replace(/\D/g, '')
  return digits ? `••••  ••••  ${digits.slice(-4)}` : 'CREDENCIAL PAYID'
})
const totalPaid = computed(() => payments.value.reduce((sum, payment) => sum + amountOf(payment), 0))
const validDocuments = computed(() => documents.value.filter((doc) => ['vigente', 'verificado', 'activo'].includes(String(doc.estado || '').toLowerCase())).length)
const documentAlerts = computed(() => documents.value.filter((doc) => {
  const status = String(doc.estado || doc.status || '').toLowerCase()
  if (status.includes('vencid') || status.includes('expir') || status.includes('por vencer')) return true
  const expiry = expiryValue(doc)
  if (!expiry) return false
  const date = localDate(expiry)
  if (!date) return false
  const daysLeft = daysFromToday(date)
  return Number.isFinite(daysLeft) && daysLeft <= 30
}).length)
const unread = computed(() => notifications.value.filter((item) => !item.leido && !item.read).length)
const recentPayments = computed(() => [...payments.value].sort((a, b) => new Date(b.fecha || b.createdAt || 0) - new Date(a.fecha || a.createdAt || 0)).slice(0, 5))
const recentNotifications = computed(() => [...notifications.value].sort((a, b) => new Date(b.fecha || b.createdAt || 0) - new Date(a.fecha || a.createdAt || 0)).slice(0, 3))
const todayLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' }).format(new Date())
const monthLabel = computed(() => calendarMonth.value.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }))
const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const greeting = computed(() => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
})

function expiryValue(document) {
  return document.fechaVencimiento || document.expiryDate || document.expirationDate || ''
}

function localDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysFromToday(date) {
  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((dateUtc - todayUtc) / 86400000)
}

const upcomingDocuments = computed(() => documents.value
  .map((document) => {
    const date = localDate(expiryValue(document))
    return date ? { document, date, days: daysFromToday(date) } : null
  })
  .filter((item) => item && item.days >= -30 && item.days <= 60)
  .sort((a, b) => a.date - b.date)
  .slice(0, 4))

const calendarCells = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1
    if (day < 1 || day > daysInMonth) return { key: `empty-${index}`, day: null }
    const date = new Date(year, month, day)
    const today = new Date()
    const hasExpiry = documents.value.some((document) => {
      const expiry = localDate(expiryValue(document))
      return expiry && expiry.getFullYear() === year && expiry.getMonth() === month && expiry.getDate() === day
    })
    return {
      key: `day-${day}`,
      day,
      today: date.toDateString() === today.toDateString(),
      hasExpiry,
    }
  })
})

function shiftCalendarMonth(offset) {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + offset, 1)
}

function expirationLabel(days) {
  if (days < 0) return `Venció hace ${Math.abs(days)} d.`
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} d.`
}

function amountOf(payment) {
  const value = Number(payment.monto ?? payment.amount ?? payment.total ?? 0)
  return Number.isFinite(value) ? value : 0
}

function formatMoney(value) {
  return currency.format(value)
}

function dateLabel(value) {
  if (!value) return 'Sin fecha'
  const date = localDate(value)
  return !date ? 'Sin fecha' : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

function exportChart(id) {
  const canvas = document.getElementById(id)
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `${id}.png`
  link.href = canvas.toDataURL('image/png', 1)
  link.click()
}

const monthlyData = computed(() => {
  const months = new Map()
  for (const payment of payments.value) {
    const date = new Date(payment.fecha || payment.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const label = date.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
    const entry = months.get(key) || { label, total: 0, sort: date.getFullYear() * 12 + date.getMonth() }
    entry.total += amountOf(payment)
    months.set(key, entry)
  }
  return [...months.values()].sort((a, b) => a.sort - b.sort).slice(-6)
})

const categoryData = computed(() => {
  const categories = new Map()
  for (const payment of payments.value) {
    const category = payment.servicio || payment.categoria || payment.concepto || 'Otros'
    categories.set(category, (categories.get(category) || 0) + amountOf(payment))
  }
  return [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
})

const lineData = computed(() => ({
  labels: monthlyData.value.map((item) => item.label),
  datasets: [{ label: 'Pagos', data: monthlyData.value.map((item) => item.total), borderColor: '#315a43', backgroundColor: 'rgba(49,90,67,.12)', fill: true, tension: .38, pointRadius: 3, pointHoverRadius: 6 }],
}))
const barData = computed(() => ({
  labels: categoryData.value.map(([label]) => label),
  datasets: [{ label: 'Gastos', data: categoryData.value.map(([, value]) => value), backgroundColor: ['#315a43', '#6e9a78', '#a8c5a8', '#d1955a', '#83929a'], borderRadius: 7, maxBarThickness: 42 }],
}))
const doughnutData = computed(() => ({
  labels: categoryData.value.map(([label]) => label),
  datasets: [{ data: categoryData.value.map(([, value]) => value), backgroundColor: ['#315a43', '#6e9a78', '#a8c5a8', '#d1955a', '#83929a'], borderWidth: 0, hoverOffset: 5 }],
}))
const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${formatMoney(context.parsed.y)}` } } },
  scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#89948e' } }, y: { beginAtZero: true, border: { display: false, dash: [4, 4] }, grid: { color: '#edf1ed' }, ticks: { color: '#89948e', callback: (value) => `S/ ${value}` } } },
}
const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${formatMoney(context.parsed.y)}` } } },
  scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#89948e', maxRotation: 0, autoSkip: false } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#edf1ed' }, ticks: { color: '#89948e', callback: (value) => `S/ ${value}` } } },
}
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.label}: ${formatMoney(context.parsed)}` } } } }

async function loadDashboard() {
  loading.value = true
  loadError.value = ''
  try {
    const session = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {}
    user.value = session
    const results = await Promise.allSettled([listPayments(), listDocuments(), listNotifications()])
    const [paymentResult, documentResult, notificationResult] = results
    const failures = results.filter(result => result.status === 'rejected')
    payments.value = paymentResult.status === 'fulfilled' ? paymentResult.value.map(item => ({ ...item, servicio: item.service || 'Pago PayID', monto: item.amount || 0, fecha: item.date || '' })) : []
    const documentStatuses = { pending: 'pendiente', active: 'verificado', expired: 'vencido', rejected: 'rechazado' }
    documents.value = documentResult.status === 'fulfilled' ? documentResult.value.map(item => ({ ...item, tipo: item.type || 'Documento', numero: item.number || '', estado: documentStatuses[item.statusKey] || item.statusKey || 'pendiente', fechaVencimiento: item.expirationDate || '', fechaEmision: item.issueDate || '' })) : []
    const notificationTypes = { system: 'Sistema', movement: 'Movimiento', reminder: 'Recordatorio', security: 'Seguridad' }
    notifications.value = notificationResult.status === 'fulfilled' ? notificationResult.value.map(item => ({ ...item, titulo: item.title || 'Aviso PayID', mensaje: item.message || '', tipo: notificationTypes[item.type] || 'Sistema', fecha: item.date || '', leido: item.isRead })) : []
    if (failures.length === results.length) loadError.value = 'No se pudieron cargar los datos. Revisa tu conexi?n e int?ntalo de nuevo.'
    else if (failures.length) loadError.value = 'Algunos datos no est?n disponibles por el momento.'
  } catch (error) {
    loadError.value = error.message || 'No se pudieron cargar los datos.'
  } finally {
    loading.value = false
    charts.value = true
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="dashboard-page">
    <section class="welcome-panel" aria-label="Bienvenida">
      <span class="welcome-orb welcome-orb-one" aria-hidden="true"></span>
      <span class="welcome-orb welcome-orb-two" aria-hidden="true"></span>
      <span class="welcome-grid" aria-hidden="true"></span>
      <div class="welcome-content">
        <div class="welcome-topline">
          <span class="eyebrow"><Activity :size="15" /> {{ isFamilyProfile ? 'ESPACIO FAMILIAR' : 'RESUMEN DE CUENTA' }}</span>
          <span class="system-status"><i aria-hidden="true"></i>Sistema activo</span>
        </div>
        <h2>{{ greeting }}, {{ user.nombre || user.name || user.email?.split('@')[0] || 'Usuario' }}</h2>
        <p>{{ isFamilyProfile ? 'Mant\u00e9n organizados tus documentos familiares y revisa pagos y vencimientos desde un mismo lugar.' : 'Consulta tu identidad, documentos y movimientos recientes.' }}</p>
        <div class="welcome-pills">
          <span><LayoutDashboard :size="14" /> {{ isFamilyProfile ? 'Gesti\u00f3n familiar' : 'Panel de control' }}</span>
          <span><CalendarDays :size="14" /> {{ todayLabel }}</span>
        </div>
      </div>
    </section>

    <div v-if="loadError" class="notice" role="status">
      <CircleAlert :size="18" />
      <span>{{ loadError }}</span>
    </div>

    <div class="dashboard-columns">
      <div class="dashboard-main">
    <section class="quick-links panel" aria-label="Accesos rápidos">
      <div class="quick-links-heading"><div><span class="panel-kicker">PAYID EN UN SOLO LUGAR</span><h3>Accesos rápidos</h3></div></div>
      <div class="quick-link-grid">
        <router-link class="quick-link" :to="{ name: 'wallet' }"><span class="quick-link-icon tone-green"><WalletCards :size="18" /></span><span><strong>Billetera digital</strong><small>Reúne tus tarjetas y credenciales</small></span><ArrowUpRight :size="15" /></router-link>
        <router-link v-if="!isFamilyProfile" class="quick-link" :to="{ name: 'student-card' }"><span class="quick-link-icon tone-green"><GraduationCap :size="18" /></span><span><strong>Credencial estudiantil</strong><small>Completa tu identidad académica</small></span><ArrowUpRight :size="15" /></router-link>
        <router-link class="quick-link" :to="{ name: 'documents' }"><span class="quick-link-icon"><FileText :size="18" /></span><span><strong>{{ isFamilyProfile ? 'Documentos familiares' : 'Mis documentos' }}</strong><small>Consulta y organiza tus archivos</small></span><ArrowUpRight :size="15" /></router-link>
        <router-link class="quick-link" :to="{ name: 'payments' }"><span class="quick-link-icon tone-amber"><CreditCard :size="18" /></span><span><strong>{{ isFamilyProfile ? 'Pagos del hogar' : 'Mis pagos' }}</strong><small>Revisa tus movimientos</small></span><ArrowUpRight :size="15" /></router-link>
        <router-link class="quick-link" :to="{ name: 'transport' }"><span class="quick-link-icon tone-blue"><BusFront :size="18" /></span><span><strong>Transporte</strong><small>Consulta tus tarjetas</small></span><ArrowUpRight :size="15" /></router-link>
        <router-link class="quick-link" :to="{ name: 'notifications' }"><span class="quick-link-icon tone-violet"><Bell :size="18" /></span><span><strong>Notificaciones</strong><small>{{ unread }} sin leer</small></span><ArrowUpRight :size="15" /></router-link>
      </div>
    </section>

    <section class="stats-grid" aria-label="Resumen">
      <article class="stat-card balance-stat">
        <div class="stat-top"><span class="stat-icon"><CreditCard :size="19" /></span><span class="stat-label">{{ isFamilyProfile ? 'Gasto registrado' : 'Total pagado' }}</span></div>
        <strong>{{ loading ? '—' : formatMoney(totalPaid) }}</strong>
        <span class="stat-foot"><ArrowUpRight :size="14" /> {{ isFamilyProfile ? 'Total de pagos en tu cuenta' : 'Acumulado de tus movimientos' }}</span>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon green"><FileText :size="19" /></span><span class="stat-label">{{ isFamilyProfile ? 'Documentos organizados' : 'Documentos' }}</span></div>
        <strong>{{ loading ? '—' : documents.length }}</strong>
        <span class="stat-foot"><ShieldCheck :size="14" /> {{ validDocuments }} activos o verificados</span>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon amber"><Bell :size="19" /></span><span class="stat-label">{{ isFamilyProfile ? 'Alertas de documentos' : 'Notificaciones' }}</span></div>
        <strong>{{ loading ? '\u2014' : (isFamilyProfile ? documentAlerts : unread) }}</strong>
        <span class="stat-foot">{{ isFamilyProfile ? 'Vencidos o pr\u00f3ximos a vencer' : 'Sin leer' }}</span>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon slate"><Activity :size="19" /></span><span class="stat-label">{{ isFamilyProfile ? 'Pagos y movimientos' : 'Movimientos' }}</span></div>
        <strong>{{ loading ? '—' : payments.length }}</strong>
        <span class="stat-foot"><ArrowDownRight :size="14" /> Pagos registrados</span>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel chart-panel">
        <div class="panel-heading"><div><span class="panel-kicker">{{ isFamilyProfile ? 'PAGOS DEL HOGAR' : 'ACTIVIDAD' }}</span><h3>{{ isFamilyProfile ? 'Pagos de tu cuenta por periodo' : 'Evolución de pagos' }}</h3></div><button class="icon-button" type="button" aria-label="Descargar gráfico de pagos" title="Descargar gráfico" @click="exportChart('payment-trend-chart')"><FileText :size="17" /></button></div>
        <div v-if="!loading && monthlyData.length" class="chart-box"><Line v-if="charts" id="payment-trend-chart" :data="lineData" :options="lineOptions" /></div>
        <div v-else class="empty-state"><Activity :size="22" /><span>{{ loading ? 'Cargando movimientos…' : 'Aún no hay pagos para mostrar' }}</span></div>
      </article>
      <article class="panel chart-panel">
        <div class="panel-heading"><div><span class="panel-kicker">{{ isFamilyProfile ? 'RESUMEN DEL HOGAR' : 'DISTRIBUCI??N' }}</span><h3>{{ isFamilyProfile ? 'Gastos por categor\u00eda' : 'Gastos por categoría' }}</h3></div><button class="icon-button" type="button" aria-label="Descargar gráfico de categorías" title="Descargar gráfico" @click="exportChart('category-chart')"><FileText :size="17" /></button></div>
        <div v-if="!loading && categoryData.length" class="category-layout">
          <div class="donut-box"><Doughnut v-if="charts" id="category-chart" :data="doughnutData" :options="doughnutOptions" /><div class="donut-center"><strong>{{ categoryData.length }}</strong><span>categorías</span></div></div>
          <ul class="legend-list"><li v-for="([label, value], index) in categoryData" :key="label"><span class="legend-dot" :class="`tone-${index}`"></span><span class="legend-label">{{ label }}</span><strong>{{ formatMoney(value) }}</strong></li></ul>
        </div>
        <div v-else class="empty-state"><CreditCard :size="22" /><span>{{ loading ? 'Cargando movimientos…' : 'Aún no hay categorías' }}</span></div>
      </article>
      <article class="panel payments-panel">
        <div class="panel-heading"><div><span class="panel-kicker">{{ isFamilyProfile ? 'ACTIVIDAD FAMILIAR' : 'MOVIMIENTOS' }}</span><h3>{{ isFamilyProfile ? 'Pagos y servicios recientes' : 'Pagos recientes' }}</h3></div><span class="count-pill">{{ recentPayments.length }} recientes</span></div>
        <div v-if="loading" class="empty-state compact">Cargando pagos…</div>
        <div v-else-if="recentPayments.length" class="table-wrap"><table><thead><tr><th>Concepto</th><th>Fecha</th><th>Estado</th><th class="amount-cell">Monto</th></tr></thead><tbody><tr v-for="(payment, index) in recentPayments" :key="payment.id ?? index"><td><span class="payment-title"><span class="mini-icon"><CreditCard :size="15" /></span>{{ payment.servicio || payment.categoria || payment.concepto || 'Pago' }}</span></td><td>{{ dateLabel(payment.fecha || payment.createdAt) }}</td><td><span class="status-tag"><Check :size="12" /> {{ payment.estado || 'Registrado' }}</span></td><td class="amount-cell">{{ formatMoney(amountOf(payment)) }}</td></tr></tbody></table></div>
        <div v-else class="empty-state compact"><FileText :size="20" /> Aún no tienes pagos registrados</div>
      </article>
    </section>
      </div>

      <aside class="dashboard-aside" aria-label="Calendario y recordatorios">
        <section class="panel calendar-panel">
          <div class="panel-heading calendar-heading">
            <div><span class="panel-kicker">TU AGENDA</span><h3>Calendario</h3></div>
            <div class="calendar-controls">
              <button type="button" aria-label="Mes anterior" @click="shiftCalendarMonth(-1)"><ChevronLeft :size="16" /></button>
              <button type="button" aria-label="Mes siguiente" @click="shiftCalendarMonth(1)"><ChevronRight :size="16" /></button>
            </div>
          </div>
          <p class="calendar-month">{{ monthLabel }}</p>
          <div class="mini-calendar">
            <span v-for="weekday in weekdayLabels" :key="weekday" class="calendar-weekday">{{ weekday }}</span>
            <span v-for="cell in calendarCells" :key="cell.key" class="calendar-cell">
              <span v-if="cell.day === null" aria-hidden="true"></span>
              <span v-else class="calendar-date" :class="{ today: cell.today, 'has-expiry': cell.hasExpiry }" :aria-label="cell.hasExpiry ? `${cell.day}, vence un documento` : undefined">{{ cell.day }}<i v-if="cell.hasExpiry" aria-hidden="true"></i></span>
            </span>
          </div>
          <div class="calendar-legend"><i></i><span>Vencimiento de documento</span></div>
        </section>

        <section class="panel reminders-panel">
          <div class="panel-heading"><div><span class="panel-kicker">DOCUMENTOS</span><h3>Próximos vencimientos</h3></div><router-link class="panel-link" :to="{ name: 'documents' }">Ver todos</router-link></div>
          <div v-if="loading" class="aside-empty">Revisando fechas…</div>
          <div v-else-if="upcomingDocuments.length" class="reminder-list">
            <router-link v-for="item in upcomingDocuments" :key="item.document.id ?? item.date.toISOString()" class="reminder-item" :to="{ name: 'documents' }">
              <span class="reminder-icon"><FileClock :size="16" /></span>
              <span class="reminder-copy"><strong>{{ item.document.nombre || item.document.tipo || item.document.tipoDocumento || 'Documento' }}</strong><small>{{ dateLabel(expiryValue(item.document)) }}</small></span>
              <span class="reminder-date" :class="{ overdue: item.days < 0, urgent: item.days >= 0 && item.days <= 7 }">{{ expirationLabel(item.days) }}</span>
            </router-link>
          </div>
          <router-link v-else-if="documentAlerts" class="reminder-empty has-alerts" :to="{ name: 'documents' }"><span class="reminder-icon urgent"><FileClock :size="16" /></span><span><strong>{{ documentAlerts }} documentos requieren atención</strong><small>Revisa tus archivos y vencimientos</small></span><ArrowUpRight :size="15" /></router-link>
          <div v-else class="reminder-empty"><span class="reminder-icon"><Check :size="16" /></span><span><strong>Todo al día</strong><small>No hay vencimientos próximos</small></span></div>
        </section>

        <section class="panel recent-notices-panel">
          <div class="panel-heading"><div><span class="panel-kicker">ACTUALIZACIONES</span><h3>Avisos recientes</h3></div><router-link class="panel-link" :to="{ name: 'notifications' }">Ver todos</router-link></div>
          <div v-if="loading" class="aside-empty">Cargando avisos…</div>
          <div v-else-if="recentNotifications.length" class="notice-list">
            <router-link v-for="(item, index) in recentNotifications" :key="item.id ?? index" class="notice-item" :to="{ name: 'notifications' }">
              <span class="notice-dot" :class="{ unread: !item.leido && !item.read }"></span>
              <span class="notice-copy"><strong>{{ item.titulo || item.title || 'Aviso PayID' }}</strong><small>{{ item.mensaje || item.message || 'Tienes una nueva actualización.' }}</small><time>{{ dateLabel(item.fecha || item.createdAt) }}</time></span>
            </router-link>
          </div>
          <div v-else class="reminder-empty"><span class="reminder-icon"><Bell :size="16" /></span><span><strong>Sin avisos nuevos</strong><small>Te mostraremos aquí las novedades</small></span></div>
        </section>
      </aside>
    </div>
    <SupportChatWidget />
  </div>
</template>

<style scoped>
.dashboard-page{width:100%;max-width:1600px;margin:0 auto;padding:26px 30px 42px;display:flex;flex-direction:column;gap:18px;color:#23312a}
.dashboard-columns{display:grid;grid-template-columns:minmax(0,1fr) 292px;align-items:start;gap:17px}
.dashboard-main{display:flex;min-width:0;flex-direction:column;gap:16px}
.cards-panel{padding:17px 18px}
.cards-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}
.cards-panel-heading h3{margin:4px 0 0;color:#27392d;font-size:15px;font-weight:650;letter-spacing:-.02em}
.cards-all-link{display:inline-flex;align-items:center;gap:4px;padding:7px 9px;border:1px solid #e7ede8;border-radius:8px;background:#fff;transition:background .16s,border-color .16s}
.cards-all-link:hover{border-color:#cbd9ce;background:#f7faf7}
.cards-panel-body{display:grid;grid-template-columns:minmax(250px,.95fr) minmax(0,1.05fr);align-items:center;gap:22px}
.payid-digital-card{position:relative;isolation:isolate;display:flex;min-width:0;min-height:174px;flex-direction:column;justify-content:space-between;overflow:hidden;padding:17px 19px;border:1px solid rgba(255,255,255,.15);border-radius:16px;background:radial-gradient(circle at 95% 10%,rgba(160,190,164,.28),transparent 32%),linear-gradient(130deg,#17432f 0%,#286044 53%,#214a36 100%);box-shadow:0 13px 25px rgba(33,73,51,.2);color:#fff}
.digital-card-orbit{position:absolute;z-index:-1;border:1px solid rgba(221,238,222,.1);border-radius:50%;pointer-events:none}
.digital-card-orbit-one{top:-65px;right:12%;width:170px;height:170px;box-shadow:0 0 0 16px rgba(221,238,222,.025),0 0 0 32px rgba(221,238,222,.02)}
.digital-card-orbit-two{right:-43px;bottom:-99px;width:175px;height:175px}
.digital-card-top,.digital-card-brand{position:relative;z-index:1;display:flex;align-items:center}
.digital-card-top{justify-content:space-between;gap:12px}
.digital-card-brand{gap:8px}.digital-card-brand strong{font-size:14px;font-weight:650;letter-spacing:-.02em}
.digital-card-mark{display:grid;width:27px;height:27px;place-items:center;border:1px solid rgba(255,255,255,.5);border-radius:9px;background:rgba(255,255,255,.14);font-size:13px;font-weight:700}
.digital-card-state{padding:5px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(9,31,19,.18);color:#d6e8d8;font-size:7px;font-weight:650;letter-spacing:.1em;white-space:nowrap}
.digital-card-number{position:relative;z-index:1;color:#f2f8f2;font-size:17px;font-weight:550;letter-spacing:.09em;text-shadow:0 1px 8px rgba(7,25,15,.18)}
.digital-card-bottom{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:14px}
.digital-card-bottom span{display:flex;min-width:0;flex-direction:column;gap:4px}.digital-card-bottom span:last-child{text-align:right}
.digital-card-bottom small{color:#bfd5c3;font-size:7px;font-weight:650;letter-spacing:.13em}
.digital-card-bottom strong{overflow:hidden;color:#fff;font-size:9px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.card-details{display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:11px}
.credential-status{display:flex;align-items:center;gap:7px;color:#4e7557;font-size:11px;font-weight:650}
.card-details>p{max-width:48ch;margin:0;color:#7f8c81;font-size:10px;line-height:1.55}
.card-metrics{display:grid;width:100%;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px;padding:10px 11px;border:1px solid #edf1ed;border-radius:10px;background:#fafcfa}
.card-metrics span{display:flex;min-width:0;flex-direction:column;gap:4px;color:#929d94;font-size:8px}
.card-metrics strong{overflow:hidden;color:#44564a;font-size:10px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}
.manage-identity-link{display:inline-flex;align-items:center;gap:6px;color:#41664a;font-size:10px;font-weight:650;text-decoration:none}
.manage-identity-link:hover{color:#284d34;text-decoration:underline}
.welcome-panel{position:relative;isolation:isolate;min-height:185px;overflow:hidden;padding:24px 30px;border:1px solid rgba(255,255,255,.15);border-radius:19px;background:linear-gradient(128deg,#193b2b 0%,#28553a 46%,#173a2b 100%);box-shadow:0 16px 38px -15px rgba(25,60,39,.38),inset 0 1px rgba(255,255,255,.12);animation:welcome-enter .56s cubic-bezier(.22,1,.36,1) both}@keyframes welcome-enter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.welcome-panel::before{position:absolute;inset:-15%;z-index:-2;background:radial-gradient(circle at 88% 17%,rgba(166,211,156,.24),transparent 35%),radial-gradient(circle at 10% 95%,rgba(218,182,112,.16),transparent 36%),radial-gradient(circle at 53% 120%,rgba(79,145,92,.24),transparent 40%);content:"";animation:welcome-light-drift 13s ease-in-out infinite alternate}@keyframes welcome-light-drift{0%{transform:translate3d(-1%,1%,0) scale(1)}100%{transform:translate3d(2%,-2%,0) scale(1.08)}}
.welcome-panel::after{position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.14) 49%,rgba(255,255,255,.04) 54%,transparent 72%);content:"";opacity:0;transform:translateX(-100%) skewX(-12deg);animation:welcome-sheen 5.2s ease-in-out 1s infinite}@keyframes welcome-sheen{0%,34%{opacity:0;transform:translateX(-100%) skewX(-12deg)}48%{opacity:.8}68%,100%{opacity:0;transform:translateX(100%) skewX(-12deg)}}
.welcome-orb{position:absolute;z-index:-1;border:1px solid rgba(232,245,223,.12);border-radius:50%;pointer-events:none}.welcome-orb-one{top:-86px;right:17%;width:245px;height:245px;box-shadow:0 0 0 20px rgba(232,245,223,.025),0 0 0 42px rgba(232,245,223,.02);animation:orb-float 8s ease-in-out infinite}.welcome-orb-two{right:4%;bottom:-140px;width:250px;height:250px;border-color:rgba(232,245,223,.1);animation:orb-float 10s ease-in-out -2s infinite reverse}@keyframes orb-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.02)}}
.welcome-grid{position:absolute;inset:0;z-index:-1;background-image:linear-gradient(rgba(255,255,255,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.11) 1px,transparent 1px);background-position:center;background-size:28px 28px;mask-image:linear-gradient(120deg,transparent 20%,#000 100%);opacity:.12;pointer-events:none}
.welcome-content{position:relative;z-index:1}.welcome-topline{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}.welcome-copy .eyebrow,.eyebrow{display:flex;align-items:center;gap:8px;color:#c1ddc5;font-size:10px;font-weight:750;letter-spacing:.12em;animation:welcome-fade-up .4s ease-out .08s both}.eyebrow svg{color:#b9d9bc;animation:eyebrow-pulse 2.6s ease-in-out infinite}@keyframes eyebrow-pulse{50%{filter:drop-shadow(0 0 5px rgba(179,224,185,.8));transform:scale(1.12)}}.welcome-content h2{margin:0 0 4px;color:#fff;font-size:clamp(23px,2.25vw,31px);font-weight:650;letter-spacing:-.04em;animation:welcome-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both}.welcome-content>p{margin:0 0 15px;color:rgba(238,246,237,.86);font-size:13px;animation:welcome-fade-up .48s ease-out .3s both}@keyframes welcome-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.system-status{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(7,27,17,.26);color:#f1f8f0;font-size:10px;font-weight:600;backdrop-filter:blur(10px);animation:welcome-fade-up .45s ease-out .2s both}.system-status i{width:7px;height:7px;border-radius:50%;background:#77df9a;box-shadow:0 0 0 3px rgba(119,223,154,.16);animation:status-pulse 2s ease-out infinite}@keyframes status-pulse{50%{box-shadow:0 0 0 6px rgba(119,223,154,0);opacity:.8}}
.welcome-pills{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.welcome-pills span{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(5,24,14,.22);color:#f4f8f2;font-size:10px;font-weight:550;backdrop-filter:blur(8px);animation:welcome-fade-up .42s ease-out both}.welcome-pills span:nth-child(1){animation-delay:.42s}.welcome-pills span:nth-child(2){animation-delay:.52s}.welcome-pills svg{color:#c3ddc6}
.notice{display:flex;align-items:center;gap:10px;padding:12px 15px;border:1px solid #f0dfc6;border-radius:11px;background:#fffaf1;color:#795b32;font-size:12px}.notice svg{flex:none}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.stat-card,.panel{border:1px solid #e9eeea;border-radius:15px;background:#fff;box-shadow:0 5px 18px rgba(31,50,38,.04)}.stat-card{min-width:0;padding:18px 19px}.stat-top{display:flex;align-items:center;gap:10px}.stat-icon{display:grid;width:36px;height:36px;place-items:center;border-radius:11px;background:#edf4ef;color:#315a43}.stat-icon.green{background:#eff5eb;color:#64824d}.stat-icon.amber{background:#fbf4e8;color:#b7833d}.stat-icon.slate{background:#eff2f4;color:#64737b}.stat-label{color:#77847c;font-size:11px;font-weight:550}.stat-card>strong{display:block;margin-top:13px;color:#26372c;font-size:25px;font-weight:650;letter-spacing:-.035em}.stat-foot{display:flex;min-height:18px;align-items:center;gap:5px;margin-top:5px;color:#96a098;font-size:10px}.stat-foot svg{color:#6b9275}
.content-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:16px}.panel{min-width:0;padding:20px}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.panel-kicker{color:#9aa69d;font-size:9px;font-weight:750;letter-spacing:.12em}.panel-heading h3{margin:4px 0 0;color:#27392d;font-size:15px;font-weight:650;letter-spacing:-.02em}.icon-button{display:grid;width:34px;height:34px;flex:none;place-items:center;border:1px solid #e8eee9;border-radius:9px;background:#fff;color:#69816f;cursor:pointer}.icon-button:hover{border-color:#bfd0c1;background:#f6faf6;color:#315a43}.chart-box{position:relative;width:100%;height:245px}.category-layout{display:grid;grid-template-columns:minmax(125px,.8fr) minmax(160px,1.2fr);align-items:center;gap:20px;min-height:245px}.donut-box{position:relative;width:100%;max-width:200px;height:190px;margin:auto}.donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}.donut-center strong{color:#2c4132;font-size:24px;font-weight:650}.donut-center span{color:#96a098;font-size:10px}.legend-list{display:flex;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none}.legend-list li{display:grid;grid-template-columns:9px minmax(50px,1fr) auto;align-items:center;gap:8px;min-width:0}.legend-dot{width:8px;height:8px;border-radius:50%;background:#315a43}.legend-dot.tone-1{background:#6e9a78}.legend-dot.tone-2{background:#a8c5a8}.legend-dot.tone-3{background:#d1955a}.legend-dot.tone-4{background:#83929a}.legend-label{overflow:hidden;color:#738077;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.legend-list strong{color:#405247;font-size:10px;font-weight:600;white-space:nowrap}
.empty-state{display:flex;height:245px;align-items:center;justify-content:center;gap:9px;color:#98a39b;font-size:12px}.empty-state svg{color:#92a99a}.empty-state.compact{height:130px}.payments-panel{grid-column:1/-1}.count-pill{padding:6px 9px;border-radius:20px;background:#f2f6f3;color:#6e8173;font-size:10px;font-weight:550}.table-wrap{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:9px 10px;border-bottom:1px solid #edf0ed;color:#98a29b;font-size:9px;font-weight:650;letter-spacing:.06em;text-transform:uppercase}td{padding:12px 10px;border-bottom:1px solid #f0f2f0;color:#738077;font-size:11px}tbody tr:last-child td{border-bottom:0}.payment-title{display:flex;align-items:center;gap:9px;color:#3c4c41;font-size:11px;font-weight:550;white-space:nowrap}.mini-icon{display:grid;width:27px;height:27px;place-items:center;border-radius:8px;background:#f0f5f1;color:#64816a}.status-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:20px;background:#eff6ef;color:#658067;font-size:9px}.amount-cell{text-align:right;color:#364b3b;font-weight:600;white-space:nowrap}.profile-shortcut{display:flex;align-items:center;gap:12px;padding:15px 16px;color:inherit;text-decoration:none;transition:border-color .18s,box-shadow .18s,transform .18s}.profile-shortcut:hover{border-color:#d4e3d6;box-shadow:0 8px 18px #315a4310;transform:translateY(-1px)}.profile-shortcut>span:nth-child(2){display:flex;min-width:0;flex:1;flex-direction:column;gap:5px}.profile-shortcut strong{color:#35483a;font-size:12px}.profile-shortcut small{color:#8d9990;font-size:10px}.profile-shortcut>svg{color:#91a196}.profile-icon{display:grid;width:34px;height:34px;place-items:center;border-radius:10px;background:#eff5f0;color:#5d7a63}.profile-row{display:flex;align-items:center;gap:12px;padding:10px 0 16px}.profile-avatar{display:grid;width:43px;height:43px;flex:none;place-items:center;border-radius:50%;background:#315a43;color:white;font-size:16px;font-weight:650}.profile-row>div{display:flex;min-width:0;flex-direction:column;gap:4px}.profile-row strong{overflow:hidden;color:#36483a;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.profile-row span:not(.profile-avatar){overflow:hidden;color:#929d95;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.profile-meta{display:flex;flex-direction:column;gap:10px;padding-top:13px;border-top:1px solid #eef1ee}.profile-meta span{display:flex;align-items:center;gap:8px;color:#7c8980;font-size:10px}.profile-meta svg{color:#819987}
.quick-links{padding:16px}.quick-links-heading{margin-bottom:12px}.quick-links-heading h3{margin:4px 0 0;color:#27392d;font-size:14px;font-weight:650;letter-spacing:-.02em}.quick-link-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.quick-link{display:grid;min-width:0;grid-template-columns:32px minmax(0,1fr) 13px;align-items:center;gap:8px;padding:10px 9px;border:1px solid #edf1ed;border-radius:11px;background:#fff;color:#49614e;text-decoration:none;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.quick-link:hover{transform:translateY(-2px);border-color:#cbd9ce;background:#fbfdfb;box-shadow:0 6px 14px rgba(35,72,50,.08)}.quick-link>svg{color:#a0afa3}.quick-link>span:nth-child(2){display:flex;min-width:0;flex-direction:column;gap:3px}.quick-link strong{overflow:hidden;color:#3a4c3e;font-size:10px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.quick-link small{overflow:hidden;color:#929c94;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.quick-link-icon{display:grid;width:32px;height:32px;place-items:center;border-radius:10px;background:#edf4ef;color:#53775b}.quick-link-icon.tone-amber{background:#fbf4e8;color:#b7833d}.quick-link-icon.tone-blue{background:#edf3f8;color:#5f7e9b}.quick-link-icon.tone-violet{background:#f2eff8;color:#8171a7}
.dashboard-aside{display:flex;min-width:0;flex-direction:column;gap:14px}.dashboard-aside .panel{padding:16px}.calendar-heading{margin-bottom:8px}.calendar-controls{display:flex;gap:5px}.calendar-controls button{display:grid;width:27px;height:27px;place-items:center;border:1px solid #e9eeea;border-radius:8px;background:#fff;color:#718176;cursor:pointer;transition:background .16s,border-color .16s,color .16s}.calendar-controls button:hover{border-color:#cbd9ce;background:#f4f8f4;color:#315a43}.calendar-month{margin:0 0 10px;color:#516254;font-size:11px;font-weight:600;text-align:center;text-transform:capitalize}.mini-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px 1px;text-align:center}.calendar-weekday{padding:4px 0;color:#a0aaa2;font-size:8px;font-weight:650}.calendar-cell{display:grid;min-height:28px;place-items:center}.calendar-date{position:relative;display:grid;width:26px;height:26px;place-items:center;border-radius:50%;color:#68766b;font-size:9px;font-variant-numeric:tabular-nums}.calendar-date.today{background:#315a43;color:#fff;font-weight:700;box-shadow:0 3px 8px rgba(49,90,67,.2)}.calendar-date.has-expiry:not(.today){background:#edf4ef;color:#315a43;font-weight:700}.calendar-date i{position:absolute;right:2px;bottom:1px;width:4px;height:4px;border-radius:50%;background:#d18a4d}.calendar-date.today i{background:#f4c38a}.calendar-legend{display:flex;align-items:center;gap:6px;margin-top:9px;padding-top:9px;border-top:1px solid #f0f2f0;color:#929c94;font-size:8px}.calendar-legend i{width:6px;height:6px;border-radius:50%;background:#d18a4d}
.panel-link{color:#68816d;font-size:9px;font-weight:600;text-decoration:none;white-space:nowrap}.panel-link:hover{text-decoration:underline;color:#315a43}.reminder-list,.notice-list{display:flex;flex-direction:column}.reminder-item{display:flex;min-width:0;align-items:center;gap:8px;padding:10px 0;border-top:1px solid #f0f2f0;color:inherit;text-decoration:none}.reminder-item:first-child,.notice-item:first-child{border-top:0}.reminder-icon{display:grid;width:31px;height:31px;flex:none;place-items:center;border-radius:10px;background:#eef5ef;color:#64816a}.reminder-icon.urgent{background:#fbf0e9;color:#bf7945}.reminder-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.reminder-copy strong,.notice-copy strong{overflow:hidden;color:#47564a;font-size:9px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.reminder-copy small,.notice-copy small{color:#98a198;font-size:8px}.reminder-date{flex:none;padding:4px 5px;border-radius:6px;background:#f3f7f3;color:#718674;font-size:7px;font-weight:600;white-space:nowrap}.reminder-date.urgent{background:#fff5e9;color:#b07c3c}.reminder-date.overdue{background:#fff0ee;color:#b45a50}.reminder-empty{display:flex;align-items:center;gap:9px;padding:12px 0;color:#7b887e;text-decoration:none}.reminder-empty>span:nth-child(2){display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.reminder-empty strong{color:#536257;font-size:9px;font-weight:600}.reminder-empty small{color:#98a198;font-size:8px}.reminder-empty>svg{color:#8b9b8e}.reminder-empty.has-alerts{color:#ad7440}.aside-empty{padding:12px 0;color:#929c94;font-size:9px}.notice-item{display:flex;min-width:0;gap:9px;padding:10px 0;border-top:1px solid #f0f2f0;color:inherit;text-decoration:none}.notice-dot{width:7px;height:7px;flex:none;margin:4px 2px 0;border-radius:50%;background:#dce4de}.notice-dot.unread{background:#d18a4d;box-shadow:0 0 0 3px #fbf3e8}.notice-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.notice-copy small{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.45}.notice-copy time{color:#a0aaa2;font-size:8px}
.family-shortcuts{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:17px 20px;border:1px solid #e4ebe5;border-radius:15px;background:linear-gradient(110deg,#fff 0%,#f8fbf8 100%);box-shadow:0 5px 18px rgba(31,50,38,.035)}
.family-shortcuts-copy{display:flex;align-items:center;gap:12px;min-width:0}
.family-shortcuts-icon{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:12px;background:#edf4ef;color:#456a50}
.family-shortcuts-copy strong{color:#314437;font-size:13px;font-weight:650}
.family-shortcuts-copy p{margin:4px 0 0;color:#849087;font-size:11px}
.family-shortcut-links{display:flex;gap:9px;flex:none}
.family-shortcut-links a{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #e4ebe5;border-radius:10px;background:#fff;color:#42634b;font-size:11px;font-weight:600;text-decoration:none;transition:background .2s ease,border-color .2s ease,transform .2s ease}
.family-shortcut-links a:hover{transform:translateY(-1px);border-color:#bfd0c1;background:#f7faf7}
@media(max-width:650px){.family-shortcuts{align-items:stretch;flex-direction:column;gap:13px;padding:15px}.family-shortcut-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.family-shortcut-links a{justify-content:center;padding:10px 8px}}
@media(max-width:1200px){.dashboard-columns{grid-template-columns:minmax(0,1fr)}.dashboard-aside{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}}
@media(max-width:1100px){.dashboard-page{padding:24px}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
@media(max-width:700px){.dashboard-page{gap:15px;padding:17px 14px 28px}.dashboard-columns,.dashboard-main{gap:13px}.dashboard-aside{grid-template-columns:minmax(0,1fr)}.cards-panel-body{grid-template-columns:minmax(0,1fr);gap:14px}.payid-digital-card{min-height:164px}.card-details{gap:9px}.welcome-panel{min-height:180px;padding:20px}.welcome-topline{gap:8px}.system-status{gap:6px;padding:6px 8px;font-size:9px}.welcome-content h2{font-size:23px}.welcome-content>p{max-width:38ch;font-size:11px}.welcome-pills{gap:6px}.welcome-pills span{padding:6px 8px;font-size:9px}.welcome-orb-one{right:5%}.stats-grid{gap:10px}.stat-card{padding:14px}.stat-card>strong{font-size:21px}.quick-link-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content-grid{grid-template-columns:minmax(0,1fr);gap:12px}.payments-panel{grid-column:auto}.panel{padding:16px}.chart-box{height:220px}.category-layout{grid-template-columns:minmax(100px,.75fr) minmax(130px,1.25fr);gap:12px;min-height:210px}.donut-box{height:160px}.empty-state{height:210px}}
@media(max-width:400px){.stats-grid{grid-template-columns:minmax(0,1fr)}.stat-card{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 10px}.stat-top{grid-column:1}.stat-card>strong{grid-column:2;grid-row:1/3;margin:0}.stat-foot{grid-column:1}.quick-link-grid{grid-template-columns:minmax(0,1fr)}.category-layout{grid-template-columns:1fr}.donut-box{height:175px}.legend-list{padding:0 8px 10px}}
@media(prefers-reduced-motion:reduce){.welcome-panel,.welcome-panel::before,.welcome-panel::after,.welcome-orb,.welcome-grid,.welcome-content .eyebrow,.welcome-content .eyebrow svg,.welcome-content h2,.welcome-content>p,.system-status i,.welcome-pills span{animation:none!important;transition:none!important}}
</style>
