import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Ingrediente } from '../juego/ingredientes';

/**
 * Los ingredientes que van apareciendo mientras buscás.
 *
 * Es la otra mitad de lo que hace el botón de buscar: la misma cámara sirve
 * para encontrar criaturas y para juntar cosas. Por eso la pantalla se abre
 * siempre, incluso cuando ya tenés todas las criaturas que podés criar.
 *
 * ## Qué aparece
 *
 * Lo decide `elegir`, que se recibe ya armada. Cuándo cae al sorteo libre y
 * cuándo no aparece nada se decide en `Buscar`, que es quien sabe si este
 * binario trae el reconocedor; acá `null` significa siempre lo mismo: este
 * turno no aparece nada.
 *
 * Este archivo no sabe nada de cámaras ni de modelos: recibe una función y la
 * llama. Ver `useReconocer` y `resolver`, y el plan en
 * `../docs/kaurix-reconocer-el-lugar.md`.
 */

/** Cada cuánto puede aparecer uno, en milisegundos. */
export const CADA = 3800;

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
  /**
   * Qué ingrediente toca ahora, o `null` si no hay nada que corresponda con lo
   * que la cámara está viendo.
   *
   * Se pasa como función y no como valor porque se llama en el momento de la
   * aparición: entre que se monta la pantalla y que aparece el ingrediente
   * pasan segundos, y lo que la cámara ve pudo haber cambiado tres veces.
   *
   * Devolver `null` es una respuesta válida: no aparece nada. Es lo que hace
   * que apuntar a una pared blanca no regale ingredientes.
   */
  elegir: () => Ingrediente | null;
  /**
   * Cada cuánto aparece uno, si no es el ritmo de siempre.
   *
   * Lo usa `Buscar` para espaciarlos mientras hay una criatura dada vuelta: ahí
   * lo que se está haciendo es seguirla, y un ingrediente cada tres segundos y
   * medio se lleva el ojo. Espaciados siguen apareciendo, pero como algo que
   * pasa mientras buscás y no como la otra mitad de la pantalla.
   */
  cada?: number;
  /** Se llama al tocarlo, para guardarlo. */
  onJuntar: (ingrediente: Ingrediente) => void;
};

export function useIngredientes({ activo, cada = CADA, elegir, onJuntar }: Opciones) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);

  // El temporizador corre fuera del render y necesita lo último de las dos.
  const elegirRef = useRef(elegir);
  elegirRef.current = elegir;
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

        // Nada que corresponda con lo que se esta mirando: no aparece nada.
        // Este turno se pierde y se vuelve a preguntar en el siguiente.
        const ingrediente = elegirRef.current();
        if (!ingrediente) return previos;

        const nuevo: Hallazgo = {
          id: `${Date.now()}`,
          ingrediente,
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
    }, cada);

    return () => clearInterval(reloj);
  }, [activo, cada]);

  const juntar = useCallback((h: Hallazgo) => {
    setHallazgos((previos) => previos.filter((x) => x.id !== h.id));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    juntarRef.current(h.ingrediente);
  }, []);

  return { hallazgos, juntar };
}
