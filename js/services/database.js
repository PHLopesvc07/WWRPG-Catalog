import { exportJson } from '../utils/helpers.js';

export const DatabaseService = {
    // Formato antigo: indice é lista de nomes de arquivo → busca cada um
    async fetchCollection(collectionPath, indexFile) {
        const cacheBuster = `?t=${new Date().getTime()}`;
        try {
            const indexResponse = await fetch(`${collectionPath}/${indexFile}${cacheBuster}`);
            if (!indexResponse.ok) throw new Error("Índice não encontrado.");

            const payload = await indexResponse.json();

            // ── Formato novo: array de objetos direto no índice ──────────
            if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object') {
                return payload;
            }

            // ── Formato antigo: array de strings (nomes de arquivo) ──────
            const records = [];
            for (const fileName of payload) {
                try {
                    const res = await fetch(`${collectionPath}/${fileName}${cacheBuster}`);
                    if (res.ok) records.push(await res.json());
                } catch {
                    console.warn(`Falha ao ler o arquivo: ${fileName}`);
                }
            }
            return records;
        } catch (error) {
            console.error("Erro no Banco de Dados local:", error);
            throw error;
        }
    },

    saveRecord(data, filename) {
        exportJson(data, filename);
    }
};
