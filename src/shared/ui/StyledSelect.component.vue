<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Seleccionar' },
  ariaLabel: { type: String, default: 'Seleccionar una opción' },
})
const emit = defineEmits(['update:modelValue'])
const triggerRef = ref(null)
const menuRef = ref(null)
const isOpen = ref(false)
const menuStyle = ref({})
const selectedLabel = computed(() => props.options.find((option) => option.value === props.modelValue)?.label || '')

async function positionMenu() {
  if (!isOpen.value || !triggerRef.value || !menuRef.value) return
  const trigger = triggerRef.value.getBoundingClientRect()
  const width = Math.min(Math.max(trigger.width, 220), 360, window.innerWidth - 24)
  menuStyle.value = { position: 'fixed', zIndex: 100000, top: '0px', left: '0px', width: `${width}px`, visibility: 'hidden' }
  await nextTick()
  const height = menuRef.value?.offsetHeight || 220
  const left = Math.max(12, Math.min(trigger.left, window.innerWidth - width - 12))
  const below = window.innerHeight - trigger.bottom
  const top = below >= Math.min(height, 240) + 8 || trigger.top < height + 20
    ? trigger.bottom + 6
    : Math.max(12, trigger.top - height - 6)
  menuStyle.value = { position: 'fixed', zIndex: 100000, top: `${top}px`, left: `${left}px`, width: `${width}px` }
}

async function toggleMenu() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    await positionMenu()
  }
}

function choose(option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

function closeOnOutside(event) {
  if (!triggerRef.value?.contains(event.target) && !menuRef.value?.contains(event.target)) isOpen.value = false
}

function closeOnEscape(event) {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', closeOnOutside)
  document.addEventListener('keydown', closeOnEscape)
  window.addEventListener('resize', positionMenu)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  document.removeEventListener('keydown', closeOnEscape)
  window.removeEventListener('resize', positionMenu)
})
</script>

<template>
  <div class="styled-select">
    <button ref="triggerRef" class="styled-select-trigger" type="button" :aria-label="ariaLabel" aria-haspopup="listbox" :aria-expanded="isOpen" @click="toggleMenu">
      <span :class="{ placeholder: !selectedLabel }">{{ selectedLabel || placeholder }}</span>
      <ChevronDown :size="16" :class="{ rotated: isOpen }" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="isOpen" ref="menuRef" class="styled-select-menu" role="listbox" :aria-label="ariaLabel" :style="menuStyle">
          <button v-for="option in options" :key="option.value" class="styled-select-option" :class="{ selected: option.value === modelValue }" type="button" role="option" :aria-selected="option.value === modelValue" @click="choose(option)">
            <span>{{ option.label }}</span><i v-if="option.value === modelValue" aria-hidden="true"></i>
          </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.styled-select{position:relative;width:100%;min-width:0}
.styled-select-trigger{display:flex;width:100%;min-height:43px;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;border:1px solid #dfe6e0;border-radius:9px;background:#fbfcfb;color:#34443a;font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:border-color .16s,background .16s,box-shadow .16s}
.styled-select-trigger:hover,.styled-select-trigger[aria-expanded="true"]{border-color:#91ad97;background:#fff}
.styled-select-trigger:focus-visible{outline:0;border-color:#86aa8d;box-shadow:0 0 0 3px #315a4310}
.styled-select-trigger>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.styled-select-trigger .placeholder{color:#929d94}
.styled-select-trigger svg{flex:none;color:#728177;transition:transform .18s}
.styled-select-trigger svg.rotated{transform:rotate(180deg)}
.styled-select-menu{max-height:min(240px,calc(100vh - 24px));overflow-y:auto;overscroll-behavior:contain;padding:5px;border:1px solid #e1e8e2;border-radius:11px;background:#fff;box-shadow:0 14px 35px rgba(25,48,33,.18);scrollbar-width:thin;scrollbar-color:#aab8ae #f1f4f1}
.styled-select-menu::-webkit-scrollbar{width:8px}.styled-select-menu::-webkit-scrollbar-track{margin:6px 2px;border-radius:999px;background:#f1f4f1}.styled-select-menu::-webkit-scrollbar-thumb{border:2px solid #f1f4f1;border-radius:999px;background:#aab8ae}
.styled-select-option{display:flex;width:100%;min-height:36px;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;border:0;border-radius:7px;background:transparent;color:#46564a;font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:background .14s,color .14s}
.styled-select-option:hover{background:#f2f7f2;color:#315a43}.styled-select-option.selected{background:#edf4ee;color:#315a43;font-weight:650}.styled-select-option i{width:6px;height:6px;flex:none;border-radius:50%;background:#52805b}
</style>
