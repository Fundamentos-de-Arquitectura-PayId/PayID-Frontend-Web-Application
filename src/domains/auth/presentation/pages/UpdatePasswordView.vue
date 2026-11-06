<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-vue-next'
import { updateSupabasePassword } from '../../infrastructure/persistence/supabase-session.js'

const router = useRouter()
const assetBase = import.meta.env.BASE_URL
const password = ref('')
const confirmation = ref('')
const showPassword = ref(false)
const showConfirmation = ref(false)
const loading = ref(false)
const success = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (password.value.length < 8) { error.value = 'La contraseña debe tener al menos 8 caracteres.'; return }
  if (password.value !== confirmation.value) { error.value = 'Las contraseñas no coinciden.'; return }
  loading.value = true
  try {
    await updateSupabasePassword(password.value)
    success.value = true
    window.setTimeout(() => router.replace({ name: 'login' }), 1800)
  } catch (cause) {
    error.value = cause.message === 'SUPABASE_NOT_CONFIGURED' ? 'Falta configurar Supabase.' : 'El enlace venció o ya fue utilizado. Solicita uno nuevo desde el inicio de sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="password-reset-page">
    <section class="password-reset-card">
      <img class="reset-logo" :src="`${assetBase}images/payid-logo.png`" alt="PayID" />
      <span class="reset-icon"><ShieldCheck v-if="success" :size="23" /><LockKeyhole v-else :size="23" /></span>
      <h1>{{ success ? 'Contraseña actualizada' : 'Crea una nueva contraseña' }}</h1>
      <p v-if="success" class="reset-copy">Tu contraseña se guardó. Te llevaremos al inicio de sesión.</p>
      <template v-else>
        <p class="reset-copy">Elige una contraseña segura de al menos 8 caracteres.</p>
        <form class="reset-password-form" @submit.prevent="submit">
          <label for="new-password">Nueva contraseña</label>
          <div class="password-field"><input id="new-password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="8" required /><button type="button" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div>
          <label for="confirm-password">Confirmar contraseña</label>
          <div class="password-field"><input id="confirm-password" v-model="confirmation" :type="showConfirmation ? 'text' : 'password'" autocomplete="new-password" required /><button type="button" :aria-label="showConfirmation ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showConfirmation = !showConfirmation"><EyeOff v-if="showConfirmation" :size="17" /><Eye v-else :size="17" /></button></div>
          <p v-if="error" class="reset-error" role="alert">{{ error }}</p>
          <button class="save-password" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="17" /><span>{{ loading ? 'Guardando…' : 'Guardar contraseña' }}</span></button>
        </form>
        <button class="back-to-login" type="button" @click="router.push({ name: 'login' })"><ArrowLeft :size="15" /> Volver al inicio de sesión</button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.password-reset-page{display:grid;min-height:100vh;min-height:100dvh;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 0,#eff5f0,#f4f6f5 55%,#e8ede9);font-family:'Poppins',system-ui,sans-serif;color:#25382d}.password-reset-card{display:flex;width:min(100%,460px);flex-direction:column;align-items:center;padding:38px 42px;border:1px solid #e5ebe6;border-radius:22px;background:#fff;box-shadow:0 20px 60px rgba(30,57,40,.1)}.reset-logo{width:82px;height:82px;object-fit:contain;margin-bottom:16px}.reset-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:14px;background:#edf5ef;color:#37664a}.password-reset-card h1{margin:17px 0 0;font-size:21px;font-weight:650;text-align:center}.reset-copy{margin:8px 0 22px;color:#77827b;font-size:13px;line-height:1.6;text-align:center}.reset-password-form{display:grid;width:100%;gap:9px}.reset-password-form label{margin-top:5px;color:#35483c;font-size:12px;font-weight:600}.password-field{display:flex;align-items:center;border:1px solid #dfe6e0;border-radius:10px;background:#fff}.password-field:focus-within{border-color:#688873;box-shadow:0 0 0 3px rgba(82,123,100,.1)}.password-field input{width:100%;min-width:0;padding:12px;border:0;outline:0;background:transparent;font:inherit;font-size:14px}.password-field button{display:grid;width:40px;height:42px;flex:none;place-items:center;border:0;background:transparent;color:#718078;cursor:pointer}.reset-error{margin:4px 0;color:#c13d35;font-size:12px}.save-password{display:flex;align-items:center;justify-content:center;gap:9px;min-height:46px;margin-top:8px;border:0;border-radius:10px;background:#355644;color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.save-password:disabled{opacity:.7;cursor:wait}.back-to-login{display:flex;align-items:center;gap:7px;margin-top:20px;border:0;background:transparent;color:#476451;font:inherit;font-size:12px;font-weight:600;cursor:pointer}.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:520px){.password-reset-card{padding:32px 22px}.password-reset-card h1{font-size:19px}}
</style>
