<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { deleteProfilePhoto, getPayIdProfile, listPaymentCards, updatePayIdPassword, updateProfile as saveProfileToSupabase, uploadProfilePhoto } from '../../shared/services/payidRepository.js'
import { BadgeCheck, Camera, CreditCard, Eye, EyeOff, LockKeyhole, Mail, Save, ShieldCheck, Trash2, UserRound, Wifi, X } from 'lucide-vue-next'

const user = ref({})
const name = ref('')
const email = ref('')
const photo = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const cards = ref([])
const photoInput = ref(null)
const busy = ref(false)
const cardLoading = ref(false)
const error = ref('')
const notice = ref('')
const passwordModalOpen = ref(false)
const passwordError = ref('')
const passwordVisibility = reactive({ current: false, next: false, confirm: false })
const initials = computed(() => (name.value || email.value || 'P').trim().slice(0, 1).toUpperCase())
const maskedDni = computed(() => { const value = String(user.value.dni || user.value.DNI || user.value.numeroDocumento || '').replace(/\D/g, ''); return value ? '****' + value.slice(-4) : 'No registrado' })
const segmentLabel = computed(() => ['family', 'parent', 'guardian', 'padre', 'apoderado', 'padre_apoderado'].includes(String(user.value.segmento || user.value.segment || '').toLowerCase()) ? 'Padre, madre o apoderado' : 'Estudiante de educación superior')
const birthDateLabel = computed(() => {
  const value = user.value.fechaNacimiento || user.value.birthDate || user.value.fecha_nacimiento
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
})
const cardNumber = (card) => String(card.cardNumber ?? card.CardNumber ?? card.fullNumber ?? card.FullNumber ?? card.numero ?? '').replace(/\s/g, '')
const lastFour = (card) => String(card.lastFour ?? card.LastFour ?? cardNumber(card).slice(-4) ?? '').slice(-4)
const balance = (card) => Number(card.balance ?? card.Balance ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cardExpiry = (card) => {
  const month = Number(card.expiryMonth ?? card.ExpiryMonth)
  const year = Number(card.expiryYear ?? card.ExpiryYear)
  return month && year ? `${String(month).padStart(2, '0')}/${String(year).slice(-2)}` : '—'
}

async function loadUser() {
  try { user.value = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {} } catch { user.value = {} }
  name.value = user.value.nombre || user.value.name || ''
  email.value = user.value.email || ''
  try {
    const profile = await getPayIdProfile()
    user.value = { ...user.value, ...profile }
    name.value = profile.nombre || name.value
    email.value = profile.email || email.value
    photo.value = profile.profilePhoto || ''
    localStorage.setItem('kapakid:user', JSON.stringify(user.value))
  } catch (cause) { error.value = cause.message || 'No se pudo cargar tu perfil de Supabase.' }
}
function notify(message) { window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message } })) }
function syncProfile(fields = {}) {
  const updated = { ...user.value, ...fields }
  localStorage.setItem('kapakid:user', JSON.stringify(updated))
  user.value = updated
  window.dispatchEvent(new CustomEvent('payid:user-updated', { detail: updated }))
}
async function loadCards() {
  cardLoading.value = true
  try { cards.value = await listPaymentCards() }
  catch (cause) { error.value = cause.message || 'No se pudieron cargar las tarjetas PayID.' }
  finally { cardLoading.value = false }
}
async function choosePhoto(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) { error.value = 'Selecciona una imagen JPG o PNG.'; return }
  if (file.size > 2 * 1024 * 1024) { error.value = 'La imagen debe pesar menos de 2 MB.'; return }
  busy.value = true
  error.value = ''
  try {
    const uploaded = await uploadProfilePhoto(file, user.value.avatarPath)
    photo.value = uploaded.url
    syncProfile({ profilePhoto: uploaded.url, avatarPath: uploaded.path })
  } catch (cause) { error.value = cause.message || 'No se pudo subir la foto a Supabase Storage.' }
  finally { busy.value = false; if (photoInput.value) photoInput.value.value = '' }
}
async function removePhoto() {
  busy.value = true
  error.value = ''
  try {
    await deleteProfilePhoto(user.value.avatarPath)
    photo.value = ''
    syncProfile({ profilePhoto: '', avatarPath: null })
  } catch (cause) { error.value = cause.message || 'No se pudo eliminar la foto.' }
  finally { busy.value = false; if (photoInput.value) photoInput.value.value = '' }
}
async function saveProfile() {
  error.value = ''
  if (!name.value.trim()) { error.value = 'Completa tu nombre.'; return }
  busy.value = true
  try {
    const updated = await saveProfileToSupabase({ name: name.value, email: email.value, dni: user.value.dni, birthDate: user.value.fechaNacimiento })
    syncProfile(updated)
    notice.value = 'Tus datos de perfil se guardaron en Supabase.'
    notify('Perfil actualizado correctamente.')
  } catch (cause) { error.value = cause.message || 'No se pudo guardar el perfil.' }
  finally { busy.value = false }
}
async function changePassword() {
  passwordError.value = ''
  if (!oldPassword.value || !newPassword.value) { passwordError.value = 'Ingresa tu contrase?a actual y la nueva.'; return }
  if (newPassword.value.length < 8) { passwordError.value = 'La nueva contrase?a debe tener al menos 8 caracteres.'; return }
  if (newPassword.value !== confirmPassword.value) { passwordError.value = 'Las contrase?as nuevas no coinciden.'; return }
  busy.value = true
  try {
    await updatePayIdPassword(oldPassword.value, newPassword.value)
    passwordModalOpen.value = false
    oldPassword.value = newPassword.value = confirmPassword.value = ''
    notify('Contrase?a actualizada correctamente.')
  } catch (cause) { passwordError.value = cause.message || 'No se pudo actualizar la contrase?a.' }
  finally { busy.value = false }
}

