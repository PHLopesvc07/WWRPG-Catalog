/**
 * SERVICO DE BANCO DE DADOS, CACHE PERSISTENTE DA API E SINCRONIZACAO (CLOUD FIRESTORE REST)
 *
 * Fluxo de operacao:
 * 1. Primeira interacao: consulta obrigatoriamente a API Cloud Firestore, exibe os dados reais,
 *    grava os indices e baixa em segundo plano o acervo completo para o cache local persistente
 *    (Navegador IndexedDB/localStorage, Android Nativo e React Native AsyncStorage).
 * 2. Aberturas posteriores: exibe instantaneamente os dados do cache previamente baixado da API
 *    (~0-5ms) e revalida silenciosamente em background com o Firestore (Stale-While-Revalidate).
 * 3. Contingencia estrita: o fallback estatico embutido (FALLBACK_INDEXES) so e acionado em
 *    ultimo caso absoluto (dispositivo sem internet na primeira abertura sem cache da API) e
 *    jamais sobrescreve o cache persistente.
 */

import { DATABASE_CONFIG } from "./firebaseConfig.js";
import { sanitizeFilename } from "../utils/helpers.js";
import { FALLBACK_INDEXES } from "../data/fallbackData.js";
import {
    configurePersistentStorageAdapter,
    readCachedApiIndex,
    writeCachedApiIndex,
    readCachedApiDocument,
    writeCachedApiDocument,
    writeCachedApiDocumentsBatch,
    removeCachedApiDocument,
    readHydrationMeta,
    writeHydrationMeta
} from "./cacheStore.js";

export { configurePersistentStorageAdapter };

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

// Cache em memoria ativa da sessao atual
const itemMemoryCache = new Map();
const indexMemoryCache = new Map();

// Deduplicacao de requisicoes simultaneas
const inflightIndexRequests = new Map();
const inflightRevalidations = new Map();
const inflightDocRequests = new Map();
let warmupPromise = null;

// Inscritos para atualizacoes reativas vindas da revalidacao em segundo plano
const catalogUpdateListeners = new Set();

export function subscribeToCatalogUpdates(listener) {
    if (typeof listener !== "function") return () => {};
    catalogUpdateListeners.add(listener);
    return () => {
        catalogUpdateListeners.delete(listener);
    };
}

function notifyCatalogListeners(payload) {
    for (const listener of catalogUpdateListeners) {
        try {
            listener(payload);
        } catch {
            // Evita interromper outros inscritos
        }
    }
    if (typeof document !== "undefined" && typeof CustomEvent !== "undefined") {
        try {
            document.dispatchEvent(new CustomEvent("ww-catalog-updated", { detail: payload }));
        } catch {
            // Ignora em ambientes nativos sem DOM
        }
    }
}

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

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function firestoreGetDoc(collectionPath, docId, timeoutMs = 6000) {
    try {
        const res = await fetchWithTimeout(
            `${FIRESTORE_BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`,
            {},
            timeoutMs
        );
        if (!res.ok) return null;
        const json = await res.json();
        return fromFirestoreDoc(json);
    } catch {
        return null;
    }
}

