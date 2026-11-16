import React, { useState, useMemo } from 'react';
import { exportJson } from '@shared/utils/helpers.js';

export default function CreatureArchive({
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
  const [filterClass, setFilterClass] = useState('');
  const [filterLicenca, setFilterLicenca] = useState('');
  const [filterLocomocao, setFilterLocomocao] = useState('');
  const [filterPorte, setFilterPorte] = useState('');
  const [filterInteracao, setFilterInteracao] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const resetFilters = () => {
    setSearch('');
    setSortMode('alfabetica');
    setFilterClass('');
    setFilterLicenca('');
    setFilterLocomocao('');
    setFilterPorte('');
    setFilterInteracao('');
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
    const result = items.filter(c => {
      const matchName = !s || (c.nome || '').toLowerCase().includes(s);
      const matchClass = !filterClass || c.classificacao === filterClass;
      const matchLicenca = !filterLicenca || c.licenca === filterLicenca;
      const matchLocomocao = !filterLocomocao || c.locomocao === filterLocomocao;
      const matchPorte = !filterPorte || c.porte === filterPorte;
      const matchInteracao = !filterInteracao || c.interacao === filterInteracao;
      const matchTipo = !filterTipo || c.tipo === filterTipo;
      return matchName && matchClass && matchLicenca && matchLocomocao && matchPorte && matchInteracao && matchTipo;
    });

    result.sort((a, b) => {
      if (sortMode === 'alfabetica') return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      if (sortMode === 'perigo-asc') return (a.classificacao || '').length - (b.classificacao || '').length;
      if (sortMode === 'perigo-desc') return (b.classificacao || '').length - (a.classificacao || '').length;
      return 0;
    });

    return result;
  }, [items, search, sortMode, filterClass, filterLicenca, filterLocomocao, filterPorte, filterInteracao, filterTipo]);

  const handleExportSelected = () => {
    const toExport = items.filter(it => selectedIds.has(it.id));
    if (toExport.length === 0) {
      alert('Selecione pelo menos uma criatura para exportar.');
      return;
    }
    exportJson(toExport, `criaturas_export_${toExport.length}.json`);
  };

  const handleExportSingle = (item) => {
    if (!item) return;
    exportJson(item, `ficha_${item.id || 'criatura'}.json`);
  };

  const c = selectedDetail;

  return (
    <div className="archive-layout">
      {/* SIDEBAR DE FILTROS E LISTA */}
      <aside className="archive-sidebar bureaucracy-box">
        <div className="sidebar-header-row">
          <h3 className="section-title" style={{ marginBottom: '4px' }}>Filtros (D.R.C.C.M.)</h3>
          <small className="filter-count-label">
            Exibindo {filteredItems.length} de {items.length} espécies
          </small>
        </div>

        <input
          type="text"
          className="ink-input mb-10"
          placeholder="Buscar espécie mágica..."
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
            <option value="perigo-asc">Periculosidade (X a XXXXX)</option>
            <option value="perigo-desc">Periculosidade (XXXXX a X)</option>
          </select>
        </label>

        <div className="filter-two-cols">
          <label className="filter-label">
            Classificação M.M.:
            <select
              className="ink-select mb-10"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="X">X</option>
              <option value="XX">XX</option>
              <option value="XXX">XXX</option>
              <option value="XXXX">XXXX</option>
              <option value="XXXXX">XXXXX</option>
              <option value="XX-XXXX">XX-XXXX</option>
            </select>
          </label>

          <label className="filter-label">
            Licença:
            <select
              className="ink-select mb-10"
              value={filterLicenca}
              onChange={e => setFilterLicenca(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Comum">Comum</option>
              <option value="Magizoologista">Magizoologista</option>
              <option value="Não permitido">Não permitido</option>
            </select>
          </label>
        </div>

        <div className="filter-two-cols">
          <label className="filter-label">
            Locomoção:
            <select
              className="ink-select mb-10"
              value={filterLocomocao}
              onChange={e => setFilterLocomocao(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Terrestres">Terrestres</option>
              <option value="Aéreos">Aéreos</option>
              <option value="Aquáticos">Aquáticos</option>
              <option value="Aquaéros">Aquaéros</option>
            </select>
          </label>

          <label className="filter-label">
            Porte:
            <select
              className="ink-select mb-10"
              value={filterPorte}
              onChange={e => setFilterPorte(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Pequeno">Pequeno</option>
              <option value="Médio">Médio</option>
              <option value="Grande">Grande</option>
              <option value="Enorme">Enorme</option>
            </select>
          </label>
        </div>

        <div className="filter-two-cols">
          <label className="filter-label">
            Interação:
            <select
              className="ink-select mb-10"
              value={filterInteracao}
              onChange={e => setFilterInteracao(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Pacífico">Pacífico</option>
              <option value="Agressivo">Agressivo</option>
            </select>
          </label>

          <label className="filter-label">
            Tipo:
            <select
              className="ink-select mb-10"
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Simples">Simples</option>
              <option value="Neutro">Neutro</option>
              <option value="Consciente">Consciente</option>
              <option value="Bestial">Bestial</option>
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
            ? `Exportar (${selectedIds.size}) Selecionadas (.json)`
            : 'Exportar Selecionadas (.json)'}
        </button>

        {/* LISTA DE ANIMAIS */}
        <ul className="record-list" style={{ maxHeight: 'calc(100vh - 460px)', overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <li className="empty-msg">Nenhuma criatura encontrada com os filtros atuais.</li>
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
                      {item.tipo || 'Neutro'} | {item.locomocao || 'Terrestres'} | {item.porte || 'Médio'}
                    </small>
                  </div>
                  <span className="badge-danger">{item.classificacao}</span>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* PAINEL DE VISUALIZAÇÃO DETALHADA */}
      <section className="archive-viewer bureaucracy-box">
        {loadingDetail ? (
          <div className="empty-msg">Consultando ficha individual no Cloud Firestore...</div>
        ) : !c ? (
          <div className="empty-msg">Selecione uma criatura na lista lateral para ver sua ficha completa.</div>
        ) : (
          <div className="creature-sheet-card">
            <div className="sheet-header-grid">
              {c.fotoBase64 || c.fotoUrl ? (
                <div className="sheet-portrait-box">
                  <img src={c.fotoBase64 || c.fotoUrl} alt={c.nome} className="sheet-portrait-img" />
                  <span className="portrait-caption">Registro Fotográfico D.R.C.C.M.</span>
                </div>
              ) : null}

              <div className="sheet-main-info">
                <span className="sub-header-stamp">D.R.C.C.M. — REGISTRO ZOILÓGICO</span>
                <h3 className="creature-sheet-title">{c.nome}</h3>

                <div className="sheet-metadata-box">
                  <div className="meta-item"><strong>Classificação M.M.:</strong> {c.classificacao}</div>
                  <div className="meta-item"><strong>Licença Exigida:</strong> {c.licenca}</div>
                  <div className="meta-item"><strong>Porte / Tamanho:</strong> {c.porte} ({c.tamanho || 'Não informado'})</div>
                  <div className="meta-item"><strong>Peso Médio:</strong> {c.peso || 'Não informado'}</div>
                  <div className="meta-item"><strong>Origem:</strong> {c.origem || 'Natural'}</div>
                  <div className="meta-item"><strong>Locomoção:</strong> {c.locomocao} ({c.velocidade || '3.0m por ação'})</div>
                  <div className="meta-item"><strong>Temperamento:</strong> {c.interacao}</div>
                  <div className="meta-item"><strong>Tipo de Criatura:</strong> {c.tipo}</div>
                </div>
              </div>
            </div>

            {/* ATRIBUTOS */}
            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Atributos Físicos e Naturais</h4>
              <div className="stats-badges-row">
                <div className="stat-badge"><strong>COR:</strong> {c.atributos?.corpo ?? 0}</div>
                <div className="stat-badge"><strong>DES:</strong> {c.atributos?.destreza ?? 0}</div>
                <div className="stat-badge"><strong>VIT:</strong> {c.atributos?.vitalidade ?? 0}</div>
                <div className="stat-badge"><strong>INS:</strong> {c.atributos?.instinto ?? 0}</div>
                <div className="stat-badge"><strong>CAR:</strong> {c.atributos?.carisma ?? 0}</div>
                <div className="stat-badge"><strong>INT:</strong> {c.atributos?.inteligencia ?? 0}</div>
                <div className="stat-badge"><strong>SAB:</strong> {c.atributos?.sabedoria ?? 0}</div>
              </div>
            </div>

            {/* HABILIDADES */}
            {c.habilidades ? (
              <div className="sheet-section mt-15">
                <h4 className="section-subtitle">Habilidades Especiais & Combate</h4>
                <div className="abilities-grid">
                  {c.habilidades.dano?.nome && (
                    <div className="ability-card">
                      <strong>Dano: {c.habilidades.dano.nome}</strong>
                      <small className="ability-roll">Rolagem: {c.habilidades.dano.rolagem || 'N/A'}</small>
                      <p>{c.habilidades.dano.desc}</p>
                    </div>
                  )}
                  {c.habilidades.reacao?.nome && (
                    <div className="ability-card">
                      <strong>Reação: {c.habilidades.reacao.nome}</strong>
                      <small className="ability-roll">Rolagem: {c.habilidades.reacao.rolagem || 'N/A'}</small>
                      <p>{c.habilidades.reacao.desc}</p>
                    </div>
                  )}
                  {c.habilidades.ambiente?.nome && (
                    <div className="ability-card">
                      <strong>Ambiente: {c.habilidades.ambiente.nome}</strong>
                      <small className="ability-roll">Rolagem: {c.habilidades.ambiente.rolagem || 'N/A'}</small>
                      <p>{c.habilidades.ambiente.desc}</p>
                    </div>
                  )}
                  {c.habilidades.extra?.nome && (
                    <div className="ability-card">
                      <strong>Extra: {c.habilidades.extra.nome}</strong>
                      <small className="ability-roll">Rolagem: {c.habilidades.extra.rolagem || 'N/A'}</small>
                      <p>{c.habilidades.extra.desc}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* PRONTUÁRIO MÉDICO-VETERINÁRIO */}
            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Prontuário Médico-Veterinário (Limites de Injúria)</h4>
              <div className="injuries-display-box">
                <span>Leve: [ {c.injuries?.leve?.curr ?? 0} / {c.injuries?.leve?.max ?? 3} ]</span>
                <span className="ml-15">Média: [ {c.injuries?.media?.curr ?? 0} / {c.injuries?.media?.max ?? 2} ]</span>
                <span className="ml-15">Pesada: [ {c.injuries?.pesada?.curr ?? 0} / {c.injuries?.pesada?.max ?? 1} ]</span>
              </div>
            </div>

            {/* DESCRIÇÃO FÍSICA E HABITAT */}
            <div className="sheet-section mt-15">
              <h4 className="section-subtitle">Descrição Física, Habitat e Temperamento</h4>
              <p className="sheet-prose" style={{ whiteSpace: 'pre-wrap' }}>
                {c.descricao || 'Sem descrição cadastrada nos autos.'}
              </p>
            </div>

            {/* AÇÕES */}
            <div className="viewer-actions-row mt-20">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleExportSingle(c)}
              >
                Exportar para Ficha de Jogador (.json)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onEditItem(c)}
              >
                Editar Registro
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDeleteItem(c.id)}
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
