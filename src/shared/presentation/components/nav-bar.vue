<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BusFront, WalletCards, FileText, Clock3, LogOut, CreditCard,
  BellRing, LayoutDashboard, ChevronRight, UsersRound, GraduationCap,
} from 'lucide-vue-next'

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  mobileOpen: { type: Boolean, default: false },
  user: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['navigate', 'logout'])
const route = useRoute()
const { t } = useI18n()
const avatarImageFailed = ref(false)
watch(() => props.user?.profilePhoto, () => { avatarImageFailed.value = false })
const logoUrl = `${import.meta.env.BASE_URL}images/payid-logo.png`
const isFamilyProfile = computed(() => {
  const value = [props.user?.segment, props.user?.segmento, props.user?.profileType, props.user?.tipoPerfil, props.user?.role].filter(Boolean).join(' ').toLowerCase()
  return /famil|padre|madre|apoderad|guardian/.test(value)
})
const items = computed(() => [
  { name: 'home', label: t('nav-bar.home'), icon: LayoutDashboard },
  ...(isFamilyProfile.value ? [{ name: 'family', label: 'Mi familia', icon: UsersRound }] : []),
  ...(!isFamilyProfile.value ? [{ name: 'student-card', label: 'Credencial estudiantil', icon: GraduationCap }] : []),
  { name: 'wallet', label: 'Billetera digital', icon: CreditCard },
  { name: 'documents', label: t('nav-bar.documents'), icon: FileText },
  { name: 'payments', label: t('nav-bar.payments'), icon: WalletCards },
  { name: 'transport', label: t('nav-bar.transport'), icon: BusFront },
  { name: 'history', label: t('nav-bar.history'), icon: Clock3 },
  { name: 'notifications', label: t('nav-bar.notifications'), icon: BellRing },
])
</script>

