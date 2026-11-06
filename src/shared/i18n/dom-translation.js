// Bridges legacy, non-i18n Vue screens while they are migrated to vue-i18n.
// Only translates known interface copy; user entered content is left untouched.
const phrases = {
  'Mi familia': 'My family', 'Billetera digital': 'Digital wallet', 'Credencial estudiantil': 'Student ID',
  'Mi cuenta': 'My account', 'Identidad PayID': 'PayID identity', 'NAVEGACIÓN': 'NAVIGATION',
  'IDENTIDAD FAMILIAR': 'FAMILY IDENTITY', 'Organiza en PayID la identidad y los servicios de las personas que tienes a cargo.': 'Organize the identity and services of the people in your care with PayID.',
  'Agregar integrante': 'Add family member', 'Agregar primer integrante': 'Add your first family member', 'Personas vinculadas a tu cuenta familiar': 'People linked to your family account', 'Cuenta PayID protegida': 'Protected PayID account',
  'Personas a tu cargo': 'People in your care', 'Agrega familiares para organizar sus documentos, medios de pago y tarjetas de transporte.': 'Add family members to organize their documents, payment methods, and transit cards.',
  'Buscar integrante...': 'Search family members...', 'Reintentar': 'Try again', 'Editar integrante': 'Edit family member', 'Quitar integrante': 'Remove family member',
  'documentos': 'documents', 'pagos': 'payments', 'tarjetas de transporte': 'transit cards', 'No encontramos integrantes': 'No family members found', 'Aún no agregas integrantes': 'You have not added any family members yet',
  'Prueba con otro nombre o documento.': 'Try another name or document.', 'Agrega a tus hijos u otros familiares para centralizar sus documentos y servicios.': 'Add your children or other family members to centralize their documents and services.',
  'Tu cuenta familiar te permite organizar la información de las personas a tu cargo desde una sola identidad PayID.': 'Your family account lets you organize the information of the people in your care from one PayID identity.',
  'Documentos': 'Documents', 'Tarjetas de transporte': 'Transit cards', 'CUENTA FAMILIAR': 'FAMILY ACCOUNT', 'registro': 'record', 'registros': 'records', 'No hay': 'No', 'vinculados': 'linked', 'aparecerán aquí.': 'will appear here.', 'Cerrar': 'Close',
  'Agregar integrante': 'Add family member', 'Registra los datos de la persona que tienes a cargo.': 'Enter the details of the person in your care.', 'Nombre completo': 'Full name', 'Nombre y apellidos': 'First and last name',
  'Parentesco': 'Relationship', 'Selecciona parentesco': 'Select relationship', 'Tipo de documento': 'Document type', 'Selecciona tipo de documento': 'Select document type', 'Número de documento': 'Document number', 'Número de identidad': 'ID number', 'Fecha de nacimiento': 'Date of birth', 'Teléfono (opcional)': 'Phone (optional)', 'Cancelar': 'Cancel', 'Guardando...': 'Saving...', 'Guardar cambios': 'Save changes',
  'Historial general': 'Activity history', 'Consulta en un solo lugar los movimientos y novedades de tu cuenta.': 'See your account activity and updates in one place.', 'Actualizar': 'Refresh', 'Actividad total': 'Total activity', 'Registros en tu cuenta': 'Records in your account', 'Pagos': 'Payments', 'Movimientos registrados': 'Recorded transactions', 'Documentos gestionados': 'Managed documents', 'Notificaciones': 'Notifications', 'Avisos de tu cuenta': 'Account alerts', 'TU CUENTA': 'YOUR ACCOUNT', 'Actividad reciente': 'Recent activity', 'Pagos, documentos y avisos asociados a tu perfil.': 'Payments, documents, and alerts associated with your profile.', 'Buscar en el historial...': 'Search activity...', 'Todos los tipos': 'All types', 'Todos los estados': 'All statuses', 'Cargando tu actividad': 'Loading your activity', 'Estamos reuniendo los movimientos de tu cuenta.': 'Gathering your account activity.', 'No se encontraron registros.': 'No records found.', 'Mostrando': 'Showing', 'de': 'of', 'registros': 'records', 'Página': 'Page',
  'Notificaciones': 'Notifications', 'PAYID · CENTRO DE AVISOS': 'PAYID · NOTIFICATION CENTER', 'Mantente al tanto de la actividad y los avisos importantes de tu cuenta.': 'Stay up to date with your account activity and important alerts.', 'Marcar todas como leídas': 'Mark all as read', 'Todas las notificaciones': 'All notifications', 'No leídas': 'Unread', 'Leídas': 'Read', 'Recordatorios': 'Reminders', 'Movimientos': 'Transactions', 'Seguridad': 'Security', 'Buscar notificaciones...': 'Search notifications...', 'No tienes notificaciones': 'You have no notifications', 'Cargando notificaciones...': 'Loading notifications...',
  'Gestión de documentos': 'Document management', 'Revisa, filtra y agrega tus documentos oficiales.': 'Review, filter, and add your official documents.', 'Activos': 'Active', 'Por vencer': 'Expiring soon', 'Vencidos': 'Expired', 'Pendientes': 'Pending', 'Rechazados': 'Rejected', 'Mis documentos': 'My documents', 'Lista completa de tus documentos oficiales': 'Complete list of your official documents', 'Buscar documentos...': 'Search documents...', 'Agregar documento': 'Add document', 'No se encontraron documentos con los filtros seleccionados.': 'No documents match the selected filters.', 'Exportar': 'Export',
  'Historial de pagos': 'Payment history', 'No se pudieron cargar los pagos.': 'Could not load payments.', 'Buscar por servicio...': 'Search by service...', 'Ver estadísticas': 'View statistics', 'No se encontraron pagos recientes.': 'No recent payments found.',
  'Transporte': 'Transit', 'Maneja tus tarjetas de transporte y su saldo': 'Manage your transit cards and balance', 'Recarga rápida': 'Quick top-up', 'Selecciona una tarjeta y recarga saldo fácilmente': 'Select a card and top up easily', 'Transacciones recientes': 'Recent transactions',
  'Mi perfil': 'My profile', 'Información personal': 'Personal information', 'Tu identidad y datos de acceso': 'Your identity and sign-in details', 'Correo electrónico': 'Email address', 'Documento de identidad': 'Identity document', 'Tipo de perfil': 'Profile type', 'Guardar cambios': 'Save changes', 'Cambiar contraseña': 'Change password', 'Contraseña actual': 'Current password', 'Nueva contraseña': 'New password', 'Confirmar contraseña': 'Confirm password',
  'Centro de Soporte': 'Help Center', 'Correo': 'Email', 'Teléfono': 'Phone', 'Chat en línea': 'Live chat', 'Abrir chat': 'Open chat',
  'Buenos días': 'Good morning', 'Buenas tardes': 'Good afternoon', 'Buenas noches': 'Good evening', 'Accesos rápidos': 'Quick access', 'Documentos familiares': 'Family documents', 'Pagos del hogar': 'Household payments', 'Consulta y organiza tus archivos': 'View and organize your files', 'Revisa tus movimientos': 'Review your transactions', 'Gasto registrado': 'Recorded spending', 'Documentos organizados': 'Documents organized', 'Alertas de documentos': 'Document alerts', 'Pagos y movimientos': 'Payments and transactions', 'Calendario': 'Calendar', 'Próximos vencimientos': 'Upcoming due dates', 'Todo al día': 'All caught up', 'No hay vencimientos próximos': 'No upcoming due dates', 'Credencial digital lista': 'Digital credential ready', 'Administrar identidad': 'Manage identity', 'Ver mis documentos': 'View my documents',
  'Editar perfil': 'Edit profile', 'Guardar': 'Save', 'Eliminar': 'Delete', 'Ver detalle': 'View details', 'Sin resultados': 'No results', 'Cargando...': 'Loading...', 'No se pudo cargar': 'Could not load',
}

