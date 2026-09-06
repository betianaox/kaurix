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

import { Conseguido } from '../components/Conseguido';
import { DURACION_HORAS, FACTOR } from '../juego/ruleta';
import { Cerrar } from '../shell/Cerrar';
import { colors, radius, spacing } from '../theme';

/**
 * La ruleta del centro de la colección.
 *
 * Son dos piezas: una **chiquita** en el hueco del medio de la grilla, que es
 * solo la rueda y no hace nada más que abrir; y una **grande** que se abre al
 * tocarla, con un premio por gajo y el botón para girar.
 *
 * ## Esta pieza no sabe qué se está sorteando
 *
 * Recibe las casillas ya resueltas a dibujo y cantidad. Quién decide qué va en
 * cada gajo —criaturas en crianza, ingredientes de regalo— vive en
 * `juego/ruleta.ts`, y cambia con el día. Acá solo se dibuja y se gira.
 *
 * ## La aguja y el botón no giran
 *
 * Van dibujados aparte de la rueda a propósito, y no son parte de la imagen: la
 * aguja es el punto fijo contra el que se lee el resultado —si girara, no
 * marcaría nada— y el botón tiene que quedar tocable y derecho todo el tiempo.
 * Por eso la lámina trae cuatro piezas sueltas y no una sola.
 *
 * ## Todo lo que va encima se posiciona con la cuenta escrita
 *
 * Nada de apoyarse en la alineación del contenedor para centrar un absoluto: eso
 * ya nos dejó el botón corrido unos píxeles y costó encontrarlo. `left` y `top`
 * salen de `lado`, y el centro es el centro.
 *
 * ## El cuadro de la rueda es cuadrado y centrado
 *
 * Lo deja así `herramientas/ruleta.js`. Si el centro del dibujo no cayera en el
 * centro del archivo, rotarlo la haría describir un círculo en vez de girar
 * sobre sí misma.
 *
 * ## La animación termina donde el resultado ya está decidido
 *
 * Quien llama sortea **antes** y pasa el índice: la rueda frena exactamente ahí.
 * Al revés —sortear al frenar— un redondeo puede dejar la aguja sobre un gajo y
 * el premio en otro, que es lo único que una ruleta no puede hacer.
 */

const RUEDA = require('../../assets/ruleta/rueda.webp');
const AGUJA = require('../../assets/ruleta/aguja.webp');
const BOTON_GIRAR = require('../../assets/ruleta/boton-girar.webp');
const BOTON_VIDEO = require('../../assets/ruleta/boton-video.webp');
/** El mismo dibujo que paga el multiplicar del cartel: esto cuesta un video. */
const VIDEO = require('../../assets/ui/video.webp');

/**
 * Cuántos gajos tiene el dibujo.
 *
 * Está medido sobre la lámina: los cortes de color caen cada 45°, con un gajo
 * centrado justo arriba. Si cambia el dibujo, alcanza con cambiar este número:
 * las posiciones y el frenado salen todos de acá.
 */
export const GAJOS = 8;

/** Vueltas enteras antes de frenar. Suficientes para que se sienta un giro. */
const VUELTAS = 4;
const MS = 2800;

/**
 * A qué distancia del centro va cada cosa, en fracción del lado.
 *
 * Hacia afuera hay más lugar: cerca del centro el gajo se angosta —termina en
 * punta contra la perilla— y lo ancho se sale por los costados.
 *
 * Las criaturas van **un poco más adentro que los ingredientes**, y no por
 * capricho: son las que importan, y adentro quedan más cerca del ojo cuando la
 * rueda frena. Como además son más altas que anchas, entran ahí sin tocar los
 * bordes del gajo.
 */
const RADIO_BICHO = 0.30;
const RADIO_INGREDIENTE = 0.315;

/**
 * Un gajo, ya resuelto a dibujo.
 *
 * La rueda no sabe si es una criatura o un ingrediente: recibe qué dibujar y,
 * si es un regalo, cuántos.
 */
