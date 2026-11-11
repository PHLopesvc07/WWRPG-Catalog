/**
 * CONTROLADOR DO COMPÊNDIO DE HERBOLOGIA E BOTÂNICA MÁGICA
 * Carregamento Individual Sob Demanda (Tier 1: Índice Leve | Tier 2: Documento Individual)
 * Otimizado com delegação de eventos, debounce de busca e carregamento sob demanda da aba.
 */

import {
    COLLECTIONS,
    fetchCatalogIndex,
    fetchItemById,
    fetchItemsByIds,
    saveRecord,
    saveBulkRecords,
    deleteRecord,
    downloadJsonFile
} from "../services/database.js";
import { fileToBase64, exportJson, escapeHtml } from "../utils/helpers.js";

export class PlantController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activePlantId = null;
        this.editingId = null;
        this.currentFotoBase64 = "";
        this.loaded = false;
        this._searchTimer = null;

        this.form = document.getElementById("form-plant");
        this.listContainer = document.getElementById("plant-list");
        this.viewerContainer = document.getElementById("plant-viewer-content");

        this.initEvents();
    }

    initEvents() {
        const fotoInput = document.getElementById("plant-foto");
        if (fotoInput) {
            fotoInput.addEventListener("change", async e => {
                const file = e.target.files[0];
                if (file) {
                    this.currentFotoBase64 = await fileToBase64(file);
                    const preview = document.getElementById("preview-plant-foto");
                    if (preview) {
                        preview.src = this.currentFotoBase64;
                        preview.classList.remove("hidden");
                    }
                    const label = document.getElementById("label-plant-foto");
                    if (label) label.textContent = "Ilustração Botânica Anexada";
                }
            });
        }

        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.savePlant();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-plants");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const searchEl = document.getElementById("search-plant");
        if (searchEl) {
            searchEl.addEventListener("input", () => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.applyFilters(), 80);
            });
        }

        const filterIds = [
            "sort-plant",
            "filter-plant-cat",
            "filter-plant-lvl"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-plant-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportList = document.getElementById("btn-export-plant-list");
        if (btnExportList) {
            btnExportList.addEventListener("click", () => this.exportSelectedPlants());
        }

        if (this.listContainer) {
            this.listContainer.addEventListener("click", e => {
                const checkbox = e.target.closest(".record-check");
                if (checkbox) {
                    e.stopPropagation();
                    const id = checkbox.dataset.id;
                    if (checkbox.checked) {
                        this.selectedIds.add(id);
                    } else {
                        this.selectedIds.delete(id);
                    }
                    this.updateExportButtonLabel();
                    return;
                }

                const li = e.target.closest(".record-list-item");
                if (li && li.dataset.id) {
                    this.selectAndLoadPlant(li.dataset.id);
                }
            });
        }
    }

    async ensureLoaded() {
        if (!this.loaded) {
            this.loaded = true;
            await this.loadCatalog();
        }
    }

    async savePlant() {
        const nome = document.getElementById("plant-nome").value.trim();
        const categoria = document.getElementById("plant-categoria").value;
        const nivel = document.getElementById("plant-nivel").value;
        const manejo_cd = parseInt(document.getElementById("plant-cd").value) || 12;
        const manejo = document.getElementById("plant-manejo")?.value?.trim() || "";
        const efeito = document.getElementById("plant-efeito")?.value?.trim() || "";
        const uso_alquimico = document.getElementById("plant-uso")?.value?.trim() || "";
        const classificacao_ministerial = document.getElementById("plant-classificacao-min")?.value?.trim() || "";
        const descricao = document.getElementById("plant-descricao").value.trim();
        let peculiaridades = document.getElementById("plant-peculiaridades").value.trim();

        if (!peculiaridades) {
            const lines = [
                `• Nível de Herbologia: Nível ${nivel}.`,
                `• Manejo e Colheita: CD ${manejo_cd} (Herbologia). ${manejo}`,
                efeito ? `• Mecânica e Efeito: ${efeito}` : "",
                uso_alquimico ? `• Uso Alquímico: ${uso_alquimico}` : "",
                classificacao_ministerial ? `• Classificação Ministerial: ${classificacao_ministerial}` : ""
            ].filter(Boolean);
            peculiaridades = lines.join("\n");
        }

        const plantData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            nome,
            categoria,
            nivel,
            manejo_cd,
            manejo,
            efeito,
            uso_alquimico,
            classificacao_ministerial,
            descricao,
            peculiaridades,
            fotoBase64: this.currentFotoBase64
        };

        const result = await saveRecord(COLLECTIONS.PLANTS, plantData, "planta");
        this.form.reset();
        this.editingId = null;
        this.currentFotoBase64 = "";
        const preview = document.getElementById("preview-plant-foto");
        if (preview) {
            preview.src = "";
            preview.classList.add("hidden");
        }
        const label = document.getElementById("label-plant-foto");
        if (label) label.textContent = "Anexar Ilustração Botânica";

        await this.loadCatalog(true);
        alert(`Planta "${plantData.nome}" catalogada com sucesso no Herbário Ministerial.`);
        document.querySelector('[data-target="tab-arquivo-plantas"]')?.click();
        await this.selectAndLoadPlant(result.id);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-plant-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-plant-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON válido ou selecione um arquivo .json para importar plantas em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.PLANTS, list, "planta");
            document.getElementById("bulk-plant-input").value = "";
            document.getElementById("bulk-plant-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} espécime(s) botânico(s) importado(s) com sucesso.`);
        } catch (err) {
            alert("Erro ao processar JSON de plantas: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice herbológico...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.PLANTS, forceRefresh);
        this.loaded = true;
        this.updateBadgeCount();
        this.applyFilters();

        if (!this.activePlantId && this.filteredIndex.length > 0) {
            this.selectAndLoadPlant(this.filteredIndex[0].id);
        }
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-plants");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        ["search-plant", "filter-plant-cat", "filter-plant-lvl"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-plant");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    applyFilters() {
        const search = (document.getElementById("search-plant")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-plant")?.value || "alfabetica";
        const fCat = document.getElementById("filter-plant-cat")?.value || "";
        const fLvl = document.getElementById("filter-plant-lvl")?.value || "";

        this.filteredIndex = this.indexData.filter(p => {
            const matchName = !search || (p.nome || "").toLowerCase().includes(search);
            const matchCat = !fCat || (p.categoria || "").toLowerCase() === fCat.toLowerCase();
            const matchLvl = !fLvl || String(p.nivel) === String(fLvl);
            return matchName && matchCat && matchLvl;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sortMode === "nivel-asc") return parseInt(a.nivel || 1) - parseInt(b.nivel || 1);
            if (sortMode === "nivel-desc") return parseInt(b.nivel || 1) - parseInt(a.nivel || 1);
            if (sortMode === "cd-asc") return (a.manejo_cd || 12) - (b.manejo_cd || 12);
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;

        const countEl = document.getElementById("plant-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} espécies botânicas`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma planta mágica encontrada com os filtros atuais.</li>`;
            this.updateExportButtonLabel();
            return;
        }

        const htmlItems = new Array(this.filteredIndex.length);
        for (let i = 0; i < this.filteredIndex.length; i++) {
            const p = this.filteredIndex[i];
            const isActive = this.activePlantId === p.id ? " active-record" : "";
            const isChecked = this.selectedIds.has(p.id) ? " checked" : "";
            const isRare = (p.categoria || "").toLowerCase().includes("dif");
            const idSafe = escapeHtml(p.id);

            htmlItems[i] = `<li class="record-list-item${isActive}" data-id="${idSafe}">
                <div class="list-item-row">
                    <input type="checkbox" class="record-check" data-id="${idSafe}"${isChecked} title="Selecionar para exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(p.nome)}</strong>
                        <small>Nv. ${escapeHtml(p.nivel)} • CD ${escapeHtml(p.manejo_cd || 12)} • ${escapeHtml(p.categoria)}</small>
                    </div>
                    <span class="${isRare ? "badge-rare-small" : "badge-popular-small"}">${isRare ? "Rara" : "Popular"}</span>
                </div>
            </li>`;
        }

        this.listContainer.innerHTML = htmlItems.join("");
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-plant-list");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `Exportar Selecionadas (${this.selectedIds.size})`
                : `Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca os dados completos da planta apenas quando selecionada na lista.
     */
    async selectAndLoadPlant(id) {
        const prevActive = this.listContainer?.querySelector(".record-list-item.active-record");
        if (prevActive) prevActive.classList.remove("active-record");

        this.activePlantId = id;
        const nextActive = this.listContainer?.querySelector(`.record-list-item[data-id="${CSS.escape(id)}"]`);
        if (nextActive) nextActive.classList.add("active-record");

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <p>Consultando ficha botânica individual nas estufas...</p>
            </div>
        `;

        const p = await fetchItemById(COLLECTIONS.PLANTS, id);
        if (!p) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual desta planta.</p>`;
            return;
        }

        this.renderPlantSheet(p);
    }

    renderPlantSheet(p) {
        const isRare = (p.categoria || "").toLowerCase().includes("dif");
        const imgHtml = p.fotoBase64
            ? `<div class="creature-portrait-frame">
                 <img src="${escapeHtml(p.fotoBase64)}" class="creature-sheet-photo" alt="${escapeHtml(p.nome)}" loading="lazy" decoding="async">
               </div>`
            : "";

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">COMPÊNDIO DE HERBOLOGIA E BOTÂNICA MÁGICA</span>
                        <h3 class="sheet-main-title">${escapeHtml(p.nome)}</h3>
                    </div>
                    <div class="level-stamp">
                        <span>HERB.</span>
                        <strong>Nv. ${escapeHtml(p.nivel || "1")}</strong>
                    </div>
                </div>

                <div class="sheet-hero-grid mt-15">
                    ${imgHtml}
                    <div class="sheet-metadata-box">
                        <div class="meta-item">
                            <strong>Disponibilidade e Mercado:</strong>
                            <span class="${isRare ? "cond-badge-active" : "cat-badge"}">${escapeHtml(p.categoria || "Popular")}</span>
                        </div>
                        <div class="meta-item"><strong>Nível de Herbologia:</strong> Nível ${escapeHtml(p.nivel || "1")}</div>
                        <div class="meta-item"><strong>Dificuldade de Manejo / Colheita:</strong> <code>CD ${escapeHtml(p.manejo_cd || 12)} (Herbologia / Inteligência)</code></div>
                        ${p.classificacao_ministerial ? `<div class="meta-item"><strong>Classificação Ministerial:</strong> ${escapeHtml(p.classificacao_ministerial)}</div>` : ""}
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Descrição Morfológica, Habitat e Propriedades</h4>
                    <p class="sheet-prose">${escapeHtml(p.descricao || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Peculiaridades de Cultivo, Colheita e Uso Alquímico</h4>
                    <div class="peculiaridades-box">
                        ${escapeHtml(p.peculiaridades || "").replace(/\n/g, "<br>")}
                    </div>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-plant">
                        Exportar Espécime (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-plant">
                        Editar Planta
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-plant">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-plant")?.addEventListener("click", () => {
            exportJson(p, `planta_${p.nome}`);
        });

        this.viewerContainer.querySelector("#btn-edit-plant")?.addEventListener("click", () => {
            this.populateFormForEdit(p);
        });

        this.viewerContainer.querySelector("#btn-delete-plant")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover a planta "${p.nome}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.PLANTS, p.id);
                this.activePlantId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Espécime removido. Selecione outra planta na lista ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(p) {
        this.editingId = p.id;
        document.getElementById("plant-nome").value = p.nome || "";
        document.getElementById("plant-categoria").value = (p.categoria || "").toLowerCase().includes("dif") ? "Difícil de Adquirir" : "Popular";
        document.getElementById("plant-nivel").value = String(p.nivel || "1");
        document.getElementById("plant-cd").value = p.manejo_cd || 12;
        if (document.getElementById("plant-manejo")) document.getElementById("plant-manejo").value = p.manejo || "";
        if (document.getElementById("plant-efeito")) document.getElementById("plant-efeito").value = p.efeito || "";
        if (document.getElementById("plant-uso")) document.getElementById("plant-uso").value = p.uso_alquimico || "";
        if (document.getElementById("plant-classificacao-min")) document.getElementById("plant-classificacao-min").value = p.classificacao_ministerial || "";
        document.getElementById("plant-descricao").value = p.descricao || "";
        document.getElementById("plant-peculiaridades").value = p.peculiaridades || "";

        this.currentFotoBase64 = p.fotoBase64 || "";
        const preview = document.getElementById("preview-plant-foto");
        if (preview && this.currentFotoBase64) {
            preview.src = this.currentFotoBase64;
            preview.classList.remove("hidden");
        }

        document.querySelector('[data-target="tab-registro-plantas"]')?.click();
    }

    async exportSelectedPlants() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma planta disponível para exportar.");
            return;
        }

        const fullPlants = await fetchItemsByIds(COLLECTIONS.PLANTS, targetIds);
        downloadJsonFile(fullPlants, `herbario_plantas_${fullPlants.length}`);
    }
}
