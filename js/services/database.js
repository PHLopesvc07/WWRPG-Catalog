/**
 * SERVIÇO DE BANCO DE DADOS E CARREGAMENTO INDIVIDUAL SOB DEMANDA
 * Arquitetura Two-Tier: Índice Leve + Documento Individual sob Demanda
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { DATABASE_CONFIG } from "./firebaseConfig.js";
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

// Cache em memória para itens já abertos individualmente
const itemMemoryCache = new Map();
// Cache em memória dos índices leves por coleção
const indexMemoryCache = new Map();

export async function initDatabaseConnection() {
    try {
        const app = getApps().length === 0 ? initializeApp(DATABASE_CONFIG) : getApp();
        dbInstance = getFirestore(app);
        return dbInstance;
    } catch {
        return null;
    }
}

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
    } catch {
        // Ignora caso localStorage esteja cheio
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
    } catch {
        // Ignora
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
 */
export async function fetchCatalogIndex(collectionName, forceRefresh = false) {
    if (!forceRefresh && indexMemoryCache.has(collectionName)) {
        return indexMemoryCache.get(collectionName);
    }

    const meta = COLLECTION_META[collectionName];
    if (!meta) throw new Error(`Coleção desconhecida: ${collectionName}`);

    const summaryMap = new Map();
    const deletedIds = getLocalDeletedIds(collectionName);

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
    } catch {
        // Ignora erro local
    }

    const localCustomMap = getLocalCustomItemsMap(collectionName);
    Object.entries(localCustomMap).forEach(([id, fullItem]) => {
        if (!deletedIds.has(id)) {
            summaryMap.set(id, buildSummaryEntry(collectionName, { ...fullItem, id }));
            itemMemoryCache.set(`${collectionName}:${id}`, fullItem);
        }
    });

    if (!dbInstance) {
        await initDatabaseConnection();
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
            }
        } catch {
            // Opera perfeitamente com os índices locais caso sem rede
        }
    }

    const resultList = Array.from(summaryMap.values());
    indexMemoryCache.set(collectionName, resultList);
    return resultList;
}

/**
 * 2. CARREGAMENTO INDIVIDUAL DE ITEM SOB DEMANDA (Tier 2)
 */
export async function fetchItemById(collectionName, id) {
    if (!id) return null;
    const cacheKey = `${collectionName}:${id}`;

    if (itemMemoryCache.has(cacheKey)) {
        return itemMemoryCache.get(cacheKey);
    }

    const customMap = getLocalCustomItemsMap(collectionName);
    if (customMap[id]) {
        itemMemoryCache.set(cacheKey, customMap[id]);
        return customMap[id];
    }

    if (dbInstance) {
        try {
            const docRef = doc(dbInstance, collectionName, id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                itemMemoryCache.set(cacheKey, data);
                return data;
            }
        } catch {
            // Fallback para arquivo JSON individual
        }
    }

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
        } catch {
            return null;
        }
    }

    return null;
}

export async function fetchItemsByIds(collectionName, ids = []) {
    const promises = ids.map(id => fetchItemById(collectionName, id));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

async function syncCollectionIndex(collectionName, currentSummaryList, deletedIds = []) {
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
 * 3. SALVAR ITEM INDIVIDUAL
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
        await initDatabaseConnection();
    }

    if (dbInstance) {
        try {
            const docRef = doc(dbInstance, collectionName, id);
            await setDoc(docRef, fullRecord, { merge: true });
            await syncCollectionIndex(collectionName, currentIndex);
            savedToCloud = true;
        } catch {
            // Mantido localmente
        }
    }

    if (options.downloadBackup) {
        downloadJsonFile(fullRecord, `${id}.json`);
    }

    return { id, record: fullRecord, savedToCloud };
}

/**
 * 4. SALVAR LOTE DE ITENS EM MASSA
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
        await initDatabaseConnection();
    }

    if (dbInstance) {
        try {
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

            await syncCollectionIndex(collectionName, updatedIndexList);
            savedToCloud = true;
        } catch {
            // Mantido localmente
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

    if (dbInstance) {
        try {
            await deleteDoc(doc(dbInstance, collectionName, id));
            const deletedIds = Array.from(getLocalDeletedIds(collectionName));
            await syncCollectionIndex(collectionName, filteredIndex, deletedIds);
            return true;
        } catch {
            return false;
        }
    }
    return false;
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
