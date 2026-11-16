import React, { useState } from 'react';

export default function PotionForm({ editingItem, onSave, onCancel }) {
  const [nome, setNome] = useState(editingItem?.nome || '');
  const [tipo, setTipo] = useState(editingItem?.tipo || 'Poção');
  const [nivel, setNivel] = useState(editingItem?.nivel || '1');
  const [dificuldadeCd, setDificuldadeCd] = useState(editingItem?.sistema?.dificuldade_cd || editingItem?.dificuldade_cd || 14);
  const [tempoPreparo, setTempoPreparo] = useState(editingItem?.sistema?.tempo_preparo || editingItem?.tempo_preparo || '1 hora');
  const [duracao, setDuracao] = useState(editingItem?.sistema?.duracao || editingItem?.duracao || '1 hora');
  const [administracao, setAdministracao] = useState(editingItem?.sistema?.administracao || editingItem?.administracao || 'Ingestão');
  const [efeito, setEfeito] = useState(editingItem?.efeito || '');
  const [ingredientes, setIngredientes] = useState(editingItem?.ingredientes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Informe o nome da poção.');
      return;
    }

    const payload = {
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      nome: nome.trim(),
      tipo,
      nivel: String(nivel),
      dificuldade_cd: Number(dificuldadeCd),
      tempo_preparo: tempoPreparo.trim(),
      duracao: duracao.trim(),
      administracao: administracao.trim(),
      sistema: {
        dificuldade_cd: Number(dificuldadeCd),
        tempo_preparo: tempoPreparo.trim(),
        duracao: duracao.trim(),
        administracao: administracao.trim()
      },
      efeito: efeito.trim(),
      ingredientes: ingredientes.trim()
    };

    onSave(payload);
  };

  return (
    <div className="registration-container bureaucracy-box">
      <div className="section-header-row mb-15">
        <h2 className="section-title">
          {editingItem ? `Editar Fórmula: ${editingItem.nome}` : 'Formulário de Catalogação Alquímica'}
        </h2>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Voltar ao Arquivo
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="flex-2">
            Nome do Composto:
            <input
              type="text"
              className="ink-input"
              required
              placeholder="Ex: Poção Polissuco (Polyjuice Potion)"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </label>

          <label className="flex-1">
            Tipo de Composto:
            <select className="ink-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="Poção">Poção</option>
              <option value="Veneno">Veneno</option>
              <option value="Antídoto">Antídoto</option>
              <option value="Elixir">Elixir</option>
            </select>
          </label>

          <label className="flex-1">
            Nível Alquímico:
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
        </div>

        <div className="form-row">
          <label className="flex-1">
            CD de Preparo:
            <input
              type="number"
              className="ink-input"
              value={dificuldadeCd}
              onChange={e => setDificuldadeCd(e.target.value)}
              min="5"
              max="35"
            />
          </label>

          <label className="flex-1">
            Tempo de Preparo:
            <input
              type="text"
              className="ink-input"
              placeholder="Ex: 3 semanas"
              value={tempoPreparo}
              onChange={e => setTempoPreparo(e.target.value)}
            />
          </label>

          <label className="flex-1">
            Duração do Efeito:
            <input
              type="text"
              className="ink-input"
              placeholder="Ex: 1 hora por dose"
              value={duracao}
              onChange={e => setDuracao(e.target.value)}
            />
          </label>

          <label className="flex-1">
            Via de Administração:
            <input
              type="text"
              className="ink-input"
              placeholder="Ex: Ingestão, Contato"
              value={administracao}
              onChange={e => setAdministracao(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row mt-15">
          <label className="flex-1">
            Efeito Mecânico e Propriedades Alquímicas:
            <textarea
              className="ink-textarea"
              rows={4}
              required
              placeholder="Descrição dos efeitos no organismo, rolagens contra veneno ou benefícios..."
              value={efeito}
              onChange={e => setEfeito(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row mt-15">
          <label className="flex-1">
            Ingredientes Exigidos no Caldeirão:
            <textarea
              className="ink-textarea"
              rows={4}
              placeholder="Liste os ingredientes vegetais, animais e minerais necessários..."
              value={ingredientes}
              onChange={e => setIngredientes(e.target.value)}
            />
          </label>
        </div>

        <div className="btn-group-row mt-20">
          <button type="submit" className="btn-primary flex-1">
            {editingItem ? 'Salvar Alterações' : 'Concluir Registro Alquímico'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
