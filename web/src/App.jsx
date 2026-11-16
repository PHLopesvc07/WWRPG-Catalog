import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import TabsNav from './components/TabsNav.jsx';
import CreatureArchive from './components/CreatureArchive.jsx';
import SpellArchive from './components/SpellArchive.jsx';
import PlantArchive from './components/PlantArchive.jsx';
import PotionArchive from './components/PotionArchive.jsx';
import CreatureForm from './components/CreatureForm.jsx';
import SpellForm from './components/SpellForm.jsx';
import PlantForm from './components/PlantForm.jsx';
import PotionForm from './components/PotionForm.jsx';
import BulkImportModal from './components/BulkImportModal.jsx';

import {
  COLLECTIONS,
  fetchCatalogIndex,
  fetchItemById,
  saveRecord,
  saveBulkRecords,
  deleteRecord
} from '@shared/services/database.js';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('wwrpg-theme') || 'light');
  const [activeTab, setActiveTab] = useState('creatures');

  // Listas de índices (Tier 1)
  const [creatures, setCreatures] = useState([]);
  const [spells, setSpells] = useState([]);
  const [plants, setPlants] = useState([]);
  const [potions, setPotions] = useState([]);

  // Item selecionado atualmente e detalhes (Tier 2)
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edição
  const [editingItem, setEditingItem] = useState(null);

  // Modal de importação em massa
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkType, setBulkType] = useState('creatures');

  // Aplica o tema nas classes do body
  useEffect(() => {
    document.body.classList.remove('dark-mode', 'terminal-mode');
    if (theme === 'dark') document.body.classList.add('dark-mode');
    else if (theme === 'terminal') document.body.classList.add('terminal-mode');
    localStorage.setItem('wwrpg-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleTerminal = () => {
    setTheme(prev => (prev === 'terminal' ? 'light' : 'terminal'));
  };

  // Carrega os índices de todas as 4 coleções em paralelo (0ms com fallback offline)
  const loadAllCatalogs = useCallback(async () => {
    try {
      const [cr, sp, pl, po] = await Promise.all([
        fetchCatalogIndex(COLLECTIONS.CREATURES),
        fetchCatalogIndex(COLLECTIONS.SPELLS),
        fetchCatalogIndex(COLLECTIONS.PLANTS),
        fetchCatalogIndex(COLLECTIONS.POTIONS)
      ]);
      setCreatures(cr);
      setSpells(sp);
      setPlants(pl);
      setPotions(po);

      // Seleciona a primeira criatura por padrão se nenhuma estiver selecionada
      if (cr.length > 0 && !selectedId) {
        selectAndLoadItem(COLLECTIONS.CREATURES, cr[0].id);
      }
    } catch (err) {
      console.error('[W&W React] Erro ao carregar catálogos:', err);
    }
  }, [selectedId]);

  useEffect(() => {
    loadAllCatalogs();
  }, [loadAllCatalogs]);

  // Carrega os detalhes do item sob demanda (Tier 2)
  const selectAndLoadItem = async (col, id) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const detail = await fetchItemById(col, id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error('[W&W React] Erro ao carregar detalhe:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Troca de aba
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setEditingItem(null);

    // Atualiza o item detalhado correspondente à aba ativa
    if (tab === 'creatures' && creatures.length > 0) {
      selectAndLoadItem(COLLECTIONS.CREATURES, creatures[0].id);
    } else if (tab === 'spells' && spells.length > 0) {
      selectAndLoadItem(COLLECTIONS.SPELLS, spells[0].id);
    } else if (tab === 'plants' && plants.length > 0) {
      selectAndLoadItem(COLLECTIONS.PLANTS, plants[0].id);
    } else if (tab === 'potions' && potions.length > 0) {
      selectAndLoadItem(COLLECTIONS.POTIONS, potions[0].id);
    }
  };

  // Salvamento de registros
  const handleSaveItem = async (col, data, successTab) => {
    try {
      const res = await saveRecord(col, data);
      alert('Registro salvo com sucesso no Arquivo do Ministério.');
      await loadAllCatalogs();
      setActiveTab(successTab);
      setEditingItem(null);
      if (res?.id) {
        selectAndLoadItem(col, res.id);
      }
    } catch (err) {
      alert('Erro ao salvar no Firestore: ' + err.message);
    }
  };

  // Exclusão de registros
  const handleDeleteItem = async (col, id, fallbackTab) => {
    if (!confirm('Deseja realmente remover este registro oficial do acervo ministerial?')) {
      return;
    }
    try {
      await deleteRecord(col, id);
      alert('Registro removido com sucesso.');
      await loadAllCatalogs();
      setActiveTab(fallbackTab);
    } catch (err) {
      alert('Erro ao excluir registro: ' + err.message);
    }
  };

  // Importação em massa
  const handleBulkImport = async (type, list) => {
    try {
      const col = type === 'creatures' ? COLLECTIONS.CREATURES : COLLECTIONS.SPELLS;
      const res = await saveBulkRecords(col, list);
      alert(`${res.count} registros importados com sucesso.`);
      await loadAllCatalogs();
    } catch (err) {
      alert('Erro na importação em massa: ' + err.message);
    }
  };

  return (
    <div className="main-content-shell">
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleTerminal={handleToggleTerminal}
      />

      <TabsNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        counts={{
          creatures: creatures.length,
          spells: spells.length,
          plants: plants.length,
          potions: potions.length
        }}
      />

      <main className="tab-container mt-15">
        {/* ABA I: ANIMAIS MÁGICOS */}
        {activeTab === 'creatures' && (
          <CreatureArchive
            items={creatures}
            selectedId={selectedId}
            selectedDetail={selectedDetail}
            loadingDetail={loadingDetail}
            onSelectItem={id => selectAndLoadItem(COLLECTIONS.CREATURES, id)}
            onOpenBulkImport={() => {
              setBulkType('creatures');
              setBulkModalOpen(true);
            }}
            onEditItem={item => {
              setEditingItem(item);
              setActiveTab('reg-creature');
            }}
            onDeleteItem={id => handleDeleteItem(COLLECTIONS.CREATURES, id, 'creatures')}
          />
        )}

        {/* ABA II: FEITIÇOS */}
        {activeTab === 'spells' && (
          <SpellArchive
            items={spells}
            selectedId={selectedId}
            selectedDetail={selectedDetail}
            loadingDetail={loadingDetail}
            onSelectItem={id => selectAndLoadItem(COLLECTIONS.SPELLS, id)}
            onOpenBulkImport={() => {
              setBulkType('spells');
              setBulkModalOpen(true);
            }}
            onEditItem={item => {
              setEditingItem(item);
              setActiveTab('reg-spell');
            }}
            onDeleteItem={id => handleDeleteItem(COLLECTIONS.SPELLS, id, 'spells')}
          />
        )}

        {/* ABA III: PLANTAS */}
        {activeTab === 'plants' && (
          <PlantArchive
            items={plants}
            selectedId={selectedId}
            selectedDetail={selectedDetail}
            loadingDetail={loadingDetail}
            onSelectItem={id => selectAndLoadItem(COLLECTIONS.PLANTS, id)}
            onEditItem={item => {
              setEditingItem(item);
              setActiveTab('reg-plant');
            }}
            onDeleteItem={id => handleDeleteItem(COLLECTIONS.PLANTS, id, 'plants')}
          />
        )}

        {/* ABA IV: POÇÕES */}
        {activeTab === 'potions' && (
          <PotionArchive
            items={potions}
            selectedId={selectedId}
            selectedDetail={selectedDetail}
            loadingDetail={loadingDetail}
            onSelectItem={id => selectAndLoadItem(COLLECTIONS.POTIONS, id)}
            onEditItem={item => {
              setEditingItem(item);
              setActiveTab('reg-potion');
            }}
            onDeleteItem={id => handleDeleteItem(COLLECTIONS.POTIONS, id, 'potions')}
          />
        )}

        {/* FORMULÁRIO DE CRIATURAS */}
        {activeTab === 'reg-creature' && (
          <CreatureForm
            editingItem={editingItem}
            onSave={payload => handleSaveItem(COLLECTIONS.CREATURES, payload, 'creatures')}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab('creatures');
            }}
          />
        )}

        {/* FORMULÁRIO DE FEITIÇOS */}
        {activeTab === 'reg-spell' && (
          <SpellForm
            editingItem={editingItem}
            onSave={payload => handleSaveItem(COLLECTIONS.SPELLS, payload, 'spells')}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab('spells');
            }}
          />
        )}

        {/* FORMULÁRIO DE PLANTAS */}
        {activeTab === 'reg-plant' && (
          <PlantForm
            editingItem={editingItem}
            onSave={payload => handleSaveItem(COLLECTIONS.PLANTS, payload, 'plants')}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab('plants');
            }}
          />
        )}

        {/* FORMULÁRIO DE POÇÕES */}
        {activeTab === 'reg-potion' && (
          <PotionForm
            editingItem={editingItem}
            onSave={payload => handleSaveItem(COLLECTIONS.POTIONS, payload, 'potions')}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab('potions');
            }}
          />
        )}
      </main>

      {/* MODAL DE IMPORTAÇÃO EM MASSA */}
      <BulkImportModal
        isOpen={bulkModalOpen}
        type={bulkType}
        onClose={() => setBulkModalOpen(false)}
        onImport={list => handleBulkImport(bulkType, list)}
      />
    </div>
  );
}
