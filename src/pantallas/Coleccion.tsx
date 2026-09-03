import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  Contador,
  GAJOS,
  GAJO_LIBRE,
  RuletaChica,
  RuletaGrande,
  bichoDelGajo,
} from '../coleccion/Ruleta';
import { useT } from '../i18n';
import { criaturas } from '../art';
import { progreso } from '../juego/crianza';
import { COLOR_NIVEL, colorDeNivel } from '../juego/datos';
import { comoReloj, impulsoVigente, puedeGirarGratis, restanteMs } from '../juego/ruleta';
import { useJuego } from '../juego/store';
import type { Rutas } from '../navegacion/rutas';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';

/**
 * La casa: las ocho criaturas, las que faltan en sombra.
 *
 * Es lo primero que se ve al abrir porque lo primero que alguien quiere saber es
 * cuánto le falta. Las sombras se muestran desde el minuto cero: ver los huecos
 * es lo que da ganas de llenarlos.
 *
 * Acá las criaturas van quietas. El bebé animado vive en su ficha, que es donde
 * se lo mira de a una: ocho animaciones a la vez terminan arrastrando el
 * teléfono.
 */

type Props = NativeStackScreenProps<Rutas, 'Coleccion'>;

type EstadoBicho = 'sombra' | 'crianza' | 'completa';

/**
 * TRES POR TRES, CON EL CENTRO LIBRE.
 *
 * Eran dos columnas, y ocho criaturas en dos columnas son cuatro renglones:
 * entraban seis y las dos últimas quedaban abajo del borde. Una colección que
 * no se ve entera deja de sentirse como una colección — la gracia es mirar los
 * huecos y saber cuánto falta, y para eso hay que verlas todas juntas.
 *
 * Ocho no llenan una grilla de tres por tres, y en vez de dejar el hueco al
 * final va **en el medio**. Dos motivos: un renglón último de dos se lee como
 * que falta algo, y el centro reservado es la misma forma que tiene la hoja del
 * álbum, donde el del medio es la legendaria. La grilla se lee como un marco.
 */
const COLUMNAS = 3;

/** Dónde va el hueco: el centro de la grilla de nueve. */
const CENTRO = 4;

