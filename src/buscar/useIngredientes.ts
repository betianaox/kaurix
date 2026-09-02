import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ingredienteAlAzar,
  type Ingrediente,
  type LugarId,
} from '../juego/ingredientes';

/**
 * Los ingredientes que van apareciendo mientras buscás.
 *
 * Es la otra mitad de lo que hace el botón de buscar: la misma cámara sirve
 * para encontrar criaturas y para juntar cosas. Por eso la pantalla se abre
 * siempre, incluso cuando ya tenés todas las criaturas que podés criar.
 *
 * **Todavía no mira lo que hay enfrente.** Aparecen en cualquier lado y cada
 * tanto, que alcanza para probar el circuito completo —encontrar, guardar,
 * verlo en el morral— sin depender del reconocimiento de imágenes. Cuando ese
 * exista, lo único que cambia es de dónde sale `lugar`: en vez de no pasarlo, se
 * le pasa lo que la cámara está viendo, y el sorteo se limita a los ingredientes
 * de ahí.
 */

/** Cada cuánto puede aparecer uno, en milisegundos. */
const CADA = 3800;

/** Cuánto se queda en pantalla antes de irse solo. */
const DURA = 6000;

/**
 * Cuántos puede haber a la vez.
 * Uno. Con dos en pantalla dejan de ser un hallazgo y pasan a ser una cosecha:
 * se juntan los dos sin mirar y encontrar algo no significa nada.
 */
const A_LA_VEZ = 1;

export type Hallazgo = {
  /** Único por aparición, no por ingrediente: pueden salir dos iguales. */
  id: string;
  ingrediente: Ingrediente;
  /** Dónde se dibuja, en proporción de la pantalla. */
  x: number;
  y: number;
  /**
   * Cuánto se agranda o achica respecto de su tamaño base, y cuánto se inclina.
   *
   * Sortear las dos cosas es lo que hace que no se lean como iconos de una
   * interfaz: dos ramitas idénticas, del mismo tamaño y perfectamente derechas,
   * se ven puestas ahí por un programa. Con un poco de desorden parecen cosas
   * que estaban tiradas.
   */
  escala: number;
  giro: number;
};

type Opciones = {
  activo: boolean;
  /** Qué está viendo la cámara, cuando se sepa. Limita el sorteo a ese lugar. */
  lugar?: LugarId;
  /** Se llama al tocarlo, para guardarlo. */
  onJuntar: (ingrediente: Ingrediente) => void;
};

export function useIngredientes({ activo, lugar, onJuntar }: Opciones) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);

  // El temporizador corre fuera del render y necesita lo último de las dos.
  const lugarRef = useRef(lugar);
  lugarRef.current = lugar;
  const juntarRef = useRef(onJuntar);
  juntarRef.current = onJuntar;

  useEffect(() => {
    if (!activo) {
      setHallazgos([]);
      return;
    }

    const reloj = setInterval(() => {
      setHallazgos((previos) => {
        if (previos.length >= A_LA_VEZ) return previos;

        const nuevo: Hallazgo = {
          id: `${Date.now()}`,
          ingrediente: ingredienteAlAzar(lugarRef.current),
          x: 0.14 + Math.random() * 0.72,
          // De la mitad para abajo: las cosas están apoyadas en algo, y el
          // suelo de lo que ve la cámara queda en la parte baja del cuadro. Uno
          // flotando en el cielo se lee pegoteado.
          y: 0.42 + Math.random() * 0.34,
          escala: 0.85 + Math.random() * 0.35,
          giro: -9 + Math.random() * 18,
        };

        // Se va solo si nadie lo toca: un ingrediente que espera para siempre
        // convierte la búsqueda en una lista de tareas quieta.
        setTimeout(() => {
          setHallazgos((h) => h.filter((x) => x.id !== nuevo.id));
        }, DURA);

        return [...previos, nuevo];
      });
    }, CADA);

    return () => clearInterval(reloj);
  }, [activo]);

  const juntar = useCallback((h: Hallazgo) => {
    setHallazgos((previos) => previos.filter((x) => x.id !== h.id));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    juntarRef.current(h.ingrediente);
  }, []);

  return { hallazgos, juntar };
}
