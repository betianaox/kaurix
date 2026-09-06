import type { ImageSourcePropType } from 'react-native';

/**
 * Las comidas: el arte y con qué se arma cada una.
 *
 * Salen de dos láminas, la dulce y la salada, y **están mezcladas a propósito**.
 * Para el bicho son lo mismo —comida de tal nivel— y separarlas en dos cajones
 * obligaría a mirar en dos lados para responder la misma pregunta. Dentro de
 * cada nivel van primero las saladas y después las dulces, que es el orden en
 * que se cocina.
 *
 * ## La lógica de la lámina salada, aplicada a todo
 *
 * La lámina salada trajo la capa que a la dulce le faltaba: **la despensa**.
 * Con harina, azúcar, manteca y huevo las recetas se leen como cocina —una dona
 * lleva harina y azúcar, no tres frutas— y eso importa porque una receta que se
 * entiende se recuerda, y una que es un sorteo hay que ir a consultarla cada
 * vez.
 *
 * Por eso las recetas de los postres están rehechas: el arte es el mismo, lo
 * que cambia es qué llevan.
 *
 * ## Los panificados
 *
 * El pan y la tortilla **no son materia prima, son preparación**: son lo
 * primero que se hornea y lo que después hace de base. Que sean de nivel 1 y
 * que la hamburguesa sea pan más carne más lechuga es exactamente la regla de
 * "una simple más dos ingredientes", pero coincidiendo con cómo se cocina de
 * verdad. La escalera deja de ser una convención del juego.
 */

export type Nivel = 1 | 2 | 3;

export type Comida = {
  id: string;
  nombre: string;
  nivel: Nivel;
  /** Las saladas van antes que las dulces dentro de cada nivel. */
  dulce: boolean;
  /** La preparación de un nivel menos que hace de base. Solo en 2 y 3. */
  base?: string;
  /** Ingredientes sueltos: tres en nivel 1, dos en los otros. */
  lleva: string[];
  arte: ImageSourcePropType;
};

/**
 * El arte, con las rutas escritas enteras.
 *
 * No se puede armar la ruta con el id: el empaquetador de React Native resuelve
 * los `require` al compilar, mirando el texto literal.
 */
const ARTE: Record<string, ImageSourcePropType> = {
  'pan-molde': require('../../assets/comidas/pan-molde.webp'),
  'pan-hamburguesa': require('../../assets/comidas/pan-hamburguesa.webp'),
  'pan-pancho': require('../../assets/comidas/pan-pancho.webp'),
  tortilla: require('../../assets/comidas/tortilla.webp'),
  'papas-fritas': require('../../assets/comidas/papas-fritas.webp'),
  'sopa-verduras': require('../../assets/comidas/sopa-verduras.webp'),
  churrasco: require('../../assets/comidas/churrasco.webp'),
  'pollo-asado': require('../../assets/comidas/pollo-asado.webp'),
  sushi: require('../../assets/comidas/sushi.webp'),
  sandwich: require('../../assets/comidas/sandwich.webp'),
  hamburguesa: require('../../assets/comidas/hamburguesa.webp'),
  pancho: require('../../assets/comidas/pancho.webp'),
  taco: require('../../assets/comidas/taco.webp'),
  pasta: require('../../assets/comidas/pasta.webp'),
  'sopa-camarones': require('../../assets/comidas/sopa-camarones.webp'),
  pizza: require('../../assets/comidas/pizza.webp'),
  quiche: require('../../assets/comidas/quiche.webp'),
  'rol-canela': require('../../assets/comidas/rol-canela.webp'),
  'torta-arcoiris': require('../../assets/comidas/torta-arcoiris.webp'),
  'torta-chocolate': require('../../assets/comidas/torta-chocolate.webp'),
  'torta-zanahoria': require('../../assets/comidas/torta-zanahoria.webp'),
  'tarta-manzana': require('../../assets/comidas/tarta-manzana.webp'),
  'pastelito-cereza': require('../../assets/comidas/pastelito-cereza.webp'),
  'dona-confites': require('../../assets/comidas/dona-confites.webp'),

  'dona-nuez': require('../../assets/comidas/dona-nuez.webp'),
  'dona-rosada': require('../../assets/comidas/dona-rosada.webp'),
  'dona-caramelo': require('../../assets/comidas/dona-caramelo.webp'),
  'dona-menta': require('../../assets/comidas/dona-menta.webp'),
  'dona-arcoiris': require('../../assets/comidas/dona-arcoiris.webp'),
  'pastelito-frutilla': require('../../assets/comidas/pastelito-frutilla.webp'),
  'pastelito-moras': require('../../assets/comidas/pastelito-moras.webp'),
  'pastelito-confites': require('../../assets/comidas/pastelito-confites.webp'),
  'pastelito-arandanos': require('../../assets/comidas/pastelito-arandanos.webp'),
  'pastelito-miel': require('../../assets/comidas/pastelito-miel.webp'),
  'pastelito-rosado': require('../../assets/comidas/pastelito-rosado.webp'),
  'pastelito-naranja': require('../../assets/comidas/pastelito-naranja.webp'),
  'pastelito-frutos-rojos': require('../../assets/comidas/pastelito-frutos-rojos.webp'),
  'pastelito-flores': require('../../assets/comidas/pastelito-flores.webp'),
  'pastelito-perlas': require('../../assets/comidas/pastelito-perlas.webp'),
  'pastelito-jardin': require('../../assets/comidas/pastelito-jardin.webp'),
};