onMounted(() => { loadUser(); loadCards() })
</script>

<template>
  <main class="profile-page">
    <header class="profile-heading"><div><span class="eyebrow">TU CUENTA PAYID</span><h1>Perfil principal</h1><p>Administra tus datos, seguridad e identidad digital desde un solo lugar.</p></div><span class="secure-mark"><ShieldCheck :size="17" /> Cuenta segura</span></header>
    <div class="profile-layout">
      <section class="profile-card identity-card">
        <div class="section-title"><span class="title-icon"><UserRound :size="18" /></span><div><h2>Información personal</h2><p>Tu identidad y datos de acceso</p></div></div>
        <div class="photo-row"><div class="photo-avatar" :class="{ 'has-photo': photo }" role="button" tabindex="0" aria-label="Editar foto de perfil" @click="photoInput?.click()" @keydown.enter.prevent="photoInput?.click()" @keydown.space.prevent="photoInput?.click()"><Transition name="photo-fade"><img v-if="photo" :src="photo" alt="Foto de perfil" /><span v-else>{{ initials }}</span></Transition><span class="photo-hover" aria-hidden="true"></span><button class="photo-upload" type="button" title="Cambiar foto" aria-label="Cambiar foto" @click.stop="photoInput?.click()"><Camera :size="22" /></button><button v-if="photo" class="photo-delete" type="button" title="Quitar foto" aria-label="Quitar foto" @click.stop="removePhoto"><Trash2 :size="17" /></button></div><div class="photo-summary"><strong>{{ name || 'Tu nombre' }}</strong><span class="profile-type"><BadgeCheck :size="14" /> {{ segmentLabel }}</span><small><Mail :size="14" /> {{ email }}</small></div><div class="profile-state-chip"><BadgeCheck :size="20" /><span><strong>Cuenta PayID activa</strong><small>Tu perfil está listo para usar</small></span></div><input ref="photoInput" class="photo-input" type="file" accept="image/*" @change="choosePhoto" /></div>
        <form class="profile-form" @submit.prevent="saveProfile"><label>Nombre completo<input v-model="name" autocomplete="name" placeholder="Tu nombre" /></label><label>Correo electrónico<input v-model="email" type="email" autocomplete="email" placeholder="tu@correo.com" readonly /></label><div class="readonly-grid"><label>Documento de identidad<input :value="maskedDni" readonly /></label><label>Fecha de nacimiento<input :value="birthDateLabel" readonly /></label><label>Tipo de perfil<input :value="segmentLabel" readonly /></label></div><div class="profile-actions"><button class="password-trigger" type="button" @click="passwordModalOpen = true"><LockKeyhole :size="16" /> Cambiar contraseña</button><button class="primary-button" type="submit"><Save :size="16" /> Guardar cambios</button></div></form>
      </section>
      <section class="profile-card payid-card-section">
        <div class="section-title"><span class="title-icon"><CreditCard :size="18" /></span><div><h2>Mi tarjeta PayID</h2><p>Tu medio de pago vinculado a la identidad digital</p></div></div>
        <div v-if="cards.length" class="payid-card-list"><article v-for="card in cards" :key="card.id ?? card.Id" class="payid-card">
          <span class="card-orbit orbit-one"></span><span class="card-orbit orbit-two"></span>
          <div class="card-top"><span class="card-brand"><i>P</i><span><strong>PayID</strong><small>BILLETERA DIGITAL</small></span></span><span class="card-network">{{ card.brand ?? card.Brand ?? 'PAYID' }}</span></div>
          <div class="card-number-row"><span class="card-chip"><i></i></span><strong class="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;{{ lastFour(card) }}</strong><Wifi :size="20" class="card-contactless" /></div>
          <div class="card-meta"><span><small>TITULAR</small><strong>{{ name || email }}</strong></span><span><small>VENCE</small><strong>{{ cardExpiry(card) }}</strong></span><span class="card-active"><i></i>ACTIVA</span></div>
          <footer class="card-footer"><span><small>SALDO DISPONIBLE</small><strong>S/ {{ balance(card) }}</strong></span><span class="card-wallet-label"><CreditCard :size="14" /> Cuenta PayID</span></footer>
        </article></div>
        <div v-else class="empty-card"><CreditCard :size="23" /><span>{{ cardLoading ? 'Cargando tu tarjeta…' : 'Aún no tienes una tarjeta PayID vinculada.' }}</span><router-link v-if="!cardLoading" :to="{ name: 'payment-demo' }">Agregar tarjeta</router-link></div>
      </section>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-else-if="notice" class="feedback success" role="status">{{ notice }}</p>
    </div>
  </main>
  <Teleport to="body">
    <Transition name="profile-modal">
      <div v-if="passwordModalOpen" class="modal-backdrop" @click.self="passwordModalOpen = false">
        <section class="password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
          <header class="modal-header"><span class="modal-icon"><LockKeyhole :size="19" /></span><div><h2 id="password-modal-title">Cambiar contraseña</h2><p>Actualiza la clave de acceso de tu cuenta PayID.</p></div><button class="modal-close" type="button" aria-label="Cerrar" @click="passwordModalOpen = false"><X :size="18" /></button></header>
          <form @submit.prevent="changePassword"><div class="modal-body"><label>Contraseña actual<span class="password-input-wrap"><input v-model="oldPassword" :type="passwordVisibility.current ? 'text' : 'password'" autocomplete="current-password" placeholder="Ingresa tu contraseña actual" /><button class="password-toggle" type="button" :aria-label="passwordVisibility.current ? 'Ocultar contraseña' : 'Mostrar contraseña'" :title="passwordVisibility.current ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="passwordVisibility.current = !passwordVisibility.current"><EyeOff v-if="passwordVisibility.current" :size="17" /><Eye v-else :size="17" /></button></span></label><label>Nueva contraseña<span class="password-input-wrap"><input v-model="newPassword" :type="passwordVisibility.next ? 'text' : 'password'" autocomplete="new-password" placeholder="Mínimo 8 caracteres" /><button class="password-toggle" type="button" :aria-label="passwordVisibility.next ? 'Ocultar contraseña' : 'Mostrar contraseña'" :title="passwordVisibility.next ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="passwordVisibility.next = !passwordVisibility.next"><EyeOff v-if="passwordVisibility.next" :size="17" /><Eye v-else :size="17" /></button></span></label><label>Confirmar contraseña<span class="password-input-wrap"><input v-model="confirmPassword" :type="passwordVisibility.confirm ? 'text' : 'password'" autocomplete="new-password" placeholder="Repite tu nueva contraseña" /><button class="password-toggle" type="button" :aria-label="passwordVisibility.confirm ? 'Ocultar contraseña' : 'Mostrar contraseña'" :title="passwordVisibility.confirm ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="passwordVisibility.confirm = !passwordVisibility.confirm"><EyeOff v-if="passwordVisibility.confirm" :size="17" /><Eye v-else :size="17" /></button></span></label><p v-if="passwordError" class="modal-error" role="alert">{{ passwordError }}</p><p class="modal-hint"><ShieldCheck :size="15" /> Tu contraseña nunca se muestra ni se guarda en este dispositivo.</p></div><footer class="modal-footer"><button class="modal-cancel" type="button" @click="passwordModalOpen = false">Cancelar</button><button class="primary-button" type="submit"><LockKeyhole :size="15" /> Actualizar contraseña</button></footer></form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.profile-page{width:min(1440px,100%);margin:0 auto;padding:38px clamp(24px,4vw,64px) 56px;color:#24332a}.profile-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:0 0 25px}.eyebrow{color:#819187;font-size:10px;font-weight:750;letter-spacing:.14em}.profile-heading h1{margin:7px 0;color:#22352a;font-size:clamp(25px,3vw,32px);letter-spacing:-.045em}.profile-heading p{margin:0;color:#7e8c82;font-size:13px}.secure-mark{display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #e0eae1;border-radius:999px;background:#f8fbf8;color:#56715c;font-size:11px;font-weight:650}.profile-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}.profile-card{min-width:0;padding:22px;border:1px solid #e6ece7;border-radius:17px;background:#fff;box-shadow:0 7px 22px #25382b08}.section-title{display:flex;align-items:center;gap:11px;margin-bottom:21px}.title-icon{display:grid;width:39px;height:39px;flex:none;place-items:center;border-radius:12px;background:#edf5ef;color:#426b4b}.section-title h2{margin:0;color:#2c3d31;font-size:15px;font-weight:700}.section-title p{margin:4px 0 0;color:#8d9990;font-size:11px}.photo-row{display:flex;align-items:center;gap:22px;margin:0 0 25px;padding:14px 0 19px;border-bottom:1px solid #eef2ee}.photo-avatar{position:relative;display:grid;width:132px;height:132px;flex:none;overflow:hidden;place-items:center;padding:0;border:4px solid #edf3ee;border-radius:50%;background:linear-gradient(145deg,#4e7b59,#315a43);color:#fff;font:inherit;font-size:38px;font-weight:700;cursor:pointer;box-shadow:0 7px 20px #315a4324;transition:transform .25s,box-shadow .25s}.photo-avatar:hover{transform:scale(1.025);box-shadow:0 11px 25px #315a4335}.photo-avatar>img{width:100%;height:100%;object-fit:cover;animation:photo-pop .4s cubic-bezier(.2,.75,.25,1)}.photo-hover{position:absolute;inset:0;border-radius:50%;background:#ffffff00;transform:translateY(-100%);transition:transform .38s cubic-bezier(.2,.75,.25,1),background .25s}.photo-avatar:hover .photo-hover,.photo-avatar:focus-visible .photo-hover{background:#ffffff52;transform:translateY(0)}.photo-upload{position:absolute;inset:0;display:grid;width:100%;height:100%;place-items:center;border:0;border-radius:50%;background:transparent;color:#fff;opacity:0;cursor:pointer;transition:opacity .25s}.photo-avatar:hover .photo-upload,.photo-avatar:focus-visible .photo-upload{opacity:1}.photo-delete{position:absolute;right:0;bottom:0;left:0;z-index:2;display:grid;height:39px;place-items:center;border:0;border-radius:0 0 66px 66px;background:#c94c42d9;color:#fff;transform:translateY(105%);transition:transform .35s,background .18s;cursor:pointer}.photo-avatar.has-photo:hover .photo-delete,.photo-avatar.has-photo:focus-visible .photo-delete{transform:translateY(0)}.photo-delete:hover{background:#b83a33}.photo-summary{display:flex;min-width:0;flex-direction:column;gap:6px}.photo-summary strong{color:#2c3d31;font-size:18px;font-weight:700}.photo-summary span{color:#67786b;font-size:12px}.photo-summary small{color:#929d95;font-size:11px}.photo-input{display:none}.photo-fade-enter-active,.photo-fade-leave-active{transition:opacity .2s,transform .2s}.photo-fade-enter-from,.photo-fade-leave-to{opacity:0;transform:scale(.86)}@keyframes photo-pop{from{opacity:.3;transform:scale(.84)}to{opacity:1;transform:scale(1)}}.readonly-grid{display:grid;grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.photo-button{display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #dfe8e0;border-radius:10px;background:#fff;color:#48644e;font-size:11px;font-weight:650;cursor:pointer;transition:.18s}.photo-button:hover{border-color:#b9d0bd;background:#f5f9f5}.photo-button input{display:none}.photo-row>small{color:#98a29a;font-size:10px}.profile-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:end;gap:15px 14px}.profile-actions{display:flex;grid-column:1/-1;justify-content:flex-end;gap:10px}.profile-actions .primary-button{min-width:180px;padding:0 18px}.profile-form label{display:flex;flex-direction:column;gap:6px;color:#66756a;font-size:11px;font-weight:600}.profile-form input{width:100%;height:42px;padding:0 12px;border:1px solid #dfe6e0;border-radius:10px;outline:none;background:#fcfdfc;color:#34463a;font:inherit;font-size:12px;font-weight:450;transition:border-color .18s,box-shadow .18s,background .18s}.profile-form input:focus{border-color:#78977d;background:#fff;box-shadow:0 0 0 3px #5c855e1c}.profile-form input[readonly]{background:#f5f7f5;color:#768279}.primary-button,.secondary-button{display:flex;min-height:42px;align-items:center;justify-content:center;gap:8px;border:1px solid #315a43;border-radius:10px;background:linear-gradient(135deg,#416f51,#294b36);color:#fff;font:inherit;font-size:12px;font-weight:650;cursor:pointer;box-shadow:0 4px 10px #315a4322;transition:transform .18s,box-shadow .18s}.primary-button:hover,.secondary-button:hover{box-shadow:0 7px 15px #315a4333;transform:translateY(-1px)}.password-form{display:flex;padding-top:2px}.security-note{display:flex;align-items:center;gap:7px;margin:2px 0 0;color:#8a978d;font-size:10px}.security-note svg{flex:none;color:#74927a}.payid-card-section{grid-column:1/-1}.payid-card-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,420px));gap:13px}.payid-card{position:relative;display:flex;min-height:182px;flex-direction:column;justify-content:space-between;overflow:hidden;padding:20px 22px;border:1px solid #527560;border-radius:17px;background:radial-gradient(circle at 96% 5%,#ffffff24 0 62px,transparent 63px),linear-gradient(128deg,#315a43,#213d30);color:#fff;box-shadow:0 12px 23px #315a4328}.payid-card::after{position:absolute;right:-32px;bottom:-74px;width:190px;height:190px;border:1px solid #ffffff16;border-radius:50%;content:"";box-shadow:0 0 0 20px #ffffff08,0 0 0 42px #ffffff06}.card-top,.card-bottom{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between}.card-top{color:#ffffffb8;font-size:11px;font-weight:700;letter-spacing:.08em}.card-brand{display:flex;align-items:center;gap:7px;color:white;font-size:14px;letter-spacing:0}.card-brand i{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#fff;color:#315a43;font-style:normal}.card-number{position:relative;z-index:1;font-size:17px;font-weight:550;letter-spacing:.11em}.card-bottom{align-items:flex-end}.card-bottom span{display:flex;flex-direction:column;gap:4px}.card-bottom small{color:#ffffff9c;font-size:8px;letter-spacing:.1em}.card-bottom strong{max-width:220px;overflow:hidden;color:#fff;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.empty-card{display:flex;min-height:110px;align-items:center;justify-content:center;gap:10px;border:1px dashed #dce6dd;border-radius:13px;background:#fafcfa;color:#87948a;font-size:12px}.empty-card>svg{color:#78917d}.empty-card a{color:#426d4b;font-size:11px;font-weight:650;text-decoration:none}.empty-card a:hover{text-decoration:underline}.feedback{grid-column:1/-1;margin:0;padding:12px 14px;border:1px solid;border-radius:11px;font-size:12px}.feedback.error{border-color:#f1d6d2;background:#fff9f8;color:#b44d43}.feedback.success{border-color:#d9e9dc;background:#f7fbf7;color:#47734e}@media(max-width:760px){.profile-page{padding:24px 16px 36px}.profile-heading{align-items:flex-start;flex-direction:column}.profile-layout{grid-template-columns:1fr}.payid-card-section,.feedback{grid-column:auto}.readonly-grid{grid-template-columns:1fr}.profile-form{grid-template-columns:1fr}.profile-actions{justify-content:flex-start;flex-wrap:wrap}.profile-actions .primary-button{min-width:0;flex:1}.photo-avatar{width:104px;height:104px}.photo-delete{height:34px}.photo-row{gap:15px}.photo-row>small{width:100%;padding-left:77px}}
