/**
 * CONTROLADOR DE NAVEGAÇÃO ENTRE ABAS (ARQUIVOS & REGISTROS)
 * Garante sincronia total entre as classes .active e .hidden em todos os 8 painéis.
 */

export class TabController {
    constructor() {
        this.init();
    }

    init() {
        // Delegação de eventos global para suportar botões na barra superior e botões internos ("+ Novo Registro" / "← Voltar ao Arquivo")
        document.addEventListener("click", e => {
            const btn = e.target.closest("[data-target]");
            if (!btn) return;
            const targetId = btn.getAttribute("data-target");
            if (targetId && targetId.startsWith("tab-")) {
                e.preventDefault();
                this.openTab(targetId);
            }
        });
    }

    openTab(tabId) {
        const targetEl = document.getElementById(tabId);
        if (!targetEl) return;

        // Oculta todas as abas de conteúdo dinamicamente
        const allTabs = document.querySelectorAll(".tab-content");
        allTabs.forEach(tab => {
            tab.classList.remove("active");
            tab.classList.add("hidden");
        });

        // Atualiza todos os botões de navegação
        document.querySelectorAll("[data-target]").forEach(btn => {
            const isTarget = btn.getAttribute("data-target") === tabId;
            btn.classList.toggle("active", isTarget);
            btn.setAttribute("aria-pressed", isTarget ? "true" : "false");
        });

        // Exibe a aba selecionada com prioridade
        targetEl.classList.remove("hidden");
        targetEl.classList.add("active");

        // Rola suavemente ao topo caso necessário
        window.scrollTo({ top: 0, behavior: "smooth" });

        document.dispatchEvent(new CustomEvent("tab-opened", { detail: { tabId, targetId: tabId } }));
    }
}
