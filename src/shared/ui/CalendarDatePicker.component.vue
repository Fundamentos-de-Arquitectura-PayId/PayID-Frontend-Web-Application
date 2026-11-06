<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'dd/mm/aaaa' },
  ariaLabel: { type: String, default: 'Seleccionar fecha' },
})
const emit = defineEmits(['update:modelValue'])
const { locale } = useI18n()
const triggerRef = ref(null)
const popoverRef = ref(null)
const monthMenuRef = ref(null)
const yearMenuRef = ref(null)
const isOpen = ref(false)
const monthMenuOpen = ref(false)
const yearMenuOpen = ref(false)
const popoverStyle = ref({})
const today = new Date()
const viewedMonth = ref(today.getMonth())
const viewedYear = ref(today.getFullYear())

const monthOptions = computed(() => Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date(2024, month, 1)),
})))
const yearOptions = computed(() => Array.from({ length: 131 }, (_, index) => today.getFullYear() + 20 - index))
const weekdayLabels = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2023, 0, 2 + index)
  return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(date)
}))
const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const date = parseDate(props.modelValue)
  return date ? new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : props.modelValue
})
const monthLabel = computed(() => monthOptions.value[viewedMonth.value]?.label || '')
const calendarCells = computed(() => {
  const offset = (new Date(viewedYear.value, viewedMonth.value, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewedYear.value, viewedMonth.value + 1, 0).getDate()
  const count = Math.ceil((offset + daysInMonth) / 7) * 7
  return Array.from({ length: count }, (_, index) => {
    const day = index - offset + 1
    if (day < 1 || day > daysInMonth) return { key: `blank-${index}`, day: null }
    const date = new Date(viewedYear.value, viewedMonth.value, day)
    return { key: `day-${day}`, day, today: date.toDateString() === today.toDateString(), selected: isSelected(day) }
  })
})

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function isSelected(day) {
  const date = parseDate(props.modelValue)
  return !!date && date.getFullYear() === viewedYear.value && date.getMonth() === viewedMonth.value && date.getDate() === day
}

async function positionPopover() {
  if (!isOpen.value || !triggerRef.value || !popoverRef.value) return
  const trigger = triggerRef.value.getBoundingClientRect()
  const width = Math.min(320, window.innerWidth - 24)
  popoverStyle.value = { position: 'fixed', zIndex: 100000, top: '0px', left: '0px', width: `${width}px`, visibility: 'hidden' }
  await nextTick()
  const height = popoverRef.value?.offsetHeight || 330
  const left = Math.max(12, Math.min(trigger.left, window.innerWidth - width - 12))
  const below = window.innerHeight - trigger.bottom
  const top = below >= height + 8 || trigger.top < height + 20
    ? trigger.bottom + 6
    : Math.max(12, trigger.top - height - 6)
  popoverStyle.value = { position: 'fixed', zIndex: 100000, top: `${top}px`, left: `${left}px`, width: `${width}px` }
}

async function openCalendar() {
  if (isOpen.value) {
    isOpen.value = false
    monthMenuOpen.value = false
    yearMenuOpen.value = false
    return
  }
  const current = parseDate(props.modelValue) || today
  viewedMonth.value = current.getMonth()
  viewedYear.value = current.getFullYear()
  monthMenuOpen.value = false
  yearMenuOpen.value = false
  isOpen.value = true
  await nextTick()
  await positionPopover()
}

function selectDay(day) {
  const month = String(viewedMonth.value + 1).padStart(2, '0')
  const date = String(day).padStart(2, '0')
  emit('update:modelValue', `${viewedYear.value}-${month}-${date}`)
  isOpen.value = false
  monthMenuOpen.value = false
  yearMenuOpen.value = false
}

function moveMonth(amount) {
  const next = new Date(viewedYear.value, viewedMonth.value + amount, 1)
  viewedYear.value = next.getFullYear()
  viewedMonth.value = next.getMonth()
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

function closeOnOutside(event) {
  if (!triggerRef.value?.contains(event.target) && !popoverRef.value?.contains(event.target)) {
    isOpen.value = false
    monthMenuOpen.value = false
    yearMenuOpen.value = false
  }
}

function closeOnEscape(event) {
  if (event.key === 'Escape') {
    isOpen.value = false
    monthMenuOpen.value = false
    yearMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', closeOnOutside)
  document.addEventListener('keydown', closeOnEscape)
  window.addEventListener('resize', positionPopover)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  document.removeEventListener('keydown', closeOnEscape)
  window.removeEventListener('resize', positionPopover)
})
</script>

<template>
  <div class="calendar-picker-field">
    <button ref="triggerRef" class="calendar-field-trigger" type="button" :aria-label="ariaLabel" aria-haspopup="dialog" :aria-expanded="isOpen" @click="openCalendar">
      <CalendarDays :size="17" aria-hidden="true" />
      <span :class="{ placeholder: !displayValue }">{{ displayValue || placeholder }}</span>
    </button>
    <Teleport to="body">
      <section v-if="isOpen" ref="popoverRef" class="calendar-popover-card" role="dialog" :aria-label="ariaLabel" :style="popoverStyle">
          <div class="calendar-popover-heading">
            <div><span>{{ locale === 'es' ? 'SELECCIONAR FECHA' : 'SELECT DATE' }}</span><strong>{{ monthLabel }} {{ viewedYear }}</strong></div>
            <div class="calendar-nav">
              <button type="button" :aria-label="locale === 'es' ? 'Mes anterior' : 'Previous month'" @click="moveMonth(-1)"><ChevronLeft :size="16" /></button>
              <button type="button" :aria-label="locale === 'es' ? 'Mes siguiente' : 'Next month'" @click="moveMonth(1)"><ChevronRight :size="16" /></button>
            </div>
          </div>
          <div class="calendar-selectors">
            <div class="calendar-select-wrap">
              <button class="calendar-select-trigger" type="button" :aria-expanded="monthMenuOpen" @click="toggleMonthMenu"><span>{{ monthLabel }}</span><ChevronDown :size="14" /></button>
              <div v-if="monthMenuOpen" ref="monthMenuRef" class="calendar-select-menu month-menu" role="listbox" :aria-label="locale === 'es' ? 'Seleccionar mes' : 'Select month'">
                <button v-for="month in monthOptions" :key="month.value" class="calendar-select-option" type="button" role="option" :aria-selected="viewedMonth === month.value" :class="{ selected: viewedMonth === month.value }" @click="viewedMonth = month.value; monthMenuOpen = false">{{ month.label }}</button>
              </div>
            </div>
            <div class="calendar-select-wrap year-wrap">
              <button class="calendar-select-trigger" type="button" :aria-expanded="yearMenuOpen" @click="toggleYearMenu"><span>{{ viewedYear }}</span><ChevronDown :size="14" /></button>
              <div v-if="yearMenuOpen" ref="yearMenuRef" class="calendar-select-menu year-menu" role="listbox" :aria-label="locale === 'es' ? 'Seleccionar año' : 'Select year'">
                <button v-for="year in yearOptions" :key="year" class="calendar-select-option" type="button" role="option" :aria-selected="viewedYear === year" :class="{ selected: viewedYear === year }" @click="viewedYear = year; yearMenuOpen = false">{{ year }}</button>
              </div>
            </div>
          </div>
          <div class="calendar-grid calendar-weekdays" aria-hidden="true"><span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span></div>
          <div class="calendar-grid calendar-days">
            <span v-for="cell in calendarCells" :key="cell.key" class="calendar-cell">
              <span v-if="cell.day === null" aria-hidden="true"></span>
              <button v-else class="calendar-day" type="button" :class="{ today: cell.today, selected: cell.selected }" :aria-pressed="cell.selected" @click="selectDay(cell.day)">{{ cell.day }}</button>
            </span>
          </div>
          <div class="calendar-footer"><span><i></i>{{ locale === 'es' ? 'Hoy' : 'Today' }}</span><button v-if="modelValue" type="button" @click="emit('update:modelValue', ''); isOpen = false">{{ locale === 'es' ? 'Limpiar' : 'Clear' }}</button></div>
      </section>
    </Teleport>
  </div>
</template>

<style scoped>
.calendar-picker-field{width:100%;min-width:0}
.calendar-field-trigger{display:flex;width:100%;min-height:43px;align-items:center;gap:9px;padding:0 12px;border:1px solid #dfe6e0;border-radius:9px;background:#fbfcfb;color:#34443a;font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:border-color .16s,background .16s,box-shadow .16s}
.calendar-field-trigger:hover,.calendar-field-trigger[aria-expanded="true"]{border-color:#91ad97;background:#fff}.calendar-field-trigger:focus-visible{outline:0;border-color:#86aa8d;box-shadow:0 0 0 3px #315a4310}.calendar-field-trigger svg{flex:none;color:#708176}.calendar-field-trigger span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.calendar-field-trigger .placeholder{color:#929d94}
.calendar-popover-card{overflow:visible;padding:14px;border:1px solid #e1e8e2;border-radius:14px;background:#fff;box-shadow:0 16px 40px rgba(25,48,33,.2);font-family:inherit}
.calendar-popover-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.calendar-popover-heading>div:first-child{display:flex;flex-direction:column;gap:4px}.calendar-popover-heading>div:first-child>span{color:#9aa59c;font-size:8px;font-weight:700;letter-spacing:.12em}.calendar-popover-heading strong{color:#304334;font-size:14px;font-weight:650;text-transform:capitalize}
.calendar-nav{display:flex;gap:5px}.calendar-nav button{display:grid;width:29px;height:29px;place-items:center;border:1px solid #e6ece7;border-radius:8px;background:#fff;color:#68786d;cursor:pointer;transition:background .15s,border-color .15s,color .15s}.calendar-nav button:hover{border-color:#c6d6c9;background:#f4f8f4;color:#315a43}
.calendar-selectors{display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:7px;margin-bottom:10px}.calendar-select-wrap{position:relative;min-width:0}.calendar-select-trigger{display:flex;width:100%;height:36px;align-items:center;justify-content:space-between;gap:6px;padding:0 9px;border:1px solid #e3e9e4;border-radius:8px;background:#f9fbf9;color:#425347;font:inherit;font-size:11px;cursor:pointer}.calendar-select-trigger:hover,.calendar-select-trigger[aria-expanded="true"]{border-color:#94ad99;background:#f3f7f3}.calendar-select-trigger span{overflow:hidden;text-overflow:ellipsis;text-transform:capitalize;white-space:nowrap}.calendar-select-menu{position:absolute;z-index:4;top:calc(100% + 4px);max-height:190px;overflow-y:auto;padding:4px;border:1px solid #e2e8e3;border-radius:9px;background:#fff;box-shadow:0 9px 22px rgba(25,48,33,.16);scrollbar-width:thin;scrollbar-color:#aab8ae #f1f4f1}.month-menu{left:0;width:100%}.year-menu{right:0;width:100%}.calendar-select-option{display:flex;width:100%;min-height:29px;align-items:center;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:#4c5a50;font:inherit;font-size:11px;text-align:left;text-transform:capitalize;cursor:pointer}.calendar-select-option:hover{background:#f2f7f2;color:#315a43}.calendar-select-option.selected{background:#eaf2ec;color:#315a43;font-weight:650}
.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center}.calendar-weekdays{margin-bottom:4px;color:#97a299;font-size:9px;font-weight:650}.calendar-weekdays span{padding:4px 0}.calendar-cell{display:grid;min-height:31px;place-items:center}.calendar-day{position:relative;display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:50%;background:transparent;color:#536256;font:inherit;font-size:10px;cursor:pointer;transition:background .14s,color .14s,transform .14s}.calendar-day:hover{transform:scale(1.07);background:#eef5ef;color:#315a43}.calendar-day.today{box-shadow:inset 0 0 0 1px #a7bda9;color:#315a43;font-weight:700}.calendar-day.selected{background:#355c42;color:#fff;font-weight:700;box-shadow:0 3px 8px #315a4330}.calendar-footer{display:flex;align-items:center;justify-content:space-between;min-height:26px;margin-top:8px;padding-top:8px;border-top:1px solid #edf1ed}.calendar-footer span{display:flex;align-items:center;gap:6px;color:#859187;font-size:9px}.calendar-footer i{width:6px;height:6px;border-radius:50%;background:#53785a}.calendar-footer button{padding:4px 7px;border:0;border-radius:6px;background:transparent;color:#58745d;font:inherit;font-size:9px;font-weight:600;cursor:pointer}.calendar-footer button:hover{background:#f0f6f0}
</style>
