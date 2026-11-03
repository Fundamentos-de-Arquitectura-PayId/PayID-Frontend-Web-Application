<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loginUseCase } from '../../../../domains/auth/application/usecases/login.usecase.js'

const router   = useRouter()
const { t }    = useI18n()

const email    = ref('')
const password = ref('')
const loading  = ref(false)

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
  else if (!/^\S+@\S+\.\S+$/.test(e)) { errors.email = t('errors.email_invalid'); ok = false }

  if (!p) { errors.password = t('errors.password_required'); ok = false }

  return ok
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
    else if (code === 'INVALID_PASSWORD') errors.password = t('errors.invalid_password')
    else errors.general = t('errors.unexpected')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit" novalidate>
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
          :aria-invalid="!!errors.password"
          :aria-errormessage="errors.password ? 'err-pass' : undefined"
      />
      <p v-if="errors.password" id="err-pass" class="error">{{ errors.password }}</p>
    </div>

    <button class="primary-btn" type="submit" :disabled="loading">
      {{ loading ? t('login.signing_in') : t('login.sign_in') }}
    </button>

    <p v-if="errors.general" class="error mt-2">{{ errors.general }}</p>
  </form>
</template>

<style scoped>
.form{ display:grid; gap:18px; }
.field{ display:grid; gap:8px; }
.label{ font-size:15px; color:#596080; font-weight:800; }
.input{
  background:#f5f7fd; border:1px solid #e3e8f5; color:#1b2559;
  border-radius:14px; padding:14px 16px; outline:none; width:100%;
  font-size:16px; transition: box-shadow .2s, border-color .2s;
}
.input:focus{ border-color:#4253ff; box-shadow:0 0 0 4px rgba(66,83,255,.12); }
.is-invalid{ border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.12) !important; }
.primary-btn{
  margin-top:4px; width:100%; background:#0e1329; color:#fff;
  border:none; border-radius:14px; padding:16px 18px; font-weight:900;
  cursor:pointer; font-size:16px; box-shadow:0 18px 36px rgba(14,19,41,.18);
}
.primary-btn[disabled]{ opacity:.6; cursor:not-allowed; }
.error{ color:#dc2626; font-weight:700; font-size:13.5px; }
.mt-2{ margin-top:8px; }
.mb-3{ margin-bottom:12px; }
</style>