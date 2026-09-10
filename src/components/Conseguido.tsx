import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { RATIO as RATIO_CARD } from '../album/cards';
import { CUANTAS_PUNTAS, Destello } from './Destello';
import { Cerrar } from '../shell/Cerrar';
import { colors, radius, spacing } from '../theme';

/**
 * Los dos botones, recortados de `assets/more buttons.png` con sharp.
 *
 * `video` se llama así y no `multiplicar` porque lo mismo paga el cambio de
 * premios de la ruleta: lo que dice el dibujo es "esto cuesta un video", y de
 * ahí para abajo cada pantalla decide qué da a cambio.
 *
 * Vienen dibujados como fichas con relieve, del mismo material que el resto de
 * los botones del juego. Por eso acá no se los tiñe ni se los enmarca: ya son
 * el botón.
 */
/** Cuánto ocupa una figurita del álbum. */
const ANCHO_CARTA = 176;
/** Cuánto ocupa un dibujo suelto: un ingrediente, un bicho, un icono. */
const ANCHO_ICONO = 104;

/**
 * Cuánto mide el estallido de rayos de atrás, **en veces lo que tapa**.
 *
 * Bastante más que el dibujo, para que las puntas salgan por los cuatro lados.
 * Contenido adentro no se vería, y ahí no habría estrella sino un fondo. Las
 * puntas asoman contra el velo a propósito; recortada contra el borde,
 * agrandarla no mostraba más estrella sino más relleno.
 *
 * Es una proporción y no una medida en puntos porque detrás de una carta y
 * detrás de un icono —que mide bastante menos— la misma cifra fija da dos
 * cosas distintas: al icono le quedaba nadando en el medio.
 */
const DESTELLO = 1.85;

/**
 * Cuánto se estira el destello a lo alto.
 *
 * Menos que la carta, que es 1,52. Con la proporción exacta el estirón se
 * notaba y la figura se leía como un óvalo; acá solo acompaña la forma, que es
 * lo que se quiere: que se sienta hecho para una carta sin que se vea que está
 * estirado.
 *
 * Va de la mano con `DESTELLO`: subiendo uno y bajando el otro en la misma
 * medida, el alto no se mueve y lo único que cambia es cuánto asoma a los
 * costados. Así se afinaron las puntas horizontales sin tocar las verticales.
 */
const DESTELLO_ALTO = 1.24;

const ACEPTAR = require('../../assets/ui/aceptar.webp');
const VIDEO = require('../../assets/ui/video.webp');

/**
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE ACABÁS DE CONSEGUIR
 * ───────────────────────────────────────────────────────────────────────────
 * El mismo cartel para todo lo que se gana: el premio de la ruleta, el
 * ingrediente que juntaste con la cámara, el bicho que encontraste.
 *
 * **Es uno solo a propósito.** Conseguir algo tiene que sentirse igual venga de
 * donde venga; tres carteles parecidos pero distintos hacen que el juego se lea
 * como tres juegos pegados. Cualquier cambio de acá vale para los tres.
 *
 * Entra con un rebote —no con un desvanecido— porque un premio que aparece
 * despacio no se siente como un premio. Y se cierra a mano, nunca solo:
 * cerrarlo por tiempo obliga a mirar rápido, y la mitad de la gracia es
 * quedarse viendo qué te tocó.
 */
