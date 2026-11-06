<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, Copy, Download, Headphones, Mic, MicOff, RotateCcw, Send, ShieldCheck, Volume2, VolumeX, X } from 'lucide-vue-next'

const robotLogo = `${import.meta.env.BASE_URL}images/payid-chatbot-robot.png`
const openStage = ref('idle')
const typedTitle = ref('')
const draft = ref('')
const chatBody = ref(null)
const suggestionsViewport = ref(null)
const messages = ref([])
const copiedId = ref(null)
const speakingId = ref(null)
const listening = ref(false)
const notice = ref('')
const canScrollBack = ref(false)
const canScrollForward = ref(true)
let titleInterval
let stageTimeout
let noticeTimeout
let copyTimeout
let recognition

const assistantTitle = 'Asistente PayID'
const welcomeMessage = '¡Hola! Soy el asistente de PayID. ¿En qué puedo ayudarte hoy?'
const suggestions = [
  '¿Cómo gestiono mis documentos?',
  '¿Cómo reviso mis pagos?',
  '¿Cómo funciona mi tarjeta digital?',
  '¿Cómo registro a mi familia?',
  '¿Qué hago si olvidé mi contraseña?',
]
const isVisible = computed(() => openStage.value !== 'idle')

watch(messages, async () => {
  await nextTick()
  if (chatBody.value) chatBody.value.scrollTo({ top: chatBody.value.scrollHeight, behavior: 'smooth' })
}, { deep: true })

watch(openStage, async stage => {
  if (stage !== 'title') return
  typedTitle.value = ''
  let position = 0
  titleInterval = window.setInterval(() => {
    position += 1
    typedTitle.value = assistantTitle.slice(0, position)
    if (position >= assistantTitle.length) {
      window.clearInterval(titleInterval)
      stageTimeout = window.setTimeout(() => { if (openStage.value === 'title') openStage.value = 'chat' }, 280)
    }
  }, 58)
})

watch(openStage, stage => {
  if (stage === 'chat') updateSuggestionScroll()
  if (stage === 'idle') stopSpeech()
})

onBeforeUnmount(() => {
  window.clearInterval(titleInterval)
  window.clearTimeout(stageTimeout)
  window.clearTimeout(noticeTimeout)
  window.clearTimeout(copyTimeout)
  recognition?.stop()
  window.speechSynthesis?.cancel()
})

function openChat() {
  openStage.value = 'icon'
  stageTimeout = window.setTimeout(() => { if (openStage.value === 'icon') openStage.value = 'title' }, 720)
}

function closeChat() {
  openStage.value = 'idle'
  typedTitle.value = ''
  window.clearInterval(titleInterval)
  window.clearTimeout(stageTimeout)
  recognition?.stop()
  listening.value = false
  stopSpeech()
}

function updateSuggestionScroll() {
  const viewport = suggestionsViewport.value
  if (!viewport) return
  canScrollBack.value = viewport.scrollLeft > 2
  canScrollForward.value = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2
}

function moveSuggestions(direction) {
  const viewport = suggestionsViewport.value
  if (!viewport) return
  const chip = viewport.querySelector('button')
  viewport.scrollBy({ left: direction * (chip ? chip.getBoundingClientRect().width + 8 : viewport.clientWidth * .75), behavior: 'smooth' })
  window.setTimeout(updateSuggestionScroll, 260)
}

function showNotice(text) {
  notice.value = text
  window.clearTimeout(noticeTimeout)
  noticeTimeout = window.setTimeout(() => { notice.value = '' }, 2000)
}

function sendMessage(text = draft.value) {
  const clean = String(text).trim()
  if (!clean) return
  messages.value.push({ id: Date.now(), sender: 'user', text: clean })
  draft.value = ''
  window.setTimeout(() => messages.value.push({ id: Date.now() + 1, sender: 'support', text: getAnswer(clean) }), 650)
}

function getAnswer(question) {
  const q = question.toLocaleLowerCase('es')
  if (/document|dni|pasaporte|venc/.test(q)) return 'En Documentos puedes registrar y consultar tus documentos, revisar su estado y estar al tanto de sus fechas de vencimiento.'
  if (/pago|movimiento|transacci/.test(q)) return 'En Pagos puedes revisar tus movimientos. Si necesitas consultar una recarga de transporte, entra a la sección Transporte.'
  if (/tarjeta|digital|credencial/.test(q)) return 'Tu tarjeta digital centraliza tu identidad PayID. Puedes verla desde Inicio y usar las secciones disponibles según tu perfil.'
  if (/familia|padre|madre|apoderad/.test(q)) return 'PayID permite organizar la información familiar desde el perfil de padre, madre o apoderado. Revisa Inicio y Documentos para administrar los datos de tu hogar.'
  if (/contrase|clave|olvid/.test(q)) return 'En la pantalla de inicio de sesión selecciona “Forgot your password?” para iniciar la recuperación de acceso.'
  return 'Gracias por escribirnos. Puedo orientarte sobre documentos, pagos, transporte y tu identidad digital PayID. Elige una pregunta sugerida o cuéntame un poco más.'
}

