<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, Check, CreditCard, LockKeyhole, LoaderCircle, ShieldCheck } from 'lucide-vue-next'
import HeaderLogin from '../../../../shared/ui/login/components/HeaderLogin.component.vue'

const router = useRouter()
const { t, locale } = useI18n()
const assetBase = import.meta.env.BASE_URL
const cardNumber = ref('')
const expiry = ref('')
const cvv = ref('')
const cvvFocused = ref(false)
const status = ref('form')
const ready = ref(false)
const pendingEmail = ref('')
const pendingPlan = ref(null)
const errors = ref({})
let finishTimer

const digits = computed(() => cardNumber.value.replace(/\D/g, ''))
const displayNumber = computed(() => {
  const number = digits.value.padEnd(16, '•')
  return number.match(/.{1,4}/g)?.join('  ') || '••••  ••••  ••••  ••••'
})
const cardBrand = computed(() => {
  if (digits.value.startsWith('4')) return 'VISA'
  if (/^5[1-5]/.test(digits.value)) return 'MASTERCARD'
  if (/^3[47]/.test(digits.value)) return 'AMEX'
  return 'PAYID'
})
const cardExpiry = computed(() => expiry.value || 'MM/AA')
const processing = computed(() => status.value === 'processing')
const success = computed(() => status.value === 'success')

onMounted(() => {
  try {
    const pending = JSON.parse(sessionStorage.getItem('payid:payment:pending') || 'null')
    if (!pending?.email) {
      router.replace({ name: 'register' })
      return
    }
    pendingEmail.value = pending.email
    pendingPlan.value = pending.planId ? pending : null
    ready.value = true
  } catch {
    router.replace({ name: 'register' })
  }
})

onBeforeUnmount(() => clearTimeout(finishTimer))

function onCardInput(event) {
  const value = event.target.value.replace(/\D/g, '').slice(0, 19)
  cardNumber.value = value.replace(/(.{4})/g, '$1 ').trim()
  errors.value.cardNumber = ''
}

function onExpiryInput(event) {
  const value = event.target.value.replace(/\D/g, '').slice(0, 4)
  expiry.value = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value
  errors.value.expiry = ''
}

function onCvvInput(event) {
  cvv.value = event.target.value.replace(/\D/g, '').slice(0, 4)
  errors.value.cvv = ''
}

function validate() {
  const next = {}
  if (digits.value.length < 13) next.cardNumber = t('paymentDemo.errors.cardNumber')
  const match = expiry.value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
  if (!match) next.expiry = t('paymentDemo.errors.expiry')
  else {
    const month = Number(match[1])
    const year = 2000 + Number(match[2])
    const now = new Date()
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      next.expiry = t('paymentDemo.errors.expired')
    }
  }
  if (!/^\d{3,4}$/.test(cvv.value)) next.cvv = t('paymentDemo.errors.cvv')
  errors.value = next
  return Object.keys(next).length === 0
}

function finish() {
  persistSelectedPlan('active')
  sessionStorage.removeItem('payid:payment:pending')
  router.replace({ name: 'login', query: { email: pendingEmail.value } })
}

function submit() {
  if (status.value !== 'form' || !validate()) return
  status.value = 'processing'
  finishTimer = setTimeout(() => {
    // Demo only: save display-safe metadata; never persist the full PAN or CVV.
    sessionStorage.setItem('payid:payment:card-pending', JSON.stringify({
      email: pendingEmail.value.toLowerCase(),
      lastFour: digits.value.slice(-4),
      brand: cardBrand.value,
      expiryDate: expiry.value,
    }))
    status.value = 'success'
    finishTimer = setTimeout(finish, 1700)
  }, 1500)
}

function continueLater() {
  persistSelectedPlan('pending_payment')
  sessionStorage.removeItem('payid:payment:pending')
  router.push({ name: 'login', query: { email: pendingEmail.value } })
}

