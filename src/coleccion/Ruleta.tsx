import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '../theme';

/**
 * La ruleta del centro de la colección.
 *
 * Son dos piezas: una **chiquita** en el hueco del medio de la grilla, que es
 * solo la rueda y no hace nada más que abrir; y una **grande** que se abre al
 * tocarla, con un muñeco por gajo y el botón para girar.
 *
 * ## La aguja y el botón no giran
 *
 * Van dibujados aparte de la rueda a propósito, y no son parte de la imagen:
 * la aguja es el punto fijo contra el que se lee el resultado —si girara, no
 * marcaría nada— y el botón tiene que quedar tocable y derecho todo el tiempo.
 * Por eso la lámina trae cuatro piezas sueltas y no una sola.
 *
 * ## El cuadro de la rueda es cuadrado y centrado
 *
 * Lo deja así `herramientas/ruleta.js`. Si el centro del dibujo no cayera en el
 * centro del archivo, rotarlo la haría describir un círculo en vez de girar
 * sobre sí misma.
 *
 * ## La animación termina donde el resultado ya está decidido
 *
 * Quien llama sortea **antes** y pasa el índice: la rueda frena exactamente
 * ahí. Al revés —sortear al frenar— un redondeo puede dejar la aguja sobre un
 * gajo y el impulso en otro, que es lo único que una ruleta no puede hacer.
 */

const RUEDA = require('../../assets/ruleta/rueda.webp');
const AGUJA = require('../../assets/ruleta/aguja.webp');
const BOTON_GIRAR = require('../../assets/ruleta/boton-girar.webp');
const BOTON_VIDEO = require('../../assets/ruleta/boton-video.webp');

/**
 * Cuántos gajos tiene el dibujo.
 *
 * **Son nueve y las criaturas son ocho.** Está medido sobre la lámina: los
 * cortes de color caen cada 40°, con un gajo centrado justo arriba. El noveno
 * queda sin criatura y por eso vale como *volvés a girar*, que es una casilla
 * normal en cualquier ruleta y no obliga a rehacer el arte.
 *
 * Si algún día el dibujo trae ocho, alcanza con cambiar este número: las
 * posiciones de los muñecos y el frenado salen todos de acá.
 */
export const GAJOS = 9;

/**
 * En qué gajo va cada criatura, **elegido por contraste**.
 *
 * No es el orden natural: sale de medir el color medio de cada bicho y el color
 * de cada gajo, y quedarse con el reparto que maximiza el contraste **del peor
 * caso**. Se maximiza el peor y no el promedio porque un promedio alto con un
 * bicho ilegible sigue teniendo un bicho ilegible.
 *
 * Con el orden natural, el dragón de musgo caía sobre el verde y el fénix sobre
 * el rojo: dos bichos que desaparecían adentro de su propio gajo.
 *
 * Si cambia el arte de la rueda o de las criaturas, se vuelve a calcular en vez
 * de acomodarlo a ojo.
 */
const ORDEN = [8, 0, 4, 1, 2, 3, 5, 6];

/**
 * El gajo que queda sin criatura, el que sobra del reparto.
 *
 * Hoy vale **volvés a girar**: no da impulso pero tampoco gasta el giro del día.
 * Es lo que evita que caer ahí se sienta un castigo por girar, que es lo que
 * pasaría si te comiera el giro y no te diera nada.
 *
 * Va a ser un comodín. Cuando lo sea, el cambio es acá y en `frenó`.
 */
export const GAJO_LIBRE = [...Array(GAJOS).keys()].find((g) => !ORDEN.includes(g))!;

/** De gajo a criatura. Es `ORDEN` leído al revés. */
export const bichoDelGajo = (gajo: number) => ORDEN.indexOf(gajo);

/** Vueltas enteras antes de frenar. Suficientes para que se sienta un giro. */
const VUELTAS = 4;
const MS = 2800;

/**
 * A qué distancia del centro van los muñecos, en fracción del lado.
 *
 * Bien adentro: hacia el borde el gajo se ensancha y el bicho queda flotando
 * contra el aro gris, que no contrasta con nada. Más cerca del centro el color
 * del gajo lo rodea por los cuatro lados y se lee como que está **en** ese gajo.
 */
const RADIO_MUNECO = 0.24;

