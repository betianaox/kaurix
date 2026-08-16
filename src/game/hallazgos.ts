import AsyncStorage from '@react-native-async-storage/async-storage';

import { criaturas } from '../art';

const KEY = 'kaurix.hallazgos.v1';

/** Con qué motor de búsqueda se encontró. */
export type Modo = 'orientacion' | 'deriva';

export type Hallazgo = {
  id: string;
  /** Id de la criatura encontrada. */
  criatura: string;
  modo: Modo;
  /** ISO. */
  at: string;
  /** Segundos que llevó encontrarla. */
  segundos: number;
};

export async function cargar(): Promise<Hallazgo[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Hallazgo[]) : [];
  } catch {
    return [];
  }
}

export async function sumar(h: Omit<Hallazgo, 'id' | 'at'>): Promise<Hallazgo[]> {
  const previos = await cargar();
  const next: Hallazgo[] = [
    ...previos,
    { ...h, id: `${Date.now()}`, at: new Date().toISOString() },
  ];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function borrar(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** Ids de las especies distintas ya encontradas, en orden de aparición. */
export function especies(hallazgos: Hallazgo[]): string[] {
  return [...new Set(hallazgos.map((h) => h.criatura))];
}

export function resumen(hallazgos: Hallazgo[]) {
  const distintas = especies(hallazgos);
  return {
    total: hallazgos.length,
    distintas: distintas.length,
    posibles: criaturas.length,
    mejorTiempo: hallazgos.length
      ? Math.min(...hallazgos.map((h) => h.segundos))
      : null,
  };
}
