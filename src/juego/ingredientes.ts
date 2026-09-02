import type { ImageSourcePropType } from 'react-native';

/**
 * Los ingredientes y de dónde salen.
 *
 * Salen de la lámina de recetas, separados con `herramientas/recortar.js` y
 * normalizados con `herramientas/ingredientes.js`. De las 56 piezas de la
 * lámina quedan 24: hay repetidos entre recetas —que está bien, es lo que hace
 * que un sistema de combinación tenga sentido— y hay varios que a tamaño chico
 * son la misma mancha. De cada grupo parecido quedó uno.
 *
 * Para volver a generarlos, o para sumar una lámina nueva, está todo explicado
 * en `herramientas/ingredientes.js`.
 */

/**
 * Dónde vive un ingrediente.
 *
 * Es también la clase que va a tener que reconocer la cámara, así que son pocas
 * y bien distintas entre sí a propósito: cuantas más clases parecidas, peor
 * acierta. Cuatro es un número que un clasificador chico maneja bien.
 */
export const LUGARES = {
  planta: { nombre: 'Plantas', color: '#6FAE5A', familia: 'campo' },
  flor: { nombre: 'Flores', color: '#C77BA8', familia: 'campo' },
  tierra: { nombre: 'Tierra', color: '#A9793F', familia: 'campo' },
  piedra: { nombre: 'Piedras', color: '#7E92AE', familia: 'campo' },
  fruta: { nombre: 'Frutas', color: '#D9803F', familia: 'cocina' },
  verdura: { nombre: 'Verduras', color: '#5A9E6F', familia: 'cocina' },
  despensa: { nombre: 'Despensa', color: '#C9A46A', familia: 'cocina' },
  proteina: { nombre: 'Fiambrería', color: '#C4706E', familia: 'cocina' },
} as const;

/**
 * Las dos economías del juego.
 *
 * **Campo** —hierbas, flores, piedras— hace pociones, y se junta afuera.
 * **Cocina** —frutas y verduras— hace comidas y postres, y se junta apuntando a
 * comida de verdad: la frutera, la heladera, la mesa.
 *
 * Están separadas a propósito. Con las dos mezcladas hay más de cincuenta
 * ingredientes en el mismo sorteo y esperar el que te falta se vuelve una
 * lotería; separadas, nunca sorteás contra más de treinta. Y de paso el juego
 * pasa en dos lugares distintos y en dos momentos del día.
 */
export type Familia = 'campo' | 'cocina';

export const familiaDe = (lugar: LugarId): Familia => LUGARES[lugar].familia;

export type LugarId = keyof typeof LUGARES;

export const lugarIds = Object.keys(LUGARES) as LugarId[];

export const colorDeLugar = (lugar: LugarId) => LUGARES[lugar].color;

export type Ingrediente = {
  id: string;
  nombre: string;
  lugar: LugarId;
  /**
   * Qué tan seguido aparece, relativo a los demás.
   *
   * Más alto, más común. Las hierbas y las flores son el material de todos los
   * días; los minerales cuestan más, y hay tres que son de verdad esquivos. Las
   * recetas fáciles solo pueden pedir cosas comunes, o el tutorial se traba en
   * el primer paso.
   */
  peso: number;
  arte: ImageSourcePropType;
};

