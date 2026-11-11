/**
 * PONTO DE ENTRADA PRINCIPAL — ARQUIVO GERAL DO MINISTÉRIO DA MAGIA (W&W RPG)
 * Inicializa os 4 Catálogos (Animais, Feitiços, Plantas e Poções) e o Controle de Tema.
 */

import { TabController } from "./controllers/TabController.js";
import { CreatureController } from "./controllers/CreatureController.js";
import { SpellController } from "./controllers/SpellController.js";
import { PlantController } from "./controllers/PlantController.js";
import { PotionController } from "./controllers/PotionController.js";
import { initDatabaseConnection } from "./services/database.js";

document.addEventListener("DOMContentLoaded", async () => {
    setupThemeControls();

    new TabController();
    new CreatureController();
    new SpellController();
    new PlantController();
    new PotionController();

    await initDatabaseConnection();
});

function setupThemeControls() {
    const btnTheme = document.getElementById("btn-theme-toggle");
    const btnTerminal = document.getElementById("btn-terminal-toggle");

    const updateThemeButtons = () => {
        const isDark = document.body.classList.contains("dark-mode");
        const isTerminal = document.body.classList.contains("terminal-mode");
        if (btnTheme) {
            btnTheme.textContent = isDark ? "☀" : "🌙";
            btnTheme.title = isDark ? "Ativar Modo Claro (Pergaminho)" : "Ativar Modo Escuro (Ministério)";
        }
        if (btnTerminal) {
            btnTerminal.textContent = isTerminal ? "📜" : "⚡";
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