.password-trigger{display:flex;min-height:42px;align-items:center;gap:9px;padding:0 15px;border:1px solid #dbe6dc;border-radius:11px;background:#fff;color:#42694b;font:inherit;font-size:12px;font-weight:650;cursor:pointer;box-shadow:0 3px 10px #315a430c;transition:background .18s,border-color .18s,box-shadow .18s,transform .18s}.password-trigger:hover{border-color:#bcd0bf;background:#f6faf6;box-shadow:0 6px 14px #315a4315;transform:translateY(-1px)}.profile-type{display:flex;align-items:center;gap:6px;color:#56735b!important;font-weight:600}.photo-summary small{display:flex;align-items:center;gap:7px}.modal-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:20px;background:rgba(24,37,29,.48);backdrop-filter:blur(5px)}.password-modal{width:min(100%,500px);overflow:hidden;border:1px solid #e5ebe6;border-radius:20px;background:#fff;box-shadow:0 28px 80px #14231c42;animation:modal-rise .26s cubic-bezier(.2,.75,.25,1)}.modal-header{display:flex;align-items:center;gap:13px;padding:21px 23px;border-bottom:1px solid #edf1ed;background:linear-gradient(180deg,#fff,#fbfcfb)}.modal-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:13px;background:#edf5ef;color:#426b4b}.modal-header>div{min-width:0;flex:1}.modal-header h2{margin:0;color:#293a2e;font-size:16px;font-weight:700}.modal-header p{margin:5px 0 0;color:#88958b;font-size:11px}.modal-close{display:grid;width:34px;height:34px;flex:none;place-items:center;border:1px solid #e5ebe6;border-radius:10px;background:#fff;color:#7b8980;cursor:pointer;transition:all .16s}.modal-close:hover{border-color:#cbd9ce;background:#f3f7f3;color:#315a43}.modal-body{display:grid;gap:14px;padding:22px 23px}.modal-body label{display:grid;gap:6px;color:#627166;font-size:11px;font-weight:600}.modal-body input{height:43px;padding:0 12px;border:1px solid #dfe6e0;border-radius:10px;outline:0;background:#fcfdfc;color:#34463a;font:inherit;font-size:12px;font-weight:450;transition:border-color .18s,box-shadow .18s}.modal-body input:focus{border-color:#78977d;background:#fff;box-shadow:0 0 0 3px #5c855e1c}.modal-hint{display:flex;align-items:center;gap:7px;margin:0;color:#829087;font-size:10px}.modal-hint svg{flex:none;color:#6c8a72}.modal-error{margin:0;padding:10px 12px;border:1px solid #f0d6d2;border-radius:9px;background:#fff8f7;color:#aa4f47;font-size:11px;line-height:1.5}.modal-footer{display:flex;justify-content:flex-end;gap:9px;padding:15px 23px 19px;border-top:1px solid #edf1ed;background:#fbfcfb}.modal-cancel{min-height:40px;padding:0 14px;border:1px solid #dfe6e0;border-radius:10px;background:#fff;color:#68766d;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .16s}.modal-cancel:hover{border-color:#cbd8cd;background:#f5f8f5}.modal-footer .primary-button{min-height:40px;padding:0 15px}.profile-modal-enter-active,.profile-modal-leave-active{transition:opacity .2s ease}.profile-modal-enter-from,.profile-modal-leave-to{opacity:0}.profile-modal-enter-active .password-modal,.profile-modal-leave-active .password-modal{transition:transform .2s,opacity .2s}.profile-modal-enter-from .password-modal,.profile-modal-leave-to .password-modal{transform:translateY(10px) scale(.98);opacity:0}@keyframes modal-rise{from{transform:translateY(10px) scale(.985);opacity:.6}to{transform:translateY(0) scale(1);opacity:1}}@media(max-width:560px){.profile-heading{align-items:flex-start}.password-trigger{width:100%;justify-content:center}.modal-backdrop{padding:12px}.modal-header,.modal-body{padding-right:17px;padding-left:17px}.modal-footer{padding-right:17px;padding-left:17px}}
.password-input-wrap{position:relative;display:block;width:100%;min-width:0}.password-input-wrap>input{display:block;width:100%;box-sizing:border-box;padding-right:46px}.password-toggle{position:absolute;top:50%;right:8px;display:grid;width:30px;height:30px;place-items:center;transform:translateY(-50%);border:0;border-radius:8px;background:transparent;color:#87958a;cursor:pointer;transition:background .16s,color .16s}.password-toggle:hover,.password-toggle:focus-visible{background:#edf4ee;color:#315a43;outline:0}
.profile-state-chip{display:flex;align-items:center;gap:11px;margin-left:auto;padding:13px 17px;border:1px solid #dce9df;border-radius:13px;background:linear-gradient(135deg,#f7fbf7,#eef6ef);color:#4c7854}.profile-state-chip>svg{flex:none}.profile-state-chip>span{display:flex;flex-direction:column;gap:4px}.profile-state-chip strong{color:#355b3c;font-size:12px;font-weight:700}.profile-state-chip small{color:#829487;font-size:10px}.profile-actions .password-trigger{min-width:190px;justify-content:center}.profile-actions .primary-button{min-width:190px}@media(max-width:760px){.profile-state-chip{margin-left:0}.profile-actions .password-trigger,.profile-actions .primary-button{min-width:0;flex:1}}
</style>

<style>
.payid-card-list{grid-template-columns:minmax(0,520px);gap:16px}
.payid-card{isolation:isolate;min-height:236px;padding:20px 22px 17px;border:1px solid #6f9479;border-radius:19px;background:radial-gradient(ellipse at 100% 0%,#96b89a4d,transparent 39%),linear-gradient(132deg,#315d43 0%,#244c36 48%,#193a2c 100%);box-shadow:inset 0 1px #ffffff35,0 15px 30px #244a332e;transition:transform .22s ease,box-shadow .22s ease}
.payid-card:hover{transform:translateY(-3px);box-shadow:inset 0 1px #ffffff42,0 20px 36px #244a333d}
.payid-card::before{position:absolute;inset:0;z-index:-1;background:linear-gradient(115deg,transparent 20%,#ffffff08 48%,transparent 72%);content:"";pointer-events:none}
.payid-card::after{right:-24px;bottom:-116px;width:236px;height:236px;border-color:#ffffff1a;box-shadow:0 0 0 18px #ffffff08,0 0 0 40px #ffffff05,0 0 0 65px #ffffff03}
.card-orbit{position:absolute;z-index:-1;top:-92px;right:26px;width:208px;height:208px;border:1px solid #ffffff12;border-radius:50%;box-shadow:0 0 0 18px #ffffff06,0 0 0 38px #ffffff04;pointer-events:none}
.card-orbit.orbit-two{top:auto;right:auto;bottom:-155px;left:44%;width:250px;height:250px;opacity:.7}
.payid-card .card-top{min-height:35px;color:#e0ece2;font-size:10px;letter-spacing:0}
.payid-card .card-brand{gap:9px;font-size:13px}
.payid-card .card-brand i{width:28px;height:28px;border:1px solid #ffffff65;border-radius:9px;background:#ffffff1d;color:#fff;font-size:13px;font-weight:700;box-shadow:inset 0 1px #ffffff25}
.payid-card .card-brand>span{display:flex;flex-direction:column;gap:2px}
.payid-card .card-brand strong{font-size:13px;font-weight:700}
.payid-card .card-brand small{color:#bcd2c0;font-size:7px;font-weight:650;letter-spacing:.12em}
.card-network{padding:6px 9px;border:1px solid #ffffff38;border-radius:999px;background:#10291d39;color:#f2f7f2;font-size:8px;font-weight:700;letter-spacing:.08em}
.card-number-row{position:relative;z-index:1;display:flex;align-items:center;gap:13px;margin:11px 0 15px}
.card-chip{position:relative;display:block;width:38px;height:28px;flex:none;overflow:hidden;border:1px solid #f5e3b088;border-radius:7px;background:linear-gradient(135deg,#f0dfa9,#b5a06a);box-shadow:inset 0 1px 2px #ffffffa0,0 2px 5px #102a1c25}
.card-chip::before,.card-chip::after,.card-chip i{position:absolute;display:block;border:1px solid #81734e70;content:""}
.card-chip::before{inset:0 12px;border-top:0;border-bottom:0}.card-chip::after{inset:8px 0;border-right:0;border-left:0}.card-chip i{inset:6px 12px;border-radius:4px}
.payid-card .card-number{color:#f4faf4;font-size:17px;font-weight:600;letter-spacing:.13em;text-shadow:0 1px 5px #102a1c35}
.card-contactless{margin-left:auto;transform:rotate(90deg);color:#d3e5d5;opacity:.88}
.card-meta{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) 60px auto;align-items:end;gap:15px;padding:12px 0;border-top:1px solid #ffffff27;border-bottom:1px solid #ffffff27}
.card-meta>span{display:flex;min-width:0;flex-direction:column;gap:5px}.card-meta small,.card-footer small{color:#b9d0bd;font-size:7px;font-weight:700;letter-spacing:.13em}.card-meta strong{overflow:hidden;color:#f7fbf7;font-size:10px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.card-active{display:inline-flex!important;flex-direction:row!important;align-items:center;gap:6px!important;padding:6px 8px;border:1px solid #ffffff32;border-radius:999px;background:#ffffff13;color:#ebf5ec;font-size:7px;font-weight:700;letter-spacing:.06em;white-space:nowrap}.card-active i{width:6px;height:6px;border-radius:50%;background:#a4dfaa;box-shadow:0 0 0 3px #a4dfaa25}
.card-footer{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-top:12px}.card-footer>span:first-child{display:flex;flex-direction:column;gap:4px}.card-footer>span:first-child strong{color:#fff;font-size:19px;font-weight:700;letter-spacing:-.035em}.card-wallet-label{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #ffffff25;border-radius:8px;color:#d5e5d7;font-size:8px;font-weight:550}.card-wallet-label svg{color:#bbd1be}
@media(max-width:560px){.payid-card-list{grid-template-columns:minmax(0,1fr)}.payid-card{min-height:226px;padding:17px}.payid-card .card-number{font-size:14px;letter-spacing:.1em}.card-meta{grid-template-columns:minmax(0,1fr) 52px auto;gap:9px}.card-active{padding:5px 6px;font-size:6px}.card-footer>span:first-child strong{font-size:17px}}
@media(prefers-reduced-motion:reduce){.payid-card{transition:none}}
</style>