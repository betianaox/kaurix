import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { porId, type Criatura, type Pieza } from '../art';
import { ingredienteAlAzar } from '../juego/ingredientes';
import { useT } from '../i18n';
import { queAparece } from '../buscar/resolver';
import { useAparicion } from '../buscar/useAparicion';
import { useReconocer } from '../buscar/useReconocer';
import { useIngredientes } from '../buscar/useIngredientes';
import { CriaturaView, medida } from '../components/CriaturaView';
import { hayLugar, useJuego } from '../juego/store';
import { colorDeNivel, criaturaABuscar, fallosAntesDeRomper } from '../juego/datos';
import type { Rutas } from '../navegacion/rutas';
import { Cerrar } from '../shell/Cerrar';
import { colors, radius, spacing } from '../theme';

/**
 * Buscar una criatura con la cámara.
 *
 * Va a pantalla completa, sin el armazón: la cámara ocupa todo y el header
 * taparía justo lo que hay que mirar.
 *
 * **Y encima no va nada escrito.** Estaban la pista de lo que se siente cerca,
 * el aviso de lo que juntabas y la aclaración de cuándo no hay criatura: tres
 * renglones con el alto reservado al pie. Se sacaron enteros. Lo que se mira
 * acá es la imagen real con las cosas apoyadas encima, y cualquier texto sobre
 * eso es la app hablando por arriba de la escena que se armó.
 *
 * Lo único que queda es el botón de cerrar. Lo que decían esos renglones va a
 * volver de otra forma, fuera de la cámara.
 *
 * Toda la parte difícil —dónde aparece, cómo se acerca, qué motor corre— vive en
 * `useAparicion`. Acá solo está la secuencia del huevo y qué pasa cuando sale.
 */

type Props = NativeStackScreenProps<Rutas, 'Buscar'>;

/**
 * En qué momento de la secuencia está.
 *
 * Lo que se encuentra es el huevo, y hay que insistir: cada toque es un intento
 * de salir que falla, hasta que uno rompe el cascarón. Recién el que sale de ahí
 * se puede criar.
 */
type Fase = 'huevo' | 'falla' | 'eclosion' | 'nacido';

/**
 * Lado del ingrediente en la cámara, en puntos.
 *
 * Grande, pero **más chico que una criatura**. Recortado sobre la imagen real,
 * sin marco ni cartel, un ingrediente chico se lee como un icono de interfaz;
 * uno del tamaño del bicho rompe la escena al revés, porque un tomate no puede
 * medir lo mismo que un dragón.
 *
 * El número sale de una cuenta, no del ojo. En una pantalla de 411 puntos, una
 * criatura ocupa unos 210 de ancho **visibles** —su archivo trae mucho aire
 * alrededor, así que lo dibujado es bastante menos que la caja—. El ingrediente
 * llena su archivo casi entero, un 86%, y se dibuja con una escala al azar de
 * entre 0,85 y 1,20. Con 112, lo visible queda en unos 98 puntos: **algo menos
 * de la mitad de la criatura**, que es la relación que hace que las dos cosas
 * parezcan estar en el mismo mundo.
 *
 * Con los 160 de antes quedaba en 140 y se leía casi igual de grande que el
 * bicho.
 */
const HALLAZGO = 112;

/** Ancho de la criatura como proporción del ancho de pantalla. */
const ANCHO = 1.0;

