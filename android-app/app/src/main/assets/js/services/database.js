/**
 * SERVIÇO DE BANCO DE DADOS E CARREGAMENTO INDIVIDUAL SOB DEMANDA (FIRESTORE)
 * Todos os índices e documentos individuais (incluindo retratos Base64 de criaturas)
 * são consultados diretamente do Cloud Firestore com cache em memória e cache local persistente
 * para proporcionar velocidade instantânea.
 */

import { DATABASE_CONFIG } from "./firebaseConfig.js";
import { sanitizeFilename } from "../utils/helpers.js";
import { FALLBACK_INDEXES } from "../data/fallbackData.js";

export const COLLECTIONS = {
    CREATURES: "creatures",
    SPELLS: "spells",
    PLANTS: "plants",
    POTIONS: "potions"
};

const COLLECTION_PREFIX = {
    creatures: "criatura",
    spells: "feitico",
    plants: "planta",
    potions: "pocao"
};

const PROJECT_ID = DATABASE_CONFIG.projectId || "wwcatalog-10546";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_COMMIT_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

// Cache em memória para documentos individuais já abertos
const itemMemoryCache = new Map();
// Cache em memória dos índices leves por coleção
const indexMemoryCache = new Map();

/**
 * Converte valores JavaScript para o formato REST do Firestore
 */
function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === "boolean") return { booleanValue: val };
    if (typeof val === "number") {
        return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === "string") return { stringValue: val };
    if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === "object") {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== undefined) fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return fields;
}

/**
 * Converte valores do formato REST do Firestore para objetos JavaScript nativos
 */
function fromFirestoreValue(valObj) {
    if (!valObj || typeof valObj !== "object") return null;
    if ("nullValue" in valObj) return null;
    if ("booleanValue" in valObj) return Boolean(valObj.booleanValue);
    if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
    if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
    if ("stringValue" in valObj) return valObj.stringValue;
    if ("timestampValue" in valObj) return valObj.timestampValue;
    if ("arrayValue" in valObj) {
        const vals = valObj.arrayValue?.values || [];
        return vals.map(fromFirestoreValue);
    }
    if ("mapValue" in valObj) {
        const fields = valObj.mapValue?.fields || {};
        const out = {};
        for (const [k, v] of Object.entries(fields)) {
            out[k] = fromFirestoreValue(v);
        }
        return out;
    }
    return null;
}