async function copyMessage(item) {
  try {
    await navigator.clipboard.writeText(item.text)
    copiedId.value = item.id
    showNotice('Mensaje copiado')
    window.clearTimeout(copyTimeout)
    copyTimeout = window.setTimeout(() => { if (copiedId.value === item.id) copiedId.value = null }, 1600)
  } catch { showNotice('No se pudo copiar el mensaje') }
}

function stopSpeech() {
  window.speechSynthesis?.cancel()
  speakingId.value = null
}

function listenMessage(item) {
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
    showNotice('Este navegador no puede leer en voz alta')
    return
  }
  if (speakingId.value === item.id) { stopSpeech(); return }
  stopSpeech()
  const utterance = new SpeechSynthesisUtterance(item.text)
  utterance.lang = 'es-PE'
  utterance.onend = () => { speakingId.value = null }
  utterance.onerror = () => { speakingId.value = null }
  speakingId.value = item.id
  window.speechSynthesis.speak(utterance)
}

function dictate() {
  const speechWindow = window
  const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
  if (!Recognition) { showNotice('Este navegador no tiene dictado por voz disponible'); return }
  if (listening.value) { recognition?.stop(); listening.value = false; return }
  const baseDraft = draft.value
  recognition = new Recognition()
  recognition.lang = 'es-PE'
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  recognition.onresult = event => {
    const transcript = event.results[event.results.length - 1]?.[0]?.transcript
    if (transcript) draft.value = `${baseDraft}${baseDraft ? ' ' : ''}${transcript}`
  }
  recognition.onerror = () => { listening.value = false; showNotice('No se pudo acceder al micrófono') }
  recognition.onend = () => { listening.value = false }
  try { recognition.start(); listening.value = true } catch { listening.value = false; showNotice('No se pudo acceder al micrófono') }
}