export const INGREDIENTES: Ingrediente[] = [
  // Hierbas: cuatro siluetas bien distintas —hoja ancha, aguja, plumosa y
  // gris— más las semillas. Son el material de todos los días.
  { id: 'albahaca', nombre: 'Albahaca', lugar: 'planta', peso: 100, arte: require('../../assets/ingredientes/albahaca.webp') },
  { id: 'romero', nombre: 'Romero', lugar: 'planta', peso: 100, arte: require('../../assets/ingredientes/romero.webp') },
  { id: 'perejil', nombre: 'Perejil', lugar: 'planta', peso: 95, arte: require('../../assets/ingredientes/perejil.webp') },
  { id: 'salvia', nombre: 'Salvia', lugar: 'planta', peso: 80, arte: require('../../assets/ingredientes/salvia.webp') },
  { id: 'hinojo', nombre: 'Hinojo', lugar: 'planta', peso: 70, arte: require('../../assets/ingredientes/hinojo.webp') },

  { id: 'manzanilla', nombre: 'Manzanilla', lugar: 'flor', peso: 100, arte: require('../../assets/ingredientes/manzanilla.webp') },
  { id: 'diente-de-leon', nombre: 'Diente de león', lugar: 'flor', peso: 100, arte: require('../../assets/ingredientes/diente-de-leon.webp') },
  { id: 'lavanda', nombre: 'Lavanda', lugar: 'flor', peso: 85, arte: require('../../assets/ingredientes/lavanda.webp') },
  { id: 'sauco', nombre: 'Saúco', lugar: 'flor', peso: 75, arte: require('../../assets/ingredientes/sauco.webp') },
  { id: 'brezo', nombre: 'Brezo', lugar: 'flor', peso: 60, arte: require('../../assets/ingredientes/brezo.webp') },
  { id: 'petalos', nombre: 'Pétalos de rosa', lugar: 'flor', peso: 55, arte: require('../../assets/ingredientes/petalos.webp') },
  { id: 'hibisco-rojo', nombre: 'Hibisco rojo', lugar: 'flor', peso: 45, arte: require('../../assets/ingredientes/hibisco-rojo.webp') },
  { id: 'hibisco-violeta', nombre: 'Hibisco violeta', lugar: 'flor', peso: 40, arte: require('../../assets/ingredientes/hibisco-violeta.webp') },

  { id: 'jengibre', nombre: 'Jengibre', lugar: 'tierra', peso: 70, arte: require('../../assets/ingredientes/jengibre.webp') },
  { id: 'ajo', nombre: 'Ajo', lugar: 'tierra', peso: 65, arte: require('../../assets/ingredientes/ajo.webp') },

  // Minerales: uno por color, que es lo único que se distingue en chico.
  { id: 'arenisca', nombre: 'Arenisca', lugar: 'piedra', peso: 70, arte: require('../../assets/ingredientes/arenisca.webp') },
  { id: 'pirita', nombre: 'Pirita', lugar: 'piedra', peso: 55, arte: require('../../assets/ingredientes/pirita.webp') },
  { id: 'jade', nombre: 'Jade', lugar: 'piedra', peso: 45, arte: require('../../assets/ingredientes/jade.webp') },
  { id: 'amatista', nombre: 'Amatista', lugar: 'piedra', peso: 40, arte: require('../../assets/ingredientes/amatista.webp') },
  { id: 'citrino', nombre: 'Citrino', lugar: 'piedra', peso: 35, arte: require('../../assets/ingredientes/citrino.webp') },
  { id: 'lapislazuli', nombre: 'Lapislázuli', lugar: 'piedra', peso: 30, arte: require('../../assets/ingredientes/lapislazuli.webp') },

  // Los tres esquivos: son los que van a pedir las criaturas difíciles y los
  // últimos tramos de la barra.
  { id: 'piedra-luna', nombre: 'Piedra luna', lugar: 'piedra', peso: 16, arte: require('../../assets/ingredientes/piedra-luna.webp') },
  { id: 'rubi', nombre: 'Rubí', lugar: 'piedra', peso: 12, arte: require('../../assets/ingredientes/rubi.webp') },
  { id: 'obsidiana', nombre: 'Obsidiana', lugar: 'piedra', peso: 10, arte: require('../../assets/ingredientes/obsidiana.webp') },

  // --- Cocina: lo que hace comidas y postres --------------------------------
  { id: 'manzana', nombre: 'Manzana', lugar: 'fruta', peso: 100, arte: require('../../assets/cocina/manzana.webp') },
  { id: 'banana', nombre: 'Banana', lugar: 'fruta', peso: 100, arte: require('../../assets/cocina/banana.webp') },
  { id: 'naranja', nombre: 'Naranja', lugar: 'fruta', peso: 95, arte: require('../../assets/cocina/naranja.webp') },
  { id: 'tomate', nombre: 'Tomate', lugar: 'fruta', peso: 95, arte: require('../../assets/cocina/tomate.webp') },
  { id: 'pera', nombre: 'Pera', lugar: 'fruta', peso: 85, arte: require('../../assets/cocina/pera.webp') },
  { id: 'frutilla', nombre: 'Frutilla', lugar: 'fruta', peso: 75, arte: require('../../assets/cocina/frutilla.webp') },
  { id: 'uva', nombre: 'Uva', lugar: 'fruta', peso: 70, arte: require('../../assets/cocina/uva.webp') },
  { id: 'durazno', nombre: 'Durazno', lugar: 'fruta', peso: 65, arte: require('../../assets/cocina/durazno.webp') },
  { id: 'lima', nombre: 'Lima', lugar: 'fruta', peso: 60, arte: require('../../assets/cocina/lima.webp') },
  { id: 'kiwi', nombre: 'Kiwi', lugar: 'fruta', peso: 50, arte: require('../../assets/cocina/kiwi.webp') },
  { id: 'arandanos', nombre: 'Arándanos', lugar: 'fruta', peso: 45, arte: require('../../assets/cocina/arandanos.webp') },
  { id: 'frambuesa', nombre: 'Frambuesa', lugar: 'fruta', peso: 40, arte: require('../../assets/cocina/frambuesa.webp') },
  { id: 'sandia', nombre: 'Sandía', lugar: 'fruta', peso: 35, arte: require('../../assets/cocina/sandia.webp') },
  { id: 'mango', nombre: 'Mango', lugar: 'fruta', peso: 25, arte: require('../../assets/cocina/mango.webp') },
  { id: 'anana', nombre: 'Ananá', lugar: 'fruta', peso: 18, arte: require('../../assets/cocina/anana.webp') },

  { id: 'papa', nombre: 'Papa', lugar: 'verdura', peso: 100, arte: require('../../assets/cocina/papa.webp') },
  { id: 'cebolla', nombre: 'Cebolla', lugar: 'verdura', peso: 100, arte: require('../../assets/cocina/cebolla.webp') },
  { id: 'zanahoria', nombre: 'Zanahoria', lugar: 'verdura', peso: 95, arte: require('../../assets/cocina/zanahoria.webp') },
  { id: 'zucchini', nombre: 'Zucchini', lugar: 'verdura', peso: 80, arte: require('../../assets/cocina/zucchini.webp') },
  // La palta es fruta de verdad, pero en el juego "Frutas" son todas dulces y
  // al lado de la frutilla desentona. Entra por lo que se hace con ella.
  { id: 'palta', nombre: 'Palta', lugar: 'verdura', peso: 75, arte: require('../../assets/cocina/palta.webp') },
  { id: 'espinaca', nombre: 'Espinaca', lugar: 'verdura', peso: 80, arte: require('../../assets/cocina/espinaca.webp') },
  { id: 'apio', nombre: 'Apio', lugar: 'verdura', peso: 70, arte: require('../../assets/cocina/apio.webp') },
  { id: 'morron', nombre: 'Morrón', lugar: 'verdura', peso: 65, arte: require('../../assets/cocina/morron.webp') },
  { id: 'brocoli', nombre: 'Brócoli', lugar: 'verdura', peso: 60, arte: require('../../assets/cocina/brocoli.webp') },
  { id: 'choclo', nombre: 'Choclo', lugar: 'verdura', peso: 55, arte: require('../../assets/cocina/choclo.webp') },
  { id: 'arvejas', nombre: 'Arvejas', lugar: 'verdura', peso: 50, arte: require('../../assets/cocina/arvejas.webp') },
  { id: 'boniato', nombre: 'Boniato', lugar: 'verdura', peso: 45, arte: require('../../assets/cocina/boniato.webp') },
  { id: 'kale', nombre: 'Kale', lugar: 'verdura', peso: 40, arte: require('../../assets/cocina/kale.webp') },
  { id: 'champinon', nombre: 'Champiñón', lugar: 'verdura', peso: 30, arte: require('../../assets/cocina/champinon.webp') },
  { id: 'coliflor', nombre: 'Coliflor', lugar: 'verdura', peso: 22, arte: require('../../assets/cocina/coliflor.webp') },
  { id: 'lechuga', nombre: 'Lechuga', lugar: 'verdura', peso: 90, arte: require('../../assets/salado/lechuga.webp') },

  /*
   * La despensa.
   *
   * Es la capa que a las primeras láminas les faltaba, y la que hace que las
   * recetas se lean como cocina en vez de como un sorteo: una dona lleva harina
   * y azúcar, no tres frutas.
   *
   * Va con los pesos más altos del juego a propósito. Entra en casi todas las
   * recetas, así que si costara conseguirla trabaría todo; y de paso arma dos
   * capas — una base de cosas comunes que siempre hacen falta, y una punta de
   * cosas específicas que se buscan a propósito.
   */
  { id: 'harina', nombre: 'Harina', lugar: 'despensa', peso: 130, arte: require('../../assets/salado/harina.webp') },
  { id: 'azucar', nombre: 'Azúcar', lugar: 'despensa', peso: 130, arte: require('../../assets/salado/azucar.webp') },
  { id: 'sal', nombre: 'Sal', lugar: 'despensa', peso: 125, arte: require('../../assets/salado/sal.webp') },
  { id: 'aceite', nombre: 'Aceite', lugar: 'despensa', peso: 120, arte: require('../../assets/salado/aceite.webp') },
  { id: 'manteca', nombre: 'Manteca', lugar: 'despensa', peso: 115, arte: require('../../assets/salado/manteca.webp') },
  { id: 'huevo', nombre: 'Huevo', lugar: 'despensa', peso: 110, arte: require('../../assets/salado/huevo.webp') },
  { id: 'queso', nombre: 'Queso', lugar: 'despensa', peso: 90, arte: require('../../assets/salado/queso.webp') },
  { id: 'pimienta', nombre: 'Pimienta', lugar: 'despensa', peso: 85, arte: require('../../assets/salado/pimienta.webp') },
  { id: 'aceite-oliva', nombre: 'Aceite de oliva', lugar: 'despensa', peso: 70, arte: require('../../assets/salado/aceite-oliva.webp') },
  { id: 'mostaza', nombre: 'Mostaza', lugar: 'despensa', peso: 65, arte: require('../../assets/salado/mostaza.webp') },
  { id: 'canela', nombre: 'Canela', lugar: 'despensa', peso: 55, arte: require('../../assets/salado/canela.webp') },
  { id: 'chocolate', nombre: 'Chocolate', lugar: 'despensa', peso: 45, arte: require('../../assets/salado/chocolate.webp') },

  // Las proteínas: lo más caro de la cocina, como corresponde.
  { id: 'tofu', nombre: 'Tofu', lugar: 'proteina', peso: 60, arte: require('../../assets/salado/tofu.webp') },
  { id: 'salchicha', nombre: 'Salchicha', lugar: 'proteina', peso: 55, arte: require('../../assets/salado/salchicha.webp') },
  { id: 'carne-picada', nombre: 'Carne picada', lugar: 'proteina', peso: 45, arte: require('../../assets/salado/carne-picada.webp') },
  { id: 'pollo', nombre: 'Pollo', lugar: 'proteina', peso: 40, arte: require('../../assets/salado/pollo.webp') },
  { id: 'carne-desmenuzada', nombre: 'Carne desmenuzada', lugar: 'proteina', peso: 30, arte: require('../../assets/salado/carne-desmenuzada.webp') },
  { id: 'bife', nombre: 'Bife', lugar: 'proteina', peso: 22, arte: require('../../assets/salado/bife.webp') },
  { id: 'camarones', nombre: 'Camarones', lugar: 'proteina', peso: 15, arte: require('../../assets/salado/camarones.webp') },
];

