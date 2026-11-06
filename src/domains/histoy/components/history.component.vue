<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Activity, Bell, BusFront, CalendarDays, Check, ChevronLeft, ChevronRight, CreditCard, Eye, FileText, RefreshCw, Search, X } from 'lucide-vue-next'
import { listActivityEvents, listNotifications } from '@/shared/services/payidRepository.js'
import StyledSelect from '@/shared/ui/StyledSelect.component.vue'

const entries = ref([])
const loading = ref(true)
const error = ref('')
const query = ref('')
const typeFilter = ref('all')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = 10
const sortDirection = ref('desc')
const selected = ref(null)

const typeOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'payment', label: 'Pagos' },
  { value: 'document', label: 'Documentos' },
  { value: 'transport', label: 'Transporte' },
  { value: 'notification', label: 'Notificaciones' },
  { value: 'profile', label: 'Perfil' },
  { value: 'family', label: 'Familia' },
  { value: 'system', label: 'Sistema' },
]

const statusOptions = computed(() => [{ value: 'all', label: 'Todos los estados' }, ...[...new Set(entries.value.map(item => item.status).filter(Boolean))].map(status => ({ value: status, label: status }))])

function sessionUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {}
    return user.id ?? user.usuarioId ?? user.userId ?? user.Id ?? null
  } catch { return null }
}

function unwrap(response) {
  if (Array.isArray(response)) return response
  return response?.data ?? response?.items ?? response?.$values ?? []
}

