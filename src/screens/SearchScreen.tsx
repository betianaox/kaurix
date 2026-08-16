import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
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

import { criaturaNueva, type Criatura } from '../art';
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

type Engine = 'probando' | 'orientacion' | 'deriva';

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
  const [engine, setEngine] = useState<Engine>('probando');
  const [ready, setReady] = useState(false);
  const [offset, setOffset] = useState({ dYaw: 0, dPitch: 0 });
  const [hallada, setHallada] = useState<{
    segundos: number;
    distintas: number;
    posibles: number;
    esNueva: boolean;
  } | null>(null);
  const [contador, setContador] = useState({ total: 0, distintas: 0, posibles: 0 });

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
  const { width: cw, height: ch } = useMemo(
    () => (criatura ? medida(size, criatura) : { width: size, height: size }),
    [size, criatura]
  );

  // Elige qué criatura toca buscar, priorizando las que faltan.
  useEffect(() => {
    let alive = true;
    cargar().then((hallazgos) => {
      if (!alive) return;
      setCriatura(criaturaNueva(especies(hallazgos)));
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

      setOffset({
        dYaw: wrap(target.current.yaw - view.current.yaw),
        dPitch: target.current.pitch - view.current.pitch,
      });
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
  }, [engine]);

  // Motor de deriva: va y viene por la pantalla, sin sensores de por medio.
  useEffect(() => {
    if (engine !== 'deriva') return;

    let cancelled = false;
    const minX = -cw * 0.1;
    const maxX = width - cw * 0.9;
    const minY = height * 0.1;
    const maxY = height * 0.55;

    drift.setValue({
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    });
    setReady(true);

    const vagar = () => {
      if (cancelled) return;
      Animated.timing(drift, {
        toValue: {
          x: minX + Math.random() * (maxX - minX),
          y: minY + Math.random() * (maxY - minY),
        },
        duration: 2800 + Math.random() * 1600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) vagar();
      });
    };

    vagar();

    return () => {
      cancelled = true;
      drift.stopAnimation();
    };
  }, [engine, width, height, cw, drift]);

  // La tangente se dispara cerca de los 90°, así que se acota antes de
  // proyectar: más allá de ese ángulo ya está fuera de pantalla y solo importa
  // para qué lado quedó.
  const acotar = (a: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, a));

  const posX = width / 2 + YAW_SIGN * Math.tan(acotar(offset.dYaw)) * focal - cw / 2;
  const posY = height / 2 - Math.tan(acotar(offset.dPitch)) * focal - ch / 2;

  const centrada =
    ready && Math.abs(offset.dYaw) < CENTRADO && Math.abs(offset.dPitch) < CENTRADO;

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

  async function tocar() {
    if (!criatura || reclamada.current) return;
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
    setCriatura(criaturaNueva(especies(hallazgos)));
    calibrated.current = false;
    reclamada.current = false;
    startedAt.current = Date.now();
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

      {criatura && !hallada ? (
        engine === 'deriva' ? (
          <Animated.View
            style={[
              styles.criatura,
              { opacity: ready ? 1 : 0 },
              { transform: [{ translateX: drift.x }, { translateY: drift.y }] },
            ]}
          >
            <Pressable onPress={tocar} hitSlop={16}>
              <CriaturaView size={size} criatura={criatura} />
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
            <CriaturaView size={size} criatura={criatura} />
          </Pressable>
        )
      ) : null}

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.contador}>
          <Text style={styles.contadorNumero}>{contador.distintas}</Text>
          <Text style={styles.contadorTexto}>de {contador.posibles} criaturas</Text>
        </View>

        <Text style={styles.hint}>
          {pista(engine, ready, aLaVista, centrada, offset.dYaw)}
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
  ready: boolean,
  aLaVista: boolean,
  centrada: boolean,
  dYaw: number
): string {
  if (engine === 'probando') return 'Preparando la búsqueda…';
  if (engine === 'deriva') return 'Anda cerca. Tocala cuando la veas.';
  if (!ready) return 'Levantá el teléfono y movelo despacio…';
  if (centrada) return 'Ahí está. Tocala.';
  // Entre "no se ve" y "está en el centro" hace falta un escalón: si el aviso
  // salta directo a "ahí está" apenas asoma por el borde, se deja de girar
  // justo cuando estaba por entrar entera.
  if (aLaVista) return 'Ahí viene… seguí girando';
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
