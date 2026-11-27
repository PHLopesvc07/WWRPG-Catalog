/**
 * MOTOR DE CACHE PERSISTENTE MULTIPLATAFORMA DA API (NAVEGADOR + MOBILE WEBVIEW + ANDROID + REACT NATIVE)
 *
 * Responsavel por persistir localmente as informacoes obtidas da API Cloud Firestore logo na
 * primeira interacao, permitindo exibicao instantanea nas aberturas subsequentes:
 * - Navegador / PWA / Standalone: localStorage (indices rapidos) + IndexedDB (acervo completo e imagens Base64)
 * - Aplicativo Android (WebView): Ponte nativa interna (filesDir) + IndexedDB + localStorage
 * - Aplicativo React Native: Adaptador persistente AsyncStorage injetavel
 *
 * Regra de integridade: Apenas dados reais provenientes do Firestore (source === "firestore")
 * sao gravados neste cache. Dados estaticos de fallback nunca sao persistidos aqui.
 */

const CACHE_SCHEMA_VERSION = 2;
const IDB_DATABASE_NAME = "WWCatalogApiCacheDB";
const IDB_DATABASE_VERSION = 1;

const LS_INDEX_PREFIX = "ww_api_v2_idx_";
const LS_DOC_PREFIX = "ww_api_v2_doc_";
const LS_META_PREFIX = "ww_api_v2_meta_";
const LS_MIGRATION_FLAG = "ww_api_v2_migrated";

const CACHE_GLOBAL_SCOPE = typeof globalThis !== "undefined"
    ? globalThis
    : (typeof window !== "undefined" ? window : {});

let customStorageAdapter = null;
let idbConnectionPromise = null;
let legacyCleanupDone = false;

function hasWebLocalStorage() {
    try {
        return typeof CACHE_GLOBAL_SCOPE.localStorage !== "undefined" && CACHE_GLOBAL_SCOPE.localStorage !== null;
    } catch {
        return false;
    }
}

function hasWebSessionStorage() {
    try {
        return typeof CACHE_GLOBAL_SCOPE.sessionStorage !== "undefined" && CACHE_GLOBAL_SCOPE.sessionStorage !== null;
    } catch {
        return false;
    }
}

function hasWebIndexedDB() {
    try {
        return typeof CACHE_GLOBAL_SCOPE.indexedDB !== "undefined" && CACHE_GLOBAL_SCOPE.indexedDB !== null;
    } catch {
        return false;
    }
}

function hasNativeAndroidCache() {
    try {
        return Boolean(
            CACHE_GLOBAL_SCOPE.AndroidNative &&
            typeof CACHE_GLOBAL_SCOPE.AndroidNative.readCacheFile === "function" &&
            typeof CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheFile === "function"
        );
    } catch {
        return false;
    }
}

/**
 * Remove chaves legadas da v1 que podiam conter dados de fallback misturados
 */
function cleanupLegacyCacheKeys() {
    if (legacyCleanupDone) return;
    legacyCleanupDone = true;

    if (!hasWebLocalStorage()) return;
    try {
        if (CACHE_GLOBAL_SCOPE.localStorage.getItem(LS_MIGRATION_FLAG) === "1") return;
        const legacyCollections = ["creatures", "spells", "plants", "potions"];
        for (const col of legacyCollections) {
            CACHE_GLOBAL_SCOPE.localStorage.removeItem(`ww_idx_${col}`);
        }
        CACHE_GLOBAL_SCOPE.localStorage.setItem(LS_MIGRATION_FLAG, "1");
    } catch {
        // Ignora restricoes de storage
    }
}

/**
 * Configura adaptador externo de armazenamento persistente (ex: AsyncStorage no React Native)
 */
export function configurePersistentStorageAdapter(adapter) {
    if (adapter && typeof adapter.getItem === "function" && typeof adapter.setItem === "function") {
        customStorageAdapter = adapter;
    }
}

/**
 * Abre conexao unica com IndexedDB no navegador / WebView para suportar dezenas de MBs (incluindo retratos Base64)
 */
