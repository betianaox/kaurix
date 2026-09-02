import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  esIdiomaSoportado,
  idiomaDelDispositivo,
  type CodigoIdioma,
} from '../i18n/idiomas';

/**
 * Todo lo que el juego recuerda, en un solo objeto.
 *
 * Va entero y versionado a propósito, en vez de repartido en varias llaves como
 * estaba en el demo. Dos razones: se lee y se escribe de una sola vez, sin
 * quedar nunca a medio guardar; y el día que haya cuenta y sincronización entre
 * dispositivos, esto es lo que se manda, sin tener que reescribir nada.
 */

const LLAVE = 'kaurix.guardado';

/**
 * Subir esto obliga a pasar por `migrar`. Mientras el juego no esté publicado
 * alcanza con devolver una partida nueva; después habrá que escribir el paso de
 * verdad, porque va a haber gente con progreso adentro.
 */
export const VERSION = 1;

/** Una criatura que está siendo criada. Nunca hay más de `MAX_CRIANZA`. */
export type EnCrianza = {
  criatura: string;
  /** Tramos de la barra ya completos. Esto no se pierde nunca. */
  tramo: number;
  /** Avance dentro del tramo actual, de 0 a 1. Esto sí puede bajar. */
  avance: number;
  /**
   * Cuánto se le dio ya de cada cosa que pide el tramo en curso.
   *
   * Se cuenta lo **entregado**, no lo que tenés en el morral: tener la comida
   * guardada no es habérsela dado. Sin esto, la barra subiría sola al cocinar y
   * bajaría al usar esa comida en otra cosa.
   *
   * Se vacía al subir de tramo.
   */
  entregado: Record<string, number>;
  /**
   * Cuándo recibió atención por última vez, en ISO.
   *
   * Es lo que hace que la barra baje: no hay ningún temporizador corriendo, la
   * caída se calcula por diferencia contra este momento cada vez que se abre la
   * app. Un juego que solo avanza mientras está abierto no sirve para algo que
   * se juega dos minutos por día.
   */
  ultimaAtencion: string;
  /** Ya tomó la poción que habilita el salto a adulto. */
  pocion: boolean;
  /** Cuándo salió del cascarón, en ISO. */
  desde: string;
};

export type Inventario = {
  /** Lo que se encuentra con la cámara. */
  ingredientes: Record<string, number>;
  /** Lo combinado que llena la barra. */
  comidas: Record<string, number>;
  /** Lo combinado que habilita el salto a adulto. */
  pociones: Record<string, number>;
};

export type Guardado = {
  version: number;
  /**
   * En qué idioma se lee la app.
   *
   * Se guarda porque es una elección de la persona. La primera vez sale del
   * teléfono; después manda esto, y el idioma del sistema no vuelve a opinar: a
   * quien eligió inglés en un teléfono en portugués no se le pisa la elección en
   * cada arranque.
   */
  idioma: CodigoIdioma;
  /** La vuelta en curso, de 1 a `NIVELES`. Define color y costos. */
  nivel: number;
  crianza: EnCrianza[];
  /** Ids de las criaturas ya llevadas a adulto **en el nivel en curso**. */
  completadas: string[];
  /**
   * Las cartas ganadas, como `"nivel:criatura"` — y `"nivel:legendaria"` para
   * la del centro de la hoja.
   *
   * Una lista de strings y no un objeto anidado porque el álbum solo necesita
   * preguntar si tiene una carta, y porque así sobrevive a JSON sin que las
   * llaves numéricas se conviertan en texto por el camino.
   */
  cartas: string[];
  inventario: Inventario;
  /** Cuándo se abrió la app por última vez, en ISO. */
  visto: string;
};

export function partidaNueva(): Guardado {
  return {
    version: VERSION,
    idioma: idiomaDelDispositivo(),
    nivel: 1,
    crianza: [],
    completadas: [],
    cartas: [],
    inventario: { ingredientes: {}, comidas: {}, pociones: {} },
    visto: new Date().toISOString(),
  };
}

/** La llave con que una carta vive en `cartas`. */
export const carta = (nivel: number, criatura: string) => `${nivel}:${criatura}`;

/** La legendaria de un nivel, la que va en el centro de la hoja. */
export const LEGENDARIA = 'legendaria';

export async function cargar(): Promise<Guardado> {
  try {
    const crudo = await AsyncStorage.getItem(LLAVE);
    if (!crudo) return partidaNueva();
    return migrar(JSON.parse(crudo) as Guardado);
  } catch {
    // Un guardado ilegible es peor que ninguno: si devolviéramos un error acá,
    // la app no abriría nunca más en ese teléfono.
    return partidaNueva();
  }
}

export async function guardar(estado: Guardado): Promise<void> {
  await AsyncStorage.setItem(LLAVE, JSON.stringify(estado));
}

export async function borrar(): Promise<void> {
  await AsyncStorage.removeItem(LLAVE);
}

/**
 * Lleva un guardado viejo a la forma actual.
 *
 * Hoy no hay nada que migrar porque no hay nadie jugando todavía. Cuando lo
 * haya, cada salto de versión se escribe acá, y **nunca** se resuelve
 * devolviendo una partida nueva: eso le borra el progreso a la persona sin
 * avisarle.
 */
function migrar(viejo: Guardado): Guardado {
  if (viejo?.version !== VERSION) return partidaNueva();
  return completar(viejo);
}

/**
 * Rellena lo que un guardado más viejo no tenía.
 *
 * Agregar un campo a `EnCrianza` no rompe la versión —los datos que ya estaban
 * siguen valiendo— pero sí deja partidas guardadas sin ese campo, y leerlo
 * después tira la app abajo. Subir la versión lo arreglaría borrando el
 * progreso de quien la tenga, que es exactamente lo que no hay que hacer por un
 * campo que arranca vacío.
 *
 * Así que los campos nuevos se completan acá, y `migrar` queda para los cambios
 * que de verdad no se pueden traducir.
 */
function completar(j: Guardado): Guardado {
  return {
    ...j,
    // Una partida anterior a los idiomas no tiene ninguno elegido, así que se
    // resuelve como si fuera la primera vez: mirando el teléfono.
    idioma: j.idioma && esIdiomaSoportado(j.idioma) ? j.idioma : idiomaDelDispositivo(),
    crianza: (j.crianza ?? []).map((c) => ({ ...c, entregado: c.entregado ?? {} })),
    completadas: j.completadas ?? [],
    cartas: j.cartas ?? [],
    inventario: {
      ingredientes: j.inventario?.ingredientes ?? {},
      comidas: j.inventario?.comidas ?? {},
      pociones: j.inventario?.pociones ?? {},
    },
  };
}
