/**
 * PONTO DE ENTRADA PRINCIPAL — ARQUIVO GERAL DO MINISTÉRIO DA MAGIA (W&W RPG)
 * Inicializa e carrega paralelamente todos os 4 Catálogos (Animais, Feitiços, Plantas e Poções)
 * para que todas as listas fiquem prontas de imediato com máxima agilidade.
 */

import { TabController } from "./controllers/TabController.js";
import { CreatureController } from "./controllers/CreatureController.js";
import { SpellController } from "./controllers/SpellController.js";
import { PlantController } from "./controllers/PlantController.js";
import { PotionController } from "./controllers/PotionController.js";
import {
    COLLECTIONS,
    initDatabaseConnection,
    subscribeToCatalogUpdates,
    warmUpFullApiCache
} from "./services/database.js";

async function startApp() {
    try {
        setupThemeControls();

        new TabController();
        const creatureCtrl = new CreatureController();
        const spellCtrl = new SpellController();
        const plantCtrl = new PlantController();
        const potionCtrl = new PotionController();

        const tabControllerMap = {
            "tab-arquivo-criaturas": creatureCtrl,
            "tab-arquivo-feiticos": spellCtrl,
            "tab-arquivo-plantas": plantCtrl,
            "tab-arquivo-pocoes": potionCtrl
        };

        document.addEventListener("tab-opened", e => {
            const targetId = e.detail?.tabId || e.detail?.targetId;
            const ctrl = tabControllerMap[targetId];
            if (ctrl && !ctrl.loaded) {
                ctrl.ensureLoaded();
            }
        });

        // Reatividade para revalidacao silenciosa do cache da API em background
        subscribeToCatalogUpdates(evt => {
            if (evt.type === "index" && Array.isArray(evt.items)) {
                if (evt.collection === COLLECTIONS.CREATURES && creatureCtrl.loaded) {
                    creatureCtrl.indexData = evt.items;
                    creatureCtrl.updateBadgeCount();
                    creatureCtrl.applyFilters();
                } else if (evt.collection === COLLECTIONS.SPELLS && spellCtrl.loaded) {
                    spellCtrl.indexData = evt.items;
                    spellCtrl.updateBadgeCount();
                    spellCtrl.applyFilters();
                } else if (evt.collection === COLLECTIONS.PLANTS && plantCtrl.loaded) {
                    plantCtrl.indexData = evt.items;
                    plantCtrl.updateBadgeCount();
                    plantCtrl.applyFilters();
                } else if (evt.collection === COLLECTIONS.POTIONS && potionCtrl.loaded) {
                    potionCtrl.indexData = evt.items;
                    potionCtrl.updateBadgeCount();
                    potionCtrl.applyFilters();
                }
            } else if (evt.type === "document" && evt.data) {
                if (evt.collection === COLLECTIONS.CREATURES && creatureCtrl.activeCreatureId === evt.id) {
                    creatureCtrl.selectAndLoadCreature(evt.id);
                } else if (evt.collection === COLLECTIONS.SPELLS && spellCtrl.activeSpellId === evt.id) {
                    spellCtrl.selectAndLoadSpell(evt.id);
                } else if (evt.collection === COLLECTIONS.PLANTS && plantCtrl.activePlantId === evt.id) {
                    plantCtrl.selectAndLoadPlant(evt.id);
                } else if (evt.collection === COLLECTIONS.POTIONS && potionCtrl.activePotionId === evt.id) {
                    potionCtrl.selectAndLoadPotion(evt.id);
                }
            }
        });

        await initDatabaseConnection();

        // Carregamento paralelo de todos os 4 catalogos (instantaneo em aberturas posteriores via cache da API)
        await Promise.allSettled([
            creatureCtrl.ensureLoaded(),
            spellCtrl.ensureLoaded(),
            plantCtrl.ensureLoaded(),
            potionCtrl.ensureLoaded()
        ]);

        // Na primeira interacao, baixa e persiste em segundo plano todas as fichas completas da API
        warmUpFullApiCache();
    } catch (err) {
        console.error("[W&W Catalog] Erro ao inicializar catálogos:", err);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
} else {
    startApp();
}

function setupThemeControls() {
    const btnTheme = document.getElementById("btn-theme-toggle");
    const btnTerminal = document.getElementById("btn-terminal-toggle");

    const updateThemeButtons = () => {
        const isDark = document.body.classList.contains("dark-mode");
        const isTerminal = document.body.classList.contains("terminal-mode");
        if (btnTheme) {
            btnTheme.textContent = isDark ? "Modo Claro" : "Modo Escuro";
            btnTheme.title = isDark ? "Ativar Modo Claro (Pergaminho)" : "Ativar Modo Escuro (Ministério)";
        }
        if (btnTerminal) {
            btnTerminal.textContent = isTerminal ? "Modo Pergaminho" : "Modo Terminal";
            btnTerminal.title = isTerminal ? "Voltar ao Modo Pergaminho" : "Ativar Modo Terminal Tático";
        }
    };

    updateThemeButtons();

    if (btnTheme) {
        btnTheme.addEventListener("click", () => {
            document.body.classList.remove("terminal-mode");
            const isNowDark = document.body.classList.toggle("dark-mode");
            localStorage.setItem("wwrpg-theme", isNowDark ? "dark" : "light");
            updateThemeButtons();
        });
    }

    if (btnTerminal) {
        btnTerminal.addEventListener("click", () => {
            document.body.classList.remove("dark-mode");
            const isNowTerminal = document.body.classList.toggle("terminal-mode");
            localStorage.setItem("wwrpg-theme", isNowTerminal ? "terminal" : "light");
            updateThemeButtons();
        });
    }
}
