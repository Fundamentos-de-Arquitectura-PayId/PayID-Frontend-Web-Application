import { createApp } from 'vue'
import './style.css'
import './domains/support/support-widget.css'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Material from '@primeuix/themes/material'
import 'primeicons/primeicons.css'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import i18n from './i18n.js'
import { installLegacyTranslations } from './shared/i18n/dom-translation.js'
import { isSupabaseConfigured } from './shared/services/supabase.js'
import { restoreSupabaseSession, subscribeSupabaseSession } from './domains/auth/infrastructure/persistence/supabase-session.js'

if (isSupabaseConfigured) {
  try { await restoreSupabaseSession() }
  catch (error) { console.error('No se pudo restaurar la sesión de Supabase:', error.message) }
}

const app = createApp(App)
  .use(i18n)
  .use(PrimeVue, { ripple: true, theme: { preset: Material } })
  .use(router)
  .component('pv-button', Button)
  .component('pv-card', Card)
  .component('pv-inputText', InputText)
  .component('pv-select-button', SelectButton)

if (isSupabaseConfigured) {
  const stopObservingSupabase = subscribeSupabaseSession()
  window.addEventListener('pagehide', stopObservingSupabase, { once: true })
}
app.mount('#app')
installLegacyTranslations()
