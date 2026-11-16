import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function BottomNav({ activeTab, onSelectTab, counts }) {
  const { theme } = useTheme();

  const tabs = [
    { key: 'creatures', label: 'Animais', count: counts.creatures || 92 },
    { key: 'spells', label: 'Feitiços', count: counts.spells || 210 },
    { key: 'plants', label: 'Plantas', count: counts.plants || 44 },
    { key: 'potions', label: 'Poções', count: counts.potions || 166 }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBg, borderTopColor: theme.borderLight }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              isActive && { borderTopWidth: 3, borderTopColor: theme.primary, backgroundColor: theme.surface }
            ]}
            onPress={() => onSelectTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, { color: isActive ? theme.primary : theme.textSecondary }]}>
              {tab.label}
            </Text>
            <View style={[styles.badge, { backgroundColor: isActive ? theme.primary : theme.borderLight }]}>
              <Text style={[styles.badgeText, { color: isActive ? theme.bg : theme.text }]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  badge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700'
  }
});
