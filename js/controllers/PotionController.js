/**
 * CONTROLADOR DO CATÁLOGO ALQUÍMICO DE POÇÕES
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

export class PotionController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activePotionId = null;
        this.editingId = null;

        this.form = document.getElementById("form-potion");
        this.listContainer = document.getElementById("potion-list");
        this.viewerContainer = document.getElementById("potion-viewer-content");

        this.initEvents();
    }

    initEvents() {
        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.savePotion();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-potions");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const filterIds = [
            "search-potion",
            "sort-potion",
            "filter-potion-lvl",
            "filter-potion-tipo",
            "filter-potion-admin"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => this.applyFilters());
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-potion-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportList = document.getElementById("btn-export-potion-list");
        if (btnExportList) {
            btnExportList.addEventListener("click", () => this.exportSelectedPotions());
        }

        this.loadCatalog();
    }

    async savePotion() {
        const nome = document.getElementById("potion-nome").value.trim();
        const tipo = document.getElementById("potion-tipo").value.trim() || "Poção";
        const nivel = parseInt(document.getElementById("potion-nivel").value) || 1;
        const dificuldade_cd = parseInt(document.getElementById("potion-cd").value) || 14;
        const tempo_preparo = document.getElementById("potion-preparo").value.trim() || "1 hora";
        const duracao = document.getElementById("potion-duracao").value.trim() || "Instantâneo";
        const administracao = document.getElementById("potion-admin").value.trim() || "Ingestão";
        const efeito = document.getElementById("potion-efeito").value.trim();
        const ingredientes = document.getElementById("potion-ingredientes").value.trim();
        const descricao = document.getElementById("potion-descricao").value.trim();
        const wiki = document.getElementById("potion-wiki")?.value?.trim() || "";

        const potionData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            nome,
            tipo,
            nivel,
            "nível": nivel,
            efeito,
            ingredientes,
            descricao,
            "descrição": descricao,
            sistema: {
                tempo_preparo,
                duracao,
                dificuldade_cd,
                administracao
            },
            meta: {
                nome_original: nome,
                wiki
            }
        };

        const result = await saveRecord(COLLECTIONS.POTIONS, potionData, "pocao");
        this.form.reset();
        this.editingId = null;
        await this.loadCatalog(true);

        alert(
            result.savedToCloud
                ? `Poção "${potionData.nome}" catalogada e sincronizada no Firebase Firestore!`
                : `Poção "${potionData.nome}" salva no catálogo local!`
        );
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-potion-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-potion-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON válido ou selecione um arquivo .json para importar poções em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.POTIONS, list, "pocao");
            document.getElementById("bulk-potion-input").value = "";
            document.getElementById("bulk-potion-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} composto(s) alquímico(s) importado(s) com sucesso!`);
        } catch (err) {
            alert("Erro ao processar JSON de poções: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice alquímico...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.POTIONS, forceRefresh);
        this.updateBadgeCount();
        this.applyFilters();
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-potions");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        ["search-potion", "filter-potion-lvl", "filter-potion-tipo", "filter-potion-admin"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-potion");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    applyFilters() {
        const search = (document.getElementById("search-potion")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-potion")?.value || "alfabetica";
        const fLvl = document.getElementById("filter-potion-lvl")?.value || "";
        const fTipo = (document.getElementById("filter-potion-tipo")?.value || "").toLowerCase();
        const fAdmin = (document.getElementById("filter-potion-admin")?.value || "").toLowerCase();

        this.filteredIndex = this.indexData.filter(p => {
            const matchName = !search ||
                (p.nome || "").toLowerCase().includes(search) ||
                (p.tipo || "").toLowerCase().includes(search);
            const matchLvl = !fLvl || String(p.nivel) === String(fLvl);
            const matchTipo = !fTipo || (p.tipo || "").toLowerCase().includes(fTipo);
            const matchAdmin = !fAdmin || (p.administracao || "").toLowerCase().includes(fAdmin);
            return matchName && matchLvl && matchTipo && matchAdmin;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sortMode === "nivel-asc") return parseInt(a.nivel || 1) - parseInt(b.nivel || 1);
            if (sortMode === "nivel-desc") return parseInt(b.nivel || 1) - parseInt(a.nivel || 1);
            if (sortMode === "cd-asc") return (a.dificuldade_cd || 14) - (b.dificuldade_cd || 14);
            if (sortMode === "cd-desc") return (b.dificuldade_cd || 14) - (a.dificuldade_cd || 14);
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = "";

        const countEl = document.getElementById("potion-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} compostos`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma poção encontrada com os filtros atuais.</li>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.filteredIndex.forEach(p => {
            const li = document.createElement("li");
            li.className = `record-list-item ${this.activePotionId === p.id ? "active-record" : ""}`;
            li.dataset.id = p.id;

            const isChecked = this.selectedIds.has(p.id);
            li.innerHTML = `
                <div class="list-item-row">
                    <input type="checkbox" class="record-check" data-id="${escapeHtml(p.id)}" ${isChecked ? "checked" : ""} title="Selecionar para exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(p.nome)}</strong>
                        <small>${escapeHtml(p.tipo)} • CD ${escapeHtml(p.dificuldade_cd || 14)} • ${escapeHtml(p.administracao || "Ingestão")}</small>
                    </div>
                    <span class="badge-level-small">Nv. ${escapeHtml(p.nivel)}</span>
                </div>
            `;

            const checkbox = li.querySelector(".record-check");
            checkbox.addEventListener("click", e => {
                e.stopPropagation();
                if (e.target.checked) {
                    this.selectedIds.add(p.id);
                } else {
                    this.selectedIds.delete(p.id);
                }
                this.updateExportButtonLabel();
            });

            li.addEventListener("click", () => this.selectAndLoadPotion(p.id));
            fragment.appendChild(li);
        });

        this.listContainer.appendChild(fragment);
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-potion-list");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `📦 Exportar Selecionadas (${this.selectedIds.size})`
                : `📦 Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca a receita completa da poção apenas quando clicada na lista.
     */
    async selectAndLoadPotion(id) {
        this.activePotionId = id;
        this.listContainer?.querySelectorAll(".record-list-item").forEach(li => {
            li.classList.toggle("active-record", li.dataset.id === id);
        });

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <span class="loading-quill">⚗️</span>
                <p>Consultando fórmula alquímica individual no boticário...</p>
            </div>
        `;

        const p = await fetchItemById(COLLECTIONS.POTIONS, id);
        if (!p) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual desta poção.</p>`;
            return;
        }

        this.renderPotionSheet(p);
    }

    renderPotionSheet(p) {
        const lvl = p.nivel ?? p["nível"] ?? 1;
        const desc = p.descricao || p["descrição"] || "";
        const sis = p.sistema || {};
        const cd = sis.dificuldade_cd ?? p.dificuldade_cd ?? 14;
        const prep = sis.tempo_preparo ?? p.tempo_preparo ?? "1 hora";
        const dur = sis.duracao ?? p.duracao ?? "Instantâneo";
        const admin = sis.administracao ?? p.administracao ?? "Ingestão";
        const meta = p.meta || {};

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">CATÁLOGO ALQUÍMICO • COMPOSTOS, ELIXIRES & ANTÍDOTOS</span>
                        <h3 class="sheet-main-title">${escapeHtml(p.nome)}</h3>
                    </div>
                    <div class="level-stamp">
                        <span>ALQUIMIA</span>
                        <strong>Nv. ${escapeHtml(lvl)}</strong>
                    </div>
                </div>

                <div class="sheet-metadata-box mt-15">
                    <div class="meta-item"><strong>Classificação Alquímica:</strong> <span class="cat-badge">${escapeHtml(p.tipo || "Poção")}</span></div>
                    <div class="meta-item"><strong>Dificuldade de Preparo (W&W):</strong> <code>CD ${escapeHtml(cd)} (Poções / Inteligência)</code></div>
                    <div class="meta-item"><strong>Tempo de Preparo:</strong> ⏳ ${escapeHtml(prep)}</div>
                    <div class="meta-item"><strong>Duração do Efeito:</strong> ⏱️ ${escapeHtml(dur)}</div>
                    <div class="meta-item"><strong>Via de Administração:</strong> 🧪 ${escapeHtml(admin)}</div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">✨ Efeito Mecânico & Propriedades</h4>
                    <p class="sheet-prose">${escapeHtml(p.efeito || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">🌿 Ingredientes Exigidos no Caldeirão</h4>
                    <div class="peculiaridades-box">
                        ${escapeHtml(p.ingredientes || "Ingredientes sob sigilo de boticário.").replace(/\n/g, "<br>")}
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">📜 Características Físicas, Vapores & Lore</h4>
                    <p class="sheet-prose">${escapeHtml(desc).replace(/\n/g, "<br>")}</p>
                    ${meta.wiki ? `<p class="mt-10"><small>🔗 Referência Canônica: <a href="${escapeHtml(meta.wiki)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meta.nome_original || p.nome)}</a></small></p>` : ""}
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-potion">
                        📥 Exportar Poção (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-potion">
                        ✏️ Editar Fórmula
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-potion">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-potion")?.addEventListener("click", () => {
            exportJson(p, `pocao_${p.nome}`);
        });

        this.viewerContainer.querySelector("#btn-edit-potion")?.addEventListener("click", () => {
            this.populateFormForEdit(p);
        });

        this.viewerContainer.querySelector("#btn-delete-potion")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover a poção "${p.nome}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.POTIONS, p.id);
                this.activePotionId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Composto removido. Selecione outra poção na lista ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(p) {
        this.editingId = p.id;
        const sis = p.sistema || {};
        document.getElementById("potion-nome").value = p.nome || "";
        document.getElementById("potion-tipo").value = p.tipo || "Poção";
        document.getElementById("potion-nivel").value = String(p.nivel ?? p["nível"] ?? "1");
        document.getElementById("potion-cd").value = sis.dificuldade_cd ?? p.dificuldade_cd ?? 14;
        document.getElementById("potion-preparo").value = sis.tempo_preparo ?? p.tempo_preparo ?? "1 hora";
        document.getElementById("potion-duracao").value = sis.duracao ?? p.duracao ?? "Instantâneo";
        document.getElementById("potion-admin").value = sis.administracao ?? p.administracao ?? "Ingestão";
        document.getElementById("potion-efeito").value = p.efeito || "";
        document.getElementById("potion-ingredientes").value = p.ingredientes || "";
        document.getElementById("potion-descricao").value = p.descricao || p["descrição"] || "";
        if (document.getElementById("potion-wiki")) {
            document.getElementById("potion-wiki").value = p.meta?.wiki || "";
        }

        document.querySelector('[data-target="tab-registro-pocoes"]')?.click();
    }

    async exportSelectedPotions() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma poção disponível para exportar.");
            return;
        }

        const fullPotions = await fetchItemsByIds(COLLECTIONS.POTIONS, targetIds);
        downloadJsonFile(fullPotions, `compendio_pocoes_${fullPotions.length}`);
    }
}
