/**
 * SERVIÇO DE BANCO DE DADOS E PERSISTÊNCIA HÍBRIDA (FIREBASE FIRESTORE + ARQUIVOS INDIVIDUAIS)
 * Projeto Firebase: wwcatalog-10546
 * Arquitetura de Carregamento Individual Sob Demanda (Lazy / On-Demand Item Loading)
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getActiveFirebaseConfig } from "./firebaseConfig.js";
import { sanitizeFilename } from "../utils/helpers.js";

export const COLLECTIONS = {
    CREATURES: "creatures",
    SPELLS: "spells",
    PLANTS: "plants",
    POTIONS: "potions"
};

const COLLECTION_META = {
    creatures: {
        folder: "./dados",
        indexFile: "./dados/indice.json",
        fullFile: "./dados/catalogo_criaturas.json",
        prefix: "criatura"
    },
    spells: {
        folder: "./feiticos",
        indexFile: "./feiticos/indice.json",
        fullFile: "./feiticos/indice_feiticos.json",
        prefix: "feitico"
    },
    plants: {
        folder: "./plantas",
        indexFile: "./plantas/indice.json",
        fullFile: "./plantas/indice_plantas.json",
        prefix: "planta"
    },
    potions: {
        folder: "./pocoes",
        indexFile: "./pocoes/indice.json",
        fullFile: "./pocoes/indice_pocoes.json",
        prefix: "pocao"
    }
};

let dbInstance = null;
let connectionState = {
    online: false,
    rulesAllowed: false,
    projectId: "wwcatalog-10546",
    lastError: null
};

// Cache em memória para itens já abertos individualmente (evita releituras desnecessárias)
const itemMemoryCache = new Map();
// Cache em memória dos índices leves por coleção
const indexMemoryCache = new Map();

const statusListeners = new Set();

export function onFirebaseStatusChange(listener) {
    statusListeners.add(listener);
    listener(connectionState);
    return () => statusListeners.delete(listener);
}

function notifyStatusChange(patch) {
    connectionState = { ...connectionState, ...patch };
    statusListeners.forEach(fn => {
        try {
            fn(connectionState);
        } catch (e) {
            console.error(e);
        }
    });
}

/**
 * Inicializa a instância do Firebase Firestore para o projeto wwcatalog-10546.
 */
export async function initFirebaseConnection() {
    try {
        const config = getActiveFirebaseConfig();
        const app = getApps().length === 0 ? initializeApp(config) : getApp();
        dbInstance = getFirestore(app);

        notifyStatusChange({
            online: true,
            projectId: config.projectId || "wwcatalog-10546",
            lastError: null
        });

        // Testa leitura rápida do documento de índice no Firestore
        try {
            const testRef = doc(dbInstance, "_indexes", "creatures");
            await getDoc(testRef);
            notifyStatusChange({
                online: true,
                rulesAllowed: true,
                lastError: null
            });
        } catch (ruleErr) {
            const isPermDenied = ruleErr?.code === "permission-denied" || String(ruleErr?.message || "").includes("Missing or insufficient permissions");
            notifyStatusChange({
                online: true,
                rulesAllowed: !isPermDenied,
                lastError: isPermDenied ? "Regras do Firestore bloqueando leitura/escrita (publique o arquivo firestore.rules no Console)" : ruleErr.message
            });
        }
        return dbInstance;
    } catch (err) {
        console.warn("Modo local ativo — não foi possível inicializar o Firebase:", err);
        notifyStatusChange({
            online: false,
            rulesAllowed: false,
            lastError: err.message
        });
        return null;
    }
}

export function getFirebaseStatus() {
    return { ...connectionState };
}

/**
 * Gera um identificador único e determinístico para um item do catálogo.
 */
