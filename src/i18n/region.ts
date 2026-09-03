/**
 * De qué región es quien juega, para elegir cómo se llaman las cosas.
 *
 * ## Por qué existe esto
 *
 * Los nombres de los ingredientes y las comidas son el texto más regional que
 * tiene el juego. Palta o aguacate, frutilla o fresa, choclo o maíz o elote,
 * morrón o pimiento o ají: no hay una forma neutra que a nadie le suene ajena,
 * y hay unos treinta casos así solo en castellano. Traducirlos mal no es un
 * detalle — es la diferencia entre reconocer una cosa y no encontrarla.
 *
 * ## Y por qué no alcanza con el idioma del teléfono
 *
 * Porque el idioma es una ELECCIÓN. Mucha gente pone el teléfono en inglés
 * porque le gusta, o le quedó así de fábrica, o lo compró de segunda mano. El
 * `regionCode` que trae el idioma hereda esa elección y miente igual.
 *
 * **La zona horaria, en cambio, la pone la red sola.** Y casi nadie la toca,
 * porque tocarla te deja mal el reloj y las alarmas. Es el único ajuste del
 * teléfono que está bien casi siempre, y por eso va primero en la cascada.
 *
 * ## La cascada
 *
 *   zona horaria  →  región del idioma  →  moneda  →  neutro
 *
 * La primera que conteste gana, y arriba de todo manda lo que la persona haya
 * elegido a mano (eso vive en el guardado, no acá).
 *
 * Falta una señal mejor todavía: **el país del chip**, con
 * `Cellular.getIsoCountryCodeAsync()` de `expo-cellular`. Es lo más cercano a
 * dónde está alguien de verdad y no pide permisos, pero es un módulo nativo que
 * hay que instalar y no sirve en tablets sin SIM. Cuando esté, va antes que
 * todo lo demás.
 */

export const REGIONES = ['neutro', 'rioplatense', 'espana', 'mexico'] as const;

export type Region = (typeof REGIONES)[number];

export const REGION_POR_DEFECTO: Region = 'neutro';

/**
 * Qué países caen en cada región.
 *
 * **Es un primer corte y se mueve fácil.** Los repartos no son limpios: Chile,
 * Perú y Bolivia dicen palta y choclo como el Río de la Plata, pero piña como
 * México; Centroamérica se parece a México en casi todo. Cada país está donde
 * más nombres comparte, no donde queda en el mapa.
 *
 * Lo que no está listado cae en `neutro`, que usa el término más extendido de
 * cada par aunque no sea el de nadie en particular.
 */
const PAISES: Record<Exclude<Region, 'neutro'>, string[]> = {
  rioplatense: ['AR', 'UY', 'PY', 'CL', 'BO', 'PE'],
  espana: ['ES', 'GQ'],
  mexico: ['MX', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'DO'],
};

const paisARegion = (pais: string | null | undefined): Region | null => {
  if (!pais) return null;
  const codigo = pais.toUpperCase();
  for (const region of Object.keys(PAISES) as Exclude<Region, 'neutro'>[]) {
    if (PAISES[region].includes(codigo)) return region;
  }
  // Un país conocido que no está en ninguna lista NO es un fallo de detección:
  // es alguien que va a neutro a propósito. Por eso contesta y corta la cascada
  // en vez de devolver null y dejar que opine la señal siguiente, que es peor.
  return 'neutro';
};

/**
 * De qué país es una zona horaria.
 *
 * Son cientos de zonas y no hace falta ninguna tabla completa: alcanza con las
 * de los países que cambian algún nombre. Todo lo demás cae en neutro, que es
 * exactamente lo que corresponde.
 */
const ZONAS: Record<string, string> = {
  'America/Argentina': 'AR',
  'America/Buenos_Aires': 'AR',
  'America/Cordoba': 'AR',
  'America/Mendoza': 'AR',
  'America/Montevideo': 'UY',
  'America/Asuncion': 'PY',
  'America/Santiago': 'CL',
  'Pacific/Easter': 'CL',
  'America/La_Paz': 'BO',
  'America/Lima': 'PE',

  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Africa/Ceuta': 'ES',

  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Monterrey': 'MX',
  'America/Tijuana': 'MX',
  'America/Merida': 'MX',
  'America/Chihuahua': 'MX',
  'America/Hermosillo': 'MX',
  'America/Mazatlan': 'MX',
  'America/Guatemala': 'GT',
  'America/El_Salvador': 'SV',
  'America/Tegucigalpa': 'HN',
  'America/Managua': 'NI',
  'America/Costa_Rica': 'CR',
  'America/Panama': 'PA',
  'America/Havana': 'CU',
  'America/Santo_Domingo': 'DO',

  // Los que van a neutro pero conviene tener, para que corten la cascada en vez
  // de dejar opinar a la moneda o al idioma, que pueden estar mal.
  'America/Bogota': 'CO',
  'America/Caracas': 'VE',
  'America/Guayaquil': 'EC',
  'America/Lima_Peru': 'PE',
  'America/Puerto_Rico': 'PR',
};

const zonaAPais = (zona: string | null | undefined): string | null => {
  if (!zona) return null;
  if (ZONAS[zona]) return ZONAS[zona];
  // "America/Argentina/Buenos_Aires" y las demás de dos tramos: se prueba con
  // el prefijo, que es lo que identifica al país.
  const partes = zona.split('/');
  if (partes.length > 2) {
    const prefijo = partes.slice(0, 2).join('/');
    if (ZONAS[prefijo]) return ZONAS[prefijo];
  }
  return null;
};

/** De qué país es una moneda. Solo las que distinguen algo. */
const MONEDAS: Record<string, string> = {
  ARS: 'AR',
  UYU: 'UY',
  PYG: 'PY',
  CLP: 'CL',
  BOB: 'BO',
  PEN: 'PE',
  MXN: 'MX',
  GTQ: 'GT',
  CRC: 'CR',
  DOP: 'DO',
  CUP: 'CU',
  COP: 'CO',
  VES: 'VE',
};

/**
 * La región del dispositivo, por la cascada.
 *
 * Vive en este archivo y no en `index.ts` por lo mismo que
 * `idiomaDelDispositivo`: no importa nada de la app, así que no arma círculos
 * con el guardado ni con el store.
 *
 * Solo pesa en la primera apertura. Después manda lo que haya en disco, para
 * que quien lo cambió a mano no se lo encuentre cambiado de nuevo.
 */
export function regionDelDispositivo(): Region {
  try {
    // Se pide acá adentro a propósito: si el módulo nativo no está —en un test,
    // en una web— el juego arranca igual en neutro en vez de romperse.
    const Localization = require('expo-localization');

    const zona = Localization.getCalendars?.()?.[0]?.timeZone as string | undefined;
    const porZona = paisARegion(zonaAPais(zona));
    if (porZona) return porZona;

    const locale = Localization.getLocales?.()?.[0];

    const porRegion = paisARegion(locale?.regionCode);
    if (porRegion) return porRegion;

    const porMoneda = paisARegion(MONEDAS[locale?.currencyCode ?? '']);
    if (porMoneda) return porMoneda;
  } catch {
    // Sin módulo de localización no hay nada que deducir: neutro.
  }
  return REGION_POR_DEFECTO;
}

export const esRegionSoportada = (codigo: string): codigo is Region =>
  (REGIONES as readonly string[]).includes(codigo);
