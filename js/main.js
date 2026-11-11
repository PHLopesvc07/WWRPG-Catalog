/**
 * PONTO DE ENTRADA PRINCIPAL — ARQUIVO GERAL DO MINISTÉRIO DA MAGIA (W&W RPG)
 * Inicializa os 4 Catálogos (Animais, Feitiços, Plantas e Poções) e a Conexão Firebase Firestore.
 */

import { TabController } from "./controllers/TabController.js";
import { CreatureController } from "./controllers/CreatureController.js";
import { SpellController } from "./controllers/SpellController.js";
import { PlantController } from "./controllers/PlantController.js";
import { PotionController } from "./controllers/PotionController.js";
import {
    initFirebaseConnection,
    onFirebaseStatusChange,
    syncAllCatalogsToFirebase
} from "./services/database.js";
import {
    getActiveFirebaseConfig,
    saveCustomFirebaseConfig
} from "./services/firebaseConfig.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Inicializa o controle de abas
    new TabController();

    // 2. Inicializa os 4 controladores de catálogo com carregamento individual
    const creatureCtrl = new CreatureController();
    const spellCtrl = new SpellController();
    const plantCtrl = new PlantController();
    const potionCtrl = new PotionController();

    // 3. Configura o indicador de status do Firebase e modal de configuração/regras
    setupFirebaseStatusBar({ creatureCtrl, spellCtrl, plantCtrl, potionCtrl });

    // 4. Conecta ao Firebase Firestore (wwcatalog-10546)
    await initFirebaseConnection();
});

function setupFirebaseStatusBar(controllers) {
    const statusDot = document.getElementById("fb-status-dot");
    const statusText = document.getElementById("fb-status-text");
    const btnSync = document.getElementById("btn-sync-firebase");
    const btnConfig = document.getElementById("btn-open-fb-modal");
    const modal = document.getElementById("firebase-config-modal");
    const btnCloseModal = document.getElementById("btn-close-fb-modal");
    const btnSaveConfig = document.getElementById("btn-save-fb-config");
    const btnCopyRules = document.getElementById("btn-copy-firestore-rules");
    const configTextarea = document.getElementById("fb-custom-config-input");

    onFirebaseStatusChange(state => {
        if (!statusDot || !statusText) return;
        if (state.online && state.rulesAllowed) {
            statusDot.className = "status-dot status-online";
            statusText.textContent = `Firebase Conectado (${state.projectId}) • Carregamento Individual Ativo`;
        } else if (state.online && !state.rulesAllowed) {
            statusDot.className = "status-dot status-warning";
            statusText.textContent = `Firebase (${state.projectId}): Regras Pendentes • Catálogo Individual Local Ativo`;
        } else {
            statusDot.className = "status-dot status-offline";
            statusText.textContent = "Modo Local • Carregamento Individual Ativo";
        }
    });

    if (btnSync) {
        btnSync.addEventListener("click", async () => {
            const originalLabel = btnSync.textContent;
            btnSync.disabled = true;
            try {
                const total = await syncAllCatalogsToFirebase(msg => {
                    btnSync.textContent = `⏳ ${msg}`;
                });
                btnSync.textContent = `✅ ${total} Itens Sincronizados!`;
                await Promise.all([
                    controllers.creatureCtrl.loadCatalog(true),
                    controllers.spellCtrl.loadCatalog(true),
                    controllers.plantCtrl.loadCatalog(true),
                    controllers.potionCtrl.loadCatalog(true)
                ]);
                alert(`Sincronização concluída! Todos os ${total} itens (Animais, Feitiços, Plantas e Poções) foram gravados individualmente no Firebase Firestore (wwcatalog-10546).`);
            } catch (err) {
                alert("Aviso na sincronização com o Firebase:\n" + err.message);
                modal?.classList.remove("hidden");
            } finally {
                setTimeout(() => {
                    btnSync.disabled = false;
                    btnSync.textContent = originalLabel;
                }, 2500);
            }
        });
    }

    if (btnConfig && modal) {
        btnConfig.addEventListener("click", () => {
            if (configTextarea) {
                configTextarea.value = JSON.stringify(getActiveFirebaseConfig(), null, 2);
            }
            modal.classList.remove("hidden");
        });
    }

    if (btnCloseModal && modal) {
        btnCloseModal.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    }

    if (btnSaveConfig) {
        btnSaveConfig.addEventListener("click", async () => {
            try {
                saveCustomFirebaseConfig(configTextarea?.value || "");
                await initFirebaseConnection();
                modal?.classList.add("hidden");
                alert("Configuração do Firebase atualizada com sucesso!");
            } catch (err) {
                alert("Erro ao processar o objeto firebaseConfig: " + err.message);
            }
        });
    }

    if (btnCopyRules) {
        btnCopyRules.addEventListener("click", async () => {
            const rulesPre = document.getElementById("firestore-rules-code");
            if (rulesPre) {
                await navigator.clipboard.writeText(rulesPre.textContent.trim());
                btnCopyRules.textContent = "✅ Regras Copiadas!";
                setTimeout(() => {
                    btnCopyRules.textContent = "📋 Copiar Regras do Firestore";
                }, 2000);
            }
        });
    }
}