const reverse = new Map(Object.entries(phrases).map(([es, en]) => [en, es]))
const originals = new WeakMap()
const attrOriginals = new WeakMap()
let locale = localStorage.getItem('kapakid:locale') || 'en'
let observer

function mapText(value, target) {
  const trimmed = value.trim()
  if (!trimmed) return value
  const leading = value.match(/^\s*/)?.[0] || ''
  const trailing = value.match(/\s*$/)?.[0] || ''
  const core = trimmed
  const translated = target === 'en' ? (phrases[core] || core) : (reverse.get(core) || core)
  return `${leading}${translated}${trailing}`
}

function visit(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue
    if (!originals.has(node)) originals.set(node, value)
    const source = originals.get(node)
    const translated = mapText(source, locale)
    if (value !== translated) node.nodeValue = translated
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  for (const attr of ['placeholder', 'aria-label', 'title']) {
    if (!node.hasAttribute(attr)) continue
    let values = attrOriginals.get(node)
    if (!values) { values = {}; attrOriginals.set(node, values) }
    if (!(attr in values)) values[attr] = node.getAttribute(attr)
    const translated = mapText(values[attr], locale)
    if (node.getAttribute(attr) !== translated) node.setAttribute(attr, translated)
  }
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(node.tagName)) return
  node.childNodes.forEach(visit)
}

export function installLegacyTranslations() {
  const root = document.getElementById('app')
  if (!root || observer) return
  const scan = () => visit(root)
  scan()
  observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') {
        // Vue may update an existing text node; take its latest Spanish copy as source.
        const node = record.target
        if (locale === 'es' || !reverse.has(node.nodeValue?.trim())) originals.set(node, node.nodeValue)
        visit(node)
      } else record.addedNodes.forEach(visit)
    }
  })
  observer.observe(root, { subtree: true, childList: true, characterData: true })
  window.addEventListener('payid:locale-changed', event => { locale = event.detail?.locale || 'en'; scan() })
}
