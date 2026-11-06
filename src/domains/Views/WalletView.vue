<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Activity, BadgeCheck, Banknote, BusFront, CalendarDays, CreditCard, FileBadge, FileText, GraduationCap, Landmark, Pencil, Plus, Search, ShieldCheck, Trash2, WalletCards, X } from 'lucide-vue-next'
import { deleteWalletCard, listFamilyMembers, listWalletCards, saveWalletCard } from '@/shared/services/payidRepository.js'
import StyledSelect from '@/shared/ui/StyledSelect.component.vue'
import CalendarDatePicker from '@/shared/ui/CalendarDatePicker.component.vue'

const cards = ref([])
const familyMembers = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const query = ref('')
const categoryFilter = ref('all')
const statusFilter = ref('all')
const modalOpen = ref(false)
const editingId = ref(null)
const deleteTarget = ref(null)
const profileName = ref('')
const form = reactive(blankForm())

function blankForm() {
  return { category: 'bank', instrumentType: 'Crédito', issuer: '', network: 'Visa', label: '', familyMemberId: '', identifier: '', expiresOn: '', balance: '', status: 'active', notes: '' }
}

const categories = [
  { value: 'bank', label: 'Bancos y pagos', icon: CreditCard },
  { value: 'transport', label: 'Transporte', icon: BusFront },
  { value: 'identity', label: 'Identidad', icon: FileText },
  { value: 'student', label: 'Estudios', icon: GraduationCap },
  { value: 'membership', label: 'Membresías', icon: BadgeCheck },
  { value: 'other', label: 'Otras tarjetas', icon: WalletCards },
]
const categoryOptions = [{ value: 'all', label: 'Todas las categorías' }, ...categories.map(({ value, label }) => ({ value, label }))]
const statusOptions = [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activas' }, { value: 'pending', label: 'Pendientes' }, { value: 'blocked', label: 'Bloqueadas' }, { value: 'expired', label: 'Vencidas' }]
const statusFormOptions = statusOptions.filter(option => option.value !== 'all')
const networkOptions = ['Visa', 'Mastercard', 'American Express', 'Diners Club', 'Otra red'].map(value => ({ value, label: value }))
const instrumentOptions = computed(() => {
  const options = {
    bank: ['Crédito', 'Débito', 'Prepago'],
    transport: ['Metropolitano', 'Línea 1', 'Lima Pass', 'Corredores', 'Otro transporte'],
    identity: ['DNI', 'Carnet de extranjería', 'Pasaporte', 'Otro documento'],
    student: ['Carnet universitario', 'Credencial estudiantil', 'Otro'],
    membership: ['Puntos y beneficios', 'Membresía', 'Club', 'Otro'],
    other: ['Acceso', 'Beneficios', 'Otra tarjeta'],
  }
  return (options[form.category] || options.other).map(value => ({ value, label: value }))
})
const familyOptions = computed(() => [{ value: '', label: `Mi cuenta${profileName.value ? ` · ${profileName.value}` : ''}` }, ...familyMembers.value.map(member => ({ value: member.id, label: `${member.name} · ${member.relationship}` }))])
const filteredCards = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('es')
  return cards.value.filter(card => {
    const typeMatch = categoryFilter.value === 'all' || card.category === categoryFilter.value
    const statusMatch = statusFilter.value === 'all' || effectiveStatus(card) === statusFilter.value
    const searchMatch = !search || [card.label, card.issuer, card.instrument_type, card.holder_name, card.identifier].join(' ').toLocaleLowerCase('es').includes(search)
    return typeMatch && statusMatch && searchMatch
  })
})
const activeCount = computed(() => cards.value.filter(card => effectiveStatus(card) === 'active').length)
const expiredCount = computed(() => cards.value.filter(card => effectiveStatus(card) === 'expired').length)
const balanceTotal = computed(() => cards.value.reduce((sum, card) => sum + (Number(card.balance) || 0), 0))

