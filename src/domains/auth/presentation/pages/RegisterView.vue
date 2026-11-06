<script setup>
import { useI18n } from 'vue-i18n'
import HeaderRegister from '../../../../shared/ui/login/components/HeaderRegister.component.vue'
import RegisterForm from '../../../../shared/ui/login/forms/RegisterForm.component.vue'

const { t } = useI18n()
const assetBase = import.meta.env.BASE_URL
</script>

<template>
  <main class="auth-shell">
    <div class="language-control"><HeaderRegister /></div>
    <section class="auth-frame" aria-label="PayID">
      <aside class="visual-panel">
        <video class="auth-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
          <source :src="`${assetBase}videos/payid-auth-background.mp4`" type="video/mp4" />
        </video>
        <div class="image-placeholder" aria-hidden="true"></div>
        <div class="visual-copy">
          <p class="eyebrow">{{ t('brand.tagline') }}</p>
          <h2>Tu vida digital<br />empieza aqu&iacute;.</h2>
          <div class="slider-dots" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
      </aside>

      <section class="form-panel register-panel">
        <div class="form-content">
          <h1>{{ t('register.title') }}</h1>
          <p class="intro">{{ t('register.subtitle') }}</p>
          <RegisterForm />
          <p class="switch-copy">
            {{ t('layout.footer_have_account') }}
            <router-link :to="{ name: 'login' }">{{ t('layout.footer_link_login') }}</router-link>
          </p>
          <p class="form-legal">Tus datos se mantienen protegidos y bajo tu control.</p>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.auth-shell { min-height:100vh; min-height:100dvh; display:grid; place-items:center; padding:24px; position:relative; overflow:hidden; background:#1f2523; color:#1f2523; font-family:'Poppins',sans-serif; }
.language-control { position:absolute; top:22px; right:24px; z-index:2; }
.auth-frame { position:relative; width:min(1160px,100%); height:min(820px,calc(100dvh - 48px)); min-height:0; margin:auto; display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,460px); grid-template-rows:minmax(0,1fr); align-items:stretch; overflow:hidden; border-radius:30px; background:#f7f3ec; box-shadow:0 40px 90px rgba(15,22,18,.45); }
.visual-panel { position:relative; display:flex; flex-direction:column; justify-content:flex-end; min-width:0; min-height:0; padding:40px; overflow:hidden; border:5px solid #f7f3ec; border-radius:26px; background:#1f2523; color:#fff; }
.auth-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.visual-brand,.form-brand { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:10px; font-size:20px; font-weight:600; }
.visual-brand { position:absolute; top:40px; left:40px; justify-content:flex-start; color:#fff; font-size:18px; }
.brand-mark { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:#2e4a3a; color:#fff; font-size:16px; font-weight:700; }
.visual-brand .brand-mark { background:#fff; color:#2e4a3a; }
.image-placeholder { position:absolute; inset:0; background:linear-gradient(180deg,rgba(31,37,35,.12),rgba(20,28,24,.62)); }
.visual-copy { position:relative; z-index:1; display:flex; flex-direction:column; gap:12px; max-width:420px; padding:0 4px 4px; }
.eyebrow { margin:0; color:#a7e0c4; font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
.visual-copy h2 { min-height:0; margin:0; padding-bottom:.12em; color:#fff; font-size:clamp(22px,2.1vw,26px); font-weight:600; line-height:1.35; text-shadow:0 2px 14px rgba(0,0,0,.22); overflow-wrap:break-word; }
.slider-dots { display:flex; gap:8px; margin-top:8px; }.slider-dots i { display:block; width:24px; height:4px; border-radius:999px; background:rgba(255,255,255,.35); }.slider-dots i:first-child { background:#c15a2e; }
.form-panel { display:grid; grid-template-rows:minmax(0,1fr); min-width:0; min-height:0; place-items:center; padding:32px 40px; background:#fff; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; }
.register-panel { place-items:start center; padding-top:28px; padding-bottom:28px; scrollbar-width:none; }
.register-panel::-webkit-scrollbar,.auth-shell::-webkit-scrollbar { display:none; }
.register-panel { -ms-overflow-style:none; }
.form-content { display:flex; flex-direction:column; gap:14px; width:min(100%,460px); min-width:0; }
h1 { margin:0; color:#1f2523; text-align:center; font-size:22px; font-weight:600; line-height:1.3; }
.intro { margin:0; color:#828282; text-align:center; font-size:14px; line-height:1.5; }
.switch-copy { margin:0; color:#6f6a62; text-align:center; font-size:13px; }.switch-copy a { margin-left:4px; color:#2e4a3a; font-weight:600; text-decoration:none; }.switch-copy a:hover { text-decoration:underline; }.form-legal { display:none; }
@media(max-width:960px) { .auth-shell { display:block; min-height:100vh; min-height:100dvh; padding:76px 16px 16px; overflow-x:hidden; overflow-y:auto; scrollbar-width:none; -ms-overflow-style:none; }.auth-frame { width:min(560px,100%); height:auto; min-height:calc(100dvh - 92px); margin:0 auto; grid-template-columns:minmax(0,1fr); grid-template-rows:auto; overflow:visible; }.visual-panel { display:none; }.form-panel,.register-panel { display:block; min-height:calc(100dvh - 92px); height:auto; padding:32px 24px; overflow:visible; }.form-content { margin:0 auto; } }
@media(max-width:560px) { .auth-shell { padding:76px 12px 12px; }.auth-frame { min-height:calc(100dvh - 88px); border-radius:22px; }.form-panel,.register-panel { min-height:calc(100dvh - 88px); padding:28px 18px; }.language-control { top:18px; right:18px; } }
</style>
