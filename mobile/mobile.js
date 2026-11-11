/**
 * CONTROLADOR PRINCIPAL DA VERSÃO MOBILE / ANDROID
 * Conecta os 4 catálogos do Firestore, gerencia a Bottom Navigation Bar,
 * os filtros colapsáveis, a Bottom Sheet modal e a verificação automática de updates no GitHub.
 */

import {
    COLLECTIONS,
    fetchCatalogIndex,
    fetchItemById,
    saveRecord
} from "../js/services/database.js";
import { escapeHtml } from "../js/utils/helpers.js";
import { checkForAppUpdates, CURRENT_APP_VERSION } from "../js/services/updater.js";

class MobileCatalogApp {
    constructor() {
        this.activeCategory = "creatures";
        this.data = {
            creatures: [],
            spells: [],
            plants: [],
            potions: []
        };
        this.filtered = {
            creatures: [],
            spells: [],
            plants: [],
            potions: []
        };
        this.searchTimers = {};
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupBottomNav();
        this.setupModal();
        this.setupFilters();
        this.checkUpdates();
        await this.loadAllCatalogs();
    }

    setupTheme() {
        const btnTheme = document.getElementById("mobile-btn-theme");
        const updateThemeLabel = () => {
            const isDark = document.body.classList.contains("dark-mode");
            if (btnTheme) btnTheme.textContent = isDark ? "Claro" : "Escuro";
        };

        const saved = localStorage.getItem("wwrpg-theme");
        if (saved === "dark") document.body.classList.add("dark-mode");
        else if (saved === "terminal") document.body.classList.add("terminal-mode");
        updateThemeLabel();

        if (btnTheme) {
            btnTheme.addEventListener("click", () => {
                document.body.classList.remove("terminal-mode");
                const isDark = document.body.classList.toggle("dark-mode");
                localStorage.setItem("wwrpg-theme", isDark ? "dark" : "light");
                updateThemeLabel();
            });
        }
    }

    async checkUpdates() {
        let appVer = CURRENT_APP_VERSION;
        if (window.AndroidNative && typeof window.AndroidNative.getAppVersion === "function") {
            try {
                appVer = window.AndroidNative.getAppVersion();
            } catch (_) {}
        }

        const updateBanner = document.getElementById("mobile-update-banner");
        const updateText = document.getElementById("mobile-update-text");
        const updateLink = document.getElementById("mobile-update-link");

        const info = await checkForAppUpdates(appVer);
        if (info.hasUpdate && updateBanner) {
            if (updateText) {
                updateText.textContent = `Nova versão ${info.latestVersion} disponível!`;
            }
            if (updateLink) {
                updateLink.href = info.downloadUrl || "#";
                updateLink.addEventListener("click", e => {
                    if (window.AndroidNative && typeof window.AndroidNative.openExternalUrl === "function") {
                        e.preventDefault();
                        window.AndroidNative.openExternalUrl(info.downloadUrl);
                    }
                });
            }
            updateBanner.style.display = "flex";
        }
    }

    setupBottomNav() {
        const navButtons = document.querySelectorAll(".mobile-nav-item[data-target]");
        navButtons.forEach(btn => {
            btn.addEventListener("click", e => {
                e.preventDefault();
                const target = btn.dataset.target;
                this.switchTab(target);
            });
        });
    }