function categoryLabel(value) { return categories.find(category => category.value === value)?.label || 'Otras tarjetas' }
function categoryIcon(value) { return categories.find(category => category.value === value)?.icon || WalletCards }
function ownerLabel(card) { return card.family_member_id ? familyMembers.value.find(member => member.id === card.family_member_id)?.name || card.holder_name : card.holder_name || profileName.value || 'Mi cuenta' }
function effectiveStatus(card) {
  if (card.expires_on && new Date(`${card.expires_on.slice(0, 10)}T23:59:59`) < new Date()) return 'expired'
  return card.status || 'active'
}
function statusLabel(value) { return ({ active: 'Activa', pending: 'Pendiente', blocked: 'Bloqueada', expired: 'Vencida' })[value] || 'Activa' }
function formatDate(value) {
  if (!value) return 'Sin vencimiento'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 'Sin vencimiento' : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
function formatMoney(value) { return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function maskedIdentifier(card) {
  const value = String(card.identifier || '')
  return card.category === 'bank' ? `•••• ${value.slice(-4)}` : `•••• ${value.slice(-4)}`
}
function loadForm(card = null) {
  editingId.value = card?.id || null
  Object.assign(form, blankForm(), card ? {
    category: card.category,
    instrumentType: card.instrument_type,
    issuer: card.issuer,
    network: card.network || '',
    label: card.label,
    familyMemberId: card.family_member_id || '',
    identifier: card.identifier,
    expiresOn: card.expires_on || '',
    balance: card.balance ?? '',
    status: effectiveStatus(card),
    notes: card.notes || '',
  } : {})
  modalOpen.value = true
  error.value = ''
}
function onCategoryChange() {
  form.instrumentType = instrumentOptions.value[0]?.value || ''
  if (form.category === 'transport') form.issuer = form.instrumentType
  else if (form.category === 'identity') form.issuer = 'Registro personal'
  else form.issuer = ''
}
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [wallet, members] = await Promise.all([listWalletCards(), listFamilyMembers()])
    cards.value = wallet
    familyMembers.value = members
    try {
      const user = JSON.parse(localStorage.getItem('kapakid:user') || 'null') || {}
      profileName.value = user.nombre || user.name || user.email?.split('@')[0] || 'Mi cuenta'
    } catch { profileName.value = 'Mi cuenta' }
  } catch (cause) { error.value = cause.message || 'No se pudo cargar tu billetera digital.' }
  finally { loading.value = false }
}
async function saveCard() {
  error.value = ''
  if (!form.instrumentType || !form.issuer.trim() || !form.label.trim() || !form.identifier.trim()) { error.value = 'Completa emisor, nombre e identificador.'; return }
  if (form.category === 'bank' && !/^\d{4}$/.test(form.identifier.trim())) { error.value = 'Por seguridad, registra únicamente los últimos 4 dígitos de la tarjeta bancaria.'; return }
  if (form.balance !== '' && (!Number.isFinite(Number(form.balance)) || Number(form.balance) < 0)) { error.value = 'Ingresa un saldo válido.'; return }
  saving.value = true
  try {
    const member = familyMembers.value.find(item => item.id === form.familyMemberId)
    const saved = await saveWalletCard({ ...form, holderName: member?.name || profileName.value }, editingId.value)
    if (editingId.value) cards.value = cards.value.map(card => card.id === saved.id ? saved : card)
    else cards.value = [saved, ...cards.value]
    modalOpen.value = false
  } catch (cause) { error.value = cause.message || 'No se pudo guardar la tarjeta o credencial.' }
  finally { saving.value = false }
}
async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteWalletCard(deleteTarget.value.id)
    cards.value = cards.value.filter(card => card.id !== deleteTarget.value.id)
    deleteTarget.value = null
  } catch (cause) { error.value = cause.message || 'No se pudo quitar este elemento de tu billetera.' }
}
onMounted(loadData)
</script>

