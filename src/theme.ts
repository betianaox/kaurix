/**
 * Kaurix — tema claro único.
 *
 * El material es papel de herbario: marfil cálido, tinta marrón y bordes de
 * cuero. Nada de blanco puro ni de negro puro. Si algo se lee poco, se ajusta
 * ese tono puntual, no el contraste general.
 *
 * Es lo que más separa a Kaurix de Oráculos: allá es noche y chapa fría, acá
 * es papel de día. Cambiar esto es cambiar de qué app parece.
 */

export const colors = {
  /** Fondo de la app. Marfil cálido, nunca #FFF. */
  bg: '#F4EDDF',
  /** Tarjetas y superficies elevadas: el papel limpio sobre la mesa. */
  surface: '#FDF8EE',
  /** Superficie sobre superficie (botones dentro de tarjetas). */
  surfaceAlt: '#EAE0CC',
  /** Bordes tenues. */
  border: '#D6C9AF',

  /** Texto principal: tinta marrón, no negro. */
  text: '#2C2418',
  /** Texto secundario. */
  textMuted: '#6B6050',
  /**
   * Texto terciario: los párrafos de la ayuda, los rótulos de sección, las
   * notas al pie.
   *
   * Era `#9A8E79` y se leía lavado. Sobre el papel daba 3,04 de contraste y
   * sobre el fondo 2,76, cuando el mínimo para leer un párrafo es 4,5: no era
   * una impresión, estaba abajo del piso. Ahora da **4,72 sobre el papel** —que
   * es donde vive el texto largo— y 4,29 sobre el fondo, donde solo quedan
   * rótulos cortos.
   *
   * No se oscureció más a propósito. Un paso más lo dejaba pegado a
   * `textMuted` y los dos tonos pasaban a ser el mismo: se ganaba contraste y
   * se perdía la escala de tres niveles, que es lo que ordena cada pantalla.
   */
  textFaint: '#7A6E5A',

  /** Acento base del juego mientras no haya elemento elegido. */
  accent: '#6E44A0',

  /**
   * El oro de lo que se gana una vez cada muchas: las doradas y el final.
   *
   * No sigue al color de la vuelta, y es a propósito. Lo dorado es dorado en
   * las ocho vueltas —la carta viene dibujada con su marco de oro— y teñir su
   * resplandor de violeta o de verde según en qué ciclo estés le sacaba
   * justamente lo que la distingue de las otras ocho de la hoja.
   *
   * Viejo y no brillante: la paleta entera es marfil y tierra, y un dorado de
   * medalla se leía como una pieza de otra app.
   */
  dorado: '#C9A227',
  /**
   * El mismo oro, para **escribir**.
   *
   * `dorado` es un relleno: sobre el crema da 2,08 de contraste, así que de
   * texto se lee lavado —el mínimo para un título grande es 3—. Este da 4,17
   * y sigue siendo oro.
   *
   * Son dos tokens y no uno porque son dos trabajos: el que pinta un botón
   * tiene que ser vistoso, y el que se lee encima del papel tiene que ser
   * legible. Un solo valor no puede hacer las dos cosas.
   */
  doradoTinta: '#8A6E17',

  /**
   * Lo que va **encima** de un color de nivel: el reloj del impulso, el 2x, el
   * sello de completada, los botones teñidos.
   *
   * Claro y no oscuro: los ocho colores de vuelta son tonos medios y saturados
   * —ninguno es pastel—, y sobre ellos la tinta oscura se empasta. En marfil se
   * leen los ocho.
   *
   * No sigue al tema, y es a propósito: los tintes son los mismos de día y de
   * noche, así que lo que va arriba de ellos tampoco se mueve.
   */
  sobreTinte: '#FFF8EC',

  /**
   * El verde de lo conseguido: la corona de una criatura ya criada.
   *
   * Es el único acento del juego que **no** sigue a la vuelta, y por eso es un
   * color y no el tinte: los ocho tintes dicen en qué ciclo estás, y esto dice
   * que algo se terminó. Con el color de la vuelta, la corona se leía como una
   * etiqueta más de la ficha y no como un logro.
   *
   * Apagado y no un verde de semáforo: la paleta entera es marfil y tierra, y
   * un verde saturado ahí adentro se ve como un aviso del sistema.
   */
  logrado: '#4E9161',

  /**
   * El velo de las hojas que tapan la pantalla entera —la carta grande, el
   * anuncio de la ruleta—. Es el fondo de la app casi opaco: en claro, un
   * velo negro convierte cada modal en un agujero.
   */
  velo: 'rgba(244,237,223,0.975)',
  /** El velo más liviano, para lo que todavía tiene que dejar ver el fondo. */
  veloTenue: 'rgba(244,237,223,0.86)',
} as const;

