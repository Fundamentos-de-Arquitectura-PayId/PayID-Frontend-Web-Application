<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Check, X } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const showLoader = ref(false)
const isLeaving = ref(false)
const useEntrySweep = ref(false)
const showLoginToast = ref(false)
let loadingTimer
let leaveTimer
let toastTimer
let hasShownInitialLoader = false

const isLoginEntry = computed(() => route.name === 'login')
const isAuthRoute = computed(() => ['login', 'register'].includes(route.name))

const dashboardRoutes = new Set(['home', 'payments', 'documents', 'transport', 'history', 'notifications', 'technicalSupport'])

function startEntryLoader({ sweep = false, loginSuccess = false } = {}) {
  window.clearTimeout(loadingTimer)
  window.clearTimeout(leaveTimer)
  window.clearTimeout(toastTimer)
  showLoginToast.value = false
  useEntrySweep.value = sweep
  isLeaving.value = false
  showLoader.value = true

  loadingTimer = window.setTimeout(() => {
    isLeaving.value = true
    leaveTimer = window.setTimeout(() => {
      showLoader.value = false
      isLeaving.value = false
      useEntrySweep.value = false
      if (loginSuccess) {
        showLoginToast.value = true
        toastTimer = window.setTimeout(() => { showLoginToast.value = false }, 4600)
      }
    }, 650)
  }, 1500)
}

watch(() => route.name, (nextRoute, previousRoute) => {
  const enteringDashboard = previousRoute === 'login' && dashboardRoutes.has(nextRoute)
  const leavingDashboard = dashboardRoutes.has(previousRoute) && nextRoute === 'login'
  if (enteringDashboard || leavingDashboard) {
    startEntryLoader({ sweep: true, loginSuccess: previousRoute === 'login' && nextRoute === 'home' })
    return
  }

  const wasAuthRoute = ['login', 'register'].includes(previousRoute)
  const isNextAuthRoute = ['login', 'register'].includes(nextRoute)

  if (hasShownInitialLoader && wasAuthRoute && isNextAuthRoute) {
    startEntryLoader({ sweep: true })
  }
})

onMounted(() => {
  if (isLoginEntry.value) {
    hasShownInitialLoader = true
    startEntryLoader()
  }
})

onUnmounted(() => {
  window.clearTimeout(loadingTimer)
  window.clearTimeout(leaveTimer)
  window.clearTimeout(toastTimer)
})
</script>

<template>

  <Transition name="login-toast">
    <aside v-if="showLoginToast" class="login-success-toast" role="status" aria-live="polite">
      <span class="toast-check"><Check :size="17" :stroke-width="2.5" aria-hidden="true" /></span>
      <span class="toast-copy">
        <strong>{{ t('feedback.loginSuccessTitle') }}</strong>
        <small>{{ t('feedback.loginSuccessText') }}</small>
      </span>
      <button class="toast-dismiss" type="button" :aria-label="t('feedback.dismiss')" @click="showLoginToast = false">
        <X :size="16" aria-hidden="true" />
      </button>
      <span class="toast-progress" aria-hidden="true"></span>
    </aside>
  </Transition>


  <!--<router-view />-->

  <router-view v-slot="{ Component }">
    <Transition name="page-enter" mode="out-in">
      <component :is="Component" :key="$route.fullPath" />
    </Transition>
  </router-view>

  <Transition name="loader-sweep">
    <section v-if="showLoader" class="payid-loader" :class="{ 'is-leaving': isLeaving, 'is-auth-transition': useEntrySweep || (isAuthRoute && !isLoginEntry) }" aria-label="Cargando PayID" role="status">
      <div class="loader-glow loader-glow-one"></div>
      <div class="loader-glow loader-glow-two"></div>
      <div class="loader-content">
        <div class="payid-mark" aria-hidden="true">
          <span class="mark-orbit"></span>
          <span class="mark-core">P</span>
        </div>
        <p class="loader-brand">Pay<span>ID</span></p>
        <div class="wallet-loader" aria-hidden="true">
          <div class="wallet-back"></div>
          <div class="bill bill-one"><span>S/</span></div>
          <div class="bill bill-two"><span>S/</span></div>
          <div class="bill bill-three"><span>S/</span></div>
          <div class="wallet-front"><span class="wallet-seam"></span><span class="wallet-clasp"></span></div>
        </div>
        <p class="loader-message">Tu día, más simple<span class="loader-dots"><i></i><i></i><i></i></span></p>
        <div class="loader-progress" aria-hidden="true"><span></span></div>
      </div>
      <span class="loader-caption">PAGOS SIMPLES · VIDA EN MOVIMIENTO</span>
    </section>
  </Transition>
  <!--<header><nav-bar></nav-bar></header>-->

