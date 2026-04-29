import { DatabaseService } from '../services/database.js';

// ─── Tabelas derivadas do sistema de regras ────────────────────────────────

const CONJ_ATTR = {
  'Transfiguração':  'Transfiguração (Carisma)',
  'Feitiço':         'Prática (Sabedoria)',
  'Azaração':        'DCAT (Sabedoria)',
  'Maldição Menor':  'DCAT (Sabedoria)',
  'Maldição':        'DCAT (Sabedoria)',
  'Contra-feitiço':  'Prática (Sabedoria)',
  'Cura':            'Cura (Carisma)',
};

const LEVEL_DATA = {
  1: { dice:'d20', actions:'2 ações',              ranges:{disaster:'1',    fail:'2–5',   hit:'6–15',  crit:'16–20'}, fx:{dmg:{hit:'1L / 1C',             crit:'2L / 1C'},            def:{hit:'Bloqueia 1L / 0C',        crit:'Bloqueia 2L / 1C'},            cure:{hit:'1L',  crit:'2L'}}},
  2: { dice:'d20', actions:'2 ações',              ranges:{disaster:'1',    fail:'2–5',   hit:'6–15',  crit:'16–20'}, fx:{dmg:{hit:'1L / 1C',             crit:'2L / 1C'},            def:{hit:'Bloqueia 1L / 0C',        crit:'Bloqueia 2L / 1C'},            cure:{hit:'1L',  crit:'2L'}}},
  3: { dice:'d30', actions:'3 ações',              ranges:{disaster:'1–5',  fail:'6–10',  hit:'11–25', crit:'26–30'}, fx:{dmg:{hit:'2L, 1M / 1C',         crit:'3L, 2M / 1C'},        def:{hit:'Bloqueia 2L, 1M / 1C',    crit:'Bloqueia 3L, 2M / 1C'},        cure:{hit:'3L',  crit:'6L'}}},
  4: { dice:'d30', actions:'3 ações',              ranges:{disaster:'1–5',  fail:'6–10',  hit:'11–25', crit:'26–30'}, fx:{dmg:{hit:'2L, 1M / 1C',         crit:'3L, 2M / 1C'},        def:{hit:'Bloqueia 2L, 1M / 1C',    crit:'Bloqueia 3L, 2M / 1C'},        cure:{hit:'3L',  crit:'6L'}}},
  5: { dice:'d40', actions:'4 ações',              ranges:{disaster:'1–10', fail:'11–20', hit:'21–35', crit:'36–40'}, fx:{dmg:{hit:'3L, 2M, 1P / 1C',     crit:'4L, 3M, 2P / 2C'},    def:{hit:'Bloqueia 3L, 2M, 1P / 1C',crit:'Bloqueia 4L, 3M, 2P / 2C'},    cure:{hit:'9L',  crit:'12L'}}},
  6: { dice:'d40', actions:'Todas as ações (5)',    ranges:{disaster:'1–10', fail:'11–20', hit:'21–35', crit:'36–40'}, fx:{dmg:{hit:'4L, 3M, 2P / 2C',     crit:'5L, 4M, 3P / 3C'},    def:{hit:'Bloqueia 4L, 4M, 2P / 2C',crit:'Bloqueia 5L, 5M, 3P / 3C'},    cure:{hit:'15L', crit:'18L'}}},
  7: { dice:'d50', actions:'Rodada de preparação', ranges:{disaster:'1–20', fail:'21–35', hit:'36–45', crit:'46–50'}, fx:{dmg:{hit:'4L, 3M, 3P / 2C',     crit:'Morte Instantânea / 5L, 5M, 5P / 3C'}, def:{hit:'Bloqueia 2L, 2M, 2P / 2C', crit:'Absoluta / 5L, 5M, 5P / 3C'}, cure:{hit:'24L', crit:'27L — Cura Completa'}}},
};

function inferTipo(cat) {
  if (cat === 'Cura')           return 'Cura';
  if (['Maldição', 'Maldição Menor', 'Azaração'].includes(cat)) return 'Dano';
  if (cat === 'Contra-feitiço') return 'Defesa';
  return null;
}

function buildEffectsRows(tipo, fx) {
  const cfg = {
    'Dano':   { key: 'dmg',  label: '⚔︎ Dano',  color: '#c0392b' },
    'Defesa': { key: 'def',  label: '⛊ Defesa', color: '#2980b9' },
    'Cura':   { key: 'cure', label: '❤︎ Cura',  color: '#27ae60' },
  };
  // Se tipo não existe no cfg, exibe todas as linhas (fallback seguro)
  const show = (tipo && cfg[tipo]) ? [tipo] : ['Dano', 'Defesa', 'Cura'];
  return show.map(t => {
    const { key, label, color } = cfg[t];
    return `<tr>
      <td style="color:${color};font-weight:bold;white-space:nowrap;">${label}</td>
      <td>${fx[key].hit}</td>
      <td>${fx[key].crit}</td>
    </tr>`;
  }).join('');
}

