<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CreditCard, ShieldCheck, Sparkles, UsersRound, WalletCards } from 'lucide-vue-next'
import HeaderLogin from '../../../../shared/ui/login/components/HeaderLogin.component.vue'

const router = useRouter()
const { locale } = useI18n()
const logoUrl = `${import.meta.env.BASE_URL}images/payid-logo.png`
const ready = ref(false)
const selectedPlan = ref('family')
const copy = computed(() => locale.value === 'es' ? {
  eyebrow: 'ELIGE TU PLAN', title: 'Una sola identidad para todo lo que importa.', subtitle: 'Selecciona el plan que mejor acompaña a tu familia. Puedes revisar tu elección antes de continuar.',
  monthly: 'por mes', free: 'Gratis', choose: 'Seleccionar plan', selected: 'Plan seleccionado', popular: 'MÁS ELEGIDO', included: 'Incluye',
  basic: 'Esencial', basicDesc: 'Empieza a organizar tu identidad digital.', family: 'Familiar', familyDesc: 'Todo tu hogar conectado en un solo lugar.', plus: 'Familiar Plus', plusDesc: 'Más espacio para una familia en movimiento.',
  basicFeatures: ['Tu identidad digital PayID', 'Hasta 3 tarjetas vinculadas', 'Documentos personales organizados', 'Alertas de vencimiento'],
  familyFeatures: ['Todo lo del plan Esencial', 'Hasta 5 perfiles familiares', 'Tarjetas de pago y transporte', 'Documentos compartidos del hogar', 'Historial y alertas familiares'],
  plusFeatures: ['Todo lo del plan Familiar', 'Perfiles familiares ilimitados', 'Tarjetas vinculadas sin límite', 'Alertas y seguimiento prioritario', 'Gestión completa del hogar'],
  secure: 'Tus datos personales están protegidos', next: 'Continuar al pago', back: 'Volver', footer: 'Sin compromiso. Puedes cambiar de plan más adelante.',
  invalid: 'No encontramos el registro pendiente. Vuelve a crear tu cuenta.'
} : {
  eyebrow: 'CHOOSE YOUR PLAN', title: 'One identity for everything that matters.', subtitle: 'Choose the plan that fits your family. You can review your selection before continuing.',
  monthly: 'per month', free: 'Free', choose: 'Choose plan', selected: 'Selected plan', popular: 'MOST POPULAR', included: 'Includes',
  basic: 'Essential', basicDesc: 'Start organizing your digital identity.', family: 'Family', familyDesc: 'Your household, connected in one place.', plus: 'Family Plus', plusDesc: 'More room for a family on the move.',
  basicFeatures: ['Your PayID digital identity', 'Up to 3 linked cards', 'Organized personal documents', 'Expiry reminders'],
  familyFeatures: ['Everything in Essential', 'Up to 5 family profiles', 'Payment and transit cards', 'Shared household documents', 'Family activity and alerts'],
  plusFeatures: ['Everything in Family', 'Unlimited family profiles', 'Unlimited linked cards', 'Priority alerts and tracking', 'Complete household management'],
  secure: 'Your personal information is protected', next: 'Continue to payment', back: 'Back', footer: 'No commitment. You can change your plan later.',
  invalid: 'We could not find your pending registration. Please create your account again.'
})
const plans = computed(() => [
  { id: 'essential', name: copy.value.basic, description: copy.value.basicDesc, price: 0, features: copy.value.basicFeatures, icon: WalletCards },
  { id: 'family', name: copy.value.family, description: copy.value.familyDesc, price: 14.9, features: copy.value.familyFeatures, icon: UsersRound, featured: true },
  { id: 'family-plus', name: copy.value.plus, description: copy.value.plusDesc, price: 29.9, features: copy.value.plusFeatures, icon: Sparkles },
])
const selected = computed(() => plans.value.find(plan => plan.id === selectedPlan.value) || plans.value[1])
const price = (amount) => amount === 0 ? copy.value.free : new Intl.NumberFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(amount)

