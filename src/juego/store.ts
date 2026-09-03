import { create } from 'zustand';

import { conElTiempo, listoParaAdulto, recienNacida, MAX_CRIANZA, TRAMOS } from './crianza';
import { NIVELES, TUTORIAL } from './datos';
import { avanceDe, faltanDe, menuDe, pocionDe, tramoCompleto, type Pedido } from './menu';
import { cuanto, saleDe, type Mezcla } from './caldero';
import type { CodigoIdioma } from '../i18n/idiomas';
import type { Region } from '../i18n/region';
import { multiplicadorDe, nuevoImpulso, puedeGirarGratis } from './ruleta';
import { recetaPorId, type Receta } from './recetas';
import { ingredientePorId } from './ingredientes';
import {
  carta,
  cargar as leer,
  guardar as escribir,
  partidaNueva,
  LEGENDARIA,
  type Guardado,
} from './guardado';
import { criaturas } from '../art';

/**
 * El estado del juego en memoria, y lo único que puede modificarlo.
 *
 * Cada cambio se persiste enseguida. Es un objeto chico y se guarda entero, así
 * que no hay razón para juntar escrituras: el riesgo de perder lo último que
 * hizo alguien porque la app se cerró antes de tiempo es mucho peor que el
 * costo de escribir un JSON de unos pocos kilobytes.
 */

type Estado = {
  /** Falso hasta que se leyó el disco. Antes de eso no hay que dibujar nada. */
  cargado: boolean;
  juego: Guardado;

  iniciar: () => Promise<void>;

  /** Sale del cascarón y entra en crianza. */
  nacer: (criatura: string) => void;
  /**
   * Le da una preparación de las que pide el tramo en curso.
   *
   * Es una sola operación y no varias sueltas —descontar del morral, anotar la
   * entrega, mover la barra— porque las tres tienen que pasar juntas o ninguna.
   * Si se pudieran llamar por separado, un toque a destiempo dejaría una comida
   * descontada sin haber avanzado nada.
   */
  dar: (criatura: string, receta: string) => void;
  /** Cierra la crianza: gana la carta y, si completó el nivel, pasa de vuelta. */
  volverAdulto: (criatura: string) => void;

  /**
   * Prende el fuego: gasta todo lo que hay en el caldero.
   *
   * Si la mezcla es exactamente una receta, sale esa preparación. **Si no, se
   * pierde igual**: cargar la olla es gratis y se puede deshacer, prender el
   * fuego es la decisión que se cobra.
   *
   * Devuelve qué salió, o `null` si se quemó, para que la pantalla lo pueda
   * contar. El estado ya está guardado cuando vuelve.
   */
  cocinar: (mezcla: Mezcla) => Receta | null;

  /**
   * Cambia el idioma de la app.
   *
   * Va al guardado como cualquier otra cosa: es una elección de la persona, y
   * tiene que sobrevivir a cerrar la app. Desde que se toca esto, el idioma del
   * teléfono no vuelve a opinar.
   */
  setIdioma: (idioma: CodigoIdioma) => void;
  /**
   * Cambia de qué región se usan los nombres.
   *
   * Existe porque la detección puede errar y porque hay a quien simplemente le
   * gusta más otra forma. Elegida a mano, gana sobre cualquier señal del
   * teléfono y no se vuelve a preguntar.
   */
  setRegion: (region: Region) => void;
  /**
   * Gira la ruleta y deja impulsada a la criatura que salga.
   *
   * Quien llama decide en qué cae —la animación tiene que terminar donde el
   * dibujo se detuvo, no donde el store hubiera sorteado por su cuenta— y acá
   * solo se anota el resultado.
   *
   * `gratis` distingue el giro diario del que se paga con un video: el diario
   * consume el del día, el del video no. Sin esa distinción, mirar un anuncio
   * te gastaría el giro gratis de mañana.
   */
  girar: (criatura: string, gratis: boolean) => void;

  /** Suma lo encontrado con la cámara. */
  sumarIngrediente: (id: string, cantidad?: number) => void;
};

/** Hay lugar para empezar otra criatura. */
export const hayLugar = (j: Guardado) => j.crianza.length < MAX_CRIANZA;

/** El tutorial no decrece nunca: nadie tiene que aprender la mecánica perdiendo. */
const inmune = (criatura: string) => criatura === TUTORIAL;