export function BuscarScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const t = useT();
  const [permiso, pedirPermiso] = useCameraPermissions();

  const juego = useJuego((e) => e.juego);
  const nacer = useJuego((e) => e.nacer);
  const sumarIngrediente = useJuego((e) => e.sumarIngrediente);

  const [criatura, setCriatura] = useState<Criatura | null>(null);
  const [fase, setFase] = useState<Fase>('huevo');
  const faseRef = useRef<Fase>('huevo');
  /** Intentos fallidos que le faltan a este huevo antes de romperse. */
  const fallosRestantes = useRef(0);
  const reclamada = useRef(false);
  /** La vista de la cámara, para poder pedirle una foto y mirar qué hay. */
  const camara = useRef<CameraView | null>(null);
  const lleno = !hayLugar(juego);
  const tinte = colorDeNivel(juego.nivel);

  // Se elige una sola vez al entrar: el sorteo no se puede rehacer en cada
  // render, o la criatura cambiaría sola mientras la estás mirando.
  useEffect(() => {
    if (lleno) return;
    const id = criaturaABuscar(
      juego.completadas,
      juego.crianza.map((c) => c.criatura)
    );
    const elegida = id ? porId(id) : null;
    if (!elegida) return;

    setCriatura(elegida);
    fallosRestantes.current = elegida.falla ? fallosAntesDeRomper() : 0;
    const inicial: Fase = elegida.huevo ? 'huevo' : 'nacido';
    faseRef.current = inicial;
    setFase(inicial);
    // Sin dependencias a propósito: se sortea al entrar y no se vuelve a tocar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          : criatura.bebe;

  /**
   * Lo que se va a mostrar después, montado invisible para que ya esté
   * decodificado. Sin esto se ve un parpadeo en blanco en cada cambio.
   */
  const siguiente: Pieza | null = !criatura
    ? null
    : fase === 'eclosion'
      ? criatura.bebe
      : fase === 'falla'
        ? (criatura.huevo ?? null)
        : fase === 'huevo'
          ? (criatura.falla ?? criatura.eclosion ?? null)
          : null;

  const tamano = useMemo(
    () => (pieza ? medida(size, pieza) : { width: size, height: size }),
    [size, pieza]
  );

  // Mientras pasa algo que hay que mirar, la distancia se congela: no
  // corresponde que se aleje justo en ese momento.
  const aparicion = useAparicion({
    activo: !!permiso?.granted && !!criatura,
    tamano,
    congelado: fase === 'falla' || fase === 'eclosion',
  });

  /**
   * QUÉ ESTÁ VIENDO LA CÁMARA.
   *
   * Mira cada segundo y medio y publica una lectura firme. En un binario sin el
   * reconocedor —Expo Go— `lectura` queda en null para siempre y abajo se cae al
   * sorteo libre. Ver `docs/reconocer-el-lugar.md`.
   */
  const { lectura } = useReconocer(camara, !!permiso?.granted);

  // La otra mitad del botón de buscar: la misma cámara junta ingredientes.
  const { hallazgos, juntar } = useIngredientes({
    activo: !!permiso?.granted,
    /**
     * Qué aparece, decidido en el momento de aparecer y no antes: entre que se
     * abre la pantalla y que sale un ingrediente pasan segundos, y lo que la
     * cámara ve pudo haber cambiado.
     *
     * Sin reconocedor o sin lectura firme, sortea entre todos como hasta ahora.
     * **Esa caída es provisoria**: cuando el reconocedor esté probado hay que
     * decidir qué pasa de verdad al no reconocer nada, que es una de las cosas
     * que el plan deja abiertas. Hoy regala ingredientes por apuntar a una pared.
     */
    elegir: () => (lecturaRef.current ? queAparece(lecturaRef.current) : ingredienteAlAzar()),
    // Se suma al bolso y nada más. El aviso de qué juntaste se sacó de la
    // cámara: sobre la imagen real no va a haber texto.
    onJuntar: (i) => sumarIngrediente(i.id),
  });

  // La lectura se lee desde `elegir`, que corre adentro de un temporizador y no
  // en el render: sin la referencia veria siempre la primera.
  const lecturaRef = useRef(lectura);
  lecturaRef.current = lectura;

  function cambiarFase(f: Fase) {
    faseRef.current = f;
    setFase(f);
  }

  async function tocar() {
    if (!criatura) return;

    // Durante un intento o la eclosión no se toca nada: está pasando algo.
    if (fase === 'falla' || fase === 'eclosion') return;

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

      cambiarFase(paso);

      // La única forma de saber que una animación terminó es saber cuánto dura:
      // el componente de imagen no avisa nada. Ese número lo produce el script
      // de conversión, así que es exacto y no una estimación.
      setTimeout(() => {
        if (faseRef.current === paso) cambiarFase(rompe ? 'nacido' : 'huevo');
      }, animacion.duracion);
      return;
    }

    if (reclamada.current) return;
    reclamada.current = true;

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nacer(criatura.id);
    navigation.replace('Bicho', { criatura: criatura.id });
  }

  if (!permiso) return <Aviso texto={t('buscar.permisos')} onSalir={() => navigation.goBack()} />;

  if (!permiso.granted) {
    return (
      <Aviso
        texto={t('buscar.necesitaCamara')}
        accion={{ texto: t('buscar.darPermiso'), onPress: pedirPermiso }}
        onSalir={() => navigation.goBack()}
      />
    );
  }

  /*
   * De acá en adelante la cámara se abre siempre.
   *
   * No es solo para encontrar criaturas: los ingredientes también se consiguen
   * apuntando a las cosas, así que negarse a abrir porque ya tenés todas las
   * criaturas que podés criar dejaría afuera la mitad del juego. Cuando no hay
   * criatura que buscar, la cámara funciona igual y el cartel explica por qué no
   * aparece ninguna.
   */

  return (
    <View style={estilos.raiz}>
      <CameraView ref={camara} style={StyleSheet.absoluteFill} facing="back" />

      {criatura && pieza ? (
        // Se mantiene montada aunque esté fuera de cuadro: desmontarla reinicia
        // la animación, y con el temblor de la brújula eso se ve como un
        // parpadeo constante.
        <Animated.View
          style={[
            estilos.criatura,
            aparicion.estiloPosicion,
            { opacity: aparicion.listo ? 1 : 0 },
          ]}
          pointerEvents={aparicion.aLaVista ? 'auto' : 'none'}
        >
          <Pressable onPress={tocar} hitSlop={16}>
            <CriaturaView
              size={Math.round(size * aparicion.profundidad)}
              pieza={pieza}
              siguiente={siguiente}
              nombre={t(`criaturas.${criatura.id}`)}
              elemento={criatura.elemento}
            />
          </Pressable>
        </Animated.View>
      ) : null}

      {/*
        Los ingredientes.
        Van por encima de la criatura pero no le tapan el toque: cada uno ocupa
        solo su cajita. Todavía aparecen en cualquier lado; cuando la cámara
        sepa qué está mirando, van a salir donde corresponde.

        **Sin sombra de contacto.** Llevaban una elipse difusa apoyada en la
        base para que se leyeran posadas sobre lo que hubiera abajo. Funcionaba
        cuando el ingrediente caía sobre una superficie horizontal y fallaba en
        todo lo demás: contra una pared, en el aire o sobre algo oscuro, la
        sombra queda flotando sin nada que la explique. Una sombra que solo
        acierta a veces miente más de lo que ayuda.
      */}
      {hallazgos.map((h) => (
        <Pressable
          key={h.id}
          onPress={() => juntar(h)}
          hitSlop={14}
          style={[
            estilos.hallazgo,
            { left: `${Math.round(h.x * 100)}%`, top: `${Math.round(h.y * 100)}%` },
          ]}
          accessibilityRole="button"
          // El nombre no se dibuja, pero acá va igual: es lo único que tiene un
          // lector de pantalla para saber qué hay ahí.
          accessibilityLabel={t('buscar.juntar', { ingrediente: t(`ingredientes.${h.ingrediente.id}`) })}
        >
          <Image
            source={h.ingrediente.arte}
            style={{
              width: HALLAZGO * h.escala,
              height: HALLAZGO * h.escala,
              transform: [{ rotate: `${h.giro}deg` }],
            }}
            resizeMode="contain"
            fadeDuration={0}
          />
        </Pressable>
      ))}

      <View style={estilos.hud} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.goBack()}
          style={estilos.salir}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('buscar.salir')}
        >
          <Cerrar lado={42} />
        </Pressable>

      </View>
    </View>
  );
}

function Aviso({
  texto,
  accion,
  onSalir,
}: {
  texto: string;
  accion?: { texto: string; onPress: () => void };
  onSalir: () => void;
}) {
  const t = useT();

  return (
    <View style={estilos.centro}>
      <Text style={estilos.avisoTexto}>{texto}</Text>
      {accion ? (
        <Pressable onPress={accion.onPress} style={estilos.boton}>
          <Text style={estilos.botonTexto}>{accion.texto}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onSalir} style={estilos.boton}>
        <Text style={estilos.botonTexto}>{t('buscar.volver')}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#000' },
  criatura: { position: 'absolute' },

  hallazgo: { position: 'absolute', alignItems: 'center', width: 92, marginLeft: -46 },

  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  salir: { alignSelf: 'flex-end', padding: 4 },

  centro: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  avisoTexto: { color: colors.text, fontSize: 16, textAlign: 'center' },
  boton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  botonTexto: { color: colors.text, fontSize: 15 },
});