/**
 * El material del header y el footer.
 *
 * Es una pieza de **marfil, un tono más oscura que el papel**. Lo importante
 * es que no tenga color propio: la barra está llena de fichas de colores
 * fuertes, y un armazón teñido —el color de la vuelta diluido encima, como
 * estuvo un tiempo— competía con ellas y ensuciaba el plano.
 *
 * Marfil y no gris neutro porque el gris, contra el papel cálido de la app, se
 * lee como una pieza de otro juego apoyada encima. Que sea el mismo material un
 * poco más oscuro es lo que hace que la placa se lea como parte de la hoja.
 *
 * El cuerpo es liso. Todo el volumen está en el **canto**: el filo fino pegado
 * al borde de adentro, con su degradé, su línea de luz y la sombra que tira
 * sobre el cuerpo. Es lo único que se lee como material, y alcanza.
 *
 * El color de la vuelta ya no entra acá. Sigue estando donde se lee sin
 * estorbar: el halo de la sección abierta y las cosas teñidas de cada pantalla.
 */
export const armazon = {
  /** El cuerpo de la placa. Un plano y nada más. */
  plano: '#E4D9C0',

  /** El canto, de arriba hacia abajo. Lo que le da el grosor a la pieza. */
  cantoAlto: '#FDFAF3',
  cantoMedio: '#F1E8D5',
  cantoBajo: '#CBBC9B',

  /** El brillo que corre por el filo del canto, del lado de la luz. */
  cantoBrillo: 'rgba(255,253,247,0.85)',
  /** La sombra que el canto tira sobre el cuerpo. */
  cantoSombra: 'rgba(92,74,42,0.28)',

  /** La línea donde la placa termina y empieza la pantalla. */
  borde: '#A9793F',
  bordeDestello: '#C79B58',

  /** Lo que va encima del borde cuando se usa de relleno (el globo de avisos). */
  sobreBorde: '#FFF6E4',
} as const;

/** Los cuatro elementos. Definen la estética del mago y de lo que encuentra. */
export const elements = {
  aire: { label: 'Aire', color: '#4A7FA8', glow: '#9FC7E8' },
  tierra: { label: 'Tierra', color: '#8A6B38', glow: '#C09B5E' },
  agua: { label: 'Agua', color: '#2F7A96', glow: '#5FB0CE' },
  fuego: { label: 'Fuego', color: '#C05A28', glow: '#E0784A' },
} as const;

export type ElementId = keyof typeof elements;

export const elementIds = Object.keys(elements) as ElementId[];

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
} as const;

/**
 * A PARTIR DE QUÉ ANCHO LA PANTALLA SE CONSIDERA GRANDE.
 *
 * En React Native no hay media queries: lo que hay es el ancho real, que se lee
 * con `useWindowDimensions`. Esto es el corte, y está acá y no repetido en cada
 * pantalla para que todas cambien de forma en el mismo punto.
 *
 * Estuvo en 600, que es el umbral con el que Android separa teléfono de tablet
 * —el `sw600dp` de sus recursos—. **Se bajó a 520 porque ese número se rompe en
 * cuanto alguien toca el tamaño de pantalla.**
 *
 * El caso medido es la Galaxy Tab A11 donde se prueba: mide 800 px con densidad
 * de fábrica 213, o sea 601 puntos, y entraba por uno. Con el tamaño de pantalla
 * subido en ajustes —densidad 240, que es como viene puesta— pasa a 533 y queda
 * afuera: una tablet de diez pulgadas mostrando el bolso de un teléfono.
 *
 * Entre 520 y los 360 de un teléfono común hay margen de sobra, así que el corte
 * no se le mueve a nadie por el otro lado.
 */
export const ANCHO_GRANDE = 520;

/**
 * Cuántas cajitas de ingrediente entran por fila.
 *
 * Cuatro en un teléfono y cinco en una tablet. Con las cuatro fijas, en una
 * pantalla del doble de ancho cada cajita salía dos veces y media más grande
 * que en el teléfono, mientras que las fichas de la colección y las cartas del
 * álbum —que tienen que entrar en el alto— crecían bastante menos. El bolso
 * terminaba siendo la pantalla de los dibujos grandes y las dos que de verdad
 * muestran arte, las de los dibujos chicos.
 *
 * Cinco y no seis a propósito: seis las deja casi del tamaño del teléfono y se
 * pierde lo bueno de la pantalla grande, que es poder mirar el dibujo.
 */
export const columnasDeIngredientes = (ancho: number) => (ancho >= ANCHO_GRANDE ? 5 : 4);

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
} as const;
