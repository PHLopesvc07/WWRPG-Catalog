import React, { useState, useMemo } from 'react';
import { exportJson } from '@shared/utils/helpers.js';

export default function PlantArchive({
  items,
  selectedId,
  selectedDetail,
  loadingDetail,
  onSelectItem,
  onEditItem,
  onDeleteItem
}) {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('alfabetica');
  const [filterCat, setFilterCat] = useState('');
  const [filterLvl, setFilterLvl] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const resetFilters = () => {
    setSearch('');
    setSortMode('alfabetica');
    setFilterCat('');
    setFilterLvl('');
  };

  const toggleSelectId = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase().trim();
    const result = items.filter(plant => {
      const matchName = !s || (plant.nome || '').toLowerCase().includes(s);
      const matchCat = !filterCat || plant.categoria === filterCat;
      const matchLvl = !filterLvl || String(plant.nivel) === String(filterLvl);
      return matchName && matchCat && matchLvl;
    });

    result.sort((a, b) => {
      if (sortMode === 'alfabetica') return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      if (sortMode === 'nivel-asc') return parseInt(a.nivel || 1, 10) - parseInt(b.nivel || 1, 10);
      if (sortMode === 'nivel-desc') return parseInt(b.nivel || 1, 10) - parseInt(a.nivel || 1, 10);
      return 0;
    });

    return result;
  }, [items, search, sortMode, filterCat, filterLvl]);

  const handleExportSelected = () => {
    const toExport = items.filter(it => selectedIds.has(it.id));
    if (toExport.length === 0) {
      alert('Selecione pelo menos uma planta para exportar.');
      return;
    }
    exportJson(toExport, `plantas_export_${toExport.length}.json`);
  };

  const pl = selectedDetail;

  return (
    <div className="archive-layout">
      {/* SIDEBAR DE FILTROS E LISTA */}
      <aside className="archive-sidebar bureaucracy-box">
        <div className="sidebar-header-row">
          <h3 className="section-title" style={{ marginBottom: '4px' }}>Compêndio de Herbologia</h3>
          <small className="filter-count-label">
            Exibindo {filteredItems.length} de {items.length} espécimes
          </small>
        </div>

        <input
          type="text"
          className="ink-input mb-10"
          placeholder="Buscar espécime botânico..."
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
            <option value="nivel-asc">Nível de Herbologia (1 ao 7)</option>
            <option value="nivel-desc">Nível de Herbologia (7 ao 1)</option>
          </select>
        </label>

        <div className="filter-two-cols">
          <label className="filter-label">
            Disponibilidade:
            <select
              className="ink-select mb-10"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Popular">Popular</option>
              <option value="Difícil de Adquirir">Difícil de Adquirir</option>
            </select>
          </label>

          <label className="filter-label">
            Nível Exigido:
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
        </div>

        <div className="btn-group-row mb-10">
          <button type="button" className="btn-secondary flex-1" onClick={resetFilters}>
            Redefinir Filtros
          </button>
        </div>

        <button
          type="button"
          className="btn-accent w-100 mb-10"
          onClick={handleExportSelected}
        >
          {selectedIds.size > 0
            ? `Exportar (${selectedIds.size}) Selecionadas (.json)`
            : 'Exportar Selecionadas (.json)'}
        </button>

        {/* LISTA DE PLANTAS */}
        <ul className="record-list" style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <li className="empty-msg">Nenhum espécime encontrado com os filtros atuais.</li>
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
                    <strong>{item.nome}</strong>
                    <small>
                      Nv. {item.nivel || 1} • CD {item.manejo_cd || 12} • {item.categoria || 'Popular'}
                    </small>
                  </div>
                  <span className="badge-danger">{item.categoria === 'Popular' ? 'Comum' : 'Rara'}</span>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* PAINEL DE VISUALIZAÇÃO DETALHADA */}
      <section className="archive-viewer bureaucracy-box">
        {loadingDetail ? (
          <div className="empty-msg">Consultando espécime botânico no Cloud Firestore...</div>
        ) : !pl ? (
          <div className="empty-msg">Selecione uma planta na lista lateral para carregar sua ficha botânica.</div>
        ) : (
          <div className="creature-sheet-card">
            <span className="sub-header-stamp">HERBOLOGIA • DEPARTAMENTO BOTÂNICO</span>
            <h3 className="creature-sheet-title">{pl.nome}</h3>

            <div className="sheet-metadata-box">
              <div className="meta-item"><strong>Nível de Herbologia:</strong> Nível {pl.nivel || 1}</div>
              <div className="meta-item"><strong>CD de Manejo (Herbalismo):</strong> CD {pl.manejo_cd || 12}</div>
              <div className="meta-item"><strong>Disponibilidade:</strong> {pl.categoria || 'Popular'}</div>
            </div>

            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Descrição Botânica & Características</h4>
              <p className="sheet-prose" style={{ whiteSpace: 'pre-wrap' }}>
                {pl.descricao || 'Sem descrição cadastrada nos autos.'}
              </p>
            </div>

            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Manejo, Colheita e Peculiaridades</h4>
              <div className="peculiaridades-box" style={{ whiteSpace: 'pre-wrap' }}>
                {pl.peculiaridades || 'Sem instruções de manejo registradas.'}
              </div>
            </div>

            <div className="viewer-actions-row mt-20">
              <button
                type="button"
                className="btn-primary"
                onClick={() => exportJson(pl, `planta_${pl.id || 'herbal'}.json`)}
              >
                Exportar Planta (.json)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onEditItem(pl)}
              >
                Editar Registro
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDeleteItem(pl.id)}
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
