import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';

/**
 * El pase de hoja.
 *
 * Las hojas se corren de costado, arrastrando con el dedo: la de al lado
 * asoma, la actual se va, y soltar antes de la mitad devuelve todo a su lugar.
 *
 * **Antes esto era un giro en 3D y se descartó.** Se veía bien cuando salía
 * bien, pero terminaba mal cada tanto —la pantalla quedaba negra— y arreglarlo
 * era ir a pelearse con cómo Android compone superficies coplanares y con un
 * `backfaceVisibility` que no siempre se respeta. Un efecto que a veces deja la
 * pantalla en negro es peor que uno más sencillo que nunca falla; si algún día
 * vuelve el giro, tiene que ser con una malla que se curve de verdad, no con
 * transformaciones planas.
 *
 * **La posición es absoluta, no relativa.** El valor animado es en qué hoja
 * está parado el álbum —2.4 es entre la tercera y la cuarta— y cada hoja se
 * ubica según su distancia a ese número. Es lo que saca el salto al terminar de
 * pasar: con un valor relativo hay que devolverlo a cero al cambiar de hoja, y
 * ese cero llega un cuadro antes que la hoja nueva, así que por un instante se
 * ve la vieja volviendo al centro de un tirón. Con la posición absoluta no hay
 * nada que reiniciar.
 */

type Props = {
  /** Cuántas hojas tiene el álbum. */
  total: number;
  /** En cuál está, desde 0. */
  indice: number;
  onCambio: (indice: number) => void;
  ancho: number;
  alto: number;
  /** Dibuja la hoja número `i` (desde 0). */
  hoja: (i: number) => React.ReactNode;
};

/** Cuánto hay que arrastrar, en proporción del ancho, para que la hoja pase. */
const UMBRAL = 0.28;

/** A partir de esta velocidad pasa aunque no se haya llegado al umbral. */
const VELOCIDAD = 0.45;

/** Desde cuántos puntos de arrastre se considera que es un gesto y no un toque. */
const GESTO = 8;

/** Separación entre una hoja y la siguiente, para que no vayan pegadas. */
const AIRE = 16;

/** Cuánto se achica la hoja mientras se va. */
const ENCOGE = 0.92;

/** Cuánto se apaga la hoja mientras se va. */
const APAGA = 0.5;

/** Cuánto cede el arrastre contra el principio y el final del álbum. */
const RESISTE = 0.18;

export function Libro({ total, indice, onCambio, ancho, alto, hoja }: Props) {
  /**
   * Si hay algo moviéndose.
   *
   * Mientras dura, cada hoja se dibuja una sola vez en una textura de la placa
   * de video y lo que se mueve es esa textura. Sin eso, animar la escala obliga
   * a Android a volver a dibujar el texto en cada cuadro y los títulos se ven
   * temblorosos.
   *
   * Se prende y se apaga en vez de dejarlo puesto: la textura ocupa memoria del
   * tamaño de la pantalla por hoja, y quieto no hace ninguna falta.
   */
  const [moviendo, setMoviendo] = useState(false);

  /** En qué hoja está parado, con decimales durante el arrastre. */
  const pos = useRef(new Animated.Value(indice)).current;

  const estado = useRef({ indice, arrastrando: false });
  estado.current.indice = indice;

  const paso = ancho + AIRE;

  const pan = useRef(
    PanResponder.create({
      // Solo se queda con el gesto si es horizontal y con intención: así los
      // toques siguen llegando a las cartas.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > GESTO && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderGrant: () => {
        estado.current.arrastrando = true;
        setMoviendo(true);
      },

      onPanResponderMove: (_, g) => {
        const i = estado.current.indice;
        const corrido = -g.dx / ancho;
        // Contra las puntas del álbum el arrastre cede en vez de cortarse: se
        // siente el tope en lugar de que el dedo deje de hacer efecto.
        const tope = (corrido > 0 && i >= total - 1) || (corrido < 0 && i <= 0);
        pos.setValue(i + (tope ? corrido * RESISTE : Math.max(-1, Math.min(1, corrido))));
      },

      onPanResponderRelease: (_, g) => {
        estado.current.arrastrando = false;
        const i = estado.current.indice;
        const corrido = -g.dx / ancho;
        const hacia = Math.sign(corrido) || -Math.sign(g.vx);

        const puede = hacia > 0 ? i < total - 1 : i > 0;
        const rapido = Math.abs(g.vx) > VELOCIDAD && Math.sign(-g.vx) === hacia;
        const pasa = puede && (Math.abs(corrido) > UMBRAL || rapido);

        const destino = pasa ? i + hacia : i;

        Animated.timing(pos, {
          toValue: destino,
          // A propósito sin apuro: es un álbum, no una lista. La hoja arranca
          // rápido y frena al final, como algo que se acomoda solo.
          duration: pasa ? 520 : 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          // No hay nada que reiniciar: la posición ya es la de la hoja nueva, y
          // avisar del cambio solo cambia cuáles tres hojas están dibujadas.
          if (destino !== i) onCambio(destino);
          if (!estado.current.arrastrando) setMoviendo(false);
        });
      },

      onPanResponderTerminate: () => {
        estado.current.arrastrando = false;
        Animated.timing(pos, {
          toValue: estado.current.indice,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => setMoviendo(false));
      },
    })
  ).current;

  /**
   * Una hoja en su lugar del álbum.
   *
   * Todo sale de la misma posición absoluta, así que las tres se mueven juntas
   * y no hay forma de que se desincronicen.
   *
   * La clave es el número de hoja y no la posición, para que al cambiar de hoja
   * React reconozca las que ya estaban y las mueva en vez de rehacerlas.
   */
  const capa = (i: number) => {
    if (i < 0 || i >= total) return null;

    const mover = pos.interpolate({
      inputRange: [i - 1, i + 1],
      outputRange: [paso, -paso],
    });

    // Cuanto más lejos del centro, más chica y más apagada.
    const lejos = { inputRange: [i - 1, i, i + 1], extrapolate: 'clamp' as const };
    const escala = pos.interpolate({ ...lejos, outputRange: [ENCOGE, 1, ENCOGE] });
    const apagon = pos.interpolate({ ...lejos, outputRange: [APAGA, 0, APAGA] });

    return (
      <Animated.View
        key={i}
        style={[
          estilos.capa,
          { width: ancho, height: alto, transform: [{ translateX: mover }, { scale: escala }] },
        ]}
        pointerEvents={i === indice ? 'auto' : 'none'}
        renderToHardwareTextureAndroid={moviendo}
        shouldRasterizeIOS={moviendo}
      >
        {hoja(i)}

        <Animated.View
          style={[estilos.capa, estilos.apagon, { opacity: apagon }]}
          pointerEvents="none"
        />

        {/* La sombra del canto: la hoja se ve apoyada sobre la de al lado y no
            al mismo nivel. */}
        <View style={estilos.canto} pointerEvents="none">
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Animated.View>
    );
  };

  return (
    // Recorta a lo ancho: las hojas de al lado esperan afuera y no tienen que
    // asomar sobre el resto de la pantalla.
    <View style={{ width: ancho, height: alto, overflow: 'hidden' }} {...pan.panHandlers}>
      {/* Las vecinas van montadas siempre, no solo durante el gesto: montar
          nueve figuritas en el primer cuadro del arrastre se nota. */}
      {capa(indice - 1)}
      {capa(indice)}
      {capa(indice + 1)}
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: { ...StyleSheet.absoluteFill },
  apagon: { backgroundColor: '#000' },
  canto: { position: 'absolute', left: -AIRE, top: 0, bottom: 0, width: AIRE },
});
