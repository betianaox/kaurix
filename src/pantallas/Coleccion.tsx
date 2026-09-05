import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Contador, GAJOS, RuletaChica, RuletaGrande } from '../coleccion/Ruleta';
import { useT } from '../i18n';
import { criaturas } from '../art';
import { progreso } from '../juego/crianza';
import { COLOR_NIVEL, colorDeNivel } from '../juego/datos';
import { INGREDIENTES, ingredientePorId } from '../juego/ingredientes';
import {
  comoReloj,
  contenidoDeLaRuleta,
  impulsoVigente,
  puedeGirarGratis,
  restanteMs,
} from '../juego/ruleta';
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

/** El aire entre ficha y ficha. Va acá porque el ancho de la ficha se calcula
 *  con él: si los dos números se separan, la última columna se sale. */
const HUECO = 8;

export function ColeccionScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  /**
   * El ancho se calcula y no va en porcentaje.
   *
   * Con porcentajes y `space-between`, un renglón incompleto manda las fichas a
   * los costados y deja un agujero donde no va. Con el ancho exacto y `gap`, cada
   * casilla cae donde tiene que caer.
   */
  const lado = Math.floor((width - spacing.sm * 2 - HUECO * (COLUMNAS - 1)) / COLUMNAS);

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

  const cambiarRuleta = useJuego((e) => e.cambiarRuleta);
  const gratis = puedeGirarGratis(juego.ultimoGiro);
  const impulso = impulsoVigente(juego.impulso);

  /**
   * Qué hay en cada gajo hoy.
   *
   * Las criaturas que estás criando —hasta cuatro— y regalos en el resto. Nunca
   * las que no encontraste todavía: un gajo con una sombra no da nada, y una
   * rueda con cinco casillas que no dan nada no es una ruleta.
   *
   * Se recalcula cuando cambia el día, cuando cambia lo que estás criando o
   * cuando pedís cambiarlo. No sale del guardado: sale de la cuenta.
   */
  const casillasRuleta = useMemo(
    () =>
      contenidoDeLaRuleta(
        juego.crianza.map((c) => c.criatura),
        INGREDIENTES,
        GAJOS,
        new Date().toDateString(),
        juego.cambiosDeRuleta
      ),
    [juego.crianza, juego.cambiosDeRuleta]
  );

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
    setTirada({ indice: Math.floor(Math.random() * GAJOS), gratis });
  }

  function frenó() {
    if (!tirada) return;
    girar(casillasRuleta[tirada.indice], tirada.gratis);
    setTirada(null);
  }

  return (
    <Pantalla marca seccion="coleccion">
      <ScrollView contentContainerStyle={estilos.hoja}>
        <Vueltas actual={juego.nivel} />

        <View style={estilos.grilla}>
          {casillas.map((c, i) => {
            /**
             * El centro de la grilla: la ruleta.
             *
             * Va **adentro de la misma ficha que las criaturas** —mismo marco,
             * mismo fondo, mismo borde teñido— y no suelta sobre el papel. Antes
             * era un disco de colores flotando en el medio de ocho fichas
             * marfil, y se leía como algo pegado encima de la pantalla en vez de
             * como parte de la colección.
             *
             * Es la misma idea que la hoja del álbum, donde el centro también es
             * la casilla distinta: comparte la forma con sus ocho vecinas y se
             * diferencia por lo que tiene adentro.
             */
            if (!c) {
              return (
                <View key="centro" style={[estilos.celda, { width: lado }]}>
                  <View style={[estilos.marco, { borderColor: `${tinte}55` }]}>
                    <RuletaChica
                      lado={Math.round(lado * 0.78)}
                      onAbrir={() => setAbierta(true)}
                      etiqueta={t('ruleta.abrir')}
                    />
                  </View>
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
                // La que ya está criada también abre: su ficha muestra las tres
                // etapas. Solo la sombra no lleva a ningún lado, porque de esa
                // todavía no hay nada que contar.
                disabled={estado === 'sombra'}
                onPress={() => navigation.navigate('Bicho', { criatura: c.id })}
                accessibilityRole="button"
                accessibilityLabel={estado === 'sombra' ? t('coleccion.sinDescubrir') : t(`criaturas.${c.id}`)}
              >
                <View style={[estilos.marco, { borderColor: `${tinte}55` }]}>
                  <Image
                    // La sombra y la pose a color son el mismo cuadro, así que
                    // al encontrarla el color entra sin que nada se mueva.
                    //
                    // Y la que terminó de criarse muestra el crecido: la grilla
                    // pasa a ser el registro de en qué se convirtió cada una, no
                    // ocho bebés con una tilde encima.
                    source={
                      estado === 'sombra' ? c.sombra : estado === 'completa' ? c.crecido : c.quieto
                    }
                    // La sombra es negra plena: sobre el papel claro se lee
                    // como una mancha y nueve manchas tapan a la única que ya
                    // consiguió color. Apagada, deja adivinar la forma.
                    style={[estilos.arte, estado === 'sombra' && estilos.apenas]}
                    resizeMode="contain"
                    fadeDuration={0}
                  />

                  {/* El reloj del impulso, sobre la criatura que lo tiene. Va
                      en la ficha y no al lado de la ruleta porque lo que hay que
                      saber no es "queda tiempo" sino "a quién le queda". */}
                  {impulso?.criatura === c.id ? (
                    <Contador texto={comoReloj(restanteMs(impulso))} color={tinte} />
                  ) : null}

                  {/* La gema de la que ya está criada.

                      Era una tilde, y una tilde es lo que se le pone a un
                      trámite hecho: dice "listo", no "conseguiste algo". Una
                      gema es la misma que llevan las cartas del álbum en las
                      esquinas del marco: la criatura terminada y su figurita
                      hablan el mismo idioma.

                      Chica, y **al revés que el resto de lo que se apoya sobre
                      una ficha**: el disco va claro y la gema encima, no un
                      disco teñido con algo blanco adentro. Lleno de color era
                      una mancha sobre el dibujo; vacío es una marca al margen,
                      que es lo que tiene que ser — lo que hay que mirar es la
                      criatura crecida, que ya ocupa la casilla entera.

                      Y verde, no del color de la vuelta: ver `logrado` en el
                      tema. */}
                  {estado === 'completa' ? (
                    <View style={estilos.sello}>
                      <Ionicons name="diamond" size={16} color={colors.logrado} />
                    </View>
                  ) : null}

                  {/* La barra de crianza, **apoyada en el borde de abajo de la
                      ficha**. Afuera era un renglón más por casilla: sumaba
                      alto, obligaba a achicar el dibujo y dejaba la del medio
                      descalzada respecto de sus vecinas. Adentro no ocupa nada
                      propio, y el marco de la ficha le hace de riel.

                      La muestran la que estás criando y **la que ya creció**,
                      esa llena: una criatura terminada es una barra que llegó
                      hasta el final, y dejarla sin barra la hacía ver como si
                      hubiera salteado el camino. La sombra no lleva: sin nada
                      que contar, una barra vacía es un renglón que dice cero. */}
                  {crianza || estado === 'completa' ? (
                    <View style={estilos.barra}>
                      <View
                        style={[
                          estilos.barraLlena,
                          {
                            width: `${crianza ? Math.round(progreso(crianza) * 100) : 100}%`,
                            // A media tinta, igual que la barra de la ficha: en
                            // una grilla de ocho, tres barras a full color se
                            // leen antes que las criaturas.
                            backgroundColor: `${tinte}80`,
                          },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <RuletaGrande
        visible={abierta}
        casillas={casillasRuleta.map((c) =>
          c.tipo === 'bicho'
            ? {
                clave: c.criatura,
                nombre: t(`criaturas.${c.criatura}`),
                arte: criaturas.find((b) => b.id === c.criatura)!.quieto,
                cantidad: null,
              }
            : {
                clave: c.ingrediente,
                nombre: t(`ingredientes.${c.ingrediente}`),
                arte: ingredientePorId(c.ingrediente)!.arte,
                cantidad: c.cantidad,
              }
        )}
        destino={tirada ? tirada.indice : null}
        gratis={gratis}
        tinte={tinte}
        textos={{
          girar: t('ruleta.girar'),
          conVideo: t('ruleta.conVideo'),
          cerrar: t('ruleta.cerrar'),
          cambiar: t('ruleta.cambiar'),
          ganasteIngrediente: t('ruleta.ganasteIngrediente'),
          ganasteBicho: t('ruleta.ganasteBicho'),
          seguir: t('ruleta.seguir'),
        }}
        onGirar={tirar}
        onFin={frenó}
        onCambiar={cambiarRuleta}
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
/**
 * En qué vuelta estás.
 *
 * **No son puntos.** Eran ocho, uno por vuelta, y son exactamente el mismo
 * dibujo que el paginador del álbum —que ahí sí pasa hojas—. Dos componentes
 * idénticos que hacen cosas distintas enseñan mal: el de acá invitaba a tocarlo
 * para cambiar de vuelta, que es lo único que no se puede hacer.
 *
 * Ahora es una pastilla con el color de la vuelta y el número escrito. Dice lo
 * mismo, no se parece a nada tocable, y el color hace el trabajo que hacía el
 * punto encendido.
 */
function Vueltas({ actual }: { actual: number }) {
  const t = useT();
  const color = colorDeNivel(actual);
  const texto = t('coleccion.vuelta', { actual, total: COLOR_NIVEL.length });

  return (
    <View style={estilos.vueltas}>
      <View style={[estilos.vuelta, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
        <View style={[estilos.vueltaPunto, { backgroundColor: color }]} />
        <Text style={[estilos.vueltaTexto, { color }]}>{texto.toUpperCase()}</Text>
      </View>
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
    // Márgenes chicos a los costados: cada punto que se le saca al aire se lo
    // gana la criatura, que es lo único que hay que mirar acá.
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  vueltas: { alignItems: 'center', justifyContent: 'center' },
  /** La pastilla de la vuelta: teñida, con borde y el color adentro. */
  vuelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  vueltaPunto: { width: 9, height: 9, borderRadius: 5 },
  vueltaTexto: { fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },

  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: HUECO,
  },
  celda: {},

  marco: {
    // Mas alta que ancha. Al pasar a tres columnas la ficha cuadrada quedo
    // chica, y como sobra alto —las tres filas entran holgadas— se lo devuelve
    // por aca: la criatura se ve mas grande sin que la grilla deje de entrar.
    //
    // Y desde que la barra de crianza vive adentro, el alto que ocupaba ese
    // renglón vuelve al dibujo.
    aspectRatio: 0.72,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /** Casi toda la caja: las piezas ya vienen con su propio aire adentro. */
  arte: { width: '100%', height: '100%' },
  /** Lo que todavía no encontraste: se insinúa, no se impone. */
  apenas: { opacity: 0.24 },

  /**
   * El disco de la gema. Claro, del tamaño que tenía la tilde.
   *
   * Sin borde y sin sombra: probado con filo dorado y sombra propia, se
   * despegaba de la ficha y quedaba flotando por encima del dibujo, que es
   * exactamente lo que no tiene que hacer una marca al margen. Lo único que se
   * ve es la gema; el disco está para que no se le pierda encima del bicho.
   */
  sello: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sobreTinte,
  },

  /**
   * El riel de la barra: una pastilla apoyada adentro de la ficha.
   *
   * Con márgenes y las puntas redondeadas, no de lado a lado contra el borde:
   * pegada al canto se leía como una raya de la ficha misma —parte del marco— y
   * no como algo que se llena.
   */
  barra: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barraLlena: { height: 7, borderRadius: 4 },
});
