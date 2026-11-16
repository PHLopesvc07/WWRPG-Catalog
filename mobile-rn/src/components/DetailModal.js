import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function DetailModal({ visible, item, category, onClose }) {
  const { theme } = useTheme();

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheetContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* CABEÇALHO DO MODAL */}
          <View style={[styles.headerRow, { borderBottomColor: theme.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.categoryStamp, { color: theme.accent }]}>
                {category === 'creatures' && 'D.R.C.C.M. — REGISTRO ZOILÓGICO'}
                {category === 'spells' && 'C.E.F. — COMPÊNDIO DE FEITIÇARIA'}
                {category === 'plants' && 'HERBOLOGIA — DEPARTAMENTO BOTÂNICO'}
                {category === 'potions' && 'ALQUIMIA — LABORATÓRIO MINISTERIAL'}
              </Text>
              <Text style={[styles.title, { color: theme.text }]}>
                {item.nome || item.name}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.surface }]} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* CONTEÚDO SCROLLÁVEL */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* FOTOGRAFIA DA CRIATURA */}
            {category === 'creatures' && (item.fotoBase64 || item.fotoUrl) ? (
              <View style={[styles.imageContainer, { borderColor: theme.borderLight }]}>
                <Image
                  source={{ uri: item.fotoBase64 || item.fotoUrl }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            {/* METADADOS ESPECÍFICOS */}
            {category === 'creatures' && (
              <View style={[styles.metaGrid, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[styles.metaText, { color: theme.text }]}>Classificação: {item.classificacao}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Licença: {item.licenca}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Porte: {item.porte} ({item.tamanho || 'N/A'})</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Locomoção: {item.locomocao}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Interação: {item.interacao}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Tipo: {item.tipo}</Text>
              </View>
            )}

            {category === 'spells' && (
              <View style={[styles.metaGrid, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[styles.metaText, { color: theme.text }]}>Nível: Nível {item.lvl || 1}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Categoria: {item.cat || 'Charme'}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Tipo: {item.tipo || 'Utilitário'}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Condição: {item.condicao || 'Nenhuma'}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Pronúncia: "{item.pronuncia || item.pronunciation || 'N/A'}"</Text>
              </View>
            )}

            {category === 'plants' && (
              <View style={[styles.metaGrid, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[styles.metaText, { color: theme.text }]}>Nível de Herbologia: Nível {item.nivel || 1}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>CD de Manejo: CD {item.manejo_cd || 12}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Disponibilidade: {item.categoria || 'Popular'}</Text>
              </View>
            )}

            {category === 'potions' && (
              <View style={[styles.metaGrid, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[styles.metaText, { color: theme.text }]}>Nível Alquímico: Nível {item.nivel || 1}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>CD de Preparo: CD {item.sistema?.dificuldade_cd || item.dificuldade_cd || 14}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Tempo: {item.sistema?.tempo_preparo || item.tempo_preparo || '1 hora'}</Text>
                <Text style={[styles.metaText, { color: theme.text }]}>Administração: {item.sistema?.administracao || item.administracao || 'Ingestão'}</Text>
              </View>
            )}

            {/* ATRIBUTOS PARA CRIATURAS */}
            {category === 'creatures' && item.atributos && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>Atributos</Text>
                <View style={styles.attrRow}>
                  {Object.entries(item.atributos).map(([k, v]) => (
                    <View key={k} style={[styles.attrChip, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                      <Text style={[styles.attrKey, { color: theme.textSecondary }]}>{k.toUpperCase().slice(0, 3)}</Text>
                      <Text style={[styles.attrVal, { color: theme.text }]}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* DESCRIÇÃO / EFEITO */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                {category === 'potions' ? 'Efeito Mecânico' : category === 'spells' ? 'Efeito e Execução' : 'Descrição'}
              </Text>
              <Text style={[styles.prose, { color: theme.text }]}>
                {item.descricao || item.desc || item.efeito || 'Sem descrição cadastrada.'}
              </Text>
            </View>

            {/* INGREDIENTES / PECULIARIDADES */}
            {(item.ingredientes || item.peculiaridades) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  {category === 'potions' ? 'Ingredientes' : 'Manejo e Peculiaridades'}
                </Text>
                <Text style={[styles.prose, { color: theme.text }]}>
                  {item.ingredientes || item.peculiaridades}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* BOTÃO FECHAR INFERIOR */}
          <TouchableOpacity
            style={[styles.bottomCloseBtn, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.bottomCloseText, { color: theme.bg }]}>Fechar Ficha</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    height: '85%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 2,
    padding: 16
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1
  },
  categoryStamp: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  scrollContent: {
    paddingVertical: 12
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#000'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  metaGrid: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600'
  },
  section: {
    marginTop: 14
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5
  },
  prose: {
    fontSize: 13,
    lineHeight: 18
  },
  attrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  attrChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 44
  },
  attrKey: {
    fontSize: 9,
    fontWeight: '700'
  },
  attrVal: {
    fontSize: 13,
    fontWeight: '700'
  },
  bottomCloseBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  bottomCloseText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5
  }
});
