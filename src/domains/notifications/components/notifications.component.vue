<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Bell, BellRing, CheckCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, CreditCard, Eye, RefreshCw, Search, Shield, X } from 'lucide-vue-next'
import { listNotifications, markNotificationRead } from '@/shared/services/payidRepository.js'
import StyledSelect from '@/shared/ui/StyledSelect.component.vue'

const notifications = ref([])
const loading = ref(true)
const error = ref('')
const query = ref('')
const filter = ref('all')
const typeFilter = ref('all')
const page = ref(1)
const pageSize = 10
const selected = ref(null)

const filterOptions = [
  { value: 'all', label: 'Todas las notificaciones' },
  { value: 'unread', label: 'No leídas' },
  { value: 'read', label: 'Leídas' },
]

const typeOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'reminder', label: 'Recordatorios' },
  { value: 'movement', label: 'Movimientos' },
  { value: 'system', label: 'Sistema' },
  { value: 'security', label: 'Seguridad' },
]

function currentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {}
    return user.id ?? user.usuarioId ?? user.userId ?? user.Id ?? null
  } catch { return null }
}

function unwrap(data) {
  if (Array.isArray(data)) return data
  return data?.data ?? data?.items ?? data?.$values ?? []
}

function statusValue(status) {
  if (typeof status === 'number') return status
  const normalized = String(status ?? '').toLowerCase()
  if (normalized.includes('unread') || normalized.includes('no le')) return 1
  if (normalized.includes('read') || normalized.includes('le')) return 2
  if (normalized.includes('archiv')) return 3
  return Number(status) || 1
}

function typeLabel(type) {
  const labels = { 1: 'Sistema', 2: 'Movimiento', 3: 'Meta', 4: 'Recordatorio', 5: 'Seguridad', system: 'Sistema', movement: 'Movimiento', reminder: 'Recordatorio', security: 'Seguridad' }
  return labels[type] ?? String(type || 'Sistema')
}

function normalize(raw, index) {
  const id = raw.id ?? raw.Id ?? `notification-${index}`
  const status = statusValue(raw.status ?? raw.Status ?? raw.estado)
  return {
    id: String(id),
    title: String(raw.title ?? raw.Title ?? raw.titulo ?? 'Notificación PayID'),
    message: String(raw.message ?? raw.Message ?? raw.mensaje ?? ''),
    type: typeLabel(raw.type ?? raw.Type ?? raw.tipo),
    date: raw.createdAt ?? raw.CreatedAt ?? raw.fecha ?? raw.date ?? '',
    status,
    statusLabel: status === 1 ? 'No leída' : status === 2 ? 'Leída' : 'Archivada',
  }
}

async function loadNotifications() {
  loading.value = true
  error.value = ''
  try {
    notifications.value = (await listNotifications()).map(item => ({ ...item, typeName: typeLabel(item.type), statusLabel: item.isRead ? 'Leída' : 'No leída' }))
  } catch (cause) { error.value = cause.message || 'No se pudieron cargar las notificaciones.' }
  finally { loading.value = false }
}