function downloadChat() {
  const allMessages = [{ sender: 'support', text: welcomeMessage }, ...messages.value]
  const content = allMessages.map(item => `${item.sender === 'user' ? 'Tú' : 'PayID'}: ${item.text}`).join('\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'conversacion-soporte-payid.txt'
  anchor.click()
  URL.revokeObjectURL(url)
}

function resetChat() {
  stopSpeech()
  recognition?.stop()
  listening.value = false
  draft.value = ''
  messages.value = []
  showNotice('Conversación nueva')
  nextTick(updateSuggestionScroll)
}
</script>

<template>
  <Teleport to="body">
  <div class="payid-chat-widget" :class="{ 'is-open': isVisible, 'is-chat-open': openStage === 'chat' }">
    <Transition name="chat-panel">
      <section v-if="openStage === 'chat'" class="payid-chat-panel" role="dialog" aria-modal="false" aria-labelledby="payid-chat-title">
        <Transition name="copy-toast"><div v-if="notice" class="payid-chat-notice" role="status" aria-live="polite"><span><Check :size="13" /></span>{{ notice }}</div></Transition>
        <header class="payid-chat-header">
          <span class="payid-chat-avatar"><img :src="robotLogo" alt="Robot PayID" /></span>
          <div class="payid-chat-heading"><strong id="payid-chat-title">Asistente PayID</strong><span><i></i> Asistente virtual</span></div>
          <button type="button" class="payid-chat-icon-button reset" aria-label="Nueva conversación" title="Nueva conversación" @click="resetChat"><RotateCcw :size="15" /></button>
          <button type="button" class="payid-chat-icon-button close" aria-label="Cerrar chat" title="Cerrar chat" @click="closeChat"><X :size="17" /></button>
        </header>
        <div class="payid-chat-body">
          <div ref="chatBody" class="payid-chat-messages" aria-live="polite" aria-relevant="additions text">
            <div class="payid-chat-message-group support">
              <div class="payid-chat-message-row support"><span class="payid-chat-message-avatar"><img :src="robotLogo" alt="" /></span><p>{{ welcomeMessage }}</p></div>
              <div class="payid-chat-message-actions"><button type="button" title="Copiar mensaje" aria-label="Copiar mensaje" @click="copyMessage({ id: 'welcome', text: welcomeMessage })"><Check v-if="copiedId === 'welcome'" :size="13" /><Copy v-else :size="13" /></button><button type="button" :title="speakingId === 'welcome' ? 'Detener lectura' : 'Leer mensaje en voz alta'" :aria-label="speakingId === 'welcome' ? 'Detener lectura' : 'Leer mensaje en voz alta'" @click="listenMessage({ id: 'welcome', text: welcomeMessage })"><VolumeX v-if="speakingId === 'welcome'" :size="13" /><Volume2 v-else :size="13" /></button></div>
            </div>
            <div v-for="item in messages" :key="item.id" class="payid-chat-message-group" :class="[item.sender, { speaking: speakingId === item.id }]">
              <div class="payid-chat-message-row" :class="item.sender"><span v-if="item.sender === 'support'" class="payid-chat-message-avatar"><img :src="robotLogo" alt="" /></span><p>{{ item.text }}</p></div>
              <div class="payid-chat-message-actions" :class="item.sender"><button type="button" :title="copiedId === item.id ? 'Copiado' : 'Copiar mensaje'" :aria-label="copiedId === item.id ? 'Copiado' : 'Copiar mensaje'" @click="copyMessage(item)"><Check v-if="copiedId === item.id" :size="13" /><Copy v-else :size="13" /></button><template v-if="item.sender === 'support'"><button type="button" :title="speakingId === item.id ? 'Detener lectura' : 'Leer mensaje en voz alta'" :aria-label="speakingId === item.id ? 'Detener lectura' : 'Leer mensaje en voz alta'" @click="listenMessage(item)"><VolumeX v-if="speakingId === item.id" :size="13" /><Volume2 v-else :size="13" /></button></template></div>
            </div>
            <div v-if="listening" class="payid-voice-status"><span><i></i><i></i><i></i><i></i></span> Escuchando…</div>
          </div>
          <div v-if="!messages.length" class="payid-chat-suggestions" role="group" aria-label="Preguntas sugeridas">
            <button class="payid-chat-suggestions-arrow" type="button" aria-label="Preguntas anteriores" :disabled="!canScrollBack" @click="moveSuggestions(-1)"><ChevronLeft :size="15" /></button>
            <div ref="suggestionsViewport" class="payid-chat-suggestions-viewport" @scroll="updateSuggestionScroll"><div class="payid-chat-suggestions-track"><button v-for="(question, index) in suggestions" :key="question" type="button" @click="sendMessage(question)"><span class="suggestion-icon">{{ index + 1 }}</span>{{ question }}</button></div></div>
            <button class="payid-chat-suggestions-arrow" type="button" aria-label="Más preguntas" :disabled="!canScrollForward" @click="moveSuggestions(1)"><ChevronRight :size="15" /></button>
          </div>
          <div class="payid-chat-compose">
            <button class="payid-chat-mic" :class="{ listening }" type="button" :title="listening ? 'Detener dictado' : 'Dictar mensaje'" :aria-label="listening ? 'Detener dictado' : 'Dictar mensaje'" @click="dictate"><MicOff v-if="listening" :size="15" /><Mic v-else :size="15" /></button>
            <form class="payid-chat-form" @submit.prevent="sendMessage()"><input v-model="draft" type="text" placeholder="Escribe tu mensaje..." aria-label="Escribe tu mensaje" /><button type="submit" :disabled="!draft.trim()" aria-label="Enviar mensaje"><Send :size="15" /></button></form>
          </div>
        </div>
        <footer class="payid-chat-footer"><span><ShieldCheck :size="13" /> No compartas contraseñas ni códigos</span><button type="button" title="Descargar conversación" aria-label="Descargar conversación" @click="downloadChat"><Download :size="14" /></button></footer>
      </section>
    </Transition>
    <Transition name="chat-intro"><div v-if="openStage === 'icon' || openStage === 'title'" class="payid-chat-intro" role="status" aria-live="polite"><img :src="robotLogo" alt="" /><p>{{ typedTitle }}<span v-if="openStage === 'title' && typedTitle.length < assistantTitle.length" class="intro-caret"></span></p></div></Transition>
    <button type="button" class="payid-chat-launcher" :class="{ 'is-open': isVisible, 'is-attention': !isVisible }" :aria-label="isVisible ? 'Cerrar chat PayID' : 'Abrir chat PayID'" :aria-expanded="isVisible" @click="isVisible ? closeChat() : openChat()"><Transition name="launcher-icon" mode="out-in"><X v-if="isVisible" key="close" :size="21" /><img v-else key="robot" :src="robotLogo" alt="Abrir chat PayID" /></Transition><span v-if="!isVisible" class="launcher-pulse" aria-hidden="true"></span></button>
  </div>
  </Teleport>
</template>