export function Conseguido({
  arte,
  texto,
  detalle,
  tinte,
  aceptar,
  onAceptar,
  multiplicar,
  rechazar,
  sobreCamara = false,
  formato = 'icono',
  fondo,
  varios,
  festejo = false,
}: {
  arte: ImageSourcePropType;
  /** Qué conseguiste, ya armado y traducido. */
  texto: string;
  /**
   * Qué hacer ahora con eso, si hace falta decirlo.
   *
   * Va debajo y más chico: lo primero es qué te tocó, y recién después qué
   * sigue. Casi nada lo necesita —un ingrediente se junta y ya— pero un bicho
   * recién encontrado no hace nada solo, y sin esto la primera criatura se
   * queda esperando en la colección sin que se entienda por qué.
   */
  detalle?: string;
  /** El color de la vuelta. Tiñe el halo y el botón. */
  tinte: string;
  /** Cómo se llama el botón de salir. */
  aceptar: string;
  onAceptar: () => void;
  /**
   * La oferta de multiplicar por tres a cambio de un video.
   *
   * Es opcional: sin esto queda solo el botón de aceptar, que es lo que
   * corresponde cuando lo que conseguiste no se puede multiplicar —un bicho es
   * uno, no tres.
   *
   * Si no hay anuncio cargado no se dibuja: ofrecer un video que después no
   * está es peor que no ofrecerlo.
   */
  multiplicar?: {
    texto: string;
    listo: boolean;
    onPress: () => void;
  };
  /**
   * Poder decir que no.
   *
   * Casi nunca hace falta: lo que encontraste ya es tuyo y el cartel solo lo
   * anuncia. Se usa cuando **quedarse con esto cuesta otra cosa** —el impulso de
   * la ruleta, que pisa al que estuviera corriendo—. Ahí ya no es un premio sino
   * una decisión, y una decisión sin la opción de decir que no es un cartel que
   * miente.
   */
  rechazar?: {
    texto: string;
    onPress: () => void;
  };
  /**
   * Que se vea la cámara detrás.
   *
   * Sobre las pantallas de papel del juego el cartel tapa todo, que es lo que
   * corresponde: no hay nada atrás que valga la pena mirar. Sobre la imagen real
   * sí lo hay —el lugar donde encontraste la cosa— y taparlo le saca al hallazgo
   * la mitad de lo que significa.
   *
   * Así que ahí el cartel se encoge a una ventana: el papel del juego, apenas
   * translúcido, con la imagen alrededor y adivinándose por debajo. La ventana
   * es lo que hace que el texto se lea sin depender de a qué le estés apuntando.
   */
  sobreCamara?: boolean;
  /**
   * Qué forma tiene lo que se ganó.
   *
   * `icono` es un ingrediente o un bicho: un dibujo suelto, cuadrado. `carta`
   * es una figurita del álbum, que es alta y lleva su marco dorado dibujado
   * encima, así que va más grande y con su proporción — achatada en un cuadrado
   * no se le vería nada.
   */
  formato?: 'icono' | 'carta';
  /**
   * Qué va detrás del dibujo, cuando no alcanza con lo que dice `formato`.
   *
   * Normalmente no se pasa: un icono lleva halo y una carta lleva estrella, y
   * esa es la regla. Existe para el final del juego, que muestra un icono
   * —el del álbum— y necesita la estrella de las doradas detrás, porque lo que
   * se está festejando es de ese tamaño y no el de haber juntado algo.
   */
  fondo?: 'halo' | 'estrella';
  /**
   * Cuando lo que se ganó son **varias cosas distintas**.
   *
   * En lugar del dibujo grande se dibuja una fila de discos chicos, cada uno con
   * su cuenta, como las cajitas del bolso. Es lo que hace falta para el premio
   * del camino, que da tres, cuatro o seis clases diferentes de una vez.
   *
   * `arte` sigue siendo obligatorio y se usa como respaldo: si la lista llegara
   * vacía, el cartel muestra ese dibujo en vez de un hueco.
   */
  varios?: { arte: ImageSourcePropType; cuantos: number }[];
  /**
   * El festejo grande, para lo que se gana una vez cada muchas.
   *
   * Sube el halo y lo hace latir. Se guarda para las doradas: si todo festejara
   * igual, completar una hoja entera se sentiría lo mismo que juntar una
   * zanahoria.
   */
  festejo?: boolean;
}) {
  const entrada = useRef(new Animated.Value(0)).current;

  // La animación vive acá adentro y no la maneja quien lo usa: es parte de cómo
  // se siente conseguir algo, no una decisión de cada pantalla.
  useEffect(() => {
    entrada.setValue(0);
    Animated.spring(entrada, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [entrada]);

  // La oferta puede estar pedida y no haber llegado. Todo lo que sigue mira
  // esto y no `multiplicar` a secas: sin anuncio cargado, el cartel es el de un
  // solo botón, incluido cómo se llama.
  const hayOferta = !!multiplicar && multiplicar.listo;
  const esCarta = formato === 'carta';

  /** Estrella o halo. Manda `fondo` si lo pasaron; si no, lo dice el formato. */
  const conEstrella = fondo ? fondo === 'estrella' : esCarta;

  /** Se ganaron varias cosas distintas y se dibujan en fila. Ver `varios`. */
  const hayVarios = !!varios && varios.length > 0;

  /** Cuánto ocupa lo que se muestra: la carta es más grande que un icono. */
  const anchoArte = esCarta ? ANCHO_CARTA : ANCHO_ICONO;

  /**
   * Cuánto mide la estrella de atrás.
   *
   * Se mide **contra lo que hay adelante** y no en puntos fijos: la misma
   * estrella detrás de una carta de 176 y detrás de un icono de 104 se lee como
   * dos cosas distintas, y con el número clavado el icono le quedaba nadando en
   * el medio.
   *
   * En la dorada va más chica que en una carta común, no más grande: la carta
   * dorada tiene su propio resplandor dibujado y una estrella que la desborda le
   * agrega ruido alrededor en vez de destacarla.
   */
  const ladoDestello = Math.round(anchoArte * (festejo ? DESTELLO * 0.95 : DESTELLO));

  /**
   * El latido del halo en el festejo.
   *
   * Late el resplandor y no la carta: lo que se está mirando es el dibujo, y
   * una carta que respira se lee como un error de render, no como una fiesta.
   */
  const brillo = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!festejo) return;
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(brillo, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
        Animated.timing(brillo, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [festejo, brillo]);

  /**
   * La vuelta lenta de la estrella.
   *
   * Gira **una punta**, no una vuelta entera: la estrella tiene dieciséis y
   * cada 22,5 grados vuelve a verse igual, así que con ese recorrido el giro no
   * tiene principio ni final visible y puede repetirse sin saltar.
   *
   * Lento a propósito. Lo que se mira es el dibujo de adelante; la estrella
   * tiene que dar la sensación de que algo pasa, no llamar la atención. A esta
   * velocidad se nota mirándola y se olvida leyendo el cartel.
   *
   * Va junto con el latido y no en su lugar: uno respira y la otra gira, y las
   * dos cosas a la vez son las que hacen que no se lea como una imagen quieta.
   */
  const vuelta = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!festejo) return;
    const ciclo = Animated.loop(
      Animated.timing(vuelta, {
        toValue: 1,
        duration: 6500,
        // Sin curva: una vuelta con aceleración y frenada se nota al empalmar,
        // y lo que tiene que parecer es que nunca dejó de girar.
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [festejo, vuelta]);

  /** De 0 a una punta. Ver `vuelta`. */
  const giro = vuelta.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 / CUANTAS_PUNTAS}deg`],
  });

  return (
    <Animated.View
      style={[
        estilos.raiz,
        // Sobre la cámara no hay velo: la ventana se defiende sola.
        //
        // Fuera de ella, una carta va sobre blanco entero y no sobre el velo
        // crema: la carta es lo único que se mira, y el crema del velo es el
        // mismo de la hoja que hay atrás, así que el cartel no se separaba de
        // la pantalla que venía tapando.
        !sobreCamara && { backgroundColor: esCarta ? '#FFFFFF' : colors.velo },
        {
          opacity: entrada,
          transform: [
            { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        },
      ]}
    >
      <View style={[estilos.caja, sobreCamara && estilos.ventana]}>
        {/* Lo que va detrás del dibujo: es lo que hace que se lea como algo que
            se ganó y no como una ficha más del inventario.

            Va adentro de la misma caja que el dibujo y no suelto sobre la
            pantalla. Suelto quedaba centrado en la pantalla y no en el premio, y
            como además era mucho más grande que el dibujo, se leía como un fondo
            de la hoja entera en vez de como un halo.

            **Un halo redondo para lo redondo y rayos para la carta.** El disco
            funciona detrás de un ingrediente, que es una silueta suelta, pero
            detrás de una carta rectangular le deja las cuatro esquinas afuera y
            se lee como una mancha mal puesta. Los rayos salen del centro y no
            tienen forma propia que respetar. */}
        <View style={estilos.retrato}>
          {conEstrella ? (
            <Animated.View
              style={[
                estilos.destello,
                {
                  width: ladoDestello,
                  height: Math.round(ladoDestello * (esCarta ? DESTELLO_ALTO : 1)),
                },
                festejo && { transform: [{ scale: brillo }, { rotate: giro }] },
              ]}
              pointerEvents="none"
            >
              <Destello
                lado={ladoDestello}
                // Acompaña la forma de lo que tapa sin copiarla: estirada para
                // la carta, redonda para un icono, que es cuadrado.
                proporcion={esCarta ? DESTELLO_ALTO : 1}
                // Dorada cuando lo que se gana es dorado —una legendaria, o el
                // final del juego—, y del color de la vuelta el resto del tiempo.
                // Lo dorado es dorado en las ocho vueltas: teñirlo del ciclo le
                // sacaba justamente lo que lo distingue. Ver `colors.dorado`.
                color={festejo ? colors.dorado : tinte}
                // Menos, no más: la carta dorada ya brilla sola y con la
                // estrella al mismo peso que en una carta común el fondo se le
                // sumaba encima. En la que hay que mirar, el fondo se corre.
                intensidad={festejo ? 0.85 : 1}
              />
            </Animated.View>
          ) : hayVarios ? (
            /*
             * Con varias cosas no va nada atrás.
             *
             * El halo es un disco, y detrás de una fila de tres o seis
             * ingredientes queda una mancha redonda que no acompaña a nada: ni
             * los contiene ni sigue su forma. Lo que hace que eso se lea como un
             * premio es que sean varios y que cada uno traiga su cuenta, no que
             * haya algo brillando atrás.
             */
            null
          ) : (
            <Animated.View
              style={[
                estilos.resplandor,
                festejo && estilos.resplandorFiesta,
                { backgroundColor: `${tinte}${festejo ? '55' : '33'}` },
                festejo && { transform: [{ scale: brillo }] },
              ]}
            />
          )}
          {/* Varias cosas distintas, o una sola. Ver `varios`. */}
          {hayVarios && varios ? (
            <View style={estilos.varios}>
              {varios.map((x, i) => (
                <View key={i} style={estilos.uno}>
                  <Image
                    source={x.arte}
                    style={estilos.artePequeno}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                  {/* La cuenta solo cuando hay más de una: un "×1" en cada cosa es
                      ruido, y lo que importa ahí es cuántas clases salieron. */}
                  {x.cuantos > 1 ? (
                    <View style={[estilos.cuenta, { backgroundColor: tinte }]}>
                      <Text style={estilos.cuentaTexto}>×{x.cuantos}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Image
              source={arte}
              style={esCarta ? estilos.carta : estilos.arte}
              resizeMode="contain"
              fadeDuration={0}
            />
          )}
        </View>

        <View style={[estilos.dicho, esCarta && estilos.dichoCarta]}>
          <Text style={[estilos.texto, { color: tinte }]}>{texto}</Text>
          {detalle ? (
            <Text style={[estilos.detalle, esCarta && estilos.detalleFicha]}>{detalle}</Text>
          ) : null}
        </View>

        {/* Los dos botones van uno al lado del otro, cada uno con su nombre
            debajo.

            El arte ya es un botón entero —tiene relieve, borde y sombra—, así
            que no va metido adentro de una pastilla teñida: un botón dentro de
            otro botón no se lee como nada. La palabra va abajo y no al lado
            porque así los dos ocupan el mismo ancho, y con o sin multiplicar el
            de aceptar queda del mismo tamaño.

            ## PRIMERO EL QUE ACEPTA, ÚLTIMO EL QUE CANCELA

            Es una convención, no una preferencia de esta pantalla: en toda la
            app la acción va primero y la salida al final. Estuvo al revés
            —cancelar a la izquierda— con el argumento de que el pulgar cae más
            cómodo a la derecha y ahí tenía que estar el que cierra. El costo era
            peor que el beneficio: cada cartel obligaba a leer los dos botones
            para saber cuál era cuál, porque el orden no era el de siempre.

            El multiplicar queda en el medio: no es ni la acción ni la salida,
            es una oferta aparte, y en una punta se leía como una de las dos. */}
        <View style={estilos.botones}>
          <Pressable
            onPress={onAceptar}
            style={({ pressed }) => [estilos.boton, pressed && estilos.apretado]}
            accessibilityRole="button"
            accessibilityLabel={aceptar}
          >
            <Image source={ACEPTAR} style={estilos.icono} resizeMode="contain" fadeDuration={0} />
            <Text style={[estilos.botonTexto, { color: tinte }]}>{aceptar}</Text>
          </Pressable>

          {hayOferta ? (
            <Pressable
              onPress={multiplicar.onPress}
              style={({ pressed }) => [estilos.boton, pressed && estilos.apretado]}
              accessibilityRole="button"
              accessibilityLabel={multiplicar.texto}
            >
              <Image source={VIDEO} style={estilos.icono} resizeMode="contain" fadeDuration={0} />
              <Text style={[estilos.botonTexto, { color: tinte }]}>{multiplicar.texto}</Text>
            </Pressable>
          ) : null}

          {rechazar ? (
            <Pressable
              onPress={rechazar.onPress}
              style={({ pressed }) => [estilos.boton, pressed && estilos.apretado]}
              accessibilityRole="button"
              accessibilityLabel={rechazar.texto}
            >
              {/* La misma ficha con la que se cierra todo lo demás del juego:
                  decir que no y cerrar una hoja se hacen con el mismo gesto. */}
              <Cerrar lado={64} />
              <Text style={[estilos.botonTexto, { color: tinte }]}>{rechazar.texto}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  /** Lo que va adentro, con ventana o sin ella. */
  caja: { alignItems: 'center', gap: spacing.lg },
  /**
   * La ventana sobre la cámara.
   *
   * Chica y del papel del juego, no blanca: el blanco puro no aparece en
   * ninguna otra pantalla, y encima de una foto se lee como un cartel del
   * sistema operativo y no como parte del juego.
   *
   * **Apenas translúcida** —`veloTenue`, el token que el proyecto ya tenía para
   * lo que debe dejar ver el fondo—. Lo justo para que se adivine la imagen a
   * través del papel y quede claro que el hallazgo pasó ahí, sin que el texto
   * dependa de a qué le estabas apuntando.
   */
  ventana: {
    backgroundColor: colors.veloTenue,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    maxWidth: 340,
    // El filo claro es lo que la despega de la imagen. Sin él, contra un fondo
    // claro la ventana no termina en ningún lado.
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  /** La caja del premio: el halo y el dibujo, centrados uno sobre el otro. */
  retrato: { alignItems: 'center', justifyContent: 'center' },
  /**
   * El halo, apenas más grande que el dibujo.
   *
   * La proporción es lo que importa: con el halo muy por encima del dibujo deja
   * de leerse como el brillo de la cosa y pasa a ser una mancha de fondo.
   */
  resplandor: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
  },
  arte: { width: ANCHO_ICONO, height: ANCHO_ICONO },

  /**
   * La fila de cosas, cuando se ganó más de una.
   *
   * Envuelve: con seis u ocho ingredientes una sola línea los achicaría hasta
   * que no se distinga cuál es cuál, y lo que se está mostrando es justamente
   * qué te tocó. Ancho topado al del dibujo grande para que el cartel no se
   * ensanche según cuántas salieron.
   */
  varios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: ANCHO_ICONO * 2.6,
  },
  /** Cada cosa, con lugar para que su cuenta asome por la esquina. */
  uno: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  artePequeno: { width: 46, height: 46 },
  cuenta: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 24,
    paddingHorizontal: 5,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuentaTexto: { color: colors.sobreTinte, fontSize: 11, fontWeight: '700' },
  /**
   * Una figurita del álbum: alta y bastante más grande que un icono.
   *
   * La proporción sale de `cards`, medida sobre el arte, así que la carta del
   * cartel y la de la hoja son la misma forma. Y va grande porque es lo que se
   * ganó: una figurita chiquita no se mira, se cierra.
   */
  carta: { width: ANCHO_CARTA, height: Math.round(ANCHO_CARTA * RATIO_CARD) },
  /** La caja del destello. El SVG va centrado adentro y no ocupa lugar. */
  destello: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resplandorFiesta: {
    width: 268,
    height: 268,
    borderRadius: 134,
  },
  /**
   * Lo que se dice, junto.
   *
   * Las dos líneas van en su propia caja y con poco aire entre ellas: si
   * colgaran sueltas del contenedor, el `gap` grande que separa el dibujo de
   * los botones las separaría también a ellas, y dejarían de leerse como una
   * cosa dicha de corrido.
   */
  dicho: { alignItems: 'center', gap: spacing.sm },
  /**
   * Aire de más entre la carta y lo que dice.
   *
   * La estrella de atrás es más alta que la carta y se sale por abajo, así que
   * el texto la tocaba aunque el espacio con la carta fuera el de siempre. Este
   * margen lo separa de la punta, no del dibujo.
   */
  dichoCarta: { marginTop: 26 },
  texto: { fontSize: 21, textAlign: 'center', lineHeight: 29, fontWeight: '600' },
  /**
   * La instrucción, en el color del texto del juego y no en el de la vuelta.
   *
   * Teñida igual que el titular las dos frases pesan lo mismo y hay que leer
   * las dos para saber cuál importa. En el marrón de siempre se lee como lo que
   * es: una nota al pie de la noticia.
   */
  detalle: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    opacity: 0.85,
  },
  /**
   * El detalle de una carta: quién es y qué está haciendo.
   *
   * Más chico que el de un hallazgo, porque **no es una frase sino una ficha**:
   * "Dragón turquesa VOLAR" es lo que dice la carta de sí misma, no algo que se
   * le esté contando a nadie. Con el mismo cuerpo que "Dale de comer para que
   * crezca" las dos cosas se leían igual, y una es un rótulo y la otra una
   * instrucción.
   *
   * La caja alta va **solo en la acción**, y la pone quien arma el texto: el
   * nombre del bicho tiene que leerse como nombre.
   */
  detalleFicha: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    // Sin peso extra: lo que destaca la acción es la caja alta, no la negrita.
    // Con las dos cosas el rótulo pesaba más que el título de arriba.
    fontWeight: '400',
  },

  botones: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  /**
   * Cada botón: la ficha y su nombre debajo.
   *
   * El ancho fijo es lo que los mantiene parejos. Sin él, "Multiplicar x3" hace
   * su columna mucho más ancha que "Listo" y los dos círculos dejan de estar a
   * la misma distancia del centro.
   */
  boton: { alignItems: 'center', gap: spacing.sm, width: 124 },
  /** El área de toque real es la ficha; el texto es una etiqueta, no un botón. */
  icono: { width: 64, height: 64 },
  botonTexto: { fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  // Se hunde apenas al apretarlo, como una ficha que se aprieta de verdad.
  apretado: { opacity: 0.75, transform: [{ scale: 0.94 }] },
});