export const ingredientePorId = (id: string) => INGREDIENTES.find((i) => i.id === id);

/**
 * Compara nombres ignorando mayúsculas y acentos.
 *
 * Sin esto, buscar "rubi" no encuentra "Rubí", que es exactamente lo que
 * alguien va a escribir.
 */
export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '');

/**
 * Sortea un ingrediente por peso.
 *
 * Si viene un lugar, sortea solo entre los de ahí. Cuando esté el
 * reconocimiento de imágenes, el lugar lo va a decidir lo que ve la cámara;
 * hasta entonces sale de cualquier lado.
 */
export function ingredienteAlAzar(
  lugar?: LugarId,
  azar: () => number = Math.random
): Ingrediente {
  const pozo = lugar ? INGREDIENTES.filter((i) => i.lugar === lugar) : INGREDIENTES;
  return sortear(pozo, azar);
}

/** Igual, pero limitado a una de las dos economías. */
export function ingredienteDeFamilia(
  familia: Familia,
  azar: () => number = Math.random
): Ingrediente {
  return sortear(
    INGREDIENTES.filter((i) => familiaDe(i.lugar) === familia),
    azar
  );
}

export const deFamilia = (familia: Familia) =>
  INGREDIENTES.filter((i) => familiaDe(i.lugar) === familia);

function sortear(pozo: Ingrediente[], azar: () => number): Ingrediente {
  const total = pozo.reduce((s, i) => s + i.peso, 0);
  let tirada = azar() * total;
  for (const i of pozo) {
    tirada -= i.peso;
    if (tirada <= 0) return i;
  }
  return pozo[pozo.length - 1];
}