export type BichoEnRuleta = {
  id: string;
  nombre: string;
  arte: ImageSourcePropType;
  /** Ya apareció: se dibuja a color. Si no, en sombra. */
  tiene: boolean;
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * La chiquita del hueco de la grilla: **solo la rueda**.
 *
 * Sin aguja y sin botón, como el dibujo. No gira: es la puerta. Lo único que
 * agrega es el punto del giro del día — sin eso, cerrada no se distingue de un
 * adorno y nadie la toca el primer día.
 */
export function RuletaChica({
  lado,
  hayGiro,
  onAbrir,
  etiqueta,
}: {
  lado: number;
  hayGiro: boolean;
  onAbrir: () => void;
  etiqueta: string;
}) {
  return (
    <Pressable
      onPress={onAbrir}
      style={({ pressed }) => [
        { width: lado, height: lado, alignItems: 'center', justifyContent: 'center' },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Image source={RUEDA} style={{ width: lado, height: lado }} resizeMode="contain" fadeDuration={0} />
      {hayGiro ? <View style={estilos.punto} /> : null}
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export function RuletaGrande({
  visible,
  bichos,
  destino,
  gratis,
  tinte,
  textos,
  onGirar,
  onFin,
  onCerrar,
}: {
  visible: boolean;
  bichos: BichoEnRuleta[];
  /** Índice de gajo donde tiene que frenar. `null` mientras no se gira. */
  destino: number | null;
  gratis: boolean;
  tinte: string;
  textos: {
    girar: string;
    conVideo: string;
    cerrar: string;
    salio: string;
    otraVez: string;
  };
  onGirar: () => void;
  onFin: () => void;
  onCerrar: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const giro = useRef(new Animated.Value(0)).current;
  /** En qué ángulo quedó, para que el próximo giro siga desde ahí. */
  const acumulado = useRef(0);
  const [girando, setGirando] = useState(false);
  /** El gajo que salió, para poder contarlo cuando la rueda ya frenó. */
  const [salio, setSalio] = useState<number | null>(null);

  const lado = Math.floor(Math.min(width * 0.9, height * 0.52));
  const boton = Math.round(lado * 0.22);
  const aguja = Math.round(lado * 0.13);

  useEffect(() => {
    if (destino === null) return;

    // El centro del gajo, medido desde arriba y en sentido horario. Se le resta
    // a la vuelta porque la que se mueve es la rueda, no la aguja.
    const porGajo = 360 / GAJOS;
    const centro = destino * porGajo;
    const desde = acumulado.current % 360;
    const hasta = acumulado.current + VUELTAS * 360 + ((360 - centro - desde) % 360);

    setSalio(null);
    setGirando(true);
    Animated.timing(giro, {
      toValue: hasta,
      duration: MS,
      // Arranca de golpe y frena de a poco, como una ruleta de verdad. Sin esto
      // se ve como un carrusel y no como algo que se lanzó.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      acumulado.current = hasta % 360;
      giro.setValue(acumulado.current);
      setGirando(false);
      setSalio(destino);
      onFin();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino]);

  const rota = giro.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const ladoMuneco = Math.round(lado * 0.19);

  const pie =
    salio === null
      ? gratis
        ? textos.girar
        : textos.conVideo
      : salio === GAJO_LIBRE
        ? textos.otraVez
        : textos.salio.replace('{bicho}', bichos[bichoDelGajo(salio)]?.nombre ?? '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <View style={estilos.fondo}>
        <Pressable
          onPress={onCerrar}
          hitSlop={14}
          style={estilos.cerrar}
          accessibilityRole="button"
          accessibilityLabel={textos.cerrar}
        >
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>

        <View style={{ width: lado, height: lado, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ rotate: rota }] }}>
            <Image source={RUEDA} style={{ width: lado, height: lado }} resizeMode="contain" fadeDuration={0} />

            {/* Los muñecos van adentro del contenedor que rota, uno por gajo, y
                girados hacia afuera como en cualquier rueda de premios: derechos
                se pisarían entre ellos en los gajos de abajo. */}
            {bichos.map((b, i) => {
              const grados = (360 / GAJOS) * ORDEN[i];
              const rad = (grados - 90) * (Math.PI / 180);
              return (
                <Image
                  key={b.id}
                  source={b.arte}
                  resizeMode="contain"
                  fadeDuration={0}
                  style={[
                    {
                      position: 'absolute',
                      width: ladoMuneco,
                      height: ladoMuneco,
                      left: lado / 2 - ladoMuneco / 2 + lado * RADIO_MUNECO * Math.cos(rad),
                      top: lado / 2 - ladoMuneco / 2 + lado * RADIO_MUNECO * Math.sin(rad),
                      transform: [{ rotate: `${grados}deg` }],
                    },
                    // Los que todavía no aparecieron van apagados, no ausentes:
                    // ver lo que te podría tocar es la mitad de la gracia.
                    !b.tiene && { opacity: 0.5 },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* La aguja NO gira: es el punto fijo contra el que se lee el
              resultado. Va encima del borde, mordiendo la rueda. */}
          <Image
            source={AGUJA}
            style={{ position: 'absolute', top: -aguja * 0.35, width: aguja, height: aguja * 1.2 }}
            resizeMode="contain"
            fadeDuration={0}
          />

          {/* El botón tampoco gira: tiene que quedar derecho y tocable. Cambia
              solo — girar mientras queda el del día, video después. */}
          <Pressable
            onPress={onGirar}
            disabled={girando}
            style={({ pressed }) => [
              { position: 'absolute', width: boton, height: boton },
              pressed && !girando && { transform: [{ scale: 0.94 }] },
              girando && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={gratis ? textos.girar : textos.conVideo}
          >
            <Image
              source={gratis ? BOTON_GIRAR : BOTON_VIDEO}
              style={{ width: boton, height: boton }}
              resizeMode="contain"
              fadeDuration={0}
            />
          </Pressable>
        </View>

        {/* Una sola línea, con el alto reservado: si apareciera al frenar,
            empujaría la rueda hacia arriba justo en el momento de mirarla. */}
        <Text style={[estilos.pie, salio !== null ? { color: tinte } : null]} numberOfLines={2}>
          {pie}
        </Text>
      </View>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export const Contador = ({ texto, color }: { texto: string; color: string }) => (
  <View style={[estilos.contador, { backgroundColor: color }]}>
    <Text style={estilos.contadorTexto}>{texto}</Text>
  </View>
);

const estilos = StyleSheet.create({
  punto: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.text,
  },

  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  cerrar: { position: 'absolute', top: 44, right: 16, padding: 8 },

  pie: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },

  contador: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { color: '#14110C', fontSize: 11, fontWeight: '700' },
});
