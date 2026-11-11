/**
 * CONTROLADOR DO CATÁLOGO DE ANIMAIS / CRIATURAS MÁGICAS (D.R.C.C.M.)
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
import { fileToBase64, exportJson, escapeHtml } from "../utils/helpers.js";

export class CreatureController {
    constructor() {
        this.indexData = [];
        this.filteredIndex = [];
        this.selectedIds = new Set();
        this.activeCreatureId = null;
        this.editingId = null;
        this.currentFotoBase64 = "";

        this.form = document.getElementById("form-creature");
        this.listContainer = document.getElementById("creature-list");
        this.viewerContainer = document.getElementById("creature-viewer-content");

        this.initEvents();
    }

    initEvents() {
        // 1. Visibilidade dinâmica ou destaque de atributos por Tipo de Criatura
        const tipoSelect = document.getElementById("reg-tipo");
        if (tipoSelect) {
            tipoSelect.addEventListener("change", e => this.handleTypeChange(e.target.value));
        }

        // 2. Upload de Foto com compressão automática
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
                    if (label) label.textContent = "Fotografia Anexada ✓";
                }
            });
        }

        // 3. Adicionar ferimento customizado no formulário
        const btnAddInjury = document.getElementById("btn-add-reg-injury");
        if (btnAddInjury) {
            btnAddInjury.addEventListener("click", () => this.addCustomInjuryRow());
        }

        // 4. Submissão do formulário de Registro / Edição
        if (this.form) {
            this.form.addEventListener("submit", async e => {
                e.preventDefault();
                await this.saveCreature();
            });
        }

        // 5. Importação em Massa de Criaturas (JSON)
        const btnBulk = document.getElementById("btn-bulk-import-creatures");
        if (btnBulk) {
            btnBulk.addEventListener("click", () => this.handleBulkImport());
        }

        // 6. Filtros e Pesquisa no Arquivo
        const filterIds = [
            "search-creature",
            "sort-creature",
            "filter-class",
            "filter-licenca",
            "filter-locomocao",
            "filter-porte",
            "filter-interacao",
            "filter-tipo"
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => this.applyFilters());
                el.addEventListener("change", () => this.applyFilters());
            }
        });

        const btnReset = document.getElementById("btn-reset-filters");
        if (btnReset) {
            btnReset.addEventListener("click", () => this.resetFilters());
        }

        // 7. Exportação de múltiplos animais selecionados
        const btnExportSelected = document.getElementById("btn-export-selected-creatures");
        if (btnExportSelected) {
            btnExportSelected.addEventListener("click", () => this.exportSelectedCreatures());
        }

        // 8. Carrega o índice inicial
        this.loadCatalog();
    }

    handleTypeChange(selectedType) {
        document.querySelectorAll(".dynamic-reg-attr").forEach(el => {
            const allowedTypes = el.dataset.types.split(",");
            if (allowedTypes.includes(selectedType)) {
                el.classList.remove("hidden");
            } else {
                el.classList.remove("hidden"); // Mantém visível no compêndio ministerial completo
            }
        });
    }

    addCustomInjuryRow(data = { name: "", curr: 0, max: 1 }) {
        const container = document.getElementById("reg-custom-injuries-container");
        if (!container) return;
        const row = document.createElement("div");
        row.className = "injury-row custom-injury mt-10";
        row.innerHTML = `
            <input type="text" class="ink-input injury-name-input" placeholder="Condição (ex: Asa Quebrada)" value="${escapeHtml(data.name)}" style="flex: 1;">
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
                    curr: parseInt(row.querySelector(".curr")?.value) || 0,
                    max: parseInt(row.querySelector(".max")?.value) || 1
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
                corpo: parseInt(document.getElementById("attr-corpo").value) || 0,
                destreza: parseInt(document.getElementById("attr-destreza").value) || 0,
                vitalidade: parseInt(document.getElementById("attr-vitalidade").value) || 0,
                instinto: parseInt(document.getElementById("attr-instinto").value) || 0,
                carisma: parseInt(document.getElementById("attr-carisma").value) || 0,
                inteligencia: parseInt(document.getElementById("attr-inteligencia").value) || 0,
                sabedoria: parseInt(document.getElementById("attr-sabedoria").value) || 0
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
                    curr: parseInt(document.getElementById("reg-inj-leve-curr").value) || 0,
                    max: parseInt(document.getElementById("reg-inj-leve-max").value) || 3
                },
                media: {
                    curr: parseInt(document.getElementById("reg-inj-media-curr").value) || 0,
                    max: parseInt(document.getElementById("reg-inj-media-max").value) || 2
                },
                pesada: {
                    curr: parseInt(document.getElementById("reg-inj-pesada-curr").value) || 0,
                    max: parseInt(document.getElementById("reg-inj-pesada-max").value) || 1
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
        if (label) label.textContent = "Anexar Retrato ou Ilustração";
        const injContainer = document.getElementById("reg-custom-injuries-container");
        if (injContainer) injContainer.innerHTML = "";

        await this.loadCatalog(true);
        alert(`Criatura "${creatureData.nome}" catalogada com sucesso no Arquivo Ministerial!`);
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
            alert("Cole um JSON válido ou selecione um arquivo .json para importar criaturas em massa.");
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const res = await saveBulkRecords(COLLECTIONS.CREATURES, list, "criatura");
            document.getElementById("bulk-creature-input").value = "";
            document.getElementById("bulk-creature-file").value = "";
            await this.loadCatalog(true);
            alert(`${res.count} criatura(s) importada(s) com sucesso!`);
        } catch (err) {
            alert("Erro ao processar JSON de criaturas: " + err.message);
        }
    }

    /**
     * Carrega apenas o índice leve das criaturas (Tier 1) para listagem rápida.
     */
    async loadCatalog(forceRefresh = false) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `<li class="empty-msg">Consultando índice do D.R.C.C.M...</li>`;

        this.indexData = await fetchCatalogIndex(COLLECTIONS.CREATURES, forceRefresh);
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
        this.listContainer.innerHTML = "";

        const countEl = document.getElementById("creature-filter-count");
        if (countEl) {
            countEl.textContent = `Exibindo ${this.filteredIndex.length} de ${this.indexData.length} espécies`;
        }

        if (this.filteredIndex.length === 0) {
            this.listContainer.innerHTML = `<li class="empty-msg">Nenhuma criatura encontrada com os filtros atuais.</li>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.filteredIndex.forEach(c => {
            const li = document.createElement("li");
            li.className = `record-list-item ${this.activeCreatureId === c.id ? "active-record" : ""}`;
            li.dataset.id = c.id;

            const isChecked = this.selectedIds.has(c.id);
            li.innerHTML = `
                <div class="list-item-row">
                    <input type="checkbox" class="record-check" data-id="${escapeHtml(c.id)}" ${isChecked ? "checked" : ""} title="Selecionar para exportação">
                    <div class="list-item-main">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>${escapeHtml(c.tipo)} • ${escapeHtml(c.locomocao)} • ${escapeHtml(c.porte || "Médio")}</small>
                    </div>
                    <span class="badge-danger-small">${escapeHtml(c.classificacao)}</span>
                </div>
            `;

            const checkbox = li.querySelector(".record-check");
            checkbox.addEventListener("click", e => {
                e.stopPropagation();
                if (e.target.checked) {
                    this.selectedIds.add(c.id);
                } else {
                    this.selectedIds.delete(c.id);
                }
                this.updateExportButtonLabel();
            });

            li.addEventListener("click", () => this.selectAndLoadCreature(c.id));
            fragment.appendChild(li);
        });

        this.listContainer.appendChild(fragment);
        this.updateExportButtonLabel();
    }

    updateExportButtonLabel() {
        const btn = document.getElementById("btn-export-selected-creatures");
        if (btn) {
            btn.textContent = this.selectedIds.size > 0
                ? `📦 Exportar Selecionados (${this.selectedIds.size})`
                : `📦 Exportar Lista Filtrada (${this.filteredIndex.length})`;
        }
    }

    /**
     * Carregamento Individual Sob Demanda (Tier 2):
     * Busca a ficha completa da criatura APENAS quando o usuário a seleciona.
     */
    async selectAndLoadCreature(id) {
        this.activeCreatureId = id;
        this.listContainer?.querySelectorAll(".record-list-item").forEach(li => {
            li.classList.toggle("active-record", li.dataset.id === id);
        });

        if (!this.viewerContainer) return;
        this.viewerContainer.classList.remove("empty-viewer");
        this.viewerContainer.innerHTML = `
            <div class="loading-parchment">
                <span class="loading-quill">🪶</span>
                <p>Consultando registro ministerial individual no arquivo...</p>
            </div>
        `;

        const c = await fetchItemById(COLLECTIONS.CREATURES, id);
        if (!c) {
            this.viewerContainer.innerHTML = `<p class="empty-msg">Não foi possível carregar o registro individual desta criatura.</p>`;
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
                 <img src="${escapeHtml(photoSrc)}" class="creature-sheet-photo" alt="${escapeHtml(c.nome)}" loading="lazy" onerror="this.parentElement.style.display='none'">
               </div>`
            : "";

        const attrs = c.atributos || {};
        const attrLabels = [
            { key: "corpo", icon: "💪", label: "Corpo" },
            { key: "destreza", icon: "🎯", label: "Destreza" },
            { key: "vitalidade", icon: "❤️", label: "Vitalidade" },
            { key: "instinto", icon: "🦊", label: "Instinto" },
            { key: "carisma", icon: "👑", label: "Carisma" },
            { key: "inteligencia", icon: "🧠", label: "Inteligência" },
            { key: "sabedoria", icon: "👁️", label: "Sabedoria" }
        ];

        const attrsHtml = attrLabels.map(a => `
            <div class="stat-pill">
                <span class="stat-pill-label">${a.icon} ${a.label}</span>
                <strong class="stat-pill-value">${this.formatSigned(attrs[a.key])}</strong>
            </div>
        `).join("");

        // Habilidades Especiais (Dano, Reação, Ambiente, Extra)
        const hab = c.habilidades || {};
        const habCategories = [
            { key: "dano", badge: "⚔️ DANO", colorClass: "hab-dano" },
            { key: "reacao", badge: "🛡️ REAÇÃO", colorClass: "hab-reacao" },
            { key: "ambiente", badge: "🌪️ AMBIENTE", colorClass: "hab-ambiente" },
            { key: "extra", badge: "✨ EXTRA", colorClass: "hab-extra" }
        ];

        const hasAbilities = habCategories.some(hc => hab[hc.key]?.nome || hab[hc.key]?.desc);
        const abilitiesHtml = hasAbilities
            ? `
            <div class="sheet-section mt-15">
                <h4 class="section-subtitle">⚔️ Habilidades de Combate & Instinto</h4>
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
            customInjHtml = `<div class="mt-10"><strong>Condições Específicas:</strong><ul style="margin-left: 20px;">` +
                c.injuries.custom.map(i => `<li>${escapeHtml(i.name)}: [${i.curr} / ${i.max}]</li>`).join("") +
                `</ul></div>`;
        }

        this.viewerContainer.innerHTML = `
            <div class="creature-sheet-card animated-fade">
                <div class="sheet-top-banner">
                    <div>
                        <span class="department-tag">D.R.C.C.M. • REGISTRO OFICIAL DE ESPÉCIE MÁGICA</span>
                        <h3 class="sheet-main-title">${escapeHtml(c.nome)}</h3>
                    </div>
                    <div class="danger-stamp" title="Classificação do Ministério da Magia">
                        <span>M.M.</span>
                        <strong>${escapeHtml(c.classificacao)}</strong>
                    </div>
                </div>

                <div class="sheet-hero-grid">
                    ${imgHtml}
                    <div class="sheet-metadata-box">
                        <div class="meta-item"><strong>Licença Exigida:</strong> <span class="license-tag">${escapeHtml(c.licenca)}</span></div>
                        <div class="meta-item"><strong>Tipo de Criatura:</strong> ${escapeHtml(c.tipo)} (${escapeHtml(c.interacao)})</div>
                        <div class="meta-item"><strong>Origem:</strong> ${escapeHtml(c.origem || "Natural")}</div>
                        <div class="meta-item"><strong>Porte / Categoria:</strong> ${escapeHtml(c.porte || "Médio")}</div>
                        <div class="meta-item"><strong>Dimensões Adulto:</strong> ${escapeHtml(c.tamanho || "N/A")} • ${escapeHtml(c.peso || "N/A")}</div>
                        <div class="meta-item"><strong>Locomoção:</strong> ${escapeHtml(c.locomocao)}</div>
                        <div class="meta-item"><strong>Velocidade de Ação:</strong> <code>${escapeHtml(c.velocidade || "3.0m por ação")}</code></div>
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">📊 Atributos Físicos e Animais (Escala -5 a +10)</h4>
                    <div class="stats-pills-grid">
                        ${attrsHtml}
                    </div>
                </div>

                ${abilitiesHtml}

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">🩺 Prontuário Médico-Veterinário (Limites de Injúria)</h4>
                    <div class="injury-badges-row">
                        <span class="inj-badge inj-light">🟢 Leve: [ ${c.injuries?.leve?.curr || 0} / ${c.injuries?.leve?.max || 3} ]</span>
                        <span class="inj-badge inj-medium">🟡 Média: [ ${c.injuries?.media?.curr || 0} / ${c.injuries?.media?.max || 2} ]</span>
                        <span class="inj-badge inj-heavy">🔴 Pesada: [ ${c.injuries?.pesada?.curr || 0} / ${c.injuries?.pesada?.max || 1} ]</span>
                    </div>
                    ${customInjHtml}
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">📜 Descrição Física, Habitat & Temperamento</h4>
                    <p class="sheet-prose">${escapeHtml(c.descricao || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-actions-bar mt-20">
                    <button type="button" class="btn-submit" id="btn-export-single-creature">
                        📥 Exportar para Ficha de Jogador (.json)
                    </button>
                    <button type="button" class="btn-secondary" id="btn-edit-creature">
                        ✏️ Editar Registro
                    </button>
                    <button type="button" class="btn-danger" id="btn-delete-creature">
                        🗑️ Excluir
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

        // Navega para a aba de registro de criaturas
        document.querySelector('[data-target="tab-registro-criaturas"]')?.click();
    }

    async exportSelectedCreatures() {
        const targetIds = this.selectedIds.size > 0
            ? Array.from(this.selectedIds)
            : this.filteredIndex.map(i => i.id);

        if (targetIds.length === 0) {
            alert("Nenhuma criatura disponível para exportar.");
            return;
        }

        const fullItems = await fetchItemsByIds(COLLECTIONS.CREATURES, targetIds);
        downloadJsonFile(fullItems, `compendio_criaturas_${fullItems.length}`);
    }
}
