/**
 * Idiomas que la app OFRECE. El orden es el que se muestra al elegir.
 *
 * Mismo criterio que en Oráculos: solo se listan los que están traducidos de
 * verdad. Ofrecer uno a medias es peor que no ofrecerlo — quien lo elige ve la
 * app mitad en su idioma y mitad en español, y eso se lee como una app rota, no
 * como una app en varios idiomas.
 *
 * Kaurix tiene poco texto y mucho dibujo, así que los cuatro entran completos.
 */
export const IDIOMAS = [
  // Cada idioma se nombra en sí mismo y bien escrito, acentos incluidos: quien
  // busca el suyo en esta lista lo reconoce por cómo se ve.
  { codigo: 'es', etiqueta: 'Español' },
  { codigo: 'en', etiqueta: 'English' },
  { codigo: 'pt', etiqueta: 'Português' },
  { codigo: 'it', etiqueta: 'Italiano' },
] as const;

export type CodigoIdioma = (typeof IDIOMAS)[number]['codigo'];

export const IDIOMA_POR_DEFECTO: CodigoIdioma = 'es';

export function esIdiomaSoportado(codigo: string): codigo is CodigoIdioma {
  return IDIOMAS.some((i) => i.codigo === codigo);
}

/**
 * El idioma del teléfono, si lo ofrecemos.
 *
 * Vive acá y no en `index.ts` para no armar un círculo de importaciones: el
 * guardado necesita esto al crear una partida, `index.ts` necesita el store para
 * saber el idioma elegido, y el store necesita el guardado. Con la detección en
 * este archivo —que no importa nada de la app— la cadena se corta.
 *
 * Solo pesa en la primera apertura: después manda lo que haya en disco.
 */
export function idiomaDelDispositivo(): CodigoIdioma {
  try {
    // Se pide acá y no arriba a propósito. `expo-localization` es un módulo
    // nativo: en una build compilada antes de instalarlo, el import de arriba
    // revienta al cargar el archivo y **la app no abre**. Pedido acá adentro, lo
    // peor que pasa es que caiga a español hasta la próxima compilación.
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');

    for (const local of getLocales()) {
      const codigo = local.languageCode?.toLowerCase();
      // languageCode viene sin región ('pt' y no 'pt-BR'), que es justo lo que
      // usamos como código de idioma.
      if (codigo && esIdiomaSoportado(codigo)) return codigo;
    }
  } catch {
    // No debería fallar, pero si el sistema devuelve algo raro preferimos
    // arrancar en español antes que romper el arranque de la app.
  }
  return IDIOMA_POR_DEFECTO;
}