</template>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.page-enter-enter-active { transition: opacity .34s ease, transform .34s ease; }
.page-enter-enter-from { opacity: 0; transform: translateX(18px); }

.payid-loader {
  --wallet-duration: 1.65s;
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 42%, #204b38 0%, #173b2c 42%, #102b21 100%);
  color: #fff;
  font-family: 'Poppins', system-ui, sans-serif;
  isolation: isolate;
}
.payid-loader::before, .payid-loader::after { position:absolute; content:''; pointer-events:none; }
.payid-loader::before { inset:0; opacity:.14; background-image:radial-gradient(rgba(210,238,219,.38) .7px,transparent .7px); background-size:24px 24px; mask-image:linear-gradient(transparent,#000 25%,#000 75%,transparent); }
.payid-loader::after { width:min(76vw,720px); aspect-ratio:1; border:1px solid rgba(205,235,215,.08); border-radius:50%; box-shadow:0 0 0 70px rgba(205,235,215,.025),0 0 0 140px rgba(205,235,215,.018); }
.loader-glow { position:absolute; width:340px; aspect-ratio:1; border-radius:50%; filter:blur(80px); opacity:.18; }
.loader-glow-one { top:-200px; right:-90px; background:#87d5a4; }
.loader-glow-two { bottom:-240px; left:-120px; background:#3da878; }
.loader-content { position:relative; z-index:1; display:flex; align-items:center; flex-direction:column; animation:content-appear .55s cubic-bezier(.2,.8,.2,1) both; }
.payid-mark { position:relative; display:grid; width:54px; height:54px; place-items:center; margin-bottom:12px; }
.mark-orbit { position:absolute; inset:3px; border:1px solid rgba(182,231,199,.48); border-radius:17px; transform:rotate(45deg); }
.mark-core { display:grid; width:36px; height:36px; place-items:center; border-radius:12px; background:linear-gradient(145deg,#c7f1d5,#75c991); color:#17422f; font-size:21px; font-weight:700; box-shadow:0 5px 25px rgba(113,207,148,.25); }
.loader-brand { margin:0 0 36px; color:#f2fff5; font-size:18px; font-weight:600; letter-spacing:.04em; }
.loader-brand span { color:#9ce0b1; }
.wallet-loader { position:relative; width:126px; height:91px; filter:drop-shadow(0 16px 17px rgba(4,20,13,.24)); }
.wallet-back { position:absolute; bottom:12px; left:9px; width:108px; height:48px; border-radius:8px 8px 3px 3px; background:#244b37; }
.bill { position:absolute; top:-13px; left:50%; display:grid; width:74px; height:45px; place-items:center; border:1px solid rgba(119,206,151,.66); border-radius:4px; background:linear-gradient(135deg,#c3f0ce,#85d5a4); color:#286644; font-size:15px; font-weight:700; opacity:0; transform:translateX(-50%); }
.bill span { display:grid; width:24px; height:24px; place-items:center; border:1px solid rgba(40,102,68,.6); border-radius:50%; }
.bill-one { z-index:1; animation:bill-rise 1.8s ease-in-out infinite; }
.bill-two { z-index:2; animation:bill-rise 1.8s .32s ease-in-out infinite; }
.bill-three { z-index:3; animation:bill-rise 1.8s .64s ease-in-out infinite; }
.wallet-front { position:absolute; z-index:4; bottom:3px; left:3px; display:flex; width:120px; height:55px; align-items:center; justify-content:flex-end; padding-right:12px; border:1px solid rgba(176,225,190,.24); border-radius:9px 9px 14px 14px; background:linear-gradient(155deg,#397b55,#24563b 62%,#1d4933); animation:wallet-bob 1.8s ease-in-out infinite; }
.wallet-seam { position:absolute; inset:6px; border:1px dashed rgba(197,232,204,.2); border-radius:5px 5px 10px 10px; }
.wallet-clasp { position:relative; z-index:1; width:19px; height:15px; border:1.5px solid #b1e2bd; border-radius:5px; background:#34764e; box-shadow:0 2px 7px rgba(8,28,16,.22); }
.wallet-clasp::after { position:absolute; top:4px; left:7px; width:3px; height:3px; border-radius:50%; background:#c1edcc; content:''; }
.loader-message { margin:21px 0 17px; color:#e4f2e8; font-size:13px; font-weight:500; letter-spacing:.025em; }
.loader-dots { display:inline-flex; gap:4px; margin-left:5px; }
.loader-dots i { width:3px; height:3px; border-radius:50%; background:#9de0b2; animation:dots-wave .95s ease-in-out infinite; }
.loader-dots i:nth-child(2) { animation-delay:.13s; }.loader-dots i:nth-child(3) { animation-delay:.26s; }
.loader-progress { width:106px; height:2px; overflow:hidden; border-radius:5px; background:rgba(201,233,211,.16); }
.loader-progress span { display:block; width:38%; height:100%; border-radius:inherit; background:#9de0b2; box-shadow:0 0 12px rgba(157,224,178,.75); animation:progress-sweep 1.15s ease-in-out infinite; }
.loader-caption { position:absolute; z-index:1; bottom:30px; color:rgba(220,243,226,.45); font-size:9px; font-weight:500; letter-spacing:.2em; }
.login-success-toast{position:fixed;z-index:9999;top:84px;right:24px;display:flex;width:min(390px,calc(100vw - 32px));align-items:center;gap:12px;overflow:hidden;padding:15px 14px;border:1px solid #e4ece6;border-radius:14px;background:rgba(255,255,255,.97);box-shadow:0 16px 42px rgba(24,47,32,.18);backdrop-filter:blur(12px);font-family:'Poppins',system-ui,sans-serif}
.toast-check{display:grid;width:34px;height:34px;flex:none;place-items:center;border:1px solid #dceade;border-radius:11px;background:#eff7f0;color:#356947}
.toast-copy{display:grid;min-width:0;gap:3px;flex:1}
.toast-copy strong{color:#263c2d;font-size:12px;font-weight:650;line-height:1.35}
.toast-copy small{color:#77847a;font-size:10px;font-weight:400;line-height:1.4}
.toast-dismiss{display:grid;width:28px;height:28px;flex:none;place-items:center;border:0;border-radius:8px;background:transparent;color:#8a958d;cursor:pointer;transition:background .16s,color .16s}
.toast-dismiss:hover{background:#f0f5f1;color:#355644}
.toast-progress{position:absolute;right:0;bottom:0;left:0;height:2px;background:#eaf1eb;transform-origin:left;animation:toast-countdown 4.6s linear forwards}
.toast-progress:after{position:absolute;inset:0;content:'';background:#5a8a64}
.login-toast-enter-active,.login-toast-leave-active{transition:opacity .24s ease,transform .3s cubic-bezier(.2,.75,.25,1)}
.login-toast-enter-from,.login-toast-leave-to{opacity:0;transform:translate(14px,-8px)}
@keyframes toast-countdown{to{transform:scaleX(0)}}
.loader-sweep-leave-active { transition:clip-path .65s cubic-bezier(.77,0,.18,1), opacity .65s ease; clip-path:inset(0); }
.loader-sweep-leave-to { clip-path:inset(0 0 0 100%); opacity:.96; }
.payid-loader.is-auth-transition { animation:auth-wipe-in .42s cubic-bezier(.77,0,.18,1) both; }
.payid-loader.is-auth-transition .loader-content { animation:auth-content-in .48s .12s ease both; }
@keyframes auth-wipe-in { from { clip-path:inset(0 100% 0 0); } to { clip-path:inset(0); } }
@keyframes auth-content-in { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
@keyframes content-appear { from { opacity:0; transform:translateY(10px) scale(.98); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes bill-rise { 0% { top:-13px; opacity:0; transform:translateX(-50%) scale(.82); } 12% { opacity:1; } 35%,85% { top:23px; opacity:1; transform:translateX(-50%) scale(1); } 100% { top:23px; opacity:0; transform:translateX(-50%) scale(.98); } }
@keyframes wallet-bob { 0%,100% { transform:scale(1); } 34% { transform:scale(1.025,.975); } 39% { transform:scale(1); } 67% { transform:scale(1.02,.98); } 72% { transform:scale(1); } }
@keyframes dots-wave { 0%,65%,100% { transform:translateY(0); opacity:.55; } 32% { transform:translateY(-4px); opacity:1; } }
@keyframes progress-sweep { from { transform:translateX(-120%); } to { transform:translateX(280%); } }
@media(max-width:900px){.login-success-toast{top:76px}}
@media(max-width:560px){.login-success-toast{right:12px;width:calc(100vw - 24px);padding:13px 12px}}
@media(prefers-reduced-motion:reduce) { .loader-content,.bill-one,.bill-two,.bill-three,.wallet-front,.loader-dots i,.loader-progress span,.toast-progress { animation:none; } .bill { display:none; } .loader-sweep-leave-active,.page-enter-enter-active,.login-toast-enter-active,.login-toast-leave-active { transition-duration:.01ms; } }
</style>

//json-server --watch fixtures/db.json --port 4000
