/**
 * ADAPTADOR DE ARMAZENAMENTO PERSISTENTE NATIVO PARA REACT NATIVE
 * Conecta o motor compartilhado de cache da API (cacheStore.js) ao AsyncStorage nativo
 * do dispositivo movel (Android / iOS), permitindo gravar as respostas da API na primeira
 * interacao e exibi-las instantaneamente nas aberturas posteriores.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { configurePersistentStorageAdapter } from '../../../shared/services/database.js';

let initialized = false;

export const rnPersistentStorageAdapter = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  async multiSet(keyValuePairs) {
    try {
      if (Array.isArray(keyValuePairs) && keyValuePairs.length > 0) {
        await AsyncStorage.multiSet(keyValuePairs);
      }
      return true;
    } catch {
      return false;
    }
  }
};

export function initMobilePersistentCache() {
  if (initialized) return;
  initialized = true;
  configurePersistentStorageAdapter(rnPersistentStorageAdapter);
}