async function markRead(item) {
  if (item.status === 2) return
  try {
    await markNotificationRead(item.id)
    item.status = 2
    item.isRead = true
    item.statusLabel = 'Leída'
  } catch (cause) { error.value = cause.message || 'No se pudo actualizar la notificación.' }
}
async function markAllRead() {
  try {
    await markNotificationRead()
    notifications.value = notifications.value.map(item => ({ ...item, status: 2, isRead: true, statusLabel: 'Leída' }))
  } catch (cause) { error.value = cause.message || 'No se pudieron actualizar las notificaciones.' }
}
function openNotification(item) {
  selected.value = item
  markRead(item)
}
function dateTime(value) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}
function formatDate(value) {
  if (!dateTime(value)) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const unreadCount = computed(() => notifications.value.filter(item => item.status === 1).length)
const readCount = computed(() => notifications.value.filter(item => item.status === 2).length)
const filtered = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('es')
  return notifications.value.filter(item => {
    const statusMatches = filter.value === 'all' || (filter.value === 'unread' ? item.status === 1 : item.status === 2)
    const typeMatches = typeFilter.value === 'all' || item.type === typeFilter.value
    const queryMatches = !search || [item.title, item.message, item.type, item.statusLabel].join(' ').toLocaleLowerCase('es').includes(search)
    return statusMatches && typeMatches && queryMatches
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visibleNotifications = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const firstVisible = computed(() => filtered.value.length ? (page.value - 1) * pageSize + 1 : 0)
const lastVisible = computed(() => Math.min(page.value * pageSize, filtered.value.length))
watch([query, filter, typeFilter], () => { page.value = 1 })
watch(totalPages, total => { if (page.value > total) page.value = total })
onMounted(loadNotifications)
</script>

<template>
  <main class="notifications-page">
    <header class="notifications-heading">
      <div>
        <span class="notifications-eyebrow"><BellRing :size="15" /> PAYID · CENTRO DE AVISOS</span>
        <h1>Notificaciones</h1>
        <p>Mantente al tanto de la actividad y los avisos importantes de tu cuenta.</p>
      </div>
      <button v-if="unreadCount" class="notifications-mark-all" type="button" @click="markAllRead"><CheckCheck :size="15" /> Marcar todas como leidas</button><button class="notifications-refresh" type="button" :disabled="loading" @click="loadNotifications"><RefreshCw :size="16" :class="{ spinning: loading }" /> Actualizar</button>
    </header>


    <section class="notifications-summary">
      <article class="notification-stat"><span class="notification-stat-icon total"><Bell :size="19" /></span><div><small>Total de avisos</small><strong>{{ notifications.length }}</strong><span>Notificaciones de tu cuenta</span></div></article>
      <article class="notification-stat"><span class="notification-stat-icon unread"><BellRing :size="19" /></span><div><small>Sin leer</small><strong>{{ unreadCount }}</strong><span>Requieren tu atención</span></div></article>
      <article class="notification-stat"><span class="notification-stat-icon read"><CheckCheck :size="19" /></span><div><small>Leídas</small><strong>{{ readCount }}</strong><span>Avisos ya revisados</span></div></article>
    </section>

    <section class="notifications-panel">
      <header class="notifications-panel-heading"><div><span class="notifications-kicker">TU CUENTA</span><h2>Centro de notificaciones</h2><p>Consulta recordatorios, movimientos y avisos de seguridad.</p></div><span class="notifications-count"><Bell :size="14" /> {{ notifications.length }} avisos</span></header>
      <div class="notifications-toolbar"><label class="notifications-search"><Search :size="17" /><input v-model="query" type="search" placeholder="Buscar por título o contenido..." aria-label="Buscar notificaciones" /></label><StyledSelect v-model="filter" :options="filterOptions" aria-label="Filtrar por lectura" /><StyledSelect v-model="typeFilter" :options="typeOptions" aria-label="Filtrar por tipo" /></div>

      <div v-if="loading" class="notifications-state"><span class="notification-loader"></span><strong>Cargando notificaciones</strong><span>Estamos buscando los avisos asociados a tu perfil.</span></div>
      <div v-else-if="error && !notifications.length" class="notifications-state"><span class="notification-state-icon"><CircleAlert :size="22" /></span><strong>{{ error }}</strong><button class="notifications-secondary" type="button" @click="loadNotifications"><RefreshCw :size="15" /> Reintentar</button></div>
      <template v-else>
        <div v-if="error" class="notifications-inline-error"><span>{{ error }}</span><button type="button" @click="loadNotifications">Reintentar</button></div>
        <div v-if="visibleNotifications.length" class="notification-list">
          <article v-for="item in visibleNotifications" :key="item.id" class="notification-row" :class="{ 'is-unread': item.status === 1 }">
            <span class="notification-row-icon" :class="item.type.toLowerCase()"><Shield v-if="item.type === 'security'" :size="18" /><Clock3 v-else-if="item.type === 'reminder'" :size="18" /><CreditCard v-else-if="item.type === 'movement'" :size="18" /><Bell v-else :size="18" /></span>
            <div class="notification-row-content"><div class="notification-row-title"><h3>{{ item.title }}</h3><span v-if="item.status === 1" class="unread-indicator">Nueva</span></div><p>{{ item.message || 'Tienes un nuevo aviso de PayID.' }}</p><div class="notification-row-meta"><span class="notification-type-pill">{{ item.typeName }}</span><span><Clock3 :size="13" /> {{ formatDate(item.date) }}</span></div></div>
            <div class="notification-row-actions"><span class="notification-status" :class="{ unread: item.status === 1 }">{{ item.statusLabel }}</span><button v-if="item.status === 1" type="button" class="notification-view" title="Marcar como leida" aria-label="Marcar como leida" @click="markRead(item)"><CheckCheck :size="16" /></button><button type="button" class="notification-view" title="Ver notificación" aria-label="Ver notificación" @click="openNotification(item)"><Eye :size="17" /></button></div>
          </article>
        </div>
        <div v-else class="notifications-empty"><span class="notification-empty-icon"><Bell :size="22" /></span><strong>{{ notifications.length ? 'No encontramos avisos con estos filtros' : 'Todavía no tienes notificaciones' }}</strong><span>{{ notifications.length ? 'Prueba con otra búsqueda o selecciona otro filtro.' : 'Cuando haya novedades importantes aparecerán aquí.' }}</span><button v-if="query || filter !== 'all'" type="button" @click="query = ''; filter = 'all'">Limpiar filtros</button></div>
        <footer class="notifications-footer"><span>Mostrando <strong>{{ firstVisible }}–{{ lastVisible }}</strong> de <strong>{{ filtered.length }}</strong> notificaciones</span><div class="notifications-pagination"><button type="button" aria-label="Página anterior" :disabled="page <= 1" @click="page--"><ChevronLeft :size="17" /></button><span>Página {{ page }} de {{ totalPages }}</span><button type="button" aria-label="Página siguiente" :disabled="page >= totalPages" @click="page++"><ChevronRight :size="17" /></button></div></footer>
      </template>
    </section>

    <Teleport to="body"><div v-if="selected" class="notification-modal-backdrop" @click.self="selected = null" @keydown.esc="selected = null"><section class="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-modal-title"><header class="notification-modal-header"><span class="notification-modal-icon"><BellRing :size="21" /></span><div><span class="notifications-kicker">DETALLE DEL AVISO</span><h2 id="notification-modal-title">{{ selected.title }}</h2></div><button type="button" class="notification-modal-close" aria-label="Cerrar" @click="selected = null"><X :size="18" /></button></header><div class="notification-modal-body"><p class="notification-modal-message">{{ selected.message || 'Este aviso forma parte de las novedades de tu cuenta PayID.' }}</p><div class="notification-modal-details"><div><span>Categoría</span><strong>{{ selected.type }}</strong></div><div><span>Fecha</span><strong>{{ formatDate(selected.date) }}</strong></div><div><span>Estado</span><strong>{{ selected.statusLabel }}</strong></div></div></div><footer class="notification-modal-footer"><span><Shield :size="14" /> Aviso de PayID</span><button v-if="selected.status === 1" type="button" @click="markRead(selected)">Marcar como leida</button><button type="button" @click="selected = null">Cerrar</button></footer></section></div></Teleport>
  </main>
</template>

<style>
.notifications-page{--notify-green:#315a43;--notify-dark:#284a37;--notify-text:#1b2c21;--notify-muted:#78857c;--notify-line:#e6ebe7;max-width:1480px;margin:0 auto;padding:28px 32px 44px;color:var(--notify-text)}.notifications-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.notifications-eyebrow,.notifications-kicker{display:flex;align-items:center;gap:8px;color:#849188;font-size:10px;font-weight:750;letter-spacing:.1em}.notifications-eyebrow svg{color:var(--notify-green)}.notifications-heading h1{margin:9px 0 5px;font-size:29px;line-height:1.2;letter-spacing:-.035em}.notifications-heading p,.notifications-panel-heading p{margin:0;color:var(--notify-muted);font-size:13px}.notifications-refresh,.notifications-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid #dce5de;border-radius:10px;background:#fff;color:var(--notify-green);font-size:12px;font-weight:650;cursor:pointer;transition:.16s}.notifications-refresh:hover,.notifications-secondary:hover{border-color:#c9d9ce;background:#f4f8f5}.notifications-refresh:disabled{opacity:.6;cursor:wait}.spinning{animation:notification-spin 1s linear infinite}@keyframes notification-spin{to{transform:rotate(360deg)}}
.notifications-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:20px}.notification-stat{display:flex;align-items:center;gap:13px;min-height:104px;padding:17px;background:#fff;border:1px solid var(--notify-line);border-radius:14px;box-shadow:0 5px 18px #1c35220a}.notification-stat-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px}.notification-stat-icon.total{background:#edf4ef;color:#568061}.notification-stat-icon.unread{background:#fbf2e6;color:#b27d37}.notification-stat-icon.read{background:#edf3fb;color:#5e7fa3}.notification-stat>div{display:flex;flex-direction:column;gap:2px}.notification-stat small{color:#6e7c72;font-size:12px}.notification-stat strong{color:#24362a;font-size:23px;line-height:1.15}.notification-stat>div span{color:#919b93;font-size:10px}
.notifications-panel{overflow:hidden;border:1px solid var(--notify-line);border-radius:16px;background:#fff;box-shadow:0 8px 24px #1c35220a}.notifications-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:21px 23px 17px}.notifications-panel-heading h2{margin:5px 0;color:#304235;font-size:18px;letter-spacing:-.02em}.notifications-count{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #e7ece8;border-radius:999px;background:#fafcfa;color:#718077;font-size:10px;white-space:nowrap}.notifications-toolbar{display:flex;gap:11px;padding:0 23px 17px}.notifications-search{display:flex;min-width:120px;min-height:43px;flex:1;align-items:center;gap:9px;padding:0 12px;border:1px solid #e0e7e1;border-radius:9px;background:#f8faf8;color:#91a096}.notifications-search:focus-within{border-color:#8ba994;box-shadow:0 0 0 3px #315a4314}.notifications-search input{width:100%;border:0;outline:0;background:transparent;color:#28382e;font:inherit;font-size:12px}.notifications-search input::placeholder{color:#9aa59d}.notifications-toolbar .styled-select{width:230px;flex:none}
.notification-list{border-top:1px solid var(--notify-line)}.notification-row{display:flex;align-items:flex-start;gap:13px;padding:17px 23px;border-bottom:1px solid #edf0ed;transition:background .16s}.notification-row:last-child{border-bottom:0}.notification-row:hover{background:#fbfcfb}.notification-row.is-unread{background:linear-gradient(90deg,#f7faf7,#fff 70%)}.notification-row-icon{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#568061}.notification-row-icon.seguridad{background:#fbefed;color:#b7655c}.notification-row-icon.recordatorio{background:#fbf3e7;color:#af7d39}.notification-row-icon.transacción{background:#edf3fb;color:#5b7fa8}.notification-row-content{min-width:0;flex:1}.notification-row-title{display:flex;align-items:center;gap:9px}.notification-row-title h3{overflow:hidden;margin:1px 0 4px;color:#34443a;font-size:13px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.unread-indicator{padding:3px 7px;border-radius:999px;background:#eaf3ec;color:#4b7953;font-size:9px;font-weight:700}.notification-row-content>p{margin:0 0 9px;color:#78857c;font-size:12px;line-height:1.5}.notification-row-meta{display:flex;align-items:center;gap:12px;color:#929c94;font-size:10px}.notification-row-meta>span:last-child{display:flex;align-items:center;gap:4px}.notification-type-pill{padding:4px 7px;border-radius:6px;background:#f2f5f2;color:#728078;font-size:9px;font-weight:600}.notification-row-actions{display:flex;align-items:center;gap:9px}.notification-status{padding:5px 8px;border-radius:7px;background:#f1f3f1;color:#7c8980;font-size:10px;font-weight:600;white-space:nowrap}.notification-status.unread{background:#fbf3e7;color:#a97938}.notification-view{display:grid;width:32px;height:32px;place-items:center;border:1px solid #e2e9e3;border-radius:8px;background:#fff;color:#78877d;cursor:pointer;transition:.15s}.notification-view:hover{border-color:#c4d5c7;background:#f3f8f3;color:var(--notify-green)}
.notifications-footer{display:flex;min-height:56px;align-items:center;justify-content:space-between;gap:12px;padding:0 23px;border-top:1px solid var(--notify-line);color:#7c8980;font-size:11px}.notifications-footer strong{color:#46564b}.notifications-pagination{display:flex;align-items:center;gap:8px}.notifications-pagination button{display:grid;width:30px;height:30px;place-items:center;border:1px solid #e1e8e2;border-radius:8px;background:#fff;color:#718077;cursor:pointer}.notifications-pagination button:not(:disabled):hover{border-color:#c2d3c5;background:#f4f8f5;color:var(--notify-green)}.notifications-pagination button:disabled{opacity:.4;cursor:default}.notifications-pagination span{min-width:94px;text-align:center;color:#68766d;font-size:10px}
.notifications-state,.notifications-empty{display:flex;min-height:235px;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:24px;text-align:center;color:#8b978f}.notifications-state strong,.notifications-empty strong{color:#33433a;font-size:14px}.notifications-state>span:last-of-type,.notifications-empty>span:last-of-type{color:#8b978f;font-size:12px}.notification-loader{width:26px;height:26px;border:3px solid #e5ede7;border-top-color:var(--notify-green);border-radius:50%;animation:notification-spin .8s linear infinite}.notification-state-icon,.notification-empty-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:13px;background:#fbf3e7;color:#af7c39}.notification-empty-icon{background:#edf4ef;color:#588165}.notifications-secondary{margin-top:4px;padding:8px 12px;font-size:11px}.notifications-empty button,.notifications-inline-error button{border:0;background:transparent;color:var(--notify-green);font:inherit;font-size:11px;font-weight:650;cursor:pointer}.notifications-inline-error{display:flex;justify-content:space-between;align-items:center;margin:0 23px 13px;padding:10px 12px;border:1px solid #f0dfc3;border-radius:9px;background:#fffaf1;color:#876333;font-size:11px}
.notification-modal-backdrop{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:#14231bb3;backdrop-filter:blur(5px)}.notification-modal{display:flex;width:min(100%,470px);flex-direction:column;overflow:hidden;border:1px solid #e8ede9;border-radius:18px;background:#fff;box-shadow:0 26px 75px #101a1440;animation:notification-modal-in .2s ease-out both}@keyframes notification-modal-in{from{opacity:0;transform:translateY(9px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}.notification-modal-header{display:flex;align-items:center;gap:13px;padding:19px 21px;border-bottom:1px solid #edf0ed}.notification-modal-icon{display:grid;width:43px;height:43px;flex:none;place-items:center;border-radius:12px;background:#edf4ef;color:#4c7956}.notification-modal-header>div{min-width:0;flex:1}.notification-modal-header h2{overflow:hidden;margin:5px 0 0;color:#2e4033;font-size:17px;text-overflow:ellipsis;white-space:nowrap}.notification-modal-close{display:grid;width:33px;height:33px;place-items:center;border:1px solid #e3e9e4;border-radius:9px;background:#fff;color:#758279;cursor:pointer}.notification-modal-close:hover{background:#f3f7f3;color:var(--notify-green)}.notification-modal-body{padding:20px 21px}.notification-modal-message{margin:0 0 16px;padding:13px;border:1px solid #e8efe9;border-radius:11px;background:#f7faf7;color:#58685d;font-size:12px;line-height:1.55}.notification-modal-details{display:grid;grid-template-columns:1fr 1fr;gap:9px}.notification-modal-details>div{display:flex;min-height:66px;flex-direction:column;justify-content:center;gap:7px;padding:11px 12px;border:1px solid #edf0ed;border-radius:10px}.notification-modal-details span{color:#89958d;font-size:10px}.notification-modal-details strong{color:#34443a;font-size:11px}.notification-modal-footer{display:flex;align-items:center;justify-content:space-between;padding:13px 21px;border-top:1px solid #edf0ed;background:#fbfcfb}.notification-modal-footer>span{display:flex;align-items:center;gap:7px;color:#829087;font-size:10px}.notification-modal-footer>span svg{color:#5d8a64}.notification-modal-footer button{min-width:84px;height:35px;border:1px solid var(--notify-green);border-radius:9px;background:var(--notify-green);color:#fff;font-size:11px;font-weight:650;cursor:pointer}.notification-modal-footer button:hover{background:#284a37}
@media(max-width:850px){.notifications-summary{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.notification-stat{gap:9px;padding:12px}.notification-stat-icon{width:36px;height:36px}}
@media(max-width:600px){.notifications-page{padding:20px 14px 30px}.notifications-heading{align-items:flex-start}.notifications-heading h1{font-size:25px}.notifications-heading p{max-width:270px;font-size:12px}.notifications-refresh{padding:9px 10px;font-size:11px}.notifications-summary{grid-template-columns:1fr;gap:8px}.notification-stat{min-height:76px}.notifications-panel-heading{align-items:flex-start;padding:18px 16px 14px}.notifications-panel-heading h2{font-size:16px}.notifications-panel-heading p{font-size:11px}.notifications-count{padding:6px 8px;font-size:9px}.notifications-toolbar{flex-direction:column;padding:0 16px 14px}.notifications-toolbar .styled-select{width:100%}.notification-row{gap:10px;padding:14px 15px}.notification-row-icon{width:35px;height:35px}.notification-row-content>p{font-size:11px}.notification-row-actions{flex-direction:column-reverse;align-items:flex-end;gap:5px}.notification-status{padding:4px 6px;font-size:9px}.notifications-footer{padding:0 13px;font-size:10px}.notifications-pagination{gap:4px}.notifications-pagination span{min-width:80px}.notification-modal-header{padding:16px}.notification-modal-body{padding:15px 16px}.notification-modal-footer{padding:12px 16px}}
.notifications-heading{flex-wrap:wrap}.notifications-mark-all{display:inline-flex;min-height:39px;align-items:center;justify-content:center;gap:7px;padding:0 12px;border:1px solid #dfe8e1;border-radius:10px;background:#fff;color:#536a59;font:inherit;font-size:11px;font-weight:650;white-space:nowrap;cursor:pointer;transition:background .16s,border-color .16s,transform .16s}.notifications-mark-all:hover{transform:translateY(-1px);border-color:#c4d7c7;background:#f4f8f5}.notifications-demo-note{display:flex;align-items:center;gap:9px;margin:-8px 0 17px;padding:10px 13px;border:1px solid #e5ece6;border-radius:10px;background:#fbfdfb;color:#748177;font-size:11px;line-height:1.45}.notifications-demo-note svg{flex:none;color:#64816a}.notification-row-icon.movimiento{background:#edf3fb;color:#5b7fa8}.notifications-toolbar .styled-select{width:190px;flex:none}@media(max-width:600px){.notifications-toolbar .styled-select{width:100%}.notifications-mark-all{min-height:36px;padding:0 9px;font-size:10px}.notifications-demo-note{margin-top:-5px;font-size:10px}}
</style>
