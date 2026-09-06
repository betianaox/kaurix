import { ORDEN_DE_VUELTAS } from '../juego/datos';
import { carta } from '../juego/guardado';
import { ACCIONES, hojaCompleta } from './casillas';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ CARTA SALE AL HACER CRECER UN BICHO
 * ───────────────────────────────────────────────────────────────────────────
 * Todo lo de acá es una función pura: entran las cartas que ya tenés y sale la
 * que toca. Sin estado y sin React, para poder probar el reparto entero sin un
 * teléfono en la mano.
 *
 * ## Por qué no es la carta del bicho que criaste
 *
 * Antes lo era, y el álbum se llenaba una hoja por vez: ocho crecidas seguidas
 * para completar una página, y recién ahí empezaba la siguiente. Ocho veces lo
 * mismo antes de ver algo nuevo.
 *
 * Ahora sale una carta de cualquier hoja. El álbum avanza a los saltos por
 * todos lados, cada crecida puede destapar una página que no habías tocado, y
 * de paso cualquier hoja puede ser la primera en completarse.
 *
 * ## Pero tampoco es del todo al azar
 *
 * Dos cosas inclinan el sorteo:
 *
 * 1. **La hoja del bicho que acabás de criar pesa más.** Sin eso, criar un
 *    dragón y recibir una carta del oso no tiene nada que ver con lo que
 *    hiciste, y el premio deja de sentirse ganado.
 * 2. **Una hoja empezada pesa más que una vacía.** Con todas iguales el álbum se
 *    llena parejo y las ocho hojas se completan casi juntas al final: medido,
 *    la primera dorada no aparecía hasta la crecida 46 y después caían siete
 *    seguidas. Dándole más peso a lo que ya está avanzado, las hojas se van
 *    cerrando escalonadas y el festejo aparece repartido a lo largo del juego.
 */

/**
 * Cuánto más pesa cada carta de la hoja del bicho que acabás de criar.
 *
 * **El peso es por carta, no por hoja**, que es la cuenta que importa y la que
 * es fácil hacerse mal: con el álbum vacío son ocho cartas suyas contra
 * cincuenta y seis ajenas, así que el peso de cada una hay que multiplicarlo por
 * ocho, no compararlo contra siete hojas.
 *
 * Medido con `npm run album`, que cuenta las propias sobre una partida entera.
 * En siete es alrededor de la mitad, que es donde está.
 *
 * Es peso, no garantía: si su hoja ya está completa, no sale nada de ahí y el
 * sorteo cae entero en las otras.
 */
const PESO_PROPIO = 7;

/**
 * Cuánto más pesa cada carta de una hoja por cada carta que esa hoja ya tiene.
 *
 * Alto a propósito: con doce, a una hoja a la que le falta una sola carta le
 * toca ochenta y cinco veces más peso que a una vacía. Hace falta tanto porque
 * completar una hoja pide ocho cartas *concretas*, y un empujón chico no alcanza
 * contra las cincuenta y seis que compiten.
 *
 * Medido con `npm run album`, promediando cuarenta partidas:
 *
 * | avance | primera dorada |
 * |---|---|
 * | 0,6 | crecida 39 |
 * | 3 | crecida 32 |
 * | 8 | crecida 21 |
 * | **12** | **crecida 19** |
 *
 * Con 0,6 —lo primero que se probó— las ocho hojas se cerraban entre la crecida
 * 47 y la 64: casi seis vueltas sin un solo festejo y después siete seguidos.
 * Con doce la primera cae en la vuelta 3 y el resto queda repartido.
 *
 * Más alto todavía empieza a completar una hoja entera antes de tocar otra, que
 * es exactamente el llenado de a una página que este diseño vino a sacar.
 */
const PESO_AVANCE = 12;

/** Una carta que todavía no tenés, con cuánto pesa en el sorteo. */
export type Papel = { llave: string; criatura: string; accion: string; peso: number };

/**
 * Lo que se ganó al hacer crecer un bicho.
 *
 * `null` cuando el álbum ya está completo y no queda nada por repartir. La
 * dorada es la criatura cuya hoja se cerró con esta carta, o `null` si no se
 * cerró ninguna: se anuncia **después** de la carta, no en su lugar.
 */
export type Premio = { carta: Papel; dorada: string | null } | null;

/**
 * Todas las cartas de acción que te faltan, con su peso.
 *
 * Las doradas no entran: esas no se sortean nunca, se ganan completando la
 * hoja. Ver `dorada`.
 */
function faltantes(ganadas: readonly string[], propio: string): Papel[] {
  const salida: Papel[] = [];

  for (const criatura of ORDEN_DE_VUELTAS) {
    const suyas = ACCIONES.map((a) => carta(criatura, a));
    // Cuántas de esta hoja ya están. Es lo que la hace pesar más: una hoja a la
    // que le falta poco se termina antes de que las demás la alcancen.
    const tiene = suyas.filter((llave) => ganadas.includes(llave)).length;
    const avance = 1 + tiene * PESO_AVANCE;
    const propia = criatura === propio ? PESO_PROPIO : 1;

    for (const accion of ACCIONES) {
      const llave = carta(criatura, accion);
      if (ganadas.includes(llave)) continue;
      salida.push({ llave, criatura, accion, peso: propia * avance });
    }
  }

  return salida;
}

/**
 * La carta que sale al hacer crecer a `criatura`, o `null` si ya están todas.
 *
 * **Nunca repite**: sortea solo entre las que faltan. Una crecida siempre trae
 * algo que no tenías, que es lo que hace que valga la pena, y además garantiza
 * que el álbum se termine de llenar: sesenta y cuatro crecidas, sesenta y
 * cuatro cartas de acción.
 *
 * `azar` se recibe para poder probar esto sin sorpresas.
 */
export function cartaAlCrecer(
  criatura: string,
  ganadas: readonly string[],
  azar: () => number = Math.random
): Papel | null {
  const lista = faltantes(ganadas, criatura);
  if (lista.length === 0) return null;

  const total = lista.reduce((s, p) => s + p.peso, 0);
  let corte = azar() * total;
  for (const p of lista) {
    corte -= p.peso;
    if (corte <= 0) return p;
  }
  return lista[lista.length - 1];
}

/**
 * La dorada que se destrabó al sumar esa carta, o `null` si no se completó nada.
 *
 * Solo puede aparecer con la carta que cierra una hoja, y solo la de esa hoja:
 * una dorada suelta, sin sus ocho, no significa nada.
 */
export function doradaPorCompletar(
  criaturaDeLaCarta: string,
  ganadas: readonly string[]
): string | null {
  if (!hojaCompleta(criaturaDeLaCarta, ganadas)) return null;
  return criaturaDeLaCarta;
}
