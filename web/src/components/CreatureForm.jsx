import React, { useState } from 'react';
import { fileToBase64, escapeHtml } from '@shared/utils/helpers.js';

export default function CreatureForm({ editingItem, onSave, onCancel }) {
  const [nome, setNome] = useState(editingItem?.nome || '');
  const [classificacao, setClassificacao] = useState(editingItem?.classificacao || 'XXX');
  const [licenca, setLicenca] = useState(editingItem?.licenca || 'Comum');
  const [porte, setPorte] = useState(editingItem?.porte || 'Médio');
  const [tamanho, setTamanho] = useState(editingItem?.tamanho || '');
  const [peso, setPeso] = useState(editingItem?.peso || '');
  const [origem, setOrigem] = useState(editingItem?.origem || 'Natural');
  const [locomocao, setLocomocao] = useState(editingItem?.locomocao || 'Terrestres');
  const [velocidade, setVelocidade] = useState(editingItem?.velocidade || '3.0m por ação');
  const [interacao, setInteracao] = useState(editingItem?.interacao || 'Pacífico');
  const [tipo, setTipo] = useState(editingItem?.tipo || 'Neutro');
  const [descricao, setDescricao] = useState(editingItem?.descricao || '');
  const [fotoBase64, setFotoBase64] = useState(editingItem?.fotoBase64 || editingItem?.fotoUrl || '');

  // Atributos
  const [corpo, setCorpo] = useState(editingItem?.atributos?.corpo ?? 0);
  const [destreza, setDestreza] = useState(editingItem?.atributos?.destreza ?? 0);
  const [vitalidade, setVitalidade] = useState(editingItem?.atributos?.vitalidade ?? 0);
  const [instinto, setInstinto] = useState(editingItem?.atributos?.instinto ?? 0);
  const [carisma, setCarisma] = useState(editingItem?.atributos?.carisma ?? 0);
  const [inteligencia, setInteligencia] = useState(editingItem?.atributos?.inteligencia ?? 0);
  const [sabedoria, setSabedoria] = useState(editingItem?.atributos?.sabedoria ?? 0);

  // Habilidades
  const [habDanoNome, setHabDanoNome] = useState(editingItem?.habilidades?.dano?.nome || '');
  const [habDanoRolagem, setHabDanoRolagem] = useState(editingItem?.habilidades?.dano?.rolagem || '');
  const [habDanoDesc, setHabDanoDesc] = useState(editingItem?.habilidades?.dano?.desc || '');

  const [habReacaoNome, setHabReacaoNome] = useState(editingItem?.habilidades?.reacao?.nome || '');
  const [habReacaoRolagem, setHabReacaoRolagem] = useState(editingItem?.habilidades?.reacao?.rolagem || '');
  const [habReacaoDesc, setHabReacaoDesc] = useState(editingItem?.habilidades?.reacao?.desc || '');

  const [habAmbienteNome, setHabAmbienteNome] = useState(editingItem?.habilidades?.ambiente?.nome || '');
  const [habAmbienteRolagem, setHabAmbienteRolagem] = useState(editingItem?.habilidades?.ambiente?.rolagem || '');
  const [habAmbienteDesc, setHabAmbienteDesc] = useState(editingItem?.habilidades?.ambiente?.desc || '');

  const [habExtraNome, setHabExtraNome] = useState(editingItem?.habilidades?.extra?.nome || '');
  const [habExtraRolagem, setHabExtraRolagem] = useState(editingItem?.habilidades?.extra?.rolagem || '');
  const [habExtraDesc, setHabExtraDesc] = useState(editingItem?.habilidades?.extra?.desc || '');

  // Injúrias
  const [injLeveCurr, setInjLeveCurr] = useState(editingItem?.injuries?.leve?.curr ?? 0);
  const [injLeveMax, setInjLeveMax] = useState(editingItem?.injuries?.leve?.max ?? 3);
  const [injMediaCurr, setInjMediaCurr] = useState(editingItem?.injuries?.media?.curr ?? 0);
  const [injMediaMax, setInjMediaMax] = useState(editingItem?.injuries?.media?.max ?? 2);
  const [injPesadaCurr, setInjPesadaCurr] = useState(editingItem?.injuries?.pesada?.curr ?? 0);
  const [injPesadaMax, setInjPesadaMax] = useState(editingItem?.injuries?.pesada?.max ?? 1);

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const b64 = await fileToBase64(file);
      setFotoBase64(b64);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Informe o nome da criatura mágica.');
      return;
    }

    const payload = {
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      nome: nome.trim(),
      classificacao,
      licenca,
      porte,
      tamanho: tamanho.trim(),
      peso: peso.trim(),
      origem,
      locomocao,
      velocidade: velocidade.trim(),
      interacao,
      tipo,
      descricao: descricao.trim(),
      fotoBase64,
      fotoUrl: fotoBase64,
      atributos: {
        corpo: Number(corpo),
        destreza: Number(destreza),
        vitalidade: Number(vitalidade),
        instinto: Number(instinto),
        carisma: Number(carisma),
        inteligencia: Number(inteligencia),
        sabedoria: Number(sabedoria)
      },
      habilidades: {
        dano: { nome: habDanoNome.trim(), rolagem: habDanoRolagem.trim(), desc: habDanoDesc.trim() },
        reacao: { nome: habReacaoNome.trim(), rolagem: habReacaoRolagem.trim(), desc: habReacaoDesc.trim() },
        ambiente: { nome: habAmbienteNome.trim(), rolagem: habAmbienteRolagem.trim(), desc: habAmbienteDesc.trim() },
        extra: { nome: habExtraNome.trim(), rolagem: habExtraRolagem.trim(), desc: habExtraDesc.trim() }
      },
      injuries: {
        leve: { curr: Number(injLeveCurr), max: Number(injLeveMax) },
        media: { curr: Number(injMediaCurr), max: Number(injMediaMax) },
        pesada: { curr: Number(injPesadaCurr), max: Number(injPesadaMax) }
      }
    };

    onSave(payload);
  };

  return (
    <div className="registration-container bureaucracy-box">
      <div className="section-header-row mb-15">
        <h2 className="section-title">
          {editingItem ? `Editar Registro: ${editingItem.nome}` : 'Formulário Oficial de Registro de Criatura Mágica'}
        </h2>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Voltar ao Arquivo
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-two-columns">
          <div className="photo-column">
            <div className="photo-preview-container">
              {fotoBase64 ? (
                <img src={fotoBase64} alt="Prévia" className="photo-preview-img" />
              ) : (
                <div className="photo-placeholder">Sem Fotografia</div>
              )}
            </div>
            <label className="btn-secondary w-100 mt-10" style={{ textAlign: 'center', cursor: 'pointer' }}>
              {fotoBase64 ? 'Alterar Retrato' : 'Anexar Retrato'}
              <input type="file" accept="image/*" onChange={handleFotoUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="fields-column">
            <div className="form-row">
              <label className="flex-2">
                Nome da Espécie:
                <input
                  type="text"
                  className="ink-input"
                  required
                  placeholder="Ex: Hipogrifo (Hippogriff)"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </label>

              <label className="flex-1">
                Classificação M.M.:
                <select className="ink-select" value={classificacao} onChange={e => setClassificacao(e.target.value)}>
                  <option value="X">X</option>
                  <option value="XX">XX</option>
                  <option value="XXX">XXX</option>
                  <option value="XXXX">XXXX</option>
                  <option value="XXXXX">XXXXX</option>
                  <option value="XX-XXXX">XX-XXXX</option>
                </select>
              </label>

              <label className="flex-1">
                Licença:
                <select className="ink-select" value={licenca} onChange={e => setLicenca(e.target.value)}>
                  <option value="Comum">Comum</option>
                  <option value="Magizoologista">Magizoologista</option>
                  <option value="Não permitido">Não permitido</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="flex-1">
                Porte:
                <select className="ink-select" value={porte} onChange={e => setPorte(e.target.value)}>
                  <option value="Pequeno">Pequeno</option>
                  <option value="Médio">Médio</option>
                  <option value="Grande">Grande</option>
                  <option value="Enorme">Enorme</option>
                </select>
              </label>

              <label className="flex-1">
                Tamanho Médio:
                <input
                  type="text"
                  className="ink-input"
                  placeholder="Ex: 2.5 metros"
                  value={tamanho}
                  onChange={e => setTamanho(e.target.value)}
                />
              </label>

              <label className="flex-1">
                Peso Médio:
                <input
                  type="text"
                  className="ink-input"
                  placeholder="Ex: 350 kg"
                  value={peso}
                  onChange={e => setPeso(e.target.value)}
                />
              </label>

              <label className="flex-1">
                Origem:
                <select className="ink-select" value={origem} onChange={e => setOrigem(e.target.value)}>
                  <option value="Natural">Natural</option>
                  <option value="Artificial">Artificial</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="flex-1">
                Locomoção:
                <select className="ink-select" value={locomocao} onChange={e => setLocomocao(e.target.value)}>
                  <option value="Terrestres">Terrestres</option>
                  <option value="Aéreos">Aéreos</option>
                  <option value="Aquáticos">Aquáticos</option>
                  <option value="Aquaéros">Aquaéros</option>
                </select>
              </label>

              <label className="flex-1">
                Velocidade:
                <input
                  type="text"
                  className="ink-input"
                  placeholder="Ex: 4.5m por ação"
                  value={velocidade}
                  onChange={e => setVelocidade(e.target.value)}
                />
              </label>

              <label className="flex-1">
                Interação:
                <select className="ink-select" value={interacao} onChange={e => setInteracao(e.target.value)}>
                  <option value="Pacífico">Pacífico</option>
                  <option value="Agressivo">Agressivo</option>
                </select>
              </label>

              <label className="flex-1">
                Tipo:
                <select className="ink-select" value={tipo} onChange={e => setTipo(e.target.value)}>
                  <option value="Simples">Simples</option>
                  <option value="Neutro">Neutro</option>
                  <option value="Consciente">Consciente</option>
                  <option value="Bestial">Bestial</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* ATRIBUTOS */}
        <h3 className="section-title mt-20">Atributos Físicos e Naturais (-5 a +15)</h3>
        <div className="stats-grid">
          <label className="attr-box">Corpo: <input type="number" className="ink-input" value={corpo} onChange={e => setCorpo(e.target.value)} min="-5" max="15" /></label>
          <label className="attr-box">Destreza: <input type="number" className="ink-input" value={destreza} onChange={e => setDestreza(e.target.value)} min="-5" max="15" /></label>
          <label className="attr-box">Vitalidade: <input type="number" className="ink-input" value={vitalidade} onChange={e => setVitalidade(e.target.value)} min="-5" max="15" /></label>
          <label className="attr-box">Instinto: <input type="number" className="ink-input" value={instinto} onChange={e => setInstinto(e.target.value)} min="-5" max="15" /></label>
          <label className="attr-box">Carisma: <input type="number" className="ink-input" value={carisma} onChange={e => setCarisma(e.target.value)} min="-5" max="15" /></label>
          <label className="attr-box">Inteligência: <input type="number" className="ink-input" value={inteligencia} onChange={e => setInteligencia(e.target.value)} min="-5" max="15" /></label>
          <label className="attr-box">Sabedoria: <input type="number" className="ink-input" value={sabedoria} onChange={e => setSabedoria(e.target.value)} min="-5" max="15" /></label>
        </div>

        {/* HABILIDADES */}
        <h3 className="section-title mt-20">Habilidades Especiais & Combate</h3>
        <div className="form-row">
          <label className="flex-1">
            Habilidade de Dano:
            <input type="text" className="ink-input" placeholder="Nome" value={habDanoNome} onChange={e => setHabDanoNome(e.target.value)} />
            <input type="text" className="ink-input mt-5" placeholder="Rolagem (ex: 1d20+Corpo)" value={habDanoRolagem} onChange={e => setHabDanoRolagem(e.target.value)} />
            <textarea className="ink-textarea mt-5" placeholder="Descrição da habilidade de dano..." value={habDanoDesc} onChange={e => setHabDanoDesc(e.target.value)} />
          </label>
          <label className="flex-1">
            Habilidade de Reação:
            <input type="text" className="ink-input" placeholder="Nome" value={habReacaoNome} onChange={e => setHabReacaoNome(e.target.value)} />
            <input type="text" className="ink-input mt-5" placeholder="Rolagem (ex: Reação de Esquiva)" value={habReacaoRolagem} onChange={e => setHabReacaoRolagem(e.target.value)} />
            <textarea className="ink-textarea mt-5" placeholder="Descrição da reação..." value={habReacaoDesc} onChange={e => setHabReacaoDesc(e.target.value)} />
          </label>
        </div>

        {/* INJÚRIAS */}
        <h3 className="section-title mt-20">Limites de Injúria</h3>
        <div className="form-row">
          <label className="flex-1">Leve (Atual / Max):
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="number" className="ink-input" value={injLeveCurr} onChange={e => setInjLeveCurr(e.target.value)} min="0" />
              <input type="number" className="ink-input" value={injLeveMax} onChange={e => setInjLeveMax(e.target.value)} min="1" />
            </div>
          </label>
          <label className="flex-1">Média (Atual / Max):
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="number" className="ink-input" value={injMediaCurr} onChange={e => setInjMediaCurr(e.target.value)} min="0" />
              <input type="number" className="ink-input" value={injMediaMax} onChange={e => setInjMediaMax(e.target.value)} min="1" />
            </div>
          </label>
          <label className="flex-1">Pesada (Atual / Max):
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="number" className="ink-input" value={injPesadaCurr} onChange={e => setInjPesadaCurr(e.target.value)} min="0" />
              <input type="number" className="ink-input" value={injPesadaMax} onChange={e => setInjPesadaMax(e.target.value)} min="1" />
            </div>
          </label>
        </div>

        {/* DESCRIÇÃO */}
        <h3 className="section-title mt-20">Descrição Física, Habitat e Temperamento</h3>
        <textarea
          className="ink-textarea"
          rows={5}
          placeholder="Descreva a biologia, comportamento, geografia e histórico da criatura..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
        />

        <div className="btn-group-row mt-20">
          <button type="submit" className="btn-primary flex-1">
            {editingItem ? 'Salvar Alterações' : 'Concluir Catalogação no Arquivo'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
