/**
 * CONTROLADOR DO CATALOGO DE ANIMAIS / CRIATURAS MAGICAS (D.R.C.C.M.)
 * Carregamento Individual Sob Demanda e Delegacao de Eventos de Alta Performance
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

export class CreatureController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activeCreatureId = null;
        this.editingId = null;
        this.currentFotoBase64 = "";
        this.loaded = false;
        this.searchTimer = null;

        this.form = document.getElementById("form-creature");
        this.listContainer = document.getElementById("creature-list");
        this.viewerContainer = document.getElementById("creature-viewer-content");

        this.initEvents();
    }

    initEvents() {
        const fotoInput = document.getElementById("reg-foto");
        if (fotoInput) {
            fotoInput.addEventListener("change", async e => {
                const file = e.target.files[0];
                if (file) {
                    this.currentFotoBase64 = await fileToBase64(file);
                    const preview = document.getElementById("preview-foto");
                    if (preview) {
                        preview.src = this.currentFotoBase64;
                        preview.classList.remove("hidden");
                    }
                    const label = document.getElementById("label-foto");
                    if (label) label.textContent = "Fotografia Anexada";
                }
            });
        }

        const btnAddInjury = document.getElementById("btn-add-reg-injury");
        if (btnAddInjury) {
            btnAddInjury.addEventListener("click", () => this.addCustomInjuryRow());
        }

        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.saveCreature();
            });
        }

        const btnBulk = document.getElementById("btn-bulk-import-creatures");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        const searchEl = document.getElementById("search-creature");
        if (searchEl) {
            searchEl.addEventListener("input", () => {
                clearTimeout(this.searchTimer);
                this.searchTimer = setTimeout(() => this.applyFilters(), 80);
            });
        }

        const selectIds = [
            "sort-creature",
            "filter-class",
            "filter-licenca",
            "filter-locomocao",
            "filter-porte",
            "filter-interacao",
            "filter-tipo"
        ];
        selectIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("change", () => this.applyFilters());
        });

        const btnReset = document.getElementById("btn-reset-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        const btnExportSelected = document.getElementById("btn-export-selected-creatures");
        if (btnExportSelected) {
            btnExportSelected.addEventListener("click", () => this.exportSelectedCreatures());
        }

        // Delegacao unica de eventos na lista lateral (evita centenas de listeners)
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
                    this.selectAndLoadCreature(li.dataset.id);
                }
            });
        }
    }

    async ensureLoaded() {
        if (!this.loaded) {
            await this.loadCatalog();
        }
    }

    addCustomInjuryRow(data = { name: "", curr: 0, max: 1 }) {
        const container = document.getElementById("reg-custom-injuries-container");
        if (!container) return;
        const row = document.createElement("div");
        row.className = "injury-row custom-injury mt-10";
        row.innerHTML = `
            <input type="text" class="ink-input injury-name-input" placeholder="Condicao (ex: Asa Quebrada)" value="${escapeHtml(data.name)}" style="flex: 1;">
            <input type="number" class="ink-input short-input curr" value="${Number(data.curr || 0)}" min="0"> /
            <input type="number" class="ink-input short-input max" value="${Number(data.max || 1)}" min="1">
            <button type="button" class="btn-danger" onclick="this.parentElement.remove()">X</button>
        `;
        container.appendChild(row);
    }

    async saveCreature() {
        const customInjuries = [];
        document.querySelectorAll("#reg-custom-injuries-container .custom-injury").forEach(row => {
            const name = row.querySelector(".injury-name-input")?.value?.trim();
            if (name) {
                customInjuries.push({
                    name,
                    curr: parseInt(row.querySelector(".curr")?.value, 10) || 0,
                    max: parseInt(row.querySelector(".max")?.value, 10) || 1
                });
            }
        });

        const creatureData = {
            ...(this.editingId ? { id: this.editingId } : {}),
            nome: document.getElementById("reg-nome").value.trim(),
            classificacao: document.getElementById("reg-classificacao").value,
            licenca: document.getElementById("reg-licenca").value,
            porte: document.getElementById("reg-porte")?.value || "Médio",
            tamanho: document.getElementById("reg-tamanho").value.trim(),
            peso: document.getElementById("reg-peso").value.trim(),
            origem: document.getElementById("reg-origem").value,
            locomocao: document.getElementById("reg-locomocao").value,
            velocidade: document.getElementById("reg-velocidade")?.value?.trim() || "3.0m por ação",
            interacao: document.getElementById("reg-interacao").value,
            tipo: document.getElementById("reg-tipo").value,
            descricao: document.getElementById("reg-descricao").value.trim(),
            fotoBase64: this.currentFotoBase64,
            fotoUrl: this.currentFotoBase64,
            atributos: {
                corpo: parseInt(document.getElementById("attr-corpo").value, 10) || 0,
                destreza: parseInt(document.getElementById("attr-destreza").value, 10) || 0,
                vitalidade: parseInt(document.getElementById("attr-vitalidade").value, 10) || 0,
                instinto: parseInt(document.getElementById("attr-instinto").value, 10) || 0,
                carisma: parseInt(document.getElementById("attr-carisma").value, 10) || 0,
                inteligencia: parseInt(document.getElementById("attr-inteligencia").value, 10) || 0,
                sabedoria: parseInt(document.getElementById("attr-sabedoria").value, 10) || 0
            },
            habilidades: {
                dano: {
                    nome: document.getElementById("hab-dano-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-dano-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-dano-desc")?.value?.trim() || ""
                },
                reacao: {
                    nome: document.getElementById("hab-reacao-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-reacao-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-reacao-desc")?.value?.trim() || ""
                },
                ambiente: {
                    nome: document.getElementById("hab-ambiente-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-ambiente-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-ambiente-desc")?.value?.trim() || ""
                },
                extra: {
                    nome: document.getElementById("hab-extra-nome")?.value?.trim() || "",
                    rolagem: document.getElementById("hab-extra-rolagem")?.value?.trim() || "",
                    desc: document.getElementById("hab-extra-desc")?.value?.trim() || ""
                }
            },
            injuries: {
                leve: {
                    curr: parseInt(document.getElementById("reg-inj-leve-curr").value, 10) || 0,
                    max: parseInt(document.getElementById("reg-inj-leve-max").value, 10) || 3
                },
                media: {
                    curr: parseInt(document.getElementById("reg-inj-media-curr").value, 10) || 0,
                    max: parseInt(document.getElementById("reg-inj-media-max").value, 10) || 2
                },
                pesada: {
                    curr: parseInt(document.getElementById("reg-inj-pesada-curr").value, 10) || 0,
                    max: parseInt(document.getElementById("reg-inj-pesada-max").value, 10) || 1
                },
                custom: customInjuries
            }
        };

        const result = await saveRecord(COLLECTIONS.CREATURES, creatureData, "criatura");

        this.form.reset();
        this.editingId = null;
        this.currentFotoBase64 = "";
        const preview = document.getElementById("preview-foto");
        if (preview) {
            preview.src = "";
            preview.classList.add("hidden");
        }
        const label = document.getElementById("label-foto");
        if (label) label.textContent = "Anexar Retrato ou Ilustracao";
        const injContainer = document.getElementById("reg-custom-injuries-container");
        if (injContainer) injContainer.innerHTML = "";

        await this.loadCatalog(true);
        alert(`Criatura "${creatureData.nome}" catalogada com sucesso no Arquivo Ministerial.`);
        document.querySelector('[data-target="tab-arquivo-criaturas"]')?.click();
        await this.selectAndLoadCreature(result.id);
    }

    async handleBulkImport() {
        const textInput = document.getElementById("bulk-creature-input")?.value?.trim();
        const fileInput = document.getElementById("bulk-creature-file")?.files?.[0];

        let rawJson = textInput;
        if (fileInput) {
            rawJson = await fileInput.text();
        }

        if (!rawJson) {
            alert("Cole um JSON valido ou selecione um arquivo .json para importar criaturas em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.CREATURES, list, "criatura");
            document.getElementById("bulk-creature-input").value = "";
            document.getElementById("bulk-creature-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} criatura(s) importada(s) com sucesso.`);
        } catch (err) {
            alert("Erro ao processar JSON de criaturas: " + err.message);
        }
    }

    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.indexData = await fetchCatalogIndex(COLLECTIONS.CREATURES, forceRefresh);
        this.loaded = true;
        this.updateBadgeCount();
        this.applyFilters();

        if (!this.activeCreatureId && this.filteredIndex.length > 0) {
            this.selectAndLoadCreature(this.filteredIndex[0].id);
        }
    }

    updateBadgeCount() {
        const badge = document.getElementById("count-badge-creatures");
        if (badge) badge.textContent = this.indexData.length;
    }

    resetFilters() {
        const ids = [
            "search-creature",
            "filter-class",
            "filter-licenca",
            "filter-locomocao",
            "filter-porte",
            "filter-interacao",
            "filter-tipo"
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const sortEl = document.getElementById("sort-creature");
        if (sortEl) sortEl.value = "alfabetica";
        this.applyFilters();
    }

    applyFilters() {
        const search = (document.getElementById("search-creature")?.value || "").toLowerCase().trim();
        const sortMode = document.getElementById("sort-creature")?.value || "alfabetica";
        const fClass = document.getElementById("filter-class")?.value || "";
        const fLicenca = document.getElementById("filter-licenca")?.value || "";
        const fLocomocao = document.getElementById("filter-locomocao")?.value || "";
        const fPorte = document.getElementById("filter-porte")?.value || "";
        const fInteracao = document.getElementById("filter-interacao")?.value || "";
        const fTipo = document.getElementById("filter-tipo")?.value || "";

        this.filteredIndex = this.indexData.filter(c => {
            const matchName = !search || (c.nome || "").toLowerCase().includes(search);
            const matchClass = !fClass || c.classificacao === fClass;
            const matchLicenca = !fLicenca || c.licenca === fLicenca;
            const matchLocomocao = !fLocomocao || c.locomocao === fLocomocao;
            const matchPorte = !fPorte || c.porte === fPorte;
            const matchInteracao = !fInteracao || c.interacao === fInteracao;
            const matchTipo = !fTipo || c.tipo === fTipo;

            return matchName && matchClass && matchLicenca && matchLocomocao && matchPorte && matchInteracao && matchTipo;
        });

        this.filteredIndex.sort((a, b) => {
            if (sortMode === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sortMode === "perigo-asc") return (a.classificacao || "").length - (b.classificacao || "").length;
            if (sortMode === "perigo-desc") return (b.classificacao || "").length - (a.classificacao || "").length;
            return 0;
        });

        this.renderSidebarList();
    }

    renderSidebarList() {
        if (!this.listContainer) return;

        const countEl = document.getElementById("creature-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} especies`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma criatura encontrada com os filtros atuais.</li>`;
            this.updateExportButtonLabel();
            return;
        }

        this.listContainer.innerHTML = this.filteredIndex.map(c => {
            const isChecked = this.selectedIds.has(c.id);
            const isActive = this.activeCreatureId === c.id;
            return `
                <li class="record-list-item ${isActive ? "active-record" : ""}" data-id="${escapeHtml(c.id)}">
                    <div class="list-item-row">
                        <input type="checkbox" class="record-check" data-id="${escapeHtml(c.id)}" ${isChecked ? "checked" : ""} title="Selecionar para exportacao">
                        <div class="list-item-main">
                            <strong>${escapeHtml(c.nome)}</strong>
                            <small>${escapeHtml(c.tipo)} | ${escapeHtml(c.locomocao)} | ${escapeHtml(c.porte || "Medio")}</small>
                        </div>
                        <span class="badge-danger-small">${escapeHtml(c.classificacao)}</span>
                    </div>
                </li>
            `;
        }).join("");

        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-selected-creatures");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `Exportar Selecionados (${this.selectedIds.size})`
                : `Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    async selectAndLoadCreature(id) {
        this.activeCreatureId = id;
        this.listContainer?.querySelectorAll(".record-list-item").forEach(li => {
            li.classList.toggle("active-record", li.dataset.id === id);
        });

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");

        const c = await fetchItemById(COLLECTIONS.CREATURES, id);
        if (!c) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Nao foi possivel carregar o registro individual desta criatura.</p>`;
            return;
        }

        this.renderCreatureSheet(c);
    }

    formatSigned(val) {
        const n = Number(val || 0);
        return n > 0 ? `+${n}` : `${n}`;
    }

    renderCreatureSheet(c) {
        const photoSrc = c.fotoBase64 || c.fotoUrl || "";
        const imgHtml = photoSrc
            ? `<div class="creature-portrait-frame">
                 <img src="${escapeHtml(photoSrc)}" class="creature-sheet-photo" alt="${escapeHtml(c.nome)}" decoding="async" loading="lazy" onerror="this.parentElement.style.display='none'">
               </div>`
            : "";

        const attrs = c.atributos || {};
        const attrLabels = [
            { key: "corpo", label: "Corpo" },
            { key: "destreza", label: "Destreza" },
            { key: "vitalidade", label: "Vitalidade" },
            { key: "instinto", label: "Instinto" },
            { key: "carisma", label: "Carisma" },
            { key: "inteligencia", label: "Inteligencia" },
            { key: "sabedoria", label: "Sabedoria" }
        ];

        const attrsHtml = attrLabels.map(a => `
            <div class="stat-pill">
                <span class="stat-pill-label">${a.label}</span>
                <strong class="stat-pill-value">${this.formatSigned(attrs[a.key])}</strong>
            </div>
        `).join("");

        const hab = c.habilidades || {};
        const habCategories = [
            { key: "dano", badge: "DANO", colorClass: "hab-dano" },
            { key: "reacao", badge: "REACAO", colorClass: "hab-reacao" },
            { key: "ambiente", badge: "AMBIENTE", colorClass: "hab-ambiente" },
            { key: "extra", badge: "EXTRA", colorClass: "hab-extra" }
        ];

        const hasAbilities = habCategories.some(hc => hab[hc.key]?.nome || hab[hc.key]?.desc);
        const abilitiesHtml = hasAbilities
            ? `
            <div class="sheet-section mt-15">
                <h4 class="section-subtitle">Habilidades de Combate e Instinto</h4>
                <div class="abilities-grid">
                    ${habCategories.map(hc => {
                        const item = hab[hc.key];
                        if (!item || (!item.nome && !item.desc)) return "";
                        return `
                            <div class="ability-card ${hc.colorClass}">
                                <div class="ability-card-header">
                                    <span class="ability-type-tag">${hc.badge}</span>
                                    <strong class="ability-name">${escapeHtml(item.nome || "Habilidade")}</strong>
                                    ${item.rolagem ? `<code class="ability-roll">${escapeHtml(item.rolagem)}</code>` : ""}
                                </div>
                                <p class="ability-desc">${escapeHtml(item.desc || "")}</p>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>`
            : "";

        let customInjHtml = "";
        if (c.injuries?.custom && c.injuries.custom.length > 0) {
            customInjHtml = `<div class="mt-10"><strong>Condicoes Especificas:</strong><ul style="margin-left: 20px;">` +
                c.injuries.custom.map(i => `<li>${escapeHtml(i.name)}: [${i.curr} / ${i.max}]</li>`).join("") +
                `</ul></div>`;
        }

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">D.R.C.C.M. | REGISTRO OFICIAL DE ESPECIE MAGICA</span>
                        <h3 class="sheet-main-title">${escapeHtml(c.nome)}</h3>
                    </div>
                    <div class="danger-stamp" title="Classificacao do Ministerio da Magia">
                        <span>M.M.</span>
                        <strong>${escapeHtml(c.classificacao)}</strong>
                    </div>
                </div>

                <div class="sheet-hero-grid">
                    ${imgHtml}
                    <div class="sheet-metadata-box">
                        <div class="meta-item"><strong>Licenca Exigida:</strong> <span class="license-tag">${escapeHtml(c.licenca)}</span></div>
                        <div class="meta-item"><strong>Tipo de Criatura:</strong> ${escapeHtml(c.tipo)} (${escapeHtml(c.interacao)})</div>
                        <div class="meta-item"><strong>Origem:</strong> ${escapeHtml(c.origem || "Natural")}</div>
                        <div class="meta-item"><strong>Porte / Categoria:</strong> ${escapeHtml(c.porte || "Medio")}</div>
                        <div class="meta-item"><strong>Dimensoes Adulto:</strong> ${escapeHtml(c.tamanho || "N/A")} | ${escapeHtml(c.peso || "N/A")}</div>
                        <div class="meta-item"><strong>Locomocao:</strong> ${escapeHtml(c.locomocao)}</div>
                        <div class="meta-item"><strong>Velocidade de Acao:</strong> <code>${escapeHtml(c.velocidade || "3.0m por acao")}</code></div>
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Atributos Fisicos e Animais (Escala -5 a +10)</h4>
                    <div class="stats-pills-grid">
                        ${attrsHtml}
                    </div>
                </div>

                ${abilitiesHtml}

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Prontuario Medico-Veterinario (Limites de Injuria)</h4>
                    <div class="injury-badges-row">
                        <span class="inj-badge inj-light">Leve: [ ${c.injuries?.leve?.curr || 0} / ${c.injuries?.leve?.max || 3} ]</span>
                        <span class="inj-badge inj-medium">Media: [ ${c.injuries?.media?.curr || 0} / ${c.injuries?.media?.max || 2} ]</span>
                        <span class="inj-badge inj-heavy">Pesada: [ ${c.injuries?.pesada?.curr || 0} / ${c.injuries?.pesada?.max || 1} ]</span>
                    </div>
                    ${customInjHtml}
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Descricao Fisica, Habitat e Temperamento</h4>
                    <p class="sheet-prose">${escapeHtml(c.descricao || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-creature">
                        Exportar para Ficha de Jogador (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-creature">
                        Editar Registro
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-creature">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        this.viewerContainer.querySelector("#btn-export-single-creature")?.addEventListener("click", () => {
            exportJson(c, `criatura_${c.nome}`);
        });

        this.viewerContainer.querySelector("#btn-edit-creature")?.addEventListener("click", () => {
            this.populateFormForEdit(c);
        });

        this.viewerContainer.querySelector("#btn-delete-creature")?.addEventListener("click", async () => {
            if (confirm(`Deseja realmente remover "${c.nome}" do arquivo?`)) {
                await deleteRecord(COLLECTIONS.CREATURES, c.id);
                this.activeCreatureId = null;
                this.viewerContainer.innerHTML = `<p class="empty-msg">Registro removido. Selecione outra criatura na lista ao lado.</p>`;
                await this.loadCatalog(true);
            }
        });
    }

    populateFormForEdit(c) {
        this.editingId = c.id;
        document.getElementById("reg-nome").value = c.nome || "";
        document.getElementById("reg-classificacao").value = c.classificacao || "XXX";
        document.getElementById("reg-licenca").value = c.licenca || "Comum";
        if (document.getElementById("reg-porte")) {
            document.getElementById("reg-porte").value = c.porte || "Médio";
        }
        document.getElementById("reg-tamanho").value = c.tamanho || "";
        document.getElementById("reg-peso").value = c.peso || "";
        document.getElementById("reg-origem").value = c.origem || "Natural";
        document.getElementById("reg-locomocao").value = c.locomocao || "Terrestres";
        if (document.getElementById("reg-velocidade")) {
            document.getElementById("reg-velocidade").value = c.velocidade || "3.0m por ação";
        }
        document.getElementById("reg-interacao").value = c.interacao || "Pacífico";
        document.getElementById("reg-tipo").value = c.tipo || "Neutro";
        document.getElementById("reg-descricao").value = c.descricao || "";

        const attrs = c.atributos || {};
        document.getElementById("attr-corpo").value = attrs.corpo ?? 0;
        document.getElementById("attr-destreza").value = attrs.destreza ?? 0;
        document.getElementById("attr-vitalidade").value = attrs.vitalidade ?? 0;
        document.getElementById("attr-instinto").value = attrs.instinto ?? 0;
        document.getElementById("attr-carisma").value = attrs.carisma ?? 0;
        document.getElementById("attr-inteligencia").value = attrs.inteligencia ?? 0;
        document.getElementById("attr-sabedoria").value = attrs.sabedoria ?? 0;

        const hab = c.habilidades || {};
        ["dano", "reacao", "ambiente", "extra"].forEach(k => {
            const h = hab[k] || {};
            const nEl = document.getElementById(`hab-${k}-nome`);
            const rEl = document.getElementById(`hab-${k}-rolagem`);
            const dEl = document.getElementById(`hab-${k}-desc`);
            if (nEl) nEl.value = h.nome || "";
            if (rEl) rEl.value = h.rolagem || "";
            if (dEl) dEl.value = h.desc || "";
        });

        document.getElementById("reg-inj-leve-curr").value = c.injuries?.leve?.curr ?? 0;
        document.getElementById("reg-inj-leve-max").value = c.injuries?.leve?.max ?? 3;
        document.getElementById("reg-inj-media-curr").value = c.injuries?.media?.curr ?? 0;
        document.getElementById("reg-inj-media-max").value = c.injuries?.media?.max ?? 2;
        document.getElementById("reg-inj-pesada-curr").value = c.injuries?.pesada?.curr ?? 0;
        document.getElementById("reg-inj-pesada-max").value = c.injuries?.pesada?.max ?? 1;

        const injContainer = document.getElementById("reg-custom-injuries-container");
        if (injContainer) {
            injContainer.innerHTML = "";
            (c.injuries?.custom || []).forEach(inj => this.addCustomInjuryRow(inj));
        }

        this.currentFotoBase64 = c.fotoBase64 || c.fotoUrl || "";
        const preview = document.getElementById("preview-foto");
        if (preview && this.currentFotoBase64) {
            preview.src = this.currentFotoBase64;
            preview.classList.remove("hidden");
        }

        document.querySelector('[data-target="tab-registro-criaturas"]')?.click();
    }

    async exportSelectedCreatures() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma criatura disponivel para exportar.");
            return;
        }

        const fullItems = await fetchItemsByIds(COLLECTIONS.CREATURES, targetIds);
        downloadJsonFile(fullItems, `compendio_criaturas_${fullItems.length}`);
    }
}
