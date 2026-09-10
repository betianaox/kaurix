import { requireOptionalNativeModule } from 'expo';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL ETIQUETADOR, DEL LADO DE JAVASCRIPT
 * ───────────────────────────────────────────────────────────────────────────
 * Una cara delgada del módulo nativo. La razón de que exista está en
 * `ReconocedorModule.kt`.
 *
 * ## Opcional a propósito
 *
 * `requireOptionalNativeModule` devuelve `null` en vez de tirar cuando el
 * módulo no está en el binario —Expo Go, o un dev build de antes de
 * compilarlo—. Es lo mismo que hacía el `require` adentro de un `try` de
 * `mirar.ts`, pero sin el `try`: acá el caso está previsto por la API.
 */

/** Una cosa que el modelo cree ver. */
export type Etiqueta = {
  /**
   * El nombre de la clase. Con el modelo propio sale de los metadatos del
   * `.tflite`; puede venir vacío y ahí lo que identifica es `indice`.
   */
  texto: string;
  /** El número de clase dentro del modelo. */
  indice: number;
  /** De 0 a 1. */
  confianza: number;
};

type Nativo = {
  /** `true` cuando anda el modelo del juego; `false` cuando es el base. */
  propio: boolean;
  etiquetar: (uri: string) => Promise<Etiqueta[]>;
};

const nativo = requireOptionalNativeModule<Nativo>('Reconocedor');

/** Si este binario puede etiquetar algo. */
export const hayEtiquetador = nativo !== null;

/**
 * Si el que está andando es el modelo del juego.
 *
 * Importa porque las etiquetas de uno y otro se leen igual pero no significan
 * lo mismo: el propio devuelve las clases de `docs/kaurix-clases-del-modelo.md`
 * y el base devuelve las 447 genéricas, donde no hay ni una fruta por nombre.
 */
export const modeloPropio = nativo?.propio ?? false;

/** Qué se ve en esa foto. Lista vacía si no se pudo mirar. */
export async function etiquetar(uri: string): Promise<Etiqueta[]> {
  if (!nativo) return [];
  return nativo.etiquetar(uri);
}
