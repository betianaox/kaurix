import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  adulto,
  criaturaNueva,
  fallosAntesDeRomper,
  type Criatura,
  type Pieza,
} from '../art';
import { CriaturaView, medida } from '../components/CriaturaView';
import { FoundOverlay } from '../components/FoundOverlay';
import { probeOrientation } from '../game/capabilities';
import { cargar, especies, resumen, sumar } from '../game/hallazgos';
import { colors, radius, spacing } from '../theme';

/**
 * Búsqueda de criaturas con la cámara.
 *
 * Lo único que Kaurix exige es una cámara: el objetivo es que corra en
 * cualquier Android, no solo en la gama alta. Hay dos motores y el que corre lo
 * decide el dispositivo:
 *
 * - `orientacion`: la criatura ocupa una dirección fija del mundo y aparece
 *   cuando apuntás hacia allá. Necesita el sensor de rotación.
 * - `deriva`: va y viene por la pantalla. No necesita ningún sensor, solo
 *   cámara. Es el piso de compatibilidad: cualquier teléfono puede jugar.
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

/** Qué tan cerca del centro cuenta como "centrada". */
const CENTRADO = 0.16;

/**
 * Ancho de la criatura como proporción del ancho de pantalla.
 *
 * Por encima de 1 se pasa de los bordes a propósito: se lee como que está
 * cerca. El precio es que las puntas de las alas quedan fuera de cuadro.
 */
const ANCHO = 1.0;

/**
 * Qué tan chica se ve la criatura en su punto más lejano.
 *
 * La profundidad la maneja el juego y no el archivo de arte, y eso es lo que le
 * permite reaccionar: se acerca porque la estás mirando, no porque le tocaba.
 * Un acercamiento grabado adentro del video siempre hace lo mismo.
 */
const LEJOS = 0.45;

/**
 * Qué parte de la criatura tiene que verse para que se siga acercando.
 *
 * Si se te va de cuadro más de la mitad, retrocede. Perderla tiene precio, que
 * es lo que hace que seguirla sea algo y no solo esperar.
 */
const A_LA_VISTA_MIN = 0.5;

/** Cuánto se acerca por lectura del sensor si la tenés en el centro. */
const ACERCA = 0.011;

/**
 * Cuánto se aleja por lectura si mirás para otro lado. Más lento que lo que se
 * acerca, a propósito: perderla de vista un segundo no debería mandarla al
 * fondo y obligar a empezar de nuevo.
 */
const ALEJA = 0.004;

/** A partir de acá se considera que la tenés cerca. */
const CERCA = 0.75;

/** Etiqueta del bloqueo de pantalla, para soltar exactamente el que se tomó. */
const DESPIERTO = 'kaurix-busqueda';

type Engine = 'probando' | 'orientacion' | 'deriva';

/**
 * En qué momento de la secuencia está.
 *
 * Lo que se encuentra es el huevo, y hay que insistir: cada toque es un intento
 * de salir que falla, hasta que uno rompe el cascarón. Recién el que sale de
 * ahí se puede atrapar.
 *
 * Las criaturas que todavía no tienen esas animaciones arrancan directamente en
 * `volando` y se atrapan de una: así las terminadas conviven con las que faltan.
 */
type Fase = 'huevo' | 'falla' | 'eclosion' | 'volando';

type Props = {
  onBack: () => void;
  onSaved: () => void;
};

