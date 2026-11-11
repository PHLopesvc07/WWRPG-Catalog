/**
 * CONFIGURAÇÃO DO FIREBASE — MINISTÉRIO DA MAGIA (W&W RPG)
 * Projeto Oficial: wwcatalog-10546
 */

const STORAGE_KEY_CONFIG = 'ww_firebase_custom_config';

export const DEFAULT_FIREBASE_CONFIG = {
    projectId: "wwcatalog-10546",
    authDomain: "wwcatalog-10546.firebaseapp.com",
    storageBucket: "wwcatalog-10546.firebasestorage.app"
};

/**
 * Obtém a configuração ativa do Firebase (mesclando o padrão do projeto wwcatalog-10546
 * com eventuais chaves adicionais salvas pelo usuário via interface).
 */
export function getActiveFirebaseConfig() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
        }
    } catch (err) {
        console.warn("Aviso ao ler configuração customizada do Firebase:", err);
    }
    return { ...DEFAULT_FIREBASE_CONFIG };
}

/**
 * Salva uma configuração adicional do Firebase (ex: apiKey, appId) no navegador.
 * Aceita tanto um objeto JSON quanto o trecho de código copiado do Console do Firebase.
 */
export function saveCustomFirebaseConfig(rawInput) {
    if (!rawInput || !rawInput.trim()) {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
        return getActiveFirebaseConfig();
    }

    let text = rawInput.trim();
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        text = objMatch[0];
    }

    // Converte chaves JS sem aspas (ex: apiKey: "...") para JSON válido
    const normalizedJson = text
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
        .replace(/,\s*\}/g, '}');

    const parsed = JSON.parse(normalizedJson);
    const merged = { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
    return merged;
}
