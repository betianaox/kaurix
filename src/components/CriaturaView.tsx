import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { criaturas, type Pieza } from '../art';
import { colors, elements, radius, type ElementId } from '../theme';

type Props = {
  /** Ancho de referencia en puntos. Lo real sale de la escala de la pieza. */
  size: number;
  pieza: Pieza;
  /** Para la silueta de emergencia, si el arte no carga. */
  nombre: string;
  elemento: ElementId;
  /**
   * La pieza que viene después, montada invisible para que ya esté
   * decodificada cuando toque mostrarla.
   *
   * Sin esto, al cambiar de archivo el componente descarta el anterior y tarda
   * unos milisegundos en tener listo el nuevo: se ve un parpadeo en blanco
   * justo en el momento más importante.
   */
  siguiente?: Pieza | null;
  /** Se avisa si el arte no se pudo dibujar, para poder diagnosticarlo. */
  onFallo?: (motivo: string) => void;
};

/**
 * Dibuja una pieza: un huevo, un intento de salir, una eclosión, un adulto.
 *
 * No agrega ninguna animación propia. El movimiento vive adentro del WebP y el
 * desplazamiento por la pantalla lo maneja quien la usa.
 *
 * El cambio entre piezas es un corte seco, a propósito. Se probó fundir una con
 * otra para disimular la diferencia de pose y quedó peor: durante el fundido se
 * ven las dos superpuestas y el personaje se lee doble. Cuando dos animaciones
 * no empalman, la solución está en el arte —que una termine donde empieza la
 * otra— y no en taparlo.
 *
 * Si el arte no carga, dibuja una silueta en su lugar. Sin eso, un dispositivo
 * que no pueda decodificar el WebP animado no muestra absolutamente nada y no
 * hay forma de darse cuenta de por qué.
 */
export function CriaturaView({
  size,
  pieza,
  nombre,
  elemento,
  siguiente,
  onFallo,
}: Props) {
  const [fallo, setFallo] = useState(false);
  const { width, height } = medida(size, pieza);
  const el = elements[elemento];

  if (fallo) {
    return (
      <View
        style={[
          styles.silueta,
          { width, height, borderColor: el.color, backgroundColor: `${el.glow}55` },
        ]}
      >
        <Text style={[styles.nombre, { color: el.color }]}>{nombre}</Text>
        <Text style={styles.aviso}>el arte no cargó en este equipo</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <Image
        source={pieza.arte}
        style={{ width, height }}
        resizeMode="contain"
        fadeDuration={0}
        onError={(e) => {
          setFallo(true);
          onFallo?.(String(e?.nativeEvent?.error ?? 'error desconocido'));
        }}
      />

      {siguiente ? (
        <Image
          source={siguiente.arte}
          style={[styles.precarga, medida(size, siguiente)]}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : null}
    </View>
  );
}

/**
 * La escala de referencia: la criatura adulta más ancha del juego.
 *
 * Es la que ocupa el tamaño pedido; el resto se dibuja en proporción a lo que
 * medían en sus videos originales. Se toma de los adultos y no de todas las
 * piezas para que sumar un huevo grande no encoja a todas las criaturas.
 */
const ESCALA_MAYOR = Math.max(...criaturas.map((c) => c.escala));

/** Ancho y alto que va a ocupar, para poder centrarla en pantalla. */
export function medida(size: number, pieza: Pieza) {
  const resuelto = Image.resolveAssetSource(pieza.arte);
  const proporcion = resuelto?.width ? resuelto.height / resuelto.width : 1;
  const ancho = Math.round((size * pieza.escala) / ESCALA_MAYOR);
  return { width: ancho, height: Math.round(ancho * proporcion) };
}

const styles = StyleSheet.create({
  /**
   * Invisible pero dibujada: tiene que ocupar su tamaño real para que se
   * decodifique a la resolución con la que se va a mostrar. Con opacidad cero
   * en vez de `display: none` porque lo que no se dibuja tampoco se decodifica.
   */
  precarga: { position: 'absolute', top: 0, left: 0, opacity: 0 },

  silueta: {
    borderWidth: 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  nombre: { fontSize: 18, textAlign: 'center' },
  aviso: { color: colors.text, fontSize: 13, textAlign: 'center' },
});
