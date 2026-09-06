import { casillasDe } from '../album/casillas';
import { criaturas } from '../art';
import { azarCon, barajar, semillaDe } from './azar';
import { TRAMOS } from './crianza';
import { NIVELES, ORDEN_DE_VUELTAS } from './datos';
import { INGREDIENTES } from './ingredientes';
import { avanceDe, menuDe, pocionDe } from './menu';
import { COMIDAS_COMO_RECETA, POCIONES } from './recetas';
import { carta, type EnCrianza, type Guardado } from './guardado';

/**
 * La partida de demostración: el juego ya empezado, para poder mostrarlo.
 *
 * Un juego de colección recién instalado no se puede mostrar: la colección está
 * en sombras, el bolso vacío y el álbum son setenta y dos huecos. Nada de eso
 * está mal —es el arranque real y tiene que existir— pero no es lo que hay que
 * ver cuando alguien te presta dos minutos.
 *
 * Así que esto arma una partida a media máquina y la deja escrita al primer
 * arranque: cuatro criaturas —tres criándose y una ya crecida—, medio bolso y
 * las ocho hojas del álbum empezadas.
 *
 * ## Cómo se saca
 *
 * Cambiando `PRECARGA` a `__DEV__`: la precarga sigue viva mientras se
 * desarrolla y no sale nunca en un build de tienda. Es una línea y es el único
 * lugar donde hay que tocar; nada más del juego sabe que esto existe salvo la
 * llamada en `store.iniciar`.
 *
 * ## Por qué solo cuando no hay nada
 *
 * Se aplica **únicamente sobre una partida vacía**. Si pisara lo que hay, cada
 * arranque le borraría el progreso a quien esté jugando de verdad —incluido el
 * teléfono donde se prueba— y una partida de demostración no vale eso. Para
 * volver a verla, se limpian los datos de la app:
 *
 *     adb shell pm clear com.imagostack.kaurix
 *
 * ## Por qué con semilla
 *
 * El sorteo sale de `azar.ts` sembrado con un texto fijo, así que **todos los
 * teléfonos muestran la misma partida**. Una demo que cambia en cada instalación
 * no se puede ensayar: te preparás para mostrar una cocina que tiene los
 * ingredientes justos y en el teléfono del otro salió otra cosa.
 */

/**
 * Si la precarga corre.
 *
 * En `true` mientras se muestra el juego. Para que quede solo en desarrollo:
 * `export const PRECARGA = __DEV__;`
 */
export const PRECARGA = true;

/** La semilla. Cambiarla es sortear otra demo. */
const SEMILLA = 'kaurix.demo.1';

/**
 * Cuántas criaturas se están criando.
 *
 * Van **la primera y la última** sí o sí, y una del medio sorteada. Las dos
 * puntas porque son las que hay que poder mostrar: la primera es la del
 * tutorial, la que todo el mundo va a ver, y la última es la de la vuelta 8, la
 * que nadie llega a ver jugando dos minutos.
 */
const BICHOS = 3;

/**
 * La que ya está criada.
 *
 * Va una, y va **fuera de la crianza**: es la única forma de mostrar la ficha
 * de la criatura terminada —el retrato de la crecida y las tres etapas, huevo,
 * bebé y crecido, una al lado de la otra—, que es una pantalla distinta de la
 * de criar y no se ve nunca con la barra a medio llenar.
 *
 * El gato porque es la segunda de las ocho: la primera es la del tutorial y
 * tiene que quedar criándose, que es como la va a ver quien recién empieza.
 */
const CRECIDO = 'gato-bruma';

/** Qué proporción de cada cosa viene cargada. */
const PARTE = {
  ingredientes: 0.5,
  comidas: 0.5,
  pociones: 0.5,
  /** Por hoja, no sobre el álbum entero: las ocho tienen que verse empezadas. */
  cartas: 0.7,
};

/**
 * Cuántas unidades de cada cosa que toca.
 *
 * Los ingredientes van holgados a propósito: una receta pide hasta tres del
 * mismo, y un bolso con uno de cada cosa se ve lleno pero no deja cocinar nada,
 * que es justo lo que hay que poder mostrar.
 */
const CUANTAS = { ingredientes: [2, 6], comidas: [1, 3], pociones: [1, 2] };

/** Un entero entre los dos, inclusive. */
const entre = ([desde, hasta]: number[], azar: () => number) =>
  desde + Math.floor(azar() * (hasta - desde + 1));

