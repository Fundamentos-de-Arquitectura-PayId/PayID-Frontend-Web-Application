import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'

const saved = localStorage.getItem('kapakid:locale') || 'en'

const i18n = createI18n({
    legacy: false,
    locale: saved,
    fallbackLocale: 'en',
    datetimeFormats: {},
    numberFormats: {},
    messages: { en, es }
})

export function setLocale(l) {
    i18n.global.locale.value = l
    localStorage.setItem('kapakid:locale', l)
    document.documentElement.setAttribute('lang', l)
}

export default i18n