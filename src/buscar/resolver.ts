import { INGREDIENTES, type Familia, type Ingrediente } from '../juego/ingredientes';
import type { Escena } from './etiquetas';
import { OBJETIVOS, type Objetivo } from './objetivos';
import { tonoSirve, type Tono } from './tonos';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * DE LO QUE VE LA CÁMARA AL INGREDIENTE QUE APARECE
 * ───────────────────────────────────────────────────────────────────────────
 * Todo lo de acá es una función pura: entra lo que se leyó, sale un
 * ingrediente. Ni cámara, ni estado, ni React. Es a propósito — es la única
 * pieza del reconocedor que se puede probar sin un teléfono en la mano, y es
 * justo donde vive la lógica que importa.
 */

/** Lo que se sacó en limpio de mirar una vez. */
export type Lectura = {
  /** Las escenas presentes. Pueden ser varias: una maceta es planta y tierra. */
  escenas: readonly Escena[];
  /** El tono dominante, o null si no se pudo leer el color. */
  tono: Tono | null;
};

/**
 * Con cuánta exactitud se cumplió un objetivo.
 *
 * La diferencia entre `exacto` y `vecino` es la que hace que apuntar a una
 * naranja dé una naranja. Los tonos aceptan vecinos —una mandarina bajo luz
 * cálida se lee amarilla— pero **esa tolerancia no puede valer lo mismo que
 * acertar**: si valiera, el naranja de la naranja es vecino del rojo de la
 * manzana y del rosa del durazno, y las tres compiten por igual. Probándolo,
 * apuntar a una naranja daba doce frutas distintas.
 */
export type Exactitud = 'exacto' | 'vecino' | null;

/** Se cumple cuando se cumple TODO lo que pide. Lo ausente no pide nada. */
export function cumple(objetivo: Objetivo, lectura: Lectura): Exactitud {
  // Un objetivo vacio matchearia siempre, y eso convertiria a su ingrediente en
  // el que sale con cualquier cosa. Se rechaza: si no pide nada, no vale.
  if (!objetivo.escenas && !objetivo.tonos) return null;

  if (objetivo.escenas && !objetivo.escenas.some((e) => lectura.escenas.includes(e))) {
    return null;
  }
  if (!objetivo.tonos) return 'exacto';
  if (!lectura.tono) return null;

  if (objetivo.tonos.includes(lectura.tono)) return 'exacto';
  return tonoSirve(lectura.tono, objetivo.tonos) ? 'vecino' : null;
}

/**
 * Con cuánta fuerza matcheó un ingrediente.
 *
 * `principal` es el objeto real y `alternativa` es la salida de emergencia.
 * Separarlos no es un detalle: **si hay algo que matchea por lo principal, las
 * alternativas de los demás no compiten**. Apuntar a una naranja tiene que dar
 * la naranja, no una zanahoria que también acepta cosas anaranjadas.
 */
export type Fuerza = 'principal' | 'alternativa';

export type Candidato = { ingrediente: Ingrediente; fuerza: Fuerza };

/**
 * Todos los que aceptan lo que se está mirando.
 *
 * Se filtra por familia porque las dos economías del juego no se mezclan: en el
 * campo no aparece harina. Ver `Familia` en `juego/ingredientes.ts`.
 */
export function candidatos(lectura: Lectura, familia?: Familia): Candidato[] {
  const salida: Candidato[] = [];

  for (const ingrediente of INGREDIENTES) {
    if (familia && familiaDelIngrediente(ingrediente) !== familia) continue;

    const objetivo = OBJETIVOS[ingrediente.id];
    if (!objetivo) continue;

    // El principal acertado de lleno es lo unico que cuenta como principal.
    // Acertado por vecindad de color baja a alternativa: sirve para que algo
    // aparezca, no para ganarle al que la cámara vio de verdad.
    const suyo = objetivo.principal ? cumple(objetivo.principal, lectura) : null;
    if (suyo === 'exacto') {
      salida.push({ ingrediente, fuerza: 'principal' });
      continue;
    }
    if (suyo === 'vecino' || objetivo.alternativas.some((a) => cumple(a, lectura) !== null)) {
      salida.push({ ingrediente, fuerza: 'alternativa' });
    }
  }

  return salida;
}

/** La familia de un ingrediente, sin importar el lugar exacto. */
function familiaDelIngrediente(i: Ingrediente): Familia {
  return LUGAR_A_FAMILIA[i.lugar];
}

/**
 * Se escribe acá y no se importa `familiaDe` para no arrastrar el objeto
 * `LUGARES` entero a una funcion que corre en cada lectura.
 */
const LUGAR_A_FAMILIA: Record<string, Familia> = {
  planta: 'campo',
  flor: 'campo',
  tierra: 'campo',
  piedra: 'campo',
  fruta: 'cocina',
  verdura: 'cocina',
  despensa: 'cocina',
  proteina: 'cocina',
};

/**
 * Elige uno entre los candidatos, con el peso de cada uno.
 *
 * **Los principales le ganan a las alternativas**, siempre: si hay aunque sea
 * uno que matcheó por lo suyo, las alternativas quedan afuera del sorteo. Es lo
 * que hace que apuntar a la cosa correcta dé la cosa correcta.
 *
 * Adentro del grupo que quedó, sortea el `peso`. Eso es lo que hace que en la
 * alacena salga harina más seguido que chocolate, y que entre las nueve piedras
 * la obsidiana sea rara.
 *
 * `azar` se recibe para poder probar esto sin sorpresas.
 */
export function elegir(
  lista: readonly Candidato[],
  azar: () => number = Math.random
): Ingrediente | null {
  if (lista.length === 0) return null;

  const hayPrincipal = lista.some((c) => c.fuerza === 'principal');
  const enJuego = hayPrincipal ? lista.filter((c) => c.fuerza === 'principal') : lista;

  const total = enJuego.reduce((s, c) => s + c.ingrediente.peso, 0);
  if (total <= 0) return enJuego[0].ingrediente;

  let corte = azar() * total;
  for (const c of enJuego) {
    corte -= c.ingrediente.peso;
    if (corte <= 0) return c.ingrediente;
  }
  return enJuego[enJuego.length - 1].ingrediente;
}

/**
 * Qué aparece con lo que se está viendo, o `null` si no corresponde nada.
 *
 * Devolver `null` es una respuesta válida y frecuente: una pared blanca, poca
 * luz, el techo. **Qué hacer con eso no se decide acá** —ver el plan— y por eso
 * no cae a un sorteo libre: quien llame decide si no muestra nada o hace otra
 * cosa. Esconder acá una decisión de juego seria la peor forma de tomarla.
 */
export function queAparece(
  lectura: Lectura,
  familia?: Familia,
  azar: () => number = Math.random
): Ingrediente | null {
  return elegir(candidatos(lectura, familia), azar);
}