async function loadHistory() {
  loading.value = true
  error.value = ''
  try {
    const [activity, notifications] = await Promise.all([listActivityEvents(), listNotifications()])
    const notices = notifications.map(item => ({ id: `notification-${item.id}`, kind: 'notification', title: item.title, detail: item.message, date: item.date, status: item.isRead ? 'Leída' : 'No leída', reference: item.sourceActivityId || item.id }))
    entries.value = [...activity, ...notices].map(item => ({ ...item, detail: cleanActivityDetail(item.detail), status: cleanActivityStatus(item.status) })).sort((a, b) => (timestamp(b.date) || 0) - (timestamp(a.date) || 0))
  } catch (cause) { error.value = cause.message || 'No se pudo cargar el historial.' }
  finally { loading.value = false }
}
function documentTypeName(value) {
  const names = { 1: 'DNI', 2: 'Carnet de extranjería', 3: 'Pasaporte', 4: 'Carnet universitario' }
  return names[value] ?? names[Number(value)] ?? String(value)
}
function documentStatusName(value) {
  const names = { 0: 'Pendiente', 1: 'Activo', 2: 'Rechazado' }
  return names[value] ?? names[Number(value)] ?? String(value || 'Registrado')
}
function notificationStatusName(value) {
  const names = { 0: 'No leída', 1: 'Leída' }
  return names[value] ?? names[Number(value)] ?? String(value || 'Nueva')
}
function timestamp(value) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}
function formattedDate(value) {
  if (!value || !timestamp(value)) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function cleanActivityDetail(value) {
  return String(value || '').replace(/\s*[?·–-]?\s*(?:simulad[oa]s?|no se realiz)[\s\S]*$/i, '').trim()
}
function cleanActivityStatus(value) {
  return /simulad/i.test(String(value || '')) ? 'Registrado' : value
}
function kindLabel(kind) {
  return ({ payment: 'Pago', document: 'Documento', transport: 'Transporte', notification: 'Notificación', profile: 'Perfil', family: 'Familia', system: 'Sistema' })[kind] || 'Actividad'
}

const counts = computed(() => ({
  total: entries.value.length,
  payment: entries.value.filter(item => item.kind === 'payment').length,
  document: entries.value.filter(item => item.kind === 'document').length,
  transport: entries.value.filter(item => item.kind === 'transport').length,
  notification: entries.value.filter(item => item.kind === 'notification').length,
}))
const filtered = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('es')
  return entries.value.filter(item => {
    const typeMatch = typeFilter.value === 'all' || item.kind === typeFilter.value
    const statusMatch = statusFilter.value === 'all' || item.status === statusFilter.value
    const searchMatch = !search || [item.title, item.detail, item.status, item.reference].join(' ').toLocaleLowerCase('es').includes(search)
    return typeMatch && statusMatch && searchMatch
  }).sort((a, b) => (timestamp(a.date) - timestamp(b.date)) * (sortDirection.value === 'asc' ? 1 : -1))
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageEntries = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const firstShown = computed(() => filtered.value.length ? (page.value - 1) * pageSize + 1 : 0)
const lastShown = computed(() => Math.min(page.value * pageSize, filtered.value.length))
watch([query, typeFilter, statusFilter], () => { page.value = 1 })
watch(pages, value => { if (page.value > value) page.value = value })
onMounted(loadHistory)
</script>

<template>
  <main class="history-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow"><Activity :size="15" /> PAYID · ACTIVIDAD</span>
        <h1>Historial general</h1>
        <p>Consulta en un solo lugar los movimientos y novedades de tu cuenta.</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadHistory"><RefreshCw :size="16" :class="{ spinning: loading }" /> Actualizar</button>
    </header>


    <section class="summary-grid" aria-label="Resumen de actividad">
      <article class="summary-card"><span class="summary-icon green"><Activity :size="19" /></span><div><span class="summary-label">Actividad total</span><strong>{{ counts.total }}</strong><small>Registros en tu cuenta</small></div></article>
      <article class="summary-card"><span class="summary-icon blue"><CreditCard :size="19" /></span><div><span class="summary-label">Pagos</span><strong>{{ counts.payment }}</strong><small>Movimientos registrados</small></div></article>
      <article class="summary-card"><span class="summary-icon amber"><FileText :size="19" /></span><div><span class="summary-label">Documentos</span><strong>{{ counts.document }}</strong><small>Documentos gestionados</small></div></article>
      <article class="summary-card"><span class="summary-icon transport"><BusFront :size="19" /></span><div><span class="summary-label">Transporte</span><strong>{{ counts.transport }}</strong><small>Tarjetas y recargas</small></div></article>
      <article class="summary-card"><span class="summary-icon violet"><Bell :size="19" /></span><div><span class="summary-label">Notificaciones</span><strong>{{ counts.notification }}</strong><small>Avisos de tu cuenta</small></div></article>
    </section>

    <section class="activity-card">
      <div class="card-heading">
        <div><span class="section-kicker">TU CUENTA</span><h2>Actividad reciente</h2><p>Pagos, documentos y avisos asociados a tu perfil.</p></div>
      </div>
      <div class="toolbar">
        <label class="search-field"><Search :size="18" /><input v-model="query" type="search" placeholder="Buscar en el historial..." aria-label="Buscar en el historial" /></label>
        <StyledSelect v-model="typeFilter" :options="typeOptions" aria-label="Filtrar por tipo de actividad" />
        <StyledSelect v-model="statusFilter" :options="statusOptions" aria-label="Filtrar por estado" />
      </div>

      <div v-if="loading" class="state-panel"><span class="loader"></span><strong>Cargando tu actividad</strong><span>Estamos reuniendo los movimientos de tu cuenta.</span></div>
      <div v-else-if="error && !entries.length" class="state-panel"><span class="state-icon warning"><Activity :size="22" /></span><strong>{{ error }}</strong><button class="secondary-button" type="button" @click="loadHistory"><RefreshCw :size="15" /> Reintentar</button></div>
      <template v-else>
        <div v-if="error" class="inline-notice"><span>{{ error }}</span><button type="button" @click="loadHistory">Reintentar</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ACTIVIDAD</th><th>DETALLE</th><th><button class="sort-button" type="button" @click="sortDirection = sortDirection === 'desc' ? 'asc' : 'desc'">FECHA <span>{{ sortDirection === 'desc' ? '↓' : '↑' }}</span></button></th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
            <tbody v-if="pageEntries.length">
              <tr v-for="item in pageEntries" :key="item.id">
                <td><div class="activity-name"><span class="row-icon" :class="item.kind"><CreditCard v-if="item.kind === 'payment'" :size="17" /><FileText v-else-if="item.kind === 'document'" :size="17" /><BusFront v-else-if="item.kind === 'transport'" :size="17" /><Bell v-else :size="17" /></span><span><strong>{{ item.title }}</strong><small>{{ kindLabel(item.kind) }}</small></span></div></td>
                <td class="detail-cell">{{ item.detail || '—' }}</td><td class="date-cell"><CalendarDays :size="15" /> {{ formattedDate(item.date) }}</td>
                <td><span class="status-pill" :class="item.kind">{{ item.status }}</span></td>
                <td><button class="icon-button" type="button" title="Ver detalle" aria-label="Ver detalle" @click="selected = item"><Eye :size="17" /></button></td>
              </tr>
            </tbody>
            <tbody v-else><tr><td colspan="5"><div class="empty-state"><span class="empty-icon"><Activity :size="22" /></span><strong>{{ entries.length ? 'No hay resultados para estos filtros' : 'Aún no hay actividad registrada' }}</strong><span>{{ entries.length ? 'Prueba con otro término o tipo.' : 'Tus pagos, documentos y notificaciones aparecerán aquí.' }}</span><button v-if="query || typeFilter !== 'all' || statusFilter !== 'all'" type="button" @click="query = ''; typeFilter = 'all'; statusFilter = 'all'">Limpiar filtros</button></div></td></tr></tbody>
          </table>
        </div>
        <footer class="table-footer"><span>Mostrando <strong>{{ firstShown }}–{{ lastShown }}</strong> de <strong>{{ filtered.length }}</strong> registros</span><div class="pagination"><button type="button" aria-label="Página anterior" :disabled="page <= 1" @click="page--"><ChevronLeft :size="17" /></button><span>Página {{ page }} de {{ pages }}</span><button type="button" aria-label="Página siguiente" :disabled="page >= pages" @click="page++"><ChevronRight :size="17" /></button></div></footer>
      </template>
    </section>

    <Teleport to="body">
      <div v-if="selected" class="modal-backdrop" @click.self="selected = null" @keydown.esc="selected = null">
        <section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <header class="detail-modal-header">
            <span class="modal-icon" :class="selected.kind"><CreditCard v-if="selected.kind === 'payment'" :size="21" /><FileText v-else-if="selected.kind === 'document'" :size="21" /><BusFront v-else-if="selected.kind === 'transport'" :size="21" /><Bell v-else :size="21" /></span>
            <div class="detail-modal-heading"><span class="section-kicker">DETALLE DE ACTIVIDAD</span><h2 id="detail-title">{{ selected.title }}</h2></div>
            <button class="modal-close" type="button" aria-label="Cerrar" @click="selected = null"><X :size="18" /></button>
          </header>
          <div class="detail-modal-body">
            <div class="detail-summary"><span class="summary-check"><Check :size="15" /></span><p>{{ selected.detail || 'Este registro forma parte de la actividad de tu cuenta PayID.' }}</p></div>
            <div class="detail-list">
              <div><span>Tipo de actividad</span><strong>{{ kindLabel(selected.kind) }}</strong></div>
              <div><span>Fecha de registro</span><strong>{{ formattedDate(selected.date) }}</strong></div>
              <div><span>Estado</span><strong><i class="detail-status-dot" :class="selected.kind"></i>{{ selected.status }}</strong></div>
              <div><span>Número de referencia</span><strong class="reference-value">{{ selected.reference }}</strong></div>
            </div>
          </div>
          <footer class="detail-modal-footer"><span><Check :size="14" /> Información de tu cuenta PayID</span><button class="primary-button" type="button" @click="selected = null">Cerrar</button></footer>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<style>
.history-page{--green:#315a43;--green-dark:#284a37;--ink:#17261e;--muted:#77847c;--line:#e6ebe7;max-width:1480px;margin:0 auto;padding:28px 32px 44px;color:var(--ink)}
.page-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.eyebrow,.section-kicker{display:flex;align-items:center;gap:8px;color:#829087;font-size:11px;font-weight:750;letter-spacing:.1em}.eyebrow svg{color:var(--green)}.page-heading h1{margin:9px 0 5px;font-size:30px;line-height:1.2;letter-spacing:-.035em}.page-heading p,.card-heading p{margin:0;color:var(--muted);font-size:14px}.refresh-button,.secondary-button,.primary-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid #dce5de;border-radius:11px;background:#fff;color:var(--green);font-weight:650;padding:11px 15px;cursor:pointer;transition:.18s ease}.refresh-button:hover,.secondary-button:hover{background:#f4f8f5;border-color:#c9d9ce}.refresh-button:disabled{opacity:.65;cursor:wait}.spinning{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:20px}.summary-card{display:flex;align-items:center;gap:14px;min-height:112px;padding:18px;background:#fff;border:1px solid var(--line);border-radius:15px;box-shadow:0 5px 18px #1c35220a}.summary-icon,.row-icon,.modal-icon,.empty-icon,.state-icon{display:grid;place-items:center;flex:none;border-radius:12px}.summary-icon{width:44px;height:44px}.summary-icon.green,.row-icon.payment,.modal-icon.payment{background:#eaf4ed;color:#438159}.summary-icon.blue{background:#edf3fb;color:#587ca8}.summary-icon.amber,.row-icon.document,.modal-icon.document{background:#fbf2e6;color:#b57b37}.summary-icon.violet,.row-icon.notification,.modal-icon.notification{background:#f2effa;color:#8069aa}.summary-card>div{display:flex;flex-direction:column;align-items:flex-start}.summary-label{color:#647168;font-size:13px}.summary-card strong{margin:2px 0;font-size:25px;line-height:1.15;letter-spacing:-.03em}.summary-card small{color:#87938b;font-size:11px}
.activity-card{overflow:visible;background:#fff;border:1px solid var(--line);border-radius:17px;box-shadow:0 8px 24px #1c35220a}.card-heading{padding:22px 24px 18px}.card-heading h2{margin:6px 0 5px;font-size:19px;letter-spacing:-.02em}.toolbar{display:flex;gap:12px;padding:0 24px 18px}.search-field{display:flex;align-items:center;gap:10px;flex:1;min-width:150px;height:44px;padding:0 13px;background:#f8faf8;border:1px solid #e0e7e1;border-radius:10px;color:#91a096}.search-field:focus-within{border-color:#8ba994;box-shadow:0 0 0 3px #315a4314}.search-field input{width:100%;border:0;outline:0;background:transparent;color:#28382e;font:inherit;font-size:13px}.search-field input::placeholder{color:#9aa59d}.toolbar :deep(.styled-select),.toolbar :deep(.select-wrapper){min-width:190px}
.table-wrap{overflow-x:auto;border-top:1px solid var(--line)}table{width:100%;border-collapse:collapse;text-align:left}thead{background:#f7f9f7}th{height:42px;padding:0 18px;color:#849087;font-size:10px;font-weight:750;letter-spacing:.075em;white-space:nowrap}th:first-child,td:first-child{padding-left:24px}.sort-button{display:flex;align-items:center;gap:7px;border:0;background:none;color:inherit;font:inherit;letter-spacing:inherit;cursor:pointer}.sort-button span{font-size:14px;color:var(--green)}td{height:69px;padding:10px 18px;border-top:1px solid #edf0ed;font-size:13px;color:#526158;white-space:nowrap}.activity-name{display:flex;align-items:center;gap:11px}.row-icon{width:36px;height:36px;border-radius:10px}.row-icon.payment{background:#edf5ef}.row-icon.document{background:#fbf4e9}.row-icon.notification{background:#f3f0fa}.activity-name>span:last-child{display:flex;flex-direction:column;gap:3px}.activity-name strong{color:#2c3931;font-size:13px;font-weight:650}.activity-name small{color:#89958d;font-size:11px}.detail-cell{max-width:300px;overflow:hidden;text-overflow:ellipsis}.date-cell{color:#65736a}.date-cell svg{vertical-align:-3px;margin-right:4px;color:#8a998f}.status-pill{display:inline-flex;padding:5px 9px;border-radius:7px;background:#eef2ef;color:#627067;font-size:11px;font-weight:650}.status-pill.payment{background:#edf5ef;color:#457853}.status-pill.document{background:#fbf4e9;color:#9a6a2e}.status-pill.notification{background:#f2eff9;color:#73619a}.icon-button,.pagination button,.modal-close{display:grid;place-items:center;width:34px;height:34px;border:1px solid #e1e8e2;border-radius:9px;background:#fff;color:#7b8a80;cursor:pointer;transition:.15s}.icon-button:hover,.pagination button:not(:disabled):hover,.modal-close:hover{border-color:#b9cbbd;background:#f4f8f5;color:var(--green)}.table-footer{display:flex;align-items:center;justify-content:space-between;min-height:58px;padding:0 24px;border-top:1px solid var(--line);color:#7c8980;font-size:12px}.table-footer strong{color:#46564b;font-weight:650}.pagination{display:flex;align-items:center;gap:9px}.pagination span{min-width:100px;text-align:center;color:#68766d}.pagination button{width:31px;height:31px}.pagination button:disabled{opacity:.4;cursor:default}
.state-panel,.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:245px;text-align:center;color:#8b978f}.state-panel strong,.empty-state strong{color:#33433a;font-size:15px}.state-panel>span:last-of-type,.empty-state>span:last-of-type{font-size:13px}.loader{width:27px;height:27px;border:3px solid #e5ede7;border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite}.state-icon{width:45px;height:45px;background:#fbf2e6;color:#aa783e}.secondary-button{margin-top:5px;padding:9px 13px;font-size:12px}.empty-state{min-height:230px}.empty-icon{width:46px;height:46px;background:#edf4ef;color:#578365}.empty-state button,.inline-notice button{border:0;background:transparent;color:var(--green);font:inherit;font-weight:650;cursor:pointer}.inline-notice{display:flex;justify-content:space-between;align-items:center;margin:0 24px 14px;padding:10px 13px;border:1px solid #f0dfc3;border-radius:9px;background:#fffaf1;color:#876333;font-size:12px}.inline-notice button{font-size:12px}.modal-backdrop{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:#14231bb3;backdrop-filter:blur(4px)}.detail-modal{position:relative;width:min(100%,440px);padding:28px;background:#fff;border:1px solid #edf0ed;border-radius:20px;box-shadow:0 24px 80px #101a1440}.modal-close{position:absolute;top:17px;right:17px}.modal-icon{width:48px;height:48px;margin-bottom:18px;border-radius:14px}.detail-modal h2{margin:8px 0;font-size:22px;letter-spacing:-.03em}.modal-description{margin:0;color:#78857c;font-size:14px}.detail-list{margin:22px 0;border-top:1px solid var(--line)}.detail-list>div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line);font-size:13px}.detail-list span{color:#829087}.detail-list strong{color:#34443a;text-align:right;font-weight:620}.primary-button{width:100%;background:var(--green);border-color:var(--green);color:#fff}.primary-button:hover{background:var(--green-dark)}
.detail-modal{display:flex;width:min(100%,500px);max-height:min(88vh,680px);flex-direction:column;overflow:hidden;padding:0;border-radius:19px;animation:history-modal-enter .22s cubic-bezier(.2,.8,.2,1) both}@keyframes history-modal-enter{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.detail-modal-header{display:flex;align-items:center;gap:14px;padding:20px 22px;border-bottom:1px solid #edf0ed;background:linear-gradient(180deg,#fff,#fcfdfc)}.detail-modal-heading{display:flex;min-width:0;flex:1;flex-direction:column;gap:5px}.detail-modal-heading .section-kicker{font-size:9px}.detail-modal h2{margin:0;overflow:hidden;color:#293b2e;font-size:19px;font-weight:650;letter-spacing:-.025em;text-overflow:ellipsis;white-space:nowrap}.detail-modal-header .modal-icon{display:grid;width:46px;height:46px;flex:none;place-items:center;margin:0;border-radius:13px}.modal-close{position:static;width:34px;height:34px;flex:none;border:1px solid #e2e9e3;border-radius:9px;background:#fff;color:#718077;cursor:pointer;transition:.16s}.modal-close:hover{border-color:#cbd9cd;background:#f3f7f3;color:#315a43}
.detail-modal-body{overflow-y:auto;padding:21px 22px 17px}.detail-summary{display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border:1px solid #e8efe9;border-radius:12px;background:#f7faf7}.detail-summary p{margin:0;color:#58685d;font-size:13px;line-height:1.55}.summary-check{display:grid;width:23px;height:23px;flex:none;place-items:center;border-radius:7px;background:#e7f2e9;color:#4d8057}.detail-modal .detail-list{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:17px 0 0;border:0}.detail-modal .detail-list>div{display:flex;min-width:0;min-height:76px;flex-direction:column;justify-content:center;gap:7px;padding:12px 13px;border:1px solid #edf0ed;border-radius:11px;background:#fff}.detail-modal .detail-list span{color:#89958d;font-size:10px;font-weight:550}.detail-modal .detail-list strong{display:flex;align-items:center;gap:7px;overflow:hidden;color:#34443a;font-size:12px;font-weight:650;text-align:left;text-overflow:ellipsis;white-space:nowrap}.detail-modal .detail-list .reference-value{font-size:10px}.detail-status-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#91a098}.detail-status-dot.document{background:#bd873f}.detail-status-dot.payment{background:#568260}.detail-status-dot.notification{background:#8972ae}
.detail-modal-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;border-top:1px solid #edf0ed;background:#fbfcfb}.detail-modal-footer>span{display:flex;align-items:center;gap:7px;color:#849188;font-size:10px}.detail-modal-footer>span svg{color:#5d8a64}.detail-modal .primary-button{display:inline-flex;width:auto;min-width:94px;min-height:37px;align-items:center;justify-content:center;padding:0 16px;border-radius:9px;background:var(--green);color:#fff;font-size:12px;font-weight:650;cursor:pointer}.detail-modal .primary-button:hover{background:var(--green-dark)}
@media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.history-page{padding:24px 22px 36px}}
@media(max-width:600px){.history-page{padding:20px 14px 30px}.page-heading{align-items:flex-start}.page-heading h1{font-size:25px}.page-heading p{max-width:270px;font-size:13px}.refresh-button{padding:9px 10px;font-size:12px}.summary-grid{gap:9px}.summary-card{min-height:94px;gap:9px;padding:12px}.summary-icon{width:36px;height:36px}.summary-card strong{font-size:21px}.summary-card small{font-size:10px}.summary-label{font-size:12px}.card-heading{padding:18px 16px 14px}.toolbar{flex-direction:column;padding:0 16px 15px}.toolbar .styled-select,.toolbar .select-wrapper{width:100%}.table-footer{padding:0 14px;font-size:11px}.pagination{gap:4px}.pagination span{min-width:86px}.table-wrap table{min-width:760px}.detail-modal-header{gap:11px;padding:17px}.detail-modal-body{padding:16px 17px 13px}.detail-modal .detail-list{gap:8px}.detail-modal .detail-list>div{min-height:70px;padding:10px}.detail-modal-footer{padding:12px 17px}.detail-modal-footer>span{font-size:9px}}
.history-page .summary-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.history-page .summary-icon.transport,.history-page .row-icon.transport,.history-page .modal-icon.transport{background:#edf3fb;color:#5b7eaa}.history-page .status-pill.transport{background:#edf3fb;color:#557aa4}.history-demo-note{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #e4ebe5;border-radius:10px;background:#fbfdfb;color:#728076;font-size:11px;line-height:1.45}.history-demo-note svg{flex:none;color:#65806a}
@media(max-width:1100px){.history-page .summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.history-page .summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>

<style scoped>
.history-page .toolbar{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(170px,.65fr) minmax(175px,.7fr);gap:10px}
.history-page .toolbar :deep(.styled-select),.history-page .toolbar :deep(.select-wrapper){width:100%;min-width:0}
@media(max-width:850px){.history-page .toolbar{grid-template-columns:minmax(0,1fr) minmax(160px,.7fr)}.history-page .toolbar .search-field{grid-column:1/-1}}
@media(max-width:600px){.history-page .toolbar{grid-template-columns:1fr}.history-page .toolbar .search-field{grid-column:auto}}
</style>
