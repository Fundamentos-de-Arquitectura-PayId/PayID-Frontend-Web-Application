<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, LoaderCircle, CalendarDays, ChevronDown, GraduationCap, UsersRound, Check } from 'lucide-vue-next'
import { registerUseCase } from '../../../../domains/auth/application/usecases/register.usecase.js'

const router  = useRouter()
const { t, locale } = useI18n()

const name     = ref('')
const email    = ref('')
const dni      = ref('')
const birthDate = ref('')
const password = ref('')
const confirm  = ref('')
const accept   = ref(false)
const segment = ref('')
const loading  = ref(false)
const calendarOpen = ref(false)
const calendarRef = ref(null)
const monthMenuOpen = ref(false)
const yearMenuOpen = ref(false)
const monthMenuRef = ref(null)
const yearMenuRef = ref(null)
const today = new Date()
const displayedMonth = ref(today.getMonth())
const displayedYear = ref(today.getFullYear() - 18)
const yearOptions = computed(() => Array.from({ length: 101 }, (_, index) => today.getFullYear() - index))
const monthOptions = computed(() => Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date(2024, month, 1)),
})))
const weekdayLabels = computed(() => {
  const weekStartsOn = locale.value.startsWith('en') ? 0 : 1
  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(new Date(2023, 0, 1 + ((index + weekStartsOn) % 7))))
})
const calendarCells = computed(() => {
  const weekStartsOn = locale.value.startsWith('en') ? 0 : 1
  const firstWeekday = new Date(displayedYear.value, displayedMonth.value, 1).getDay()
  const offset = (firstWeekday - weekStartsOn + 7) % 7
  const daysInMonth = new Date(displayedYear.value, displayedMonth.value + 1, 0).getDate()
  return [
    ...Array.from({ length: offset }, (_, index) => ({ key: `blank-${index}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 })),
  ]
})
const birthDateLabel = computed(() => {
  if (!birthDate.value) return ''
  const [year, month, day] = birthDate.value.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(year, month - 1, day, 12))
})
const birthDatePlaceholder = computed(() => locale.value.startsWith('en') ? 'mm/dd/yyyy' : 'dd/mm/aaaa')

const errors = reactive({
  segment: '', name: '', email: '', dni: '', birthDate: '', password: '', confirm: '', accept: '', general: ''
})

function openCalendar() {
  if (birthDate.value) {
    const [year, month] = birthDate.value.split('-').map(Number)
    displayedYear.value = year
    displayedMonth.value = month - 1
  }
  calendarOpen.value = true
}

async function toggleMonthMenu() {
  monthMenuOpen.value = !monthMenuOpen.value
  yearMenuOpen.value = false
  if (monthMenuOpen.value) {
    await nextTick()
    monthMenuRef.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }
}

async function toggleYearMenu() {
  yearMenuOpen.value = !yearMenuOpen.value
  monthMenuOpen.value = false
  if (yearMenuOpen.value) {
    await nextTick()
    yearMenuRef.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' })
  }
}

function chooseBirthDate(day) {
  const month = String(displayedMonth.value + 1).padStart(2, '0')
  const dayOfMonth = String(day).padStart(2, '0')
  birthDate.value = `${displayedYear.value}-${month}-${dayOfMonth}`
  errors.birthDate = ''
  calendarOpen.value = false
}

function isSelectedDay(day) {
  if (!birthDate.value) return false
  const [year, month, selectedDay] = birthDate.value.split('-').map(Number)
  return year === displayedYear.value && month - 1 === displayedMonth.value && selectedDay === day
}

function isFutureDay(day) {
  return new Date(displayedYear.value, displayedMonth.value, day) > new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

function closeCalendarOnOutsideClick(event) {
  if (!calendarRef.value?.contains(event.target)) calendarOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', closeCalendarOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeCalendarOnOutsideClick))

function resetErrors () {
  errors.segment = errors.name = errors.email = errors.dni = errors.birthDate = errors.password = errors.confirm = errors.accept = errors.general = ''
}

function validate () {
  resetErrors()
  let ok = true

  const n = String(name.value || '').trim()
  const e = String(email.value || '').trim()
  const d = String(dni.value || '').trim()
  const p = String(password.value || '')
  const c = String(confirm.value || '')

  if (!segment.value) { errors.segment = t('errors.segment_required'); ok = false }

  if (!n) { errors.name = t('errors.name_required'); ok = false }
  else if (n.length < 2) { errors.name = t('errors.name_full'); ok = false }

  if (!e) { errors.email = t('errors.email_required'); ok = false }
  else if (!/^\S+@\S+\.\S+$/.test(e)) { errors.email = t('errors.email_invalid'); ok = false }

  if (!p) { errors.password = t('errors.password_required'); ok = false }
  else if (p.length < 8) { errors.password = 'La contraseña debe tener al menos 8 caracteres.'; ok = false }

  if (!/^\d{8}$/.test(d)) { errors.dni = 'Ingresa un DNI válido de 8 dígitos.'; ok = false }
  if (!birthDate.value) { errors.birthDate = 'La fecha de nacimiento es obligatoria.'; ok = false }

  if (!c) { errors.confirm = t('errors.confirm_required'); ok = false }
  else if (p !== c) { errors.confirm = t('errors.password_mismatch'); ok = false }

  if (!accept.value) { errors.accept = t('errors.accept_terms'); ok = false }

  return ok
}

async function onSubmit () {
  if (!validate()) return
  loading.value = true
  try {
    const ok = await registerUseCase({
      nombre: name.value,
      email: email.value.trim().toLowerCase(),
      password: password.value,
      dni: dni.value.trim(),
      fechaNacimiento: `${birthDate.value}T00:00:00.000Z`,
      esUniversitario: segment.value === 'student',
      segmento: segment.value,
    })
    if (!ok) { errors.email = t('errors.email_taken'); return }
    const normalizedEmail = email.value.trim().toLowerCase()
    localStorage.setItem(`payid:segment:${normalizedEmail}`, segment.value)
    sessionStorage.setItem('payid:payment:pending', JSON.stringify({ email: normalizedEmail }))
    router.push({ name: 'plan-selection' })
  } catch (e) {
    const code = String(e?.message || '')
    if (code === 'EMAIL_ALREADY_REGISTERED') errors.email = t('errors.email_taken')
    else if (code === 'EMAIL_SIGNUPS_DISABLED') errors.general = locale.value === 'es'
      ? 'El registro de usuarios está desactivado en Supabase. Activa “Allow new users to sign up” y deja “Confirm email” desactivado.'
      : 'New user registration is disabled in Supabase. Turn on “Allow new users to sign up” and leave “Confirm email” off.'
    else if (code === 'EMAIL_RATE_LIMIT') errors.general = locale.value === 'es'
      ? 'Supabase alcanzó el límite de correos de registro. Espera antes de volver a intentarlo y verifica que “Confirm email” esté desactivado.'
      : 'Supabase reached its sign-up email limit. Wait before trying again and make sure “Confirm email” is turned off.'
    else if (code === 'SUPABASE_NOT_CONFIGURED') errors.general = 'Falta configurar las variables de Supabase para crear la cuenta.'
    else errors.general = code || t('errors.unexpected')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit" novalidate>
    <fieldset class="segment-fieldset">
      <legend class="segment-legend">{{ t('register.segment_title') }}</legend>
      <div class="segment-options" role="radiogroup" :aria-label="t('register.segment_title')">
        <label class="segment-card" :class="{ selected: segment === 'student' }">
          <input v-model="segment" type="radio" name="user-segment" value="student" @change="errors.segment = ''" />
          <GraduationCap :size="20" :stroke-width="1.8" aria-hidden="true" />
          <span class="segment-card-copy"><strong>{{ t('register.student_title') }}</strong><small>{{ t('register.student_description') }}</small></span>
          <span class="segment-radio" aria-hidden="true"></span>
        </label>
        <label class="segment-card" :class="{ selected: segment === 'family' }">
          <input v-model="segment" type="radio" name="user-segment" value="family" @change="errors.segment = ''" />
          <UsersRound :size="20" :stroke-width="1.8" aria-hidden="true" />
          <span class="segment-card-copy"><strong>{{ t('register.family_title') }}</strong><small>{{ t('register.family_description') }}</small></span>
          <span class="segment-radio" aria-hidden="true"></span>
        </label>
      </div>
      <p v-if="errors.segment" class="error segment-error">{{ errors.segment }}</p>
    </fieldset>

    <div class="mb-3 field">
      <label class="label" for="name">{{ t('register.full_name') }}</label>
      <input
          id="name"
          v-model.trim="name"
          class="input"
          :class="{ 'is-invalid': errors.name }"
          :placeholder="t('register.name_ph')"
          autocomplete="name"
          :aria-invalid="!!errors.name"
          :aria-errormessage="errors.name ? 'err-name' : undefined"
      />
      <p v-if="errors.name" id="err-name" class="error">{{ errors.name }}</p>
    </div>

    <div class="mb-3 field">
      <label class="label" for="email">{{ t('register.email') }}</label>
      <input
          id="email"
          v-model.trim="email"
          class="input"
          :class="{ 'is-invalid': errors.email }"
          :placeholder="t('register.email_ph')"
          autocomplete="email"
          type="email"
          :aria-invalid="!!errors.email"
          :aria-errormessage="errors.email ? 'err-email' : undefined"
      />
      <p v-if="errors.email" id="err-email" class="error">{{ errors.email }}</p>
    </div>

    <div class="identity-row">
    <div class="mb-3 field">
      <label class="label" for="dni">DNI</label>
      <input id="dni" v-model.trim="dni" type="text" inputmode="numeric" maxlength="8" autocomplete="off" class="input" :class="{ 'is-invalid': errors.dni }" placeholder="12345678" :aria-invalid="!!errors.dni" />
      <p v-if="errors.dni" class="error">{{ errors.dni }}</p>
    </div>

    <div class="mb-3 field">
      <label class="label" for="birth-date">Fecha de nacimiento</label>
      <div ref="calendarRef" class="date-picker" @keydown.esc.stop="calendarOpen = false">
        <div class="date-control">
          <input id="birth-date" :value="birthDateLabel" type="text" autocomplete="bday" class="input" :class="{ 'is-invalid': errors.birthDate }" :placeholder="birthDatePlaceholder" readonly aria-haspopup="dialog" :aria-expanded="calendarOpen" :aria-invalid="!!errors.birthDate" @click="openCalendar" />
          <button class="date-trigger" type="button" :aria-label="t('register.birth_date')" :aria-expanded="calendarOpen" @click="calendarOpen ? calendarOpen = false : openCalendar()"><CalendarDays :size="18" :stroke-width="1.8" aria-hidden="true" /></button>
        </div>
        <div v-if="calendarOpen" class="calendar-popover" role="dialog" :aria-label="t('register.birth_date')">
          <div class="calendar-selectors">
            <div class="calendar-picker">
              <button class="calendar-picker-trigger month-trigger" type="button" :aria-label="t('register.select_month')" :aria-expanded="monthMenuOpen" @click="toggleMonthMenu"><span>{{ monthOptions[displayedMonth]?.label }}</span><ChevronDown :size="14" aria-hidden="true" /></button>
              <div v-if="monthMenuOpen" ref="monthMenuRef" class="calendar-picker-menu month-menu" role="listbox" :aria-label="t('register.select_month')">
                <button v-for="month in monthOptions" :key="month.value" class="calendar-picker-option" :class="{ selected: displayedMonth === month.value }" type="button" role="option" :aria-selected="displayedMonth === month.value" @click="displayedMonth = month.value; monthMenuOpen = false">{{ month.label }}</button>
              </div>
            </div>
            <div class="calendar-picker">
              <button class="calendar-picker-trigger year-trigger" type="button" :aria-label="t('register.select_year')" :aria-expanded="yearMenuOpen" @click="toggleYearMenu"><span>{{ displayedYear }}</span><ChevronDown :size="14" aria-hidden="true" /></button>
              <div v-if="yearMenuOpen" ref="yearMenuRef" class="calendar-picker-menu year-menu" role="listbox" :aria-label="t('register.select_year')">
                <button v-for="year in yearOptions" :key="year" class="calendar-picker-option" :class="{ selected: displayedYear === year }" type="button" role="option" :aria-selected="displayedYear === year" @click="displayedYear = year; yearMenuOpen = false">{{ year }}</button>
              </div>
            </div>
          </div>
          <div class="calendar-weekdays" aria-hidden="true"><span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span></div>
          <div class="calendar-days">
            <template v-for="cell in calendarCells" :key="cell.key">
              <span v-if="cell.day === null" class="calendar-blank" aria-hidden="true"></span>
              <button v-else class="calendar-day" :class="{ selected: isSelectedDay(cell.day) }" type="button" :disabled="isFutureDay(cell.day)" :aria-pressed="isSelectedDay(cell.day)" @click="chooseBirthDate(cell.day)">{{ cell.day }}</button>
            </template>
          </div>
        </div>
      </div>
      <p v-if="errors.birthDate" class="error">{{ errors.birthDate }}</p>
    </div>
    </div>

    <div class="password-row">
    <div class="mb-3 field">
      <label class="label" for="pass">{{ t('register.password') }}</label>
      <input
          id="pass"
          v-model="password"
          type="password"
          class="input"
          :class="{ 'is-invalid': errors.password }"
          :placeholder="t('register.password_ph')"
          autocomplete="new-password"
          :aria-invalid="!!errors.password"
          :aria-errormessage="errors.password ? 'err-pass' : undefined"
      />
      <p v-if="errors.password" id="err-pass" class="error">{{ errors.password }}</p>
    </div>

    <div class="mb-3 field">
      <label class="label" for="confirm">{{ t('register.confirm_password') }}</label>
      <input
          id="confirm"
          v-model="confirm"
          type="password"
          class="input"
          :class="{ 'is-invalid': errors.confirm }"
          :placeholder="t('register.confirm_ph')"
          autocomplete="new-password"
          :aria-invalid="!!errors.confirm"
          :aria-errormessage="errors.confirm ? 'err-confirm' : undefined"
      />
      <p v-if="errors.confirm" id="err-confirm" class="error">{{ errors.confirm }}</p>
    </div>
    </div>

    <div class="terms-row">
      <label class="terms-option" :class="{ invalid: errors.accept }" for="terms">
        <input id="terms" v-model="accept" type="checkbox" :aria-invalid="!!errors.accept" :aria-errormessage="errors.accept ? 'err-terms' : undefined" @change="accept && (errors.accept = '')" />
        <span class="terms-check" aria-hidden="true"><Check :size="13" :stroke-width="3" /></span>
        <span class="terms-copy">{{ t('register.accept_terms') }}</span>
      </label>
    </div>
    <p v-if="errors.accept" id="err-terms" class="error terms-error">{{ errors.accept }}</p>

    <button class="primary-btn" type="submit" :disabled="loading">
      <span class="button-shine" aria-hidden="true"></span>
      <span class="button-content">
        <component :is="loading ? LoaderCircle : ArrowRight" class="button-icon" :class="{ spinning: loading }" :size="18" :stroke-width="2.4" aria-hidden="true" />
        {{ loading ? t('register.creating') : t('register.create_account') }}
      </span>
    </button>

    <p v-if="errors.general" class="error mt-2">{{ errors.general }}</p>
  </form>
</template>

<style scoped>
.form{ display:grid; gap:10px; }
.segment-fieldset{display:grid;width:100%;gap:16px;min-width:0;margin:0 0 10px;padding:0;border:0}
.segment-legend{margin-bottom:6px;padding:0;color:#243b31;font-size:14px;font-weight:600}
.segment-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-width:0;padding-top:3px}
.segment-card{position:relative;display:grid;grid-template-columns:20px minmax(0,1fr) 14px;align-items:start;gap:8px;min-width:0;min-height:82px;padding:12px;border:1px solid #e5e3dd;border-radius:11px;background:#fff;color:#355644;cursor:pointer;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease,transform .2s ease}
.segment-card:hover{transform:translateY(-1px);border-color:#bccbc1;box-shadow:0 3px 9px rgba(37,69,50,.07)}
.segment-card.selected{border-color:#5f7f6b;background:#f7faf7;box-shadow:0 0 0 2px rgba(82,123,100,.1)}
.segment-card:focus-within{outline:3px solid rgba(82,123,100,.18);outline-offset:2px}
.segment-card>svg{grid-column:1;grid-row:1;flex:none;margin-top:1px}
.segment-card input{position:absolute;width:1px;height:1px;opacity:0}
.segment-card-copy{grid-column:2;grid-row:1;display:flex;min-width:0;flex-direction:column;gap:4px;padding:0}
.segment-card-copy strong{display:block;color:#243b31;font-size:11px;line-height:1.35;overflow-wrap:anywhere}
.segment-card-copy small{display:block;color:#727c75;font-size:9px;line-height:1.4;overflow-wrap:anywhere}
.segment-radio{position:static;grid-column:3;grid-row:1;width:14px;height:14px;border:1.5px solid #b9c2bc;border-radius:50%;background:#fff}
.segment-card.selected .segment-radio{border:4px solid #41634e}
.segment-error{margin:0}
.field{ display:grid; gap:5px; }
.label{ font-size:14px; color:#243b31; font-weight:600; letter-spacing:.01em; }
.input{
  background:#fff; border:1px solid #e5e3dd; color:#192d25;
  border-radius:11px; padding:12px 15px; outline:none; width:100%;
  font:inherit;font-size:14px; box-shadow:0 1px 3px rgba(29,48,41,.025);
  transition:box-shadow .2s ease,border-color .2s ease,background .2s ease;
}
.input::placeholder{color:#aaa9a3}.input:hover:not(:focus){border-color:#c8d0ca;box-shadow:0 2px 7px rgba(29,48,41,.05)}
.input:focus{border-color:#62806d;background:#fff;box-shadow:0 0 0 3px rgba(82,123,100,.11),0 3px 10px rgba(47,83,62,.06)}
.date-picker{position:relative;min-width:0}
.date-control{position:relative;display:flex;align-items:center}
.date-control .input{padding-right:46px;cursor:pointer}
.date-trigger{position:absolute;right:5px;top:50%;display:grid;width:34px;height:34px;place-items:center;transform:translateY(-50%);border:0;border-radius:8px;background:transparent;color:#607968;cursor:pointer;transition:background .18s ease,color .18s ease}
.date-trigger:hover,.date-trigger:focus-visible{background:#eff5f0;color:#355644}
.calendar-popover{position:absolute;z-index:20;top:calc(100% + 8px);right:0;width:min(310px,calc(100vw - 52px));padding:14px;border:1px solid #e3e9e4;border-radius:14px;background:#fff;box-shadow:0 14px 34px rgba(29,48,41,.16);animation:calendar-enter .16s ease-out both}
.calendar-selectors{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:8px;margin-bottom:12px}
.calendar-picker{position:relative;min-width:0}
.calendar-picker-trigger{display:flex;width:100%;height:36px;align-items:center;justify-content:space-between;gap:7px;padding:0 9px;border:1px solid #e4e9e5;border-radius:8px;background:#f9fbf9;color:#2c4033;font:inherit;font-size:12px;cursor:pointer;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease}
.calendar-picker-trigger:hover,.calendar-picker-trigger[aria-expanded="true"]{border-color:#91aa98;background:#f2f7f3}
.calendar-picker-trigger:focus-visible{outline:3px solid rgba(82,123,100,.14);outline-offset:1px}
.calendar-picker-trigger span{text-transform:capitalize}
.calendar-picker-menu{position:absolute;z-index:25;top:calc(100% + 5px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#aab8ae #f1f4f1;scroll-behavior:smooth;padding:5px;border:1px solid #e4e9e5;border-radius:9px;background:#fff;box-shadow:0 8px 20px rgba(29,48,41,.14);animation:calendar-enter .14s ease-out both}
.calendar-picker-menu::-webkit-scrollbar{width:8px}
.calendar-picker-menu::-webkit-scrollbar-track{margin:7px 2px;border-radius:999px;background:#f1f4f1}
.calendar-picker-menu::-webkit-scrollbar-thumb{border:2px solid #f1f4f1;border-radius:999px;background:#aab8ae}
.calendar-picker-menu::-webkit-scrollbar-thumb:hover{background:#748a7a}
.month-menu{left:0;width:100%;max-height:190px}
.year-menu{right:0;width:92px;max-height:210px}
.calendar-picker-option{display:flex;width:100%;min-height:30px;align-items:center;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:#3b4d40;font:inherit;font-size:12px;text-align:left;text-transform:capitalize;cursor:pointer}
.calendar-picker-option:hover{background:#f2f7f3;color:#294d36}
.calendar-picker-option.selected{background:#eaf2ec;color:#315a43;font-weight:650}
.calendar-weekdays,.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}
.calendar-weekdays{margin-bottom:5px;color:#87948b;font-size:10px;font-weight:600}
.calendar-weekdays span{padding:4px 0}
.calendar-day,.calendar-blank{display:grid;width:32px;height:32px;place-items:center;justify-self:center}
.calendar-day{border:0;border-radius:50%;background:transparent;color:#35483a;font:inherit;font-size:12px;cursor:pointer;transition:background .16s ease,color .16s ease,transform .16s ease}
.calendar-day:hover:not(:disabled){transform:scale(1.07);background:#eef5ef}
.calendar-day.selected{background:#355644;color:#fff;font-weight:650}
.calendar-day:disabled{color:#c5cbc6;cursor:not-allowed}
.calendar-day:focus-visible{outline:2px solid #799582;outline-offset:1px}
@keyframes calendar-enter{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.is-invalid{ border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.12) !important; }
.primary-btn{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-top:3px;width:100%;min-height:48px;background:#355644;color:#fff;border:1px solid transparent;border-radius:10px;padding:12px 18px;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 2px 5px rgba(37,69,50,.12);transition:box-shadow .22s ease,transform .22s ease,background .22s ease}
.button-shine{position:absolute;z-index:-1;top:-60%;bottom:-60%;left:-55%;width:42%;transform:skewX(-24deg);background:linear-gradient(90deg,transparent,rgba(192,224,201,.12),rgba(222,244,227,.38),rgba(192,224,201,.12),transparent);opacity:0;pointer-events:none}
.button-content{display:inline-flex;align-items:center;justify-content:center;gap:9px}
.button-icon{transition:transform .25s ease}.primary-btn:hover:not(:disabled) .button-icon{transform:translateX(3px)}
.primary-btn:hover:not(:disabled){background:#294735;transform:translateY(-1px);box-shadow:0 5px 12px rgba(37,69,50,.18)}
.primary-btn:hover:not(:disabled) .button-shine,.primary-btn:focus-visible .button-shine,.primary-btn:active:not(:disabled) .button-shine{opacity:1;animation:button-shine .8s cubic-bezier(.2,.65,.3,1) forwards}
.primary-btn:active:not(:disabled){transform:translateY(0) scale(.99)}.primary-btn[disabled]{opacity:.72;cursor:wait}
.spinning{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes button-shine{0%{left:-55%;opacity:0}12%{opacity:1}100%{left:125%;opacity:0}}
.error{ color:#dc2626; font-weight:700; font-size:13.5px; }
.mt-2{ margin-top:8px; }
.mb-3{ margin-bottom:12px; }
.terms-row{margin:2px 0}
.terms-option{position:relative;display:flex;min-height:44px;width:100%;align-items:center;gap:10px;padding:9px 12px;border:1px solid #e5ebe6;border-radius:10px;background:linear-gradient(110deg,#f8faf8,#fff);color:#59685e;cursor:pointer;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease}
.terms-option:hover{border-color:#c3d1c6;background:#f7faf7}
.terms-option.invalid{border-color:#dc2626;background:#fffafa}
.terms-option input{position:absolute;width:1px;height:1px;opacity:0}
.terms-check{display:grid;width:18px;height:18px;flex:none;place-items:center;border:1.5px solid #b9c5bc;border-radius:5px;background:#fff;color:#fff;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease}
.terms-check svg{opacity:0;transform:scale(.75);transition:opacity .16s ease,transform .16s ease}
.terms-option input:checked+.terms-check{border-color:#355644;background:#355644;box-shadow:0 2px 5px rgba(37,69,50,.18)}
.terms-option input:checked+.terms-check svg{opacity:1;transform:scale(1)}
.terms-option input:focus-visible+.terms-check{outline:3px solid rgba(82,123,100,.2);outline-offset:2px}
.terms-copy{font-size:11px;font-weight:500;line-height:1.4}
.terms-error{margin:-3px 0 0 2px}
.identity-row{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:12px;min-width:0}
.identity-row .field{min-width:0}
.identity-row .input{min-width:0}
.password-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}
.password-row .field,.password-row .input{min-width:0}
@media(prefers-reduced-motion:reduce){.input,.primary-btn,.button-icon{transition:none}.primary-btn:hover:not(:disabled) .button-shine,.primary-btn:focus-visible .button-shine,.primary-btn:active:not(:disabled) .button-shine{animation:none;opacity:0}.spinning{animation:none}}
@media(max-width:500px){.password-row{grid-template-columns:minmax(0,1fr);gap:10px}}
@media(max-width:400px){.segment-options{grid-template-columns:minmax(0,1fr)}.segment-card{min-height:0}}
@media(max-width:380px){.identity-row{grid-template-columns:minmax(0,1fr);gap:10px}}
</style>