/**
 * La partida está sin tocar.
 *
 * Se mira todo lo que el juego escribe al jugar, y no solo la crianza: alguien
 * que abrió, juntó dos ingredientes y cerró tiene la crianza vacía y una partida
 * que no hay que pisar.
 */
export function estaVacia(j: Guardado): boolean {
  return (
    j.crianza.length === 0 &&
    j.cartas.length === 0 &&
    j.completadas.length === 0 &&
    Object.keys(j.inventario.ingredientes).length === 0 &&
    Object.keys(j.inventario.comidas).length === 0 &&
    Object.keys(j.inventario.pociones).length === 0
  );
}

/** Reparte una parte de la lista, con cantidades, en la forma del inventario. */
function repartir<T extends { id: string }>(
  lista: readonly T[],
  parte: number,
  cuantas: number[],
  azar: () => number
): Record<string, number> {
  const cuantos = Math.round(lista.length * parte);
  const salida: Record<string, number> = {};
  for (const x of barajar(lista, azar).slice(0, cuantos)) {
    salida[x.id] = entre(cuantas, azar);
  }
  return salida;
}

/**
 * Las tres criaturas de la demo: la primera, la última y una del medio.
 *
 * En tres estados distintos y no las tres iguales, porque lo que hay que poder
 * mostrar es la escalera entera: una empezando, una a mitad de camino y una a
 * un paso del final. Con las tres en el mismo punto, la ficha de una es la
 * ficha de las tres.
 */
function elegirBichos(azar: () => number): string[] {
  const primera = criaturas[0].id;
  const ultima = criaturas[criaturas.length - 1].id;
  // Sin la crecida en el pozo: criándose y ya criada son dos estados y no
  // pueden ser la misma criatura. La colección la dibujaría de las dos formas.
  const medio = barajar(
    criaturas.slice(1, -1).map((c) => c.id).filter((id) => id !== CRECIDO),
    azar
  ).slice(0, BICHOS - 2);
  return [primera, ...medio, ultima];
}

/**
 * Una criatura en crianza, en el punto que se le pida.
 *
 * `tramo` y lo entregado van juntos: `avance` no se inventa, se calcula con
 * `avanceDe` sobre lo que pide el tramo. Un avance escrito a mano al lado de un
 * `entregado` que dice otra cosa es una barra que miente, y se nota apenas se le
 * da de comer una vez.
 */
function criando(
  criatura: string,
  nivel: number,
  tramo: number,
  entregar: number,
  pocion: boolean,
  ahora: number
): EnCrianza {
  const iso = new Date(ahora).toISOString();
  const pedidos = menuDe(criatura, Math.min(tramo, TRAMOS - 1), nivel);

  const entregado: Record<string, number> = {};
  for (const p of pedidos.slice(0, entregar)) entregado[p.receta.id] = p.cantidad;

  return {
    criatura,
    tramo,
    // En el último tramo ya no hay comida que entregar: lo que falta es la
    // poción, así que la barra va llena y el avance no aplica.
    avance: tramo >= TRAMOS ? 0 : avanceDe(pedidos, entregado),
    entregado: tramo >= TRAMOS ? {} : entregado,
    ultimaAtencion: iso,
    pocion,
    desde: iso,
  };
}

/**
 * Las cartas ganadas: seis de cada ocho acciones, en las ocho hojas.
 *
 * **La primera de la serie va siempre**, y el resto sorteado. Sin eso el sorteo
 * podía dejar la primera casilla vacía en varias hojas seguidas, y una hoja se
 * lee empezando por arriba a la izquierda: el hueco justo ahí la hace parecer
 * más vacía de lo que está.
 *
 * **Las doradas no se sortean.** Solo entra la de una hoja que quedó completa, y
 * con seis de ocho no queda ninguna. Una dorada suelta es una partida que no
 * pudo haber pasado: es lo único que no se gana con suerte.
 */
function cartasGanadas(azar: () => number): string[] {
  const salida: string[] = [];

  for (const criatura of ORDEN_DE_VUELTAS) {
    const acciones = casillasDe(criatura).filter((c) => c.tipo === 'accion');
    const cuantas = Math.round(acciones.length * PARTE.cartas);
    const [primera, ...resto] = acciones;

    salida.push(primera.llave);
    for (const c of barajar(resto, azar).slice(0, cuantas - 1)) salida.push(c.llave);
  }

  return salida;
}

