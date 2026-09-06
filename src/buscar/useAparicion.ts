import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';

import { probeOrientation } from './sensores';
import { TODO_CERCA } from '../flags';

/**
 * Cómo aparece una criatura sobre la imagen de la cámara.
 *
 * Es lo único que se conserva del demo, y por eso vive acá suelto en vez de
 * adentro de una pantalla: el juego que lo usa va a cambiar varias veces y esto
 * no debería cambiar con él.
 *
 * Hay dos motores y el que corre lo decide el dispositivo:
 *
 * - `orientacion`: la criatura ocupa una dirección fija del mundo y aparece
 *   cuando apuntás hacia allá. Necesita el sensor de rotación.
 * - `deriva`: va y viene por la pantalla. No necesita ningún sensor, solo
 *   cámara. Es el piso de compatibilidad: cualquier teléfono puede jugar.
 *
 * El hook no sabe qué se está dibujando ni en qué momento del juego está: le
 * pasás cuánto mide la pieza actual y si la distancia tiene que quedar
 * congelada, y devuelve dónde va y qué tan cerca está.
 */

/** Campo de visión horizontal aproximado de la cámara trasera típica. */
const FOV_H = 1.15; // ~66°

/**
 * alpha (yaw) crece al girar a la izquierda, así que hay que invertirlo para
 * mapear a coordenadas de pantalla. Si en el dispositivo la criatura se va para
 * el lado contrario al que girás, este es el único valor a cambiar.
 */
const YAW_SIGN = -1;

/**
 * Suavizado exponencial: más bajo = más estable pero más lento.
 *
 * La brújula del teléfono salta sola varios grados adentro de una casa, por
 * culpa del metal y los electrodomésticos. Sin suficiente suavizado la criatura
 * tiembla y se escapa de la pantalla sola.
 */
const SMOOTHING = 0.11;

/** Ángulo máximo que se proyecta; más allá ya está fuera de cuadro. */
const MAX_OFFSET = 1.0;

/**
 * Qué tan chica se ve la criatura en su punto más lejano.
 *
 * La profundidad la maneja el juego y no el archivo de arte, y eso es lo que le
 * permite reaccionar: se acerca porque la estás mirando, no porque le tocaba.
 * Un acercamiento grabado adentro del video siempre hace lo mismo.
 */
export const LEJOS = 0.45;

/**
 * Qué parte de la criatura tiene que verse para que se siga acercando.
 *
 * Si se te va de cuadro más de la mitad, retrocede. Perderla tiene precio, que
 * es lo que hace que seguirla sea algo y no solo esperar.
 */
const A_LA_VISTA_MIN = 0.5;

/**
 * Cuánto se acerca por lectura del sensor si la tenés en el centro.
 *
 * A unas treinta lecturas por segundo, esto es lo que decide cuánto hay que
 * buscar. Empezó en 0,011 —un tercio de la distancia por segundo— y con eso la
 * criatura estaba encima en tres segundos sin moverse del lugar: todo el juego
 * pasaba en un metro cuadrado. Ahora tarda cerca de veinte segundos de
 * seguimiento sostenido, que es lo que obliga a caminar y a buscarla de verdad.
 *
 * Es el número para calibrar en la calle. Más bajo, más lejos se siente.
 */
const ACERCA = TODO_CERCA ? 0.011 : 0.002;

/**
 * Cuánto se aleja por lectura si mirás para otro lado. Más lento que lo que se
 * acerca, a propósito: perderla de vista un segundo no debería mandarla al
 * fondo y obligar a empezar de nuevo.
 *
 * **Va atado a `ACERCA`**, alrededor de un tercio. Si alejarse fuera más rápido
 * que acercarse, la criatura no se alcanzaría nunca por más que la sigas: al
 * bajar uno hay que bajar el otro.
 */
const ALEJA = TODO_CERCA ? 0.004 : 0.0007;

/** A partir de acá se considera que la tenés cerca. */
export const CERCA = 0.75;

/**
 * Cuántas lecturas seguidas sin moverse hacen que `orientacion` se rinda.
 *
 * Hay equipos —la Galaxy Tab A11 es el caso conocido— que declaran tener sensor
 * de rotación y después emiten siempre el mismo valor. Sondear una vez al
 * arrancar no alcanza para detectarlo: llegan datos, solo que están
 * congelados. Cuando pasa, la criatura queda clavada en una dirección del mundo
 * que puede no estar nunca en pantalla, y buscarla es imposible.
 *
 * A 33 ms por lectura, esto es alrededor de dos segundos y medio. Un teléfono
 * apoyado en la mesa igual tiembla lo suficiente como para no dispararlo; si se
 * dispara de más, lo peor que pasa es que se juega con el motor que no necesita
 * sensores.
 */