<template>
  <aside class="payid-sidebar" :class="{ 'is-collapsed': collapsed, 'is-mobile-open': mobileOpen }" aria-label="Navegación principal">
    <header class="sidebar-header">
      <RouterLink class="brand" :to="{ name: 'home' }" @click="emit('navigate')" aria-label="PayID, inicio" title="PayID">
        <img class="brand-logo" :src="logoUrl" alt="PayID" />
      </RouterLink>
    </header>

    <div class="sidebar-body">
      <div v-if="!collapsed || mobileOpen" class="nav-caption">NAVEGACIÓN</div>
      <nav class="main-navigation">
        <RouterLink
          v-for="item in items"
          :key="item.name"
          :to="{ name: item.name }"
          class="navigation-link"
          :class="{ active: route.name === item.name }"
          :title="collapsed && !mobileOpen ? item.label : undefined"
          @click="emit('navigate')"
        >
          <span class="nav-icon"><component :is="item.icon" :size="19" :stroke-width="1.9" aria-hidden="true" /></span>
          <span v-if="!collapsed || mobileOpen" class="navigation-label">{{ item.label }}</span>
          <span v-if="route.name === item.name && (!collapsed || mobileOpen)" class="active-indicator" aria-hidden="true"></span>
        </RouterLink>
      </nav>
    </div>

    <footer class="sidebar-footer">
      <RouterLink class="account-card" :class="{ compact: collapsed && !mobileOpen, active: route.name === 'profile' }" :to="{ name: 'profile' }" @click="emit('navigate')" :title="user?.nombre || user?.name || user?.email || 'Cuenta PayID'">
        <img v-if="user?.profilePhoto && !avatarImageFailed" class="account-avatar account-avatar-image" :src="user.profilePhoto" alt="" @error="avatarImageFailed = true" />
        <span v-else class="account-avatar">{{ (user?.nombre || user?.name || user?.email || 'P').slice(0, 1).toUpperCase() }}</span>
        <span v-if="!collapsed || mobileOpen" class="account-info"><strong>{{ user?.nombre || user?.name || 'Mi cuenta' }}</strong><small>{{ user?.email || 'Identidad PayID' }}</small></span>
        <span v-if="!collapsed || mobileOpen" class="account-trailing" aria-hidden="true"><ChevronRight :size="15" /></span>
      </RouterLink>
      <button class="logout-button" type="button" :title="collapsed && !mobileOpen ? t('nav-bar.out') : undefined" @click="emit('logout')">
        <LogOut :size="18" :stroke-width="2" aria-hidden="true" />
        <span v-if="!collapsed || mobileOpen">{{ t('nav-bar.out') }}</span>
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.payid-sidebar{position:fixed;inset:0 auto 0 0;z-index:40;display:flex;width:264px;flex-direction:column;padding:14px 14px 13px;border-right:1px solid #e7ece8;background:linear-gradient(180deg,#fff 0%,#fcfdfc 68%,#f8fbf8 100%);box-shadow:2px 0 16px rgba(24,44,34,.035);transition:width .28s cubic-bezier(.2,.75,.25,1),transform .28s cubic-bezier(.2,.75,.25,1)}
.payid-sidebar.is-collapsed:not(.is-mobile-open){width:76px;padding-right:10px;padding-left:10px}
.sidebar-header{flex:none;padding:3px 2px 18px;border-bottom:1px solid #edf1ed}.brand{display:flex;height:78px;align-items:center;justify-content:center;padding:0 8px;color:#20352a;text-decoration:none}.brand-logo{display:block;width:148px;height:74px;flex:none;object-fit:contain;object-position:center;transition:transform .25s,filter .25s}.brand:hover .brand-logo{filter:drop-shadow(0 4px 7px #315a4328);transform:scale(1.025)}
.sidebar-body{display:flex;min-height:0;flex:1;flex-direction:column;padding-top:17px}.nav-caption{margin:0 10px 10px;color:#a1aaa3;font-size:9px;font-weight:700;letter-spacing:.14em}.main-navigation{display:flex;min-height:0;flex:1;flex-direction:column;gap:5px;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}.main-navigation::-webkit-scrollbar{display:none}
.navigation-link{position:relative;display:flex;min-height:48px;align-items:center;gap:12px;padding:0 10px;border:1px solid transparent;border-radius:12px;color:#68756d;text-decoration:none;isolation:isolate;transition:background .2s,color .2s,border-color .2s,transform .22s,box-shadow .22s;animation:nav-enter .38s both}.navigation-link:nth-child(2){animation-delay:25ms}.navigation-link:nth-child(3){animation-delay:50ms}.navigation-link:nth-child(4){animation-delay:75ms}.navigation-link:nth-child(5){animation-delay:100ms}.navigation-link:nth-child(6){animation-delay:125ms}.navigation-link:nth-child(7){animation-delay:150ms}@keyframes nav-enter{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
.navigation-link::before{position:absolute;inset:0;z-index:-1;border-radius:inherit;background:linear-gradient(100deg,#eaf3ec,#f5f9f5);content:"";opacity:0;transform:scale(.97);transition:opacity .2s,transform .2s}.navigation-link:hover{color:#315a43;transform:translateX(2px)}.navigation-link:hover::before{opacity:1;transform:scale(1)}.navigation-link.active{border-color:#d8e7da;background:linear-gradient(100deg,#edf5ef,#f8fbf8);color:#315a43;font-weight:650;box-shadow:0 5px 14px rgba(49,90,67,.08),inset 0 1px #fff}.nav-icon{position:relative;display:grid;width:34px;height:34px;flex:none;place-items:center;border:1px solid #edf1ed;border-radius:10px;background:#f8faf8;color:#819087;transition:color .2s,background .2s,border-color .2s,box-shadow .2s,transform .22s}.navigation-link:hover .nav-icon{border-color:#dce9de;background:#fff;color:#4c7856;box-shadow:0 3px 9px #315a4315;transform:scale(1.04)}.navigation-link.active .nav-icon{border-color:#c5dbc9;background:linear-gradient(145deg,#4e7b59,#315a43);color:#fff;box-shadow:0 4px 11px #315a4336,inset 0 1px #ffffff42;transform:scale(1.02)}.navigation-link.active .nav-icon::after{position:absolute;inset:-4px;border:1px solid #4774563d;border-radius:13px;content:"";animation:active-glow 2.6s ease-in-out infinite}@keyframes active-glow{0%,100%{opacity:.28;transform:scale(.96)}50%{opacity:.8;transform:scale(1.06)}}.navigation-label{overflow:hidden;font-size:12px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.active-indicator{position:absolute;top:10px;right:-1px;width:3px;height:27px;border-radius:4px;background:#4b7955;box-shadow:0 0 9px #4b795570}
.payid-sidebar.is-collapsed:not(.is-mobile-open) .sidebar-header{padding-bottom:12px}.payid-sidebar.is-collapsed:not(.is-mobile-open) .brand{height:52px;justify-content:center;padding:0}.payid-sidebar.is-collapsed:not(.is-mobile-open) .brand-logo{width:52px;height:43px;object-position:center}.payid-sidebar.is-collapsed:not(.is-mobile-open) .sidebar-body{padding-top:14px}.payid-sidebar.is-collapsed:not(.is-mobile-open) .nav-caption{visibility:hidden;height:0;margin:0}.payid-sidebar.is-collapsed:not(.is-mobile-open) .navigation-link{min-height:50px;justify-content:center;padding:0}.payid-sidebar.is-collapsed:not(.is-mobile-open) .navigation-link:hover{transform:translateY(-1px)}.payid-sidebar.is-collapsed:not(.is-mobile-open) .nav-icon{width:40px;height:40px;border-radius:12px}.payid-sidebar.is-collapsed:not(.is-mobile-open) .active-indicator{right:0}
.sidebar-footer{display:flex;flex:none;flex-direction:column;gap:10px;margin-top:auto;padding:14px 2px 2px;border-top:1px solid #e9eeea;background:linear-gradient(180deg,#ffffff00,#fff 18%)}.account-card{display:flex;min-width:0;align-items:center;gap:10px;padding:9px 8px;border:1px solid #edf1ed;border-radius:12px;background:#fbfcfb;color:inherit;text-decoration:none;transition:border-color .18s,background .18s,box-shadow .18s}.account-card:hover,.account-card.active{border-color:#d4e3d6;background:#f4f8f4;box-shadow:0 3px 10px #315a4310}.account-avatar-image{object-fit:cover}.account-avatar{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:10px;background:linear-gradient(145deg,#477453,#2d5239);color:#fff;font-size:13px;font-weight:700;box-shadow:0 3px 8px #315a4328}.account-info{display:flex;min-width:0;flex-direction:column;gap:3px}.account-info strong,.account-info small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-info strong{color:#3a4c3e;font-size:11px;font-weight:650}.account-info small{color:#929d94;font-size:9px}.logout-button{display:flex;min-height:43px;align-items:center;justify-content:center;gap:9px;padding:0 12px;border:1px solid #315a43;border-radius:11px;background:linear-gradient(135deg,#416f51,#294b36);color:#fff;font-family:inherit;font-size:11px;font-weight:650;cursor:pointer;box-shadow:0 4px 10px #315a4328,inset 0 1px #ffffff25;transition:background .2s,border-color .2s,box-shadow .2s,transform .2s}.logout-button svg{transition:transform .2s}.logout-button:hover{border-color:#244630;background:linear-gradient(135deg,#315a43,#1f3f2b);box-shadow:0 7px 15px #315a4340;transform:translateY(-1px)}.logout-button:hover svg{transform:translateX(2px)}.payid-sidebar.is-collapsed:not(.is-mobile-open) .sidebar-footer{align-items:center;padding-right:0;padding-left:0}.payid-sidebar.is-collapsed:not(.is-mobile-open) .account-card{width:100%;justify-content:center;padding-right:0;padding-left:0;border-color:transparent;background:transparent}.payid-sidebar.is-collapsed:not(.is-mobile-open) .logout-button{width:44px;padding:0}.payid-sidebar.is-collapsed:not(.is-mobile-open) .logout-button span{display:none}
@media(max-width:900px){.payid-sidebar,.payid-sidebar.is-collapsed:not(.is-mobile-open){width:min(82vw,300px);padding:16px 14px 14px;transform:translateX(-102%);box-shadow:8px 0 30px rgba(15,28,22,.12)}.payid-sidebar.is-mobile-open{transform:translateX(0)}.payid-sidebar.is-collapsed .brand{justify-content:center;padding:0 8px}.payid-sidebar.is-collapsed .brand-logo{width:148px;height:74px}.payid-sidebar.is-collapsed .sidebar-header{padding-bottom:18px}.payid-sidebar.is-collapsed .sidebar-body{padding-top:17px}.payid-sidebar.is-collapsed .nav-caption{visibility:visible;height:auto;margin:0 10px 10px}.payid-sidebar.is-collapsed .navigation-link{min-height:48px;justify-content:flex-start;padding:0 10px}.payid-sidebar.is-collapsed .nav-icon{width:34px;height:34px}.payid-sidebar.is-collapsed .sidebar-footer{align-items:stretch;padding-right:2px;padding-left:2px}.payid-sidebar.is-collapsed .account-card{width:auto;justify-content:flex-start;padding:9px 8px;border-color:#edf1ed;background:#fbfcfb}.payid-sidebar.is-collapsed .account-info{display:flex}.payid-sidebar.is-collapsed .logout-button{width:100%;padding:0 12px}.payid-sidebar.is-collapsed .logout-button span{display:inline}}
@media(prefers-reduced-motion:reduce){.navigation-link,.navigation-link::before,.nav-icon,.brand-logo,.status-light,.logout-button,.logout-button svg{animation:none!important;transition:none!important}}
.account-card{min-height:58px;padding:9px 10px;gap:11px;background:linear-gradient(135deg,#fbfdfb,#f6faf6);border-color:#e5ece6;box-shadow:0 2px 7px #17251b08}.account-card:hover,.account-card.active{border-color:#c6dbc9;background:linear-gradient(135deg,#f2f8f3,#eaf3ec);box-shadow:0 6px 16px #315a4318;transform:translateY(-1px)}.account-card:focus-visible{outline:3px solid #5c855e35;outline-offset:2px}.account-avatar{width:40px;height:40px;border:1px solid #d3e1d5;border-radius:12px;box-shadow:0 3px 8px #315a4322,0 0 0 2px #fff;font-size:15px}.account-avatar-image{object-fit:cover}.account-info{gap:4px}.account-info strong{color:#2f4234;font-size:12px;font-weight:700}.account-info small{color:#7e8b81;font-size:10px}.account-trailing{display:grid;width:27px;height:27px;flex:none;place-items:center;border:1px solid #e5ece6;border-radius:9px;background:#fff;color:#91a096;transition:color .18s,border-color .18s,background .18s,transform .18s}.account-card:hover .account-trailing,.account-card.active .account-trailing{border-color:#d0e1d2;background:#f8fbf8;color:#4e7656;transform:translateX(2px)}
</style>
