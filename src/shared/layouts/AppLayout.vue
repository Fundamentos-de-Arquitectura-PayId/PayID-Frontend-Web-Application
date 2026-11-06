<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bell, CheckCircle2, Check, ChevronDown, Clock3, Globe2, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-vue-next'
import NavBar from '../presentation/components/nav-bar.vue'
import { setLocale } from '../../i18n.js'
import { signOutSupabase } from '../../domains/auth/infrastructure/persistence/supabase-session.js'
import { getPayIdProfile, listNotifications, markNotificationRead } from '../services/payidRepository.js'

const router = useRouter()
const { locale } = useI18n()
const collapsed = ref(false)
const mobileOpen = ref(false)
const isMobile = ref(false)
const currentUser = ref(null)
const localeMenuOpen = ref(false)
const currentTime = ref('')
const appToast = ref('')
const localeMenu = ref(null)
const notificationMenu = ref(null)
const notificationsOpen = ref(false)
const notificationsLoading = ref(false)
const headerNotifications = ref([])
const notificationError = ref('')
const unreadNotifications = computed(() => headerNotifications.value.filter(item => !item.isRead).length)
let clockInterval
let toastTimeout

function showAppToast(event) {
  appToast.value = event.detail?.message || ''
  window.clearTimeout(toastTimeout)
  if (appToast.value) toastTimeout = window.setTimeout(() => { appToast.value = '' }, 4500)
}

function syncViewport() {
  isMobile.value = window.matchMedia('(max-width: 900px)').matches
  if (!isMobile.value) mobileOpen.value = false
}

function toggleSidebar() {
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
    return
  }
  collapsed.value = !collapsed.value
  localStorage.setItem('payid:sidebar-collapsed', String(collapsed.value))
}

function closeMobileSidebar() {
  if (isMobile.value) mobileOpen.value = false
}

function changeLocale(nextLocale) {
  setLocale(nextLocale)
  localeMenuOpen.value = false
}

function updateClock() {
  currentTime.value = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function closeLocaleMenu(event) {
  if (!localeMenu.value?.contains(event.target)) localeMenuOpen.value = false
}

function closeNotificationMenu(event) {
  if (event && !notificationMenu.value?.contains(event.target)) notificationsOpen.value = false
}

async function loadHeaderNotifications() {
  notificationsLoading.value = true
  notificationError.value = ''
  try {
    headerNotifications.value = await listNotifications()
  } catch (error) {
    notificationError.value = error.message || 'No se pudieron cargar las notificaciones.'
  } finally {
    notificationsLoading.value = false
  }
}

async function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) await loadHeaderNotifications()
}

function formatNotificationDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

async function openHeaderNotification(item) {
  if (!item.isRead) {
    try {
      await markNotificationRead(item.id)
      item.isRead = true
      item.status = 2
    } catch (error) {
      notificationError.value = error.message || 'No se pudo actualizar la notificación.'
    }
  }
  notificationsOpen.value = false
  router.push({ name: 'notifications' })
}

function goToAllNotifications() {
  notificationsOpen.value = false
  router.push({ name: 'notifications' })
}

async function logout() {
  try {
    await signOutSupabase()
  } catch (error) {
    if (error.message !== 'SUPABASE_NOT_CONFIGURED') console.error('No se pudo cerrar la sesión de Supabase:', error.message)
    localStorage.removeItem('kapakid:user')
    localStorage.removeItem('kapakid:token')
  }
  router.push({ name: 'login' })
}

function syncCurrentUser(event) {
  currentUser.value = { ...(currentUser.value || {}), ...(event.detail || {}) }
}

async function refreshCurrentUserProfile() {
  try {
    const profile = await getPayIdProfile()
    const saved = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {}
    currentUser.value = { ...saved, ...profile }
    localStorage.setItem('kapakid:user', JSON.stringify(currentUser.value))
  } catch {
    // Keep the cached account details if Supabase is temporarily unavailable.
  }
}