<template>
  <main class="wallet-page">
    <header class="wallet-heading"><div><span class="wallet-eyebrow"><WalletCards :size="15" /> PAYID · BILLETERA DIGITAL</span><h1>Mis tarjetas y credenciales</h1><p>Organiza en un solo lugar tus tarjetas bancarias, transporte, documentos y membresías.</p></div><button class="wallet-primary" type="button" @click="loadForm()"><Plus :size="17" /> Vincular elemento</button></header>

    <section class="wallet-summary">
      <article><span class="wallet-summary-icon"><WalletCards :size="19" /></span><div><small>Elementos guardados</small><strong>{{ cards.length }}</strong><span>Tarjetas y credenciales</span></div></article>
      <article><span class="wallet-summary-icon active"><ShieldCheck :size="19" /></span><div><small>Activos</small><strong>{{ activeCount }}</strong><span>Disponibles en tu cartera</span></div></article>
      <article><span class="wallet-summary-icon expired"><CalendarDays :size="19" /></span><div><small>Por revisar</small><strong>{{ expiredCount }}</strong><span>Vencidos o bloqueados</span></div></article>
      <article><span class="wallet-summary-icon balance"><Banknote :size="19" /></span><div><small>Saldos asociados</small><strong>{{ formatMoney(balanceTotal) }}</strong><span>Montos registrados</span></div></article>
    </section>

    <section class="wallet-panel">
      <header class="wallet-panel-heading"><div><span class="wallet-kicker">TU CARTERA PAYID</span><h2>Elementos vinculados</h2><p>Identifica cada tarjeta por emisor, tipo y titular.</p></div><span class="wallet-total"><CreditCard :size="15" /> {{ filteredCards.length }} elementos</span></header>
      <div class="wallet-toolbar"><label class="wallet-search"><Search :size="17" /><input v-model="query" type="search" placeholder="Buscar emisor, tarjeta o titular..." aria-label="Buscar en la billetera" /></label><StyledSelect v-model="categoryFilter" :options="categoryOptions" aria-label="Filtrar por categoría" /><StyledSelect v-model="statusFilter" :options="statusOptions" aria-label="Filtrar por estado" /></div>
      <div v-if="error && !cards.length && !loading" class="wallet-error"><span>{{ error }}</span><button type="button" @click="loadData">Reintentar</button></div>
      <div v-else-if="loading" class="wallet-grid" aria-label="Cargando billetera"><article v-for="index in 4" :key="index" class="wallet-skeleton"><span></span><i></i><i></i><i></i></article></div>
      <div v-else-if="filteredCards.length" class="wallet-grid">
        <article v-for="card in filteredCards" :key="card.id" class="wallet-item" :class="`category-${card.category}`">
          <div class="wallet-item-top"><span class="wallet-item-icon"><component :is="categoryIcon(card.category)" :size="19" /></span><span class="wallet-category-tag">{{ categoryLabel(card.category) }}</span><div class="wallet-item-actions"><button type="button" :aria-label="`Editar ${card.label}`" title="Editar" @click="loadForm(card)"><Pencil :size="15" /></button><button type="button" :aria-label="`Quitar ${card.label}`" title="Quitar" @click="deleteTarget = card"><Trash2 :size="15" /></button></div></div>
          <div class="wallet-item-title"><strong>{{ card.label }}</strong><span>{{ [card.issuer, card.network, card.instrument_type].filter(Boolean).join(' · ') }}</span></div>
          <div class="wallet-item-number"><small>IDENTIFICADOR</small><strong>{{ maskedIdentifier(card) }}</strong></div>
          <div class="wallet-item-meta"><span><small>TITULAR</small><strong>{{ ownerLabel(card) }}</strong></span><span><small>VIGENCIA</small><strong>{{ formatDate(card.expires_on) }}</strong></span></div>
          <footer><span class="wallet-status" :class="effectiveStatus(card)"><i></i>{{ statusLabel(effectiveStatus(card)) }}</span><span v-if="card.balance != null" class="wallet-balance">{{ formatMoney(card.balance) }}</span><button type="button" class="wallet-details" @click="loadForm(card)">Ver / editar</button></footer>
        </article>
      </div>
      <div v-else class="wallet-empty"><span><WalletCards :size="23" /></span><strong>{{ cards.length ? 'No hay elementos con esos filtros' : 'Tu billetera está lista para empezar' }}</strong><p>{{ cards.length ? 'Prueba con otra búsqueda o categoría.' : 'Agrega una tarjeta bancaria, de transporte, un documento o una membresía.' }}</p><button type="button" @click="cards.length ? (query = '', categoryFilter = 'all', statusFilter = 'all') : loadForm()">{{ cards.length ? 'Limpiar filtros' : 'Vincular primer elemento' }}</button></div>
    </section>

    <Transition name="wallet-fade"><div v-if="modalOpen" class="wallet-backdrop" @click.self="modalOpen = false"><section class="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title"><header><span class="wallet-modal-icon"><CreditCard :size="19" /></span><div><h2 id="wallet-modal-title">{{ editingId ? 'Editar elemento' : 'Vincular a mi billetera' }}</h2><p>Registra quién la emite y a quién pertenece.</p></div><button type="button" aria-label="Cerrar" @click="modalOpen = false"><X :size="18" /></button></header>
      <form @submit.prevent="saveCard"><div class="wallet-modal-body"><div class="wallet-form-grid">
        <label class="wide">Categoría<StyledSelect v-model="form.category" :options="categories.map(({ value, label }) => ({ value, label }))" aria-label="Categoría del elemento" @update:model-value="onCategoryChange" /></label>
        <label>Tipo<StyledSelect v-model="form.instrumentType" :options="instrumentOptions" aria-label="Tipo de tarjeta o credencial" @update:model-value="value => { if (form.category === 'transport') form.issuer = value }" /></label>
        <label>Emisor / entidad<input v-model.trim="form.issuer" maxlength="80" :placeholder="form.category === 'bank' ? 'Ej. BCP, BBVA, Interbank' : form.category === 'transport' ? 'Ej. Metropolitano, Línea 1' : 'Entidad que la emite'" required /></label>
        <label v-if="form.category === 'bank'">Red de pago<StyledSelect v-model="form.network" :options="networkOptions" aria-label="Red de la tarjeta bancaria" /></label><label>Estado<StyledSelect v-model="form.status" :options="statusFormOptions" aria-label="Estado del elemento" /></label>
        <label class="wide">Nombre para identificarla<input v-model.trim="form.label" maxlength="80" placeholder="Ej. Visa de ahorros, DNI de Armil" required /></label>
        <label class="wide">Asignar a<StyledSelect v-model="form.familyMemberId" :options="familyOptions" aria-label="Titular de la tarjeta o credencial" /></label>
        <label class="wide">{{ form.category === 'bank' ? 'Últimos 4 dígitos' : form.category === 'identity' ? 'Número de documento' : 'Número o código de tarjeta' }}<input v-model.trim="form.identifier" :maxlength="form.category === 'bank' ? 4 : 64" :inputmode="form.category === 'bank' ? 'numeric' : 'text'" :placeholder="form.category === 'bank' ? '1234' : 'Ingresa el identificador'" required /><small v-if="form.category === 'bank'" class="wallet-hint">Por seguridad, solo guardamos los últimos cuatro dígitos. No ingreses CVV.</small></label>
        <label>Vigencia / vencimiento<CalendarDatePicker v-model="form.expiresOn" placeholder="dd/mm/aaaa" aria-label="Fecha de vencimiento" /></label>
        <label>Saldo asociado (S/)<input v-model="form.balance" type="number" min="0" step="0.01" placeholder="Opcional" /></label>
        <label class="wide">Nota opcional<input v-model.trim="form.notes" maxlength="180" placeholder="Información útil para reconocerla" /></label>
      </div><p v-if="error" class="wallet-form-error" role="alert">{{ error }}</p></div><footer><button class="wallet-cancel" type="button" @click="modalOpen = false">Cancelar</button><button class="wallet-primary" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Vincular elemento' }}</button></footer></form>
    </section></div></Transition>

    <Transition name="wallet-fade"><div v-if="deleteTarget" class="wallet-backdrop" @click.self="deleteTarget = null"><section class="wallet-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="wallet-delete-title"><header><span class="delete-icon"><Trash2 :size="19" /></span><h2 id="wallet-delete-title">Quitar de tu billetera</h2><p>Se eliminará “{{ deleteTarget.label }}” de los elementos guardados.</p></header><footer><button class="wallet-cancel" type="button" @click="deleteTarget = null">Cancelar</button><button class="wallet-delete-button" type="button" @click="confirmDelete">Quitar elemento</button></footer></section></div></Transition>
  </main>