onMounted(() => {
  try {
    const pending = JSON.parse(sessionStorage.getItem('payid:payment:pending') || 'null')
    if (!pending?.email) { window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message: copy.value.invalid } })); router.replace({ name: 'register' }); return }
    ready.value = true
  } catch { router.replace({ name: 'register' }) }
})

function continueToPayment() {
  const pending = JSON.parse(sessionStorage.getItem('payid:payment:pending') || 'null')
  sessionStorage.setItem('payid:payment:pending', JSON.stringify({ ...pending, planId: selected.value.id, planName: selected.value.name, planPrice: selected.value.price, billingPeriod: 'monthly' }))
  router.push({ name: 'payment-demo' })
}
</script>

<template>
  <main v-if="ready" class="plans-shell">
    <div class="language-control"><HeaderLogin /></div>
    <div class="plans-page">
      <header class="plans-header">
        <button class="back-button" type="button" @click="router.push({ name: 'register' })"><ArrowLeft :size="16"/> {{ copy.back }}</button>
        <img class="plans-logo" :src="logoUrl" alt="PayID" />
        <div class="step-label"><span>1</span><i></i><span class="current">2</span><i></i><span>3</span></div>
      </header>

      <section class="plans-intro">
        <span class="plans-eyebrow"><ShieldCheck :size="14"/> {{ copy.eyebrow }}</span>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.subtitle }}</p>
      </section>

      <section class="plan-grid" :aria-label="copy.eyebrow">
        <button v-for="plan in plans" :key="plan.id" type="button" class="plan-card" :class="{ selected: selectedPlan === plan.id, featured: plan.featured }" @click="selectedPlan = plan.id">
          <span v-if="plan.featured" class="popular-tag"><Sparkles :size="12"/> {{ copy.popular }}</span>
          <span class="plan-icon"><component :is="plan.icon" :size="20"/></span>
          <span class="plan-name">{{ plan.name }}</span>
          <span class="plan-description">{{ plan.description }}</span>
          <span class="plan-price"><strong>{{ price(plan.price) }}</strong><small v-if="plan.price">{{ copy.monthly }}</small></span>
          <span class="plan-divider"></span>
          <span class="feature-heading">{{ copy.included }}</span>
          <span v-for="feature in plan.features" :key="feature" class="plan-feature"><Check :size="15"/> {{ feature }}</span>
          <span class="select-indicator"><Check v-if="selectedPlan === plan.id" :size="14"/><span v-else></span>{{ selectedPlan === plan.id ? copy.selected : copy.choose }}</span>
        </button>
      </section>

      <footer class="plans-footer">
        <span class="trust-note"><ShieldCheck :size="16"/> {{ copy.secure }}</span>
        <span class="footer-note">{{ copy.footer }}</span>
        <button class="continue-button" type="button" @click="continueToPayment">{{ copy.next }} <ArrowRight :size="17"/></button>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.plans-shell{min-height:100vh;min-height:100dvh;padding:26px 24px 42px;background:radial-gradient(ellipse at 50% 0,#eaf2ec 0,transparent 42%),#f4f6f4;color:#23342a;font-family:'Poppins',sans-serif}.language-control{position:fixed;top:18px;right:22px;z-index:5}.plans-page{width:min(1100px,100%);margin:0 auto}.plans-header{position:relative;display:flex;height:55px;align-items:center;justify-content:space-between}.back-button{display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #e2e9e3;border-radius:9px;background:#fff;color:#68786d;font:500 11px inherit;cursor:pointer}.back-button:hover{border-color:#bfd4c2;color:#315a43}.plans-logo{position:absolute;left:50%;width:104px;height:48px;object-fit:contain;transform:translateX(-50%)}.step-label{display:flex;align-items:center;gap:7px;color:#a1aca3;font-size:10px}.step-label span{display:grid;width:24px;height:24px;place-items:center;border:1px solid #dfe7e0;border-radius:50%;background:#fff}.step-label .current{border-color:#315a43;background:#315a43;color:#fff}.step-label i{width:22px;height:1px;background:#dce5dd}.plans-intro{padding:36px 0 29px;text-align:center}.plans-eyebrow{display:inline-flex;align-items:center;gap:6px;color:#5d8064;font-size:10px;font-weight:700;letter-spacing:.13em}.plans-intro h1{margin:11px 0 8px;color:#26392c;font-size:clamp(25px,3.4vw,34px);letter-spacing:-.045em}.plans-intro p{max-width:570px;margin:0 auto;color:#829087;font-size:12px;line-height:1.7}.plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:16px}.plan-card{position:relative;display:flex;min-width:0;min-height:370px;flex-direction:column;align-items:flex-start;padding:23px 21px 18px;border:1px solid #e2e9e3;border-radius:17px;background:#fff;color:#334439;text-align:left;box-shadow:0 8px 25px #1c352209;cursor:pointer;transition:transform .2s,border-color .2s,box-shadow .2s}.plan-card:hover{transform:translateY(-3px);border-color:#abc7af;box-shadow:0 14px 30px #1c352214}.plan-card.selected{border:2px solid #477451;padding:22px 20px 17px;box-shadow:0 0 0 4px #47745112,0 12px 27px #1c35220f}.plan-card.featured{background:linear-gradient(160deg,#fff 55%,#f7fbf7)}.popular-tag{position:absolute;top:-11px;right:16px;display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:99px;background:#315a43;color:#fff;font-size:8px;font-weight:700;letter-spacing:.07em}.plan-icon{display:grid;width:42px;height:42px;place-items:center;border:1px solid #e5eee6;border-radius:12px;background:#f2f7f2;color:#4b7654}.plan-name{margin-top:15px;color:#304334;font-size:18px;font-weight:700;letter-spacing:-.02em}.plan-description{min-height:34px;margin-top:5px;color:#859188;font-size:10px;line-height:1.6}.plan-price{display:flex;align-items:baseline;gap:6px;margin-top:17px}.plan-price strong{color:#253a2c;font-size:27px;letter-spacing:-.04em}.plan-price small{color:#8c978e;font-size:10px}.plan-divider{width:100%;height:1px;margin:17px 0 13px;background:#edf1ed}.feature-heading{margin-bottom:9px;color:#607067;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.plan-feature{display:flex;align-items:flex-start;gap:7px;margin:5px 0;color:#66756b;font-size:10px;line-height:1.45}.plan-feature svg{flex:none;color:#53805a}.select-indicator{display:flex;align-items:center;gap:7px;margin-top:auto;padding-top:16px;color:#718078;font-size:10px;font-weight:650}.select-indicator>span,.select-indicator>svg{display:grid;width:17px;height:17px;place-items:center;border:1px solid #d8e2d9;border-radius:50%}.plan-card.selected .select-indicator{color:#315a43}.plan-card.selected .select-indicator>svg{border-color:#315a43;background:#315a43;color:#fff}.plans-footer{display:grid;grid-template-columns:1fr 1fr auto;align-items:center;gap:12px;margin-top:21px;padding:16px 18px;border:1px solid #e4eae4;border-radius:14px;background:#fff}.trust-note{display:flex;align-items:center;gap:7px;color:#54755b;font-size:10px;font-weight:600}.footer-note{color:#929c94;font-size:9px;text-align:center}.continue-button{display:flex;min-height:42px;align-items:center;justify-content:center;gap:9px;padding:0 17px;border:1px solid #315a43;border-radius:10px;background:linear-gradient(135deg,#416f51,#294b36);color:#fff;font:650 11px inherit;box-shadow:0 4px 11px #315a4325;cursor:pointer;transition:transform .18s,box-shadow .18s}.continue-button:hover{transform:translateY(-1px);box-shadow:0 7px 16px #315a4333}.continue-button svg{transition:transform .18s}.continue-button:hover svg{transform:translateX(3px)}@media(max-width:800px){.plans-shell{padding:22px 16px 30px}.plans-intro{padding-top:28px}.plan-grid{grid-template-columns:1fr;max-width:480px;margin:auto}.plan-card{min-height:0}.plans-footer{grid-template-columns:1fr auto}.trust-note{grid-column:1}.footer-note{grid-column:1;grid-row:2;text-align:left}.continue-button{grid-column:2;grid-row:1/3}}@media(max-width:480px){.plans-shell{padding:70px 13px 24px}.plans-header{height:46px}.plans-logo{width:88px}.step-label{gap:4px}.step-label i{width:12px}.back-button{padding:7px 8px}.plans-intro h1{font-size:25px}.plans-footer{grid-template-columns:1fr}.trust-note,.footer-note,.continue-button{grid-column:1;grid-row:auto}.continue-button{width:100%;margin-top:3px}}
/* Compact desktop composition keeps every action within a standard viewport. */
.plans-shell{height:100vh;height:100dvh;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 24px 18px;scrollbar-width:none}.plans-shell::-webkit-scrollbar{display:none}.plans-page{width:min(1100px,100%)}.plans-header{height:44px}.plans-logo{width:88px;height:40px}.plans-intro{padding:14px 0 19px}.plans-intro h1{margin:7px 0 5px;font-size:clamp(23px,2.7vw,31px)}.plans-intro p{font-size:11px;line-height:1.55}.plan-grid{gap:13px}.plan-card{min-height:365px;padding:17px 17px 14px;border-radius:15px}.plan-card.selected{padding:16px 16px 13px}.plan-icon{width:37px;height:37px;border-radius:11px}.plan-name{margin-top:11px;font-size:16px}.plan-description{min-height:29px;margin-top:3px;font-size:9px}.plan-price{margin-top:10px}.plan-price strong{font-size:24px}.plan-divider{margin:12px 0 10px}.feature-heading{margin-bottom:6px;font-size:8px}.plan-feature{gap:6px;margin:4px 0;font-size:9px;line-height:1.35}.select-indicator{padding-top:10px;font-size:9px}.plans-footer{grid-template-columns:1fr 1fr auto;gap:10px;margin-top:14px;padding:10px 14px;border-radius:12px}.trust-note{font-size:9px}.footer-note{font-size:8px}.continue-button{min-height:38px;padding:0 14px;font-size:10px}
@media(max-height:760px) and (min-width:801px){.plans-shell{padding-top:9px;padding-bottom:10px}.plans-header{height:37px}.plans-logo{width:78px;height:35px}.plans-intro{padding:8px 0 12px}.plans-intro h1{font-size:25px}.plan-card{min-height:340px;padding-top:14px}.plan-card.selected{padding-top:13px}.plan-price{margin-top:7px}.plan-divider{margin:9px 0 8px}.plan-feature{margin:3px 0}.plans-footer{margin-top:10px;padding:8px 12px}}
@media(max-width:800px){.plans-shell{height:auto;min-height:100vh;min-height:100dvh;padding:22px 16px 30px}.plans-header{height:46px}.plans-intro{padding:18px 0 23px}.plans-intro h1{font-size:clamp(23px,5vw,29px)}.plan-grid{grid-template-columns:1fr;max-width:480px;gap:13px;margin:auto}.plan-card{min-height:0;padding:17px}.plan-card.selected{padding:16px}.plan-price{margin-top:10px}.plan-divider{margin:12px 0 10px}.plan-feature{font-size:10px}.select-indicator{padding-top:12px}.plans-footer{grid-template-columns:1fr auto;margin-top:15px;padding:12px}.trust-note{grid-column:1}.footer-note{grid-column:1;grid-row:2;text-align:left}.continue-button{grid-column:2;grid-row:1/3}.language-control{top:14px;right:14px}}
@media(max-width:480px){.plans-shell{padding:68px 13px 20px}.plans-header{height:42px}.plans-logo{width:82px;height:38px}.plans-intro{padding:16px 0 19px}.plans-intro h1{font-size:24px}.plans-footer{grid-template-columns:1fr}.trust-note,.footer-note,.continue-button{grid-column:1;grid-row:auto}.continue-button{width:100%;margin-top:3px}}
/* Larger typography and a centered, more substantial plan comparison. */
.plans-shell{display:flex;flex-direction:column;justify-content:center;padding:20px 28px;scrollbar-width:none}.plans-page{width:min(1240px,100%);margin-block:auto}.plans-header{height:52px}.plans-logo{width:102px;height:48px}.plans-intro{padding:24px 0 26px}.plans-eyebrow{font-size:11px}.plans-intro h1{margin:10px 0 8px;font-size:clamp(29px,3vw,38px)}.plans-intro p{max-width:660px;font-size:13px}.plan-grid{gap:18px}.plan-card{min-height:435px;padding:24px 23px 20px;border-radius:18px}.plan-card.selected{padding:23px 22px 19px}.plan-icon{width:47px;height:47px;border-radius:14px}.plan-name{margin-top:15px;font-size:20px}.plan-description{min-height:40px;margin-top:5px;font-size:11px}.plan-price{margin-top:14px}.plan-price strong{font-size:32px}.plan-price small{font-size:11px}.plan-divider{margin:17px 0 13px}.feature-heading{margin-bottom:9px;font-size:9px}.plan-feature{gap:8px;margin:7px 0;font-size:11px;line-height:1.45}.plan-feature svg{width:17px;height:17px}.select-indicator{gap:9px;padding-top:15px;font-size:11px}.select-indicator>span,.select-indicator>svg{width:20px;height:20px}.popular-tag{right:18px;padding:6px 11px;font-size:9px}.plans-footer{margin-top:18px;padding:13px 17px}.trust-note{font-size:10px}.footer-note{font-size:9px}.continue-button{min-height:44px;padding:0 19px;font-size:11px}
@media(max-height:820px) and (min-width:801px){.plans-shell{padding-top:12px;padding-bottom:12px}.plans-page{margin-block:auto}.plans-header{height:44px}.plans-intro{padding:15px 0 18px}.plans-intro h1{font-size:clamp(27px,2.6vw,34px)}.plan-card{min-height:405px;padding-top:19px;padding-bottom:17px}.plan-card.selected{padding-top:18px;padding-bottom:16px}.plan-feature{margin:5px 0}.plans-footer{margin-top:13px;padding:10px 15px}}
@media(max-width:800px){.plans-shell{display:block;justify-content:initial;padding:22px 16px 30px}.plans-page{width:min(560px,100%);margin:0 auto}.plans-header{height:46px}.plans-intro{padding:20px 0 24px}.plans-intro h1{font-size:clamp(26px,5vw,32px)}.plan-grid{grid-template-columns:1fr;max-width:520px;gap:14px}.plan-card{min-height:0;padding:20px}.plan-card.selected{padding:19px}.plan-name{font-size:19px}.plan-description{min-height:0;font-size:11px}.plan-feature{font-size:11px}.plans-footer{grid-template-columns:1fr auto;margin-top:16px;padding:13px}.trust-note{grid-column:1}.footer-note{grid-column:1;grid-row:2;text-align:left}.continue-button{grid-column:2;grid-row:1/3}.language-control{top:14px;right:14px}}
@media(max-width:480px){.plans-shell{padding:68px 13px 20px}.plans-header{height:42px}.plans-logo{width:82px;height:38px}.plans-intro{padding:17px 0 20px}.plans-intro h1{font-size:25px}.plans-footer{grid-template-columns:1fr}.trust-note,.footer-note,.continue-button{grid-column:1;grid-row:auto}.continue-button{width:100%;margin-top:3px}}
</style>