    switchTab(targetPaneId) {
        document.querySelectorAll(".mobile-nav-item").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.target === targetPaneId);
        });

        document.querySelectorAll(".mobile-tab-pane").forEach(pane => {
            pane.classList.toggle("active", pane.id === targetPaneId);
        });

        const catMap = {
            "mobile-pane-creatures": "creatures",
            "mobile-pane-spells": "spells",
            "mobile-pane-plants": "plants",
            "mobile-pane-potions": "potions"
        };

        if (catMap[targetPaneId]) {
            this.activeCategory = catMap[targetPaneId];
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setupModal() {
        const modal = document.getElementById("mobile-sheet-modal");
        const btnClose = document.getElementById("mobile-modal-close");

        if (btnClose && modal) {
            btnClose.addEventListener("click", () => {
                modal.classList.remove("open");
            });
        }

        if (modal) {
            modal.addEventListener("click", e => {
                if (e.target === modal) {
                    modal.classList.remove("open");
                }
            });
        }
    }

    setupFilters() {
        document.querySelectorAll(".btn-toggle-filters").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetId = btn.dataset.target;
                const details = document.getElementById(targetId);
                if (details) {
                    const isOpen = details.classList.toggle("open");
                    btn.textContent = isOpen ? "Ocultar Filtros" : "Filtros Avançados";
                }
            });
        });

        const searchCreature = document.getElementById("m-search-creature");
        if (searchCreature) {
            searchCreature.addEventListener("input", () => this.debounceFilter("creatures"));
        }
        ["m-filter-class", "m-filter-tipo", "m-sort-creature"].forEach(id => {
            document.getElementById(id)?.addEventListener("change", () => this.applyCreatureFilters());
        });

        const searchSpell = document.getElementById("m-search-spell");
        if (searchSpell) {
            searchSpell.addEventListener("input", () => this.debounceFilter("spells"));
        }
        ["m-filter-spell-lvl", "m-filter-spell-cat", "m-sort-spell"].forEach(id => {
            document.getElementById(id)?.addEventListener("change", () => this.applySpellFilters());
        });

        const searchPlant = document.getElementById("m-search-plant");
        if (searchPlant) {
            searchPlant.addEventListener("input", () => this.debounceFilter("plants"));
        }
        ["m-filter-plant-cat", "m-filter-plant-lvl", "m-sort-plant"].forEach(id => {
            document.getElementById(id)?.addEventListener("change", () => this.applyPlantFilters());
        });

        const searchPotion = document.getElementById("m-search-potion");
        if (searchPotion) {
            searchPotion.addEventListener("input", () => this.debounceFilter("potions"));
        }
        ["m-filter-potion-lvl", "m-filter-potion-tipo", "m-sort-potion"].forEach(id => {
            document.getElementById(id)?.addEventListener("change", () => this.applyPotionFilters());
        });

        document.getElementById("m-list-creatures")?.addEventListener("click", e => {
            const item = e.target.closest(".record-list-item");
            if (item?.dataset.id) this.openDetailSheet("creatures", item.dataset.id);
        });

        document.getElementById("m-list-spells")?.addEventListener("click", e => {
            const item = e.target.closest(".record-list-item");
            if (item?.dataset.id) this.openDetailSheet("spells", item.dataset.id);
        });

        document.getElementById("m-list-plants")?.addEventListener("click", e => {
            const item = e.target.closest(".record-list-item");
            if (item?.dataset.id) this.openDetailSheet("plants", item.dataset.id);
        });

        document.getElementById("m-list-potions")?.addEventListener("click", e => {
            const item = e.target.closest(".record-list-item");
            if (item?.dataset.id) this.openDetailSheet("potions", item.dataset.id);
        });
    }

    debounceFilter(category) {
        clearTimeout(this.searchTimers[category]);
        this.searchTimers[category] = setTimeout(() => {
            if (category === "creatures") this.applyCreatureFilters();
            else if (category === "spells") this.applySpellFilters();
            else if (category === "plants") this.applyPlantFilters();
            else if (category === "potions") this.applyPotionFilters();
        }, 80);
    }

    async loadAllCatalogs() {
        const [creatures, spells, plants, potions] = await Promise.all([
            fetchCatalogIndex(COLLECTIONS.CREATURES),
            fetchCatalogIndex(COLLECTIONS.SPELLS),
            fetchCatalogIndex(COLLECTIONS.PLANTS),
            fetchCatalogIndex(COLLECTIONS.POTIONS)
        ]);

        this.data.creatures = creatures;
        this.data.spells = spells;
        this.data.plants = plants;
        this.data.potions = potions;

        this.updateBadge("m-badge-creatures", creatures.length);
        this.updateBadge("m-badge-spells", spells.length);
        this.updateBadge("m-badge-plants", plants.length);
        this.updateBadge("m-badge-potions", potions.length);

        this.applyCreatureFilters();
        this.applySpellFilters();
        this.applyPlantFilters();
        this.applyPotionFilters();
    }

    updateBadge(id, count) {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    }

    applyCreatureFilters() {
        const q = (document.getElementById("m-search-creature")?.value || "").toLowerCase().trim();
        const fClass = document.getElementById("m-filter-class")?.value || "";
        const fTipo = document.getElementById("m-filter-tipo")?.value || "";
        const sort = document.getElementById("m-sort-creature")?.value || "alfabetica";

        this.filtered.creatures = this.data.creatures.filter(c => {
            const matchName = !q || (c.nome || "").toLowerCase().includes(q);
            const matchClass = !fClass || c.classificacao === fClass;
            const matchTipo = !fTipo || c.tipo === fTipo;
            return matchName && matchClass && matchTipo;
        });

        this.filtered.creatures.sort((a, b) => {
            if (sort === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sort === "perigo-asc") return (a.classificacao || "").length - (b.classificacao || "").length;
            if (sort === "perigo-desc") return (b.classificacao || "").length - (a.classificacao || "").length;
            return 0;
        });

        const listEl = document.getElementById("m-list-creatures");
        if (!listEl) return;

        if (this.filtered.creatures.length === 0) {
            listEl.innerHTML = `<li class="empty-msg">Nenhuma criatura encontrada.</li>`;
            return;
        }

        listEl.innerHTML = this.filtered.creatures.map(c => `
            <li class="record-list-item" data-id="${escapeHtml(c.id)}">
                <div class="list-item-row" style="width: 100%;">
                    <div class="list-item-main">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>${escapeHtml(c.tipo)} • ${escapeHtml(c.locomocao || "Terrestre")} • ${escapeHtml(c.porte || "Médio")}</small>
                    </div>
                    <span class="badge-danger-small">${escapeHtml(c.classificacao)}</span>
                </div>
            </li>
        `).join("");
    }

    applySpellFilters() {
        const q = (document.getElementById("m-search-spell")?.value || "").toLowerCase().trim();
        const fLvl = document.getElementById("m-filter-spell-lvl")?.value || "";
        const fCat = document.getElementById("m-filter-spell-cat")?.value || "";
        const sort = document.getElementById("m-sort-spell")?.value || "alfabetica";

        this.filtered.spells = this.data.spells.filter(s => {
            const matchName = !q || (s.name || "").toLowerCase().includes(q) || (s.pronuncia || "").toLowerCase().includes(q);
            const matchLvl = !fLvl || String(s.lvl) === String(fLvl);
            const matchCat = !fCat || (s.cat || "").toLowerCase() === fCat.toLowerCase();
            return matchName && matchLvl && matchCat;
        });

        this.filtered.spells.sort((a, b) => {
            if (sort === "alfabetica") return (a.name || "").localeCompare(b.name || "", "pt-BR");
            if (sort === "nivel-asc") return parseInt(a.lvl || 1) - parseInt(b.lvl || 1);
            if (sort === "nivel-desc") return parseInt(b.lvl || 1) - parseInt(a.lvl || 1);
            return 0;
        });

        const listEl = document.getElementById("m-list-spells");
        if (!listEl) return;

        if (this.filtered.spells.length === 0) {
            listEl.innerHTML = `<li class="empty-msg">Nenhum feitiço encontrado.</li>`;
            return;
        }

        listEl.innerHTML = this.filtered.spells.map(s => `
            <li class="record-list-item" data-id="${escapeHtml(s.id)}">
                <div class="list-item-row" style="width: 100%;">
                    <div class="list-item-main">
                        <strong>${escapeHtml(s.name)}</strong>
                        <small>${escapeHtml(s.cat)} • ${escapeHtml(s.tipo)}</small>
                    </div>
                    <span class="badge-level-small">Nv. ${escapeHtml(s.lvl)}</span>
                </div>
            </li>
        `).join("");
    }

    applyPlantFilters() {
        const q = (document.getElementById("m-search-plant")?.value || "").toLowerCase().trim();
        const fCat = document.getElementById("m-filter-plant-cat")?.value || "";
        const fLvl = document.getElementById("m-filter-plant-lvl")?.value || "";
        const sort = document.getElementById("m-sort-plant")?.value || "alfabetica";

        this.filtered.plants = this.data.plants.filter(p => {
            const matchName = !q || (p.nome || "").toLowerCase().includes(q);
            const matchCat = !fCat || (p.categoria || "").toLowerCase() === fCat.toLowerCase();
            const matchLvl = !fLvl || String(p.nivel) === String(fLvl);
            return matchName && matchCat && matchLvl;
        });

        this.filtered.plants.sort((a, b) => {
            if (sort === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sort === "nivel-asc") return parseInt(a.nivel || 1) - parseInt(b.nivel || 1);
            if (sort === "nivel-desc") return parseInt(b.nivel || 1) - parseInt(a.nivel || 1);
            return 0;
        });

        const listEl = document.getElementById("m-list-plants");
        if (!listEl) return;

        if (this.filtered.plants.length === 0) {
            listEl.innerHTML = `<li class="empty-msg">Nenhuma planta encontrada.</li>`;
            return;
        }

        listEl.innerHTML = this.filtered.plants.map(p => {
            const isRare = (p.categoria || "").toLowerCase().includes("dif");
            return `
                <li class="record-list-item" data-id="${escapeHtml(p.id)}">
                    <div class="list-item-row" style="width: 100%;">
                        <div class="list-item-main">
                            <strong>${escapeHtml(p.nome)}</strong>
                            <small>Nv. ${escapeHtml(p.nivel)} • CD ${escapeHtml(p.manejo_cd || 12)}</small>
                        </div>
                        <span class="${isRare ? "badge-rare-small" : "badge-popular-small"}">${isRare ? "Rara" : "Popular"}</span>
                    </div>
                </li>
            `;
        }).join("");
    }

    applyPotionFilters() {
        const q = (document.getElementById("m-search-potion")?.value || "").toLowerCase().trim();
        const fLvl = document.getElementById("m-filter-potion-lvl")?.value || "";
        const fTipo = (document.getElementById("m-filter-potion-tipo")?.value || "").toLowerCase();
        const sort = document.getElementById("m-sort-potion")?.value || "alfabetica";

        this.filtered.potions = this.data.potions.filter(p => {
            const matchName = !q || (p.nome || "").toLowerCase().includes(q);
            const matchLvl = !fLvl || String(p.nivel) === String(fLvl);
            const matchTipo = !fTipo || (p.tipo || "").toLowerCase().includes(fTipo);
            return matchName && matchLvl && matchTipo;
        });

        this.filtered.potions.sort((a, b) => {
            if (sort === "alfabetica") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
            if (sort === "nivel-asc") return parseInt(a.nivel || 1) - parseInt(b.nivel || 1);
            if (sort === "nivel-desc") return parseInt(b.nivel || 1) - parseInt(a.nivel || 1);
            return 0;
        });

        const listEl = document.getElementById("m-list-potions");
        if (!listEl) return;

        if (this.filtered.potions.length === 0) {
            listEl.innerHTML = `<li class="empty-msg">Nenhuma poção encontrada.</li>`;
            return;
        }

        listEl.innerHTML = this.filtered.potions.map(p => `
            <li class="record-list-item" data-id="${escapeHtml(p.id)}">
                <div class="list-item-row" style="width: 100%;">
                    <div class="list-item-main">
                        <strong>${escapeHtml(p.nome)}</strong>
                        <small>${escapeHtml(p.tipo)} • CD ${escapeHtml(p.dificuldade_cd || 14)}</small>
                    </div>
                    <span class="badge-level-small">Nv. ${escapeHtml(p.nivel)}</span>
                </div>
            </li>
        `).join("");
    }

    async openDetailSheet(category, id) {
        const modal = document.getElementById("mobile-sheet-modal");
        const body = document.getElementById("mobile-modal-body");
        const title = document.getElementById("mobile-modal-title");

        if (!modal || !body) return;

        title.textContent = "Carregando do Ministério...";
        body.innerHTML = `
            <div class="loading-parchment" style="padding: 30px 10px;">
                <p>Consultando arquivo no Cloud Firestore...</p>
            </div>
        `;
        modal.classList.add("open");

        const data = await fetchItemById(COLLECTIONS[category.toUpperCase()], id);
        if (!data) {
            body.innerHTML = `<p class="empty-msg">Não foi possível carregar os detalhes do registro.</p>`;
            return;
        }

        if (category === "creatures") this.renderCreatureDetail(data);
        else if (category === "spells") this.renderSpellDetail(data);
        else if (category === "plants") this.renderPlantDetail(data);
        else if (category === "potions") this.renderPotionDetail(data);
    }

    renderCreatureDetail(c) {
        const title = document.getElementById("mobile-modal-title");
        const body = document.getElementById("mobile-modal-body");
        title.textContent = c.nome || "Criatura Mágica";

        const photo = c.fotoBase64 || c.fotoUrl || "";
        const attrs = c.atributos || {};

        body.innerHTML = `
            <div class="creature-sheet-card">
                ${photo ? `<div class="creature-portrait-frame"><img src="${escapeHtml(photo)}" class="creature-sheet-photo" alt="${escapeHtml(c.nome)}"></div>` : ""}
                <div class="sheet-metadata-box">
                    <div class="meta-item"><strong>Classificação:</strong> <span class="badge-danger-small">${escapeHtml(c.classificacao || "XXX")}</span></div>
                    <div class="meta-item"><strong>Licença:</strong> ${escapeHtml(c.licenca || "Comum")}</div>
                    <div class="meta-item"><strong>Tipo:</strong> ${escapeHtml(c.tipo || "Neutro")}</div>
                    <div class="meta-item"><strong>Locomoção:</strong> ${escapeHtml(c.locomocao || "Terrestre")}</div>
                    <div class="meta-item"><strong>Porte / Peso:</strong> ${escapeHtml(c.porte || "Médio")} / ${escapeHtml(c.peso || "Não especificado")}</div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Atributos Físicos</h4>
                    <div class="stats-pills-row">
                        <div class="stat-pill"><span class="stat-pill-label">Corpo</span><strong class="stat-pill-value">${attrs.corpo ?? 0}</strong></div>
                        <div class="stat-pill"><span class="stat-pill-label">Destreza</span><strong class="stat-pill-value">${attrs.destreza ?? 0}</strong></div>
                        <div class="stat-pill"><span class="stat-pill-label">Vitalidade</span><strong class="stat-pill-value">${attrs.vitalidade ?? 0}</strong></div>
                        <div class="stat-pill"><span class="stat-pill-label">Instinto</span><strong class="stat-pill-value">${attrs.instinto ?? 0}</strong></div>
                        <div class="stat-pill"><span class="stat-pill-label">Carisma</span><strong class="stat-pill-value">${attrs.carisma ?? 0}</strong></div>
                        <div class="stat-pill"><span class="stat-pill-label">Inteligência</span><strong class="stat-pill-value">${attrs.inteligencia ?? 0}</strong></div>
                        <div class="stat-pill"><span class="stat-pill-label">Sabedoria</span><strong class="stat-pill-value">${attrs.sabedoria ?? 0}</strong></div>
                    </div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Descrição e Hábitos</h4>
                    <p class="sheet-prose">${escapeHtml(c.descricao || "Sem descrição catalogada.").replace(/\n/g, "<br>")}</p>
                </div>
            </div>
        `;
    }

    renderSpellDetail(s) {
        const title = document.getElementById("mobile-modal-title");
        const body = document.getElementById("mobile-modal-body");
        title.textContent = s.name || "Feitiço";

        body.innerHTML = `
            <div class="creature-sheet-card">
                <div class="sheet-metadata-box">
                    <div class="meta-item"><strong>Nível:</strong> Nível ${escapeHtml(s.lvl || 1)}</div>
                    <div class="meta-item"><strong>Categoria:</strong> ${escapeHtml(s.cat || "Charme")}</div>
                    <div class="meta-item"><strong>Tipo:</strong> ${escapeHtml(s.tipo || "Utilitário")}</div>
                    <div class="meta-item"><strong>Pronúncia:</strong> <em>"${escapeHtml(s.pronuncia || s.pronunciation || "")}"</em></div>
                    ${s.condicao ? `<div class="meta-item"><strong>Condição:</strong> ${escapeHtml(s.condicao)}</div>` : ""}
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Mecânica e Efeito</h4>
                    <p class="sheet-prose">${escapeHtml(s.desc || "").replace(/\n/g, "<br>")}</p>
                </div>
            </div>
        `;
    }

    renderPlantDetail(p) {
        const title = document.getElementById("mobile-modal-title");
        const body = document.getElementById("mobile-modal-body");
        title.textContent = p.nome || "Planta Mágica";

        body.innerHTML = `
            <div class="creature-sheet-card">
                <div class="sheet-metadata-box">
                    <div class="meta-item"><strong>Nível de Herbologia:</strong> Nível ${escapeHtml(p.nivel || 1)}</div>
                    <div class="meta-item"><strong>Dificuldade de Manejo:</strong> CD ${escapeHtml(p.manejo_cd || 12)}</div>
                    <div class="meta-item"><strong>Disponibilidade:</strong> ${escapeHtml(p.categoria || "Popular")}</div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Descrição Botânica</h4>
                    <p class="sheet-prose">${escapeHtml(p.descricao || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Manejo e Peculiaridades</h4>
                    <div class="peculiaridades-box">${escapeHtml(p.peculiaridades || "").replace(/\n/g, "<br>")}</div>
                </div>
            </div>
        `;
    }

    renderPotionDetail(p) {
        const title = document.getElementById("mobile-modal-title");
        const body = document.getElementById("mobile-modal-body");
        title.textContent = p.nome || "Poção Alquímica";

        const sis = p.sistema || {};

        body.innerHTML = `
            <div class="creature-sheet-card">
                <div class="sheet-metadata-box">
                    <div class="meta-item"><strong>Nível Alquímico:</strong> Nível ${escapeHtml(p.nivel || 1)}</div>
                    <div class="meta-item"><strong>Dificuldade de Preparo:</strong> CD ${escapeHtml(sis.dificuldade_cd || p.dificuldade_cd || 14)}</div>
                    <div class="meta-item"><strong>Tempo de Preparo:</strong> ${escapeHtml(sis.tempo_preparo || p.tempo_preparo || "1 hora")}</div>
                    <div class="meta-item"><strong>Administração:</strong> ${escapeHtml(sis.administracao || p.administracao || "Ingestão")}</div>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Efeito Mecânico</h4>
                    <p class="sheet-prose">${escapeHtml(p.efeito || "").replace(/\n/g, "<br>")}</p>
                </div>

                <div class="sheet-section mt-15">
                    <h4 class="section-subtitle">Ingredientes</h4>
                    <div class="peculiaridades-box">${escapeHtml(p.ingredientes || "Ingredientes sob sigilo.").replace(/\n/g, "<br>")}</div>
                </div>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new MobileCatalogApp();
});
