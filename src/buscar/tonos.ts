/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL COLOR DE LO QUE HAY ENFRENTE
 * ───────────────────────────────────────────────────────────────────────────
 * La mitad barata del reconocedor, y la que sostiene el diseño entero.
 *
 * Reconocer objetos necesita un modelo, se equivoca y cuesta batería. Saber de
 * qué color es lo que se está mirando es una cuenta sobre tres números: no se
 * equivoca, no tarda y no necesita nada instalado.
 *
 * Es lo que permite que nueve gemas salgan de un modelo que solo sabe decir
 * "piedra": la escena la pone la etiqueta y **el color desempata**. Lo mismo
 * con las frutas, donde la alternativa a la naranja es "algo anaranjado".
 *
 * Ver `docs/reconocer-el-lugar.md`.
 */

/**
 * Los tonos que el juego distingue.
 *
 * Son pocos y anchos a propósito. La cámara de un teléfono ve el mismo tomate
 * de cuatro rojos distintos según la hora del día, así que buscar precisión acá
 * es buscar un error: lo que hace falta es que un tomate caiga en `rojo` sea
 * mediodía o de noche con la luz de la cocina prendida.
 *
 * `tostado` no es un tono del círculo cromático: es el naranja oscuro y poco
 * saturado, que es como se ve la tierra, la madera, el pan y la arenisca. Sin
 * él, todo eso cae en `naranja` y una maceta se lee como una naranja.
 */
export type Tono =
  | 'rojo'
  | 'naranja'
  | 'amarillo'
  | 'verde'
  | 'celeste'
  | 'azul'
  | 'violeta'
  | 'rosa'
  | 'tostado'
  | 'blanco'
  | 'gris'
  | 'negro';

/** Un color leído de la imagen, en 0–255. */
export type Rgb = { r: number; g: number; b: number };

/**
 * Pasa un color a matiz, saturación y luminosidad.
 *
 * El matiz va en grados (0–360), los otros dos en 0–1. Es la conversión
 * estándar; está acá y no en una librería porque son quince líneas y traer una
 * dependencia para esto sería peor.
 */
export function hsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;

  return { h, s, l };
}

/**
 * Debajo de esta saturación el color no tiene tono: es blanco, gris o negro.
 *
 * 0,18 sale de que una pared blanca real nunca es (255,255,255) —tiene el tinte
 * de la lámpara que la ilumina— y con un umbral más exigente se leía como
 * amarilla o celeste según la hora.
 */
const SIN_COLOR = 0.18;

/**
 * Cuánto sube ese umbral en los extremos de luminosidad.
 *
 * Un color casi blanco o casi negro tiene poquísimo margen para saturarse, así
 * que un tinte mínimo lo empuja por encima del umbral: una pared blanca de
 * (238,236,230) da saturación 0,19 y se leía **amarilla**.
 *
 * Con esto el umbral se endurece a medida que el color se acerca al blanco o al
 * negro, que es donde el matiz deja de significar algo. En el medio de la
 * escala no cambia nada.
 */
const EXIGENCIA_EN_LOS_EXTREMOS = 0.5;

/**
 * Por debajo de esta luminosidad, un color saturado igual se lee negro.
 *
 * La obsidiana y una sombra profunda tienen matiz, pero nadie los ve de color:
 * se ven negros. Sin este corte, una foto oscura de cualquier cosa devuelve el
 * tono de su ruido.
 */
const OSCURO = 0.14;

/** Por encima de esto, un color poco saturado es blanco y no gris. */
const CLARO = 0.78;

/**
 * Los cortes del círculo cromático, en grados.
 *
 * No están repartidos parejo: el verde ocupa mucho más que el naranja porque en
 * el mundo real hay muchísimo más verde —todo lo que es planta— y conviene que
 * caiga todo junto en lugar de partirse entre amarillo y celeste.
 */
const CORTES: { hasta: number; tono: Tono }[] = [
  { hasta: 14, tono: 'rojo' },
  { hasta: 40, tono: 'naranja' },
  { hasta: 66, tono: 'amarillo' },
  { hasta: 160, tono: 'verde' },
  { hasta: 200, tono: 'celeste' },
  { hasta: 250, tono: 'azul' },
  { hasta: 292, tono: 'violeta' },
  { hasta: 340, tono: 'rosa' },
  { hasta: 361, tono: 'rojo' },
];

/**
 * Qué tono es un color.
 *
 * El orden de las preguntas importa: primero se descarta que no tenga color
 * —blanco, gris, negro—, después que no sea tostado, y recién ahí se mira el
 * matiz. Al revés, la tierra y una pared blanca terminan con tono propio.
 */
export function tonoDe(color: Rgb): Tono {
  const { h, s, l } = hsl(color);

  if (l <= OSCURO) return 'negro';

  const umbral = SIN_COLOR + Math.abs(l - 0.5) * EXIGENCIA_EN_LOS_EXTREMOS;
  if (s < umbral) {
    if (l >= CLARO) return 'blanco';
    return 'gris';
  }

  // El tostado: naranja apagado. Es la tierra, la madera, el pan, la arenisca y
  // el ladrillo viejo. Se pregunta antes que el matiz porque cae justo en el
  // rango del naranja y del rojo, y confundirlo con una naranja es el error
  // mas facil de cometer.
  const enFranjaCalida = h >= 12 && h <= 45;
  // Oscuro, o simplemente no lo bastante vivo. El segundo caso es la arena y la
  // madera clara: son claras pero apagadas, y sin esto se leen como una naranja.
  if (enFranjaCalida && (l < 0.42 || s < 0.6)) return 'tostado';

  for (const corte of CORTES) if (h < corte.hasta) return corte.tono;
  return 'rojo';
}

/**
 * Si dos tonos se parecen lo suficiente como para darlos por buenos.
 *
 * Existe porque un objetivo pide "algo anaranjado" y una mandarina bajo una luz
 * cálida da `amarillo`. Rechazarla seria correcto y molesto: lo que el juego
 * pregunta es si se parece, no si es.
 *
 * Los vecinos van escritos y no calculados sobre el circulo cromatico porque no
 * son simetricos: el tostado es vecino del naranja, pero el naranja no deberia
 * aceptar cualquier cosa marron.
 */
const VECINOS: Partial<Record<Tono, Tono[]>> = {
  rojo: ['naranja', 'rosa'],
  naranja: ['rojo', 'amarillo', 'tostado'],
  amarillo: ['naranja', 'verde'],
  verde: ['amarillo', 'celeste'],
  celeste: ['verde', 'azul'],
  azul: ['celeste', 'violeta'],
  violeta: ['azul', 'rosa'],
  rosa: ['violeta', 'rojo'],
  tostado: ['naranja', 'gris'],
  blanco: ['gris'],
  gris: ['blanco', 'negro'],
  negro: ['gris'],
};

/** El tono es alguno de los pedidos, o vecino de alguno. */
export function tonoSirve(tono: Tono | null, pedidos: readonly Tono[]): boolean {
  if (pedidos.length === 0) return true;
  if (!tono) return false;
  if (pedidos.includes(tono)) return true;
  return pedidos.some((p) => VECINOS[p]?.includes(tono));
}
