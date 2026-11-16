import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function PotionsScreen({ items, onSelectItem }) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const types = ['', 'Poção', 'Veneno', 'Antídoto', 'Elixir'];

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase().trim();
    return items.filter(potion => {
      const matchName = !s ||
        (potion.nome || '').toLowerCase().includes(s) ||
        (potion.efeito || '').toLowerCase().includes(s);
      const matchTipo = !filterTipo || String(potion.tipo || '').toLowerCase().includes(filterTipo.toLowerCase());
      return matchName && matchTipo;
    });
  }, [items, search, filterTipo]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: theme.cardBg, borderColor: theme.borderLight }]}
      onPress={() => onSelectItem(item.id)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: theme.text }]}>{item.nome}</Text>
        <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
          {item.tipo || 'Poção'} • CD {item.dificuldade_cd || 14} • {item.administracao || 'Ingestão'}
        </Text>
      </View>
      <View style={[styles.levelBadge, { backgroundColor: theme.primary }]}>
        <Text style={[styles.levelText, { color: theme.bg }]}>Nv. {item.nivel || 1}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.searchRow, { backgroundColor: theme.cardBg, borderColor: theme.borderLight }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar poção, efeito, ingrediente..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={[styles.filterToggleBtn, { backgroundColor: theme.surface }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.filterToggleText, { color: theme.primary }]}>
            {showFilters ? 'Fechar' : 'Filtros'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Tipo de Composto:</Text>
          <View style={styles.chipRow}>
            {types.map(tp => {
              const isSelected = filterTipo === tp;
              return (
                <TouchableOpacity
                  key={tp || 'todos'}
                  style={[
                    styles.chip,
                    { borderColor: theme.borderLight },
                    isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setFilterTipo(tp)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.bg : theme.text }]}>
                    {tp || 'Todos'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: theme.textSecondary }]}>
          Exibindo {filteredItems.length} de {items.length} fórmulas
        </Text>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma fórmula encontrada.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  searchRow: {
    flexDirection: 'row',
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 10
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14
  },
  filterToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '700'
  },
  filtersPanel: {
    marginHorizontal: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600'
  },
  countRow: {
    paddingHorizontal: 14,
    marginBottom: 6
  },
  countText: {
    fontSize: 11,
    fontWeight: '600'
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700'
  },
  itemSubtitle: {
    fontSize: 11,
    marginTop: 2
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800'
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 13
  }
});
