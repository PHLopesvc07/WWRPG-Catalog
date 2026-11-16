import React, { useState } from 'react';

export default function SpellForm({ editingItem, onSave, onCancel }) {
  const [name, setName] = useState(editingItem?.name || '');
  const [pronuncia, setPronuncia] = useState(editingItem?.pronuncia || editingItem?.pronunciation || '');
  const [cat, setCat] = useState(editingItem?.cat || 'Charme');
  const [lvl, setLvl] = useState(editingItem?.lvl || '1');
  const [tipo, setTipo] = useState(editingItem?.tipo || 'Utilitário');
  const [condicao, setCondicao] = useState(editingItem?.condicao || 'Nenhuma');
  const [desc, setDesc] = useState(editingItem?.desc || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do feitiço.');
      return;
    }

    const payload = {
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      name: name.trim(),
      pronuncia: pronuncia.trim(),
      pronunciation: pronuncia.trim(),
      cat,
      lvl: String(lvl),
      tipo,
      condicao: condicao.trim(),
      desc: desc.trim()
    };

    onSave(payload);
  };

  return (
    <div className="registration-container bureaucracy-box">
      <div className="section-header-row mb-15">
        <h2 className="section-title">
          {editingItem ? `Editar Feitiço: ${editingItem.name}` : 'Formulário de Registro no Grimório (C.E.F.)'}
        </h2>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Voltar ao Arquivo
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="flex-2">
            Nome do Encantamento:
            <input
              type="text"
              className="ink-input"
              required
              placeholder="Ex: Alohomora"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label className="flex-2">
            Pronúncia Fonética:
            <input
              type="text"
              className="ink-input"
              placeholder="Ex: ah-LOH-ho-MOH-rah"
              value={pronuncia}
              onChange={e => setPronuncia(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="flex-1">
            Nível Mágico:
            <select className="ink-select" value={lvl} onChange={e => setLvl(e.target.value)}>
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
              <option value="4">Nível 4</option>
              <option value="5">Nível 5</option>
              <option value="6">Nível 6</option>
              <option value="7">Nível 7</option>
            </select>
          </label>

          <label className="flex-1">
            Categoria Mágica:
            <select className="ink-select" value={cat} onChange={e => setCat(e.target.value)}>
              <option value="Charme">Charme / Feitiço</option>
              <option value="Transfiguração">Transfiguração</option>
              <option value="Azaração">Azaração</option>
              <option value="Maldição">Maldição</option>
              <option value="Cura">Cura</option>
              <option value="Contra-feitiço">Contra-feitiço</option>
            </select>
          </label>

          <label className="flex-1">
            Tipo de Ação:
            <select className="ink-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="Utilitário">Utilitário</option>
              <option value="Ataque">Ataque</option>
              <option value="Defesa">Defesa</option>
            </select>
          </label>

          <label className="flex-1">
            Condição Aplicada:
            <input
              type="text"
              className="ink-input"
              placeholder="Ex: Cegueira, Nenhuma"
              value={condicao}
              onChange={e => setCondicao(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row mt-15">
          <label className="flex-1">
            Efeito Mecânico, Execução e Regras do Feitiço:
            <textarea
              className="ink-textarea"
              rows={6}
              required
              placeholder="Descreva o alcance, tempo de conjuração, rolagem e efeitos..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </label>
        </div>

        <div className="btn-group-row mt-20">
          <button type="submit" className="btn-primary flex-1">
            {editingItem ? 'Salvar Alterações' : 'Concluir Inscrição no Grimório'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
