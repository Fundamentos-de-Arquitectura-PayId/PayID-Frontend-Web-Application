<script setup>

import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock4,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  RefreshCcw,
  Share2,
  Plus,
  X,
  FileText,
  ClipboardCheck,
  CircleAlert,
  ChevronLeft,
  ChevronRight
} from "lucide-vue-next";
import StyledSelect from "../../../shared/ui/StyledSelect.component.vue";
import CalendarDatePicker from "../../../shared/ui/CalendarDatePicker.component.vue";
import { listFamilyMembers } from "../../../shared/services/payidRepository.js";
import { recordActivity } from "../../../shared/services/activityLedger.js";
import { useDocumentsStore } from "../services/documents.assembler.js";

const { t, locale } = useI18n();
const { documents, isLoading, error, statusGroups, ensureDocuments, addDocument } =
    useDocumentsStore();
const familyMembers = ref([]);

const searchQuery = ref("");
const expirationFilter = ref("");
const activeStatus = ref("");
const isAdding = ref(false);
const isSaving = ref(false);
const selectedDocument = ref(null);
const formError = ref("");
const actionMessage = ref("");
const currentPage = ref(1);
const pageSize = 10;
const sortKey = ref("");
const sortDirection = ref("asc");
const newDocument = ref({
  type: "",
  number: "",
  issueDate: "",
  expirationDate: "",
  familyMemberId: ""
});

onMounted(() => {
  ensureDocuments();
  listFamilyMembers().then((result) => { familyMembers.value = result; }).catch(() => { familyMembers.value = []; });
  window.addEventListener("keydown", handleModalKeydown);
});

onUnmounted(() => window.removeEventListener("keydown", handleModalKeydown));

const statusStyles = {
  active: "status-active",
  expiring: "status-warning",
  expired: "status-expired",
  pending: "status-pending",
  rejected: "status-rejected"
};

const statusLabels = computed(() => ({
  active: t("documentsView.status.active"),
  expiring: t("documentsView.status.expiring"),
  expired: t("documentsView.status.expired"),
  pending: t("documentsView.status.pending"),
  rejected: locale.value === "es" ? "Rechazado" : "Rejected"
}));

const statusCards = computed(() => [
  {
    key: "active",
    label: t("documentsView.statusCards.active"),
    hint: locale.value === "es" ? "Vigentes en tu cuenta" : "Current in your account",
    count: statusGroups.value.active ?? 0,
    icon: CheckCircle2,
    tone: "success"
  },
  {
    key: "expiring",
    label: t("documentsView.statusCards.expiring"),
    hint: locale.value === "es" ? "Próximos a vencer" : "Expiring soon",
    count: statusGroups.value.expiring ?? 0,
    icon: Clock4,
    tone: "warning"
  },
  {
    key: "expired",
    label: t("documentsView.statusCards.expired"),
    hint: locale.value === "es" ? "Requieren renovación" : "Need renewal",
    count: statusGroups.value.expired ?? 0,
    icon: AlertTriangle,
    tone: "danger"
  },
  {
    key: "pending",
    label: t("documentsView.statusCards.pending"),
    hint: locale.value === "es" ? "En revisión" : "Under review",
    count: statusGroups.value.pending ?? 0,
    icon: XCircle,
    tone: "pending"
  },
  {
    key: "rejected",
    label: locale.value === "es" ? "Rechazados" : "Rejected",
    hint: locale.value === "es" ? "No aprobados" : "Not approved",
    count: statusGroups.value.rejected ?? 0,
    icon: XCircle,
    tone: "rejected"
  }
]);
const statusFilterOptions = computed(() => [
  { value: "", label: locale.value === "es" ? "Todos los estados" : "All statuses" },
  ...statusCards.value.map((card) => ({ value: card.key, label: card.label }))
]);

const documentsWithLabels = computed(() =>
    documents.value.map((document) => ({
      ...document,
      familyMemberName: familyMembers.value.find((member) => member.id === document.familyMemberId)?.name || "",
      statusLabel: statusLabels.value[document.statusKey] ?? document.statusKey
    }))
);

const filteredDocuments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return documentsWithLabels.value
      .filter((document) =>
          activeStatus.value ? document.statusKey === activeStatus.value : true
      )
      .filter((document) =>
          expirationFilter.value
              ? document.expirationDate?.slice(0, 10) === expirationFilter.value
              : true
      )
      .filter((document) => {
        if (!query) {
          return true;
        }

        return [
          document.type,
          document.number,
          document.statusLabel,
          formatDate(document.issueDate),
          formatDate(document.expirationDate)
        ]
            .join(" ")
            .toLowerCase()
            .includes(query);
      });
});

const searchPlaceholder = computed(() => t("documentsView.searchPlaceholder"));
const sortedDocuments = computed(() => {
  if (!sortKey.value) return filteredDocuments.value;
  const key = sortKey.value;
  const direction = sortDirection.value === "asc" ? 1 : -1;
  const dateValue = (value) => {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return [...filteredDocuments.value].sort((left, right) => {
    const leftValue = left[key] ?? "";
    const rightValue = right[key] ?? "";
    if (key === "issueDate" || key === "expirationDate") return (dateValue(leftValue) - dateValue(rightValue)) * direction;
    return String(leftValue).localeCompare(String(rightValue), locale.value, { numeric: true, sensitivity: "base" }) * direction;
  });
});
const totalPages = computed(() => Math.max(1, Math.ceil(sortedDocuments.value.length / pageSize)));
const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return sortedDocuments.value.slice(start, start + pageSize);
});
const firstVisibleDocument = computed(() => sortedDocuments.value.length ? (currentPage.value - 1) * pageSize + 1 : 0);
const lastVisibleDocument = computed(() => Math.min(currentPage.value * pageSize, sortedDocuments.value.length));
const paginationItems = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, index) => ({ key: `page-${index + 1}`, value: index + 1 }));

  const values = [1];
  if (current > 3) values.push("ellipsis-start");
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) values.push(page);
  if (current < total - 2) values.push("ellipsis-end");
  values.push(total);
  return values.map((value, index) => typeof value === "number"
    ? { key: `page-${value}`, value }
    : { key: `${value}-${index}`, ellipsis: true });
});
const showClearFilters = computed(
    () => !!(searchQuery.value || expirationFilter.value || activeStatus.value)
);