export function buildItemId(collectionName, item, prefix = "") {
    if (item.id && typeof item.id === "string" && item.id.trim()) {
        return item.id.trim();
    }
    const rawName = item.nome || item.name || `item_${Date.now()}`;
    const baseName = rawName.split("(")[0].trim() || rawName;
    const clean = sanitizeFilename(baseName);
    const colPrefix = prefix || COLLECTION_META[collectionName]?.prefix || "item";
    if (collectionName === COLLECTIONS.CREATURES) {
        return clean;
    }
    return clean.startsWith(`${colPrefix}_`) ? clean : `${colPrefix}_${clean}`;
}

/**
 * Extrai apenas os metadados leves necessários para o índice e filtros laterais.
 * Garante que a listagem carregue instantaneamente sem trafegar descrições longas ou imagens Base64.
 */
export function buildSummaryEntry(collectionName, item) {
    const id = buildItemId(collectionName, item);
    const file = item.file || `itens/${id}.json`;

    switch (collectionName) {
        case COLLECTIONS.CREATURES:
            return {
                id,
                file,
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
                fotoUrl: item.fotoUrl || (item.fotoBase64 && !item.fotoBase64.startsWith("data:") ? item.fotoBase64 : "")
            };

        case COLLECTIONS.SPELLS:
            return {
                id,
                file,
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
                file,
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
                file,
                nome: item.nome || item.name || "Poção sem nome",
                tipo: item.tipo || "Poção",
                nivel: lvl,
                dificuldade_cd: Number(cd),
                tempo_preparo: prep,
                administracao: admin
            };
        }

        default:
            return { id, file, nome: item.nome || item.name || id };
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
 * Gerenciamento de cache local complementar (localStorage) para itens criados/editados
 * pelo usuário mesmo caso o Firestore esteja temporariamente offline.
 */
function getLocalCustomItemsMap(collectionName) {
    try {
        const raw = localStorage.getItem(`ww_custom_${collectionName}`);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveLocalCustomItem(collectionName, id, itemData) {
    try {
        const map = getLocalCustomItemsMap(collectionName);
        map[id] = itemData;
        localStorage.setItem(`ww_custom_${collectionName}`, JSON.stringify(map));
    } catch (e) {
        console.warn("Aviso ao salvar no cache local:", e);
    }
}

function removeLocalCustomItem(collectionName, id) {
    try {
        const map = getLocalCustomItemsMap(collectionName);
        delete map[id];
        localStorage.setItem(`ww_custom_${collectionName}`, JSON.stringify(map));

        const deletedRaw = localStorage.getItem(`ww_deleted_${collectionName}`);
        const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedList.includes(id)) {
            deletedList.push(id);
            localStorage.setItem(`ww_deleted_${collectionName}`, JSON.stringify(deletedList));
        }
    } catch (e) {
        console.warn(e);
    }
}

function getLocalDeletedIds(collectionName) {
    try {
        const raw = localStorage.getItem(`ww_deleted_${collectionName}`);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

/**
 * 1. CARREGAMENTO RÁPIDO DO ÍNDICE DA COLEÇÃO (Tier 1)
 * Retorna apenas a lista leve de resumos (ID, nome, categoria/nível/classificação)
 * mesclando o índice local oficial, os registros customizados locais e o índice do Firebase Firestore.
 */
export async function fetchCatalogIndex(collectionName, forceRefresh = false) {
    if (!forceRefresh && indexMemoryCache.has(collectionName)) {
        return indexMemoryCache.get(collectionName);
    }

    const meta = COLLECTION_META[collectionName];
    if (!meta) throw new Error(`Coleção desconhecida: ${collectionName}`);

    const summaryMap = new Map();
    const deletedIds = getLocalDeletedIds(collectionName);

    // 1.1 Carrega o índice leve estático local (instantâneo, poucos KBs)
    try {
        const response = await fetch(meta.indexFile);
        if (response.ok) {
            const localIndex = await response.json();
            if (Array.isArray(localIndex)) {
                localIndex.forEach(entry => {
                    const summary = buildSummaryEntry(collectionName, entry);
                    if (!deletedIds.has(summary.id)) {
                        summaryMap.set(summary.id, summary);
                    }
                });
            }
        }
    } catch (err) {
        console.warn(`Aviso ao ler índice local de ${collectionName}:`, err);
    }

    // 1.2 Mescla itens customizados salvos localmente no navegador
    const localCustomMap = getLocalCustomItemsMap(collectionName);
    Object.entries(localCustomMap).forEach(([id, fullItem]) => {
        if (!deletedIds.has(id)) {
            summaryMap.set(id, buildSummaryEntry(collectionName, { ...fullItem, id }));
            itemMemoryCache.set(`${collectionName}:${id}`, fullItem);
        }
    });

    // 1.3 Consulta o índice leve no Firebase Firestore (_indexes/{collectionName})
    if (!dbInstance) {
        await initFirebaseConnection();
    }

    if (dbInstance) {
        try {
            const idxDocRef = doc(dbInstance, "_indexes", collectionName);
            const idxSnap = await getDoc(idxDocRef);

            if (idxSnap.exists()) {
                const idxData = idxSnap.data();
                const remoteDeleted = new Set(idxData.deletedIds || []);
                remoteDeleted.forEach(delId => summaryMap.delete(delId));

                if (Array.isArray(idxData.items)) {
                    idxData.items.forEach(entry => {
                        const summary = buildSummaryEntry(collectionName, entry);
                        if (!deletedIds.has(summary.id) && !remoteDeleted.has(summary.id)) {
                            summaryMap.set(summary.id, summary);
                        }
                    });
                }
                notifyStatusChange({ online: true, rulesAllowed: true, lastError: null });
            }
        } catch (err) {
            const isPermDenied = err?.code === "permission-denied" || String(err?.message || "").includes("Missing or insufficient permissions");
            if (isPermDenied) {
                notifyStatusChange({
                    online: true,
                    rulesAllowed: false,
                    lastError: "Publique as Regras do Firestore (firestore.rules) para sincronizar na nuvem."
                });
            }
        }
    }

    const resultList = Array.from(summaryMap.values());
    indexMemoryCache.set(collectionName, resultList);
    return resultList;
}

/**
 * 2. CARREGAMENTO INDIVIDUAL DE ITEM SOB DEMANDA (Tier 2)
 * Busca os detalhes completos de UM ÚNICO item apenas quando o usuário clica nele na lista.
 * Ordem de busca:
 *   1. Cache em memória (0ms se já clicado antes)
 *   2. Firebase Firestore (`doc(db, collectionName, id)`)
 *   3. Arquivo JSON individual local (`./<pasta>/itens/<id>.json`)
 */
export async function fetchItemById(collectionName, id) {
    if (!id) return null;
    const cacheKey = `${collectionName}:${id}`;

    // 1. Verifica cache em memória
    if (itemMemoryCache.has(cacheKey)) {
        return itemMemoryCache.get(cacheKey);
    }

    // 2. Verifica itens customizados no localStorage
    const customMap = getLocalCustomItemsMap(collectionName);
    if (customMap[id]) {
        itemMemoryCache.set(cacheKey, customMap[id]);
        return customMap[id];
    }

    // 3. Tenta buscar o documento individual no Firebase Firestore
    if (dbInstance && connectionState.rulesAllowed) {
        try {
            const docRef = doc(dbInstance, collectionName, id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                itemMemoryCache.set(cacheKey, data);
                return data;
            }
        } catch (err) {
            console.warn(`Aviso ao buscar documento individual ${collectionName}/${id} no Firestore:`, err);
        }
    }

    // 4. Fallback instantâneo: Carrega o arquivo JSON individual local (./<pasta>/itens/<id>.json)
    const meta = COLLECTION_META[collectionName];
    if (meta) {
        try {
            const itemUrl = `${meta.folder}/itens/${id}.json`;
            const res = await fetch(itemUrl);
            if (res.ok) {
                const data = await res.json();
                itemMemoryCache.set(cacheKey, data);
                return data;
            }
        } catch (err) {
            console.error(`Erro ao carregar arquivo individual ${id}.json:`, err);
        }
    }

    return null;
}

/**
 * Carrega múltiplos itens específicos por ID sob demanda (usado na exportação de pacotes selecionados).
 */
export async function fetchItemsByIds(collectionName, ids = []) {
    const promises = ids.map(id => fetchItemById(collectionName, id));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

/**
 * Atualiza o documento de índice leve `_indexes/{collectionName}` no Firestore.
 */
async function syncCollectionIndexToFirestore(collectionName, currentSummaryList, deletedIds = []) {
    if (!dbInstance) return;
    const idxRef = doc(dbInstance, "_indexes", collectionName);
    await setDoc(idxRef, {
        updatedAt: new Date().toISOString(),
        count: currentSummaryList.length,
        items: currentSummaryList,
        deletedIds
    }, { merge: true });
}

/**
 * 3. SALVAR ITEM INDIVIDUAL (Firebase Firestore + Cache Local)
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
    saveLocalCustomItem(collectionName, id, fullRecord);

    // Atualiza o índice em memória imediatamente
    const currentIndex = await fetchCatalogIndex(collectionName);
    const newSummary = buildSummaryEntry(collectionName, fullRecord);
    const existingIdx = currentIndex.findIndex(item => item.id === id);
    if (existingIdx >= 0) {
        currentIndex[existingIdx] = newSummary;
    } else {
        currentIndex.push(newSummary);
    }
    indexMemoryCache.set(collectionName, currentIndex);

    let savedToCloud = false;
    if (!dbInstance) {
        await initFirebaseConnection();
    }

    if (dbInstance) {
        try {
            const docRef = doc(dbInstance, collectionName, id);
            await setDoc(docRef, fullRecord, { merge: true });
            await syncCollectionIndexToFirestore(collectionName, currentIndex);
            savedToCloud = true;
            notifyStatusChange({ online: true, rulesAllowed: true, lastError: null });
        } catch (err) {
            console.warn(`Aviso ao salvar ${collectionName}/${id} no Firestore (mantido localmente):`, err);
            const isPermDenied = err?.code === "permission-denied" || String(err?.message || "").includes("Missing or insufficient permissions");
            if (isPermDenied) {
                notifyStatusChange({
                    online: true,
                    rulesAllowed: false,
                    lastError: "Permissão negada no Firestore. Publique as regras em firestore.rules no Console."
                });
            }
        }
    }

    if (options.downloadBackup) {
        downloadJsonFile(fullRecord, `${id}.json`);
    }

    return { id, record: fullRecord, savedToCloud };
}

/**
 * 4. SALVAR LOTE DE ITENS EM MASSA (Bulk Import para Firebase Firestore + Cache Local)
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
        saveLocalCustomItem(collectionName, id, fullRecord);
        indexMap.set(id, buildSummaryEntry(collectionName, fullRecord));
    }

    const updatedIndexList = Array.from(indexMap.values());
    indexMemoryCache.set(collectionName, updatedIndexList);

    let savedToCloud = false;
    if (!dbInstance) {
        await initFirebaseConnection();
    }

    if (dbInstance) {
        try {
            // Divide em lotes de 400 operações (limite do Firestore é 500 por writeBatch)
            const CHUNK_SIZE = 400;
            for (let i = 0; i < normalizedRecords.length; i += CHUNK_SIZE) {
                const chunk = normalizedRecords.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(dbInstance);
                chunk.forEach(rec => {
                    const docRef = doc(dbInstance, collectionName, rec.id);
                    batch.set(docRef, rec, { merge: true });
                });
                await batch.commit();
                if (onProgress) {
                    onProgress(Math.min(i + chunk.length, normalizedRecords.length), normalizedRecords.length);
                }
            }

            await syncCollectionIndexToFirestore(collectionName, updatedIndexList);
            savedToCloud = true;
            notifyStatusChange({ online: true, rulesAllowed: true, lastError: null });
        } catch (err) {
            console.warn(`Aviso ao importar lote de ${collectionName} no Firestore (salvo localmente):`, err);
            const isPermDenied = err?.code === "permission-denied" || String(err?.message || "").includes("Missing or insufficient permissions");
            if (isPermDenied) {
                notifyStatusChange({
                    online: true,
                    rulesAllowed: false,
                    lastError: "Permissão negada no Firestore. Publique as regras em firestore.rules no Console."
                });
            }
        }
    }

    return {
        count: normalizedRecords.length,
        savedToCloud
    };
}

/**
 * 5. REMOVER ITEM INDIVIDUAL DO CATÁLOGO
 */
export async function deleteRecord(collectionName, id) {
    if (!id) return false;
    itemMemoryCache.delete(`${collectionName}:${id}`);
    removeLocalCustomItem(collectionName, id);

    const currentIndex = await fetchCatalogIndex(collectionName);
    const filteredIndex = currentIndex.filter(item => item.id !== id);
    indexMemoryCache.set(collectionName, filteredIndex);

    if (dbInstance && connectionState.rulesAllowed) {
        try {
            await deleteDoc(doc(dbInstance, collectionName, id));
            const deletedIds = Array.from(getLocalDeletedIds(collectionName));
            await syncCollectionIndexToFirestore(collectionName, filteredIndex, deletedIds);
            return true;
        } catch (err) {
            console.warn(`Erro ao excluir ${collectionName}/${id} no Firestore:`, err);
        }
    }
    return false;
}

/**
 * 6. SINCRONIZAR TODOS OS 4 COMPÊNDIOS OFICIAIS COM O FIREBASE FIRESTORE
 * Lê os 4 catálogos completos locais (92 criaturas, 210 feitiços, 44 plantas, 166 poções)
 * e grava cada item individualmente em sua respectiva coleção no Firestore.
 */
export async function syncAllCatalogsToFirebase(onStatusUpdate = null) {
    if (!dbInstance) {
        await initFirebaseConnection();
    }
    if (!dbInstance) {
        throw new Error("Não foi possível inicializar a conexão com o Firebase.");
    }

    const targets = [
        { key: COLLECTIONS.CREATURES, label: "Animais / Criaturas Mágicas" },
        { key: COLLECTIONS.SPELLS, label: "Feitiços" },
        { key: COLLECTIONS.PLANTS, label: "Plantas (Herbologia)" },
        { key: COLLECTIONS.POTIONS, label: "Poções (Alquimia)" }
    ];

    let totalSynced = 0;

    for (const target of targets) {
        const meta = COLLECTION_META[target.key];
        if (onStatusUpdate) {
            onStatusUpdate(`Carregando base local de ${target.label}...`);
        }

        const res = await fetch(meta.fullFile);
        if (!res.ok) continue;
        const fullList = await res.json();

        if (onStatusUpdate) {
            onStatusUpdate(`Enviando ${fullList.length} registros de ${target.label} ao Firebase...`);
        }

        const result = await saveBulkRecords(target.key, fullList, meta.prefix, (done, total) => {
            if (onStatusUpdate) {
                onStatusUpdate(`Sincronizando ${target.label}: ${done}/${total}...`);
            }
        });

        if (!result.savedToCloud) {
            throw new Error(
                "O Firebase recusou a gravação por bloqueio nas Regras de Segurança (permission-denied). " +
                "Cole e publique as regras do arquivo firestore.rules na aba Regras do Console do Firebase."
            );
        }

        totalSynced += result.count;
    }

    return totalSynced;
}

/**
 * Exporta qualquer objeto ou lista JSON como arquivo para download pelo navegador.
 */
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