onMounted(() => {
  collapsed.value = localStorage.getItem('payid:sidebar-collapsed') === 'true'
  try {
    currentUser.value = JSON.parse(localStorage.getItem('kapakid:user') || 'null')
  } catch {
    currentUser.value = null
  }
  refreshCurrentUserProfile()
  syncViewport()
  updateClock()
  window.addEventListener('resize', syncViewport)
  window.addEventListener('pointerdown', closeLocaleMenu)
  window.addEventListener('pointerdown', closeNotificationMenu)
  window.addEventListener('payid:toast', showAppToast)
  window.addEventListener('payid:user-updated', syncCurrentUser)
  clockInterval = window.setInterval(updateClock, 30000)
})

onUnmounted(() => {
  window.clearInterval(clockInterval)
  window.removeEventListener('resize', syncViewport)
  window.removeEventListener('pointerdown', closeLocaleMenu)
  window.removeEventListener('pointerdown', closeNotificationMenu)
  window.removeEventListener('payid:toast', showAppToast)
  window.removeEventListener('payid:user-updated', syncCurrentUser)
  window.clearTimeout(toastTimeout)
})
</script>

<template>
  <div class="payid-app-shell" :class="{ 'is-collapsed': collapsed, 'mobile-open': mobileOpen }">
    <NavBar
      :collapsed="collapsed"
      :mobile-open="mobileOpen"
      :user="currentUser"
      @navigate="closeMobileSidebar"
      @logout="logout"
    />

    <div v-if="mobileOpen" class="sidebar-overlay" @click="closeMobileSidebar" aria-hidden="true"></div>

    <div class="app-workspace">
      <header class="app-header">
        <div class="header-leading">
          <button
            class="menu-button"
            type="button"
            :aria-label="mobileOpen ? 'Cerrar menú' : 'Alternar menú lateral'"
            :aria-expanded="isMobile ? mobileOpen : !collapsed"
            @click="toggleSidebar"
          >
            <X v-if="isMobile && mobileOpen" :size="21" />
            <Menu v-else-if="isMobile" :size="21" />
            <PanelLeftOpen v-else-if="collapsed" :size="20" />
            <PanelLeftClose v-else :size="20" />
          </button>
          <h1 class="system-title">{{ locale === 'en' ? 'Digital Identity System' : 'Sistema de Identidad Digital' }}</h1>
        </div>

        <div class="header-trailing">
          <button class="clock-chip" type="button" :title="`Hora actual: ${currentTime}`">
            <Clock3 :size="16" />
            <span>{{ currentTime }}</span>
          </button>
          <div ref="notificationMenu" class="notification-control">
            <button class="header-icon-button notification-button" type="button" aria-label="Abrir notificaciones" title="Notificaciones" :aria-expanded="notificationsOpen" @click.stop="toggleNotifications">
              <Bell :size="18" />
              <span v-if="unreadNotifications" class="notification-badge">{{ unreadNotifications > 9 ? '9+' : unreadNotifications }}</span>
            </button>
            <Transition name="notification-popover">
              <section v-if="notificationsOpen" class="notification-popover-panel" aria-label="Notificaciones recientes">
                <header><div><strong>Notificaciones</strong><span v-if="unreadNotifications">{{ unreadNotifications }} sin leer</span></div><button type="button" aria-label="Cerrar notificaciones" @click="notificationsOpen = false"><X :size="16" /></button></header>
                <div v-if="notificationsLoading" class="notification-popover-state"><span class="popover-loader"></span><span>Cargando avisos…</span></div>
                <div v-else-if="notificationError" class="notification-popover-state error">{{ notificationError }}<button type="button" @click="loadHeaderNotifications">Reintentar</button></div>
                <div v-else-if="headerNotifications.length" class="notification-popover-list">
                  <button v-for="item in headerNotifications.slice(0, 6)" :key="item.id" class="notification-popover-item" :class="{ unread: !item.isRead }" type="button" @click="openHeaderNotification(item)">
                    <span class="notification-popover-icon"><Bell :size="15" /></span><span class="notification-popover-copy"><strong>{{ item.title }}</strong><span>{{ item.message || 'Tienes una novedad en tu cuenta PayID.' }}</span><small>{{ formatNotificationDate(item.date) }}</small></span><i v-if="!item.isRead"></i>
                  </button>
                </div>
                <div v-else class="notification-popover-state">No tienes notificaciones por ahora.</div>
                <footer><button type="button" @click="goToAllNotifications">Ver todas las notificaciones <ChevronDown :size="14" /></button></footer>
              </section>
            </Transition>
          </div>
          <div ref="localeMenu" class="locale-control">
            <button class="header-icon-button locale-trigger" type="button" :aria-expanded="localeMenuOpen" aria-haspopup="menu" aria-label="Cambiar idioma" title="Cambiar idioma" @click.stop="localeMenuOpen = !localeMenuOpen">
              <Globe2 :size="18" />
              <ChevronDown :size="13" class="locale-chevron" />
            </button>
            <Transition name="locale-popover">
              <div v-if="localeMenuOpen" class="locale-popover" role="menu" aria-label="Seleccionar idioma">
                <span class="popover-title">Idioma / Language</span>
                <button type="button" role="menuitemradio" :aria-checked="locale === 'es'" :class="{ selected: locale === 'es' }" @click="changeLocale('es')"><span>Español</span><span>ES</span></button>
                <button type="button" role="menuitemradio" :aria-checked="locale === 'en'" :class="{ selected: locale === 'en' }" @click="changeLocale('en')"><span>English</span><span>EN</span></button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <Transition name="app-toast">
        <div v-if="appToast" class="app-toast" role="status" aria-live="polite">
          <CheckCircle2 :size="19" />
          <span>{{ appToast }}</span>
          <button type="button" :aria-label="locale === 'es' ? 'Cerrar notificación' : 'Dismiss notification'" @click="appToast = ''"><X :size="15" /></button>
        </div>
      </Transition>

      <main class="page-content" @click="closeMobileSidebar">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.payid-app-shell{--sidebar-width:264px;display:flex;height:100vh;height:100dvh;min-height:100vh;min-height:100dvh;overflow:hidden;background:#f4f6f8;color:#17212b}
.payid-app-shell.is-collapsed{--sidebar-width:76px}
.app-workspace{position:relative;display:flex;width:calc(100% - var(--sidebar-width));height:100vh;height:100dvh;min-height:0;flex-direction:column;margin-left:var(--sidebar-width);min-width:0;overflow:hidden;transition:width .24s ease,margin-left .24s ease}
.app-header{position:sticky;top:0;z-index:20;display:flex;flex:none;align-items:center;justify-content:space-between;gap:16px;height:72px;padding:0 28px;background:rgba(255,255,255,.96);border-bottom:1px solid #e7ebef;box-shadow:0 2px 12px rgba(16,35,50,.04);backdrop-filter:blur(14px)}
.header-leading,.header-trailing,.page-heading{display:flex;align-items:center}
.header-leading{gap:16px;min-width:0}.header-trailing{gap:18px}.menu-button{display:grid;place-items:center;width:40px;height:40px;flex:none;border:1px solid #e2e8ec;border-radius:12px;background:#fff;color:#35434d;cursor:pointer;transition:background .18s,border-color .18s,color .18s,box-shadow .18s,transform .18s}.menu-button svg{transition:transform .22s}.menu-button:hover{background:#f1f6f3;border-color:#cad8cf;color:#315a43;box-shadow:0 4px 12px #315a4317;transform:translateY(-1px)}.menu-button:hover svg{transform:scale(1.08)}.header-divider{width:1px;height:28px;background:#e4e9ed}.page-heading{gap:10px;min-width:0}.page-heading-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#edf4ef;color:#315a43}.page-heading h1{margin:0;color:#1f2d36;font-size:17px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.system-title{margin:0;color:#39464e;font-size:15px;font-weight:550;letter-spacing:-.02em;white-space:nowrap}
.clock-chip{display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid #e7ece8;border-radius:999px;background:#f8faf8;color:#52665a;font-family:inherit;font-size:12px;font-weight:650;font-variant-numeric:tabular-nums;box-shadow:0 1px 2px #17212b08}.clock-chip svg{color:#52765b}
.header-icon-button{position:relative;display:grid;width:38px;height:38px;flex:none;place-items:center;border:1px solid #e5eae6;border-radius:11px;background:#fff;color:#65736a;cursor:pointer;transition:background .18s,border-color .18s,color .18s,box-shadow .18s,transform .18s}.header-icon-button:hover,.header-icon-button[aria-expanded="true"]{border-color:#cdddcf;background:#f3f8f4;color:#315a43;box-shadow:0 4px 11px #315a4315;transform:translateY(-1px)}.locale-control{position:relative}.locale-trigger{display:flex;width:auto;min-width:40px;gap:5px;padding:0 8px}.locale-chevron{color:#9aa49c;transition:transform .18s}.locale-trigger[aria-expanded="true"] .locale-chevron{transform:rotate(180deg)}.locale-popover{position:absolute;top:calc(100% + 11px);right:0;z-index:60;width:188px;padding:8px;border:1px solid #e6ece7;border-radius:13px;background:#fff;box-shadow:0 12px 30px #15251a20}.popover-title{display:block;padding:7px 9px 9px;color:#98a39a;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.locale-popover button{display:flex;width:100%;align-items:center;justify-content:space-between;padding:9px;border:0;border-radius:8px;background:transparent;color:#59665e;font-family:inherit;font-size:12px;text-align:left;cursor:pointer;transition:background .15s,color .15s}.locale-popover button span:last-child{color:#98a49b;font-size:10px;font-weight:650}.locale-popover button:hover,.locale-popover button.selected{background:#eff5f0;color:#315a43}.locale-popover button.selected span:last-child{color:#4e7656}.locale-popover-enter-active,.locale-popover-leave-active{transition:opacity .15s,transform .15s}.locale-popover-enter-from,.locale-popover-leave-to{opacity:0;transform:translateY(-5px)}
.notification-control{position:relative}.notification-badge{position:absolute;top:-5px;right:-5px;display:grid;min-width:17px;height:17px;place-items:center;padding:0 4px;border:2px solid #fff;border-radius:999px;background:#b94b43;color:#fff;font-size:9px;font-weight:750;line-height:1}.notification-popover-panel{position:absolute;top:calc(100% + 14px);right:-54px;z-index:80;width:min(370px,calc(100vw - 28px));overflow:hidden;border:1px solid #e5ebe6;border-radius:15px;background:#fff;box-shadow:0 20px 55px #1b2d2230;transform-origin:top right}.notification-popover-panel>header{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-bottom:1px solid #edf1ed;background:linear-gradient(180deg,#fff,#fafcfb)}.notification-popover-panel>header>div{display:flex;flex-direction:column;gap:4px}.notification-popover-panel>header strong{color:#2c3d32;font-size:14px}.notification-popover-panel>header span{color:#859188;font-size:11px}.notification-popover-panel>header button{display:grid;width:29px;height:29px;place-items:center;border:1px solid #e5ebe6;border-radius:8px;background:#fff;color:#78867d;cursor:pointer}.notification-popover-list{max-height:min(410px,60vh);overflow:auto}.notification-popover-item{display:flex;width:100%;align-items:flex-start;gap:10px;padding:12px 14px;border:0;border-bottom:1px solid #f0f3f0;background:#fff;text-align:left;cursor:pointer;transition:background .15s}.notification-popover-item:hover{background:#f7faf7}.notification-popover-item.unread{background:#fbfdfb}.notification-popover-icon{display:grid;width:32px;height:32px;flex:none;place-items:center;border-radius:10px;background:#eef5ef;color:#53795d}.notification-popover-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.notification-popover-copy strong{overflow:hidden;color:#35453a;font-size:11px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.notification-popover-copy>span{display:-webkit-box;overflow:hidden;color:#77847b;font-size:10px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.notification-popover-copy small{color:#9aa49d;font-size:9px}.notification-popover-item>i{width:7px;height:7px;flex:none;margin-top:5px;border-radius:50%;background:#4e8058}.notification-popover-state{display:flex;min-height:105px;align-items:center;justify-content:center;gap:9px;padding:18px;color:#87938a;font-size:11px;text-align:center}.notification-popover-state.error{flex-direction:column;color:#9c5a4e}.notification-popover-state button{border:0;background:transparent;color:#315a43;font:inherit;font-weight:650;cursor:pointer}.popover-loader{width:18px;height:18px;border:2px solid #e4ece5;border-top-color:#4f7958;border-radius:50%;animation:popover-spin .8s linear infinite}@keyframes popover-spin{to{transform:rotate(360deg)}}.notification-popover-panel>footer{padding:10px 14px;border-top:1px solid #edf1ed;background:#fbfcfb}.notification-popover-panel>footer button{display:flex;width:100%;align-items:center;justify-content:center;gap:6px;padding:8px;border:0;border-radius:8px;background:#f0f5f1;color:#41664a;font-family:inherit;font-size:11px;font-weight:650;cursor:pointer}.notification-popover-panel>footer button svg{transform:rotate(-90deg)}.notification-popover-enter-active,.notification-popover-leave-active{transition:opacity .16s ease,transform .16s ease}.notification-popover-enter-from,.notification-popover-leave-to{opacity:0;transform:translateY(-7px) scale(.98)}
.locale-switch{display:flex;align-items:center;gap:3px;padding:4px;border:1px solid #e5e9eb;border-radius:999px;background:#f7f9fa}.locale-switch button{border:0;border-radius:999px;padding:6px 10px;background:transparent;color:#6b7881;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer}.locale-switch button.active{background:#315a43;color:#fff;box-shadow:0 2px 5px #16332220}
.user-chip{display:flex;align-items:center;gap:9px;max-width:220px;padding:4px 10px 4px 4px;border:1px solid #e8ecee;border-radius:999px;background:#fff}.user-avatar{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:50%;background:#e9f1eb;color:#315a43;font-size:13px;font-weight:700}.user-name{overflow:hidden;color:#43515a;font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.page-content{flex:1 1 auto;width:100%;height:0;min-width:0;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;-ms-overflow-style:none}
.app-toast{position:absolute;top:82px;left:50%;z-index:50;display:flex;width:min(430px,calc(100% - 32px));min-height:52px;align-items:center;gap:11px;padding:11px 13px;border:1px solid #d6e8d9;border-radius:12px;background:#fff;color:#47744e;box-shadow:0 12px 30px rgba(26,55,34,.16);transform:translateX(-50%)}.app-toast>svg{flex:none}.app-toast>span{flex:1;color:#365c3d;font-size:13px;font-weight:550}.app-toast button{display:grid;width:28px;height:28px;flex:none;place-items:center;border:0;border-radius:7px;background:transparent;color:#718574;cursor:pointer}.app-toast button:hover{background:#f0f6f1;color:#315a43}.app-toast-enter-active,.app-toast-leave-active{transition:opacity .18s ease,translate .18s ease}.app-toast-enter-from,.app-toast-leave-to{opacity:0;translate:0 -7px}
.page-content::-webkit-scrollbar{display:none}
.sidebar-overlay{display:none}
@media(max-width:900px){.payid-app-shell,.payid-app-shell.is-collapsed{--sidebar-width:0px}.app-workspace{width:100%;margin-left:0}.app-header{height:64px;padding:0 16px}.app-toast{top:73px}.header-leading{gap:12px}.system-title{font-size:14px}.header-trailing{gap:9px}.user-chip{max-width:150px}.sidebar-overlay{position:fixed;inset:0;z-index:38;display:block;background:rgba(18,27,34,.42);backdrop-filter:blur(1px)}}
@media(max-width:560px){.app-header{padding:0 12px}.header-leading{gap:9px}.system-title{max-width:110px;overflow:hidden;font-size:11px;text-overflow:ellipsis}.header-trailing{gap:6px}.clock-chip{gap:5px;padding:7px 7px;font-size:10px}.clock-chip svg{width:14px;height:14px}.header-icon-button{width:33px;height:33px}.locale-trigger{width:33px;min-width:33px;padding:0}.locale-chevron{display:none}.user-chip{max-width:36px;padding-right:3px}.user-avatar{width:29px;height:29px}.user-name{display:none}}
@media(max-width:560px){.notification-popover-panel{right:-78px;width:min(360px,calc(100vw - 20px))}}
@media(max-width:360px){.app-header{padding:0 8px}.system-title{max-width:90px;font-size:10px}.header-leading{gap:7px}.header-trailing{gap:4px}.user-chip{display:none}}
</style>