watch([searchQuery, expirationFilter, activeStatus], () => { currentPage.value = 1; });
function sortBy(key) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = key;
    sortDirection.value = "asc";
  }
  currentPage.value = 1;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale.value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsedDate);
}

const typeOptions = computed(() => locale.value === "es" ? [
  { value: "DNI", label: "DNI" },
  { value: "Carnet de extranjería", label: "Carnet de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "Carnet universitario", label: "Carnet universitario" }
] : [
  { value: "DNI", label: "National identity card" },
  { value: "Carnet de extranjería", label: "Foreign resident card" },
  { value: "Pasaporte", label: "Passport" },
  { value: "Carnet universitario", label: "University card" }
]);

function selectStatus(statusKey) {
  activeStatus.value = activeStatus.value === statusKey ? "" : statusKey;
}

function clearFilters() {
  searchQuery.value = "";
  expirationFilter.value = "";
  activeStatus.value = "";
}

function localDateInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function resetForm() {
  newDocument.value = {
    type: "",
    number: "",
    issueDate: "",
    expirationDate: "",
    familyMemberId: ""
  };
}

async function handleAddDocument() {
  if (!newDocument.value.type.trim() || !newDocument.value.number.trim()) {
    formError.value = locale.value === "es" ? "Completa el tipo y número del documento." : "Enter the document type and number.";
    return;
  }
  if (!newDocument.value.issueDate) {
    formError.value = locale.value === "es" ? "Indica la fecha de emisión." : "Enter the issue date.";
    return;
  }

  isSaving.value = true;
  formError.value = "";
  try {
    await addDocument({
      type: newDocument.value.type,
      number: newDocument.value.number.trim(),
      issueDate: newDocument.value.issueDate,
      expirationDate: newDocument.value.expirationDate,
      familyMemberId: newDocument.value.familyMemberId || null
    });
    await recordActivity({ kind: "document", title: `Documento: ${newDocument.value.type}`, detail: `Número: ${newDocument.value.number.trim()}`, date: new Date().toISOString(), status: "Pendiente", reference: newDocument.value.number.trim(), metadata: { expirationDate: newDocument.value.expirationDate || "" } });
    actionMessage.value = "";
    window.dispatchEvent(new CustomEvent("payid:toast", {
      detail: { message: locale.value === "es" ? "Documento agregado correctamente." : "Document added successfully." }
    }));
    resetForm();
    isAdding.value = false;
  } catch (error) {
    formError.value = error?.message || (locale.value === "es" ? "No se pudo guardar el documento." : "Could not save the document.");
  } finally {
    isSaving.value = false;
  }
}

function cancelAdd() {
  resetForm();
  formError.value = "";
  isAdding.value = false;
}

function openAdd(document = null) {
  actionMessage.value = "";
  formError.value = "";
  if (document) {
    newDocument.value = {
      type: document.type,
      number: document.number,
      issueDate: localDateInputValue(),
      expirationDate: "",
      familyMemberId: ""
    };
  } else {
    resetForm();
  }
  isAdding.value = true;
}

function closeDocumentDetails() {
  selectedDocument.value = null;
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    cancelAdd();
    closeDocumentDetails();
  }
}

