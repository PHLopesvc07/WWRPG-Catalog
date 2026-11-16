import React, { useState } from 'react';

export default function BulkImportModal({ isOpen, type, onClose, onImport }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const content = await file.text();
      setText(content);
    }
  };

  const handleProcess = () => {
    if (!text.trim()) {
      alert('Cole um JSON válido ou selecione um arquivo .json.');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      onImport(list);
      setText('');
      setFileName('');
      onClose();
    } catch (err) {
      alert('Erro ao interpretar JSON: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="bureaucracy-box" style={{ width: '90%', maxWidth: '600px', backgroundColor: 'var(--bg-paper)' }}>
        <h3 className="section-title">
          Importação em Massa — {type === 'creatures' ? 'Animais Mágicos' : 'Feitiços'}
        </h3>
        <p className="mt-5">
          Cole o array JSON ou selecione um arquivo <code>.json</code> exportado do sistema:
        </p>

        <input
          type="file"
          accept=".json,application/json"
          className="mt-10"
          onChange={handleFileUpload}
        />
        {fileName && <small className="d-block mt-5">Arquivo carregado: {fileName}</small>}

        <textarea
          className="ink-textarea mt-10"
          rows={8}
          placeholder='[ { "nome": "Exemplo", ... } ]'
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="btn-group-row mt-15">
          <button type="button" className="btn-primary flex-1" onClick={handleProcess}>
            Processar e Salvar no Firestore
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
