<script setup>
import { useI18n } from 'vue-i18n'
import HeaderLogin from '../../../../shared/ui/login/components/HeaderLogin.component.vue'
import LoginForm from '../../../../shared/ui/login/forms/LoginForm.component.vue'
import { ref } from 'vue'
import { sendPasswordReset } from '../../infrastructure/persistence/supabase-session.js'

const { t } = useI18n()
const assetBase = import.meta.env.BASE_URL
const forgotOpen = ref(false)
const resetEmail = ref('')
const resetMessage = ref('')
const resetError = ref('')
const sendingReset = ref(false)

async function requestPasswordReset() {
  resetMessage.value = ''
  resetError.value = ''
  if (!/^\S+@\S+\.\S+$/.test(resetEmail.value.trim())) {
    resetError.value = 'Escribe un correo válido para enviarte el enlace.'
    return
  }
  sendingReset.value = true
  try {
    await sendPasswordReset(resetEmail.value)
    resetMessage.value = 'Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.'
  } catch (error) {
    resetError.value = error.message === 'SUPABASE_NOT_CONFIGURED' ? 'Falta configurar Supabase.' : 'No pudimos enviar el enlace. Inténtalo de nuevo.'
  } finally {
    sendingReset.value = false
  }
}
</script>

<template>
  <main class="auth-shell" :style="{ '--auth-backdrop': `url('${assetBase}images/payid-auth-background.png')` }">
    <div class="language-control"><HeaderLogin /></div>
    <section class="auth-frame" aria-label="PayID">
      <aside class="visual-panel">
        <video class="auth-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
          <source :src="`${assetBase}videos/payid-auth-background.mp4`" type="video/mp4" />
        </video>
        <div class="image-placeholder" aria-label="Espacio reservado para imagen de PayID"></div>
        <div class="visual-copy">
          <p class="eyebrow">{{ t('brand.tagline') }}</p>
          <h2>Todo lo que necesitas,<br />en un solo lugar.</h2>
          <div class="slider-dots" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
      </aside>

      <section class="form-panel">
        <div class="form-content">
          <div class="form-brand"><img class="brand-logo" :src="`${assetBase}images/payid-logo.png`" alt="PayID" /></div>
          <h1>{{ t('login.title') }}</h1>
          <p class="intro">{{ t('login.subtitle') }}</p>
          <LoginForm />
          <div class="forgot-row"><button type="button" @click="forgotOpen = !forgotOpen; resetMessage = ''; resetError = ''">{{ t('layout.forgot') }}</button></div>
          <form v-if="forgotOpen" class="reset-form" @submit.prevent="requestPasswordReset">
            <label for="reset-email">Correo de tu cuenta</label>
            <div class="reset-controls"><input id="reset-email" v-model.trim="resetEmail" type="email" autocomplete="email" placeholder="you@email.com" /><button type="submit" :disabled="sendingReset">{{ sendingReset ? 'Enviando…' : 'Enviar enlace' }}</button></div>
            <p v-if="resetMessage" class="reset-success" role="status">{{ resetMessage }}</p>
            <p v-if="resetError" class="reset-error" role="alert">{{ resetError }}</p>
          </form>
          <p class="switch-copy">
            {{ t('layout.footer_cta') }}
            <router-link :to="{ name: 'register' }">{{ t('layout.footer_link_register') }}</router-link>
          </p>
          <div class="social-divider" aria-hidden="true"><span></span><small>or login with</small><span></span></div>
          <div class="social-options" aria-label="Social login options">
            <div class="social-option" aria-label="Facebook"><svg class="facebook-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.02 4.388 11.016 10.125 11.88v-8.398H7.078v-3.482h3.047V9.418c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.955.93-1.955 1.885v2.26h3.328l-.532 3.483h-2.796v8.398C19.612 23.089 24 18.093 24 12.073Z"/></svg><span>Facebook</span></div>
            <div class="social-option" aria-label="Google"><svg class="google-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg><span>Google</span></div>
            <div class="social-option" aria-label="Apple"><svg class="apple-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 1.43c0 1.14-.42 2.2-1.25 3.16-.99 1.13-2.18 1.78-3.46 1.67a3.55 3.55 0 0 1-.03-.43c0-1.1.48-2.28 1.33-3.23.42-.48.95-.88 1.57-1.2.62-.31 1.21-.48 1.76-.5.05.18.08.36.08.53Zm4.76 15.83c-.39.9-.85 1.73-1.39 2.49-.73 1.03-1.33 1.74-1.8 2.13-.73.67-1.51 1.02-2.35 1.04-.6 0-1.32-.17-2.15-.51-.83-.34-1.59-.51-2.29-.51-.73 0-1.51.17-2.32.51-.82.34-1.48.53-1.99.55-.81.03-1.61-.33-2.4-1.08-.5-.42-1.13-1.16-1.89-2.2a15.77 15.77 0 0 1-2-3.96c-.7-1.86-1.05-3.66-1.05-5.4 0-2 .43-3.72 1.31-5.16a7.53 7.53 0 0 1 2.4-2.48 6.5 6.5 0 0 1 3.29-.94c.65 0 1.51.2 2.6.6 1.08.4 1.78.6 2.08.6.22 0 .99-.23 2.3-.7 1.23-.44 2.27-.62 3.12-.55 2.3.18 4.03 1.09 5.17 2.75-2.06 1.25-3.08 3-3.06 5.24.02 1.75.65 3.2 1.88 4.34.56.53 1.18.94 1.87 1.23-.15.43-.31.85-.49 1.26Z"/></svg><span>Apple</span></div>
          </div>
          <p class="form-legal">Al continuar, proteges tu cuenta con acceso seguro.</p>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.auth-shell { min-height:100vh; min-height:100dvh; display:grid; place-items:center; padding:24px; position:relative; overflow:hidden; background:linear-gradient(rgba(17,35,27,.78),rgba(17,35,27,.88)),var(--auth-backdrop) center/cover no-repeat,#1f2523; color:#1f2523; font-family:'Poppins',sans-serif; }
.language-control { position:absolute; top:22px; right:24px; z-index:2; }
.auth-frame { position:relative; width:min(1160px,100%); height:min(820px,calc(100dvh - 48px)); min-height:0; margin:auto; display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,460px); grid-template-rows:minmax(0,1fr); align-items:stretch; overflow:hidden; border-radius:30px; background:#f7f3ec; box-shadow:0 40px 90px rgba(15,22,18,.45); }
.visual-panel { position:relative; display:flex; flex-direction:column; justify-content:flex-end; min-width:0; min-height:0; padding:40px; overflow:hidden; border:5px solid #f7f3ec; border-radius:26px; background:#1f2523; color:#fff; }
.auth-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.visual-brand,.form-brand { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:10px; font-size:20px; font-weight:600; }
.visual-brand { position:absolute; top:40px; left:40px; justify-content:flex-start; color:#fff; font-size:18px; }
.brand-mark { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:#2e4a3a; color:#fff; font-size:16px; font-weight:700; }
.visual-brand .brand-mark { background:#fff; color:#2e4a3a; }
.image-placeholder { position:absolute; inset:0; background:linear-gradient(180deg,rgba(31,37,35,.12),rgba(20,28,24,.62)); }
.visual-copy { position:relative; z-index:1; display:flex; flex-direction:column; gap:10px; max-width:420px; }
.eyebrow { margin:0; color:#a7e0c4; font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
.visual-copy h2 { min-height:2.6em; margin:0; font-size:26px; font-weight:600; line-height:1.3; }
.slider-dots { display:flex; gap:8px; margin-top:8px; }.slider-dots i { display:block; width:24px; height:4px; border-radius:999px; background:rgba(255,255,255,.35); }.slider-dots i:first-child { background:#c15a2e; }
.form-panel { display:grid; grid-template-rows:minmax(0,1fr); min-width:0; min-height:0; place-items:center; padding:40px 36px; background:#fff; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; }
.form-content { display:flex; flex-direction:column; gap:14px; width:min(100%,460px); }
.form-brand { height:auto; margin:0 0 4px; overflow:visible; }
.brand-logo { display:block; width:96px; height:96px; max-width:100%; object-fit:contain; }
h1 { margin:0; color:#1f2523; text-align:center; font-size:22px; font-weight:600; line-height:1.3; }
.intro { margin:0; color:#828282; text-align:center; font-size:14px; line-height:1.5; }
.forgot-row { margin-top:-8px; text-align:right; font-size:13px; }.forgot-row button { padding:0; border:0; background:transparent; color:#2e4a3a; font:inherit; font-weight:600; cursor:pointer; }.forgot-row button:hover,.switch-copy a:hover { text-decoration:underline; }.switch-copy a { color:#2e4a3a; font-weight:600; text-decoration:none; }
.reset-form{display:grid;gap:7px;padding:12px;border:1px solid #e5ebe6;border-radius:11px;background:#f8faf8;color:#526158;font-size:12px}.reset-controls{display:flex;gap:8px}.reset-controls input{min-width:0;flex:1;padding:9px 11px;border:1px solid #dce4dd;border-radius:8px;font:inherit}.reset-controls button{padding:0 12px;border:0;border-radius:8px;background:#355644;color:white;font:inherit;font-weight:600;cursor:pointer}.reset-controls button:disabled{opacity:.65;cursor:wait}.reset-success,.reset-error{margin:0;line-height:1.45}.reset-success{color:#356947}.reset-error{color:#b42318}
.switch-copy { margin:14px 0 0; color:#6f6a62; text-align:center; font-size:13px; }.switch-copy a { margin-left:4px; }.form-legal { display:none; }
.social-divider { display:flex; align-items:center; gap:10px; margin-top:2px; color:#858a86; }
.social-divider span { height:1px; flex:1; background:#e6e8e5; }
.social-divider small { font-size:11px; white-space:nowrap; }
.social-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.social-option { display:flex; align-items:center; justify-content:center; gap:8px; min-width:0; height:42px; border:1px solid #e4e6e3; border-radius:9px; background:#fff; color:#303a34; font-size:12px; font-weight:500; box-shadow:0 1px 2px rgba(25,45,37,.04); transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease,background-color .2s ease; cursor:default; }
.social-option:hover { transform:translateY(-2px); border-color:#b9c9be; background:#fcfdfc; box-shadow:0 5px 12px rgba(35,72,50,.12); }
.social-option:focus-visible { outline:3px solid rgba(82,123,100,.22); outline-offset:2px; }
.social-option svg { display:block; width:16px; height:16px; flex:0 0 auto; }
.social-option .facebook-logo { color:#1877f2; width:15px; height:15px; }
.social-option .apple-logo { width:15px; height:15px; color:#111; }
@media(prefers-reduced-motion:reduce){.social-option{transition:none}}
@media(max-width:960px) { .auth-shell { display:block; min-height:100vh; min-height:100dvh; padding:76px 16px 16px; overflow-x:hidden; overflow-y:auto; }.auth-frame { width:min(560px,100%); height:auto; min-height:calc(100dvh - 92px); margin:0 auto; grid-template-columns:minmax(0,1fr); grid-template-rows:auto; overflow:visible; }.visual-panel { display:none; }.form-panel { display:grid; min-height:calc(100dvh - 92px); height:auto; padding:36px 24px; overflow:visible; }.language-control { top:18px; right:18px; } }
@media(max-width:560px) { .auth-shell { padding:76px 12px 12px; }.auth-frame { min-height:calc(100dvh - 88px); align-items:center; border-radius:22px; }.form-panel { min-height:calc(100dvh - 88px); padding:34px 22px; }.language-control { top:18px; right:18px; } }
</style>