/** Normaliza un ángulo a (-π, π]. */
function wrap(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

export function SearchScreen({ onBack, onSaved }: Props) {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const [criatura, setCriatura] = useState<Criatura | null>(null);
  const [fase, setFase] = useState<Fase>('volando');
  const faseRef = useRef<Fase>('volando');
  /** Intentos fallidos que le faltan a este huevo antes de romperse. */
  const fallosRestantes = useRef(0);
  /** Toques dados a este huevo, solo para cambiar lo que dice el cartel. */
  const [intentos, setIntentos] = useState(0);
  const [engine, setEngine] = useState<Engine>('probando');
  const [ready, setReady] = useState(false);
  const [offset, setOffset] = useState({ dYaw: 0, dPitch: 0 });
  /** 0 = lo más lejos que llega, 1 = encima tuyo. */
  const [cercania, setCercania] = useState(0);
  const cercaniaRef = useRef(0);
  /** Qué porción de la criatura entra en pantalla, entre 0 y 1. */
  const visibleRef = useRef(0);
  /**
   * Tamaño de la criatura a distancia máxima, para poder calcular desde el
   * sensor cuánto de ella entra en pantalla sin depender del render.
   */
  const tamanoRef = useRef({ width: 0, height: 0 });
  const [hallada, setHallada] = useState<{
    segundos: number;
    distintas: number;
    posibles: number;
    esNueva: boolean;
  } | null>(null);
  const [contador, setContador] = useState({ total: 0, distintas: 0, posibles: 0 });
  /**
   * Qué está pasando por dentro, escrito en pantalla.
   *
   * Sin esto, un equipo donde no aparece la criatura no da ninguna pista: puede
   * ser que el arte no cargue, que el motor elegido sea el equivocado o que
   * esté dibujada fuera de cuadro. Son tres problemas distintos que se ven
   * igual.
   */
  const [diagnostico, setDiagnostico] = useState('');

  /** Dirección de la criatura en el mundo, fijada al calibrar. */
  const target = useRef({ yaw: 0, pitch: -0.3 });
  /** Orientación suavizada de la cámara. */
  const view = useRef({ yaw: 0, pitch: 0 });
  const startedAt = useRef(Date.now());
  const calibrated = useRef(false);
  const reclamada = useRef(false);

  /** Posición en el motor de deriva. */
  const drift = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const focal = useMemo(() => width / 2 / Math.tan(FOV_H / 2), [width]);
  const size = Math.round(width * ANCHO);

  /** Qué pieza toca dibujar según el momento de la secuencia. */
  const pieza: Pieza | null = !criatura
    ? null
    : fase === 'huevo' && criatura.huevo
      ? criatura.huevo
      : fase === 'falla' && criatura.falla
        ? criatura.falla
        : fase === 'eclosion' && criatura.eclosion
          ? criatura.eclosion
          : adulto(criatura);

  /**
   * Lo que se va a mostrar después, montado invisible para que ya esté
   * decodificado. Sin esto se ve un parpadeo en blanco en cada cambio.
   */
  const siguiente: Pieza | null = !criatura
    ? null
    : fase === 'eclosion'
      ? adulto(criatura)
      : fase === 'falla'
        ? (criatura.huevo ?? null)
        : fase === 'huevo'
          ? (criatura.falla ?? criatura.eclosion ?? null)
          : null;

  const base = useMemo(
    () => (pieza ? medida(size, pieza) : { width: size, height: size }),
    [size, pieza]
  );

  /**
   * Cuánto de su tamaño se dibuja según la distancia.
   *
   * Se probó acompañarlo de bruma —lo lejano pierde contraste contra el fondo—
   * pero sobre la imagen de la cámara no se lee como distancia sino como que la
   * criatura es un fantasma y se ve el fondo a través de ella. Queda solo el
   * tamaño, que además nunca baja de un mínimo cómodo de tocar.
   */
  const profundidad = LEJOS + (1 - LEJOS) * cercania;

  const sizeVisible = Math.round(size * profundidad);
  const cw = base.width * profundidad;
  const ch = base.height * profundidad;

  // El sensor corre fuera del render y necesita el tamaño para saber cuánto de
  // la criatura queda dentro de la pantalla.
  tamanoRef.current = base;

  // Se puede leer directo porque el sensor hace redibujar treinta veces por
  // segundo: el valor siempre está fresco.
  const porcionVisible = visibleRef.current;

  /**
   * Mantiene la pantalla encendida mientras se busca.
   *
   * Buscar es mirar por la cámara sin tocar nada, y para Android eso es estar
   * inactivo: apaga la pantalla en mitad de la búsqueda. Solo acá, no en toda
   * la app, porque impedir que el teléfono se duerma gasta batería.
   *
   * Va protegido a propósito: es un módulo nativo, así que en una versión
   * instalada de antes no existe y llamarlo tiraría la app abajo.
   */
  useEffect(() => {
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
  }, []);

  // Elige qué criatura toca buscar, priorizando las que faltan.
  useEffect(() => {
    let alive = true;
    cargar().then((hallazgos) => {
      if (!alive) return;
      const elegida = criaturaNueva(especies(hallazgos));
      setCriatura(elegida);
      cambiarFase(elegida.huevo ? 'huevo' : 'volando');
      fallosRestantes.current = elegida.falla ? fallosAntesDeRomper() : 0;
      setIntentos(0);
      const r = resumen(hallazgos);
      setContador({ total: r.total, distintas: r.distintas, posibles: r.posibles });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Elige el motor según lo que el dispositivo sepa hacer.
  useEffect(() => {
    if (!permission?.granted) return;
    let alive = true;
    probeOrientation().then((hay) => {
      if (alive) setEngine(hay ? 'orientacion' : 'deriva');
    });
    return () => {
      alive = false;
    };
  }, [permission?.granted]);

  // Motor de orientación.
  useEffect(() => {
    if (engine !== 'orientacion') return;

    let alive = true;
    let sub: { remove: () => void } | null = null;

    DeviceMotion.setUpdateInterval(33);
    sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return;

      // alpha: giro sobre el eje vertical. beta: inclinación adelante/atrás,
      // donde π/2 es el teléfono parado (cámara mirando al horizonte).
      const yaw = rotation.alpha ?? 0;
      const pitch = (rotation.beta ?? Math.PI / 2) - Math.PI / 2;

      if (!calibrated.current) {
        calibrated.current = true;
        // Aparece en una dirección al azar, nunca justo enfrente: hay que girar
        // para encontrarla.
        const lejos = (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 1.6);
        target.current = { yaw: wrap(yaw + lejos), pitch: -0.1 - Math.random() * 0.25 };
        view.current = { yaw, pitch };
        setReady(true);
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
      const chh = tamanoRef.current.height * prof;
      const x = px - cw / 2;
      const y = py - chh / 2;
      const anchoVisible = Math.max(0, Math.min(width, x + cw) - Math.max(0, x));
      const altoVisible = Math.max(0, Math.min(height, y + chh) - Math.max(0, y));
      const porcionVisible = cw * chh > 0 ? (anchoVisible * altoVisible) / (cw * chh) : 0;

      const enElCentro =
        Math.abs(px - width / 2) / width < 0.28 && Math.abs(py - height / 2) / height < 0.24;

      // Mientras pasa algo —un intento, la eclosión— la distancia se congela:
      // no corresponde que se aleje justo en ese momento.
      if (faseRef.current !== 'eclosion' && faseRef.current !== 'falla') {
        const paso =
          porcionVisible < A_LA_VISTA_MIN ? -ALEJA : enElCentro ? ACERCA : ACERCA * 0.45;
        cercaniaRef.current = Math.max(0, Math.min(1, cercaniaRef.current + paso));
      }
      visibleRef.current = porcionVisible;

      setOffset({ dYaw, dPitch });
      setCercania(cercaniaRef.current);
    });

    if (!alive) {
      sub.remove();
      sub = null;
    }

    return () => {
      alive = false;
      sub?.remove();
      sub = null;
    };
  }, [engine, width, height, focal]);

  // Motor de deriva: va y viene por la pantalla, sin sensores de por medio.
  useEffect(() => {
    if (engine !== 'deriva') return;

    let cancelled = false;

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
      const w = tamanoRef.current.width * (LEJOS + (1 - LEJOS) * cercaniaRef.current);
      const h = tamanoRef.current.height * (LEJOS + (1 - LEJOS) * cercaniaRef.current);

      const entre = (libre: number, desde: number) =>
        desde + (libre <= 0 ? libre / 2 : Math.random() * libre);

      return {
        x: entre(width - w, 0),
        y: entre(height * 0.75 - h, height * 0.08),
      };
    };

    drift.setValue(puntoAlAzar());
    setReady(true);

    const vagar = () => {
      if (cancelled) return;
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
      if (Math.abs(cercaniaRef.current - destino) < 0.04) {
        destino = 0.25 + Math.random() * 0.75;
      }
      const paso = (destino - cercaniaRef.current) * 0.04;
      cercaniaRef.current = Math.max(0, Math.min(1, cercaniaRef.current + paso));
      setCercania(cercaniaRef.current);
    }, 90);

    return () => {
      cancelled = true;
      clearInterval(profundidad);
      drift.stopAnimation();
    };
    // El tamaño no va acá: cambia con la distancia varias veces por segundo, y
    // tenerlo como dependencia reiniciaba el recorrido —y teletransportaba a la
    // criatura— todo el tiempo. Se lee de una referencia cuando hace falta.
  }, [engine, width, height, drift]);

  // La tangente se dispara cerca de los 90°, así que se acota antes de
  // proyectar: más allá de ese ángulo ya está fuera de pantalla y solo importa
  // para qué lado quedó.
  const acotar = (a: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, a));

  const posX = width / 2 + YAW_SIGN * Math.tan(acotar(offset.dYaw)) * focal - cw / 2;
  const posY = height / 2 - Math.tan(acotar(offset.dPitch)) * focal - ch / 2;

  // Se mide contra la pantalla, igual que el acercamiento, para que el cartel
  // diga lo mismo que está pasando.
  const centrada =
    ready &&
    Math.abs(posX + cw / 2 - width / 2) / width < 0.28 &&
    Math.abs(posY + ch / 2 - height / 2) / height < 0.24;

  /**
   * Se la ve cuando de verdad entra en la pantalla, no cuando el ángulo es
   * chico. Son cosas distintas: con el campo de visión de la cámara ya salió de
   * cuadro mucho antes de lo que el ángulo sugiere, y avisar "ahí está"
   * mientras está dibujada afuera es peor que no avisar nada.
   */
  const asomo = 0.45;
  const aLaVista =
    ready &&
    posX + cw * asomo < width &&
    posX + cw * (1 - asomo) > 0 &&
    posY + ch * asomo < height &&
    posY + ch * (1 - asomo) > 0;

  function cambiarFase(f: Fase) {
    faseRef.current = f;
    setFase(f);
  }

  async function tocar() {
    if (!criatura) return;

    // Durante la eclosión no se toca nada: está pasando algo y hay que mirarlo.
    if (fase === 'eclosion') return;

    // Durante un intento fallido tampoco: hay que esperar a que termine.
    if (fase === 'falla') return;

    if (fase === 'huevo' && criatura.eclosion) {
      // Cada toque es un intento. Los primeros no lo logran; el jugador no sabe
      // cuántos le van a tocar, y esa incertidumbre es la mitad de la gracia.
      const rompe = fallosRestantes.current <= 0 || !criatura.falla;

      await Haptics.impactAsync(
        rompe ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
      );

      const paso: Fase = rompe ? 'eclosion' : 'falla';
      const animacion = rompe ? criatura.eclosion : criatura.falla!;
      if (!rompe) fallosRestantes.current -= 1;
      setIntentos((n) => n + 1);

      cambiarFase(paso);

      // La única forma de saber que una animación terminó es saber cuánto dura:
      // el componente de imagen no avisa nada. Ese número lo produce el script
      // de conversión, así que es exacto y no una estimación.
      setTimeout(() => {
        if (faseRef.current === paso) cambiarFase(rompe ? 'volando' : 'huevo');
      }, animacion.duracion);
      return;
    }

    if (reclamada.current) return;
    reclamada.current = true;

    const segundos = Math.round((Date.now() - startedAt.current) / 1000);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const previos = await cargar();
    const esNueva = !especies(previos).includes(criatura.id);
    const hallazgos = await sumar({
      criatura: criatura.id,
      modo: engine === 'deriva' ? 'deriva' : 'orientacion',
      segundos,
    });

    const r = resumen(hallazgos);
    setContador({ total: r.total, distintas: r.distintas, posibles: r.posibles });
    setHallada({ segundos, distintas: r.distintas, posibles: r.posibles, esNueva });
  }

  async function seguir() {
    const hallazgos = await cargar();
    const elegida = criaturaNueva(especies(hallazgos));
    setCriatura(elegida);
    cambiarFase(elegida.huevo ? 'huevo' : 'volando');
    fallosRestantes.current = elegida.falla ? fallosAntesDeRomper() : 0;
    calibrated.current = false;
    reclamada.current = false;
    cercaniaRef.current = 0;
    startedAt.current = Date.now();
    setIntentos(0);
    setCercania(0);
    setHallada(null);
    setReady(engine === 'deriva');
  }

  if (!permission) return <Centered text="Consultando permisos…" onBack={onBack} />;

  if (!permission.granted) {
    return (
      <Centered
        text="Kaurix necesita la cámara para buscar criaturas."
        onBack={onBack}
        action={{ label: 'Dar permiso', onPress: requestPermission }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {criatura && pieza && !hallada ? (
        engine === 'deriva' ? (
          <Animated.View
            style={[
              styles.criatura,
              { opacity: ready ? 1 : 0 },
              { transform: [{ translateX: drift.x }, { translateY: drift.y }] },
            ]}
          >
            <Pressable onPress={tocar} hitSlop={16}>
              <CriaturaView
                size={sizeVisible}
                pieza={pieza}
                siguiente={siguiente}
                nombre={criatura.nombre}
                elemento={criatura.elemento}
                onFallo={(m) => setDiagnostico(`arte falló: ${m}`)}
              />
            </Pressable>
          </Animated.View>
        ) : (
          // Se mantiene montada aunque esté fuera de cuadro: desmontarla
          // reinicia la animación, y con el temblor de la brújula eso se ve como
          // un parpadeo constante.
          <Pressable
            onPress={tocar}
            pointerEvents={aLaVista ? 'auto' : 'none'}
            style={[styles.criatura, { left: posX, top: posY, opacity: ready ? 1 : 0 }]}
            hitSlop={16}
          >
            <CriaturaView
              size={sizeVisible}
              pieza={pieza}
              siguiente={siguiente}
              nombre={criatura.nombre}
              elemento={criatura.elemento}
              onFallo={(m) => setDiagnostico(`arte falló: ${m}`)}
            />
          </Pressable>
        )
      ) : null}

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.contador}>
          <Text style={styles.contadorNumero}>{contador.distintas}</Text>
          <Text style={styles.contadorTexto}>de {contador.posibles} criaturas</Text>
        </View>

        <Text style={styles.hint}>
          {pista(
            engine,
            fase,
            ready,
            aLaVista,
            centrada,
            cercania,
            cercania > 0.02 && porcionVisible < A_LA_VISTA_MIN,
            intentos,
            offset.dYaw
          )}
        </Text>

        <Text style={styles.diagnostico}>
          {`motor ${engine} · fase ${fase} · toques ${intentos} · ${criatura ? criatura.id : 'sin criatura'} · ${Math.round(cw)}x${Math.round(ch)} en (${Math.round(posX)}, ${Math.round(posY)}) · pantalla ${Math.round(width)}x${Math.round(height)} · cercanía ${Math.round(cercania * 100)}% · a la vista ${Math.round(porcionVisible * 100)}%${diagnostico ? ` · ${diagnostico}` : ''}`}
        </Text>

        {engine === 'orientacion' && ready && !aLaVista ? (
          <Text style={styles.hintSmall}>
            {offset.dPitch < -0.35
              ? 'Bajá un poco la mirada.'
              : offset.dPitch > 0.35
                ? 'Subí un poco la mirada.'
                : ' '}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <Pressable style={styles.smallButton} onPress={onBack}>
          <Text style={styles.smallButtonText}>Salir</Text>
        </Pressable>
        <Pressable style={styles.smallButton} onPress={seguir}>
          <Text style={styles.smallButtonText}>Otra criatura</Text>
        </Pressable>
      </View>

      {hallada && criatura ? (
        <FoundOverlay
          criatura={criatura}
          segundos={hallada.segundos}
          distintas={hallada.distintas}
          posibles={hallada.posibles}
          esNueva={hallada.esNueva}
          onSeguir={seguir}
          onVolver={onSaved}
        />
      ) : null}
    </View>
  );
}

function pista(
  engine: Engine,
  fase: Fase,
  ready: boolean,
  aLaVista: boolean,
  centrada: boolean,
  cercania: number,
  alejandose: boolean,
  /** Cuántos toques lleva dados en este huevo. */
  intentos: number,
  dYaw: number
): string {
  if (engine === 'probando') return 'Preparando la búsqueda…';
  if (fase === 'falla') return 'Algo se mueve adentro…';
  if (fase === 'eclosion') return 'Está naciendo…';

  const cerca =
    fase === 'huevo'
      ? intentos > 0
        ? 'Insistí, tocalo de nuevo.'
        : 'Ahí está. Tocá el huevo.'
      : 'Ahí está. Tocala.';
  const lejos = fase === 'huevo' ? 'Anda cerca, esperá que se acerque.' : 'Esperá que se acerque.';

  if (engine === 'deriva') return cercania > CERCA ? cerca : lejos;
  if (!ready) return 'Levantá el teléfono y movelo despacio…';

  if (centrada) {
    // La mecánica se enseña sola: si el aviso dice que se está acercando
    // mientras la criatura crece, no hace falta explicar nada.
    if (cercania > CERCA) return cerca;
    return 'No lo pierdas de vista, se está acercando…';
  }

  if (alejandose) return 'Se te está yendo… traela al centro';

  // Entre "no se ve" y "está en el centro" hace falta un escalón: si el aviso
  // salta directo a "ahí está" apenas asoma por el borde, se deja de girar
  // justo cuando estaba por entrar entera.
  if (aLaVista) return 'Ahí viene… centrala';
  return dYaw * YAW_SIGN > 0 ? 'Girá hacia la derecha →' : '← Girá hacia la izquierda';
}

function Centered({
  text,
  onBack,
  action,
}: {
  text: string;
  onBack: () => void;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.centeredText}>{text}</Text>
      {action ? (
        <Pressable style={styles.smallButton} onPress={action.onPress}>
          <Text style={styles.smallButtonText}>{action.label}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.smallButton} onPress={onBack}>
        <Text style={styles.smallButtonText}>Volver</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  criatura: { position: 'absolute', left: 0, top: 0 },

  hud: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    backgroundColor: 'rgba(11, 10, 18, 0.6)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  contadorNumero: { color: colors.accent, fontSize: 26 },
  contadorTexto: { color: colors.textMuted, fontSize: 15 },

  hint: {
    color: colors.text,
    fontSize: 17,
    textAlign: 'center',
    backgroundColor: 'rgba(11, 10, 18, 0.6)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  hintSmall: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  diagnostico: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    backgroundColor: 'rgba(11, 10, 18, 0.6)',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },

  bottomBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  smallButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(21, 19, 31, 0.85)',
  },
  smallButtonText: { color: colors.text, fontSize: 15 },

  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centeredText: { color: colors.text, fontSize: 17, textAlign: 'center', lineHeight: 25 },
});
