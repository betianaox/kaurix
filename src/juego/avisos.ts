import { albumCompleto } from '../album/sorteo';
import type { Guardado } from './guardado';
import { pendientesDe } from './sendero';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ HAY PARA HACER AHORA MISMO
 * ───────────────────────────────────────────────────────────────────────────
 * Lo que cuenta el globo de la campana y lo que muestra la hoja de avisos. Vive
 * en su propio módulo porque mira dos cosas que no se conocen entre sí —el
 * camino de los días y el álbum— y ninguna de las dos puede preguntarle a la
 * otra sin que se importen en círculo.
 *
 * ## Terminar el juego tapa todo lo demás
 *
 * Con el álbum lleno hay **un solo aviso**, y es ese. El camino de los días no
 * se muestra aunque tenga premio esperando: la escalera existe para empujar a
 * seguir criando, y a quien ya crió las sesenta y cuatro no le queda nada que
 * empujar. Ofrecerle tres frutillas al lado del cartel que dice que terminó el
 * juego le baja el final a un ítem de lista.
 *
 * Los premios del camino no se pierden: al empezar de nuevo la escalera vuelve
 * a estar ahí, en el escalón donde había quedado.
 */

/** Si el álbum está entero. Es el final del juego. */
export const juegoTerminado = (j: Guardado): boolean => albumCompleto(j.cartas);

/**
 * Cuántos avisos hay, para el globo de la campana.
 *
 * Terminar el juego es **uno**, no uno más: reemplaza a lo que hubiera. Ver
 * arriba por qué.
 */
export const avisosDe = (j: Guardado, ahora = Date.now()): number =>
  juegoTerminado(j) ? 1 : pendientesDe(j.sendero, ahora);
