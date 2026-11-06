<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, LoaderCircle } from 'lucide-vue-next'
import { loginUseCase } from '../../../../domains/auth/application/usecases/login.usecase.js'

const router   = useRouter()
const route    = useRoute()
const { t }    = useI18n()

const email    = ref('')
const password = ref('')
const loading  = ref(false)

onMounted(() => {
  if (typeof route.query.email === 'string') email.value = route.query.email
})

const errors = reactive({
  email: '',
  password: '',
  general: '',
})

function resetErrors() {
  errors.email = ''
  errors.password = ''
  errors.general = ''
}

function validate() {
  resetErrors()
  let ok = true

  const e = String(email.value || '').trim()
  const p = String(password.value || '')

  if (!e) { errors.email = t('errors.email_required'); ok = false }
  else if (e.includes('@') ? !/^\S+@\S+\.\S+$/.test(e) : !isValidPhone(e)) { errors.email = t('errors.email_invalid'); ok = false }

  if (!p) { errors.password = t('errors.password_required'); ok = false }
  else if (p.length < 8) { errors.password = t('errors.password_min'); ok = false }

  return ok
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, '')
  return /^9\d{8}$/.test(digits) || /^519\d{8}$/.test(digits)
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    const ok = await loginUseCase({ email: email.value, password: password.value })
    if (ok) router.push({ name: 'home' })
  } catch (e) {
    const code = String(e?.message || '')
    if (code === 'EMAIL_NOT_FOUND') errors.email = t('errors.email_not_found')
    else if (code === 'INVALID_PASSWORD' || code === 'INVALID_CREDENTIALS') errors.password = t('errors.invalid_password')
    else if (code === 'ACCOUNT_LOCKED') errors.general = 'Tu cuenta está bloqueada temporalmente por varios intentos fallidos.'
    else if (code === 'EMAIL_NOT_CONFIRMED') errors.general = 'Esta cuenta sigue sin verificar. Confírmala en Supabase → Authentication → Users o elimina la cuenta de prueba y regístrala otra vez.'
    else if (code === 'SUPABASE_NOT_CONFIGURED') errors.general = 'Falta configurar las variables de Supabase para iniciar sesión.'
    else errors.general = t('errors.unexpected')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="form" :class="{ 'has-errors': errors.email || errors.password || errors.general }" @submit.prevent="onSubmit" novalidate>
    <div class="mb-3 field">
      <label class="label" for="email">{{ t('login.email_label') }}</label>
      <input
          id="email"
          v-model.trim="email"
      type="text"
          class="input"
          :class="{ 'is-invalid': errors.email }"
          :placeholder="t('login.email_ph')"
          autocomplete="username"
          :aria-invalid="!!errors.email"
          :aria-errormessage="errors.email ? 'err-email' : undefined"
          @input="errors.email = ''"
      />
      <p v-if="errors.email" id="err-email" class="error">{{ errors.email }}</p>
    </div>

    <div class="mb-3 field">
      <label class="label" for="pass">{{ t('login.password_label') }}</label>
      <input
          id="pass"
          v-model="password"
          type="password"
          class="input"
          :class="{ 'is-invalid': errors.password }"
          autocomplete="current-password"
          :placeholder="t('register.password_ph')"
          :aria-invalid="!!errors.password"
          :aria-errormessage="errors.password ? 'err-pass' : undefined"
          @input="errors.password = ''"
      />
      <p v-if="errors.password" id="err-pass" class="error">{{ errors.password }}</p>
    </div>

    <button class="primary-btn" type="submit" :disabled="loading">
      <span class="button-shine" aria-hidden="true"></span>
      <span class="button-content">
        <component :is="loading ? LoaderCircle : ArrowRight" class="button-icon" :class="{ spinning: loading }" :size="18" :stroke-width="2.4" aria-hidden="true" />
        {{ loading ? t('login.signing_in') : t('login.sign_in') }}
      </span>
    </button>

    <p v-if="errors.general" class="error mt-2">{{ errors.general }}</p>
  </form>
</template>

<style scoped>
.form{ display:grid; gap:20px; }
.field{ display:grid; gap:4px; }
.form.has-errors{row-gap:8px}
.form.has-errors .mb-3{margin-bottom:0}
.label{ font-size:14px; color:#243b31; font-weight:600; letter-spacing:.01em; }
.input{
  background:#fff; border:1px solid #e5e3dd; color:#192d25;
  border-radius:11px; padding:12px 15px; outline:none; width:100%;
  font:inherit;font-size:14px; box-shadow:0 1px 3px rgba(29,48,41,.025);
  transition: box-shadow .2s ease, border-color .2s ease, background .2s ease;
}
.input::placeholder{color:#aaa9a3}.input:hover:not(:focus){border-color:#c8d0ca;box-shadow:0 2px 7px rgba(29,48,41,.05)}
.input:focus{ border-color:#62806d; background:#fff; box-shadow:0 0 0 3px rgba(82,123,100,.11),0 3px 10px rgba(47,83,62,.06); }
.is-invalid{ border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.12) !important; }
.primary-btn{
  position:relative; isolation:isolate; overflow:hidden; display:flex; align-items:center; justify-content:center;
  margin-top:4px; width:100%; min-height:48px; background:#355644; color:#fff;
  border:1px solid transparent; border-radius:10px; padding:12px 18px; font-weight:600;
  box-shadow:0 2px 5px rgba(37,69,50,.12);
  cursor:pointer; font-size:14px; transition:box-shadow .22s ease,transform .22s ease,background .22s ease;
}
.button-shine{position:absolute;z-index:-1;top:-60%;bottom:-60%;left:-55%;width:42%;transform:skewX(-24deg);background:linear-gradient(90deg,transparent,rgba(192,224,201,.12),rgba(222,244,227,.38),rgba(192,224,201,.12),transparent);opacity:0;pointer-events:none}
.button-content{display:inline-flex;align-items:center;justify-content:center;gap:9px}
.button-icon{transition:transform .25s ease}.primary-btn:hover:not(:disabled) .button-icon{transform:translateX(3px)}
.primary-btn:hover:not(:disabled){background:#294735;transform:translateY(-1px);box-shadow:0 5px 12px rgba(37,69,50,.18)}
.primary-btn:hover:not(:disabled) .button-shine,.primary-btn:focus-visible .button-shine,.primary-btn:active:not(:disabled) .button-shine{opacity:1;animation:button-shine .8s cubic-bezier(.2,.65,.3,1) forwards}
.primary-btn:active:not(:disabled){transform:translateY(0) scale(.99);box-shadow:0 4px 10px rgba(37,69,50,.2)}
.primary-btn[disabled]{opacity:.72;cursor:wait}
.spinning{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes button-shine{0%{left:-55%;opacity:0}12%{opacity:1}100%{left:125%;opacity:0}}
@media(prefers-reduced-motion:reduce){.input,.primary-btn,.button-icon{transition:none}.primary-btn:hover:not(:disabled) .button-shine,.primary-btn:focus-visible .button-shine,.primary-btn:active:not(:disabled) .button-shine{animation:none;opacity:0}.spinning{animation:none}}
.error{ color:#dc2626; font-weight:700; font-size:13.5px; }
.mt-2{ margin-top:8px; }
.mb-3{ margin-bottom:12px; }
</style>

