/**
 * Kaurix — tema oscuro único.
 *
 * Los grises se eligieron uno por uno para que no cansen la vista: el fondo no
 * es negro puro y el texto no es blanco puro. Si algo se lee poco, se ajusta
 * ese gris puntual, no el contraste general.
 */

export const colors = {
  /** Fondo de la app. Negro violáceo, nunca #000. */
  bg: '#0B0A12',
  /** Tarjetas y superficies elevadas. */
  surface: '#15131F',
  /** Superficie sobre superficie (botones dentro de tarjetas). */
  surfaceAlt: '#1E1B2B',
  /** Bordes tenues. */
  border: '#2A2637',

  /** Texto principal: marfil, no blanco. */
  text: '#E6DFD2',
  /** Texto secundario. */
  textMuted: '#9A93A6',
  /** Texto terciario / notas al pie. */
  textFaint: '#6E687C',

  /** Acento base del juego mientras no haya elemento elegido. */
  accent: '#B08CD9',
} as const;

/**
 * El material del header y el footer.
 *
 * La estructura viene de Oráculos —plataforma central, tres capas, borde que no
 * se tiñe— pero el material es otro: ahí es chapa y luz fría, acá es hueso y
 * cáscara con el brillo cálido. Es lo que evita que se lean como la misma app.
 *
 * El borde queda igual las ocho vueltas y solo el relleno toma el color del
 * nivel. Sin esa separación, cambiar de color ocho veces desarma el armazón.
 */
export const armazon = {
  /** Degradé del cuerpo, de arriba hacia abajo. */
  materialAlto: '#3A3227',
  materialMedio: '#2E271E',
  materialBajo: '#3F3629',

  /** El borde iluminado. Cálido, con el destello al centro. */
  borde: '#E8C88A',
  bordeDestello: '#FFF3D8',

  /** Cuánto del color del nivel entra en el relleno. */
  tinte: 0.2,
} as const;

/** Los cuatro elementos. Definen la estética del mago y de lo que encuentra. */
export const elements = {
  aire: { label: 'Aire', color: '#9FC7E8', glow: '#5C8FB8' },
  tierra: { label: 'Tierra', color: '#C09B5E', glow: '#8A6B38' },
  agua: { label: 'Agua', color: '#5FB0CE', glow: '#2F7A96' },
  fuego: { label: 'Fuego', color: '#E0784A', glow: '#A64A22' },
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

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
} as const;