/**
 * La partida de demostración, sobre una recién nacida.
 *
 * Recibe la partida nueva en vez de armarla acá para no pisar lo que ya se
 * resolvió mirando el teléfono: el idioma y la región son de quien lo tiene en
 * la mano, no de la demo.
 */
export function partidaDemo(base: Guardado, ahora = Date.now()): Guardado {
  const azar = azarCon(semillaDe(SEMILLA));
  const nivel = base.nivel;

  const bichos = elegirBichos(azar);
  /**
   * Las tres, en tres puntos distintos y **ninguna en cero**.
   *
   * Una barra vacía es indistinguible de una criatura que no se tocó nunca: no
   * muestra que la barra sube, que es lo único que hay que mostrar. Así que la
   * más atrasada arranca con un tramo empezado, no recién salida del cascarón.
   */
  const crianza = [
    // Empezada: el primer tramo con una entrega hecha.
    criando(bichos[0], nivel, 0, 1, false, ahora),
    // A mitad de camino: un tramo entero atrás y el siguiente empezado.
    criando(bichos[1], nivel, 1, 1, false, ahora),
    // Casi: en el último tramo, y sin la poción.
    //
    // **No con la barra llena y la poción tomada.** Ese estado no se sostiene
    // ni un segundo en una partida de verdad: es exactamente el momento en que
    // aparece el botón de que crezca, así que una criatura que arranca ahí es
    // una que se quedó a mitad de un toque. Y de paso deja el último paso por
    // hacer, que es el que conviene tener a mano para mostrarlo en vivo.
    criando(bichos[2], nivel, TRAMOS - 1, 0, false, ahora),
  ];

  const ingredientes = repartir(INGREDIENTES, PARTE.ingredientes, CUANTAS.ingredientes, azar);
  const comidas = repartir(COMIDAS_COMO_RECETA, PARTE.comidas, CUANTAS.comidas, azar);
  const pociones = repartir(POCIONES, PARTE.pociones, CUANTAS.pociones, azar);

  /**
   * Y además, lo que las tres piden.
   *
   * El sorteo del bolso no sabe nada de la crianza, así que puede dejar a las
   * tres criaturas pidiendo cosas que no están: una demo donde no se puede dar
   * de comer no muestra el juego, muestra las pantallas. Esto no reemplaza lo
   * sorteado, lo completa: si ya había, se deja lo que había.
   *
   * **A la primera se le carga el camino entero**: los tres tramos y su poción.
   * Es la única forma de mostrar la crianza de punta a punta sin depender de la
   * cocina ni de salir a buscar — se le da todo seguido y crece ahí mismo. A las
   * otras dos solo lo del tramo en curso, que es lo que hace falta para que la
   * ficha se pueda tocar y no para terminarlas.
   */
  for (const c of crianza) {
    const entera = c.criatura === crianza[0].criatura;

    // De su tramo hasta donde llegue: los que ya pasó no piden nada.
    const hasta = entera ? TRAMOS - 1 : c.tramo;
    for (let tramo = c.tramo; tramo <= hasta && tramo < TRAMOS; tramo++) {
      for (const p of menuDe(c.criatura, tramo, nivel)) {
        comidas[p.receta.id] = Math.max(comidas[p.receta.id] ?? 0, p.cantidad);
      }
    }

    // La poción abre el salto a adulto: va para la que tiene que poder
    // terminarse —la primera— y para la que quedó a un tramo del final.
    if (!c.pocion && (entera || c.tramo >= TRAMOS - 1)) {
      const p = pocionDe(c.criatura, nivel);
      if (p) pociones[p.receta.id] = Math.max(pociones[p.receta.id] ?? 0, p.cantidad);
    }
  }

  /**
   * La carta de la crecida va sí o sí.
   *
   * Criar una criatura es lo que gana su figurita, así que una ya criada sin la
   * carta en el álbum es una partida que no pudo haber pasado. El sorteo del
   * 70% no lo sabe: puede dejarla afuera.
   */
  const llaveCrecida = carta(CRECIDO, 'dormir');
  const cartas = cartasGanadas(azar);
  if (!cartas.includes(llaveCrecida)) cartas.push(llaveCrecida);

  return {
    ...base,
    crianza,
    completadas: [CRECIDO],
    cartas,
    inventario: { ingredientes, comidas, pociones },
  };
}
