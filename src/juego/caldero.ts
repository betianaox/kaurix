import { RECETAS, porIngrediente, type Receta } from './recetas';

/**
 * Qué hay adentro del caldero y qué puede salir de ahí.
 *
 * Son funciones puras sobre un objeto plano: no tocan el guardado ni la
 * pantalla. La mezcla vive en la pantalla mientras se arma y **no se guarda**;
 * recién al cocinar se descuenta del bolso, que es lo que hace que probar sea
 * gratis.
 *
 * ## Por qué se tira adentro en vez de elegir la receta
 *
 * Elegir la receta primero y que se llene sola es un botón con forma de olla: la
 * decisión ya está tomada antes de tocar nada. Tirando, la decisión es el juego.
 *
 * Y no es adivinar: el bolso lista las cincuenta y una recetas con lo que lleva
 * cada una. El catálogo está para consultarlo; acá se ejecuta.
 */

/** Cuánto hay de cada cosa adentro. Ingredientes y preparaciones, mezclados. */
export type Mezcla = Record<string, number>;

/**
 * Todo lo que pide una receta, en la misma forma que la mezcla.
 *
 * La base cuenta como una unidad más, con su propio id. Ingredientes y
 * preparaciones no comparten ids, así que entran en el mismo objeto sin
 * pisarse — y eso es lo que deja comparar la olla contra la receta de una.
 */
export function requisitosDe(r: Receta): Mezcla {
  const pide: Mezcla = {};
  if (r.base) pide[r.base] = 1;
  const cuantos = porIngrediente(r);
  for (const id of r.lleva) pide[id] = (pide[id] ?? 0) + cuantos;
  return pide;
}

const vacia = (m: Mezcla) => !Object.keys(m).some((k) => m[k] > 0);

/**
 * Con menos que esto adentro no puede salir nada, y por eso no se deja cocinar.
 *
 * No es una regla nueva ni un castigo: es lo que dicen las recetas. Las de nivel
 * 1 llevan tres ingredientes y las de nivel 2 y 3 una base más dos, así que
 * ninguna baja de tres. Con dos cosas en la olla, prender el fuego no es una
 * apuesta perdida sino una que no existe, y ofrecer el botón ahí es la app
 * fingiendo que algo podría pasar.
 *
 * Sale de una cuenta sobre el catálogo y no de un `3` escrito a mano: si algún
 * día entra una receta de dos, esto se entera solo.
 */
export const MINIMO = Math.min(
  ...RECETAS.map((r) => Object.values(requisitosDe(r)).reduce((s, n) => s + n, 0))
);

/**
 * CUÁNTAS COSAS DISTINTAS HACEN FALTA COMO MÍNIMO.
 *
 * No es lo mismo que `MINIMO`, y confundirlos es lo que rompía la cocina: aquel
 * cuenta **unidades** y este cuenta **ingredientes diferentes**. Tres manzanas
 * son tres unidades y un solo tipo, y con eso no puede salir absolutamente
 * nada: las cincuenta y dos recetas del catálogo piden tres cosas distintas
 * —las comidas y pociones de nivel 1 llevan tres ingredientes; las de nivel 2 y
 * 3, una base más dos—, ninguna repite.
 *
 * Es lo que mira la cocina para saber si prender el fuego tiene sentido y
 * cuántos casilleros vacíos quedan en la mesa. Contar unidades ahí dejaba
 * ofrecer el botón con tres de lo mismo, que es una apuesta que no existe.
 *
 * Sale del catálogo y no de un `3` escrito a mano, igual que sus hermanos: si
 * algún día entra una receta de dos ingredientes, esto se entera solo.
 */
export const TIPOS_MINIMOS = Math.min(
  ...RECETAS.map((r) => Object.keys(requisitosDe(r)).length)
);

/**
 * Cuánto entra en el caldero. Más que esto no se puede tirar.
 *
 * **No es tres.** Tres es el `MINIMO`, y de ahí salen los lugares vacíos que
 * muestra la cocina: lo que falta para que prender el fuego tenga sentido. El
 * tope es otra cosa: la receta más cara del catálogo. Las pociones llevan dos
 * unidades de cada ingrediente más una base, así que piden bastante más que
 * tres, y un tope de tres las volvería imposibles de armar.
 *
 * Sale de la misma cuenta que el mínimo, con `max` en lugar de `min`: si mañana
 * entra una receta más cara, el caldero se agranda solo.
 *
 * Existe para que no se pueda llenar la olla con veinte cosas: pasado el tope no
 * hay ninguna receta que pueda salir, así que tirar más es tirar al vacío.
 */
export const TOPE = Math.max(
  ...RECETAS.map((r) => Object.values(requisitosDe(r)).reduce((s, n) => s + n, 0))
);

/** Cuántas unidades hay en total. Sirve para ordenar y para saber si hay algo. */
export const cuanto = (m: Mezcla) => Object.values(m).reduce((s, n) => s + n, 0);

/** Suma uno, sin tocar el original. */
export const agregar = (m: Mezcla, id: string): Mezcla => ({ ...m, [id]: (m[id] ?? 0) + 1 });

/** Saca uno, y saca la llave si llega a cero para que comparar siga siendo fácil. */
export function quitar(m: Mezcla, id: string): Mezcla {
  const queda = (m[id] ?? 0) - 1;
  const salida = { ...m };
  if (queda > 0) salida[id] = queda;
  else delete salida[id];
  return salida;
}

const igual = (a: Mezcla, b: Mezcla) => {
  const claves = Object.keys(a);
  return claves.length === Object.keys(b).length && claves.every((k) => a[k] === b[k]);
};

/** Lo que hay adentro no pasa de lo que la receta pide en ninguna de sus cosas. */
const cabeEn = (m: Mezcla, pide: Mezcla) =>
  Object.keys(m).every((k) => m[k] <= (pide[k] ?? 0));

/**
 * Qué recetas todavía podrían salir con lo que hay adentro.
 *
 * Es lo que deja decir "tres recetas empiezan así" mientras se arma. Sin esto,
 * tirar cosas es a ciegas hasta el final, y ahí el error solo se descubre cuando
 * ya no queda nada por agregar.
 *
 * Con la olla vacía no devuelve las cincuenta y una: eso no es una pista, es el
 * catálogo. Devuelve nada, y la pantalla dice otra cosa.
 */
export const puedenSalir = (m: Mezcla): Receta[] =>
  vacia(m) ? [] : RECETAS.filter((r) => cabeEn(m, requisitosDe(r)));

/**
 * La receta que sale exactamente con lo que hay adentro, si hay alguna.
 *
 * Exacta y no "alcanza": de más tampoco sirve. Un caldero que ignora lo que
 * sobra te cobra ingredientes que no iban en la receta y no lo dice en ninguna
 * parte.
 */
export const saleDe = (m: Mezcla): Receta | null =>
  vacia(m) ? null : (RECETAS.find((r) => igual(m, requisitosDe(r))) ?? null);
