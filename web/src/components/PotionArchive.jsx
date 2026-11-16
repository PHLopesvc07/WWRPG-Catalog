import React, { useState, useMemo } from 'react';
import { exportJson } from '@shared/utils/helpers.js';

export default function PotionArchive({
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
  const [filterLvl, setFilterLvl] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const resetFilters = () => {
    setSearch('');
    setSortMode('alfabetica');
    setFilterLvl('');
    setFilterTipo('');
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
    const result = items.filter(potion => {
      const matchName = !s ||
        (potion.nome || '').toLowerCase().includes(s) ||
        (potion.efeito || '').toLowerCase().includes(s) ||
        (potion.ingredientes || '').toLowerCase().includes(s);
      const matchLvl = !filterLvl || String(potion.nivel) === String(filterLvl);
      const matchTipo = !filterTipo || String(potion.tipo || '').toLowerCase().includes(filterTipo.toLowerCase());
      return matchName && matchLvl && matchTipo;
    });

    result.sort((a, b) => {
      if (sortMode === 'alfabetica') return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      if (sortMode === 'nivel-asc') return parseInt(a.nivel || 1, 10) - parseInt(b.nivel || 1, 10);
      if (sortMode === 'nivel-desc') return parseInt(b.nivel || 1, 10) - parseInt(a.nivel || 1, 10);
      return 0;
    });

    return result;
  }, [items, search, sortMode, filterLvl, filterTipo]);

  const handleExportSelected = () => {
    const toExport = items.filter(it => selectedIds.has(it.id));
    if (toExport.length === 0) {
      alert('Selecione pelo menos uma poção para exportar.');
      return;
    }
    exportJson(toExport, `pocoes_export_${toExport.length}.json`);
  };

  const po = selectedDetail;
  const sis = po?.sistema || {};

  return (
    <div className="archive-layout">
      {/* SIDEBAR DE FILTROS E LISTA */}
      <aside className="archive-sidebar bureaucracy-box">
        <div className="sidebar-header-row">
          <h3 className="section-title" style={{ marginBottom: '4px' }}>Catálogo Alquímico</h3>
          <small className="filter-count-label">
            Exibindo {filteredItems.length} de {items.length} fórmulas
          </small>
        </div>

        <input
          type="text"
          className="ink-input mb-10"
          placeholder="Buscar poção, efeito, ingrediente..."
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
            <option value="nivel-asc">Nível Alquímico (1 ao 7)</option>
            <option value="nivel-desc">Nível Alquímico (7 ao 1)</option>
          </select>
        </label>

        <div className="filter-two-cols">
          <label className="filter-label">
            Nível da Fórmula:
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
            Tipo de Composto:
            <select
              className="ink-select mb-10"
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Poção">Poção</option>
              <option value="Veneno">Veneno</option>
              <option value="Antídoto">Antídoto</option>
              <option value="Elixir">Elixir</option>
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

        {/* LISTA DE POÇÕES */}
        <ul className="record-list" style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <li className="empty-msg">Nenhuma fórmula encontrada com os filtros atuais.</li>
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
                      {item.tipo || 'Poção'} • CD {item.dificuldade_cd || 14} • {item.administracao || 'Ingestão'}
                    </small>
                  </div>
                  <span className="badge-danger">Nv. {item.nivel || 1}</span>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* PAINEL DE VISUALIZAÇÃO DETALHADA */}
      <section className="archive-viewer bureaucracy-box">
        {loadingDetail ? (
          <div className="empty-msg">Consultando fórmula alquímica no Cloud Firestore...</div>
        ) : !po ? (
          <div className="empty-msg">Selecione uma poção na lista lateral para consultar seu procedimento de caldeirão.</div>
        ) : (
          <div className="creature-sheet-card">
            <span className="sub-header-stamp">ALQUIMIA • LABORATÓRIO MINISTERIAL</span>
            <h3 className="creature-sheet-title">{po.nome}</h3>

            <div className="sheet-metadata-box">
              <div className="meta-item"><strong>Nível Alquímico:</strong> Nível {po.nivel || 1}</div>
              <div className="meta-item"><strong>Classificação:</strong> {po.tipo || 'Poção'}</div>
              <div className="meta-item">
                <strong>Dificuldade de Preparo (W&W):</strong> CD {sis.dificuldade_cd || po.dificuldade_cd || 14} (Poções / Inteligência)
              </div>
              <div className="meta-item">
                <strong>Tempo de Preparo:</strong> {sis.tempo_preparo || po.tempo_preparo || '1 hora'}
              </div>
              <div className="meta-item">
                <strong>Duração do Efeito:</strong> {sis.duracao || po.duracao || 'Instantâneo'}
              </div>
              <div className="meta-item">
                <strong>Via de Administração:</strong> {sis.administracao || po.administracao || 'Ingestão'}
              </div>
            </div>

            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Efeito Mecânico & Propriedades</h4>
              <p className="sheet-prose" style={{ whiteSpace: 'pre-wrap' }}>
                {po.efeito || 'Sem efeitos mecânicos cadastrados.'}
              </p>
            </div>

            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Ingredientes Exigidos no Caldeirão</h4>
              <div className="peculiaridades-box" style={{ whiteSpace: 'pre-wrap' }}>
                {po.ingredientes || 'Ingredientes mantidos sob sigilo ministerial.'}
              </div>
            </div>

            <div className="viewer-actions-row mt-20">
              <button
                type="button"
                className="btn-primary"
                onClick={() => exportJson(po, `pocao_${po.id || 'alquimia'}.json`)}
              >
                Exportar Poção (.json)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onEditItem(po)}
              >
                Editar Registro
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDeleteItem(po.id)}
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
