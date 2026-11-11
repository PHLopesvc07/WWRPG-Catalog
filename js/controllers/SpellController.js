/**
 * CONTROLADOR DO GRANDE COMPÊNDIO DE FEITIÇARIA (C.E.F.)
 * Carregamento Individual Sob Demanda (Tier 1: Índice Leve | Tier 2: Documento Individual)
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
import { exportJson, escapeHtml } from "../utils/helpers.js";

const CONJ_ATTR = {
    "Feitiço": "Prática (Sabedoria)",
    "Charme": "Prática (Sabedoria)",
    "Transfiguração": "Transfiguração (Carisma)",
    "Azaração": "DCAT (Sabedoria)",
    "Maldição Menor": "Dificuldade/Lógica (Inteligência)",
    "Maldição": "Dificuldade/Lógica (Inteligência)",
    "Cura": "Cura (Carisma)",
    "Contra-feitiço": "Prática (Sabedoria)",
    "Contrafeitiço": "Prática (Sabedoria)"
};

export class SpellController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activeSpellId = null;
        this.editingId = null;

        this.form = document.getElementById("form-spell");
        this.listContainer = document.getElementById("spell-list");
        this.viewerContainer = document.getElementById("spell-viewer-content");

        this.initEvents();
    }

    initEvents() {
        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.saveSingleSpell();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-spells");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const filterIds = [
            "search-spell",
            "sort-spell",
            "filter-spell-lvl",
            "filter-spell-cat",
            "filter-spell-tipo",
            "filter-spell-cond"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => this.applyFilters());
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-spell-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportList = document.getElementById("btn-export-spell-list");
        if (btnExportList) {
            btnExportList.addEventListener("click", () => this.exportSelectedSpells());
        }

        this.loadCatalog();
    }

    async saveSingleSpell() {
        const pronuncia = document.getElementById("spell-pronunciation")?.value?.trim() || "";
        const spellData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            name: document.getElementById("spell-name").value.trim(),
            pronuncia,
            pronunciation: pronuncia,
            cat: document.getElementById("spell-cat").value,
            lvl: document.getElementById("spell-lvl").value,
            tipo: document.getElementById("spell-tipo").value,
            condicao: document.getElementById("spell-condicao")?.value?.trim() || "Nenhuma",
            desc: document.getElementById("spell-desc").value.trim()
        };

        const result = await saveRecord(COLLECTIONS.SPELLS, spellData, "feitico");
        this.form.reset();
        this.editingId = null;
        await this.loadCatalog(true);

        alert(`Feitiço "${spellData.name}" catalogado com sucesso no Grimório Ministerial!`);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-spell-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-spell-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON válido ou selecione um arquivo .json para importar feitiços em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.SPELLS, list, "feitico");
            document.getElementById("bulk-spell-input").value = "";
            document.getElementById("bulk-spell-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} feitiço(s) importado(s) com sucesso!`);
        } catch (err) {
            alert("Erro ao processar JSON de feitiços: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice do C.E.F...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.SPELLS, forceRefresh);
        this.updateBadgeCount();
        this.applyFilters();
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-spells");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        ["search-spell", "filter-spell-lvl", "filter-spell-cat", "filter-spell-tipo", "filter-spell-cond"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-spell");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    normalizeCategoryMatch(itemCat, filterCat) {
        if (!filterCat) return true;
        const a = String(itemCat || "").toLowerCase().replace(/[\s\-]/g, "");
        const b = String(filterCat || "").toLowerCase().replace(/[\s\-]/g, "");
        if ((b === "charme" || b === "feitico") && (a === "charme" || a === "feitico")) return true;
        return a === b;
    }

    normalizeTypeMatch(itemTipo, filterTipo) {
        if (!filterTipo) return true;
        const a = String(itemTipo || "").toLowerCase();
        const b = String(filterTipo || "").toLowerCase();
        if ((b === "ataque" || b === "dano") && (a === "ataque" || a === "dano")) return true;
        if ((b === "defesa" || b === "proteção" || b === "protecao") && (a === "defesa" || a === "proteção" || a === "protecao")) return true;
        return a === b;
    }

    applyFilters() {
        const search = (document.getElementById("search-spell")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-spell")?.value || "alfabetica";
        const fLvl = document.getElementById("filter-spell-lvl")?.value || "";
        const fCat = document.getElementById("filter-spell-cat")?.value || "";
        const fTipo = document.getElementById("filter-spell-tipo")?.value || "";
        const fCond = document.getElementById("filter-spell-cond")?.value || "";

        this.filteredIndex = this.indexData.filter(s => {
            const matchName = !search ||
                (s.name || "").toLowerCase().includes(search) ||
                (s.pronuncia || "").toLowerCase().includes(search) ||
                (s.condicao || "").toLowerCase().includes(search);
            const matchLvl = !fLvl || String(s.lvl) === String(fLvl);
            const matchCat = this.normalizeCategoryMatch(s.cat, fCat);
            const matchTipo = this.normalizeTypeMatch(s.tipo, fTipo);

            let matchCond = true;
            const hasCond = s.condicao && s.condicao !== "Nenhuma";
            if (fCond === "com_condicao") matchCond = hasCond;
            if (fCond === "sem_condicao") matchCond = !hasCond;

            return matchName && matchLvl && matchCat && matchTipo && matchCond;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.name || "").localeCompare(b.name || "", "pt-BR");
            if (sortMode === "nivel-asc") return parseInt(a.lvl || 1) - parseInt(b.lvl || 1);
            if (sortMode === "nivel-desc") return parseInt(b.lvl || 1) - parseInt(a.lvl || 1);
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = "";

        const countEl = document.getElementById("spell-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} encantamentos`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhum feitiço encontrado com os filtros atuais.</li>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.filteredIndex.forEach(s => {
            const li = document.createElement("li");
            li.className = `record-list-item ${this.activeSpellId === s.id ? "active-record" : ""}`;
            li.dataset.id = s.id;

            const isChecked = this.selectedIds.has(s.id);
            const hasCondition = s.condicao && s.condicao !== "Nenhuma";

            li.innerHTML = `
                <div class="list-item-row">
                    <input type="checkbox" class="spell-export-check" data-id="${escapeHtml(s.id)}" ${isChecked ? "checked" : ""} title="Incluir no pacote de exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(s.name)}</strong>
                        <small>${escapeHtml(s.cat)} • ${escapeHtml(s.tipo)}${hasCondition ? ` • <span class="cond-inline">${escapeHtml(s.condicao)}</span>` : ""}</small>
                    </div>
                    <span class="badge-level-small">Nv. ${escapeHtml(s.lvl)}</span>
                </div>
            `;

            const checkbox = li.querySelector(".spell-export-check");
            checkbox.addEventListener("click", e => {
                e.stopPropagation();
                if (e.target.checked) {
                    this.selectedIds.add(s.id);
                } else {
                    this.selectedIds.delete(s.id);
                }
                this.updateExportButtonLabel();
            });

            li.addEventListener("click", () => this.selectAndLoadSpell(s.id));
            fragment.appendChild(li);
        });

        this.listContainer.appendChild(fragment);
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-spell-list");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `📦 Exportar Selecionados (${this.selectedIds.size})`
                : `📦 Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca o feitiço completo apenas quando clicado na lista.
     */
    async selectAndLoadSpell(id) {
        this.activeSpellId = id;
        this.listContainer?.querySelectorAll(".record-list-item").forEach(li => {
            li.classList.toggle("active-record", li.dataset.id === id);
        });

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <span class="loading-quill">🪄</span>
                <p>Consultando pergaminho individual do feitiço...</p>
            </div>
        `;

        const s = await fetchItemById(COLLECTIONS.SPELLS, id);
        if (!s) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual deste feitiço.</p>`;
            return;
        }

        this.renderSpellSheet(s);
    }

    renderSpellSheet(s) {
        const catStr = Array.isArray(s.cat) ? s.cat[0] : (s.cat || "Charme");
        const attrRef = CONJ_ATTR[catStr] || "Prática (Sabedoria)";
        const pronuncia = s.pronuncia || s.pronunciation || "Não catalogada";
        const condicao = s.condicao || "Nenhuma";
        const hasCond = condicao && condicao !== "Nenhuma";

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">C.E.F. • COMISSÃO EXPERIMENTAL DE FEITIÇOS</span>
                        <h3 class="sheet-main-title">${escapeHtml(s.name)}</h3>
                        <p class="pronunciation-subtitle">🗣️ Pronúncia: <em>"${escapeHtml(pronuncia)}"</em></p>
                    </div>
                    <div class="level-stamp">
                        <span>NÍVEL</span>
                        <strong>${escapeHtml(s.lvl)}</strong>
                    </div>
                </div>

                <div class="sheet-metadata-box mt-15">
                    <div class="meta-item"><strong>Categoria Mágica:</strong> <span class="cat-badge">${escapeHtml(catStr)}</span></div>
                    <div class="meta-item"><strong>Natureza / Efeito:</strong> ${escapeHtml(s.tipo || "Utilitário")}</div>
                    <div class="meta-item"><strong>Perícia de Conjuração (W&W):</strong> <code>${escapeHtml(attrRef)}</code></div>
                    <div class="meta-item">
                        <strong>Condição Aplicada:</strong>
                        <span class="${hasCond ? "cond-badge-active" : "cond-badge-none"}">${escapeHtml(condicao)}</span>
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">📜 Efeito Mecânico, Regras & Descrição</h4>
                    <p class="sheet-prose">${escapeHtml(s.desc || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-spell">
                        📥 Exportar para Grimório da Ficha (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-spell">
                        ✏️ Editar Feitiço
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-spell">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-spell")?.addEventListener("click", () => {
            exportJson(s, `feitico_${s.name}`);
        });

        this.viewerContainer.querySelector("#btn-edit-spell")?.addEventListener("click", () => {
            this.populateFormForEdit(s);
        });

        this.viewerContainer.querySelector("#btn-delete-spell")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover o feitiço "${s.name}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.SPELLS, s.id);
                this.activeSpellId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Feitiço removido. Selecione outro encantamento ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(s) {
        this.editingId = s.id;
        document.getElementById("spell-name").value = s.name || "";
        document.getElementById("spell-pronunciation").value = s.pronuncia || s.pronunciation || "";
        document.getElementById("spell-cat").value = Array.isArray(s.cat) ? s.cat[0] : (s.cat || "Charme");
        document.getElementById("spell-lvl").value = String(s.lvl || "1");
        document.getElementById("spell-tipo").value = s.tipo || "Utilitário";
        if (document.getElementById("spell-condicao")) {
            document.getElementById("spell-condicao").value = s.condicao || "Nenhuma";
        }
        document.getElementById("spell-desc").value = s.desc || "";

        document.querySelector('[data-target="tab-registro-feiticos"]')?.click();
    }

    async exportSelectedSpells() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhum feitiço disponível para exportar.");
            return;
        }

        const fullSpells = await fetchItemsByIds(COLLECTIONS.SPELLS, targetIds);
        downloadJsonFile(fullSpells, `grimorio_feiticos_${fullSpells.length}`);
    }
}