async function firestoreListCollection(collectionPath, options = {}) {
    const pageSize = options.pageSize || (collectionPath === COLLECTIONS.CREATURES ? 25 : 250);
    const timeoutMs = options.timeoutMs || 18000;
    const onPage = typeof options.onPage === "function" ? options.onPage : null;

    const docs = [];
    let pageToken = "";
    let completed = false;

    try {
        do {
            const url = `${FIRESTORE_BASE_URL}/${collectionPath}?pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
            const res = await fetchWithTimeout(url, {}, timeoutMs);
            if (!res.ok) {
                completed = false;
                break;
            }
            const json = await res.json();
            const list = json.documents || [];
            const pageDocs = [];
            for (const docJson of list) {
                const parsed = fromFirestoreDoc(docJson);
                if (parsed) {
                    docs.push(parsed);
                    pageDocs.push(parsed);
                }
            }
            if (onPage && pageDocs.length > 0) {
                await onPage(pageDocs);
            }
            pageToken = json.nextPageToken || "";
            if (!pageToken) {
                completed = true;
            }
        } while (pageToken);
    } catch {
        completed = false;
    }

    return { docs, completed };
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

/**
 * Consulta o indice diretamente na API Cloud Firestore (Tier 1)
 */
async function fetchIndexDirectlyFromApi(collectionName) {
    const summaryMap = new Map();
    let remoteUpdatedAt = "";

    try {
        const remoteIdx = await firestoreGetDoc("_indexes", collectionName);
        if (remoteIdx && Array.isArray(remoteIdx.items) && remoteIdx.items.length > 0) {
            remoteUpdatedAt = remoteIdx.updatedAt || "";
            const remoteDeleted = new Set(remoteIdx.deletedIds || []);
            for (const entry of remoteIdx.items) {
                const summary = buildSummaryEntry(collectionName, entry);
                if (!remoteDeleted.has(summary.id)) {
                    summaryMap.set(summary.id, summary);
                }
            }
        } else {
            const { docs, completed } = await firestoreListCollection(collectionName, {
                onPage: async pageDocs => {
                    const normalized = pageDocs.map(doc => {
                        const id = buildItemId(collectionName, doc);
                        const fullDoc = { id, ...doc };
                        itemMemoryCache.set(`${collectionName}:${id}`, fullDoc);
                        return fullDoc;
                    });
                    await writeCachedApiDocumentsBatch(collectionName, normalized);
                }
            });

            for (const doc of docs) {
                const summary = buildSummaryEntry(collectionName, doc);
                summaryMap.set(summary.id, summary);
            }

            if (summaryMap.size > 0) {
                remoteUpdatedAt = new Date().toISOString();
                await syncCollectionIndex(collectionName, Array.from(summaryMap.values()), [], remoteUpdatedAt).catch(() => {});
                if (completed) {
                    await writeHydrationMeta(collectionName, {
                        hydrated: true,
                        count: summaryMap.size,
                        remoteUpdatedAt,
                        hydratedAt: Date.now()
                    });
                }
            }
        }
    } catch (err) {
        console.warn(`[Catalog] Conexao com Firestore falhou para ${collectionName}:`, err);
    }

    if (summaryMap.size === 0) {
        return null;
    }

    return {
        items: Array.from(summaryMap.values()),
        remoteUpdatedAt
    };
}

/**
 * Revalida silenciosamente o indice em background contra a API Cloud Firestore
 * e notifica a UI caso existam novos dados na nuvem.
 */
async function revalidateIndexFromApi(collectionName, cachedApiIndex) {
    if (inflightRevalidations.has(collectionName)) {
        return inflightRevalidations.get(collectionName);
    }

    const promise = (async () => {
        const apiResult = await fetchIndexDirectlyFromApi(collectionName);
        if (!apiResult || apiResult.items.length === 0) return;

        const prevItemsJson = JSON.stringify(cachedApiIndex?.items || []);
        const nextItemsJson = JSON.stringify(apiResult.items);
        const hasChanged = prevItemsJson !== nextItemsJson ||
            Boolean(apiResult.remoteUpdatedAt && apiResult.remoteUpdatedAt !== cachedApiIndex?.remoteUpdatedAt);

        indexMemoryCache.set(collectionName, apiResult.items);
        await writeCachedApiIndex(collectionName, apiResult.items, apiResult.remoteUpdatedAt);

        if (hasChanged) {
            notifyCatalogListeners({
                type: "index",
                collection: collectionName,
                items: apiResult.items,
                remoteUpdatedAt: apiResult.remoteUpdatedAt
            });
            hydrateSingleCollectionDocuments(
                collectionName,
                apiResult.remoteUpdatedAt,
                apiResult.items.length,
                true
            ).catch(() => {});
        }
    })();

    inflightRevalidations.set(collectionName, promise);
    try {
        await promise;
    } finally {
        inflightRevalidations.delete(collectionName);
    }
}

/**
 * Revalida silenciosamente um documento individual aberto em background
 */
async function revalidateDocumentFromApi(collectionName, id, previousData) {
    const remoteDoc = await firestoreGetDoc(collectionName, id);
    if (!remoteDoc) return;

    const freshData = { id, ...remoteDoc };
    const cacheKey = `${collectionName}:${id}`;
    itemMemoryCache.set(cacheKey, freshData);
    await writeCachedApiDocument(collectionName, id, freshData);

    if (JSON.stringify(previousData) !== JSON.stringify(freshData)) {
        notifyCatalogListeners({
            type: "document",
            collection: collectionName,
            id,
            data: freshData
        });
    }
}

/**
 * 1. CARREGAMENTO DO INDICE DA COLECAO (Tier 1)
 * - 1a interacao (sem cache da API): baixa diretamente da API Cloud Firestore e salva no cache local.
 * - Aberturas posteriores: retorna o cache da API instantaneamente (~0-5ms) e revalida em segundo plano.
 * - Fallback estatico: usado exclusivamente em ultimo caso se dispositivo estiver offline e sem cache da API.
 */
export async function fetchCatalogIndex(collectionName, forceRefresh = false) {
    // 1.1 Cache em memoria ativa na mesma sessao
    if (!forceRefresh && indexMemoryCache.has(collectionName)) {
        return indexMemoryCache.get(collectionName);
    }

    // 1.2 Aberturas posteriores: exibe instantaneamente o cache baixado anteriormente da API
    if (!forceRefresh) {
        const cachedApiIndex = await readCachedApiIndex(collectionName);
        if (cachedApiIndex && Array.isArray(cachedApiIndex.items) && cachedApiIndex.items.length > 0) {
            indexMemoryCache.set(collectionName, cachedApiIndex.items);
            revalidateIndexFromApi(collectionName, cachedApiIndex).catch(() => {});
            return cachedApiIndex.items;
        }
    }

    // 1.3 Primeira interacao (ou refresh forcado): requisita diretamente da API Cloud Firestore
    if (inflightIndexRequests.has(collectionName)) {
        return inflightIndexRequests.get(collectionName);
    }

    const requestPromise = (async () => {
        const apiResult = await fetchIndexDirectlyFromApi(collectionName);
        if (apiResult && apiResult.items.length > 0) {
            indexMemoryCache.set(collectionName, apiResult.items);
            await writeCachedApiIndex(collectionName, apiResult.items, apiResult.remoteUpdatedAt);
            return apiResult.items;
        }

        // 1.4 Se um refresh forcado falhar por queda de rede, preserva o cache anterior da API
        const previousApiCache = await readCachedApiIndex(collectionName);
        if (previousApiCache && Array.isArray(previousApiCache.items) && previousApiCache.items.length > 0) {
            console.warn(`[Catalog] Firestore indisponivel no momento. Utilizando cache persistente da API para ${collectionName}.`);
            indexMemoryCache.set(collectionName, previousApiCache.items);
            return previousApiCache.items;
        }

        // 1.5 ULTIMO CASO ESTRITO (EMERGENCIA OFFLINE): Fallback estatico embutido (jamais gravado no cache!)
        if (FALLBACK_INDEXES && Array.isArray(FALLBACK_INDEXES[collectionName]) && FALLBACK_INDEXES[collectionName].length > 0) {
            console.warn(`[Catalog] AVISO: Firestore e cache da API indisponiveis. Recorrendo ao fallback estatico de emergencia para ${collectionName}.`);
            return FALLBACK_INDEXES[collectionName].map(item => buildSummaryEntry(collectionName, item));
        }

        return [];
    })();

    inflightIndexRequests.set(collectionName, requestPromise);
    try {
        return await requestPromise;
    } finally {
        inflightIndexRequests.delete(collectionName);
    }
}

/**
 * 2. CARREGAMENTO INDIVIDUAL DE ITEM SOB DEMANDA (Tier 2)
 * - Se ja baixado da API no cache persistente, exibe instantaneamente (~1-5ms) e revalida se necessario.
 * - Caso contrario, baixa da API Cloud Firestore e persiste localmente para os proximos acessos.
 */
export async function fetchItemById(collectionName, id, forceRefresh = false) {
    if (!id) return null;
    const cacheKey = `${collectionName}:${id}`;

    // 2.1 Cache em memoria da sessao ativa
    if (!forceRefresh && itemMemoryCache.has(cacheKey)) {
        return itemMemoryCache.get(cacheKey);
    }

    // 2.2 Cache persistente previamente baixado da API (IndexedDB / Android Nativo / AsyncStorage)
    if (!forceRefresh) {
        const cachedRecord = await readCachedApiDocument(collectionName, id);
        if (cachedRecord && cachedRecord.data) {
            itemMemoryCache.set(cacheKey, cachedRecord.data);
            const ageMs = Date.now() - (cachedRecord.savedAt || 0);
            if (ageMs > 5 * 60 * 1000) {
                revalidateDocumentFromApi(collectionName, id, cachedRecord.data).catch(() => {});
            }
            return cachedRecord.data;
        }
    }

    // 2.3 Deduplicacao de requisicao individual para a API Cloud Firestore
    if (inflightDocRequests.has(cacheKey)) {
        return inflightDocRequests.get(cacheKey);
    }

    const docPromise = (async () => {
        const remoteDoc = await firestoreGetDoc(collectionName, id);
        if (remoteDoc) {
            const data = { id, ...remoteDoc };
            itemMemoryCache.set(cacheKey, data);
            await writeCachedApiDocument(collectionName, id, data);
            return data;
        }

        // 2.4 Contingencia com cache da API caso um forceRefresh tenha falhado offline
        const cachedRecord = await readCachedApiDocument(collectionName, id);
        if (cachedRecord && cachedRecord.data) {
            itemMemoryCache.set(cacheKey, cachedRecord.data);
            return cachedRecord.data;
        }

        // 2.5 ULTIMO CASO ESTRITO: Fallback estatico embutido (sem persistir no cache)
        if (FALLBACK_INDEXES && Array.isArray(FALLBACK_INDEXES[collectionName])) {
            const fallbackItem = FALLBACK_INDEXES[collectionName].find(item => item.id === id);
            if (fallbackItem) {
                console.warn(`[Catalog] AVISO: Firestore e cache da API indisponiveis. Detalhe de ${id} obtido via fallback de emergencia.`);
                return { ...fallbackItem };
            }
        }

        return null;
    })();

    inflightDocRequests.set(cacheKey, docPromise);
    try {
        return await docPromise;
    } finally {
        inflightDocRequests.delete(cacheKey);
    }
}

export async function fetchItemsByIds(collectionName, ids = []) {
    const promises = ids.map(id => fetchItemById(collectionName, id));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

/**
 * Baixa e armazena em cache persistente todos os documentos completos de uma colecao da API
 */
async function hydrateSingleCollectionDocuments(collectionName, expectedUpdatedAt = "", expectedCount = 0, force = false) {
    if (!force) {
        const meta = await readHydrationMeta(collectionName);
        if (
            meta &&
            meta.hydrated === true &&
            (!expectedCount || meta.count >= expectedCount) &&
            (!expectedUpdatedAt || meta.remoteUpdatedAt === expectedUpdatedAt)
        ) {
            return { collection: collectionName, skipped: true, count: meta.count };
        }
    }

    let downloadedCount = 0;
    const { docs, completed } = await firestoreListCollection(collectionName, {
        pageSize: collectionName === COLLECTIONS.CREATURES ? 25 : 250,
        timeoutMs: 20000,
        onPage: async pageDocs => {
            const normalizedPage = pageDocs.map(doc => {
                const id = buildItemId(collectionName, doc);
                const fullDoc = { id, ...doc };
                itemMemoryCache.set(`${collectionName}:${id}`, fullDoc);
                return fullDoc;
            });
            downloadedCount += normalizedPage.length;
            await writeCachedApiDocumentsBatch(collectionName, normalizedPage);
        }
    });

    if (completed && docs.length > 0) {
        await writeHydrationMeta(collectionName, {
            hydrated: true,
            count: docs.length,
            remoteUpdatedAt: expectedUpdatedAt || "",
            hydratedAt: Date.now()
        });
        notifyCatalogListeners({
            type: "warmup",
            collection: collectionName,
            count: docs.length,
            status: "completed"
        });
    }

    return { collection: collectionName, skipped: false, count: downloadedCount, completed };
}

/**
 * 2.6 PRE-CARREGAMENTO INTEGRAL EM SEGUNDO PLANO NA PRIMEIRA INTERACAO
 * Garante que logo no primeiro uso (web ou mobile) todo o conteudo retornado pela API
 * (indices + fichas completas + retratos Base64) seja salvo localmente sem travar a interface.
 */
export function warmUpFullApiCache(options = { force: false }) {
    if (warmupPromise) return warmupPromise;

    warmupPromise = (async () => {
        // Cede prioridade aos quadros iniciais da interface (150ms)
        await new Promise(resolve => setTimeout(resolve, 150));

        const orderedCollections = [
            COLLECTIONS.SPELLS,
            COLLECTIONS.PLANTS,
            COLLECTIONS.POTIONS,
            COLLECTIONS.CREATURES
        ];

        for (const col of orderedCollections) {
            try {
                let cachedIdx = await readCachedApiIndex(col);
                if (!cachedIdx || !Array.isArray(cachedIdx.items) || cachedIdx.items.length === 0) {
                    const freshItems = await fetchCatalogIndex(col, true);
                    if (!freshItems || freshItems.length === 0) continue;
                    cachedIdx = await readCachedApiIndex(col);
                }

                if (cachedIdx && Array.isArray(cachedIdx.items) && cachedIdx.items.length > 0) {
                    await hydrateSingleCollectionDocuments(
                        col,
                        cachedIdx.remoteUpdatedAt || "",
                        cachedIdx.items.length,
                        Boolean(options?.force)
                    );
                }
            } catch (err) {
                console.warn(`[Catalog] Aviso ao pre-cachear colecao ${col}:`, err);
            }
        }
    })().finally(() => {
        warmupPromise = null;
    });

    return warmupPromise;
}

async function syncCollectionIndex(collectionName, currentSummaryList, deletedIds = [], customUpdatedAt = "") {
    const updatedAt = customUpdatedAt || new Date().toISOString();
    const ok = await firestoreSetDoc("_indexes", collectionName, {
        updatedAt,
        count: currentSummaryList.length,
        items: currentSummaryList,
        deletedIds
    });
    if (ok) {
        await writeCachedApiIndex(collectionName, currentSummaryList, updatedAt);
    }
    return ok;
}

/**
 * 3. SALVAR ITEM INDIVIDUAL NO FIRESTORE E ATUALIZAR CACHE PERSISTENTE
 */
export async function saveRecord(collectionName, dataObject, prefix = "registro", options = { downloadBackup: false }) {
    const id = buildItemId(collectionName, dataObject, prefix);
    const updatedAt = new Date().toISOString();
    const fullRecord = {
        ...dataObject,
        id,
        updatedAt
    };

    const cacheKey = `${collectionName}:${id}`;
    itemMemoryCache.set(cacheKey, fullRecord);
    await writeCachedApiDocument(collectionName, id, fullRecord);

    const currentIndex = [...(await fetchCatalogIndex(collectionName))];
    const newSummary = buildSummaryEntry(collectionName, fullRecord);
    const existingIdx = currentIndex.findIndex(item => item.id === id);
    if (existingIdx >= 0) {
        currentIndex[existingIdx] = newSummary;
    } else {
        currentIndex.push(newSummary);
    }

    indexMemoryCache.set(collectionName, currentIndex);
    await writeCachedApiIndex(collectionName, currentIndex, updatedAt);

    const savedToCloud = await firestoreSetDoc(collectionName, id, fullRecord);
    if (savedToCloud) {
        await syncCollectionIndex(collectionName, currentIndex, [], updatedAt);
    }

    notifyCatalogListeners({
        type: "index",
        collection: collectionName,
        items: currentIndex,
        remoteUpdatedAt: updatedAt
    });

    if (options.downloadBackup) {
        downloadJsonFile(fullRecord, `${id}.json`);
    }

    return { id, record: fullRecord, savedToCloud };
}

/**
 * 4. SALVAR LOTE DE ITENS EM MASSA NO FIRESTORE E CACHE PERSISTENTE
 */
export async function saveBulkRecords(collectionName, dataArray, prefix = "item", onProgress = null) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("A lista fornecida para importação em massa está vazia ou é inválida.");
    }

    const updatedAt = new Date().toISOString();
    const currentIndex = await fetchCatalogIndex(collectionName);
    const indexMap = new Map(currentIndex.map(item => [item.id, item]));
    const normalizedRecords = [];

    for (const rawItem of dataArray) {
        const id = buildItemId(collectionName, rawItem, prefix);
        const fullRecord = {
            ...rawItem,
            id,
            updatedAt
        };
        normalizedRecords.push(fullRecord);
        itemMemoryCache.set(`${collectionName}:${id}`, fullRecord);
        indexMap.set(id, buildSummaryEntry(collectionName, fullRecord));
    }

    await writeCachedApiDocumentsBatch(collectionName, normalizedRecords);

    const updatedIndexList = Array.from(indexMap.values());
    indexMemoryCache.set(collectionName, updatedIndexList);
    await writeCachedApiIndex(collectionName, updatedIndexList, updatedAt);

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
        await syncCollectionIndex(collectionName, updatedIndexList, [], updatedAt);
    }

    notifyCatalogListeners({
        type: "index",
        collection: collectionName,
        items: updatedIndexList,
        remoteUpdatedAt: updatedAt
    });

    return {
        count: normalizedRecords.length,
        savedToCloud
    };
}

/**
 * 5. REMOVER ITEM INDIVIDUAL DO FIRESTORE E DO CACHE PERSISTENTE
 */
export async function deleteRecord(collectionName, id) {
    if (!id) return false;
    const updatedAt = new Date().toISOString();

    itemMemoryCache.delete(`${collectionName}:${id}`);
    await removeCachedApiDocument(collectionName, id);

    const currentIndex = await fetchCatalogIndex(collectionName);
    const filteredIndex = currentIndex.filter(item => item.id !== id);
    indexMemoryCache.set(collectionName, filteredIndex);
    await writeCachedApiIndex(collectionName, filteredIndex, updatedAt);

    await firestoreDeleteDoc(collectionName, id);
    await syncCollectionIndex(collectionName, filteredIndex, [id], updatedAt);

    notifyCatalogListeners({
        type: "index",
        collection: collectionName,
        items: filteredIndex,
        remoteUpdatedAt: updatedAt
    });

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
