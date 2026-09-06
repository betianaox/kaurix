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
import { RECONOCEDOR_MANDA } from '../flags';
import { ingredienteAlAzar, type Ingrediente } from '../juego/ingredientes';
import { useAnuncioRecompensado } from '../anuncios/useAnuncioRecompensado';
import { Conseguido } from '../components/Conseguido';
import { useT } from '../i18n';
import { queAparece } from '../buscar/resolver';
import { useAparicion } from '../buscar/useAparicion';
import { useReconocer } from '../buscar/useReconocer';
import { CADA, useIngredientes } from '../buscar/useIngredientes';
import { CriaturaView, medida } from '../components/CriaturaView';
import { hayLugar, useJuego } from '../juego/store';
import { colorDeNivel, criaturaABuscar, dificultadDe, fallosAntesDeRomper } from '../juego/datos';
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
/**
 * Cada cuánto aparece un ingrediente mientras hay un bicho dado vuelta.
 *
 * Más del triple de lo normal. Los dos no se dibujan a la vez —abajo la
 * criatura se esconde mientras hay un hallazgo en pantalla— así que este número
 * es, en la práctica, cuánto del tiempo le toca a cada uno: con esto la
 * criatura tiene la pantalla la mayor parte del rato y el ingrediente pasa cada
 * tanto.
 *
 * Al ritmo normal el ingrediente estaría en pantalla más de la mitad del
 * tiempo y buscar la criatura se volvería esperar a que se despeje.
 */