export function ColeccionScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  /**
   * El ancho se calcula y no va en porcentaje.
   *
   * Con porcentajes y `space-between`, un renglón incompleto manda las fichas a
   * los costados y deja un agujero donde no va. Con el ancho exacto y `gap`, cada
   * casilla cae donde tiene que caer.
   */
  const lado = Math.floor((width - spacing.md * 2 - spacing.sm * (COLUMNAS - 1)) / COLUMNAS);

  /**
   * Las nueve casillas: las ocho criaturas y el hueco del medio.
   *
   * Si algún día son más o menos de ocho, la grilla sigue funcionando sin
   * hueco: es una cuadrícula que se llena sola, no un dibujo a mano.
   */
  const casillas =
    criaturas.length === COLUMNAS * COLUMNAS - 1
      ? [...criaturas.slice(0, CENTRO), null, ...criaturas.slice(CENTRO)]
      : criaturas;

  const juego = useJuego((e) => e.juego);
  const girar = useJuego((e) => e.girar);
  const t = useT();
  const tinte = colorDeNivel(juego.nivel);

  /**
   * Dónde va a frenar la ruleta, y si ese giro gasta el del día.
   *
   * **Se sortea antes de girar, no al frenar.** La animación tiene que terminar
   * donde el resultado ya está decidido; al revés, un redondeo puede dejar la
   * aguja sobre un gajo y el impulso en otro, y ahí la ruleta miente.
   */
  const [tirada, setTirada] = useState<{ indice: number; gratis: boolean } | null>(null);
  /** La ruleta abierta en grande. En el hueco solo vive la chiquita. */
  const [abierta, setAbierta] = useState(false);

  const gratis = puedeGirarGratis(juego.ultimoGiro);
  const impulso = impulsoVigente(juego.impulso);

  /**
   * El reloj del impulso.
   *
   * Se redibuja cada segundo solo mientras hay uno vigente. Un intervalo
   * corriendo siempre haría trabajar a la pantalla las veintitrés horas en que
   * no hay nada que contar.
   */
  const [, refrescar] = useState(0);
  useEffect(() => {
    if (!impulso) return;
    const id = setInterval(() => refrescar((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [impulso]);

  function tirar() {
    if (tirada) return;
    // Mientras no haya anuncios, el regiro es directo. Cuando entre AdMob, el
    // video se pide acá y el sorteo pasa a ser lo que se hace al terminarlo.
    // Se sortea sobre los GAJOS del dibujo, no sobre las criaturas: el último
    // no tiene ninguna y también puede salir.
    setTirada({ indice: Math.floor(Math.random() * GAJOS), gratis });
  }

  function frenó() {
    if (!tirada) return;
    // El gajo libre no se anota en ningún lado: no da impulso y **no gasta el
    // giro del día**, así que el botón sigue siendo el de girar gratis y se
    // puede tirar de nuevo sin video.
    if (tirada.indice !== GAJO_LIBRE) {
      girar(criaturas[bichoDelGajo(tirada.indice)].id, tirada.gratis);
    }
    setTirada(null);
  }

  return (
    <Pantalla marca seccion="coleccion">
      <ScrollView contentContainerStyle={estilos.hoja}>
        <Vueltas actual={juego.nivel} />

        <View style={estilos.grilla}>
          {casillas.map((c, i) => {
            // El hueco del medio: ocupa su lugar y no dibuja nada.
            if (!c) {
              // La casilla se estira al alto del renglón y centra su contenido,
              // así la ruleta queda a la altura de los dibujos de al lado y no
              // pegada arriba, que es donde la dejaba el borde de la grilla.
              return (
                <View key="centro" style={[estilos.centro, { width: lado }]}>
                  <RuletaChica
                    lado={lado}
                    hayGiro={gratis}
                    onAbrir={() => setAbierta(true)}
                    etiqueta={t('ruleta.abrir')}
                  />
                </View>
              );
            }

            const crianza = juego.crianza.find((x) => x.criatura === c.id);
            const estado: EstadoBicho = juego.completadas.includes(c.id)
              ? 'completa'
              : crianza
                ? 'crianza'
                : 'sombra';

            return (
              <Pressable
                key={c.id}
                style={({ pressed }) => [estilos.celda, { width: lado }, pressed && { opacity: 0.7 }]}
                disabled={estado !== 'crianza'}
                onPress={() => navigation.navigate('Bicho', { criatura: c.id })}
                accessibilityRole="button"
                accessibilityLabel={estado === 'sombra' ? t('coleccion.sinDescubrir') : t(`criaturas.${c.id}`)}
              >
                <View style={[estilos.marco, { borderColor: `${tinte}55` }]}>
                  <Image
                    // La sombra y la pose a color son el mismo cuadro, así que
                    // al encontrarla el color entra sin que nada se mueva.
                    source={estado === 'sombra' ? c.sombra : c.quieto}
                    style={estilos.arte}
                    resizeMode="contain"
                    fadeDuration={0}
                  />

                  {/* El reloj del impulso, sobre la criatura que lo tiene. Va
                      en la ficha y no al lado de la ruleta porque lo que hay que
                      saber no es "queda tiempo" sino "a quién le queda". */}
                  {impulso?.criatura === c.id ? (
                    <Contador texto={comoReloj(restanteMs(impulso))} color={tinte} />
                  ) : null}

                  {estado === 'completa' ? (
                    <View style={[estilos.sello, { backgroundColor: tinte }]}>
                      <Text style={estilos.selloTexto}>✓</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={estilos.nombre} numberOfLines={1}>
                  {estado === 'sombra' ? t('coleccion.oculta') : t(`criaturas.${c.id}`)}
                </Text>

                <View style={estilos.barra}>
                  {crianza ? (
                    <View
                      style={[
                        estilos.barraLlena,
                        { width: `${Math.round(progreso(crianza) * 100)}%`, backgroundColor: tinte },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <RuletaGrande
        visible={abierta}
        bichos={criaturas.map((b) => ({
          id: b.id,
          nombre: t(`criaturas.${b.id}`),
          arte: juego.completadas.includes(b.id) || juego.crianza.some((x) => x.criatura === b.id)
            ? b.quieto
            : b.sombra,
          tiene:
            juego.completadas.includes(b.id) || juego.crianza.some((x) => x.criatura === b.id),
        }))}
        destino={tirada ? tirada.indice : null}
        gratis={gratis}
        tinte={tinte}
        textos={{
          girar: t('ruleta.girar'),
          conVideo: t('ruleta.conVideo'),
          cerrar: t('ruleta.cerrar'),
          salio: t('ruleta.salio'),
          otraVez: t('ruleta.otraVez'),
        }}
        onGirar={tirar}
        onFin={frenó}
        onCerrar={() => setAbierta(false)}
      />
    </Pantalla>
  );
}

/**
 * Las ocho vueltas, como ocho puntos.
 *
 * Cada uno con el color de su vuelta, la actual marcada y agrandada. Dice lo
 * mismo que un "vuelta 1 de 8" pero de un vistazo, y de paso adelanta que los
 * colores que vienen son otros: eso solo ya da ganas de llegar.
 */
function Vueltas({ actual }: { actual: number }) {
  const t = useT();

  return (
    <View style={estilos.vueltas} accessibilityLabel={t('coleccion.vuelta', { actual, total: COLOR_NIVEL.length })}>
      {COLOR_NIVEL.map((color, i) => {
        const nivel = i + 1;
        const esta = nivel === actual;
        const pasada = nivel < actual;
        return (
          <View
            key={nivel}
            style={[
              estilos.punto,
              { backgroundColor: color },
              esta && estilos.puntoActual,
              // Las que faltan se ven apagadas: están ahí, pero todavía no son
              // tuyas.
              !esta && !pasada && { opacity: 0.28 },
            ]}
          />
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  /**
   * LA GRILLA VA CENTRADA, no pegada arriba.
   *
   * Desde que las ocho entran sin scrollear, el contenido es mas corto que la
   * pantalla y sobraba todo el espacio abajo. `flexGrow` hace que el contenedor
   * ocupe el alto entero aunque su contenido no lo llene, y ahi el
   * `justifyContent` puede repartir lo que sobra arriba y abajo por igual.
   *
   * Sin el `flexGrow`, el contenedor mide lo que miden las fichas y centrar no
   * cambia nada: no hay espacio sobrante que repartir.
   */
  hoja: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  vueltas: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 20,
  },
  punto: { width: 9, height: 9, borderRadius: 5 },
  puntoActual: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.text,
  },

  centro: { alignItems: 'center', justifyContent: 'center' },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  celda: { gap: 6 },

  marco: {
    // Mas alta que ancha. Al pasar a tres columnas la ficha cuadrada quedo
    // chica, y como sobra alto —las tres filas entran holgadas— se lo devuelve
    // por aca: la criatura se ve mas grande sin que la grilla deje de entrar.
    aspectRatio: 0.85,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arte: { width: '90%', height: '90%' },

  sello: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selloTexto: { color: '#14110C', fontSize: 13, fontWeight: '700' },

  nombre: { color: colors.text, fontSize: 13, textAlign: 'center' },

  barra: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barraLlena: { height: 4, borderRadius: 2 },
});
