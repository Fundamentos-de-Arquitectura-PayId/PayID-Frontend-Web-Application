<script setup>
import { computed, onMounted, ref } from 'vue'
import { UsersRound, Plus, Search, Pencil, Trash2, UserRound, FileText, CreditCard, BusFront, X, ShieldCheck } from 'lucide-vue-next'
import { deleteFamilyMember, listDocuments, listFamilyMembers, listPayments, listTransportCards, saveFamilyMember } from '../../shared/services/payidRepository.js'
import StyledSelect from '../../shared/ui/StyledSelect.component.vue'
import CalendarDatePicker from '../../shared/ui/CalendarDatePicker.component.vue'

const members = ref([])
const linkedDocuments = ref([])
const linkedTransportCards = ref([])
const linkedPayments = ref([])
const loading = ref(true)
const saving = ref(false)
const query = ref('')
const error = ref('')
const modalOpen = ref(false)
const editingId = ref(null)
const form = ref(blankForm())
const linkedDetail = ref(null)
const linkedDetailType = ref('documents')

function blankForm() { return { name: '', relationship: '', documentType: 'DNI', documentNumber: '', birthDate: '', phone: '' } }
const visibleMembers = computed(() => members.value.filter(member => `${member.name} ${member.relationship} ${member.documentNumber}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const linkedDetailItems = computed(() => {
  if (!linkedDetail.value) return []
  const id = String(linkedDetail.value.id)
  const source = linkedDetailType.value === 'documents' ? linkedDocuments.value : linkedDetailType.value === 'payments' ? linkedPayments.value : linkedTransportCards.value
  return source.filter(item => String(item.familyMemberId ?? item.FamilyMemberId ?? '') === id)
})
const linkedDetailTitle = computed(() => ({ documents: 'Documentos', payments: 'Pagos', transport: 'Tarjetas de transporte' }[linkedDetailType.value]))
const linkedDetailIcon = computed(() => ({ documents: FileText, payments: CreditCard, transport: BusFront }[linkedDetailType.value]))
const relationshipOptions = [
  { value: 'Hijo/a', label: 'Hijo/a' },
  { value: 'Cónyuge', label: 'Cónyuge' },
  { value: 'Madre', label: 'Madre' },
  { value: 'Padre', label: 'Padre' },
  { value: 'Apoderado/a', label: 'Apoderado/a' },
  { value: 'Otro familiar', label: 'Otro familiar' },
]
const documentTypeOptions = [
  { value: 'DNI', label: 'DNI' },
  { value: 'Carnet de extranjería', label: 'Carnet de extranjería' },
  { value: 'Pasaporte', label: 'Pasaporte' },
]

async function loadMembers() {
  loading.value = true; error.value = ''
  try {
    const result = await listFamilyMembers()
    members.value = result
    let user = {}
    try { user = JSON.parse(localStorage.getItem('kapakid:user') || '{}') } catch { /* sesión inválida */ }
    const userId = user.id ?? user.userId ?? user.Id
    if (userId) {
      const [documentsResult, transportResult, paymentsResult] = await Promise.allSettled([
        listDocuments(),
        listTransportCards(),
        listPayments(),
      ])
      linkedDocuments.value = documentsResult.status === 'fulfilled' && Array.isArray(documentsResult.value) ? documentsResult.value : []
      linkedTransportCards.value = transportResult.status === 'fulfilled' && Array.isArray(transportResult.value) ? transportResult.value : []
      linkedPayments.value = paymentsResult.status === 'fulfilled' && Array.isArray(paymentsResult.value) ? paymentsResult.value : []
    }
  } catch (e) { error.value = e.message || 'No se pudo cargar la familia.' }
  finally { loading.value = false }
}
function openCreate() { editingId.value = null; form.value = blankForm(); error.value = ''; modalOpen.value = true }
function openLinkedDetail(member, type) { linkedDetail.value = member; linkedDetailType.value = type }
function closeLinkedDetail() { linkedDetail.value = null }
function linkedCount(member, type) {
  const id = String(member.id)
  const source = type === 'documents' ? linkedDocuments.value : type === 'payments' ? linkedPayments.value : linkedTransportCards.value
  return source.filter(item => String(item.familyMemberId ?? item.FamilyMemberId ?? '') === id).length
}
function linkedItemTitle(item) {
  if (linkedDetailType.value === 'documents') return `${item.type || item.documentType || 'Documento'} · ${item.number || item.documentNumber || 'Sin número'}`
  if (linkedDetailType.value === 'payments') return item.service || item.description || 'Pago registrado'
  const number = String(item.cardNumber || item.number || '')
  return `${item.type || 'Transporte'} · ${number ? `•••• ${number.slice(-4)}` : 'Tarjeta vinculada'}`
}
function linkedItemSubtitle(item) {
  if (linkedDetailType.value === 'documents') return `Vence: ${formatLinkedDate(item.expirationDate || item.fechaVencimiento)}`
  if (linkedDetailType.value === 'payments') return `${formatLinkedDate(item.date || item.occurred_at)} · ${item.method || 'Pago PayID'}`
  return `Último movimiento: ${formatLinkedDate(item.lastRechargeDate)}`
}
function linkedItemValue(item) {
  if (linkedDetailType.value === 'documents') return item.statusLabel || item.statusKey || 'Registrado'
  if (linkedDetailType.value === 'payments') return `S/ ${Number(item.amount || 0).toFixed(2)}`
  return `S/ ${Number(item.balance || 0).toFixed(2)}`
}
function formatLinkedDate(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
function openEdit(member) {
  editingId.value = member.id
  form.value = { name: member.name || '', relationship: member.relationship || '', documentType: member.documentType || 'DNI', documentNumber: member.documentNumber || '', birthDate: member.birthDate?.slice(0, 10) || '', phone: member.phone || '' }
  error.value = ''; modalOpen.value = true
}
async function saveMember() {
  saving.value = true; error.value = ''
  const payload = { ...form.value, birthDate: form.value.birthDate || null }
  try {
    const saved = await saveFamilyMember(payload, editingId.value)
    if (editingId.value) members.value = members.value.map(item => item.id === editingId.value ? saved : item)
    else members.value = [...members.value, saved].sort((a, b) => a.name.localeCompare(b.name))
    modalOpen.value = false
    window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message: editingId.value ? 'Integrante actualizado.' : 'Integrante agregado a tu familia.' } }))
  } catch (e) { error.value = e.message || 'No se pudo guardar el integrante.' }
  finally { saving.value = false }
}
async function removeMember(member) {
  if (!window.confirm(`¿Quitar a ${member.name} de tu familia?`)) return
  try {
    await deleteFamilyMember(member.id)
    members.value = members.value.filter(item => item.id !== member.id)
    window.dispatchEvent(new CustomEvent('payid:toast', { detail: { message: 'Integrante eliminado.' } }))
  } catch (e) { error.value = e.message || 'No se pudo quitar el integrante.' }
}
onMounted(loadMembers)
</script>

<template>
  <div class="family-page">
    <header class="family-heading">
      <div><span class="eyebrow">IDENTIDAD FAMILIAR</span><h1>Mi familia</h1><p>Organiza en PayID la identidad y los servicios de las personas que tienes a cargo.</p></div>
      <button class="add-button" type="button" @click="openCreate"><Plus :size="17"/> Agregar integrante</button>
    </header>

    <section class="family-summary" aria-label="Resumen familiar">
      <div class="summary-icon"><UsersRound :size="21"/></div>
      <div class="summary-copy"><strong>{{ members.length }} {{ members.length === 1 ? 'integrante' : 'integrantes' }}</strong><span>Personas vinculadas a tu cuenta familiar</span></div>
      <div class="summary-badge"><ShieldCheck :size="15"/> Cuenta PayID protegida</div>
    </section>

    <section class="members-panel">
      <div class="panel-top"><div><h2>Personas a tu cargo</h2><p>Agrega familiares para organizar sus documentos, medios de pago y tarjetas de transporte.</p></div><label class="search-box"><Search :size="17"/><input v-model="query" placeholder="Buscar integrante..." aria-label="Buscar integrante"/></label></div>
      <div v-if="loading" class="members-grid" aria-label="Cargando integrantes"><div v-for="index in 2" :key="index" class="member-skeleton"><span class="skeleton-line skeleton-avatar"></span><span class="skeleton-line skeleton-name"></span><span class="skeleton-line skeleton-document"></span><span class="skeleton-line skeleton-actions"></span></div></div>
      <div v-else-if="error && !members.length" class="empty-state error-state">{{ error }} <button type="button" @click="loadMembers">Reintentar</button></div>
      <div v-else-if="visibleMembers.length" class="members-grid">
        <article v-for="member in visibleMembers" :key="member.id" class="member-card">
          <div class="member-top"><div class="member-avatar"><UserRound :size="22"/></div><div class="member-identity"><h3>{{ member.name }}</h3><span>{{ member.relationship }}</span></div><div class="member-actions"><button type="button" title="Editar integrante" aria-label="Editar integrante" @click="openEdit(member)"><Pencil :size="16"/></button><button type="button" title="Quitar integrante" aria-label="Quitar integrante" @click="removeMember(member)"><Trash2 :size="16"/></button></div></div>
          <div class="member-document"><span>{{ member.documentType || 'DNI' }}</span><strong>{{ member.documentNumber }}</strong></div>
          <div class="member-links"><button type="button" :class="linkedCount(member, 'documents') ? 'is-populated' : 'is-empty'" @click="openLinkedDetail(member, 'documents')"><FileText :size="15"/> {{ linkedCount(member, 'documents') }} documentos</button><button type="button" :class="linkedCount(member, 'payments') ? 'is-populated' : 'is-empty'" @click="openLinkedDetail(member, 'payments')"><CreditCard :size="15"/> {{ linkedCount(member, 'payments') }} pagos</button><button type="button" :class="linkedCount(member, 'transport') ? 'is-populated' : 'is-empty'" @click="openLinkedDetail(member, 'transport')"><BusFront :size="15"/> {{ linkedCount(member, 'transport') }} tarjetas de transporte</button></div>
        </article>
      </div>
      <div v-else class="empty-state"><span class="empty-icon"><UsersRound :size="23"/></span><strong>{{ query ? 'No encontramos integrantes' : 'Aún no agregas integrantes' }}</strong><span>{{ query ? 'Prueba con otro nombre o documento.' : 'Agrega a tus hijos u otros familiares para centralizar sus documentos y servicios.' }}</span><button v-if="!query" class="add-button" type="button" @click="openCreate"><Plus :size="16"/> Agregar primer integrante</button></div>
    </section>

    <aside class="family-note"><ShieldCheck :size="18"/><p>Tu cuenta familiar te permite organizar la información de las personas a tu cargo desde una sola identidad PayID.</p></aside>

    <Teleport to="body"><Transition name="fade"><div v-if="linkedDetail" class="modal-backdrop linked-backdrop" @click.self="closeLinkedDetail"><section class="linked-modal" role="dialog" aria-modal="true" :aria-label="linkedDetailTitle"><header class="linked-modal-header"><span class="modal-icon"><component :is="linkedDetailIcon" :size="20"/></span><div><span class="eyebrow">CUENTA FAMILIAR</span><h2>{{ linkedDetailTitle }}</h2><p>{{ linkedDetail.name }} · {{ linkedDetailItems.length }} {{ linkedDetailItems.length === 1 ? 'registro' : 'registros' }}</p></div><button class="close-button" type="button" aria-label="Cerrar" @click="closeLinkedDetail"><X :size="19"/></button></header><div v-if="linkedDetailItems.length" class="linked-record-list"><article v-for="item in linkedDetailItems" :key="item.id" class="linked-record"><span class="record-icon"><component :is="linkedDetailIcon" :size="17"/></span><div class="record-copy"><strong>{{ linkedItemTitle(item) }}</strong><small>{{ linkedItemSubtitle(item) }}</small></div><span class="record-value">{{ linkedItemValue(item) }}</span></article></div><div v-else class="linked-empty"><span class="empty-icon"><component :is="linkedDetailIcon" :size="21"/></span><strong>No hay {{ linkedDetailTitle.toLowerCase() }} vinculados</strong><span>Los registros asociados a {{ linkedDetail.name }} aparecerán aquí.</span></div><footer class="linked-modal-footer"><button class="cancel-button" type="button" @click="closeLinkedDetail">Cerrar</button></footer></section></div></Transition></Teleport>

    <Teleport to="body"><Transition name="fade"><div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false"><section class="member-modal" role="dialog" aria-modal="true" :aria-label="editingId ? 'Editar integrante' : 'Agregar integrante'"><header class="modal-header"><span class="modal-icon"><UsersRound :size="20"/></span><div><h2>{{ editingId ? 'Editar integrante' : 'Agregar integrante' }}</h2><p>Registra los datos de la persona que tienes a cargo.</p></div><button class="close-button" type="button" aria-label="Cerrar" @click="modalOpen = false"><X :size="19"/></button></header><form class="member-form" @submit.prevent="saveMember"><label class="wide"><span>Nombre completo</span><input v-model.trim="form.name" required maxlength="160" autocomplete="name" placeholder="Nombre y apellidos"/></label><label><span>Parentesco</span><StyledSelect v-model="form.relationship" :options="relationshipOptions" placeholder="Selecciona parentesco" aria-label="Parentesco"/></label><label><span>Tipo de documento</span><StyledSelect v-model="form.documentType" :options="documentTypeOptions" placeholder="Selecciona tipo de documento" aria-label="Tipo de documento"/></label><label><span>Número de documento</span><input v-model.trim="form.documentNumber" required maxlength="32" autocomplete="off" placeholder="Número de identidad"/></label><label><span>Fecha de nacimiento</span><CalendarDatePicker v-model="form.birthDate" placeholder="dd/mm/aaaa" aria-label="Fecha de nacimiento"/></label><label class="wide"><span>Teléfono (opcional)</span><input v-model.trim="form.phone" type="tel" maxlength="32" autocomplete="tel" placeholder="+51"/></label><p v-if="error" class="form-error wide" role="alert">{{ error }}</p><footer class="modal-footer wide"><button class="cancel-button" type="button" @click="modalOpen = false">Cancelar</button><button class="save-button" type="submit" :disabled="saving">{{ saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar integrante' }}</button></footer></form></section></div></Transition></Teleport>
  </div>
</template>

<style scoped>
.family-page{max-width:1420px;margin:0 auto;padding:32px 34px 46px;color:#24352b}.family-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:23px}.eyebrow{color:#829187;font-size:10px;font-weight:750;letter-spacing:.13em}.family-heading h1{margin:7px 0 6px;color:#26392c;font-size:28px;letter-spacing:-.035em}.family-heading p,.panel-top p{margin:0;color:#7b8980;font-size:13px}.add-button,.save-button{display:inline-flex;min-height:43px;align-items:center;justify-content:center;gap:8px;padding:0 16px;border:1px solid #315a43;border-radius:11px;background:linear-gradient(135deg,#416f51,#294b36);color:#fff;font:650 12px inherit;box-shadow:0 5px 12px #315a4325;cursor:pointer;transition:transform .18s,box-shadow .18s,background .18s}.add-button:hover,.save-button:hover:not(:disabled){background:linear-gradient(135deg,#315a43,#1f3f2b);box-shadow:0 8px 18px #315a4335;transform:translateY(-1px)}.family-summary{display:flex;align-items:center;gap:14px;margin-bottom:18px;padding:17px 20px;border:1px solid #e5ebe6;border-radius:15px;background:#fff;box-shadow:0 5px 18px #17251b06}.summary-icon,.modal-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:#edf4ef;color:#416b4b}.summary-copy{display:flex;flex:1;flex-direction:column;gap:4px}.summary-copy strong{font-size:14px}.summary-copy span{color:#89958c;font-size:11px}.summary-badge{display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #e4ece5;border-radius:99px;color:#58735e;font-size:10px;font-weight:650}.members-panel{overflow:hidden;border:1px solid #e5ebe6;border-radius:16px;background:#fff;box-shadow:0 7px 24px #17251b08}.panel-top{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:21px 23px;border-bottom:1px solid #edf1ed}.panel-top h2{margin:0 0 5px;color:#2b3e31;font-size:16px}.panel-top p{font-size:11px}.search-box{display:flex;width:min(300px,38%);min-height:40px;align-items:center;gap:9px;padding:0 12px;border:1px solid #e2e9e3;border-radius:10px;background:#fafcfa;color:#87958b}.search-box input{width:100%;border:0;outline:0;background:transparent;color:#33443a;font:12px inherit}.members-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:19px}.member-card{min-width:0;padding:17px;border:1px solid #e8eee9;border-radius:13px;background:linear-gradient(145deg,#fff,#fbfdfb);transition:border-color .18s,box-shadow .18s,transform .18s}.member-card:hover{transform:translateY(-2px);border-color:#cdddcf;box-shadow:0 8px 22px #315a4310}.member-top{display:flex;align-items:center;gap:11px}.member-avatar{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:linear-gradient(145deg,#edf5ef,#e4eee6);color:#52795a}.member-identity{min-width:0;flex:1}.member-identity h3{overflow:hidden;margin:0 0 4px;color:#314336;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.member-identity span{color:#87938a;font-size:11px}.member-actions{display:flex;gap:5px;opacity:.55;transition:opacity .15s}.member-card:hover .member-actions,.member-actions:focus-within{opacity:1}.member-actions button,.close-button{display:grid;width:32px;height:32px;place-items:center;border:1px solid #e6ece7;border-radius:9px;background:#fff;color:#718078;cursor:pointer}.member-actions button:hover{border-color:#d6e5d8;background:#f3f8f4;color:#315a43}.member-actions button:last-child:hover{border-color:#efd5d2;background:#fff5f3;color:#b4544c}.member-document{display:flex;align-items:center;justify-content:space-between;margin:16px 0 13px;padding:10px 11px;border:1px solid #edf1ed;border-radius:9px;background:#f8faf8}.member-document span{color:#829087;font-size:10px}.member-document strong{color:#526359;font-size:11px;font-weight:650}.member-links{display:flex;flex-wrap:wrap;gap:7px}.member-links span{display:flex;align-items:center;gap:5px;padding:6px 8px;border:1px solid #edf1ed;border-radius:8px;color:#77847b;font-size:9px}.empty-state{display:flex;min-height:220px;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:30px;color:#8a968e;text-align:center;font-size:12px}.empty-state strong{color:#405147;font-size:14px}.empty-icon{display:grid;width:46px;height:46px;place-items:center;border-radius:14px;background:#eff5f0;color:#55785b}.empty-state .add-button{margin-top:8px}.error-state{color:#a4524b}.error-state button{border:0;background:transparent;color:#315a43;text-decoration:underline;cursor:pointer}.family-note{display:flex;align-items:flex-start;gap:10px;margin-top:16px;padding:13px 15px;border:1px solid #e5ebe6;border-radius:12px;background:#f9fbf9;color:#64806a}.family-note svg{flex:none;margin-top:1px}.family-note p{margin:0;color:#78867d;font-size:11px;line-height:1.6}.modal-backdrop{position:fixed;inset:0;z-index:9990;display:grid;place-items:center;overflow:auto;padding:20px;background:#14231bb8;backdrop-filter:blur(4px)}.member-modal{width:min(100%,570px);overflow:hidden;border:1px solid #e6ece7;border-radius:18px;background:#fff;box-shadow:0 24px 70px #10231842;animation:modal-in .22s cubic-bezier(.2,.8,.2,1)}@keyframes modal-in{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}.modal-header{display:flex;align-items:center;gap:12px;padding:20px 22px;border-bottom:1px solid #edf1ed}.modal-header>div{min-width:0;flex:1}.modal-header h2{margin:0;color:#2d4033;font-size:16px}.modal-header p{margin:4px 0 0;color:#89958c;font-size:11px}.close-button:hover{background:#f5f8f5;color:#315a43}.member-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 22px}.member-form label{display:flex;min-width:0;flex-direction:column;gap:7px;color:#56655a;font-size:11px;font-weight:650}.member-form label.wide,.wide{grid-column:1/-1}.member-form input,.member-form select{width:100%;height:42px;padding:0 11px;border:1px solid #dfe7e0;border-radius:9px;background:#fbfcfb;color:#34443a;font:12px inherit;outline:none}.member-form input:focus,.member-form select:focus{border-color:#83a98a;background:#fff;box-shadow:0 0 0 3px #315a4312}.form-error{margin:0;color:#b24c47;font-size:11px}.modal-footer{display:flex;justify-content:flex-end;gap:9px;padding-top:14px;border-top:1px solid #edf1ed}.cancel-button{min-height:40px;padding:0 14px;border:1px solid #e1e7e2;border-radius:9px;background:#fff;color:#627067;font:600 11px inherit;cursor:pointer}.save-button{min-height:40px;border-radius:9px}.save-button:disabled{opacity:.65;cursor:wait}.fade-enter-active,.fade-leave-active{transition:opacity .18s}.fade-enter-from,.fade-leave-to{opacity:0}
@media(max-width:760px){.family-page{padding:22px 16px 34px}.family-heading{align-items:flex-start;flex-direction:column}.family-heading h1{font-size:24px}.panel-top{align-items:stretch;flex-direction:column}.search-box{width:100%}.members-grid{grid-template-columns:1fr;padding:13px}.summary-badge{display:none}}@media(max-width:480px){.member-form{grid-template-columns:1fr;padding:17px}.member-form label.wide,.wide{grid-column:auto}.modal-footer{grid-column:auto}.modal-backdrop{align-items:end;padding:0}.member-modal{width:100%;max-height:92dvh;overflow:auto;border-radius:18px 18px 0 0}.modal-header{padding:17px}.family-summary{padding:14px}}
</style>

<style scoped>
.member-links button{display:flex;align-items:center;gap:5px;padding:6px 8px;border:1px solid #edf1ed;border-radius:8px;background:#fff;color:#64736a;font:inherit;font-size:10px;cursor:pointer;transition:background .16s,border-color .16s,color .16s,transform .16s}
.member-links button.is-populated{border-color:#d7e7da;background:#eff6f0;color:#3f7049}.member-links button.is-empty{border-color:#e8ebe8;background:#f7f8f7;color:#939d96}.member-links button.is-empty svg{color:#a4ada6}
.member-links button:hover{transform:translateY(-1px);border-color:#cbdccf;background:#f3f8f4;color:#315a43}
.member-links button.is-empty:hover{border-color:#d8dfd9;background:#f0f3f0;color:#66736a}
.linked-backdrop{z-index:10010}
.linked-modal{width:min(100%,590px);overflow:hidden;border:1px solid #e6ece7;border-radius:18px;background:#fff;box-shadow:0 24px 70px #10231842;animation:modal-in .22s cubic-bezier(.2,.8,.2,1)}
.linked-modal-header{display:flex;align-items:center;gap:13px;padding:20px 22px;border-bottom:1px solid #edf1ed;background:linear-gradient(180deg,#fff,#fbfcfb)}
.linked-modal-header>div{min-width:0;flex:1}.linked-modal-header .eyebrow{font-size:9px}.linked-modal-header h2{margin:4px 0;color:#2d4033;font-size:19px}.linked-modal-header p{margin:0;color:#89958c;font-size:11px}
.linked-record-list{display:grid;max-height:min(52dvh,430px);gap:8px;overflow:auto;padding:16px 20px}
.linked-record{display:flex;align-items:center;gap:11px;min-width:0;padding:12px;border:1px solid #e9efea;border-radius:11px;background:#fcfdfc}
.record-icon{display:grid;width:36px;height:36px;flex:none;place-items:center;border-radius:10px;background:#edf4ef;color:#52775a}.record-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.record-copy strong{overflow:hidden;color:#34463a;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.record-copy small{color:#89958c;font-size:10px}.record-value{flex:none;color:#41664a;font-size:11px;font-weight:700;text-align:right}
.linked-empty{display:flex;min-height:205px;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:25px;text-align:center;color:#89958c;font-size:11px}.linked-empty strong{color:#405147;font-size:14px}.linked-modal-footer{display:flex;justify-content:flex-end;padding:13px 20px 17px;border-top:1px solid #edf1ed;background:#fbfcfb}.fade-enter-active .linked-modal,.fade-leave-active .linked-modal{transition:transform .2s ease,opacity .2s ease}.fade-enter-from .linked-modal,.fade-leave-to .linked-modal{transform:translateY(10px) scale(.985);opacity:0}
.member-skeleton{position:relative;display:grid;grid-template-columns:44px 1fr;grid-template-rows:20px 36px 28px;gap:12px;min-height:155px;padding:17px;border:1px solid #e8eee9;border-radius:13px;overflow:hidden;background:#fff}.skeleton-line{position:relative;overflow:hidden;border-radius:8px;background:#edf1ee}.skeleton-line::after{position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,#fff9,transparent);content:"";animation:skeleton-shimmer 1.25s ease-in-out infinite}.skeleton-avatar{grid-row:1/3;width:42px;height:42px;border-radius:12px}.skeleton-name{align-self:center;width:55%;height:14px}.skeleton-document{grid-column:1/-1;height:36px;margin-top:8px}.skeleton-actions{grid-column:1/-1;width:60%;height:27px}@keyframes skeleton-shimmer{100%{transform:translateX(100%)}}
@media(max-width:760px){.linked-modal{width:min(100%,540px)}}@media(max-width:480px){.linked-backdrop{align-items:end;padding:0}.linked-modal{width:100%;max-height:88dvh;border-radius:18px 18px 0 0}.linked-modal-header{padding:17px}.linked-record-list{padding:13px}.linked-record{gap:8px;padding:10px}.record-value{font-size:10px}}
@media(prefers-reduced-motion:reduce){.skeleton-line::after{animation:none}.linked-modal{animation:none}}
</style>
