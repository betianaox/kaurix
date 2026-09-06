import type { CameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';

import { INGREDIENTES } from '../juego/ingredientes';
import { disponible, mirar } from './mirar';
import { objetivosCompletos } from './objetivos';
import type { Lectura } from './resolver';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * MIRAR SEGUIDO, SIN TITILAR
 * ───────────────────────────────────────────────────────────────────────────
 * Le pregunta a la cámara qué está viendo cada tanto y publica una respuesta
 * estable.
 *
 * ## Por qué hace falta suavizar
 *
 * Una lectura suelta es ruido. La mano tiembla, la luz cambia, el enfoque
 * respira: dos fotos seguidas del mismo frutero pueden dar `fruta` y después
 * `comida`, o `rojo` y después `tostado`. Si lo que ofrece el juego cambiara con
 * cada una, los ingredientes que aparecen bailarían solos y buscar dejaría de
 * sentirse como apuntar a algo.
 *
 * Por eso una lectura nueva **no manda**: hace falta que se repita.
 *
 * ## Y por qué el suavizado es por escena y no por resultado
 *
 * Se podría suavizar el ingrediente final —"que salga tres veces la naranja"—
 * pero eso mezcla dos cosas: lo que la cámara ve, que es lo inestable, y lo que
 * el juego elige, que ya tiene su propio azar. Suavizando la lectura, el sorteo
 * de `resolver` sigue siendo libre y esto solo se ocupa de que el *contexto* sea
 * firme.
 */

/**
 * Cada cuánto se mira, en milisegundos.
 *
 * Aparece un ingrediente cada 3,8 segundos —`CADA` en `useIngredientes`—, así
 * que a 1,5 s hay dos o tres lecturas por aparición: suficiente para tener
 * acuerdo y no tanto como para gastar batería de más.
 */
const CADA = 1500;

/**
 * Cuántas lecturas seguidas tienen que coincidir antes de cambiar.
 *
 * Dos. Con una, titila; con tres, mover el teléfono del frutero a la maceta
 * tarda cuatro segundos y medio en tener efecto, y eso se siente como que la app
 * no responde.
 */
const ACUERDO = 2;

/**
 * Cuántas lecturas vacías seguidas hacen falta para dar el contexto por perdido.
 *
 * Más que las que hacen falta para cambiarlo: perder de vista lo que estabas
 * mirando durante un segundo —porque pasó una mano, porque se movió— no tiene
 * que borrar el contexto. Recién si de verdad dejaste de mirarlo se olvida.
 */
const PACIENCIA = 4;

/** Lo que se sabe de lo que la cámara está viendo. */
export type Contexto = {
  /** La lectura firme, o null si todavía no hay o se perdió. */
  lectura: Lectura | null;
  /** Si este binario puede reconocer algo. En Expo Go es false. */
  disponible: boolean;
};

/** Dos lecturas dicen lo mismo. */
function igual(a: Lectura, b: Lectura): boolean {
  if (a.tono !== b.tono) return false;
  if (a.escenas.length !== b.escenas.length) return false;
  return a.escenas.every((e) => b.escenas.includes(e));
}

/** Una lectura que no vio nada no sirve para nada. */
const vacia = (l: Lectura) => l.escenas.length === 0 && l.tono === null;

export function useReconocer(
  camara: React.RefObject<CameraView | null>,
  activo: boolean
): Contexto {
  const [lectura, setLectura] = useState<Lectura | null>(null);

  /** La última lectura cruda y cuántas veces seguidas dijo lo mismo. */
  const candidata = useRef<{ lectura: Lectura; veces: number } | null>(null);
  /** Cuántas lecturas seguidas no vieron nada. */
  const vacias = useRef(0);
  /** Evita que dos vueltas del reloj se pisen si una foto tarda de más. */
  const mirando = useRef(false);

  /**
   * En desarrollo, avisa si la tabla de objetivos quedó desalineada.
   *
   * Un id mal escrito no da ningún error: simplemente ese ingrediente no
   * aparece nunca, y eso es imposible de notar jugando. Por eso se chequea.
   */
  useEffect(() => {
    if (!__DEV__) return;
    const { faltan, sobran } = objetivosCompletos(INGREDIENTES.map((i) => i.id));
    if (faltan.length) console.warn('[reconocer] sin objetivo:', faltan.join(', '));
    if (sobran.length) console.warn('[reconocer] objetivo de un id que no existe:', sobran.join(', '));
  }, []);

  useEffect(() => {
    if (!activo || !disponible) {
      setLectura(null);
      candidata.current = null;
      vacias.current = 0;
      return;
    }

    let vivo = true;

    const reloj = setInterval(async () => {
      if (!vivo || mirando.current) return;
      const vista = camara.current;
      if (!vista) return;

      mirando.current = true;
      const nueva = await mirar(vista);
      mirando.current = false;
      if (!vivo) return;

      // No se pudo mirar. No cuenta para nada: una foto que fallo no es una
      // lectura vacia, es una lectura que no existe.
      if (!nueva) return;

      if (vacia(nueva)) {
        vacias.current += 1;
        if (vacias.current >= PACIENCIA) {
          candidata.current = null;
          setLectura(null);
        }
        return;
      }

      vacias.current = 0;

      const previa = candidata.current;
      if (previa && igual(previa.lectura, nueva)) {
        previa.veces += 1;
        if (previa.veces >= ACUERDO) setLectura(nueva);
      } else {
        candidata.current = { lectura: nueva, veces: 1 };
      }
    }, CADA);

    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, [activo, camara]);

  return { lectura, disponible };
}