const receta = (
  id: string,
  nombre: string,
  nivel: Nivel,
  dulce: boolean,
  lleva: string[],
  base?: string
): Comida => ({ id, nombre, nivel, dulce, base, lleva, arte: ARTE[id] });

export const COMIDAS: Comida[] = [
  // ─── Nivel 1 ─────────────────────────────────────────────────────────────
  // Lo primero que se hornea. Son la base de casi todo lo de nivel 2.
  receta('pan-molde', 'Pan de molde', 1, false, ['harina', 'sal', 'aceite']),
  receta('pan-hamburguesa', 'Pan de hamburguesa', 1, false, ['harina', 'huevo', 'manteca']),
  receta('pan-pancho', 'Pan de pancho', 1, false, ['harina', 'sal', 'manteca']),
  receta('tortilla', 'Tortilla', 1, false, ['maiz', 'sal', 'aceite']),
  receta('papas-fritas', 'Papas fritas', 1, false, ['papa', 'aceite', 'sal']),
  receta('sopa-verduras', 'Sopa de verduras', 1, false, ['papa', 'apio', 'cebolla']),
  receta('churrasco', 'Churrasco', 1, false, ['bife', 'aceite-oliva', 'pimienta']),
  receta('pollo-asado', 'Pollo asado', 1, false, ['pollo', 'aceite', 'romero']),
  // EL SUSHI SE ARMA CON LO QUE YA HAY, y no con lo que traía la lámina.
  // Esa lámina venía con arroz, un nigiri de salmón y una hoja de alga, y los
  // tres se descartaron: el arroz es una manchita blanca sin forma, el alga un
  // cuadrado verde que en chico no se lee, y el nigiri NO ES MATERIA PRIMA —ya
  // es sushi—, asi que usarlo de ingrediente del sushi seria circular.
  //
  // Con tofu, palta y jengibre se lee igual de bien y no hace falta arte nuevo
  // mas que la palta. El tofu ademas existe de verdad en el sushi: el inari es
  // una bolsita de tofu frito. Y el jengibre cruza de las pociones a la cocina,
  // como ya lo hace el romero en el pollo asado.
  //
  // Se eligio tofu y no camarones a proposito: los camarones son el ingrediente
  // de cocina mas esquivo (peso 15) y tienen que seguir siendolo. Un nivel 1
  // que pide lo mas dificil del juego trabaria lo primero que se cocina.
  receta('sushi', 'Sushi', 1, false, ['tofu', 'palta', 'jengibre']),

  receta('torta-arcoiris', 'Torta arcoíris', 1, true, ['harina', 'azucar', 'manteca']),
  receta('rol-canela', 'Rol de canela', 1, true, ['harina', 'manteca', 'canela']),
  receta('torta-chocolate', 'Torta de chocolate', 1, true, ['chocolate', 'azucar', 'manteca']),
  receta('dona-nuez', 'Dona de nuez', 1, true, ['harina', 'huevo', 'azucar']),
  receta('dona-rosada', 'Dona rosada', 1, true, ['harina', 'azucar', 'frutilla']),
  receta('dona-caramelo', 'Dona de caramelo', 1, true, ['harina', 'manteca', 'banana']),
  receta('dona-menta', 'Dona de menta', 1, true, ['harina', 'aceite', 'kiwi']),
  receta('dona-arcoiris', 'Dona de arcoíris', 1, true, ['harina', 'huevo', 'uva']),
  receta('dona-confites', 'Dona de confites', 1, true, ['harina', 'manteca', 'naranja']),

  // ─── Nivel 2 ─────────────────────────────────────────────────────────────
  receta('sandwich', 'Sándwich', 2, false, ['palta', 'lechuga'], 'pan-molde'),
  receta('hamburguesa', 'Hamburguesa', 2, false, ['carne-picada', 'lechuga'], 'pan-hamburguesa'),
  receta('pancho', 'Pancho', 2, false, ['salchicha', 'mostaza'], 'pan-pancho'),
  receta('taco', 'Taco', 2, false, ['carne-desmenuzada', 'morron'], 'tortilla'),
  receta('pasta', 'Pasta', 2, false, ['tomate', 'aceite-oliva'], 'pan-molde'),
  receta('sopa-camarones', 'Sopa de camarones', 2, false, ['camarones', 'tofu'], 'sopa-verduras'),

  receta('tarta-manzana', 'Tarta de manzana', 2, true, ['manzana', 'canela'], 'pan-molde'),
  receta('torta-zanahoria', 'Torta de zanahoria', 2, true, ['zanahoria', 'coliflor'], 'torta-arcoiris'),
  receta('pastelito-frutilla', 'Pastelito de frutilla', 2, true, ['frutilla', 'manteca'], 'dona-rosada'),
  receta('pastelito-moras', 'Pastelito de moras', 2, true, ['arandanos', 'frambuesa'], 'dona-arcoiris'),
  receta('pastelito-confites', 'Pastelito de confites', 2, true, ['durazno', 'azucar'], 'dona-confites'),
  receta('pastelito-arandanos', 'Pastelito de arándanos', 2, true, ['arandanos', 'zucchini'], 'dona-menta'),
  receta('pastelito-miel', 'Pastelito de miel', 2, true, ['mango', 'champinon'], 'dona-caramelo'),
  receta('pastelito-rosado', 'Pastelito rosado', 2, true, ['sandia', 'boniato'], 'dona-rosada'),

  // ─── Nivel 3 ─────────────────────────────────────────────────────────────
  receta('pizza', 'Pizza', 3, false, ['queso', 'tomate'], 'pasta'),
  receta('quiche', 'Quiche', 3, false, ['huevo', 'espinaca'], 'pasta'),

  receta('pastelito-naranja', 'Pastelito de naranja', 3, true, ['naranja', 'maiz'], 'pastelito-confites'),
  receta('pastelito-frutos-rojos', 'Pastelito de frutos rojos', 3, true, ['pera', 'frambuesa'], 'pastelito-moras'),
  receta('pastelito-flores', 'Pastelito de flores', 3, true, ['brocoli', 'anana'], 'pastelito-miel'),
  receta('pastelito-perlas', 'Pastelito de perlas', 3, true, ['arvejas', 'azucar'], 'pastelito-frutilla'),
  receta('pastelito-jardin', 'Pastelito del jardín', 3, true, ['kale', 'lima'], 'pastelito-arandanos'),
  receta('pastelito-cereza', 'Pastelito de cereza', 3, true, ['frutilla', 'chocolate'], 'pastelito-rosado'),
];
