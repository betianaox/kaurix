import { INGREDIENTES, type Familia, type Ingrediente } from '../juego/ingredientes';
import type { Clase } from './clases';
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
  /**
   * Las clases del modelo propio que pasaron el umbral. Vacío con el modelo
   * base, que no sabe nombres: ahí todo sale de escenas y color.
   */
  clases: readonly Clase[];
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
  if (!objetivo.clases && !objetivo.escenas && !objetivo.tonos) return null;

  if (!claseVista(objetivo, lectura)) return null;
  if (objetivo.escenas && !objetivo.escenas.some((e) => lectura.escenas.includes(e))) {
    return null;
  }
  if (!objetivo.tonos) return 'exacto';
  if (!lectura.tono) return null;

  if (objetivo.tonos.includes(lectura.tono)) return 'exacto';
  return tonoSirve(lectura.tono, objetivo.tonos) ? 'vecino' : null;
}

/** Si el objetivo pide clases, alguna está entre las que vio el modelo. */
function claseVista(objetivo: Objetivo, lectura: Lectura): boolean {
  return !objetivo.clases || objetivo.clases.some((c) => lectura.clases.includes(c));
}

/**
 * Con cuánta fuerza matcheó un ingrediente.
 *
 * `clase` es la cosa dicha por el modelo, `principal` la cosa deducida de escena
 * y color, y `alternativa` la salida de emergencia. Separarlos no es un detalle:
 * **si hay algo de un nivel, los de abajo no compiten**. Apuntar a una naranja
 * tiene que dar la naranja, no una zanahoria que también acepta cosas
 * anaranjadas; y si el modelo dice `papa`, tiene que dar papa y no el jengibre,
 * que se busca como "verdura tostada".
 */
export type Fuerza = 'clase' | 'clase-otro-color' | 'principal' | 'alternativa';

/**
 * `clase-otro-color` es la clase vista con un color que no es el suyo. Va debajo
 * de la clase acertada —si el modelo ve carne y es roja, gana el bife y no la
 * desmenuzada— pero **encima de lo deducido**: un hibisco que se lee verde por
 * las hojas es un planta verde, y sin este nivel competía con la albahaca.
 */
const NIVELES: readonly Fuerza[] = ['clase', 'clase-otro-color', 'principal', 'alternativa'];

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

    // La clase acertada de lleno —el modelo la vio y el color, si lo pide, es el
    // suyo— es lo unico que cuenta como clase. Vista pero con otro color baja un
    // nivel: sigue siendo esa cosa, aunque no se sepa cual de las que la
    // comparten. Un hibisco que se lee verde por las hojas sigue siendo hibisco.
    if (objetivo.clase) {
      if (cumple(objetivo.clase, lectura) === 'exacto') {
        salida.push({ ingrediente, fuerza: 'clase' });
        continue;
      }
      if (claseVista(objetivo.clase, lectura) && lectura.clases.length) {
        salida.push({ ingrediente, fuerza: 'clase-otro-color' });
        continue;
      }
    }

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
 * **El nivel más alto que haya gana**, siempre: si hay aunque sea uno por
 * clase, los principales y las alternativas quedan afuera del sorteo; si no hay
 * clase pero hay principal, quedan afuera las alternativas. Es lo que hace que
 * apuntar a la cosa correcta dé la cosa correcta.
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

  const nivel = NIVELES.find((n) => lista.some((c) => c.fuerza === n));
  const enJuego = lista.filter((c) => c.fuerza === nivel);

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