const CADA_CON_BICHO = 12000;

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
    fallosRestantes.current = elegida.falla ? fallosAntesDeRomper(elegida.id) : 0;
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
    // Cuánto cuesta encontrar a esta: el tutorial aparece encima casi enseguida
    // y las demás varían. Ver `dificultadDe`.
    dificultad: criatura ? dificultadDe(criatura.id) : 1,
    congelado: fase === 'falla' || fase === 'eclosion',
  });

  /**
   * QUÉ ESTÁ VIENDO LA CÁMARA.
   *
   * Mira cada segundo y medio y publica una lectura firme. `disponible` dice si
   * este binario trae el reconocedor; sin él —Expo Go— `lectura` queda en null
   * para siempre. Los dos se usan abajo, y no significan lo mismo.
   * Ver `../docs/kaurix-reconocer-el-lugar.md`.
   *
   * Con `RECONOCEDOR_MANDA` apagado ni siquiera arranca el reloj: no se saca
   * ninguna foto, no se gasta batería y la imagen no se toca. Un reconocedor
   * mirando para nada mientras se prueba otra cosa es puro costo.
   */
  const { lectura, disponible } = useReconocer(
    camara,
    !!permiso?.granted && RECONOCEDOR_MANDA
  );

  /**
   * El latido del aviso de bicho.
   *
   * Va de 1 a 1,08 y vuelve, para siempre. Es lo único que se mueve en una
   * esquina de una pantalla donde todo lo demás es la imagen de la cámara: si
   * estuviera quieto se leería como parte de la interfaz y no como un aviso.
   */
  const latido = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!criatura) return;
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1.22, duration: 900, useNativeDriver: true }),
        Animated.timing(latido, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [criatura, latido]);

  /**
   * Lo que acabás de encontrar, mientras se anuncia.
   *
   * Nada se guarda hasta que el cartel se cierra: es el cartel el que otorga,
   * no el toque. Así el mismo botón puede ofrecer llevarse uno o tres, y el
   * juego no tiene que deshacer nada si elegís lo segundo.
   */
  const [conseguido, setConseguido] = useState<
    { que: 'ingrediente'; ingrediente: Ingrediente } | { que: 'bicho' } | null
  >(null);

  /**
   * El video que multiplica por tres el ingrediente encontrado.
   *
   * Se pide al entrar a la cámara y no al tocar el botón: un anuncio tarda en
   * cargar, y pedirlo recién ahí deja esperando delante de un premio ya
   * prometido.
   */
  const anuncio = useAnuncioRecompensado();

  // La otra mitad del botón de buscar: la misma cámara junta ingredientes.
  const { hallazgos, juntar } = useIngredientes({
    /**
     * **Con el cartel abierto no aparece nada.** Cerrarlo y toparse con otro
     * hallazgo ya esperando convierte el momento de encontrar algo en una cinta
     * que no para.
     */
    activo: !!permiso?.granted && !conseguido,
    /**
     * Con un bicho dado vuelta, más espaciados.
     *
     * **Nunca se dibujan los dos a la vez**: mientras hay un ingrediente en
     * pantalla la criatura se esconde, y vuelve cuando el ingrediente se va o
     * lo juntás. Se turnan.
     *
     * Por eso este número no es solo un ritmo: es cuánto del tiempo le toca a
     * cada uno. Seguir a la criatura es lo principal y se queda con la mayor
     * parte; el ingrediente pasa cada tanto y devuelve la pantalla.
     */
    cada: criatura ? CADA_CON_BICHO : CADA,
    /**
     * Qué aparece, decidido en el momento de aparecer y no antes: entre que se
     * abre la pantalla y que sale un ingrediente pasan segundos, y lo que la
     * cámara ve pudo haber cambiado.
     *
     * Son tres casos, y no significan lo mismo:
     *
     * - **Con el reconocedor apagado a mano** —`RECONOCEDOR_MANDA`, mientras se
     *   prueba el resto— sortea libre. Es temporal; ver `flags`.
     * - **Sin reconocedor** —Expo Go, o un binario de antes de instalarlo— no
     *   hay con qué saber qué hay enfrente. El sorteo libre se queda: es lo
     *   único que mantiene el juego jugable mientras tanto.
     * - **Con reconocedor y sin nada reconocido** —una pared blanca, poca luz—
     *   no aparece nada. Regalar un ingrediente por apuntar a una pared vacía la
     *   búsqueda entera: si sale lo mismo mirando cualquier cosa, no hay nada
     *   que buscar, y el botón se vuelve una palanca de la que tirar.
     *
     * `disponible` es una constante del módulo, no cambia mientras corre, así
     * que no necesita la referencia que sí necesita la lectura.
     */
    elegir: () => {
      // Mientras se prueba el resto del juego, sortea libre como antes.
      if (!RECONOCEDOR_MANDA || !disponible) return ingredienteAlAzar();
      const leido = lecturaRef.current;
      return leido ? queAparece(leido) : null;
    },
    /**
     * Se suma en el momento de tocarlo, y recién después se anuncia.
     *
     * **El cartel no pregunta nada.** No tiene botón de rechazar: lo tocaste, es
     * tuyo. El botón que cierra es una convención —hace falta algo que tocar
     * para seguir— y no una confirmación; si además decidiera, cerrar la app con
     * el cartel abierto te dejaría sin lo que ya habías encontrado.
     */
    onJuntar: (i) => {
      sumarIngrediente(i.id, 1);
      setConseguido({ que: 'ingrediente', ingrediente: i });
    },
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
    // Nace acá, con el cartel: encontrarlo ya pasó. El cartel es el momento en
    // que lo único que ocurre es que lo encontraste, no una pregunta.
    nacer(criatura.id);
    setConseguido({ que: 'bicho' });
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
      {/*
        `animateShutter` apagado: el reconocedor saca una foto cada segundo y
        medio, y la animación de obturador que trae la cámara hace un destello
        en cada una. Encendida, la imagen parpadea sola cada 1,5 s sin que nadie
        haya sacado ninguna foto. Es prop del componente, no opción de
        `takePictureAsync` — ver `mirar`.
      */}
      <CameraView
        ref={camara}
        style={StyleSheet.absoluteFill}
        facing="back"
        animateShutter={false}
      />

      {criatura && pieza && !conseguido && hallazgos.length === 0 ? (
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
        {/* Arriba: el aviso de bicho a la izquierda, el cerrar a la derecha. */}
        <View style={estilos.arriba} pointerEvents="box-none">
          {/*
            HAY UN BICHO DADO VUELTA POR ACÁ.

            Aparece cuando el juego te asignó una criatura, esté cerca o lejos
            —no mide distancia, avisa que hay algo que buscar—. Sin eso, salir a
            caminar veinte metros es un acto de fe: no hay forma de saber si
            estás buscando algo o si esta vuelta no tocó ninguna.

            **Sin palabras**, que es la regla de esta pantalla: sobre la imagen
            real no va texto. Se muestra la silueta de la criatura, teñida del
            color de la vuelta: dice que hay una y qué forma tiene, no cuál.

            **Late el aro, no la silueta.** Un aviso quieto en una esquina no se
            mira, pero si lo que crece y se achica es el dibujo, la forma —que
            es lo único que este aviso tiene para decir— deja de leerse. El aro
            pulsa alrededor y la silueta se queda quieta.
          */}
          {criatura && !conseguido ? (
            <View style={estilos.avisoBicho} pointerEvents="none">
              <Animated.View
                style={[
                  estilos.avisoAro,
                  { borderColor: tinte, transform: [{ scale: latido }] },
                ]}
              />
              <Image
                source={criatura.sombra}
                style={[estilos.avisoBichoArte, { tintColor: tinte }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            // Sin aviso, el hueco se mantiene igual: sin él, el botón de cerrar
            // se corre de lugar según haya bicho o no.
            <View />
          )}

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

      {/*
        El cartel de lo que encontraste va **último**, después del HUD: tapa la
        pantalla entera y puesto antes le quedaría el botón de salir encima.
        En una fila de hermanos, el que se dibuja último es el que queda arriba.
      */}
      {conseguido ? (
        conseguido.que === 'ingrediente' ? (
          <Conseguido
            arte={conseguido.ingrediente.arte}
            texto={t('buscar.encontrasteIngrediente', {
              cantidad: '1',
              cosa: t(`ingredientes.${conseguido.ingrediente.id}`),
            })}
            tinte={tinte}
            sobreCamara
            aceptar={t('conseguido.aceptar')}
            onAceptar={() => setConseguido(null)}
            multiplicar={{
              texto: t('conseguido.multiplicar'),
              listo: anuncio.listo,
              /**
               * El uno ya está sumado desde que apareció el cartel, así que el
               * video suma los otros dos.
               *
               * Cortarlo a la mitad no da recompensa y no hace falta que la dé:
               * lo peor que pasa es que te quedes con el que ya era tuyo.
               */
              onPress: () => {
                const id = conseguido.ingrediente.id;
                setConseguido(null);
                anuncio.mostrar(() => sumarIngrediente(id, 2));
              },
            }}
          />
        ) : criatura ? (
          <Conseguido
            arte={criatura.quieto}
            texto={t('buscar.encontrasteBicho', { bicho: t(`criaturas.${criatura.id}`) })}
            detalle={t('buscar.daleDeComer')}
            tinte={tinte}
            sobreCamara
            aceptar={t('conseguido.aceptar')}
            onAceptar={() => navigation.replace('Bicho', { criatura: criatura.id })}
          />
        ) : null
      ) : null}
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
  /**
   * La fila de arriba: el aviso a la izquierda, el cerrar a la derecha.
   *
   * Van juntos en una fila y no sueltos en el HUD. El HUD reparte a lo alto con
   * `space-between`, así que con dos hijos sueltos el cerrar se iba al fondo de
   * la pantalla.
   */
  arriba: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  salir: { padding: 4 },

  /**
   * El aviso de que hay un bicho.
   *
   * Ficha de papel con borde teñido, como las de la colección: sobre la imagen
   * real hace falta un fondo propio o la silueta negra desaparece contra
   * cualquier cosa oscura. Es el mismo recurso que el resto del juego usa para
   * apoyar algo sobre lo que sea.
   */
  avisoBicho: {
    alignSelf: 'flex-start',
    width: 34,
    height: 34,
    borderRadius: 17,
    // El papel a la mitad. Va escrito y no con un token porque los dos velos
    // que hay —`velo` y `veloTenue`— están pensados para tapar una pantalla
    // entera, y acá lo que se quiere es lo contrario: que el disco casi no
    // esté. Tampoco va como `opacity` del contenedor, que atenuaría también la
    // silueta y el aro, y esos ya tienen la suya.
    backgroundColor: 'rgba(244,237,223,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * El aro que late, suelto del fondo.
   *
   * Va absoluto y no como `borderWidth` del contenedor: escalando el contenedor
   * se escala todo lo de adentro, y lo que tiene que pulsar es el borde solo.
   * Así el aro se sale de los 34 px al crecer, que es justo lo que se quiere.
   */
  avisoAro: {
    ...StyleSheet.absoluteFill,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  /**
   * La silueta, del color de la vuelta.
   *
   * `tintColor` pinta el arte entero de un color: la sombra viene en negro con
   * transparencia, así que teñida queda como una figura plena.
   *
   * A la mitad para que el color se lea sin que la figura quede dura contra el
   * fondo de papel: es un aviso en una esquina, no una pieza del juego.
   */
  avisoBichoArte: { width: 27, height: 27, opacity: 0.5 },

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