function openIndexedDbConnection() {
    if (!hasWebIndexedDB()) return Promise.resolve(null);
    if (idbConnectionPromise) return idbConnectionPromise;

    idbConnectionPromise = new Promise(resolve => {
        try {
            const request = CACHE_GLOBAL_SCOPE.indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);

            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("indexes")) {
                    db.createObjectStore("indexes", { keyPath: "collection" });
                }
                if (!db.objectStoreNames.contains("documents")) {
                    const docStore = db.createObjectStore("documents", { keyPath: "cacheKey" });
                    docStore.createIndex("by_collection", "collection", { unique: false });
                }
                if (!db.objectStoreNames.contains("meta")) {
                    db.createObjectStore("meta", { keyPath: "key" });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                idbConnectionPromise = null;
                resolve(null);
            };
            request.onblocked = () => resolve(null);
        } catch {
            idbConnectionPromise = null;
            resolve(null);
        }
    });

    return idbConnectionPromise;
}

async function idbGetRecord(storeName, key) {
    const db = await openIndexedDbConnection();
    if (!db) return null;

    return new Promise(resolve => {
        try {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function idbPutRecord(storeName, value) {
    const db = await openIndexedDbConnection();
    if (!db) return false;

    return new Promise(resolve => {
        try {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.put(value);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
}

async function idbPutDocumentsBatch(records) {
    if (!Array.isArray(records) || records.length === 0) return true;
    const db = await openIndexedDbConnection();
    if (!db) return false;

    return new Promise(resolve => {
        try {
            const tx = db.transaction("documents", "readwrite");
            const store = tx.objectStore("documents");
            for (const rec of records) {
                store.put(rec);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
}

async function idbDeleteRecord(storeName, key) {
    const db = await openIndexedDbConnection();
    if (!db) return false;

    return new Promise(resolve => {
        try {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.delete(key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
}

function isValidApiIndexPayload(parsed) {
    return Boolean(
        parsed &&
        parsed.schemaVersion === CACHE_SCHEMA_VERSION &&
        parsed.source === "firestore" &&
        Array.isArray(parsed.items) &&
        parsed.items.length > 0
    );
}

function isValidApiDocPayload(parsed) {
    return Boolean(
        parsed &&
        parsed.schemaVersion === CACHE_SCHEMA_VERSION &&
        parsed.source === "firestore" &&
        parsed.data &&
        typeof parsed.data === "object"
    );
}

/**
 * Le o indice da colecao previamente baixado da API
 */
export async function readCachedApiIndex(collectionName) {
    cleanupLegacyCacheKeys();
    const storageKey = `${LS_INDEX_PREFIX}${collectionName}`;

    // 1. Caminho ultrarrapido sincrono via localStorage (Navegador e WebView)
    if (hasWebLocalStorage()) {
        try {
            const raw = CACHE_GLOBAL_SCOPE.localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isValidApiIndexPayload(parsed)) return parsed;
            }
        } catch {
            // Prossegue para os demais motores de armazenamento
        }
    }

    // 2. Armazenamento interno nativo Android (quando em APK WebView)
    if (hasNativeAndroidCache()) {
        try {
            const raw = CACHE_GLOBAL_SCOPE.AndroidNative.readCacheFile(`idx_${collectionName}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isValidApiIndexPayload(parsed)) return parsed;
            }
        } catch {
            // Prossegue
        }
    }

    // 3. Adaptador persistente externo (React Native AsyncStorage)
    if (customStorageAdapter) {
        try {
            const raw = await customStorageAdapter.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isValidApiIndexPayload(parsed)) return parsed;
            }
        } catch {
            // Prossegue
        }
    }

    // 4. IndexedDB (alta capacidade no Navegador / WebView)
    const idbRecord = await idbGetRecord("indexes", collectionName);
    if (isValidApiIndexPayload(idbRecord)) {
        if (hasWebLocalStorage()) {
            try {
                CACHE_GLOBAL_SCOPE.localStorage.setItem(storageKey, JSON.stringify(idbRecord));
            } catch {
                // Ignora quota
            }
        }
        return idbRecord;
    }

    return null;
}

/**
 * Persiste o indice obtido diretamente da API Cloud Firestore
 */
export async function writeCachedApiIndex(collectionName, items, remoteUpdatedAt = "") {
    cleanupLegacyCacheKeys();
    if (!Array.isArray(items) || items.length === 0) return false;

    const payload = {
        schemaVersion: CACHE_SCHEMA_VERSION,
        source: "firestore",
        collection: collectionName,
        savedAt: Date.now(),
        remoteUpdatedAt: remoteUpdatedAt || "",
        count: items.length,
        items
    };

    const storageKey = `${LS_INDEX_PREFIX}${collectionName}`;
    const serialized = JSON.stringify(payload);

    if (hasWebLocalStorage()) {
        try {
            CACHE_GLOBAL_SCOPE.localStorage.setItem(storageKey, serialized);
        } catch {
            // Quota excedida no localStorage; IndexedDB assumira
        }
    }

    if (hasNativeAndroidCache()) {
        try {
            CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheFile(`idx_${collectionName}`, serialized);
        } catch {
            // Ignora falha nativa
        }
    }

    if (customStorageAdapter) {
        try {
            await customStorageAdapter.setItem(storageKey, serialized);
        } catch {
            // Ignora falha do adaptador
        }
    }

    await idbPutRecord("indexes", payload);
    return true;
}

/**
 * Le um documento completo individual previamente baixado da API
 */
export async function readCachedApiDocument(collectionName, id) {
    if (!collectionName || !id) return null;
    const cacheKey = `${collectionName}:${id}`;
    const storageKey = `${LS_DOC_PREFIX}${cacheKey}`;

    // 1. Armazenamento interno nativo Android
    if (hasNativeAndroidCache()) {
        try {
            const raw = CACHE_GLOBAL_SCOPE.AndroidNative.readCacheFile(`doc_${collectionName}_${id}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isValidApiDocPayload(parsed)) return parsed;
            }
        } catch {
            // Prossegue
        }
    }

    // 2. Adaptador persistente externo (React Native AsyncStorage)
    if (customStorageAdapter) {
        try {
            const raw = await customStorageAdapter.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isValidApiDocPayload(parsed)) return parsed;
            }
        } catch {
            // Prossegue
        }
    }

    // 3. IndexedDB (Navegador Desktop, Mobile Browser e WebView)
    const idbRecord = await idbGetRecord("documents", cacheKey);
    if (isValidApiDocPayload(idbRecord)) {
        return idbRecord;
    }

    // 4. Contingencia em sessionStorage caso IndexedDB esteja bloqueado em modo privado restrito
    if (hasWebSessionStorage()) {
        try {
            const raw = CACHE_GLOBAL_SCOPE.sessionStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isValidApiDocPayload(parsed)) return parsed;
            }
        } catch {
            // Ignora
        }
    }

    return null;
}

/**
 * Persiste um documento individual obtido da API Cloud Firestore
 */
export async function writeCachedApiDocument(collectionName, id, data) {
    if (!collectionName || !id || !data) return false;
    const cacheKey = `${collectionName}:${id}`;
    const storageKey = `${LS_DOC_PREFIX}${cacheKey}`;

    const record = {
        cacheKey,
        schemaVersion: CACHE_SCHEMA_VERSION,
        source: "firestore",
        collection: collectionName,
        id,
        savedAt: Date.now(),
        data
    };

    const serialized = JSON.stringify(record);

    if (hasNativeAndroidCache()) {
        try {
            CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheFile(`doc_${collectionName}_${id}`, serialized);
        } catch {
            // Ignora
        }
    }

    if (customStorageAdapter) {
        try {
            await customStorageAdapter.setItem(storageKey, serialized);
        } catch {
            // Ignora
        }
    }

    const storedInIdb = await idbPutRecord("documents", record);
    if (!storedInIdb && hasWebSessionStorage() && serialized.length < 180000) {
        try {
            CACHE_GLOBAL_SCOPE.sessionStorage.setItem(storageKey, serialized);
        } catch {
            // Quota excedida
        }
    }

    return true;
}

/**
 * Persiste em lote dezenas de documentos baixados da API em uma unica transacao rapida
 */
export async function writeCachedApiDocumentsBatch(collectionName, docsArray) {
    if (!collectionName || !Array.isArray(docsArray) || docsArray.length === 0) return false;

    const now = Date.now();
    const records = [];

    for (const doc of docsArray) {
        if (!doc || !doc.id) continue;
        records.push({
            cacheKey: `${collectionName}:${doc.id}`,
            schemaVersion: CACHE_SCHEMA_VERSION,
            source: "firestore",
            collection: collectionName,
            id: doc.id,
            savedAt: now,
            data: doc
        });
    }

    if (records.length === 0) return false;

    if (hasNativeAndroidCache()) {
        try {
            if (typeof CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheBatch === "function") {
                const batchMap = {};
                for (const rec of records) {
                    batchMap[`doc_${collectionName}_${rec.id}`] = JSON.stringify(rec);
                }
                CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheBatch(JSON.stringify(batchMap));
            } else {
                for (const rec of records) {
                    CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheFile(
                        `doc_${collectionName}_${rec.id}`,
                        JSON.stringify(rec)
                    );
                }
            }
        } catch {
            // Ignora
        }
    }

    if (customStorageAdapter) {
        try {
            if (typeof customStorageAdapter.multiSet === "function") {
                const CHUNK = 10;
                for (let i = 0; i < records.length; i += CHUNK) {
                    const pairs = records.slice(i, i + CHUNK).map(rec => [
                        `${LS_DOC_PREFIX}${rec.cacheKey}`,
                        JSON.stringify(rec)
                    ]);
                    await customStorageAdapter.multiSet(pairs);
                }
            } else {
                for (const rec of records) {
                    await customStorageAdapter.setItem(
                        `${LS_DOC_PREFIX}${rec.cacheKey}`,
                        JSON.stringify(rec)
                    );
                }
            }
        } catch {
            // Ignora
        }
    }

    await idbPutDocumentsBatch(records);
    return true;
}

/**
 * Remove um documento do cache persistente quando excluido pelo usuario
 */
export async function removeCachedApiDocument(collectionName, id) {
    if (!collectionName || !id) return false;
    const cacheKey = `${collectionName}:${id}`;
    const storageKey = `${LS_DOC_PREFIX}${cacheKey}`;

    if (hasNativeAndroidCache() && typeof CACHE_GLOBAL_SCOPE.AndroidNative.removeCacheFile === "function") {
        try {
            CACHE_GLOBAL_SCOPE.AndroidNative.removeCacheFile(`doc_${collectionName}_${id}`);
        } catch {
            // Ignora
        }
    }

    if (customStorageAdapter && typeof customStorageAdapter.removeItem === "function") {
        try {
            await customStorageAdapter.removeItem(storageKey);
        } catch {
            // Ignora
        }
    }

    if (hasWebSessionStorage()) {
        try {
            CACHE_GLOBAL_SCOPE.sessionStorage.removeItem(storageKey);
        } catch {
            // Ignora
        }
    }

    await idbDeleteRecord("documents", cacheKey);
    return true;
}

/**
 * Le metadados de hidratacao completa do acervo da colecao
 */
export async function readHydrationMeta(collectionName) {
    const metaKey = `${LS_META_PREFIX}${collectionName}`;

    if (hasWebLocalStorage()) {
        try {
            const raw = CACHE_GLOBAL_SCOPE.localStorage.getItem(metaKey);
            if (raw) return JSON.parse(raw);
        } catch {
            // Prossegue
        }
    }

    if (hasNativeAndroidCache()) {
        try {
            const raw = CACHE_GLOBAL_SCOPE.AndroidNative.readCacheFile(`meta_${collectionName}`);
            if (raw) return JSON.parse(raw);
        } catch {
            // Prossegue
        }
    }

    if (customStorageAdapter) {
        try {
            const raw = await customStorageAdapter.getItem(metaKey);
            if (raw) return JSON.parse(raw);
        } catch {
            // Prossegue
        }
    }

    return await idbGetRecord("meta", metaKey);
}

/**
 * Registra que todos os documentos completos de uma colecao da API ja foram cacheados localmente
 */
export async function writeHydrationMeta(collectionName, metaObj) {
    const metaKey = `${LS_META_PREFIX}${collectionName}`;
    const payload = {
        key: metaKey,
        collection: collectionName,
        ...metaObj
    };
    const serialized = JSON.stringify(payload);

    if (hasWebLocalStorage()) {
        try {
            CACHE_GLOBAL_SCOPE.localStorage.setItem(metaKey, serialized);
        } catch {
            // Ignora
        }
    }

    if (hasNativeAndroidCache()) {
        try {
            CACHE_GLOBAL_SCOPE.AndroidNative.saveCacheFile(`meta_${collectionName}`, serialized);
        } catch {
            // Ignora
        }
    }

    if (customStorageAdapter) {
        try {
            await customStorageAdapter.setItem(metaKey, serialized);
        } catch {
            // Ignora
        }
    }

    await idbPutRecord("meta", payload);
    return true;
}