function downloadDocument(doc) {
  const content = [
    `PayID — ${doc.type}`,
    `${t("documentsView.headers.number")}: ${doc.number}`,
    `${t("documentsView.headers.issueDate")}: ${formatDate(doc.issueDate)}`,
    `${t("documentsView.headers.expirationDate")}: ${formatDate(doc.expirationDate)}`,
    `${t("documentsView.headers.status")}: ${doc.statusLabel}`
  ].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `payid-${String(doc.type).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${doc.number}.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFilteredDocuments() {
  if (!filteredDocuments.value.length) return;
  const headers = [
    t("documentsView.headers.type"),
    t("documentsView.headers.number"),
    t("documentsView.headers.issueDate"),
    t("documentsView.headers.expirationDate"),
    t("documentsView.headers.status")
  ];
  const csvCell = (value) => {
    const text = String(value ?? "");
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const rows = filteredDocuments.value.map((document) => [
    document.type,
    document.number,
    formatDate(document.issueDate),
    formatDate(document.expirationDate),
    document.statusLabel
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `payid-documentos-${localDateInputValue()}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareDocument(doc) {
  const text = `PayID · ${doc.type} · ${doc.number}`;
  try {
    if (navigator.share) await navigator.share({ title: "PayID", text });
    else {
      await navigator.clipboard.writeText(text);
      actionMessage.value = locale.value === "es" ? "Datos del documento copiados." : "Document details copied.";
    }
  } catch (error) {
    if (error?.name !== "AbortError") actionMessage.value = locale.value === "es" ? "No se pudo compartir el documento." : "Could not share the document.";
  }
}
</script>




<template>
  <div class="documents-page">

    <main class="content">
      <header class="page-header">
        <div>
          <p class="page-title">{{ t('documentsView.title') }}</p>
          <p class="page-subtitle">{{ t('documentsView.subtitle') }}</p>
        </div>
      </header>

      <div v-if="actionMessage" class="success-banner" role="status"><ClipboardCheck size="17" />{{ actionMessage }}<button type="button" :aria-label="locale === 'es' ? 'Cerrar aviso' : 'Dismiss message'" @click="actionMessage = ''"><X size="15" /></button></div>

      <section class="status-grid">
        <button
            v-for="card in statusCards"
            :key="card.key"
            type="button"
            class="status-card"
            :class="[card.tone, { active: activeStatus === card.key }]"
            :disabled="isLoading && !documents.length"
            @click="selectStatus(card.key)"
        >
          <component :is="card.icon" class="card-icon" size="24" />
          <div class="card-info">
            <span class="card-count">{{ isLoading ? '…' : card.count }}</span>
            <span class="card-label">{{ card.label }}</span>
            <span class="card-meta"><span class="card-trend" aria-hidden="true"><svg viewBox="0 0 16 11" focusable="false"><path d="M1 9 5 5.8 8 7 13.8 1.5M10.8 1.5h3v3" /></svg></span>{{ card.hint }}</span>
          </div>
        </button>
      </section>

      <section class="table-card">
        <header class="table-header">
          <p class="table-title">
            {{ t('documentsView.tableTitle', { count: filteredDocuments.length }) }}
          </p>
          <p class="table-subtitle">{{ t('documentsView.tableSubtitle') }}</p>
        </header>

        <section class="toolbar table-toolbar" aria-label="Filtros y acciones de documentos">
          <div class="search-input">
            <Search class="search-icon" size="18" />
            <input v-model="searchQuery" type="text" :placeholder="searchPlaceholder" />
          </div>
          <div class="toolbar-actions">
            <div class="toolbar-status-picker">
              <StyledSelect v-model="activeStatus" :options="statusFilterOptions" :placeholder="locale === 'es' ? 'Todos los estados' : 'All statuses'" :aria-label="locale === 'es' ? 'Filtrar por estado' : 'Filter by status'" />
            </div>
            <div class="toolbar-date-picker">
              <CalendarDatePicker v-model="expirationFilter" :placeholder="locale === 'es' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'" :aria-label="locale === 'es' ? 'Filtrar por vencimiento' : 'Filter by expiration'" />
            </div>
            <button v-if="showClearFilters" class="clear-filters" type="button" @click="clearFilters">
              {{ t('documentsView.clearFilters') }}
            </button>
            <button class="export-documents" type="button" :disabled="!filteredDocuments.length" @click="exportFilteredDocuments">
              <Download size="16" />
              <span>{{ locale === 'es' ? 'Exportar' : 'Export' }}</span>
            </button>
            <button class="add-document" type="button" @click="openAdd()">
              <Plus size="17" />
              <span>{{ t('documentsView.add') }}</span>
            </button>
          </div>
        </section>

        <p v-if="error" class="error-banner"><CircleAlert size="17" />{{ t('documentsView.error') }} <button type="button" @click="ensureDocuments()"><RefreshCcw size="14" /> {{ locale === 'es' ? 'Reintentar' : 'Retry' }}</button></p>

        <div class="table-wrapper" :class="{ 'is-loading': isLoading }">
          <div v-if="isLoading" class="document-table-skeleton" role="status" :aria-label="t('common.loading')"><span v-for="row in 5" :key="row" class="document-skeleton-row"><i v-for="column in 6" :key="column"></i></span></div>
          <table v-else>
            <thead>
            <tr>
              <th><button class="sort-header" type="button" :aria-sort="sortKey === 'type' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'" @click="sortBy('type')">{{ t('documentsView.headers.type') }}<ArrowUp v-if="sortKey === 'type' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'type'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
              <th><button class="sort-header" type="button" :aria-sort="sortKey === 'number' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'" @click="sortBy('number')">{{ t('documentsView.headers.number') }}<ArrowUp v-if="sortKey === 'number' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'number'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
              <th><button class="sort-header" type="button" :aria-sort="sortKey === 'issueDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'" @click="sortBy('issueDate')">{{ t('documentsView.headers.issueDate') }}<ArrowUp v-if="sortKey === 'issueDate' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'issueDate'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
              <th><button class="sort-header" type="button" :aria-sort="sortKey === 'expirationDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'" @click="sortBy('expirationDate')">{{ t('documentsView.headers.expirationDate') }}<ArrowUp v-if="sortKey === 'expirationDate' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'expirationDate'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
              <th><button class="sort-header" type="button" :aria-sort="sortKey === 'statusLabel' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'" @click="sortBy('statusLabel')">{{ t('documentsView.headers.status') }}<ArrowUp v-if="sortKey === 'statusLabel' && sortDirection === 'asc'" :size="13" /><ArrowDown v-else-if="sortKey === 'statusLabel'" :size="13" /><ArrowUpDown v-else :size="13" /></button></th>
              <th>{{ t('documentsView.headers.actions') }}</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="doc in paginatedDocuments" :key="doc.id">
              <td><span class="document-type"><span class="document-type-icon"><FileText size="16" /></span><span>{{ doc.type }}<small v-if="doc.familyMemberName" class="document-owner">{{ doc.familyMemberName }}</small></span></span></td>
              <td class="number">{{ doc.number }}</td>
              <td>{{ formatDate(doc.issueDate) }}</td>
              <td>{{ formatDate(doc.expirationDate) }}</td>
              <td>
                  <span class="status-pill" :class="statusStyles[doc.statusKey]">
                    {{ doc.statusLabel }}
                  </span>
              </td>
              <td>
                <div class="actions">
                  <button
                      class="icon-button"
                      type="button"
                      :title="t('documentsView.actions.view')"
                      :aria-label="t('documentsView.actions.view')"
                      @click="selectedDocument = doc"
                  >
                    <Eye size="18" />
                  </button>
                  <button
                      class="icon-button"
                      type="button"
                      :title="t('documentsView.actions.download')"
                      :aria-label="t('documentsView.actions.download')"
                      @click="downloadDocument(doc)"
                  >
                    <Download size="18" />
                  </button>
                  <button
                      class="icon-button"
                      type="button"
                      :title="t('documentsView.actions.renew')"
                      :aria-label="t('documentsView.actions.renew')"
                      @click="openAdd(doc)"
                  >
                    <RefreshCcw size="18" />
                  </button>
                  <button
                      class="icon-button"
                      type="button"
                      :title="t('documentsView.actions.share')"
                      :aria-label="t('documentsView.actions.share')"
                      @click="shareDocument(doc)"
                  >
                    <Share2 size="18" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredDocuments.length">
              <td class="empty-state" colspan="6">
                {{ t('documentsView.empty') }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="!isLoading && filteredDocuments.length" class="table-footer">
          <p>{{ locale === 'es' ? 'Mostrando' : 'Showing' }} <strong>{{ firstVisibleDocument }}–{{ lastVisibleDocument }}</strong> {{ locale === 'es' ? 'de' : 'of' }} <strong>{{ filteredDocuments.length }}</strong> {{ locale === 'es' ? 'documentos' : 'documents' }}</p>
          <nav v-if="totalPages > 1" class="pagination" :aria-label="locale === 'es' ? 'Paginación de documentos' : 'Document pagination'">
            <button class="page-button page-arrow" type="button" :aria-label="locale === 'es' ? 'Página anterior' : 'Previous page'" :disabled="currentPage === 1" @click="currentPage -= 1"><ChevronLeft :size="16" /></button>
            <template v-for="item in paginationItems" :key="item.key">
              <span v-if="item.ellipsis" class="page-ellipsis" aria-hidden="true">…</span>
              <button v-else class="page-button" type="button" :aria-current="currentPage === item.value ? 'page' : undefined" :class="{ current: currentPage === item.value }" @click="currentPage = item.value">{{ item.value }}</button>
            </template>
            <button class="page-button page-arrow" type="button" :aria-label="locale === 'es' ? 'Página siguiente' : 'Next page'" :disabled="currentPage === totalPages" @click="currentPage += 1"><ChevronRight :size="16" /></button>
          </nav>
        </footer>
      </section>
    </main>

    <Teleport to="body">
    <div v-if="isAdding" class="modal-backdrop" @click.self="cancelAdd">
      <section class="document-modal" role="dialog" aria-modal="true" :aria-label="t('documentsView.formTitle')">
        <header class="modal-header">
          <span class="modal-heading-icon"><FileText size="20" /></span>
          <div><h2>{{ t('documentsView.formTitle') }}</h2><p>{{ locale === 'es' ? 'Registra un documento en tu identidad digital.' : 'Add a document to your digital identity.' }}</p></div>
          <button class="modal-close" type="button" :aria-label="locale === 'es' ? 'Cerrar' : 'Close'" @click="cancelAdd"><X size="19" /></button>
        </header>
        <form class="document-form" @submit.prevent="handleAddDocument">
          <label><span>{{ t('documentsView.type') }}</span><StyledSelect v-model="newDocument.type" :options="typeOptions" :placeholder="locale === 'es' ? 'Selecciona un tipo' : 'Select a type'" :aria-label="t('documentsView.type')" /></label>
          <label><span>{{ t('documentsView.number') }}</span><input v-model="newDocument.number" type="text" autocomplete="off" required /></label>
          <label v-if="familyMembers.length"><span>Asignar a integrante</span><StyledSelect v-model="newDocument.familyMemberId" :options="[{ value: '', label: 'Mi cuenta' }, ...familyMembers.map(member => ({ value: member.id, label: `${member.name} · ${member.relationship}` }))]" placeholder="Mi cuenta" aria-label="Asignar documento a familiar" /></label>
          <div class="modal-form-row">
            <label><span>{{ t('documentsView.issueDate') }}</span><CalendarDatePicker v-model="newDocument.issueDate" :placeholder="locale === 'es' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'" :aria-label="t('documentsView.issueDate')" /></label>
            <label><span>{{ t('documentsView.expirationDate') }}</span><CalendarDatePicker v-model="newDocument.expirationDate" :placeholder="locale === 'es' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'" :aria-label="t('documentsView.expirationDate')" /></label>
          </div>
          <p v-if="formError" class="form-error" role="alert"><CircleAlert size="16" />{{ formError }}</p>
          <footer class="modal-actions"><button class="secondary-button" type="button" @click="cancelAdd">{{ t('documentsView.cancel') }}</button><button class="primary-button" type="submit" :disabled="isSaving"><span v-if="isSaving" class="button-spinner"></span><span v-else><Plus size="16" /></span>{{ isSaving ? (locale === 'es' ? 'Guardando…' : 'Saving…') : t('documentsView.save') }}</button></footer>
        </form>
      </section>
    </div>

    <div v-if="selectedDocument" class="modal-backdrop" @click.self="closeDocumentDetails">
      <section class="document-modal detail-modal" role="dialog" aria-modal="true" :aria-label="selectedDocument.type">
        <header class="modal-header"><span class="modal-heading-icon"><FileText size="20" /></span><div><h2>{{ selectedDocument.type }}</h2><p>{{ locale === 'es' ? 'Detalles del documento' : 'Document details' }}</p></div><button class="modal-close" type="button" :aria-label="locale === 'es' ? 'Cerrar' : 'Close'" @click="closeDocumentDetails"><X size="19" /></button></header>
        <dl class="document-details"><div><dt>{{ t('documentsView.headers.number') }}</dt><dd>{{ selectedDocument.number }}</dd></div><div><dt>{{ t('documentsView.headers.issueDate') }}</dt><dd>{{ formatDate(selectedDocument.issueDate) }}</dd></div><div><dt>{{ t('documentsView.headers.expirationDate') }}</dt><dd>{{ formatDate(selectedDocument.expirationDate) }}</dd></div><div><dt>{{ t('documentsView.headers.status') }}</dt><dd><span class="status-pill" :class="statusStyles[selectedDocument.statusKey]">{{ selectedDocument.statusLabel }}</span></dd></div></dl>
        <footer class="modal-actions"><button class="secondary-button" type="button" @click="closeDocumentDetails">{{ locale === 'es' ? 'Cerrar' : 'Close' }}</button><button class="primary-button" type="button" @click="downloadDocument(selectedDocument)"><Download size="16" />{{ t('documentsView.actions.download') }}</button></footer>
      </section>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.documents-page {
  background: var(--bg-page);
  min-height: 100vh;
  padding-bottom: 40px;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.page-subtitle {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 15px;
}

.add-document {
  background: #0d9488;
  border-radius: 999px;
  padding: 0.65em 1.8em;
  border: none;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(13, 148, 136, 0.2);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.add-document:hover {
  background: #0f766e;
  box-shadow: 0 12px 32px rgba(13, 148, 136, 0.24);
}

.add-document:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.add-form {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 12px 40px rgba(9, 9, 55, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}

.form-grid input,
.form-grid select {
  border-radius: 12px;
  border: 1px solid #d1d5db;
  padding: 10px 14px;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-grid input:focus,
.form-grid select:focus {
  outline: none;
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-actions .secondary,
.form-actions .primary {
  padding: 0.6em 1.6em;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.form-actions .secondary {
  background: #e5e7eb;
  color: #374151;
}

.form-actions .primary {
  background: #0d9488;
  color: #ffffff;
  box-shadow: 0 12px 30px rgba(13, 148, 136, 0.22);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.status-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 18px;
  border: 1px solid transparent;
  background: #fff;
  box-shadow: 0 12px 30px rgba(9, 9, 55, 0.04);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.status-card:disabled {
  cursor: default;
  opacity: 0.65;
}

.status-card:hover,
.status-card.active {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px rgba(9, 9, 55, 0.1);
}

.status-card.success.active {
  border-color: #34d399;
}

.status-card.warning.active {
  border-color: #fbbf24;
}

.status-card.danger.active {
  border-color: #f87171;
}

.status-card.pending.active {
  border-color: #60a5fa;
}

.card-icon {
  padding: 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.status-card.success .card-icon {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
}

.status-card.warning .card-icon {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.14);
}

.status-card.danger .card-icon {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.14);
}

.status-card.pending .card-icon {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.14);
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.card-count {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.card-label {
  font-size: 14px;
  color: #6b7280;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 0 16px 32px rgba(9, 9, 55, 0.05);
}

.search-input {
  flex: 1 1 280px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.search-input input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
  color: #111827;
}

.search-icon {
  color: #94a3b8;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.date-filter input {
  border: none;
  background: transparent;
  font-size: 15px;
  color: #0f172a;
  outline: none;
}

.calendar-icon {
  color: #64748b;
}

.clear-filters {
  background: transparent;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding: 0.6em 1.4em;
  border-radius: 999px;
}

.table-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.error-banner {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  margin: 0 24px;
}

.table-header {
  padding: 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.table-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.table-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.table-wrapper.is-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.table-loading {
  padding: 32px 0;
  font-weight: 500;
  color: #6b7280;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

th,
td {
  padding: 18px 24px;
  text-align: left;
  font-size: 15px;
}

thead th {
  font-weight: 600;
  color: #475569;
  background: rgba(241, 245, 249, 0.6);
}

tbody tr {
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  transition: background 0.2s ease;
}

tbody tr:hover {
  background: rgba(241, 245, 249, 0.6);
}

.number {
  letter-spacing: 0.5px;
  font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
  Consolas, "Liberation Mono", "Courier New", monospace;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-active {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.status-warning {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.status-expired {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.status-pending {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.icon-button:hover {
  transform: translateY(-2px);
  border-color: #0d9488;
  box-shadow: 0 10px 20px rgba(13, 148, 136, 0.15);
  color: #0d9488;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
  font-size: 15px;
}

@media (max-width: 768px) {
  .content {
    padding-top: 120px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .add-document {
    width: 100%;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
  }

  .date-filter {
    flex: 1;
    justify-content: space-between;
  }

  .clear-filters {
    flex-shrink: 0;
  }
}

@media (max-width: 520px) {
  .status-grid {
    grid-template-columns: 1fr;
  }

  th,
  td {
    padding: 16px;
  }

  .actions {
    gap: 6px;
  }

  .icon-button {
    width: 32px;
    height: 32px;
  }
}

.documents-page{min-height:calc(100vh - 72px);background:#f6f8f7;color:#26352b;padding:1px 0 36px}
.content{width:100%;max-width:1500px;margin:0 auto;padding:30px 34px 40px;gap:20px}
.page-header{align-items:center;padding-bottom:2px}.page-title{color:#25382b;font-size:26px;font-weight:650;letter-spacing:-.035em}.page-subtitle{margin-top:5px;color:#78847c;font-size:13px}
.add-document{display:inline-flex;min-height:43px;align-items:center;justify-content:center;gap:9px;padding:0 17px;border:1px solid #315a43;border-radius:11px;background:linear-gradient(135deg,#416f51,#294b36);color:#fff;font-family:inherit;font-size:12px;font-weight:650;box-shadow:0 5px 12px #315a4324;transition:transform .18s,box-shadow .18s,background .18s;cursor:pointer}.add-document:hover{background:linear-gradient(135deg,#315a43,#1f3f2b);box-shadow:0 8px 18px #315a4334;transform:translateY(-2px)}.add-document:active{transform:translateY(0) scale(.98)}
.status-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.status-card{min-width:0;padding:17px 18px;border:1px solid #e7ece8;border-radius:15px;box-shadow:0 4px 13px rgba(31,50,38,.035);text-align:left}.status-card:hover,.status-card.active{transform:translateY(-2px);box-shadow:0 9px 20px rgba(31,50,38,.08)}.card-icon{width:40px;height:40px;padding:10px;border-radius:12px}.card-count{color:#2c3e31;font-size:24px}.card-label{font-size:11px}.status-card.success.active{border-color:#89b994}.status-card.warning.active{border-color:#e3bd75}.status-card.danger.active{border-color:#e8a4a4}.status-card.pending.active{border-color:#9ab5dc}.status-card.rejected.active{border-color:#b5bbc0}.status-card.rejected .card-icon{color:#66717a;background:#eef1f2}
.toolbar{gap:12px;padding:14px;border:1px solid #e8ede9;border-radius:14px;box-shadow:0 4px 14px rgba(31,50,38,.035)}.search-input,.date-filter{min-height:44px;padding:10px 13px;border-color:#e2e8e3;border-radius:10px;background:#f8faf8;transition:border-color .18s,box-shadow .18s,background .18s}.search-input:focus-within,.date-filter:focus-within{border-color:#9bb9a0;background:#fff;box-shadow:0 0 0 3px #315a4310}.search-input input,.date-filter input{font-family:inherit;font-size:12px}.toolbar-actions{gap:9px}.date-filter input{width:145px}.clear-filters{min-height:42px;padding:0 13px;border:1px solid #e1e8e2;border-radius:10px;background:#fff;color:#607166;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer}.clear-filters:hover{border-color:#b6cbb9;background:#f4f8f4;color:#315a43}
.table-card{border:1px solid #e8ede9;border-radius:15px;box-shadow:0 6px 20px rgba(31,50,38,.045)}.table-header{padding:20px 22px 17px}.table-title{color:#2c3d31;font-size:15px}.table-subtitle{margin-top:4px;color:#89948c;font-size:11px}.table-wrapper{max-width:100%}table{min-width:800px}th,td{padding:13px 17px;font-size:11px}thead th{background:#f7f9f7;color:#7c8980;font-size:9px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}tbody tr{border-bottom-color:#edf0ed}tbody tr:hover{background:#f9fbf9}.number{color:#43534a;font-size:11px}.document-type{display:flex;align-items:center;gap:9px;color:#35483a;font-weight:600;white-space:nowrap}.document-type-icon{display:grid;width:30px;height:30px;place-items:center;border-radius:9px;background:#edf4ef;color:#4c7455}.status-pill{padding:5px 9px;font-size:9px;font-weight:650}.status-active{background:#eaf4eb;color:#3d7648}.status-warning{background:#fbf2df;color:#a27427}.status-expired{background:#fbeaea;color:#ad4a4a}.status-pending{background:#edf2fb;color:#4a6896}.status-rejected{background:#eef0f1;color:#657079}
.table-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 18px 14px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
.table-toolbar .search-input{min-width:180px;min-height:42px;flex:1 1 300px;padding:9px 12px}
.table-toolbar .toolbar-actions{width:auto;flex:none;gap:8px}
.table-toolbar .toolbar-date-picker{width:158px;flex:none}
.table-toolbar{flex-wrap:wrap;justify-content:flex-start;gap:10px;margin:0;padding:13px 18px;border-bottom:1px solid #edf0ed;background:#fff}
.table-toolbar .search-input{order:2;min-width:150px;min-height:40px;flex:1 1 180px;padding:8px 11px;border-radius:9px}
.table-toolbar .toolbar-actions{order:3;gap:7px}
.table-toolbar .toolbar-status-picker,.table-toolbar .toolbar-date-picker{width:145px;flex:none}
.table-card{overflow:hidden;border-radius:15px;background:#fff}
.table-header{padding:18px 20px 14px;border-bottom:0}
.table-title{font-size:15px;font-weight:650}
.table-subtitle{font-size:10px}
.table-wrapper table{min-width:850px}
.table-wrapper thead th{height:38px;padding:0 16px;background:#f7f9f7;font-size:8px;letter-spacing:.06em}
.sort-header{display:inline-flex;align-items:center;gap:6px;padding:4px 0;border:0;background:transparent;color:inherit;font:inherit;font-size:inherit;font-weight:inherit;letter-spacing:inherit;text-transform:inherit;white-space:nowrap;cursor:pointer}.sort-header svg{flex:none;color:#a2ada4;transition:color .14s}.sort-header:hover,.sort-header[aria-sort="ascending"],.sort-header[aria-sort="descending"]{color:#315a43}.sort-header:hover svg,.sort-header[aria-sort="ascending"] svg,.sort-header[aria-sort="descending"] svg{color:#52785a}
.table-wrapper tbody td{height:53px;padding:9px 16px;font-size:11px}
.table-wrapper tbody tr{border-bottom:1px solid #edf0ed}
.table-wrapper tbody tr:last-child{border-bottom:0}
.document-type-icon{width:29px;height:29px;border-radius:50%;background:#edf4ef}
.status-pill{padding:5px 8px;border-radius:6px;font-size:9px;font-weight:600}
.table-footer{min-height:54px;padding:9px 16px;border-top:1px solid #edf0ed}
.empty-state{height:112px;text-align:center;font-size:11px}
.status-card{display:grid;grid-template-columns:minmax(0,1fr) 30px;grid-template-rows:auto auto auto;align-items:start;gap:3px 8px;padding:12px 14px;border:1px solid #edf0ed;border-radius:13px;background:#fff;box-shadow:0 3px 10px rgba(31,50,38,.035);transition:border-color .16s,box-shadow .16s,transform .16s}
.status-card:hover,.status-card.active{transform:translateY(-1px);border-color:#dce6de;box-shadow:0 6px 14px rgba(31,50,38,.07)}
.card-info{display:contents}
.card-label{grid-column:1;grid-row:1;align-self:center;color:#657269;font-size:10px;font-weight:500;line-height:1.3}
.card-count{grid-column:1;grid-row:2;color:#26352b;font-size:20px;font-weight:600;line-height:1.2;letter-spacing:-.03em}
.card-icon{grid-column:2;grid-row:1;justify-self:end;width:27px;height:27px;padding:6px;border-radius:50%;background:#f1f5f1}
.card-meta{display:flex;grid-column:1 / -1;grid-row:3;align-items:center;gap:6px;min-width:0;margin-top:2px;color:#879289;font-size:8px;line-height:1.25;white-space:nowrap}
.card-trend{display:grid;width:31px;height:17px;flex:none;place-items:center;border-radius:5px;background:#eaf7ef;color:#50a875}
.card-trend svg{width:13px;height:10px;overflow:visible;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4}
.status-card.warning .card-trend{background:#fff4e4;color:#d89428}.status-card.danger .card-trend,.status-card.rejected .card-trend{background:#fff0ef;color:#d36b66}.status-card.pending .card-trend{background:#eef2ff;color:#6f8ddb}
.status-card.success .card-icon{background:#eaf6ef}.status-card.warning .card-icon{background:#fff3e3}.status-card.danger .card-icon{background:#fff0ef}.status-card.pending .card-icon{background:#eef2ff}.status-card.rejected .card-icon{background:#f0f2f3}
.page-subtitle{font-size:14px}
.card-label{font-size:13px;font-weight:550}
.card-count{font-size:25px;font-weight:600}
.card-meta{font-size:10px}
.filter-tab{font-size:12px}
.table-toolbar .search-input input{font-size:13px}
.table-toolbar .toolbar-date-picker .calendar-field-trigger{font-size:13px}
.export-documents{font-size:12px}
.add-document{font-size:13px}
.table-title{font-size:17px}
.table-subtitle{font-size:12px}
.table-wrapper thead th{font-size:10px}
.table-wrapper tbody td{font-size:13px}
.document-type{font-size:13px}.document-owner{display:block;margin-top:2px;color:#87948a;font-size:9px;font-weight:500}
.number{font-size:12px}
.status-pill{font-size:11px}
.icon-button{width:34px;height:34px}
.table-footer>p{font-size:12px}
.page-button{min-width:34px;height:34px;font-size:12px}
.empty-state{font-size:13px}
.export-documents{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:7px;padding:0 12px;border:1px solid #e3e9e4;border-radius:10px;background:#fff;color:#586b5d;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:background .16s,border-color .16s,color .16s,transform .16s}
.export-documents:hover:not(:disabled){transform:translateY(-1px);border-color:#c3d4c6;background:#f7faf7;color:#315a43}
.export-documents:disabled{color:#b5beb7;background:#fafbfa;cursor:not-allowed}
.table-footer{display:flex;min-height:60px;align-items:center;justify-content:space-between;gap:14px;padding:10px 18px;border-top:1px solid #edf0ed;background:#fff}
.table-footer>p{margin:0;color:#8a958d;font-size:10px}
.table-footer>p strong{color:#536256;font-weight:650}
.pagination{display:flex;align-items:center;gap:5px}
.page-button{display:grid;min-width:30px;height:30px;place-items:center;padding:0 7px;border:1px solid #e5eae6;border-radius:8px;background:#fff;color:#68766c;font-family:inherit;font-size:10px;font-weight:600;cursor:pointer;transition:background .16s,border-color .16s,color .16s,transform .16s,box-shadow .16s}
.page-button:hover:not(:disabled):not(.current){transform:translateY(-1px);border-color:#c7d7ca;background:#f4f8f4;color:#355644}
.page-button.current{border-color:#355644;background:linear-gradient(145deg,#477352,#315a43);color:#fff;box-shadow:0 3px 8px #315a4330}
.page-button:disabled{background:#fafbfa;color:#c4ccc5;cursor:not-allowed}
.page-button:focus-visible{outline:3px solid #789b844a;outline-offset:2px}
.page-ellipsis{display:grid;width:22px;height:30px;place-items:center;color:#9ba59d;font-size:12px}
.actions{gap:5px}.icon-button{width:31px;height:31px;border-radius:9px;border-color:#e7ece8;color:#77847a;cursor:pointer;transition:background .16s,border-color .16s,color .16s,transform .16s,box-shadow .16s}.icon-button:hover{border-color:#bed1c1;background:#f0f6f1;color:#315a43;box-shadow:0 3px 8px #315a4317;transform:translateY(-1px)}.icon-button:active{transform:scale(.95)}
.error-banner,.success-banner{display:flex;align-items:center;gap:9px;margin:0 20px 12px;padding:11px 13px;border:1px solid #f0d6d5;border-radius:10px;background:#fff5f4;color:#a34d49;font-size:11px}.error-banner button,.success-banner button{display:inline-flex;align-items:center;gap:5px;margin-left:auto;padding:5px 8px;border:1px solid #ecd5d3;border-radius:7px;background:#fff;color:#994b47;font-family:inherit;font-size:10px;cursor:pointer}.success-banner{margin:0;border-color:#d8e8da;background:#f2f8f2;color:#47744e}.success-banner button{padding:4px;border-color:transparent;background:transparent;color:#47744e}.empty-state{padding:48px 22px;color:#929c95;font-size:12px}.table-loading{color:#738178;font-size:12px}
.modal-backdrop{position:fixed;inset:0;z-index:9990;display:grid;place-items:center;overflow-y:auto;padding:20px;background:rgba(18,29,22,.48);backdrop-filter:blur(4px);animation:modal-backdrop-in .18s ease-out both}@keyframes modal-backdrop-in{from{opacity:0}to{opacity:1}}.document-modal{width:min(100%,520px);max-height:min(90vh,760px);overflow-y:auto;border:1px solid #e7ece8;border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(16,35,24,.26);animation:modal-card-in .24s cubic-bezier(.22,1,.36,1) both}@keyframes modal-card-in{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}.modal-header{display:flex;align-items:center;gap:12px;padding:20px 22px;border-bottom:1px solid #edf0ed}.modal-heading-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:#edf4ef;color:#416b4b}.modal-header>div{min-width:0;flex:1}.modal-header h2{margin:0;color:#293b2e;font-size:16px;font-weight:650}.modal-header p{margin:4px 0 0;color:#859087;font-size:11px}.modal-close{display:grid;width:34px;height:34px;flex:none;place-items:center;border:1px solid #e8ede9;border-radius:9px;background:#fff;color:#738077;cursor:pointer}.modal-close:hover{background:#f5f8f5;color:#315a43}.document-form{display:flex;flex-direction:column;gap:15px;padding:20px 22px 22px}.document-form label{display:flex;min-width:0;flex:1;flex-direction:column;gap:7px;color:#4e5e53;font-size:11px;font-weight:600}.document-form input,.document-form select{width:100%;min-height:43px;padding:0 12px;border:1px solid #dfe6e0;border-radius:9px;background:#fbfcfb;color:#34443a;font-family:inherit;font-size:12px;outline:none;transition:border-color .16s,box-shadow .16s,background .16s}.document-form input:focus,.document-form select:focus{border-color:#86aa8d;background:#fff;box-shadow:0 0 0 3px #315a4310}.modal-form-row{display:flex;gap:12px}.form-error{display:flex;align-items:flex-start;gap:7px;margin:0;padding:10px 11px;border:1px solid #f0d7d5;border-radius:9px;background:#fff5f4;color:#a34d49;font-size:11px}.form-error svg{flex:none}.modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:4px;padding-top:14px;border-top:1px solid #edf0ed}.secondary-button,.primary-button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid #e1e7e2;border-radius:9px;font-family:inherit;font-size:11px;font-weight:650;cursor:pointer;transition:transform .16s,background .16s,border-color .16s,box-shadow .16s}.secondary-button{background:#fff;color:#627067}.secondary-button:hover{border-color:#cbd8cd;background:#f7f9f7}.primary-button{border-color:#315a43;background:#315a43;color:#fff;box-shadow:0 4px 10px #315a4324}.primary-button:hover:not(:disabled){background:#244a32;box-shadow:0 6px 14px #315a4333;transform:translateY(-1px)}.primary-button:disabled{opacity:.7;cursor:wait}.button-spinner{width:14px;height:14px;border:2px solid #ffffff60;border-top-color:#fff;border-radius:50%;animation:button-spin .7s linear infinite}@keyframes button-spin{to{transform:rotate(360deg)}}.document-details{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:0;padding:8px 22px}.document-details>div{padding:13px 0;border-bottom:1px solid #eef1ee}.document-details>div:nth-last-child(-n+2){border-bottom:0}.document-details dt{margin-bottom:5px;color:#929c94;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.document-details dd{margin:0;color:#35463a;font-size:12px;font-weight:550}.detail-modal .modal-actions{margin:0 22px 18px}.modal-leave-active,.modal-enter-active{transition:opacity .18s ease}.modal-leave-active .document-modal,.modal-enter-active .document-modal{transition:transform .18s ease}.modal-enter-from,.modal-leave-to{opacity:0}.modal-enter-from .document-modal,.modal-leave-to .document-modal{transform:translateY(10px) scale(.99)}
@media(max-width:1000px){.status-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:768px){.content{padding:22px 20px 32px}.status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.page-header{align-items:flex-start}.toolbar{align-items:stretch}.toolbar-actions{width:100%}.date-filter{flex:1}.date-filter input{width:100%}}
@media(max-width:520px){.content{padding:18px 14px 28px;gap:15px}.page-header{flex-direction:column;align-items:stretch}.add-document{width:100%}.status-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.status-card{gap:10px;padding:13px}.card-icon{width:34px;height:34px;padding:8px}.card-count{font-size:21px}.card-label{font-size:10px}.toolbar{padding:11px}.toolbar-actions{flex-wrap:wrap}.date-filter{min-width:100%}.clear-filters{width:100%}.table-header{padding:17px}.table-footer{align-items:flex-start;flex-direction:column;padding:12px 14px}.pagination{width:100%;justify-content:space-between;gap:3px}.page-button{min-width:29px;height:29px}.error-banner{align-items:flex-start;margin:0 12px 10px}.error-banner button{flex:none}.modal-backdrop{align-items:end;padding:0}.document-modal{width:100%;max-height:92vh;border-radius:18px 18px 0 0}.modal-form-row{flex-direction:column;gap:15px}.document-form{padding:17px}.modal-header{padding:17px}.document-details{padding:5px 17px}.detail-modal .modal-actions{margin:0 17px 17px}}
@media(max-width:768px){.table-toolbar{align-items:stretch}.table-toolbar .search-input{flex-basis:100%}.table-toolbar .toolbar-actions{width:100%;flex-wrap:wrap}.table-toolbar .toolbar-status-picker,.table-toolbar .toolbar-date-picker{flex:1;min-width:138px}.table-toolbar .export-documents,.table-toolbar .add-document{flex:1}}
@media(prefers-reduced-motion:reduce){.modal-backdrop,.document-modal,.button-spinner{animation:none!important;transition:none!important}}
</style>

<style scoped>
.document-table-skeleton{display:grid;padding:0 12px 12px}.document-skeleton-row{display:grid;grid-template-columns:1.25fr 1fr 1fr 1.2fr .8fr .65fr;align-items:center;gap:15px;min-height:53px;border-bottom:1px solid #edf0ed}.document-skeleton-row i{position:relative;display:block;width:68%;height:11px;overflow:hidden;border-radius:99px;background:#edf1ee}.document-skeleton-row i:first-child{width:56%}.document-skeleton-row i:last-child{width:44%}.document-skeleton-row i::after{position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,#fff9,transparent);content:"";animation:document-shimmer 1.2s ease-in-out infinite}@keyframes document-shimmer{100%{transform:translateX(100%)}}@media(max-width:700px){.document-skeleton-row{grid-template-columns:1fr 1fr 1fr;gap:9px}.document-skeleton-row i:nth-child(n+4){display:none}}@media(prefers-reduced-motion:reduce){.document-skeleton-row i::after{animation:none}}
</style>