// ─── Controller ────────────────────────────────────────────────────────────

export class SpellController {
  constructor() {
    this.archive = [];
    this.isListMode = false;
    this.selectedSpells = new Set();
    this.init();
  }

  init() {
    const form = document.getElementById('spell-form');
    if (form) form.addEventListener('submit', e => this.saveSpell(e, form));
    this.initBulkImport();

    document.getElementById('btn-create-list')?.addEventListener('click', () => this.toggleListMode(true));
    document.getElementById('btn-cancel-list')?.addEventListener('click', () => this.toggleListMode(false));
    document.getElementById('btn-save-list')?.addEventListener('click',  () => this.exportSpellList());

    document.getElementById('sort-order-spell')?.addEventListener('change', () => this.applyFiltersAndRender());
    document.getElementById('search-spell')?.addEventListener('input',     () => this.applyFiltersAndRender());
    document.querySelectorAll('.filter-panel input[data-filter-spell]')
      .forEach(cb => cb.addEventListener('change', () => this.applyFiltersAndRender()));

    document.addEventListener('tab-opened', e => {
      if (e.detail.tabId === 'tab-archive-spell') this.loadArchive();
    });
  }

  toggleListMode(active) {
    this.isListMode = active;
    this.selectedSpells.clear();
    document.getElementById('btn-create-list').style.display = active ? 'none'         : 'inline-block';
    document.getElementById('btn-save-list').style.display   = active ? 'inline-block' : 'none';
    document.getElementById('btn-cancel-list').style.display = active ? 'inline-block' : 'none';
    this.applyFiltersAndRender();
  }

  // ─── helper: carrega o arquivo atual (mesmo sem abrir a aba IV) ──────────
  async _fetchCurrentArchive() {
    try {
      return await DatabaseService.fetchCollection('./feiticos', 'indice_feiticos.json');
    } catch {
      return []; // arquivo ainda não existe
    }
  }

  // ─── helper: funde existentes + novos e baixa indice consolidado ─────────
  _mergeAndExport(existingSpells, newSpells, label = 'indice_feiticos') {
    const byName = new Map();
    // existentes primeiro (base), novos sobrescrevem se mesmo nome
    [...existingSpells, ...newSpells].forEach(s => byName.set(s.name, s));
    const merged = [...byName.values()];
    DatabaseService.saveRecord(merged, label);
    return merged.length;
  }

  saveSpell(e, form) {
    e.preventDefault();
    const data = {
      name:          document.getElementById('s-name').value,
      cat:           document.getElementById('s-cat').value,
      lvl:           document.getElementById('s-lvl').value,
      tipo:          document.getElementById('s-tipo').value,
      pronunciation: document.getElementById('s-pronunciation')?.value || '',
      desc:          document.getElementById('s-desc').value,
    };
    if (data.tipo === 'N/A') delete data.tipo;
    if (!data.pronunciation) delete data.pronunciation;

    this._fetchCurrentArchive().then(existing => {
      const total = this._mergeAndExport(existing, [data]);
      alert(
        `✓ Feitiço "${data.name}" adicionado!\n` +
        `O arquivo "indice_feiticos.json" contém agora ${total} feitiço(s).\n\n` +
        `Substitua 'feiticos/indice_feiticos.json' pelo arquivo baixado.`
      );
      form.reset();
    });
  }

  // ─── Importação em Massa ──────────────────────────────────────────────────

  initBulkImport() {
    this.bulkSpells = [];
    document.getElementById('btn-parse-bulk')?.addEventListener('click',   () => this.parseBulkJson());
    document.getElementById('btn-execute-bulk')?.addEventListener('click', () => this.executeBulkImport());
    document.getElementById('btn-cancel-bulk')?.addEventListener('click',  () => this.cancelBulkImport());
  }

  parseBulkJson() {
    const input     = document.getElementById('bulk-json-input').value.trim();
    const errorEl   = document.getElementById('bulk-error');
    const previewEl = document.getElementById('bulk-preview');
    errorEl.style.display  = 'none';
    previewEl.style.display = 'none';
    document.getElementById('btn-execute-bulk').style.display = 'none';
    document.getElementById('btn-cancel-bulk').style.display  = 'none';

    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      errorEl.textContent   = `JSON inválido: ${e.message}`;
      errorEl.style.display = 'block';
      return;
    }

    const raw      = Array.isArray(parsed) ? parsed : [parsed];
    const required = ['name', 'cat', 'lvl', 'desc'];
    const errors   = [];
    const valid    = [];

