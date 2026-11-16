import React, { useState } from 'react';

export default function PlantForm({ editingItem, onSave, onCancel }) {
  const [nome, setNome] = useState(editingItem?.nome || '');
  const [categoria, setCategoria] = useState(editingItem?.categoria || 'Popular');
  const [nivel, setNivel] = useState(editingItem?.nivel || '1');
  const [manejoCd, setManejoCd] = useState(editingItem?.manejo_cd || 12);
  const [descricao, setDescricao] = useState(editingItem?.descricao || '');
  const [peculiaridades, setPeculiaridades] = useState(editingItem?.peculiaridades || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Informe o nome da planta mágica.');
      return;
    }

    const payload = {
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      nome: nome.trim(),
      categoria,
      nivel: String(nivel),
      manejo_cd: Number(manejoCd),
      descricao: descricao.trim(),
      peculiaridades: peculiaridades.trim()
    };

    onSave(payload);
  };

  return (
    <div className="registration-container bureaucracy-box">
      <div className="section-header-row mb-15">
        <h2 className="section-title">
          {editingItem ? `Editar Planta: ${editingItem.nome}` : 'Formulário de Catalogação Botânica (Herbologia)'}
        </h2>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Voltar ao Arquivo
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="flex-2">
            Nome do Espécime:
            <input
              type="text"
              className="ink-input"
              required
              placeholder="Ex: Mandrágora (Mandrake)"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </label>

          <label className="flex-1">
            Disponibilidade:
            <select className="ink-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="Popular">Popular</option>
              <option value="Difícil de Adquirir">Difícil de Adquirir</option>
            </select>
          </label>

          <label className="flex-1">
            Nível de Herbologia:
            <select className="ink-select" value={nivel} onChange={e => setNivel(e.target.value)}>
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
            CD de Manejo:
            <input
              type="number"
              className="ink-input"
              value={manejoCd}
              onChange={e => setManejoCd(e.target.value)}
              min="5"
              max="35"
            />
          </label>
        </div>

        <div className="form-row mt-15">
          <label className="flex-1">
            Descrição Botânica:
            <textarea
              className="ink-textarea"
              rows={4}
              required
              placeholder="Aparência, solo, clima e ciclo de vida do espécime..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row mt-15">
          <label className="flex-1">
            Manejo, Colheita e Peculiaridades Mágicas:
            <textarea
              className="ink-textarea"
              rows={4}
              placeholder="Procedimentos de poda, extração de seiva, toxicidade ou precauções..."
              value={peculiaridades}
              onChange={e => setPeculiaridades(e.target.value)}
            />
          </label>
        </div>

        <div className="btn-group-row mt-20">
          <button type="submit" className="btn-primary flex-1">
            {editingItem ? 'Salvar Alterações' : 'Concluir Catalogação Botânica'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
