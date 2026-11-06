import { computed, ref } from "vue";
import { createDocument, listDocuments } from "../../../shared/services/payidRepository.js";

const documents = ref([]);
const isLoading = ref(false);
const error = ref(null);
const hasLoaded = ref(false);
let loadedUserId = null;

const STATUS_MAP = {
    vigente: "active",
    verificado: "active",
    verified: "active",
    activo: "active",
    active: "active",
    "por vencer": "expiring",
    expiring: "expiring",
    expira: "expiring",
    vencido: "expired",
    expirado: "expired",
    expired: "expired",
    pendiente: "pending",
    pending: "pending",
    rejected: "rejected"
};

const DOCUMENT_TYPES = {
    1: "DNI",
    2: "Carnet de extranjería",
    3: "Pasaporte",
    4: "Carnet universitario",
};

const DOCUMENT_TYPE_IDS = {
    dni: 1,
    "carnet de extranjería": 2,
    "carnet de extranjeria": 2,
    pasaporte: 3,
    "carnet universitario": 4,
};

function normalizeStatus(status) {
    if (!status) {
        return "pending";
    }

    if (Number(status) === 0) return "pending";
    if (Number(status) === 1) return "active";
    if (Number(status) === 2) return "rejected";

    const normalized = status.toString().trim().toLowerCase();
    return STATUS_MAP[normalized] ?? "pending";
}

function createId() {
    const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : null;
    if (globalCrypto?.randomUUID) {
        return globalCrypto.randomUUID();
    }

    return `doc-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function mapDocument(document) {
    document = document ?? {};
    const expirationDate = document.expirationDate ?? document.ExpirationDate ?? document.fechaVencimiento ?? "";
    let statusKey = document.statusKey ?? normalizeStatus(document.status ?? document.Status ?? document.estado);
    if (statusKey === "active" && expirationDate) {
        const expiration = new Date(expirationDate);
        const now = new Date();
        const expirationDay = Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate());
        const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const daysRemaining = Math.ceil((expirationDay - today) / 86_400_000);
        if (!Number.isNaN(expiration.getTime())) {
            if (daysRemaining < 0) statusKey = "expired";
            else if (daysRemaining <= 30) statusKey = "expiring";
        }
    }
    const normalized = {
        id: document.id ?? document.Id ?? document.documentId ?? document.DocumentId ?? createId(),
        familyMemberId: document.familyMemberId ?? document.FamilyMemberId ?? null,
        type: DOCUMENT_TYPES[document.type ?? document.Type] ?? document.type ?? document.Type ?? document.tipo ?? "",
        number: document.number ?? document.documentNumber ?? document.DocumentNumber ?? document.numero ?? "",
        issueDate: document.issueDate ?? document.IssueDate ?? document.fechaEmision ?? "",
        expirationDate,
        fullName: document.fullName ?? document.FullName ?? "",
        statusKey,
        metadata: {
            rawStatus: document.status ?? document.Status ?? document.estado ?? "",
            source: document
        }
    };

    return normalized;
}

function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem("kapakid:user") || "null");
        return user?.id ?? user?.userId ?? user?.Id ?? null;
    } catch {
        return null;
    }
}

async function fetchDocuments(userId = getCurrentUserId()) {
    if (isLoading.value) {
        return;
    }

    isLoading.value = true;
    error.value = null;
    if (loadedUserId !== userId) documents.value = [];

    try {
        if (!userId) throw new Error("Inicia sesión para consultar tus documentos.");
        const payload = await listDocuments();
        documents.value = payload.map(mapDocument);
        hasLoaded.value = true;
        loadedUserId = userId;
    } catch (err) {
        error.value = err?.message ?? "unknown_error";
        hasLoaded.value = false;
    } finally {
        isLoading.value = false;
    }
}

async function ensureDocuments(userId = getCurrentUserId()) {
    if ((hasLoaded.value && loadedUserId === userId) || isLoading.value) {
        return;
    }

    await fetchDocuments(userId);
}

async function addDocument(newDocument) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Inicia sesión para agregar documentos.");

    let user = {};
    try { user = JSON.parse(localStorage.getItem("kapakid:user") || "{}"); } catch { /* sesión inválida */ }

    const response = await createDocument({
        familyMemberId: newDocument.familyMemberId || null,
        number: newDocument.number,
        fullName: user.nombre ?? user.name ?? "",
        type: newDocument.type,
        issueDate: newDocument.issueDate,
        expirationDate: newDocument.expirationDate || null,
    });
    const document = mapDocument(response);
    documents.value = [...documents.value, document];
    loadedUserId = userId;
    hasLoaded.value = true;
    return document;
}

const statusGroups = computed(() => {
    return documents.value.reduce(
        (acc, document) => {
            acc[document.statusKey] = (acc[document.statusKey] ?? 0) + 1;
            return acc;
        },
        { active: 0, expiring: 0, expired: 0, pending: 0, rejected: 0 }
    );
});

export function useDocumentsStore() {
    return {
        documents,
        isLoading,
        error,
        hasLoaded,
        statusGroups,
        fetchDocuments,
        ensureDocuments,
        addDocument
    };
}
