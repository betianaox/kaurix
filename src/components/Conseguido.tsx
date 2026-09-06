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

  return (
    <Animated.View
      style={[
        estilos.raiz,
        // Sobre la cámara no hay velo: la ventana se defiende sola.
        !sobreCamara && { backgroundColor: colors.velo },
        {
          opacity: entrada,
          transform: [
            { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        },
      ]}
    >
      <View style={[estilos.caja, sobreCamara && estilos.ventana]}>
        {/* El resplandor detrás del dibujo: es lo que hace que se lea como algo
            que se ganó y no como una ficha más del inventario.

            Va adentro de la misma caja que el dibujo y no suelto sobre la
            pantalla. Suelto quedaba centrado en la pantalla y no en el premio, y
            como además era mucho más grande que el dibujo, se leía como un fondo
            de la hoja entera en vez de como un halo. */}
        <View style={estilos.retrato}>
          <View style={[estilos.resplandor, { backgroundColor: `${tinte}33` }]} />
          <Image source={arte} style={estilos.arte} resizeMode="contain" fadeDuration={0} />
        </View>

        <View style={estilos.dicho}>
          <Text style={[estilos.texto, { color: tinte }]}>{texto}</Text>
          {detalle ? <Text style={estilos.detalle}>{detalle}</Text> : null}
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
   * Lo que se dice, junto.
   *
   * Las dos líneas van en su propia caja y con poco aire entre ellas: si
   * colgaran sueltas del contenedor, el `gap` grande que separa el dibujo de
   * los botones las separaría también a ellas, y dejarían de leerse como una
   * cosa dicha de corrido.
   */
  dicho: { alignItems: 'center', gap: spacing.sm },
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
