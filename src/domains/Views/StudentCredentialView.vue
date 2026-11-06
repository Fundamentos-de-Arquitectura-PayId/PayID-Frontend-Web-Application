<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { BadgeCheck, BookOpen, Building2, BusFront, CalendarDays, Camera, CheckCircle2, CreditCard, GraduationCap, IdCard, LockKeyhole, MapPin, Pencil, QrCode, ShieldCheck, X } from 'lucide-vue-next'
import StyledSelect from '../../shared/ui/StyledSelect.component.vue'
import CalendarDatePicker from '../../shared/ui/CalendarDatePicker.component.vue'
import { getStudentCredential, saveStudentCredential } from '../../shared/services/payidRepository.js'

const user = ref({})
const editorOpen = ref(false)
const savedNotice = ref('')
const formError = ref('')
const form = reactive({ educationType: 'Universidad', institution: '', program: '', studentCode: '', campus: '', academicPeriod: '', validUntil: '' })
const educationOptions = [
  { value: 'Universidad', label: 'Universidad' },
  { value: 'Instituto', label: 'Instituto de educación superior' },
]
const periodOptions = [
  { value: '2026-I', label: '2026-I' },
  { value: '2026-II', label: '2026-II' },
  { value: '2027-I', label: '2027-I' },
  { value: '2027-II', label: '2027-II' },
]
const fullName = computed(() => user.value.nombre || user.value.name || 'Estudiante')
const email = computed(() => user.value.email || '')
const profilePhoto = computed(() => user.value.profilePhoto || '')
const dni = computed(() => {
  const value = String(user.value.dni || user.value.DNI || user.value.numeroDocumento || '').replace(/\D/g, '')
  return value ? `•••• ${value.slice(-4)}` : 'DNI pendiente'
})
const credentialReady = computed(() => Boolean(form.institution.trim() && form.program.trim() && form.studentCode.trim()))
const readinessLabel = computed(() => credentialReady.value ? 'Datos completos' : 'Completa tus datos académicos')
const validityLabel = computed(() => {
  if (!form.validUntil) return 'Sin fecha de vigencia'
  const date = new Date(`${form.validUntil.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 'Sin fecha de vigencia' : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
})

async function loadProfile() {
  try { user.value = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {} } catch { user.value = {} }
  try {
    const credential = await getStudentCredential()
    Object.assign(form, { educationType: 'Universidad', institution: '', program: '', studentCode: '', campus: '', academicPeriod: '', validUntil: '', ...(credential || {}) })
  } catch (cause) { formError.value = cause.message || 'No se pudo cargar tu credencial desde Supabase.' }
}

function openEditor() {
  formError.value = ''
  savedNotice.value = ''
  editorOpen.value = true
}

async function saveCredential() {
  formError.value = ''
  if (!form.institution.trim() || !form.program.trim() || !form.studentCode.trim()) {
    formError.value = 'Completa la instituci?n, carrera y c?digo de estudiante.'
    return
  }
  try {
    Object.assign(form, await saveStudentCredential(form))
    window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message: 'Credencial estudiantil guardada en Supabase.' } }))
    savedNotice.value = 'Tus datos acad?micos se guardaron en Supabase.'
    editorOpen.value = false
  } catch (cause) { formError.value = cause.message || 'No se pudo guardar la credencial.' }
}

onMounted(loadProfile)
</script>

<template>
  <main class="student-credential-page">
    <header class="student-page-heading">
      <div><span class="student-eyebrow"><GraduationCap :size="15" /> IDENTIDAD ESTUDIANTIL</span><h1>Mi credencial estudiantil</h1><p>Reúne tu identidad académica y tus servicios PayID en un solo lugar.</p></div>
      <button class="student-edit-button" type="button" @click="openEditor"><Pencil :size="16" />Editar datos académicos</button>
    </header>

    <aside class="student-demo-note"><ShieldCheck :size="16" /><span>Vista previa local. La validación oficial de estudios y la conexión con tu institución se habilitarán en una etapa posterior.</span></aside>

    <section class="student-credential-layout">
      <article class="credential-preview" :class="{ 'is-ready': credentialReady }">
        <span class="credential-orbit orbit-a"></span><span class="credential-orbit orbit-b"></span>
        <header class="credential-top"><span class="credential-brand"><span class="credential-mark">P</span><strong>PayID</strong></span><span class="credential-kind">IDENTIDAD DIGITAL</span></header>
        <div class="credential-main"><div class="credential-avatar"><img v-if="profilePhoto" :src="profilePhoto" alt="" /><span v-else>{{ fullName.slice(0, 1).toUpperCase() }}</span></div><div class="credential-person"><span>CREDENCIAL ESTUDIANTIL</span><h2>{{ fullName }}</h2><p>{{ form.institution || 'Agrega tu institución' }}</p></div></div>
        <div class="credential-data"><div><small>PROGRAMA</small><strong>{{ form.program || 'Carrera o programa' }}</strong></div><div><small>CÓDIGO ESTUDIANTIL</small><strong>{{ form.studentCode || 'Pendiente de completar' }}</strong></div></div>
        <footer class="credential-bottom"><span><small>PERIODO</small><strong>{{ form.academicPeriod || 'Periodo académico' }}</strong></span><span><small>VIGENCIA HASTA</small><strong>{{ form.validUntil ? validityLabel : 'Por confirmar' }}</strong></span><span class="credential-qr"><QrCode :size="30" /><small>VISTA PREVIA</small></span></footer>
      </article>

      <article class="student-info-card">
        <header class="student-info-header"><span class="student-info-icon"><IdCard :size="19" /></span><div><h2>Información de la credencial</h2><p>Datos académicos que aparecerán en tu identidad digital.</p></div></header>
        <div class="credential-status" :class="{ ready: credentialReady }"><CheckCircle2 :size="17" /><span><strong>{{ readinessLabel }}</strong><small>{{ credentialReady ? 'La vista previa está lista para revisar.' : 'Agrega los datos requeridos para completar la vista previa.' }}</small></span></div>
        <div class="student-details">
          <div><span><Building2 :size="15" /> Institución</span><strong>{{ form.institution || 'Aún no registrada' }}</strong></div>
          <div><span><BookOpen :size="15" /> Carrera o programa</span><strong>{{ form.program || 'Aún no registrado' }}</strong></div>
          <div><span><IdCard :size="15" /> Código de estudiante</span><strong>{{ form.studentCode || 'Aún no registrado' }}</strong></div>
          <div><span><MapPin :size="15" /> Sede</span><strong>{{ form.campus || 'No especificada' }}</strong></div>
          <div><span><CalendarDays :size="15" /> Periodo académico</span><strong>{{ form.academicPeriod || 'No especificado' }}</strong></div>
          <div><span><CalendarDays :size="15" /> Vigencia</span><strong>{{ validityLabel }}</strong></div>
        </div>
        <footer class="student-info-footer"><span><LockKeyhole :size="15" /> Tus datos se guardan de forma privada en Supabase.</span><button type="button" @click="openEditor"><Pencil :size="15" /> Completar</button></footer>
      </article>
    </section>

    <section class="student-linked-grid">
      <article><span class="linked-icon"><CreditCard :size="17" /></span><div><strong>Pagos cotidianos</strong><p>Consulta y organiza tus movimientos PayID.</p></div><RouterLink :to="{ name: 'payments' }">Ver pagos</RouterLink></article>
      <article><span class="linked-icon transport"><BusFront :size="17" /></span><div><strong>Transporte</strong><p>Revisa tus tarjetas y saldo de movilidad.</p></div><RouterLink :to="{ name: 'transport' }">Ver transporte</RouterLink></article>
    </section>

    <p v-if="savedNotice" class="student-save-notice" role="status"><BadgeCheck :size="16" />{{ savedNotice }}</p>

    <Teleport to="body"><div v-if="editorOpen" class="student-modal-backdrop" @click.self="editorOpen = false"><section class="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title"><header><span class="student-modal-symbol"><GraduationCap :size="20" /></span><div><h2 id="student-modal-title">Datos académicos</h2><p>Completa la información para preparar tu credencial.</p></div><button class="student-modal-close" type="button" aria-label="Cerrar" @click="editorOpen = false"><X :size="18" /></button></header><form class="student-form" @submit.prevent="saveCredential"><label>Tipo de institución<StyledSelect v-model="form.educationType" :options="educationOptions" aria-label="Tipo de institución" /></label><label class="student-wide">Institución<input v-model.trim="form.institution" required maxlength="140" placeholder="Nombre de universidad o instituto" /></label><div class="student-form-row"><label>Carrera o programa<input v-model.trim="form.program" required maxlength="120" placeholder="Ej. Ingeniería de sistemas" /></label><label>Código de estudiante<input v-model.trim="form.studentCode" required maxlength="40" placeholder="Código asignado por tu institución" /></label></div><div class="student-form-row"><label>Sede (opcional)<input v-model.trim="form.campus" maxlength="100" placeholder="Campus o sede" /></label><label>Periodo académico<StyledSelect v-model="form.academicPeriod" :options="periodOptions" placeholder="Selecciona periodo" aria-label="Periodo académico" /></label></div><label class="student-wide">Vigencia de credencial (opcional)<CalendarDatePicker v-model="form.validUntil" placeholder="dd/mm/aaaa" aria-label="Vigencia de credencial" /></label><p class="student-form-help student-wide"><ShieldCheck :size="15" />Estos datos forman una vista previa; todavía no verifican matrícula ni condición de estudiante.</p><p v-if="formError" class="student-form-error student-wide" role="alert">{{ formError }}</p><footer class="student-form-footer student-wide"><button class="student-cancel" type="button" @click="editorOpen = false">Cancelar</button><button class="student-save" type="submit"><CheckCircle2 :size="16" />Guardar datos</button></footer></form></section></div></Teleport>
  </main>
</template>

<style scoped>
.student-credential-page{display:flex;min-height:100%;flex-direction:column;gap:19px;padding:28px 32px 38px;background:#f5f7f6;color:#26372c}.student-page-heading{display:flex;align-items:center;justify-content:space-between;gap:18px}.student-eyebrow{display:flex;align-items:center;gap:7px;color:#68826d;font-size:9px;font-weight:750;letter-spacing:.13em}.student-eyebrow svg{color:#52785a}.student-page-heading h1{margin:8px 0 0;color:#26392d;font-size:27px;font-weight:650;letter-spacing:-.04em}.student-page-heading p{margin:6px 0 0;color:#78857c;font-size:13px}.student-edit-button,.student-info-footer button{display:inline-flex;min-height:41px;align-items:center;justify-content:center;gap:8px;padding:0 14px;border:1px solid #315a43;border-radius:10px;background:#315a43;color:white;font:inherit;font-size:11px;font-weight:650;white-space:nowrap;cursor:pointer;transition:background .16s,transform .16s,box-shadow .16s}.student-edit-button:hover,.student-info-footer button:hover{transform:translateY(-1px);background:#244a32;box-shadow:0 5px 12px #315a4325}.student-demo-note{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #e5ece6;border-radius:10px;background:#fbfdfb;color:#748177;font-size:11px;line-height:1.45}.student-demo-note svg{flex:none;color:#64816a}.student-credential-layout{display:grid;grid-template-columns:minmax(340px,.9fr) minmax(420px,1.1fr);gap:17px;align-items:stretch}.credential-preview{position:relative;isolation:isolate;display:flex;min-height:320px;overflow:hidden;flex-direction:column;justify-content:space-between;padding:23px 24px;border:1px solid #426650;border-radius:19px;background:radial-gradient(circle at 95% 8%,#ffffff1c,transparent 33%),linear-gradient(135deg,#315d43,#1e3f2e);color:#fff;box-shadow:0 14px 32px #19352324}.credential-preview.is-ready{background:radial-gradient(circle at 95% 8%,#ffffff25,transparent 33%),linear-gradient(135deg,#386c4b,#1d402d)}.credential-orbit{position:absolute;z-index:-1;border:1px solid #ffffff15;border-radius:50%;pointer-events:none}.orbit-a{top:-91px;right:5%;width:230px;height:230px;box-shadow:0 0 0 18px #ffffff05,0 0 0 36px #ffffff04}.orbit-b{right:-85px;bottom:-170px;width:270px;height:270px}.credential-top,.credential-brand{display:flex;align-items:center}.credential-top{justify-content:space-between;gap:10px}.credential-brand{gap:8px}.credential-brand strong{font-size:14px;font-weight:700}.credential-mark{display:grid;width:30px;height:30px;place-items:center;border:1px solid #ffffff62;border-radius:9px;background:#ffffff20;font-size:13px;font-weight:750}.credential-kind{padding:6px 9px;border:1px solid #ffffff3b;border-radius:99px;background:#142d2238;color:#e5efe6;font-size:8px;font-weight:650;letter-spacing:.04em}.credential-main{display:flex;align-items:center;gap:15px;margin:17px 0}.credential-avatar{display:grid;width:64px;height:64px;flex:none;overflow:hidden;place-items:center;border:2px solid #ffffff76;border-radius:50%;background:#ffffff1e;color:#fff;font-size:24px;font-weight:700}.credential-avatar img{width:100%;height:100%;object-fit:cover}.credential-person{min-width:0}.credential-person>span,.credential-data small,.credential-bottom small{display:block;color:#c8ddcd;font-size:8px;font-weight:700;letter-spacing:.12em}.credential-person h2{overflow:hidden;margin:5px 0 3px;color:#fff;font-size:18px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.credential-person p{overflow:hidden;margin:0;color:#e0ece2;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.credential-data{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:13px 0;border-top:1px solid #ffffff24;border-bottom:1px solid #ffffff24}.credential-data>div{min-width:0}.credential-data strong,.credential-bottom strong{display:block;overflow:hidden;margin-top:5px;color:white;font-size:11px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.credential-bottom{display:grid;grid-template-columns:1fr 1fr auto;align-items:end;gap:10px;padding-top:12px}.credential-qr{display:flex;flex-direction:column;align-items:center;gap:3px;color:#fff}.credential-qr small{font-size:6px!important;letter-spacing:.08em!important}.student-info-card{display:flex;min-width:0;flex-direction:column;padding:20px;border:1px solid #e5ebe6;border-radius:16px;background:#fff;box-shadow:0 5px 17px #1f322608}.student-info-header{display:flex;align-items:center;gap:11px}.student-info-icon{display:grid;width:39px;height:39px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#52785a}.student-info-header h2{margin:0;color:#304235;font-size:15px;font-weight:650}.student-info-header p{margin:4px 0 0;color:#89958c;font-size:10px}.credential-status{display:flex;align-items:center;gap:9px;margin-top:16px;padding:11px 12px;border:1px solid #f0e4d1;border-radius:10px;background:#fffaf2;color:#a37639}.credential-status.ready{border-color:#e0ece2;background:#f5faf5;color:#507d58}.credential-status>span{display:flex;flex-direction:column;gap:3px}.credential-status strong{font-size:11px;font-weight:650}.credential-status small{color:#8a948c;font-size:9px}.student-details{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px}.student-details>div{display:flex;min-width:0;min-height:63px;flex-direction:column;justify-content:center;gap:6px;padding:10px;border:1px solid #edf0ed;border-radius:10px;background:#fff}.student-details>div span{display:flex;align-items:center;gap:6px;color:#8a968d;font-size:9px}.student-details>div span svg{color:#76907b}.student-details>div strong{overflow:hidden;color:#3d5143;font-size:10px;font-weight:620;text-overflow:ellipsis;white-space:nowrap}.student-info-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:14px}.student-info-footer>span{display:flex;align-items:center;gap:6px;color:#89958c;font-size:9px}.student-info-footer>span svg{flex:none;color:#66846c}.student-info-footer button{min-height:33px;padding:0 10px;border-color:#dfe8e1;background:#fff;color:#526a58;font-size:10px;box-shadow:none}.student-info-footer button:hover{border-color:#c5d7c8;background:#f4f8f4;color:#315a43}.student-linked-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.student-linked-grid article{display:flex;align-items:center;gap:11px;padding:13px 15px;border:1px solid #e7ece8;border-radius:13px;background:#fff}.linked-icon{display:grid;width:36px;height:36px;flex:none;place-items:center;border-radius:10px;background:#edf4ef;color:#557b5d}.linked-icon.transport{background:#edf3fb;color:#5b7fa8}.student-linked-grid article>div{min-width:0;flex:1}.student-linked-grid strong{color:#3c4e41;font-size:11px}.student-linked-grid p{margin:3px 0 0;color:#929c94;font-size:9px}.student-linked-grid a{color:#476b50;font-size:10px;font-weight:650;text-decoration:none;white-space:nowrap}.student-linked-grid a:hover{text-decoration:underline}.student-save-notice{display:flex;align-items:center;gap:7px;margin:0;color:#4d7b55;font-size:11px}.student-modal-backdrop{position:fixed;inset:0;z-index:10030;display:grid;place-items:center;overflow-y:auto;padding:20px;background:#14231b88;backdrop-filter:blur(5px)}.student-modal{width:min(100%,600px);max-height:92vh;overflow:auto;border:1px solid #e4ebe5;border-radius:17px;background:#fff;box-shadow:0 25px 70px #10231840;animation:student-modal-enter .2s ease-out both}@keyframes student-modal-enter{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}.student-modal>header{display:flex;align-items:center;gap:11px;padding:18px 20px;border-bottom:1px solid #edf0ed}.student-modal-symbol{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#52785a}.student-modal>header>div{min-width:0;flex:1}.student-modal h2{margin:0;color:#304235;font-size:16px}.student-modal header p{margin:4px 0 0;color:#89958c;font-size:10px}.student-modal-close{display:grid;width:32px;height:32px;place-items:center;border:1px solid #e2e8e3;border-radius:9px;background:#fff;color:#738078;cursor:pointer}.student-form{display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:18px 20px 20px}.student-form label{display:flex;min-width:0;flex-direction:column;gap:6px;color:#5e6d62;font-size:10px;font-weight:650}.student-form input{width:100%;height:42px;padding:0 11px;border:1px solid #dfe7e0;border-radius:9px;background:#fbfcfb;color:#35463a;font:inherit;font-size:11px;outline:0;transition:border-color .16s,box-shadow .16s}.student-form input:focus{border-color:#89aa8e;background:#fff;box-shadow:0 0 0 3px #315a4310}.student-wide{grid-column:1/-1}.student-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.student-form-help{display:flex;align-items:flex-start;gap:7px;margin:0;padding:9px 10px;border:1px solid #e6ede7;border-radius:9px;background:#f8faf8;color:#78857c;font-size:9px;line-height:1.45}.student-form-help svg{flex:none;color:#67836d}.student-form-error{margin:0;color:#b24f4a;font-size:10px}.student-form-footer{display:flex;justify-content:flex-end;gap:8px;padding-top:13px;border-top:1px solid #edf0ed}.student-cancel,.student-save{display:inline-flex;min-height:39px;align-items:center;justify-content:center;gap:7px;padding:0 13px;border:1px solid #dfe7e0;border-radius:9px;background:#fff;color:#68776d;font:inherit;font-size:10px;font-weight:650;cursor:pointer}.student-save{border-color:#315a43;background:#315a43;color:#fff}.student-save:hover{background:#244a32}.student-cancel:hover{background:#f7f9f7}
@media(max-width:900px){.student-credential-layout{grid-template-columns:1fr}.credential-preview{min-height:300px}.student-info-footer{margin-top:12px}}
@media(max-width:650px){.student-credential-page{gap:15px;padding:20px 14px 28px}.student-page-heading{align-items:flex-start;flex-direction:column}.student-page-heading h1{font-size:23px}.student-page-heading p{font-size:12px}.student-edit-button{min-height:37px;font-size:10px}.credential-preview{min-height:285px;padding:18px}.credential-person h2{font-size:16px}.credential-data{gap:8px}.credential-data strong,.credential-bottom strong{font-size:9px}.student-info-card{padding:15px}.student-details{gap:7px}.student-linked-grid{grid-template-columns:1fr}.student-form{grid-template-columns:1fr;padding:15px}.student-form-row{grid-template-columns:1fr}.student-wide{grid-column:auto}.student-modal-backdrop{align-items:end;padding:0}.student-modal{width:100%;max-height:94dvh;border-radius:18px 18px 0 0}.student-modal>header{padding:16px}.student-info-footer{align-items:flex-start;flex-direction:column}.student-info-footer button{align-self:flex-end}}
</style>