function fromFirestoreDoc(docJson) {
    if (!docJson || !docJson.fields) return null;
    const out = {};
    for (const [k, v] of Object.entries(docJson.fields)) {
        out[k] = fromFirestoreValue(v);
    }
    if (!out.id && docJson.name) {
        out.id = docJson.name.split("/").pop();
    }
    return out;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function firestoreGetDoc(collectionPath, docId) {
    try {
        const res = await fetchWithTimeout(`${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return fromFirestoreDoc(json);
    } catch {
        return null;
    }
}

async function firestoreListCollection(collectionPath) {
    const docs = [];
    let pageToken = "";
    try {
        do {
            const url = `${FIRESTORE_BASE_URL}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
            const res = await fetchWithTimeout(url, {}, 10000);
            if (!res.ok) break;
            const json = await res.json();
            const list = json.documents || [];
            for (const docJson of list) {
                const parsed = fromFirestoreDoc(docJson);
                if (parsed) docs.push(parsed);
            }
            pageToken = json.nextPageToken || "";
        } while (pageToken);
    } catch {
        // Retorna o que foi coletado
    }
    return docs;
}

async function firestoreSetDoc(collectionPath, docId, dataObj) {
    try {
        const res = await fetchWithTimeout(
            `${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: toFirestoreFields(dataObj) })
            },
            10000
        );
        return res.ok;
    } catch {
        return false;
    }
}

async function firestoreDeleteDoc(collectionPath, docId) {
    try {
        const res = await fetchWithTimeout(
            `${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`,
            { method: "DELETE" },
            8000
        );
        return res.ok;
    } catch {
        return false;
    }
}

async function firestoreBatchWrite(collectionPath, recordsArray) {
    try {
        const writes = recordsArray.map(rec => ({
            update: {
                name: `projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${rec.id}`,
                fields: toFirestoreFields(rec)
            }
        }));
        const res = await fetchWithTimeout(
            FIRESTORE_COMMIT_URL,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ writes })
            },
            15000
        );
        return res.ok;
    } catch {
        return false;
    }
}

export async function initDatabaseConnection() {
    return true;
}

export function buildItemId(collectionName, item, prefix = "") {
    if (item.id && typeof item.id === "string" && item.id.trim()) {
        return item.id.trim();
    }
    const rawName = item.nome || item.name || `item_${Date.now()}`;
    const baseName = rawName.split("(")[0].trim() || rawName;
    const clean = sanitizeFilename(baseName);
    const colPrefix = prefix || COLLECTION_PREFIX[collectionName] || "item";
    if (collectionName === COLLECTIONS.CREATURES) {
        return clean;
    }
    return clean.startsWith(`${colPrefix}_`) ? clean : `${colPrefix}_${clean}`;
}

export function buildSummaryEntry(collectionName, item) {
    const id = buildItemId(collectionName, item);

    switch (collectionName) {
        case COLLECTIONS.CREATURES:
            return {
                id,
                nome: item.nome || item.name || "Espécie sem nome",
                classificacao: item.classificacao || item.classification || "XXX",
                licenca: item.licenca || item.license || "Comum",
                porte: item.porte || "Médio",
                tamanho: item.tamanho || "",
                peso: item.peso || "",
                locomocao: item.locomocao || "Terrestres",
                velocidade: item.velocidade || "",
                interacao: item.interacao || "Pacífico",
                tipo: item.tipo || "Neutro",
                origem: item.origem || "Natural"
            };

        case COLLECTIONS.SPELLS:
            return {
                id,
                name: item.name || item.nome || "Feitiço sem nome",
                cat: Array.isArray(item.cat) ? item.cat[0] : (item.cat || "Charme"),
                lvl: String(item.lvl || "1"),
                tipo: item.tipo || "Utilitário",
                pronuncia: item.pronuncia || item.pronunciation || "",
                condicao: item.condicao || "Nenhuma"
            };

        case COLLECTIONS.PLANTS:
            return {
                id,
                nome: item.nome || item.name || "Planta sem nome",
                categoria: normalizePlantCategory(item.categoria),
                nivel: String(item.nivel || extractPlantLevel(item.peculiaridades) || "1"),
                manejo_cd: Number(item.manejo_cd || extractPlantCd(item.peculiaridades) || 12)
            };

        case COLLECTIONS.POTIONS: {
            const lvl = String(item.nivel ?? item["nível"] ?? "1");
            const cd = item.sistema?.dificuldade_cd ?? item.dificuldade_cd ?? 14;
            const prep = item.sistema?.tempo_preparo ?? item.tempo_preparo ?? "1 hora";
            const admin = item.sistema?.administracao ?? item.administracao ?? "Ingestão";
            return {
                id,
                nome: item.nome || item.name || "Poção sem nome",
                tipo: item.tipo || "Poção",
                nivel: lvl,
                dificuldade_cd: Number(cd),
                tempo_preparo: prep,
                administracao: admin
            };
        }

        default:
            return { id, nome: item.nome || item.name || id };
    }
}

function normalizePlantCategory(cat) {
    if (!cat) return "Popular";
    return String(cat).toLowerCase().includes("dif") ? "Difícil de Adquirir" : "Popular";
}

function extractPlantLevel(peculiaridades = "") {
    const m = String(peculiaridades).match(/Nível de Herbologia:\s*Nível\s*(\d+)/i);
    return m ? m[1] : "1";
}

function extractPlantCd(peculiaridades = "") {
    const m = String(peculiaridades).match(/CD\s*(\d+)/i);
    return m ? Number(m[1]) : 12;
}

// Auxiliares de cache local no navegador para aceleração máxima
function getLocalCacheIndex(collectionName) {
    try {
        const raw = localStorage.getItem(`ww_idx_${collectionName}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function setLocalCacheIndex(collectionName, list) {
    try {
        localStorage.setItem(`ww_idx_${collectionName}`, JSON.stringify(list));
    } catch {
        // quota excedida ou inacessível
    }
}

function getLocalCacheItem(collectionName, id) {
    try {
        const raw = sessionStorage.getItem(`ww_doc_${collectionName}_${id}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function setLocalCacheItem(collectionName, id, data) {
    try {
        sessionStorage.setItem(`ww_doc_${collectionName}_${id}`, JSON.stringify(data));
    } catch {
        // quota excedida ou inacessível
    }
}

/**
 * 1. CARREGAMENTO RÁPIDO DO ÍNDICE DA COLEÇÃO NO FIRESTORE (Tier 1)
 */
export async function fetchCatalogIndex(collectionName, forceRefresh = false) {
    // 1.1 Cache em memória ativa (0ms)
    if (!forceRefresh && indexMemoryCache.has(collectionName)) {
        return indexMemoryCache.get(collectionName);
    }

    // 1.2 Cache local persistente para inicialização imediata
    if (!forceRefresh) {
        const localCached = getLocalCacheIndex(collectionName);
        if (localCached && localCached.length > 0) {
            indexMemoryCache.set(collectionName, localCached);
            // Atualiza em background sem travar o usuário
            fetchCatalogIndex(collectionName, true).catch(() => {});
            return localCached;
        }
    }

    // 1.3 Se ainda não temos dados e não é refresh forçado, usa o fallback local embutido
    if (!forceRefresh && FALLBACK_INDEXES && Array.isArray(FALLBACK_INDEXES[collectionName]) && FALLBACK_INDEXES[collectionName].length > 0) {
        const defaultList = FALLBACK_INDEXES[collectionName].map(item => buildSummaryEntry(collectionName, item));
        indexMemoryCache.set(collectionName, defaultList);
        setLocalCacheIndex(collectionName, defaultList);
        // Sincroniza em background
        fetchCatalogIndex(collectionName, true).catch(() => {});
        return defaultList;
    }

    const summaryMap = new Map();

    try {
        // 1.4 Consulta o documento de índice leve no Firestore (_indexes/{collectionName})
        const remoteIdx = await firestoreGetDoc("_indexes", collectionName);
        if (remoteIdx && Array.isArray(remoteIdx.items)) {
            const remoteDeleted = new Set(remoteIdx.deletedIds || []);
            for (const entry of remoteIdx.items) {
                const summary = buildSummaryEntry(collectionName, entry);
                if (!remoteDeleted.has(summary.id)) {
                    summaryMap.set(summary.id, summary);
                }
            }
        } else {
            // 1.5 Fallback remoto: se o documento _indexes não existir, lista os documentos da coleção diretamente do Firestore
            const docs = await firestoreListCollection(collectionName);
            for (const doc of docs) {
                const summary = buildSummaryEntry(collectionName, doc);
                summaryMap.set(summary.id, summary);
                itemMemoryCache.set(`${collectionName}:${summary.id}`, doc);
            }
            if (summaryMap.size > 0) {
                await syncCollectionIndex(collectionName, Array.from(summaryMap.values())).catch(() => {});
            }
        }
    } catch (err) {
        console.warn(`[Catalog] Falha ao consultar índice remoto de ${collectionName}:`, err);
    }

    // Se o Firestore respondeu com itens, salva no cache e atualiza a memória
    if (summaryMap.size > 0) {
        const resultList = Array.from(summaryMap.values());
        indexMemoryCache.set(collectionName, resultList);
        setLocalCacheIndex(collectionName, resultList);
        return resultList;
    }

    // Fallback de emergência: se a rede falhou e nada foi baixado, usa o fallback local
    if (FALLBACK_INDEXES && Array.isArray(FALLBACK_INDEXES[collectionName])) {
        const defaultList = FALLBACK_INDEXES[collectionName].map(item => buildSummaryEntry(collectionName, item));
        indexMemoryCache.set(collectionName, defaultList);
        return defaultList;
    }

    return [];
}

/**
 * 2. CARREGAMENTO INDIVIDUAL DE ITEM SOB DEMANDA NO FIRESTORE (Tier 2)
 */
export async function fetchItemById(collectionName, id) {
    if (!id) return null;
    const cacheKey = `${collectionName}:${id}`;

    // 1. Cache em memória para acesso repetido instantâneo (0ms)
    if (itemMemoryCache.has(cacheKey)) {
        return itemMemoryCache.get(cacheKey);
    }

    // 2. Cache em sessionStorage
    const sessionCached = getLocalCacheItem(collectionName, id);
    if (sessionCached) {
        itemMemoryCache.set(cacheKey, sessionCached);
        return sessionCached;
    }

    // 3. Busca documento individual diretamente no Cloud Firestore
    const remoteDoc = await firestoreGetDoc(collectionName, id);
    if (remoteDoc) {
        const data = { id, ...remoteDoc };
        itemMemoryCache.set(cacheKey, data);
        setLocalCacheItem(collectionName, id, data);
        return data;
    }

    return null;
}

export async function fetchItemsByIds(collectionName, ids = []) {
    const promises = ids.map(id => fetchItemById(collectionName, id));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

async function syncCollectionIndex(collectionName, currentSummaryList, deletedIds = []) {
    await firestoreSetDoc("_indexes", collectionName, {
        updatedAt: new Date().toISOString(),
        count: currentSummaryList.length,
        items: currentSummaryList,
        deletedIds
    });
}

/**
 * 3. SALVAR ITEM INDIVIDUAL NO FIRESTORE
 */
export async function saveRecord(collectionName, dataObject, prefix = "registro", options = { downloadBackup: false }) {
    const id = buildItemId(collectionName, dataObject, prefix);
    const fullRecord = {
        ...dataObject,
        id,
        updatedAt: new Date().toISOString()
    };

    const cacheKey = `${collectionName}:${id}`;
    itemMemoryCache.set(cacheKey, fullRecord);
    setLocalCacheItem(collectionName, id, fullRecord);

    const currentIndex = await fetchCatalogIndex(collectionName);
    const newSummary = buildSummaryEntry(collectionName, fullRecord);
    const existingIdx = currentIndex.findIndex(item => item.id === id);
    if (existingIdx >= 0) {
        currentIndex[existingIdx] = newSummary;
    } else {
        currentIndex.push(newSummary);
    }
    indexMemoryCache.set(collectionName, currentIndex);
    setLocalCacheIndex(collectionName, currentIndex);

    const savedToCloud = await firestoreSetDoc(collectionName, id, fullRecord);
    if (savedToCloud) {
        await syncCollectionIndex(collectionName, currentIndex);
    }

    if (options.downloadBackup) {
        downloadJsonFile(fullRecord, `${id}.json`);
    }

    return { id, record: fullRecord, savedToCloud };
}

/**
 * 4. SALVAR LOTE DE ITENS EM MASSA NO FIRESTORE
 */
export async function saveBulkRecords(collectionName, dataArray, prefix = "item", onProgress = null) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("A lista fornecida para importação em massa está vazia ou é inválida.");
    }

    const currentIndex = await fetchCatalogIndex(collectionName);
    const indexMap = new Map(currentIndex.map(item => [item.id, item]));
    const normalizedRecords = [];

    for (const rawItem of dataArray) {
        const id = buildItemId(collectionName, rawItem, prefix);
        const fullRecord = {
            ...rawItem,
            id,
            updatedAt: new Date().toISOString()
        };
        normalizedRecords.push(fullRecord);
        itemMemoryCache.set(`${collectionName}:${id}`, fullRecord);
        setLocalCacheItem(collectionName, id, fullRecord);
        indexMap.set(id, buildSummaryEntry(collectionName, fullRecord));
    }

    const updatedIndexList = Array.from(indexMap.values());
    indexMemoryCache.set(collectionName, updatedIndexList);
    setLocalCacheIndex(collectionName, updatedIndexList);

    let savedToCloud = true;
    const CHUNK_SIZE = 20;
    for (let i = 0; i < normalizedRecords.length; i += CHUNK_SIZE) {
        const chunk = normalizedRecords.slice(i, i + CHUNK_SIZE);
        const ok = await firestoreBatchWrite(collectionName, chunk);
        if (!ok) savedToCloud = false;
        if (onProgress) {
            onProgress(Math.min(i + chunk.length, normalizedRecords.length), normalizedRecords.length);
        }
    }

    if (savedToCloud) {
        await syncCollectionIndex(collectionName, updatedIndexList);
    }

    return {
        count: normalizedRecords.length,
        savedToCloud
    };
}

/**
 * 5. REMOVER ITEM INDIVIDUAL DO FIRESTORE
 */
export async function deleteRecord(collectionName, id) {
    if (!id) return false;
    itemMemoryCache.delete(`${collectionName}:${id}`);
    try {
        sessionStorage.removeItem(`ww_doc_${collectionName}_${id}`);
    } catch {
        // Ignora
    }

    const currentIndex = await fetchCatalogIndex(collectionName);
    const filteredIndex = currentIndex.filter(item => item.id !== id);
    indexMemoryCache.set(collectionName, filteredIndex);
    setLocalCacheIndex(collectionName, filteredIndex);

    await firestoreDeleteDoc(collectionName, id);
    await syncCollectionIndex(collectionName, filteredIndex);
    return true;
}

export function downloadJsonFile(dataObject, filename = "exportacao_ministerial.json") {
    const jsonString = JSON.stringify(dataObject, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
