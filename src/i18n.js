import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'

const storedLocale = localStorage.getItem('kapakid:locale')
const saved = storedLocale === 'es' || storedLocale === 'en' ? storedLocale : 'en'
document.documentElement.setAttribute('lang', saved)

const i18n = createI18n({
    legacy: false,
    locale: saved,
    fallbackLocale: 'en',
    messages: {
        en,
        es
    },
    sync: true,
    silentTranslationWarn: true,
    missingWarn: false,
    fallbackWarn: false
})

export function setLocale(l) {
    i18n.global.locale.value = l
    localStorage.setItem('kapakid:locale', l)
    document.documentElement.setAttribute('lang', l)
    window.dispatchEvent(new CustomEvent('payid:locale-changed', { detail: { locale: l } }))
}

export default i18n