export const useJuego = create<Estado>((set, get) => {
  /** Aplica un cambio y lo deja escrito. */
  function aplicar(cambio: (j: Guardado) => Guardado) {
    const juego = cambio(get().juego);
    set({ juego });
    // No se espera: si falla, lo peor que pasa es que se pierde el último
    // movimiento, y bloquear la interfaz por una escritura de disco se nota.
    void escribir(juego);
  }

  /** El mismo cambio, aplicado a una criatura de la lista de crianza. */
  function enCrianza(criatura: string, cambio: (c: Guardado['crianza'][number]) => Guardado['crianza'][number]) {
    aplicar((j) => ({
      ...j,
      crianza: j.crianza.map((c) => (c.criatura === criatura ? cambio(c) : c)),
    }));
  }

  return {
    cargado: false,
    juego: partidaNueva(),

    async iniciar() {
      // Arranca igual si el disco falla. Antes de `cargado` no se dibuja nada,
      // así que cualquier error acá dejaba la app abierta en negro y sin decir
      // por qué; perder el guardado es malo, no abrir nunca más es peor.
      let guardado: Guardado;
      try {
        guardado = await leer();
      } catch (e) {
        console.warn('kaurix: no se pudo leer el guardado', e);
        guardado = partidaNueva();
      }

      // El tiempo que pasó con la app cerrada se cobra acá, una sola vez, al
      // abrir. Es lo que hace que la barra baje sin ningún temporizador
      // corriendo.
      const ahora = Date.now();
      const juego: Guardado = {
        ...guardado,
        crianza: guardado.crianza.map((c) => conElTiempo(c, inmune(c.criatura), ahora)),
        visto: new Date(ahora).toISOString(),
      };

      set({ juego, cargado: true });
      void escribir(juego);
    },

    nacer(criatura) {
      aplicar((j) => {
        if (!hayLugar(j) || j.crianza.some((c) => c.criatura === criatura)) return j;
        return { ...j, crianza: [...j.crianza, recienNacida(criatura)] };
      });
    },

    /**
     * Le da una preparación.
     *
     * Solo acepta lo que pide **el tramo en curso**: tener cubierto un tramo de
     * más adelante es stock guardado, no un permiso para saltear.
     *
     * Y descuenta del morral, porque la misma preparación puede servirle a otro
     * bicho o ser la base de una receta más cara. Darla es elegir gastarla acá y
     * no allá; si la barra subiera sola al cocinar, esa decisión no existiría.
     */
    dar(criatura, receta) {
      aplicar((j) => {
        const c = j.crianza.find((x) => x.criatura === criatura);
        if (!c) return j;

        // Qué pide ahora: el tramo en curso, o la poción si ya pasó los tres.
        const pedidos =
          c.tramo < TRAMOS
            ? menuDe(criatura, c.tramo, j.nivel)
            : ([pocionDe(criatura, j.nivel)].filter(Boolean) as Pedido[]);

        const pedido = pedidos.find((p) => p.receta.id === receta);
        if (!pedido || faltanDe(pedido, c.entregado) <= 0) return j;

        const esPocion = pedido.receta.clase === 'pocion';
        const bolsa = esPocion ? j.inventario.pociones : j.inventario.comidas;
        if ((bolsa[receta] ?? 0) <= 0) return j;

        // EL IMPULSO DE LA RULETA ENTRA ACA. Una entrega cuenta por dos
        // mientras dura, así que el tramo que pedía cuatro preparaciones se
        // llena con dos. Multiplicar lo entregado y no el avance es lo que hace
        // que se propague solo: `avanceDe` y `tramoCompleto` leen esto mismo,
        // y la pantalla muestra el salto sin enterarse de que hubo un impulso.
        const cuenta = multiplicadorDe(j.impulso, criatura);
        const entregado = { ...c.entregado, [receta]: (c.entregado[receta] ?? 0) + cuenta };
        const completo = tramoCompleto(pedidos, entregado);
        const ahora = new Date().toISOString();

        const despues =
          c.tramo < TRAMOS
            ? completo
              ? // Sube de tramo y arranca de cero: lo entregado no se arrastra.
                { ...c, tramo: c.tramo + 1, avance: 0, entregado: {}, ultimaAtencion: ahora }
              : { ...c, avance: avanceDe(pedidos, entregado), entregado, ultimaAtencion: ahora }
            : { ...c, entregado, pocion: completo, ultimaAtencion: ahora };

        const menos = { ...bolsa, [receta]: bolsa[receta] - 1 };

        return {
          ...j,
          crianza: j.crianza.map((x) => (x.criatura === criatura ? despues : x)),
          inventario: esPocion
            ? { ...j.inventario, pociones: menos }
            : { ...j.inventario, comidas: menos },
        };
      });
    },

    volverAdulto(criatura) {
      aplicar((j) => {
        const c = j.crianza.find((x) => x.criatura === criatura);
        if (!c || !listoParaAdulto(c)) return j;

        const completadas = [...j.completadas, criatura];
        const cartas = [...j.cartas, carta(j.nivel, criatura)];
        const crianza = j.crianza.filter((x) => x.criatura !== criatura);

        // ¿Cerró el nivel? Entra la legendaria y todo vuelve a empezar más
        // caro, con el álbum de otro color.
        if (completadas.length < criaturas.length) {
          return { ...j, crianza, completadas, cartas };
        }

        return {
          ...j,
          crianza,
          cartas: [...cartas, carta(j.nivel, LEGENDARIA)],
          completadas: [],
          // En la última vuelta el álbum está lleno y el nivel no avanza más:
          // se queda ahí en vez de desbordar a un nivel nueve que no existe.
          nivel: Math.min(NIVELES, j.nivel + 1),
        };
      });
    },

    /**
     * Arma una receta.
     *
     * **La base se consume**, igual que los ingredientes: una pizza es una pasta
     * transformada, no una pasta más queso al lado. Si la base sobreviviera, la
     * escalera de tres niveles saldría al precio de uno y armar la de nivel 1 una
     * sola vez alcanzaría para siempre.
     *
     * Lo que se descuenta sale de `faltantesDe`, que es lo mismo que dibuja la
     * ayuda. Así no hay dos listas de lo que lleva una receta, que es como
     * terminan cobrándose cosas que la pantalla no mostraba.
     */
    /**
     * Prende el fuego.
     *
     * **Se gasta todo lo que hay adentro, salga algo o no.** Cargar la olla es
     * gratis y se deshace; prender el fuego es la decision que se cobra. Sin
     * eso, tirar cualquier cosa no cuesta nada y el caldero es una calculadora
     * con la respuesta puesta al lado.
     *
     * La comprobacion de stock va entera antes de tocar nada: o se gasta todo o
     * no se gasta ninguno. A medio descontar es peor que no cocinar.
     */
    cocinar(mezcla) {
      const j = get().juego;
      if (cuanto(mezcla) <= 0) return null;

      const ingredientes = { ...j.inventario.ingredientes };
      const comidas = { ...j.inventario.comidas };
      const pociones = { ...j.inventario.pociones };

      for (const [id, cuantos] of Object.entries(mezcla)) {
        if (cuantos <= 0) continue;
        const bolsa = ingredientePorId(id)
          ? ingredientes
          : recetaPorId(id)?.clase === 'pocion'
            ? pociones
            : recetaPorId(id)
              ? comidas
              : null;
        // Algo que no es ni ingrediente ni receta no puede estar en la olla; si
        // llego hasta aca, es un error de programa y no se cobra nada.
        if (!bolsa || (bolsa[id] ?? 0) < cuantos) return null;
        bolsa[id] -= cuantos;
      }

      const sale = saleDe(mezcla);
      if (sale) {
        if (sale.clase === 'pocion') pociones[sale.id] = (pociones[sale.id] ?? 0) + 1;
        else comidas[sale.id] = (comidas[sale.id] ?? 0) + 1;
      }

      aplicar((actual) => ({ ...actual, inventario: { ingredientes, comidas, pociones } }));
      return sale;
    },

    setRegion(region) {
      aplicar((j) => ({ ...j, region }));
    },
    girar(criatura, gratis) {
      aplicar((j) => {
        // El giro gratis solo si de verdad queda uno: la pantalla ya lo
        // controla, pero el store no puede confiar en que se lo pregunten.
        if (gratis && !puedeGirarGratis(j.ultimoGiro)) return j;
        const ahora = Date.now();
        return {
          ...j,
          // UN IMPULSO PISA AL OTRO. Si se sumaran, diez videos dejarían a los
          // bichos al doble para siempre y el sistema dejaría de significar algo.
          impulso: nuevoImpulso(criatura, ahora),
          ultimoGiro: gratis ? new Date(ahora).toISOString() : j.ultimoGiro,
        };
      });
    },
    setIdioma(idioma) {
      aplicar((j) => ({ ...j, idioma }));
    },

    sumarIngrediente(id, cantidad = 1) {
      aplicar((j) => ({
        ...j,
        inventario: {
          ...j.inventario,
          ingredientes: {
            ...j.inventario.ingredientes,
            [id]: (j.inventario.ingredientes[id] ?? 0) + cantidad,
          },
        },
      }));
    },
  };
});