const LECTURAS_CONGELADAS = 75;

/** Debajo de esto dos lecturas se consideran la misma. */
const EPSILON = 1e-7;

/** Etiqueta del bloqueo de pantalla, para soltar exactamente el que se tomó. */
const DESPIERTO = 'kaurix-busqueda';

export type Motor = 'probando' | 'orientacion' | 'deriva';

export type Tamano = { width: number; height: number };

type Opciones = {
  /**
   * Si el motor tiene que correr. Va en falso mientras no haya permiso de
   * cámara o la pantalla no esté visible.
   */
  activo: boolean;
  /**
   * Cuánto mide la pieza que se está dibujando, a distancia máxima.
   *
   * Cambia cuando cambia la pieza —un huevo y un bebé no miden igual— y se usa
   * para saber cuánto de la criatura entra en pantalla. Se lee desde una
   * referencia y no como dependencia de los efectos: cambia varias veces por
   * segundo y reiniciar el recorrido cada vez teletransportaba a la criatura.
   */
  tamano: Tamano;
  /**
   * Congela la distancia. Va en verdadero mientras pasa algo que hay que mirar
   * —un intento fallido, la eclosión—: no corresponde que se aleje justo ahí.
   */
  congelado?: boolean;
};

export type Aparicion = {
  motor: Motor;
  /** Hasta que no está listo no hay que dibujar nada: todavía no tiene lugar. */
  listo: boolean;
  /** 0 = lo más lejos que llega, 1 = encima tuyo. */
  cercania: number;
  /** Cuánto de su tamaño se dibuja a la distancia actual. */
  profundidad: number;
  /** La tenés en el medio de la pantalla. */
  centrada: boolean;
  /** Entra en pantalla lo suficiente como para poder tocarla. */
  aLaVista: boolean;
  /** Qué porción de la criatura entra en pantalla, entre 0 y 1. */
  porcionVisible: number;
  /**
   * Lo que hay que ponerle al contenedor para que quede donde va.
   *
   * Cada motor usa un mecanismo distinto —posición absoluta uno, desplazamiento
   * animado el otro— y esto es lo que evita que quien lo usa tenga que
   * saberlo. Va sobre un `Animated.View`, que acepta los dos.
   */
  estiloPosicion: object;
  /** Vuelve a empezar con otra criatura: nueva dirección, otra vez lejos. */
  reiniciar: () => void;
};

/** Normaliza un ángulo a (-π, π]. */
function wrap(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * La tangente se dispara cerca de los 90°, así que se acota antes de proyectar:
 * más allá de ese ángulo ya está fuera de pantalla y solo importa para qué lado
 * quedó.
 */
const acotar = (a: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, a));

