import { createI18n } from 'vue-i18n'

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
        en: {
            login: {
                title: 'KapakID',
                subtitle: 'Access your digital identity',
                email_label: 'Email/Phone',
                email_ph: 'you@email.com',
                password_label: 'Password',
                sign_in: 'Sign in',
                signing_in: 'Signing in…'
            }
        },
        es: {
            login: {
                title: 'KapakID',
                subtitle: 'Accede a tu identidad digital',
                email_label: 'Email/Teléfono',
                email_ph: 'tu@email.com',
                password_label: 'Contraseña',
                sign_in: 'Iniciar sesión',
                signing_in: 'Iniciando sesión...'
            }
        }
    }
})

export function setLocale(l) {
    i18n.global.locale.value = l
    localStorage.setItem('kapakid:locale', l)
    document.documentElement.setAttribute('lang', l)
}

export default i18n