function persistSelectedPlan(status) {
  if (!pendingPlan.value) return
  localStorage.setItem(`payid:subscription:${pendingEmail.value.toLowerCase()}`, JSON.stringify({
    planId: pendingPlan.value.planId,
    planName: pendingPlan.value.planName,
    price: Number(pendingPlan.value.planPrice) || 0,
    billingPeriod: pendingPlan.value.billingPeriod || 'monthly',
    status,
    selectedAt: new Date().toISOString(),
  }))
}

const planPriceLabel = computed(() => {
  if (!pendingPlan.value) return ''
  const amount = Number(pendingPlan.value.planPrice) || 0
  return amount === 0
    ? (locale.value === 'es' ? 'Gratis' : 'Free')
    : new Intl.NumberFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(amount)
})
</script>

<template>
  <main class="payment-shell">
    <div class="language-control"><HeaderLogin /></div>
    <section v-if="ready" class="payment-frame" aria-label="PayID">
      <aside class="payment-visual">
        <video class="auth-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
          <source :src="`${assetBase}videos/payid-auth-background.mp4`" type="video/mp4" />
        </video>
        <div class="visual-overlay" aria-hidden="true"></div>
        <div class="visual-message">
          <p>{{ t('brand.tagline') }}</p>
          <h2>{{ t('paymentDemo.visualTitle') }}</h2>
          <span><ShieldCheck :size="17" aria-hidden="true" /> {{ t('paymentDemo.visualNote') }}</span>
        </div>
      </aside>

      <section class="payment-panel">
        <div class="payment-content">
          <img class="payid-logo" :src="`${assetBase}images/payid-logo.png`" alt="PayID" />
          <header class="payment-heading">
            <span class="secure-pill"><LockKeyhole :size="13" aria-hidden="true" /> {{ t('paymentDemo.secure') }}</span>
            <h1>{{ t('paymentDemo.title') }}</h1>
            <p>{{ t('paymentDemo.subtitle') }}</p>
          </header>

          <div v-if="pendingPlan" class="selected-plan-summary">
            <span class="plan-summary-icon"><CreditCard :size="16" aria-hidden="true" /></span>
            <span class="plan-summary-copy"><small>{{ locale === 'es' ? 'Plan seleccionado' : 'Selected plan' }}</small><strong>{{ pendingPlan.planName }}</strong></span>
            <span class="plan-summary-price"><strong>{{ planPriceLabel }}</strong><small v-if="Number(pendingPlan.planPrice) > 0">{{ locale === 'es' ? '/ mes' : '/ month' }}</small></span>
          </div>

          <div class="demo-notice"><ShieldCheck :size="17" aria-hidden="true" /><span>{{ t('paymentDemo.demoNotice') }}</span></div>

          <div class="payment-card-scene" :class="{ flipped: cvvFocused }" aria-hidden="true">
            <div class="payment-card">
              <div class="card-face card-front">
                <div class="card-top"><div class="card-chip"><i></i><i></i><i></i><i></i></div><strong>{{ cardBrand }}</strong></div>
                <p class="card-number">{{ displayNumber }}</p>
                <div class="card-bottom"><span><small>{{ t('paymentDemo.cardLabel') }}</small>{{ t('brand.title') }}</span><span><small>{{ t('paymentDemo.expiryLabel') }}</small>{{ cardExpiry }}</span></div>
              </div>
              <div class="card-face card-back"><div class="card-stripe"></div><div class="card-signature"><span>{{ t('paymentDemo.signature') }}</span><strong>{{ cvv || '•••' }}</strong></div><small>{{ t('paymentDemo.backCardNote') }}</small></div>
            </div>
          </div>

          <form class="payment-form" @submit.prevent="submit" novalidate>
            <label class="field">
              <span>{{ t('paymentDemo.cardNumber') }}</span>
              <span class="input-wrap" :class="{ invalid: errors.cardNumber }"><CreditCard :size="17" aria-hidden="true" /><input :value="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="0000  0000  0000  0000" maxlength="23" :disabled="status !== 'form'" :aria-invalid="!!errors.cardNumber" @input="onCardInput" /></span>
              <small v-if="errors.cardNumber" class="field-error">{{ errors.cardNumber }}</small>
            </label>
            <div class="field-row">
              <label class="field">
                <span>{{ t('paymentDemo.expiry') }}</span>
                <span class="input-wrap" :class="{ invalid: errors.expiry }"><input :value="expiry" inputmode="numeric" autocomplete="cc-exp" :placeholder="t('paymentDemo.expiryPlaceholder')" maxlength="5" :disabled="status !== 'form'" :aria-invalid="!!errors.expiry" @input="onExpiryInput" /></span>
                <small v-if="errors.expiry" class="field-error">{{ errors.expiry }}</small>
              </label>
              <label class="field">
                <span>{{ t('paymentDemo.cvv') }}</span>
                <span class="input-wrap" :class="{ invalid: errors.cvv }"><input :value="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4" :disabled="status !== 'form'" :aria-invalid="!!errors.cvv" @input="onCvvInput" @focus="cvvFocused = true" @blur="cvvFocused = false" /></span>
                <small v-if="errors.cvv" class="field-error">{{ errors.cvv }}</small>
              </label>
            </div>
            <button class="pay-button" type="submit" :disabled="status !== 'form'">
              <span>{{ t('paymentDemo.submit') }}</span><ArrowRight :size="17" aria-hidden="true" />
            </button>
          </form>

          <button class="continue-later" type="button" @click="continueLater">{{ t('paymentDemo.continueLater') }}</button>
        </div>
      </section>
    </section>

    <Teleport to="body">
      <Transition name="payment-modal">
        <div v-if="processing || success" class="payment-modal" role="dialog" aria-modal="true" :aria-label="success ? t('paymentDemo.successTitle') : t('paymentDemo.processingTitle')">
          <div class="modal-backdrop"></div>
          <div class="modal-card">
            <div v-if="processing" class="processing-mark"><span class="spinner-ring"></span><LockKeyhole :size="25" aria-hidden="true" /></div>
            <div v-else class="success-mark"><Check :size="34" stroke-width="2.6" aria-hidden="true" /></div>
            <h2>{{ success ? t('paymentDemo.successTitle') : t('paymentDemo.processingTitle') }}</h2>
            <p>{{ success ? t('paymentDemo.successText') : t('paymentDemo.processingText') }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
.payment-shell{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px;position:relative;overflow:hidden;background:#1f2523;color:#1f2523;font-family:'Poppins',sans-serif}
.selected-plan-summary{display:flex;align-items:center;gap:10px;margin:-2px 0 15px;padding:10px 12px;border:1px solid #e4ebe5;border-radius:11px;background:#f8faf8}.plan-summary-icon{display:grid;width:32px;height:32px;flex:none;place-items:center;border-radius:9px;background:#edf4ef;color:#4d7754}.plan-summary-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.plan-summary-copy small,.plan-summary-price small{color:#8b968e;font-size:9px}.plan-summary-copy strong{overflow:hidden;color:#3b4d40;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.plan-summary-price{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.plan-summary-price strong{color:#2f5038;font-size:12px}
.language-control{position:absolute;top:22px;right:24px;z-index:2}
.payment-frame{position:relative;width:min(1160px,100%);min-height:min(820px,calc(100dvh - 48px));display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,460px);overflow:hidden;border-radius:30px;background:#fff;box-shadow:0 40px 90px rgba(15,22,18,.45)}
.payment-visual{position:relative;min-width:0;min-height:100%;display:flex;align-items:flex-end;overflow:hidden;border:5px solid #f7f3ec;border-radius:26px;background:#1f2523}
.auth-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.visual-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,35,27,.2),rgba(17,35,27,.78))}
.visual-message{position:relative;z-index:1;max-width:460px;padding:40px;color:#fff}
.visual-message p{margin:0 0 12px;color:#a7e0c4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.visual-message h2{margin:0 0 22px;font-size:clamp(26px,3vw,38px);font-weight:600;line-height:1.2;letter-spacing:-.035em}
.visual-message span{display:flex;align-items:center;gap:8px;color:#e5eee8;font-size:13px}
.payment-panel{display:grid;place-items:center;min-width:0;padding:30px 38px;background:#fff;overflow-y:auto}
.payment-content{display:grid;gap:12px;width:min(100%,390px);margin:auto}
.payid-logo{display:block;width:88px;height:68px;object-fit:contain;margin:0 auto -4px}
.payment-heading{text-align:center}
.secure-pill{display:inline-flex;align-items:center;gap:5px;margin-bottom:7px;padding:5px 9px;border:1px solid #e5ece7;border-radius:999px;background:#f7faf7;color:#536a5a;font-size:10px;font-weight:600}
.payment-heading h1{margin:0;color:#1f2523;font-size:22px;font-weight:600;line-height:1.3}
.payment-heading p{margin:5px 0 0;color:#828982;font-size:12px;line-height:1.5}
.demo-notice{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border:1px solid #e5ebe6;border-radius:10px;background:#f8faf8;color:#68756c;font-size:10px;line-height:1.45}
.demo-notice svg{flex:0 0 auto;color:#54745e}
.payment-card-scene{height:158px;perspective:900px}
.payment-card{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.2,.75,.25,1)}
.payment-card-scene.flipped .payment-card{transform:rotateY(180deg)}
.card-face{position:absolute;inset:0;overflow:hidden;padding:17px 19px;border-radius:17px;background:radial-gradient(ellipse at 100% 0%,rgba(143,174,151,.6),transparent 42%),linear-gradient(135deg,#193b2c 0%,#355644 52%,#263f32 100%);box-shadow:0 15px 28px rgba(32,67,47,.2);color:#fff;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.card-face:after{position:absolute;inset:0;content:"";pointer-events:none;background:linear-gradient(120deg,transparent 25%,rgba(255,255,255,.07) 48%,transparent 68%)}
.card-top,.card-bottom{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between}
.card-top strong{font-size:10px;font-weight:700;letter-spacing:.1em}
.card-chip{position:relative;display:grid;width:31px;height:23px;grid-template-columns:1fr 1fr;border:1px solid rgba(241,221,160,.85);border-radius:5px;background:linear-gradient(135deg,#d8c58e,#a99661);overflow:hidden}
.card-chip i{border:1px solid rgba(105,92,56,.35)}
.card-number{position:relative;z-index:1;margin:17px 0 14px;font-size:14px;font-weight:500;letter-spacing:.09em;font-variant-numeric:tabular-nums;white-space:nowrap}
.card-bottom{align-items:flex-end;font-size:10px;font-weight:600;letter-spacing:.04em}
.card-bottom span:last-child{text-align:right}
.card-bottom small{display:block;margin-bottom:3px;color:#c3d0c7;font-size:7px;font-weight:600;letter-spacing:.11em;text-transform:uppercase}
.card-back{transform:rotateY(180deg)}
.card-stripe{height:29px;margin:2px -19px 17px;background:#14271d}
.card-signature{display:flex;align-items:center;justify-content:space-between;height:29px;padding:0 10px;border-radius:4px;background:#e7e8df;color:#38493c}
.card-signature span{font-size:9px;font-style:italic}
.card-signature strong{min-width:38px;padding:4px 6px;border-radius:3px;background:#fff;text-align:center;font-size:11px;letter-spacing:.1em}
.card-back>small{display:block;margin-top:12px;color:#c3d0c7;font-size:8px}
.payment-form{display:grid;gap:10px}
.field{display:grid;min-width:0;gap:4px;color:#25392e;font-size:11px;font-weight:600}
.input-wrap{display:flex;align-items:center;gap:8px;height:42px;padding:0 12px;border:1px solid #e5e3dd;border-radius:10px;background:#fff;color:#839087;transition:border-color .18s ease,box-shadow .18s ease}
.input-wrap:focus-within{border-color:#6d8976;box-shadow:0 0 0 3px rgba(82,123,100,.12)}
.input-wrap.invalid{border-color:#dc6057;box-shadow:0 0 0 2px rgba(220,96,87,.1)}
.input-wrap input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#25392e;font:inherit;font-size:12px;font-weight:400}
.input-wrap input::placeholder{color:#aaa9a3}
.input-wrap input:disabled{opacity:.65}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.field-error{color:#c83f37;font-size:10px;font-weight:500}
.pay-button{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:9px;min-height:45px;margin-top:2px;border:1px solid transparent;border-radius:10px;background:#355644;color:#fff;font:inherit;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 3px 8px rgba(37,69,50,.14);transition:transform .2s ease,box-shadow .2s ease}
.pay-button:before{position:absolute;z-index:-1;inset:0;content:"";background:linear-gradient(110deg,#355644 0%,#617d6b 50%,#355644 100%);background-size:220% 100%;background-position:100% 0;transition:background-position .5s cubic-bezier(.2,.7,.2,1)}
.pay-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 7px 15px rgba(37,69,50,.2)}
.pay-button:hover:not(:disabled):before{background-position:0 0}
.pay-button:disabled{opacity:.72;cursor:wait}
.continue-later{justify-self:center;padding:3px 8px;border:0;background:transparent;color:#718076;font:inherit;font-size:10px;cursor:pointer}
.continue-later:hover{text-decoration:underline;color:#355644}
@media(max-width:960px){.payment-shell{display:block;min-height:100vh;min-height:100dvh;padding:76px 16px 16px;overflow-x:hidden;overflow-y:auto}.payment-frame{width:min(560px,100%);min-height:calc(100dvh - 92px);margin:0 auto;grid-template-columns:1fr;overflow:visible;border-radius:24px}.payment-visual{display:none}.payment-panel{min-height:calc(100dvh - 92px);padding:28px 24px;border-radius:24px}.payment-content{width:min(100%,420px)}}
@media(max-width:560px){.payment-shell{padding:76px 12px 12px}.payment-frame{min-height:calc(100dvh - 88px);border-radius:22px}.payment-panel{min-height:calc(100dvh - 88px);padding:24px 20px;border-radius:22px}.payment-content{gap:10px}.payment-card-scene{height:148px}.card-face{padding:15px 16px}.card-number{margin:15px 0 12px;font-size:13px}}
@media(prefers-reduced-motion:reduce){.payment-card,.pay-button,.pay-button:before{transition:none}}
</style>

<style>
.payment-modal{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:20px}
.modal-backdrop{position:absolute;inset:0;background:rgba(17,35,27,.58);backdrop-filter:blur(8px)}
.modal-card{position:relative;z-index:1;width:min(100%,330px);padding:30px 24px 26px;border:1px solid rgba(255,255,255,.72);border-radius:22px;background:#fff;box-shadow:0 28px 70px rgba(15,34,23,.28);text-align:center;animation:modal-lift .35s cubic-bezier(.2,.75,.25,1)}
.modal-card h2{margin:14px 0 6px;color:#20362a;font-size:18px;font-weight:650}
.modal-card p{margin:0;color:#7b857e;font-size:12px;line-height:1.55}
.processing-mark,.success-mark{position:relative;display:grid;width:72px;height:72px;place-items:center;margin:auto;border-radius:50%;background:#edf3ee;color:#355644}
.spinner-ring{position:absolute;inset:-4px;border:2px solid #e5ece7;border-top-color:#355644;border-radius:50%;animation:payid-spin .85s linear infinite}
.success-mark{background:#355644;color:white;box-shadow:0 0 0 8px rgba(53,86,68,.1);animation:modal-pop .4s cubic-bezier(.2,.75,.25,1)}
.payment-modal-enter-active,.payment-modal-leave-active{transition:opacity .22s ease}.payment-modal-enter-from,.payment-modal-leave-to{opacity:0}
@keyframes payid-spin{to{transform:rotate(360deg)}}
@keyframes modal-lift{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes modal-pop{from{transform:scale(.72)}to{transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.spinner-ring{animation-duration:2.5s}.success-mark,.modal-card{animation:none}}
</style>