export type CasillaEnRuleta = {
  clave: string;
  /** Cómo se llama, ya traducido. Solo se usa al anunciar el premio. */
  nombre: string;
  arte: ImageSourcePropType;
  /** Cuántos se regalan. `null` en las criaturas, que no se regalan. */
  cantidad: number | null;
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * La chiquita del hueco de la grilla: **solo la rueda**.
 *
 * Sin aguja y sin botón, como el dibujo. No gira: es la puerta.
 *
 * Y **sin nada encima**. Tuvo un punto en el medio para avisar que quedaba el
 * giro del día, pero cae justo sobre la perilla del dibujo y se lee como una
 * mancha, no como un aviso. El giro disponible hay que contarlo de otra manera
 * —el marco, un halo— o no contarlo: una marca que se confunde con un defecto
 * del arte es peor que no tener marca.
 */
export function RuletaChica({
  lado,
  onAbrir,
  etiqueta,
}: {
  lado: number;
  onAbrir: () => void;
  etiqueta: string;
}) {
  return (
    <Pressable
      onPress={onAbrir}
      style={({ pressed }) => [
        { width: lado, height: lado, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Image source={RUEDA} style={{ width: lado, height: lado }} resizeMode="contain" fadeDuration={0} />
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export function RuletaGrande({
  visible,
  casillas,
  destino,
  gratis,
  tinte,
  textos,
  onAceptarImpulso,
  onMultiplicar,
  multiplicarListo = false,
  videoListo = false,
  onGirar,
  onFin,
  onCambiar,
  onCerrar,
}: {
  visible: boolean;
  casillas: CasillaEnRuleta[];
  /** Índice de gajo donde tiene que frenar. `null` mientras no se gira. */
  destino: number | null;
  gratis: boolean;
  tinte: string;
  textos: {
    girar: string;
    conVideo: string;
    cerrar: string;
    cambiar: string;
    ganasteIngrediente: string;
    ganasteBicho: string;
    aceptar: string;
    multiplicar: string;
    rechazar: string;
  };
  /**
   * Ver un video para multiplicar por tres lo que salió.
   *
   * El premio base ya se otorgó cuando la rueda frenó, así que esto suma lo que
   * falta y nada se pierde si el video se corta a la mitad. Sin esta prop no se
   * ofrece —los bichos no se multiplican— y queda solo el botón de seguir.
   */
  onMultiplicar?: (premio: CasillaEnRuleta) => void;
  /** Si hay un anuncio cargado para ofrecer. */
  multiplicarListo?: boolean;
  /**
   * Si hay un video para pagar lo que se paga con video.
   *
   * Son dos cosas: volver a girar cuando ya se usó el giro del día, y cambiar
   * los premios de la rueda. Sin anuncio cargado los dos quedan apagados —el
   * único camino que no depende de esto es el giro gratis—, porque un botón que
   * promete un video y no lo tiene no falla: no hace nada, que es peor.
   */
  videoListo?: boolean;
  /**
   * Aceptar el impulso que salió, que es lo único de la ruleta que hay que
   * aceptar: pisa al que estuviera corriendo. Los ingredientes no pasan por
   * acá —ya están sumados— y por eso solo se llama con premios de bicho.
   */
  onAceptarImpulso?: (premio: CasillaEnRuleta) => void;
  onGirar: () => void;
  onFin: () => void;
  /** Vuelve a sortear lo que muestra la rueda. */
  onCambiar: () => void;
  onCerrar: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const giro = useRef(new Animated.Value(0)).current;
  /** En qué ángulo quedó, para que el próximo giro siga desde ahí. */
  const acumulado = useRef(0);
  const [girando, setGirando] = useState(false);
  /** El premio recién ganado, mientras se lo anuncia. */
  const [premio, setPremio] = useState<CasillaEnRuleta | null>(null);

  const lado = Math.floor(Math.min(width * 0.9, height * 0.52));

  /**
   * El botón del centro, apenas más grande que la perilla que trae la rueda.
   *
   * El `0.31` está medido sobre el archivo: la perilla llega a 117 px de un
   * radio de 384, o sea el 30,5% del diámetro. Se le da un pelo más para que la
   * tape entera y no le asome un aro de otro color por un lado.
   */
  const boton = Math.round(lado * 0.31);

  /** La aguja conserva la proporción de su archivo, 133×159. */
  const agujaAncho = Math.round(lado * 0.1);
  const agujaAlto = Math.round(agujaAncho * (159 / 133));

  const dibujo = Math.round(lado * 0.21);

  /**
   * Los ingredientes van más chicos que las criaturas.
   *
   * No es capricho de tamaño: sus dibujos llenan el cuadro de punta a punta
   * —una bolsa de harina, un tomate— mientras que una criatura deja aire
   * alrededor por la pose. Al mismo lado, el ingrediente pesa mucho más en el
   * gajo y la rueda se ve despareja.
   */
  const dibujoIngrediente = Math.round(dibujo * 0.72);

  useEffect(() => {
    if (destino === null) return;

    // El centro del gajo, medido desde arriba y en sentido horario. Se le resta
    // a la vuelta porque la que se mueve es la rueda, no la aguja.
    const porGajo = 360 / GAJOS;
    const centro = destino * porGajo;
    const desde = acumulado.current % 360;
    const hasta = acumulado.current + VUELTAS * 360 + ((360 - centro - desde) % 360);

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
      // Se anuncia recién cuando la rueda frenó. Mostrarlo antes le saca a la
      // ruleta lo único que tiene: el rato en que todavía no sabés qué salió.
      setPremio(casillas[destino] ?? null);
      onFin();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino]);

  const rota = giro.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

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
          <Cerrar lado={42} />
        </Pressable>

        <View style={{ width: lado, height: lado }}>
          <Animated.View style={{ width: lado, height: lado, transform: [{ rotate: rota }] }}>
            <Image source={RUEDA} style={{ width: lado, height: lado }} resizeMode="contain" fadeDuration={0} />

            {/* Los premios van adentro del contenedor que rota, uno por gajo, y
                girados hacia afuera como en cualquier rueda: derechos se
                pisarían entre ellos en los gajos de abajo. */}
            {casillas.map((c, i) => {
              const grados = (360 / GAJOS) * i;
              const rad = (grados - 90) * (Math.PI / 180);
              const esRegalo = c.cantidad !== null;
              const tam = esRegalo ? dibujoIngrediente : dibujo;
              const radio = lado * (esRegalo ? RADIO_INGREDIENTE : RADIO_BICHO);
              return (
                <View
                  key={c.clave + i}
                  style={{
                    position: 'absolute',
                    left: lado / 2 - tam / 2 + radio * Math.cos(rad),
                    top: lado / 2 - tam / 2 + radio * Math.sin(rad),
                    width: tam,
                    height: tam,
                    transform: [{ rotate: `${grados}deg` }],
                  }}
                >
                  <Image
                    source={c.arte}
                    style={{ width: tam, height: tam }}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                  {/* Cuántos te llevás. Va pegado al dibujo y gira con él: es
                      parte del premio, no un cartel de la pantalla.

                      Se escribe `×2` y no `2x`: acá es una cantidad —dos
                      tomates— mientras que el `2x` de la ficha del bicho es una
                      velocidad. Son dos cosas distintas y se escriben distinto a
                      propósito. */}
                  {c.cantidad !== null ? (
                    <View style={[estilos.cuanto, { backgroundColor: tinte }]}>
                      <Text style={estilos.cuantoTexto}>×{c.cantidad}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>

          {/* La aguja NO gira: es el punto fijo contra el que se lee el
              resultado. Va encima del borde, mordiendo la rueda. */}
          <Image
            source={AGUJA}
            style={{
              position: 'absolute',
              left: (lado - agujaAncho) / 2,
              // Cuatro píxeles más abajo de donde daba la cuenta: así la punta
              // muerde el borde de la rueda en vez de quedar flotando encima.
              top: -agujaAlto * 0.3 + 4,
              width: agujaAncho,
              height: agujaAlto,
            }}
            resizeMode="contain"
            fadeDuration={0}
          />

          {/* NI SE MUEVE NI SE TRANSPARENTA AL TOCARLO. Es una pieza de la
              ruleta, no un botón de interfaz: si se encoge o se aclara, se
              despega del dibujo y se nota que está pegado encima. Lo que
              responde al toque es la rueda, que se pone a girar. */}
          <Pressable
            onPress={onGirar}
            // El giro del día siempre se puede; el de más, solo si hay video.
            disabled={girando || (!gratis && !videoListo)}
            style={{
              position: 'absolute',
              left: (lado - boton) / 2,
              top: (lado - boton) / 2,
              width: boton,
              height: boton,
            }}
            accessibilityRole="button"
            accessibilityLabel={gratis ? textos.girar : textos.conVideo}
          >
            <Image
              source={gratis ? BOTON_GIRAR : BOTON_VIDEO}
              style={[
                { width: boton, height: boton },
                // Apagado cuando no hay video: se ve que está ahí y que ahora no.
                !gratis && !videoListo && { opacity: 0.45 },
              ]}
              resizeMode="contain"
              fadeDuration={0}
            />
          </Pressable>
        </View>

        {/* Cambiar los premios. Sin esto, lo que hay en la rueda es lo mismo
            todo el día: si no te sirve nada de lo que hay, no queda nada por
            hacer más que esperar a mañana.

            Se paga con un video, y el icono lo dice. Estuvo puesto desde antes
            de que el video existiera a propósito: cambiarlo después, cuando la
            gente ya se acostumbró a que era gratis, se lee como que le sacaron
            algo. */}
        <Pressable
          onPress={onCambiar}
          disabled={girando || !videoListo}
          style={({ pressed }) => [
            estilos.cambiar,
            { borderColor: `${tinte}88` },
            !videoListo && { opacity: 0.45 },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={textos.cambiar}
        >
          <Image source={VIDEO} style={estilos.cambiarIcono} resizeMode="contain" fadeDuration={0} />
          <Text style={estilos.cambiarTexto}>{textos.cambiar}</Text>
        </Pressable>

        {/* El anuncio va **último**, después de la pastilla de cambiar premios.
            Tapa la pantalla entera, y puesto antes quedaba por debajo de la
            pastilla: el botón de seguir aparecía cortado por un botón de la
            capa de atrás. En una fila de hermanos el que se dibuja último es el
            que queda arriba, y este tiene que quedar arriba de todo. */}
        {premio ? (
          <Conseguido
            arte={premio.arte}
            texto={textoDelPremio(premio, textos)}
            tinte={tinte}
            aceptar={textos.aceptar}
            onAceptar={() => {
              // El bicho es lo único que hay que aceptar; el ingrediente ya está
              // sumado desde que frenó la rueda y acá solo se cierra.
              if (premio.cantidad === null) onAceptarImpulso?.(premio);
              setPremio(null);
            }}
            rechazar={
              /**
               * Solo el impulso se puede rechazar.
               *
               * Aceptarlo apaga el que estuvieras corriendo, así que es una
               * decisión que pisa otra y necesita las dos salidas. El giro ya se
               * gastó igual: lo que se elige es si el impulso entra o no, no si
               * el premio valió.
               *
               * Un ingrediente no lleva esto: no le saca nada a nadie.
               */
              onAceptarImpulso && premio.cantidad === null
                ? { texto: textos.rechazar, onPress: () => setPremio(null) }
                : undefined
            }
            multiplicar={
              // Solo los ingredientes se multiplican: un bicho es uno, no tres.
              onMultiplicar && premio.cantidad !== null
                ? {
                    texto: textos.multiplicar,
                    listo: multiplicarListo,
                    // Se cierra en el acto: el video tapa la pantalla entera y
                    // dejar el cartel abajo lo deja asomando al volver.
                    onPress: () => {
                      onMultiplicar(premio);
                      setPremio(null);
                    },
                  }
                : undefined
            }
          />
        ) : null}
      </View>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Qué decir de lo que salió.
 *
 * Un ingrediente se cuenta —"¡Ganaste 2 tomates!"— y un bicho se explica, porque
 * lo que gana no es el bicho sino que crezca más rápido un rato. Es la única
 * diferencia entre los dos premios, y por eso el cartel es el mismo.
 */
function textoDelPremio(
  premio: CasillaEnRuleta,
  textos: { ganasteIngrediente: string; ganasteBicho: string }
): string {
  return premio.cantidad !== null
    ? textos.ganasteIngrediente
        .replace('{cantidad}', String(premio.cantidad))
        .replace('{cosa}', premio.nombre)
    : textos.ganasteBicho
        .replace('{bicho}', premio.nombre)
        .replace('{factor}', String(FACTOR))
        .replace('{horas}', String(DURACION_HORAS));
}

/* ────────────────────────────────────────────────────────────────────────── */

export const Contador = ({ texto, color }: { texto: string; color: string }) => (
  <View style={[estilos.contador, { backgroundColor: color }]}>
    <Text style={estilos.contadorTexto}>{texto}</Text>
  </View>
);

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.velo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.md,
  },
  cerrar: { position: 'absolute', top: 44, right: 16, padding: 4 },

  /**
   * La pastilla de la cantidad, del color de la vuelta.
   *
   * Empezó siendo un gris fijo —el negro, sobre gajos muy saturados, se lee
   * como un agujero en la rueda— pero un gris propio es un color más en una
   * pantalla que ya tiene ocho. Con el tinte, las ocho pastillas son la misma
   * cosa que el reloj del impulso y el sello de completada: todo lo que el
   * juego pone encima de lo demás tiene el color de la vuelta en curso.
   */
  cuanto: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuantoTexto: {
    color: colors.sobreTinte,
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Pastilla, y con peso. Es la única otra cosa que se puede hacer acá además
  // de girar: en gris tenue sobre fondo negro se leía como una nota al pie y no
  // como un botón.
  cambiar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
  },
  /**
   * Bastante más grande que el icono de línea que había antes.
   *
   * La ficha tiene relieve, borde y sombra: chica se apelmaza y se lee como una
   * mancha naranja. Grande se ve que es una cámara, y es lo que hace que la
   * pastilla se lea como algo que cuesta un video.
   *
   * El alto de la pastilla ahora lo pone el icono, no el texto, y por eso el
   * padding de arriba y abajo bajó a casi nada: con el de antes el botón
   * quedaba con un dedo de aire arriba del dibujo.
   */
  cambiarIcono: { width: 36, height: 36 },
  cambiarTexto: { color: colors.text, fontSize: 15.5, fontWeight: '600' },

  anuncio: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.velo,
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
    width: 168,
    height: 168,
    borderRadius: 84,
  },
  premio: { width: 128, height: 128 },
  anuncioTexto: { fontSize: 21, textAlign: 'center', lineHeight: 29, fontWeight: '600' },
  seguir: {
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  seguirTexto: { color: colors.sobreTinte, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  /** El alto sale del texto: con la letra del sistema más grande, un `height`
   *  fijo deja el reloj desbordado contra el borde de abajo. */
  contador: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    color: colors.sobreTinte,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