    raw.forEach((s, i) => {
      const missing = required.filter(f => !s[f]);
      if (missing.length) {
        errors.push(`Item ${i + 1} ("${s.name || '?'}"): campos ausentes — ${missing.join(', ')}`);
      } else {
        if (!s.tipo) delete s.tipo;
        if (!s.pronunciation) delete s.pronunciation;
        valid.push(s);
      }
    });

    if (errors.length) {
      errorEl.innerHTML   = errors.join('<br>');
      errorEl.style.display = 'block';
    }
    if (!valid.length) return;

    this.bulkSpells = valid;
    this.renderBulkPreview(valid);
  }

  renderBulkPreview(spells) {
    const tbody = document.getElementById('bulk-table-body');
    tbody.innerHTML = spells.map(s => `
      <tr data-spell-name="${s.name}">
        <td><button type="button" class="btn-remove-bulk btn-danger"
            style="padding:2px 7px;font-size:0.8rem;" data-name="${s.name}">✕</button></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.cat}</td>
        <td>${s.lvl}</td>
        <td>${s.tipo ?? '—'}</td>
        <td style="font-size:0.82rem;opacity:0.8;">${s.pronunciation ?? '—'}</td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-remove-bulk').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('tr').remove();
        document.getElementById('bulk-count').textContent = tbody.querySelectorAll('tr').length;
      });
    });

    document.getElementById('bulk-count').textContent         = spells.length;
    document.getElementById('bulk-preview').style.display     = 'block';
    document.getElementById('btn-execute-bulk').style.display = 'inline-block';
    document.getElementById('btn-cancel-bulk').style.display  = 'inline-block';
  }

  executeBulkImport() {
    const tbody     = document.getElementById('bulk-table-body');
    const remaining = new Set([...tbody.querySelectorAll('tr[data-spell-name]')].map(r => r.dataset.spellName));
    const toImport  = this.bulkSpells.filter(s => remaining.has(s.name));

    if (!toImport.length) return alert('Nenhum feitiço para importar.');

    this._fetchCurrentArchive().then(existing => {
      const total = this._mergeAndExport(existing, toImport);
      alert(
        `✓ ${toImport.length} feitiço(s) importado(s)!\n` +
        `O arquivo "indice_feiticos.json" contém agora ${total} feitiço(s).\n\n` +
        `Substitua 'feiticos/indice_feiticos.json' pelo arquivo baixado.`
      );
      this.cancelBulkImport();
    });
  }

  cancelBulkImport() {
    this.bulkSpells = [];
    document.getElementById('bulk-json-input').value         = '';
    document.getElementById('bulk-preview').style.display    = 'none';
    document.getElementById('bulk-error').style.display      = 'none';
    document.getElementById('btn-execute-bulk').style.display = 'none';
    document.getElementById('btn-cancel-bulk').style.display  = 'none';
  }

  exportSpellList() {
    if (this.selectedSpells.size === 0) return alert('Nenhum feitiço foi selecionado para o manuscrito.');
    const records = this.archive.filter(s => this.selectedSpells.has(s.name));
    DatabaseService.saveRecord(records, 'lista_feiticos_ministerio');
    this.toggleListMode(false);
  }

  async loadArchive() {
    const listEl = document.getElementById('archive-spell-list');
    listEl.innerHTML = '<li style="color:var(--magic-gold);text-align:center;padding:15px;">A consultar os registos de Feitiços...</li>';
    try {
      this.archive = await DatabaseService.fetchCollection('./feiticos', 'indice_feiticos.json');
      this.applyFiltersAndRender();
    } catch {
      listEl.innerHTML = `<li style="color:#ff6b6b;padding:15px;">Erro: Certifique-se de usar o Live Server e que a pasta 'feiticos' existe.</li>`;
    }
  }

  applyFiltersAndRender() {
    const listEl = document.getElementById('archive-spell-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const search = (document.getElementById('search-spell')?.value || '').toLowerCase().trim();

    const activeFilters = { cat: [], lvl: [] };
    document.querySelectorAll('.filter-panel input[data-filter-spell]:checked').forEach(cb => {
      activeFilters[cb.getAttribute('data-filter-spell')].push(cb.value);
    });

    let filtered = this.archive.filter(spell => {
      if (search) {
        const name = (spell.name || '').toLowerCase();
        const desc = (spell.desc || '').toLowerCase();
        if (!name.includes(search) && !desc.includes(search)) return false;
      }
      for (const key in activeFilters) {
        if (activeFilters[key].length > 0 && !activeFilters[key].includes(String(spell[key]))) return false;
      }
      return true;
    });

    const sortOrder = document.getElementById('sort-order-spell')?.value || 'AZ';
    filtered.sort((a, b) => sortOrder === 'AZ' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

    if (filtered.length === 0) {
      listEl.innerHTML = '<li style="color:gray;padding:10px;text-align:center;">Nenhum encantamento encontrado.</li>';
      return;
    }

    filtered.forEach(spell => {
      const li = document.createElement('li');
      li.className = 'creature-item';
      li.style.cursor = 'pointer';
      li.onclick = () => this.renderDetails(spell);

      if (this.isListMode) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'spell-selector';
        cb.value = spell.name;
        cb.checked = this.selectedSpells.has(spell.name);
        cb.style.cssText = 'margin-right:10px;cursor:pointer;';
        cb.addEventListener('change', e => {
          e.target.checked ? this.selectedSpells.add(spell.name) : this.selectedSpells.delete(spell.name);
        });
        li.appendChild(cb);
      }

      const span = document.createElement('span');
      span.className = 'creature-item-title';
      span.textContent = `${spell.name} (Nível ${spell.lvl})`;
      li.appendChild(span);

      if (!this.isListMode) {
        const btn = document.createElement('button');
        btn.className = 'btn-teal';
        btn.style.fontSize = '0.8rem';
        btn.textContent = 'Extrair Cópia';
        btn.onclick = e => { e.stopPropagation(); DatabaseService.saveRecord(spell, `feitico_${spell.name}`); };
        li.appendChild(btn);
      }

      listEl.appendChild(li);
    });
  }

  renderDetails(s) {
    const viewer   = document.getElementById('spell-viewer');
    const lvl      = parseInt(s.lvl) || 1;
    const ld       = LEVEL_DATA[lvl] || LEVEL_DATA[1];
    const conjAttr = CONJ_ATTR[s.cat] || 'Sabedoria';

    let tipoEfeito;
    if (s.tipo && s.tipo !== 'Utilitário' && s.tipo !== 'N/A') {
      tipoEfeito = s.tipo;
    } else if (!s.tipo) {
      tipoEfeito = inferTipo(s.cat);
    } else {
      tipoEfeito = 'skip';
    }

    const efeitosHtml = tipoEfeito !== 'skip' ? `
      <div class="bureaucracy-box" style="padding:10px;margin-bottom:15px;">
        <h3 style="margin-top:0;font-size:1rem;color:var(--magic-gold);">
          Efeitos de Conjuração
          ${!s.tipo ? '<span style="font-size:0.75rem;color:#888;font-weight:normal;"> — tipo não definido, exibindo todos</span>' : ''}
        </h3>
        <table class="spell-effects-table">
          <thead><tr><th>Tipo</th><th>✓ Acerto</th><th>★ Crítico</th></tr></thead>
          <tbody>${buildEffectsRows(tipoEfeito, ld.fx)}</tbody>
        </table>
      </div>` : '';

    viewer.innerHTML = `
      <div>
        <h2 style="margin:0 0 12px 0;color:var(--magic-gold);">${s.name}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          <span class="attr-badge">${s.cat}</span>
          <span class="attr-badge" style="border-color:var(--magic-gold);">Nível ${s.lvl}</span>
          <span class="attr-badge">⚅ ${ld.dice}</span>
          <span class="attr-badge">ϟ ${ld.actions}</span>
          <span class="attr-badge">★ ${conjAttr}</span>
          ${s.tipo ? `<span class="attr-badge" style="border-color:#555;color:#aaa;">${s.tipo}</span>` : ''}
          ${s.pronunciation ? `<span class="attr-badge" style="border-color:#555;font-style:italic;">${s.pronunciation}</span>` : ''}
        </div>
        <div class="bureaucracy-box" style="padding:10px;margin-bottom:15px;">
          <h3 style="margin-top:0;font-size:1rem;color:var(--magic-gold);">Tabela de Teste — ${ld.dice}</h3>
          <div class="dice-result-grid">
            <div class="dice-result-box disaster">☠︎︎ Desastre<br><strong>${ld.ranges.disaster}</strong></div>
            <div class="dice-result-box fail">✗ Falha<br><strong>${ld.ranges.fail}</strong></div>
            <div class="dice-result-box hit">✓ Acerto<br><strong>${ld.ranges.hit}</strong></div>
            <div class="dice-result-box crit">★ Crítico<br><strong>${ld.ranges.crit}</strong></div>
          </div>
        </div>
        ${efeitosHtml}
        <div class="bureaucracy-box" style="padding:15px;">
          <h3 style="margin-top:0;font-size:1rem;color:var(--magic-gold);">Descrição e Efeitos</h3>
          <p style="line-height:1.5;white-space:pre-wrap;font-size:0.95rem;margin:0;">${s.desc}</p>
        </div>
      </div>
    `;
  }
}