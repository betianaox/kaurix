import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { RATIO as RATIO_CARD } from '../album/cards';
import { Destello } from './Destello';
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
/**
 * Cuánto mide el estallido de rayos de atrás.
 *
 * Bastante más que la carta —que mide 176 de ancho— para que las puntas salgan
 * por los cuatro lados. Contenida dentro de la carta no se vería, y ahí no
 * habría estrella sino un fondo.
 *
 * Más ancha que la tarjeta a propósito: las puntas salen por los cuatro lados y
 * se ven contra el velo. Recortada contra el borde, agrandarla no mostraba más
 * estrella sino más relleno.
 */
const DESTELLO = 300;

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

  /**
   * Cuánto mide la estrella de atrás.
   *
   * En la dorada va más chica que en una carta común, no más grande: la carta
   * dorada tiene su propio resplandor dibujado y una estrella que la desborda le
   * agrega ruido alrededor en vez de destacarla.
   */
  const ladoDestello = festejo ? Math.round(DESTELLO * 0.95) : DESTELLO;

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
          {esCarta ? (
            <Animated.View
              style={[
                estilos.destello,
                { width: ladoDestello, height: Math.round(ladoDestello * DESTELLO_ALTO) },
                festejo && { transform: [{ scale: brillo }] },
              ]}
              pointerEvents="none"
            >
              <Destello
                lado={ladoDestello}
                // Acompaña la forma de la carta sin copiarla. Ver DESTELLO_ALTO.
                proporcion={DESTELLO_ALTO}
                color={tinte}
                // Menos, no más: la carta dorada ya brilla sola y con la
                // estrella al mismo peso que en una carta común el fondo se le
                // sumaba encima. En la que hay que mirar, el fondo se corre.
                intensidad={festejo ? 0.85 : 1}
              />
            </Animated.View>
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
          <Image
            source={arte}
            style={esCarta ? estilos.carta : estilos.arte}
            resizeMode="contain"
            fadeDuration={0}
          />
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

            El multiplicar va a la izquierda: el pulgar cae más cómodo a la
            derecha, y ahí tiene que estar el que cierra, no el que gasta. */}
        <View style={estilos.botones}>
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

          <Pressable
            onPress={onAceptar}
            style={({ pressed }) => [estilos.boton, pressed && estilos.apretado]}
            accessibilityRole="button"
            accessibilityLabel={aceptar}
          >
            <Image source={ACEPTAR} style={estilos.icono} resizeMode="contain" fadeDuration={0} />
            <Text style={[estilos.botonTexto, { color: tinte }]}>{aceptar}</Text>
          </Pressable>
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
  arte: { width: 104, height: 104 },
  /**
   * Una figurita del álbum: alta y bastante más grande que un icono.
   *
   * La proporción sale de `cards`, medida sobre el arte, así que la carta del
   * cartel y la de la hoja son la misma forma. Y va grande porque es lo que se
   * ganó: una figurita chiquita no se mira, se cierra.
   */
  carta: { width: 176, height: Math.round(176 * RATIO_CARD) },
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
