import React from 'react';

export default function TabsNav({ activeTab, onSelectTab, counts }) {
  return (
    <nav className="tabs-nav" aria-label="Navegação dos Arquivos do Ministério">
      <button
        type="button"
        className={`tab-btn ${activeTab === 'creatures' ? 'active' : ''}`}
        onClick={() => onSelectTab('creatures')}
      >
        I. Animais Mágicos <span className="nav-count-badge">{counts.creatures || 92}</span>
      </button>
      <button
        type="button"
        className={`tab-btn ${activeTab === 'spells' ? 'active' : ''}`}
        onClick={() => onSelectTab('spells')}
      >
        II. Feitiços <span className="nav-count-badge">{counts.spells || 210}</span>
      </button>
      <button
        type="button"
        className={`tab-btn ${activeTab === 'plants' ? 'active' : ''}`}
        onClick={() => onSelectTab('plants')}
      >
        III. Plantas <span className="nav-count-badge">{counts.plants || 44}</span>
      </button>
      <button
        type="button"
        className={`tab-btn ${activeTab === 'potions' ? 'active' : ''}`}
        onClick={() => onSelectTab('potions')}
      >
        IV. Poções <span className="nav-count-badge">{counts.potions || 166}</span>
      </button>

      <div className="sub-actions-bar">
        <button
          type="button"
          className={`tab-btn tab-btn-reg ${activeTab === 'reg-creature' ? 'active' : ''}`}
          onClick={() => onSelectTab('reg-creature')}
        >
          + Registrar Animal
        </button>
        <button
          type="button"
          className={`tab-btn tab-btn-reg ${activeTab === 'reg-spell' ? 'active' : ''}`}
          onClick={() => onSelectTab('reg-spell')}
        >
          + Registrar Feitiço
        </button>
        <button
          type="button"
          className={`tab-btn tab-btn-reg ${activeTab === 'reg-plant' ? 'active' : ''}`}
          onClick={() => onSelectTab('reg-plant')}
        >
          + Registrar Planta
        </button>
        <button
          type="button"
          className={`tab-btn tab-btn-reg ${activeTab === 'reg-potion' ? 'active' : ''}`}
          onClick={() => onSelectTab('reg-potion')}
        >
          + Registrar Poção
        </button>
      </div>
    </nav>
  );
}