export function useAparicion({ activo, tamano, congelado = false }: Opciones): Aparicion {
  const { width, height } = useWindowDimensions();

  const [motor, setMotor] = useState<Motor>('probando');
  const [listo, setListo] = useState(false);
  const [offset, setOffset] = useState({ dYaw: 0, dPitch: 0 });
  const [cercania, setCercania] = useState(0);
  const [generacion, setGeneracion] = useState(0);

  const cercaniaRef = useRef(0);
  const visibleRef = useRef(0);
  const congeladoRef = useRef(congelado);
  const tamanoRef = useRef(tamano);

  /** Dirección de la criatura en el mundo, fijada al calibrar. */
  const target = useRef({ yaw: 0, pitch: -0.3 });
  /** Orientación suavizada de la cámara. */
  const view = useRef({ yaw: 0, pitch: 0 });
  const calibrado = useRef(false);

  /** Posición en el motor de deriva. */
  const drift = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const focal = useMemo(() => width / 2 / Math.tan(FOV_H / 2), [width]);

  // Se leen desde los efectos, que corren fuera del render.
  congeladoRef.current = congelado;
  tamanoRef.current = tamano;

  /**
   * Mantiene la pantalla encendida mientras se busca.
   *
   * Buscar es mirar por la cámara sin tocar nada, y para Android eso es estar
   * inactivo: apaga la pantalla en mitad de la búsqueda. Solo mientras el motor
   * corre, porque impedir que el teléfono se duerma gasta batería.
   *
   * Va protegido a propósito: es un módulo nativo, así que en una versión
   * instalada de antes no existe y llamarlo tiraría la app abajo.
   */
  useEffect(() => {
    if (!activo) return;

    let despierto = false;
    try {
      activateKeepAwakeAsync(DESPIERTO);
      despierto = true;
    } catch {
      // El build instalado es anterior a este módulo. La búsqueda funciona
      // igual, solo que la pantalla se apaga sola.
    }

    return () => {
      if (!despierto) return;
      try {
        deactivateKeepAwake(DESPIERTO);
      } catch {
        // Nada que hacer: si no se pudo activar, tampoco hay que soltarlo.
      }
    };
  }, [activo]);

  // Elige el motor según lo que el dispositivo sepa hacer.
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    probeOrientation().then((hay) => {
      if (vivo) setMotor(hay ? 'orientacion' : 'deriva');
    });
    return () => {
      vivo = false;
    };
  }, [activo]);

  // Motor de orientación.
  useEffect(() => {
    if (!activo || motor !== 'orientacion') return;

    let vivo = true;
    /** Última lectura cruda, para detectar un sensor que no se mueve. */
    let ultima: { yaw: number; pitch: number } | null = null;
    let quietas = 0;

    DeviceMotion.setUpdateInterval(33);
    const sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation || !vivo) return;

      // alpha: giro sobre el eje vertical. beta: inclinación adelante/atrás,
      // donde π/2 es el teléfono parado (cámara mirando al horizonte).
      const yaw = rotation.alpha ?? 0;
      const pitch = (rotation.beta ?? Math.PI / 2) - Math.PI / 2;

      // La salida de emergencia: si el sensor existe pero está congelado, este
      // motor no puede funcionar y hay que pasarse al que no lo necesita.
      if (
        ultima &&
        Math.abs(yaw - ultima.yaw) < EPSILON &&
        Math.abs(pitch - ultima.pitch) < EPSILON
      ) {
        quietas += 1;
        if (quietas >= LECTURAS_CONGELADAS) {
          vivo = false;
          setMotor('deriva');
          return;
        }
      } else {
        quietas = 0;
      }
      ultima = { yaw, pitch };

      if (!calibrado.current) {
        calibrado.current = true;
        // Aparece en una dirección al azar, nunca justo enfrente: hay que girar
        // para encontrarla.
        const lejos = (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 1.6);
        target.current = { yaw: wrap(yaw + lejos), pitch: -0.1 - Math.random() * 0.25 };
        view.current = { yaw, pitch };
        setListo(true);
      }

      view.current = {
        yaw: wrap(view.current.yaw + wrap(yaw - view.current.yaw) * SMOOTHING),
        pitch: view.current.pitch + (pitch - view.current.pitch) * SMOOTHING,
      };

      const dYaw = wrap(target.current.yaw - view.current.yaw);
      const dPitch = target.current.pitch - view.current.pitch;

      /*
       * Se acerca mientras la tengas a la vista, y más rápido si la tenés en el
       * centro.
       *
       * La cuenta se hace sobre la posición en pantalla y no sobre el ángulo:
       * el ángulo vertical depende de la inclinación con que sostenés el
       * teléfono, así que exigir un ángulo chico ahí es una condición que casi
       * nunca se cumple aunque la criatura se vea justo en el medio.
       */
      const px = width / 2 + YAW_SIGN * Math.tan(acotar(dYaw)) * focal;
      const py = height / 2 - Math.tan(acotar(dPitch)) * focal;

      // Qué porción de la criatura entra en la pantalla, medida sobre el
      // rectángulo que ocupa al tamaño que tiene ahora.
      const prof = LEJOS + (1 - LEJOS) * cercaniaRef.current;
      const cw = tamanoRef.current.width * prof;
      const ch = tamanoRef.current.height * prof;
      const x = px - cw / 2;
      const y = py - ch / 2;
      const anchoVisible = Math.max(0, Math.min(width, x + cw) - Math.max(0, x));
      const altoVisible = Math.max(0, Math.min(height, y + ch) - Math.max(0, y));
      const porcion = cw * ch > 0 ? (anchoVisible * altoVisible) / (cw * ch) : 0;

      const enElCentro =
        Math.abs(px - width / 2) / width < 0.28 && Math.abs(py - height / 2) / height < 0.24;

      if (!congeladoRef.current) {
        const paso = porcion < A_LA_VISTA_MIN ? -ALEJA : enElCentro ? ACERCA : ACERCA * 0.45;
        cercaniaRef.current = Math.max(0, Math.min(1, cercaniaRef.current + paso));
      }
      visibleRef.current = porcion;

      setOffset({ dYaw, dPitch });
      setCercania(cercaniaRef.current);
    });

    return () => {
      vivo = false;
      sub.remove();
    };
  }, [activo, motor, width, height, focal, generacion]);

  // Motor de deriva: va y viene por la pantalla, sin sensores de por medio.
  useEffect(() => {
    if (!activo || motor !== 'deriva') return;

    let cancelado = false;

    /**
     * Un punto al azar donde la criatura entre en pantalla.
     *
     * Se calcula en cada tramo y no una vez al empezar, porque su tamaño cambia
     * con la distancia. Y cuando es más ancha que la pantalla —los huevos lo
     * son a propósito, para que se lean cerca— no hay margen donde sortear
     * nada: en ese eje va centrada. Sin ese caso, el rango queda invertido y
     * todos los puntos caen fuera de cuadro por la izquierda.
     */
    const puntoAlAzar = () => {
      const prof = LEJOS + (1 - LEJOS) * cercaniaRef.current;
      const w = tamanoRef.current.width * prof;
      const h = tamanoRef.current.height * prof;

      const entre = (libre: number, desde: number) =>
        desde + (libre <= 0 ? libre / 2 : Math.random() * libre);

      return {
        x: entre(width - w, 0),
        y: entre(height * 0.75 - h, height * 0.08),
      };
    };

    drift.setValue(puntoAlAzar());
    setListo(true);

    const vagar = () => {
      if (cancelado) return;
      Animated.timing(drift, {
        toValue: puntoAlAzar(),
        duration: 2800 + Math.random() * 1600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) vagar();
      });
    };

    vagar();

    // Sin sensores no hay nada que el jugador pueda hacer para llamarla, así
    // que acá la distancia va y viene sola. Se acerca lo suficiente como para
    // que valga la pena esperarla.
    let destino = 0.8;
    const profundidad = setInterval(() => {
      if (congeladoRef.current) return;
      if (Math.abs(cercaniaRef.current - destino) < 0.04) {
        destino = 0.25 + Math.random() * 0.75;
      }
      const paso = (destino - cercaniaRef.current) * 0.04;
      cercaniaRef.current = Math.max(0, Math.min(1, cercaniaRef.current + paso));
      setCercania(cercaniaRef.current);
    }, 90);

    return () => {
      cancelado = true;
      clearInterval(profundidad);
      drift.stopAnimation();
    };
    // El tamaño no va acá: cambia con la distancia varias veces por segundo, y
    // tenerlo como dependencia reiniciaba el recorrido —y teletransportaba a la
    // criatura— todo el tiempo. Se lee de una referencia cuando hace falta.
  }, [activo, motor, width, height, drift, generacion]);

  const profundidad = LEJOS + (1 - LEJOS) * cercania;
  const cw = tamano.width * profundidad;
  const ch = tamano.height * profundidad;

  const posX = width / 2 + YAW_SIGN * Math.tan(acotar(offset.dYaw)) * focal - cw / 2;
  const posY = height / 2 - Math.tan(acotar(offset.dPitch)) * focal - ch / 2;

  /**
   * Se la ve cuando de verdad entra en la pantalla, no cuando el ángulo es
   * chico. Son cosas distintas: con el campo de visión de la cámara ya salió de
   * cuadro mucho antes de lo que el ángulo sugiere, y avisar "ahí está"
   * mientras está dibujada afuera es peor que no avisar nada.
   */
  const asomo = 0.45;

  // En deriva la criatura se dibuja siempre adentro de la pantalla por
  // construcción, así que no hay nada que calcular: está a la vista y no tiene
  // sentido preguntarse si está centrada.
  const enDeriva = motor === 'deriva';

  const aLaVista =
    listo &&
    (enDeriva ||
      (posX + cw * asomo < width &&
        posX + cw * (1 - asomo) > 0 &&
        posY + ch * asomo < height &&
        posY + ch * (1 - asomo) > 0));

  const centrada =
    listo &&
    (enDeriva ||
      (Math.abs(posX + cw / 2 - width / 2) / width < 0.28 &&
        Math.abs(posY + ch / 2 - height / 2) / height < 0.24));

  const estiloPosicion = enDeriva
    ? { transform: [{ translateX: drift.x }, { translateY: drift.y }] }
    : { left: posX, top: posY };

  function reiniciar() {
    calibrado.current = false;
    cercaniaRef.current = 0;
    visibleRef.current = 0;
    setCercania(0);
    setOffset({ dYaw: 0, dPitch: 0 });
    // En deriva no hay que calibrar nada, así que ya está listo; en orientación
    // hay que esperar a que el sensor fije la dirección nueva.
    setListo(motor === 'deriva');
    setGeneracion((n) => n + 1);
  }

  return {
    motor,
    listo,
    cercania,
    profundidad,
    centrada,
    aLaVista,
    porcionVisible: visibleRef.current,
    estiloPosicion,
    reiniciar,
  };
}
