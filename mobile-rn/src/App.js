import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';

import { ThemeProvider, useTheme } from './theme/ThemeContext';
import BottomNav from './components/BottomNav';
import DetailModal from './components/DetailModal';

import CreaturesScreen from './screens/CreaturesScreen';
import SpellsScreen from './screens/SpellsScreen';
import PlantsScreen from './screens/PlantsScreen';
import PotionsScreen from './screens/PotionsScreen';

// Módulos de dados compartilhados com resiliência offline e Firestore REST
import {
  COLLECTIONS,
  fetchCatalogIndex,
  fetchItemById
} from '../../shared/services/database.js';
import { checkForAppUpdates, CURRENT_APP_VERSION } from '../../shared/services/updater.js';

function MainApp() {
  const { theme, mode, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('creatures');

  // Listas de índices (Tier 1)
  const [creatures, setCreatures] = useState([]);
  const [spells, setSpells] = useState([]);
  const [plants, setPlants] = useState([]);
  const [potions, setPotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de Detalhes (Tier 2)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Banner de Atualizações
  const [updateInfo, setUpdateInfo] = useState(null);

  // Carrega catálogos na inicialização
  const loadData = useCallback(async () => {
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
    } catch (e) {
      console.warn('[RN App] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Checa updates no GitHub releases
    checkForAppUpdates(CURRENT_APP_VERSION).then(info => {
      if (info?.hasUpdate) {
        setUpdateInfo(info);
      }
    });
  }, [loadData]);

  // Ao tocar em um item, consulta a ficha detalhada individual
  const handleSelectItem = async (col, id) => {
    try {
      const doc = await fetchItemById(col, id);
      setSelectedDetail(doc);
      setModalVisible(true);
    } catch (err) {
      console.warn('[RN App] Erro ao abrir detalhe:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]}>
      <StatusBar
        barStyle={mode === 'light' ? 'light-content' : 'light-content'}
        backgroundColor={theme.headerBg}
      />

      {/* CABEÇALHO COMPACTO MOBILE */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerMinistry, { color: theme.headerText }]}>
            Ministério da Magia
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.accent }]}>
            Arquivo Geral • React Native Mobile
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.themePill, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Text style={[styles.themePillText, { color: theme.text }]}>
            {mode === 'light' ? 'Pergaminho' : mode === 'dark' ? 'Noturno' : 'Terminal'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* BANNER DE ATUALIZAÇÃO DISPONÍVEL */}
      {updateInfo?.hasUpdate && (
        <View style={[styles.updateBanner, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <Text style={[styles.updateText, { color: theme.text }]}>
            Nova versão {updateInfo.latestVersion} disponível!
          </Text>
        </View>
      )}

      {/* CONTEÚDO PRINCIPAL DAS TELAS */}
      <View style={[styles.contentShell, { backgroundColor: theme.bg }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Consultando Arquivo Ministerial...
            </Text>
          </View>
        ) : (
          <>
            {activeTab === 'creatures' && (
              <CreaturesScreen
                items={creatures}
                onSelectItem={id => handleSelectItem(COLLECTIONS.CREATURES, id)}
              />
            )}
            {activeTab === 'spells' && (
              <SpellsScreen
                items={spells}
                onSelectItem={id => handleSelectItem(COLLECTIONS.SPELLS, id)}
              />
            )}
            {activeTab === 'plants' && (
              <PlantsScreen
                items={plants}
                onSelectItem={id => handleSelectItem(COLLECTIONS.PLANTS, id)}
              />
            )}
            {activeTab === 'potions' && (
              <PotionsScreen
                items={potions}
                onSelectItem={id => handleSelectItem(COLLECTIONS.POTIONS, id)}
              />
            )}
          </>
        )}
      </View>

      {/* BARRA INFERIOR DE NAVEGAÇÃO NATIVA */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          creatures: creatures.length,
          spells: spells.length,
          plants: plants.length,
          potions: potions.length
        }}
      />

      {/* MODAL DETALHES */}
      <DetailModal
        visible={modalVisible}
        item={selectedDetail}
        category={activeTab}
        onClose={() => {
          setModalVisible(false);
          setSelectedDetail(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerTitleBox: {
    flex: 1
  },
  headerMinistry: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1
  },
  themePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  updateBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center'
  },
  updateText: {
    fontSize: 12,
    fontWeight: '700'
  },
  contentShell: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600'
  }
});
