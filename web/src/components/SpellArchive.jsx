import React, { useState, useMemo } from 'react';
import { exportJson } from '@shared/utils/helpers.js';

const CONJ_ATTR = {
  'Feitiço': 'Prática (Sabedoria)',
  'Charme': 'Prática (Sabedoria)',
  'Transfiguração': 'Transfiguração (Carisma)',
  'Azaração': 'DCAT (Sabedoria)',
  'Maldição Menor': 'Dificuldade/Lógica (Inteligência)',
  'Maldição': 'Dificuldade/Lógica (Inteligência)',
  'Cura': 'Cura (Carisma)',
  'Contra-feitiço': 'Prática (Sabedoria)',
  'Contrafeitiço': 'Prática (Sabedoria)'
};

export default function SpellArchive({
  items,
  selectedId,
  selectedDetail,
  loadingDetail,
  onSelectItem,
  onOpenBulkImport,
  onEditItem,
  onDeleteItem
}) {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('alfabetica');
  const [filterLvl, setFilterLvl] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCond, setFilterCond] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const resetFilters = () => {
    setSearch('');
    setSortMode('alfabetica');
    setFilterLvl('');
    setFilterCat('');
    setFilterTipo('');
    setFilterCond('');
  };

  const toggleSelectId = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const normalizeCategoryMatch = (itemCat, filterC) => {
    if (!filterC) return true;
    const a = String(itemCat || '').toLowerCase().replace(/[\s\-]/g, '');
    const b = String(filterC || '').toLowerCase().replace(/[\s\-]/g, '');
    if ((b === 'charme' || b === 'feitico') && (a === 'charme' || a === 'feitico')) return true;
    return a === b;
  };

  const normalizeTypeMatch = (itemTipo, filterT) => {
    if (!filterT) return true;
    const a = String(itemTipo || '').toLowerCase();
    const b = String(filterT || '').toLowerCase();
    if ((b === 'ataque' || b === 'dano') && (a === 'ataque' || a === 'dano')) return true;
    if ((b === 'defesa' || b === 'proteção' || b === 'protecao') && (a === 'defesa' || a === 'proteção' || a === 'protecao')) return true;
    return a === b;
  };

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase().trim();
    const result = items.filter(spell => {
      const matchName = !s ||
        (spell.name || '').toLowerCase().includes(s) ||
        (spell.pronuncia || '').toLowerCase().includes(s) ||
        (spell.condicao || '').toLowerCase().includes(s);
      const matchLvl = !filterLvl || String(spell.lvl) === String(filterLvl);
      const matchCat = normalizeCategoryMatch(spell.cat, filterCat);
      const matchTipo = normalizeTypeMatch(spell.tipo, filterTipo);

      let matchCond = true;
      const hasCond = spell.condicao && spell.condicao !== 'Nenhuma';
      if (filterCond === 'com_condicao') matchCond = hasCond;
      if (filterCond === 'sem_condicao') matchCond = !hasCond;

      return matchName && matchLvl && matchCat && matchTipo && matchCond;
    });

    result.sort((a, b) => {
      if (sortMode === 'alfabetica') return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      if (sortMode === 'nivel-asc') return parseInt(a.lvl || 1, 10) - parseInt(b.lvl || 1, 10);
      if (sortMode === 'nivel-desc') return parseInt(b.lvl || 1, 10) - parseInt(a.lvl || 1, 10);
      return 0;
    });

    return result;
  }, [items, search, sortMode, filterLvl, filterCat, filterTipo, filterCond]);

  const handleExportSelected = () => {
    const toExport = items.filter(it => selectedIds.has(it.id));
    if (toExport.length === 0) {
      alert('Selecione pelo menos um feitiço para exportar.');
      return;
    }
    exportJson(toExport, `feiticos_export_${toExport.length}.json`);
  };

  const sp = selectedDetail;

  return (
    <div className="archive-layout">
      {/* SIDEBAR DE FILTROS E LISTA */}
      <aside className="archive-sidebar bureaucracy-box">
        <div className="sidebar-header-row">
          <h3 className="section-title" style={{ marginBottom: '4px' }}>Grimório Ministerial (C.E.F.)</h3>
          <small className="filter-count-label">
            Exibindo {filteredItems.length} de {items.length} encantamentos
          </small>
        </div>

        <input
          type="text"
          className="ink-input mb-10"
          placeholder="Buscar feitiço, pronúncia, efeito..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <label className="filter-label">
          Ordenar por:
          <select
            className="ink-select mb-10"
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
          >
            <option value="alfabetica">Ordem Alfabética (A-Z)</option>
            <option value="nivel-asc">Nível Mágico (1 ao 7)</option>
            <option value="nivel-desc">Nível Mágico (7 ao 1)</option>
          </select>
        </label>

        <div className="filter-two-cols">
          <label className="filter-label">
            Nível Mágico:
            <select
              className="ink-select mb-10"
              value={filterLvl}
              onChange={e => setFilterLvl(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
              <option value="4">Nível 4</option>
              <option value="5">Nível 5</option>
              <option value="6">Nível 6</option>
              <option value="7">Nível 7</option>
            </select>
          </label>

          <label className="filter-label">
            Categoria Mágica:
            <select
              className="ink-select mb-10"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Charme">Charme / Feitiço</option>
              <option value="Transfiguração">Transfiguração</option>
              <option value="Azaração">Azaração</option>
              <option value="Maldição">Maldição</option>
              <option value="Cura">Cura</option>
              <option value="Contra-feitiço">Contra-feitiço</option>
            </select>
          </label>
        </div>

        <div className="filter-two-cols">
          <label className="filter-label">
            Tipo de Ação:
            <select
              className="ink-select mb-10"
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Utilitário">Utilitário</option>
              <option value="Ataque">Ataque</option>
              <option value="Defesa">Defesa</option>
            </select>
          </label>

          <label className="filter-label">
            Condição:
            <select
              className="ink-select mb-10"
              value={filterCond}
              onChange={e => setFilterCond(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="com_condicao">Com Condição</option>
              <option value="sem_condicao">Sem Condição</option>
            </select>
          </label>
        </div>

        <div className="btn-group-row mb-10">
          <button type="button" className="btn-secondary flex-1" onClick={resetFilters}>
            Redefinir Filtros
          </button>
          <button type="button" className="btn-primary flex-1" onClick={onOpenBulkImport}>
            Importar JSON
          </button>
        </div>

        <button
          type="button"
          className="btn-accent w-100 mb-10"
          onClick={handleExportSelected}
        >
          {selectedIds.size > 0
            ? `Exportar (${selectedIds.size}) Selecionados (.json)`
            : 'Exportar Selecionados (.json)'}
        </button>

        {/* LISTA DE FEITIÇOS */}
        <ul className="record-list" style={{ maxHeight: 'calc(100vh - 460px)', overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <li className="empty-msg">Nenhum encantamento encontrado com os filtros atuais.</li>
          ) : (
            filteredItems.map(item => {
              const isSelected = item.id === selectedId;
              const isChecked = selectedIds.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`record-list-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectItem(item.id)}
                >
                  <input
                    type="checkbox"
                    className="record-check mr-5"
                    checked={isChecked}
                    onChange={e => toggleSelectId(e, item.id)}
                    title="Selecionar para exportação"
                  />
                  <div className="record-list-info">
                    <strong>{item.name}</strong>
                    <small>
                      {item.cat || 'Charme'} • {item.tipo || 'Utilitário'}
                    </small>
                  </div>
                  <span className="badge-danger">Nv. {item.lvl || 1}</span>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* PAINEL DE VISUALIZAÇÃO DETALHADA */}
      <section className="archive-viewer bureaucracy-box">
        {loadingDetail ? (
          <div className="empty-msg">Consultando encantamento no Cloud Firestore...</div>
        ) : !sp ? (
          <div className="empty-msg">Selecione um feitiço na lista lateral para consultar suas especificações mágicas.</div>
        ) : (
          <div className="creature-sheet-card">
            <span className="sub-header-stamp">C.E.F. — COMISSÃO DE ENCANTAMENTOS E FEITIÇOS</span>
            <h3 className="creature-sheet-title">{sp.name}</h3>

            <div className="sheet-metadata-box">
              <div className="meta-item"><strong>Nível Mágico:</strong> Nível {sp.lvl || 1}</div>
              <div className="meta-item"><strong>Categoria:</strong> {sp.cat || 'Charme'}</div>
              <div className="meta-item">
                <strong>Perícia de Conjuração:</strong> {CONJ_ATTR[sp.cat] || 'Prática (Sabedoria)'}
              </div>
              <div className="meta-item"><strong>Tipo:</strong> {sp.tipo || 'Utilitário'}</div>
              <div className="meta-item"><strong>Condição Aplicada:</strong> {sp.condicao || 'Nenhuma'}</div>
              <div className="meta-item">
                <strong>Pronúncia Fonética:</strong> <em>"{sp.pronuncia || sp.pronunciation || 'Não informada'}"</em>
              </div>
            </div>

            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Efeito, Execução e Regras do Feitiço</h4>
              <p className="sheet-prose" style={{ whiteSpace: 'pre-wrap' }}>
                {sp.desc || 'Sem descrição cadastrada nos compêndios.'}
              </p>
            </div>

            <div className="viewer-actions-row mt-20">
              <button
                type="button"
                className="btn-primary"
                onClick={() => exportJson(sp, `feitico_${sp.id || 'magia'}.json`)}
              >
                Exportar Feitiço (.json)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onEditItem(sp)}
              >
                Editar Registro
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDeleteItem(sp.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