</template>

<style>
.wallet-page{--wallet-green:#315a43;--wallet-ink:#23352a;--wallet-muted:#7b887f;--wallet-line:#e5ebe6;max-width:1480px;margin:0 auto;padding:28px 32px 44px;color:var(--wallet-ink)}.wallet-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.wallet-eyebrow,.wallet-kicker{display:flex;align-items:center;gap:8px;color:#849188;font-size:10px;font-weight:750;letter-spacing:.11em}.wallet-eyebrow svg{color:#52775a}.wallet-heading h1{margin:8px 0 5px;color:#26382c;font-size:28px;letter-spacing:-.035em}.wallet-heading p,.wallet-panel-heading p{margin:0;color:#7d8981;font-size:13px}.wallet-primary{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:8px;padding:0 15px;border:1px solid #315a43;border-radius:10px;background:linear-gradient(135deg,#426e50,#294b36);color:#fff;font-family:inherit;font-size:11px;font-weight:650;cursor:pointer;box-shadow:0 4px 12px #315a4320;transition:transform .16s,box-shadow .16s}.wallet-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 7px 16px #315a4330}.wallet-primary:disabled{opacity:.6;cursor:wait}.wallet-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:18px}.wallet-summary article{display:flex;min-height:96px;align-items:center;gap:13px;padding:15px 16px;border:1px solid var(--wallet-line);border-radius:14px;background:#fff;box-shadow:0 4px 15px #1b352209}.wallet-summary-icon{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:12px;background:#eef3fb;color:#6482a5}.wallet-summary-icon.active{background:#edf5ee;color:#51815b}.wallet-summary-icon.expired{background:#fbf3e8;color:#b7803b}.wallet-summary-icon.balance{background:#f2eff9;color:#8170a2}.wallet-summary article>div{display:flex;min-width:0;flex-direction:column;gap:2px}.wallet-summary small{color:#78857c;font-size:11px}.wallet-summary strong{color:#2c3e31;font-size:22px;letter-spacing:-.03em}.wallet-summary article>div span{color:#9aa49c;font-size:9px}.wallet-panel{overflow:hidden;border:1px solid var(--wallet-line);border-radius:16px;background:#fff;box-shadow:0 7px 23px #1b35220a}.wallet-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px 16px}.wallet-panel-heading h2{margin:5px 0;color:#304235;font-size:17px}.wallet-total{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #e7ece8;border-radius:999px;background:#fafcfa;color:#748178;font-size:10px}.wallet-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 210px 185px;gap:10px;padding:0 22px 18px}.wallet-search{display:flex;min-width:0;height:42px;align-items:center;gap:9px;padding:0 12px;border:1px solid #e0e7e1;border-radius:9px;background:#f8faf8;color:#8a988e}.wallet-search:focus-within{border-color:#8baa90;box-shadow:0 0 0 3px #315a4312}.wallet-search input{width:100%;border:0;outline:0;background:transparent;color:#34463a;font:12px inherit}.wallet-search input::placeholder{color:#9aa59d}.wallet-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;padding:0 22px 22px}.wallet-item{position:relative;display:flex;min-width:0;min-height:225px;flex-direction:column;padding:15px;border:1px solid #e6ece7;border-radius:14px;background:linear-gradient(145deg,#fff,#fbfdfb);transition:transform .17s,border-color .17s,box-shadow .17s}.wallet-item:hover{transform:translateY(-2px);border-color:#cbdccc;box-shadow:0 9px 20px #315a4310}.wallet-item-top{display:flex;align-items:center;gap:8px}.wallet-item-icon{display:grid;width:35px;height:35px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#557b5e}.category-transport .wallet-item-icon{background:#edf3fb;color:#5c7fa4}.category-identity .wallet-item-icon{background:#fbf3e8;color:#ae7c3a}.category-student .wallet-item-icon{background:#f0eff9;color:#786da4}.category-membership .wallet-item-icon{background:#fdf0ed;color:#b36f65}.wallet-category-tag{overflow:hidden;padding:5px 7px;border-radius:7px;background:#f3f6f3;color:#768379;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.wallet-item-actions{display:flex;gap:5px;margin-left:auto}.wallet-item-actions button{display:grid;width:29px;height:29px;place-items:center;border:1px solid #e6ece7;border-radius:8px;background:#fff;color:#7d8b81;cursor:pointer;transition:.15s}.wallet-item-actions button:hover{border-color:#cdddcf;background:#f4f8f4;color:#315a43}.wallet-item-actions button:last-child:hover{border-color:#efd3d0;background:#fff5f3;color:#b65750}.wallet-item-title{display:flex;min-width:0;flex-direction:column;gap:4px;margin:13px 0 15px}.wallet-item-title strong{overflow:hidden;color:#304135;font-size:14px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.wallet-item-title span{overflow:hidden;color:#89958c;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.wallet-item-number{display:flex;flex-direction:column;gap:5px;padding:10px 11px;border:1px solid #edf1ed;border-radius:9px;background:#f8faf8}.wallet-item-number small,.wallet-item-meta small{color:#98a29a;font-size:8px;font-weight:700;letter-spacing:.1em}.wallet-item-number strong{color:#3c5041;font-size:12px;font-weight:650;letter-spacing:.07em}.wallet-item-meta{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}.wallet-item-meta>span{display:flex;min-width:0;flex-direction:column;gap:4px}.wallet-item-meta strong{overflow:hidden;color:#5c6c60;font-size:9px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.wallet-item>footer{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid #edf1ed}.wallet-status{display:inline-flex;align-items:center;gap:5px;padding:5px 7px;border-radius:7px;background:#eef5ef;color:#4c7854;font-size:9px;font-weight:650}.wallet-status i{width:6px;height:6px;border-radius:50%;background:#75a77c}.wallet-status.pending{background:#fbf4e8;color:#a87b3e}.wallet-status.pending i{background:#d2a259}.wallet-status.blocked,.wallet-status.expired{background:#fbefed;color:#a65d55}.wallet-status.blocked i,.wallet-status.expired i{background:#c87a71}.wallet-balance{margin-left:auto;color:#3e6146;font-size:10px;font-weight:700}.wallet-details{margin-left:auto;padding:5px 7px;border:0;background:transparent;color:#55775c;font-family:inherit;font-size:9px;font-weight:650;cursor:pointer}.wallet-balance+.wallet-details{margin-left:0}.wallet-details:hover{text-decoration:underline}.wallet-empty{display:flex;min-height:250px;flex-direction:column;align-items:center;justify-content:center;padding:25px;text-align:center}.wallet-empty>span{display:grid;width:48px;height:48px;place-items:center;margin-bottom:11px;border-radius:14px;background:#edf4ef;color:#5c8063}.wallet-empty strong{color:#34463a;font-size:14px}.wallet-empty p{max-width:440px;margin:6px 0 13px;color:#86928a;font-size:11px;line-height:1.5}.wallet-empty button,.wallet-error button{padding:8px 11px;border:1px solid #dce7dd;border-radius:8px;background:#fff;color:#42694a;font-family:inherit;font-size:10px;font-weight:650;cursor:pointer}.wallet-error{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;color:#a14f49;font-size:12px}.wallet-skeleton{display:flex;min-height:215px;flex-direction:column;gap:12px;padding:16px;border:1px solid #ebefec;border-radius:14px;background:#fff}.wallet-skeleton span,.wallet-skeleton i{display:block;border-radius:7px;background:linear-gradient(90deg,#f0f3f0 20%,#e5ebe6 40%,#f0f3f0 60%);background-size:220% 100%;animation:wallet-shimmer 1.3s ease-in-out infinite}.wallet-skeleton span{width:36px;height:36px;border-radius:11px}.wallet-skeleton i{height:13px}.wallet-skeleton i:nth-child(2){width:65%;margin-top:9px}.wallet-skeleton i:nth-child(3){width:88%}.wallet-skeleton i:nth-child(4){width:50%}@keyframes wallet-shimmer{to{background-position:-220% 0}}.wallet-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;overflow:auto;padding:20px;background:#18271eb8;backdrop-filter:blur(4px)}.wallet-modal,.wallet-delete-modal{width:min(100%,610px);overflow:hidden;border:1px solid #e4eae5;border-radius:18px;background:#fff;box-shadow:0 26px 75px #10231840;animation:wallet-modal-in .2s ease-out both}@keyframes wallet-modal-in{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}.wallet-modal>header{display:flex;align-items:center;gap:11px;padding:18px 20px;border-bottom:1px solid #edf1ed}.wallet-modal-icon,.delete-icon{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:11px;background:#edf4ef;color:#507757}.wallet-modal>header>div{min-width:0;flex:1}.wallet-modal h2,.wallet-delete-modal h2{margin:0;color:#304235;font-size:15px}.wallet-modal header p,.wallet-delete-modal header p{margin:4px 0 0;color:#87938a;font-size:10px}.wallet-modal>header>button{display:grid;width:32px;height:32px;place-items:center;border:1px solid #e4eae5;border-radius:8px;background:#fff;color:#738078;cursor:pointer}.wallet-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:18px 20px}.wallet-form-grid label{display:flex;min-width:0;flex-direction:column;gap:6px;color:#536258;font-size:10px;font-weight:650}.wallet-form-grid .wide{grid-column:1/-1}.wallet-form-grid input{width:100%;height:40px;padding:0 10px;border:1px solid #dfe7e0;border-radius:9px;background:#fafcfa;color:#35463a;font:12px inherit;outline:0}.wallet-form-grid input:focus{border-color:#88a98e;background:#fff;box-shadow:0 0 0 3px #315a4310}.wallet-hint{color:#89968c;font-size:9px;font-weight:450;line-height:1.4}.wallet-form-error{margin:0;padding:0 20px 12px;color:#b14e49;font-size:10px}.wallet-modal form>footer,.wallet-delete-modal>footer{display:flex;justify-content:flex-end;gap:9px;padding:13px 20px;border-top:1px solid #edf1ed;background:#fbfcfb}.wallet-cancel,.wallet-delete-button{min-height:38px;padding:0 13px;border:1px solid #e0e7e1;border-radius:9px;background:#fff;color:#67756b;font-family:inherit;font-size:10px;font-weight:650;cursor:pointer}.wallet-primary[type=submit]{min-height:38px;font-size:10px}.wallet-delete-modal{width:min(100%,410px)}.wallet-delete-modal>header{display:flex;flex-direction:column;align-items:flex-start;padding:22px}.wallet-delete-modal h2{margin-top:3px}.wallet-delete-modal>footer{padding:13px 22px}.delete-icon{background:#fbefed;color:#b05c53}.wallet-delete-button{border-color:#ad554c;background:#ad554c;color:#fff}.wallet-fade-enter-active,.wallet-fade-leave-active{transition:opacity .18s}.wallet-fade-enter-from,.wallet-fade-leave-to{opacity:0}
@media(max-width:960px){.wallet-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.wallet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.wallet-page{padding:22px 16px 32px}.wallet-heading{align-items:flex-start}.wallet-heading h1{font-size:23px}.wallet-heading p{max-width:45ch;font-size:11px}.wallet-primary{min-height:38px;padding:0 10px;font-size:10px}.wallet-toolbar{grid-template-columns:1fr 1fr;padding:0 15px 14px}.wallet-search{grid-column:1/-1}.wallet-panel-heading{padding:18px 15px 14px}.wallet-grid{gap:9px;padding:0 15px 15px}}
@media(max-width:520px){.wallet-page{padding:18px 12px 26px}.wallet-heading{flex-direction:column}.wallet-summary{gap:8px}.wallet-summary article{min-height:78px;padding:10px}.wallet-summary-icon{width:34px;height:34px}.wallet-summary strong{font-size:19px}.wallet-grid{grid-template-columns:1fr}.wallet-toolbar{grid-template-columns:1fr}.wallet-search{grid-column:auto}.wallet-item{min-height:215px}.wallet-form-grid{grid-template-columns:1fr;padding:15px}.wallet-form-grid .wide{grid-column:auto}.wallet-modal>header{padding:15px}.wallet-modal form>footer{padding:12px 15px}}
@media(prefers-reduced-motion:reduce){.wallet-item,.wallet-primary,.wallet-skeleton span,.wallet-skeleton i{animation:none!important;transition:none!important}}
</style>

<style>
.wallet-modal{display:flex;max-height:min(82vh,690px);flex-direction:column;overflow:hidden}
.wallet-modal>header,.wallet-modal form>footer{flex:none}
.wallet-modal form{display:flex;min-height:0;flex:1;flex-direction:column;overflow:hidden}
.wallet-modal-body{min-height:0;flex:1;overflow:auto;padding:16px 20px 12px;scrollbar-color:#aab9ad #f2f5f2;scrollbar-width:thin}
.wallet-modal-body::-webkit-scrollbar{width:8px}
.wallet-modal-body::-webkit-scrollbar-track{margin:6px 2px;border-radius:99px;background:#f2f5f2}
.wallet-modal-body::-webkit-scrollbar-thumb{border:2px solid #f2f5f2;border-radius:99px;background:#aab9ad}
.wallet-modal-body::-webkit-scrollbar-thumb:hover{background:#829888}
.wallet-modal .wallet-form-grid{padding:0}
.wallet-modal .wallet-form-error{padding:0 0 10px}
@media(max-width:700px){.wallet-modal{max-height:88vh}}
@media(max-width:520px){.wallet-modal-body{padding:15px}.wallet-modal .wallet-form-grid .wide{grid-column:auto}}
</style>
