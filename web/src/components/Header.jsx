import React from 'react';

export default function Header({ theme, onToggleTheme, onToggleTerminal }) {
  return (
    <header className="official-header">
      <div className="header-actions-row">
        <div className="theme-toggle-container">
          <button
            type="button"
            id="btn-theme-toggle"
            className="btn-theme"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Ativar Modo Claro (Pergaminho)' : 'Ativar Modo Escuro (Ministério)'}
          >
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button
            type="button"
            id="btn-terminal-toggle"
            className="btn-theme"
            onClick={onToggleTerminal}
            title={theme === 'terminal' ? 'Voltar ao Modo Pergaminho' : 'Ativar Modo Terminal Tático'}
          >
            {theme === 'terminal' ? 'Modo Pergaminho' : 'Modo Terminal'}
          </button>
        </div>

        <a href="#mobile-info" className="mobile-app-pill-link" title="Informações sobre a Versão Móvel">
          <span className="mobile-pill-icon">⚡</span>
          <span>Versão Móvel (React Native)</span>
        </a>
      </div>

      <div className="header-titles">
        <h1>Ministério da Magia</h1>
        <h2>Arquivo Geral de Catalogação • D.R.C.C.M. • C.E.F. • Herbologia • Alquimia</h2>
        <p>Formulário Oficial de Consulta e Registro Mágico — Sistema W&W RPG (React Edition)</p>
      </div>
    </header>
  );
}
