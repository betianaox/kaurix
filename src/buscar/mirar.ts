import type { CameraView } from 'expo-camera';

import { escenasDe } from './etiquetas';
import type { Lectura } from './resolver';
import { tonoDe, type Rgb } from './tonos';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * MIRAR UNA VEZ POR LA CÁMARA
 * ───────────────────────────────────────────────────────────────────────────
 * Saca una foto chica y devuelve las dos señales: qué escenas hay y de qué
 * color es lo que se ve.
 *
 * ## Los módulos se cargan protegidos
 *
 * Igual que AdMob en `anuncios/publicidad.ts`: son **módulos nativos**, así que
 * en Expo Go no existen y un `import` arriba de todo tiraría la app entera al
 * abrirla. Con `require` adentro de un `try`, si no están, `disponible` queda en
 * false y el juego sigue andando con los ingredientes al azar de siempre.
 *
 * Eso es lo que permite escribir todo esto sin poder compilarlo: la app no se
 * rompe mientras tanto.
 *
 * ## Por qué una foto y no el video
 *
 * `expo-camera` en SDK 57 no tiene frame processor: no hay `onFrame` ni acceso
 * al stream de la vista previa —lo único continuo es `onBarcodeScanned`—. Lo
 * único que hay es `takePictureAsync`.
 *
 * Y alcanza: aparece un ingrediente cada 3,8 segundos, así que preguntar "¿qué
 * estoy viendo?" una vez por segundo y medio sobra. Traer
 * `react-native-vision-camera` para tener treinta cuadros por segundo seria
 * tirar veintinueve.
 */

type ModuloEtiquetas = {
  default: { label: (uri: string) => Promise<{ text: string; confidence: number }[]> };
};

type ModuloColores = {
  getColors: (
    uri: string,
    opciones?: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
};

type ModuloImagen = typeof import('expo-image-manipulator');

let etiquetador: ModuloEtiquetas | null = null;
let colores: ModuloColores | null = null;
let imagen: ModuloImagen | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  etiquetador = require('@react-native-ml-kit/image-labeling') as ModuloEtiquetas;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  colores = require('react-native-image-colors') as ModuloColores;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  imagen = require('expo-image-manipulator') as ModuloImagen;
} catch (e) {
  etiquetador = null;
  colores = null;
  imagen = null;
  // Casi siempre es "estas corriendo un binario sin estos modulos": Expo Go, o
  // un dev build de antes de instalarlos. Hay que volver a compilar; recargar el
  // JS no alcanza.
  console.warn('[mirar] el reconocedor no esta en este binario:', e);
}

/** Si la cámara puede reconocer algo en este binario. */
export const disponible = etiquetador !== null && colores !== null;

/**
 * Cuánta confianza hace falta para dar una etiqueta por buena.
 *
 * 0,55 es un punto de partida, no un número medido: **no se pudo probar contra
 * una cámara todavía**. Más alto deja al juego mudo en interiores con poca luz;
 * más bajo hace aparecer cosas donde no hay nada.
 */
const CONFIANZA = 0.55;

/**
 * A cuántos puntos se achica la foto antes de mirarla.
 *
 * El etiquetador no necesita más: trabaja sobre una entrada chica igual, y una
 * foto de doce megapíxeles solo agrega tiempo de codificar, de escribir en disco
 * y de leer. 320 es de sobra y hace que cada lectura cueste poco.
 */
const LADO = 320;

/** Una foto chica de lo que la cámara está viendo, o null si no se pudo. */
async function foto(camara: CameraView): Promise<string | null> {
  try {
    const tomada = await camara.takePictureAsync({
      quality: 0.4,
      // Sin sonido y sin animacion de captura: quien juega no esta sacando
      // fotos, esta mirando. Un clic cada segundo y medio seria insoportable.
      shutterSound: false,
      // Salta el enderezado y el pipeline de procesado. Da la imagen mas rapido
      // y para reconocer no importa que este rotada.
      skipProcessing: true,
    });
    if (!tomada?.uri) return null;

    if (!imagen) return tomada.uri;

    const chica = await imagen.manipulateAsync(tomada.uri, [{ resize: { width: LADO } }], {
      compress: 0.7,
      format: imagen.SaveFormat.JPEG,
    });
    return chica.uri;
  } catch {
    // Sacar una foto falla por motivos normales: la camara se esta cerrando, la
    // app paso a segundo plano. No es un error que haya que contar, es una
    // lectura que no salio.
    return null;
  }
}

/** Las etiquetas que pasaron el umbral, en texto. */
async function etiquetasDe(uri: string): Promise<string[]> {
  if (!etiquetador) return [];
  try {
    const crudas = await etiquetador.default.label(uri);
    return crudas.filter((e) => e.confidence >= CONFIANZA).map((e) => e.text);
  } catch {
    return [];
  }
}

/**
 * El color dominante de la imagen.
 *
 * `react-native-image-colors` devuelve una paleta con nombres distintos según la
 * plataforma —Android trae `dominant`, `vibrant`, `average`—, así que se prueban
 * en orden de preferencia y se toma el primero que venga. `dominant` es el que
 * mejor describe "de qué color es esto que estoy mirando"; los otros dos son el
 * respaldo.
 */
async function colorDe(uri: string): Promise<Rgb | null> {
  if (!colores) return null;
  try {
    const paleta = await colores.getColors(uri, { cache: false, quality: 'low' });
    for (const clave of ['dominant', 'vibrant', 'average', 'muted', 'background']) {
      const valor = paleta[clave];
      if (typeof valor === 'string') {
        const rgb = aRgb(valor);
        if (rgb) return rgb;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** De `#rrggbb` a números. Devuelve null con cualquier otra cosa. */
export function aRgb(hex: string): Rgb | null {
  const limpio = hex.trim().replace('#', '');
  if (limpio.length !== 6 && limpio.length !== 8) return null;
  const n = Number.parseInt(limpio.slice(0, 6), 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Mira una vez y devuelve lo que hay, o `null` si no se pudo mirar.
 *
 * Distinguir "no se pudo mirar" de "miré y no había nada" importa: lo primero no
 * tiene que contar para el suavizado, o una foto que falló empujaría el
 * resultado hacia el vacío.
 */
export async function mirar(camara: CameraView): Promise<Lectura | null> {
  if (!disponible) return null;

  const uri = await foto(camara);
  if (!uri) return null;

  const [etiquetas, color] = await Promise.all([etiquetasDe(uri), colorDe(uri)]);

  return {
    escenas: escenasDe(etiquetas),
    tono: color ? tonoDe(color) : null,
  };
}
