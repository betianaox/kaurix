import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
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

/**
 * La forma que la ficha quiere tener: más alta que ancha.
 *
 * Es un deseo, no una imposición. Cuando la pantalla da el alto, la ficha se
 * dibuja con esta proporción; cuando no —una tablet, que es bastante más
 * cuadrada que un teléfono—, se achata hasta entrar. Ver `medida`.
 */
const ALTO_SOBRE_ANCHO = 1 / 0.72;

/**
 * CUÁNTO MIDE UNA FICHA EN EL ESPACIO QUE HAY.
 *
 * Las nueve tienen que entrar **siempre**, sin scroll ni siquiera de un
 * milímetro: la gracia de la colección es ver los ocho bichos y los huecos de
 * una sola mirada, y una fila que asoma por debajo del borde rompe justo eso.
 *
 * Antes la ficha salía solo del ancho y el alto se deducía de la proporción. En
 * un teléfono funcionaba porque sobra alto; en una tablet —más cuadrada— tres
 * filas de fichas altas no entraban y aparecía el scroll.
 *
 * Ahora manda **el que apriete primero**:
 *
 * 1. Se parte del ancho disponible, que es el reparto natural en tres columnas.
 * 2. El alto se pide con la proporción, pero se recorta a lo que la pantalla da.
 * 3. Si ese recorte deja la ficha más ancha que alta, se le baja el ancho: una
 *    ficha apaisada no sirve para un bicho parado. **Cuadrada es el límite**, y
 *    lo que sobra a los costados queda como aire, que es preferible a deformar.
 *
 * En un teléfono el paso 2 no recorta nada y sale exactamente la misma medida
 * de siempre.
 */
function medida(ancho: number, alto: number) {
  const porAncho = Math.floor((ancho - HUECO * (COLUMNAS - 1)) / COLUMNAS);
  const porAlto = Math.floor((alto - HUECO * (COLUMNAS - 1)) / COLUMNAS);

  const altoFicha = Math.min(porAlto, Math.round(porAncho * ALTO_SOBRE_ANCHO));
  const anchoFicha = Math.min(porAncho, altoFicha);

  return { ancho: anchoFicha, alto: altoFicha };
}

/**
 * LO QUE SE APOYA SOBRE LA FICHA, A ESCALA DE LA FICHA.
 *
 * La barra de crianza y la gema estaban en puntos fijos —7 de alto, 10 de
 * margen, 16 de gema—, medidas a ojo contra la ficha de un teléfono. En una
 * tablet la ficha mide el doble y esos números no crecen: la barra queda como
 * un hilo pegado al borde de abajo y la gema como una mota en la esquina. Se
 * ven mal no por chicas sino por **fuera de proporción**, que es otra cosa.
 *
 * Las fracciones están sacadas de los valores que ya tenía contra la ficha de
 * 106 puntos, así que en un teléfono devuelven exactamente lo mismo de antes y
 * solo cambian donde hay más lugar.
 *
 * Los topes existen porque una tablet grande no necesita una barra de veinte
 * puntos de alto: pasado cierto tamaño la barra ya se lee, y seguir creciendo
 * la convierte en el elemento principal de la ficha, que tiene que ser el bicho.
 */
function adornosDe(ancho: number) {
  const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  return {
    /** Alto del riel de crianza. */
    barra: entre(Math.round(ancho * 0.066), 6, 13),
    /** Cuánto se separa la barra de los tres bordes que la rodean. */
    margen: entre(Math.round(ancho * 0.094), 8, 22),
    /** El lado del disco de la gema, y de paso su separación a la esquina. */
    gema: entre(Math.round(ancho * 0.151), 14, 30),
  };
}

export function ColeccionScreen({ navigation }: Props) {
  /**
   * El hueco real que le queda a la grilla, medido y no calculado.
   *
   * Del alto de la pantalla hay que descontar el header, la barra de abajo, la
   * pastilla de la vuelta y los márgenes. Restarlos a mano sería copiar acá
   * medidas que viven en otros cuatro archivos y que se desincronizan al primer
   * retoque; `onLayout` las averigua sin saber de ninguna.
   */
  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });
  const medir = (e: LayoutChangeEvent) =>
    setCaja({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height });

  const ficha = medida(caja.ancho, caja.alto);
  const lado = ficha.ancho;
  const adorno = adornosDe(ficha.ancho);

  /**
   * LA CAJA DEL BICHO, más chica que la ficha.
   *
   * Antes el arte se dibujaba al 100% de la ficha en los dos ejes. Con `contain`
   * eso no lo deforma, pero lo deja **tocando los cuatro bordes**: en el
   * teléfono se notaba poco y en una tablet el dragón apoya las patas sobre la
   * barra de crianza, que es de las dos cosas la que tiene que ceder.
   *
   * El ancho baja a `FRACCION` para que quede aire a los costados, y del alto
   * se descuenta la franja donde vive la barra. Es la misma idea que el aire
   * entre fichas: lo que separa las cosas es lo que deja verlas.
   */
  const FRACCION = 0.93;
  const franjaBarra = adorno.margen * 0.8 + adorno.barra + adorno.margen * 0.5;
  const arte = {
    ancho: Math.round(ficha.ancho * FRACCION),
    alto: Math.round(ficha.alto - franjaBarra),
  };

  /**
   * AIRE DE MÁS PARA EL BEBÉ Y LA SOMBRA.
   *
   * No es un capricho de encuadre: es que las piezas no traen el mismo margen.
   * `quieto` y `sombra` salen del mismo cuadro de la animación normalizado a un
   * cuadrado —ver `art/index.ts`—, así que el bicho llega hasta el borde de su
   * archivo. `crecido` viene de otro script y ya trae aire propio abajo.
   *
   * Con la misma caja para los dos, el crecido queda bien y el bebé apoya las
   * patas sobre la barra. En vez de achicar a los dos —que dejaría al crecido
   * flotando—, el que no trae margen lo recibe acá.
   */
  const aireDelBebe = Math.round(adorno.barra * 1.4);

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
      <View style={estilos.hoja}>
        <Vueltas actual={juego.nivel} />

        {/* Lo que sobra después de la pastilla: es lo que se mide y lo que la
            grilla tiene para repartir. */}
        <View style={estilos.zona} onLayout={medir}>
        <View style={[estilos.grilla, { width: lado * COLUMNAS + HUECO * (COLUMNAS - 1) }]}>
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
                  <View style={[estilos.marco, { height: ficha.alto, borderColor: `${tinte}55` }]}>
                    <RuletaChica
                      lado={Math.round(Math.min(ficha.ancho, ficha.alto) * 0.78)}
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
                <View style={[estilos.marco, { height: ficha.alto, borderColor: `${tinte}55` }]}>
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
                    style={[
                      {
                        width: arte.ancho,
                        height:
                          arte.alto - (estado === 'completa' ? 0 : aireDelBebe),
                      },
                      estado === 'sombra' && estilos.apenas,
                    ]}
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

                      **Sin disco detrás.** Llevaba uno claro para que no se
                      perdiera sobre el dibujo, y terminaba leyéndose como una
                      pastilla pegada encima de la ficha. Sola se apoya sobre el
                      fondo igual que las gemas de las cartas sobre su marco: es
                      una marca al margen, y lo que hay que mirar es la criatura
                      crecida, que ya ocupa la casilla entera.

                      Y verde, no del color de la vuelta: ver `logrado` en el
                      tema. */}
                  {estado === 'completa' ? (
                    <View
                      style={[
                        estilos.sello,
                        // Más arriba que al costado: pegada al borde de
                        // arriba respira mejor, y el margen lateral tiene que
                        // seguir siendo el que la separa de la esquina.
                        { top: adorno.gema * 0.3, right: adorno.gema / 2 },
                      ]}
                    >
                      <Ionicons name="diamond" size={adorno.gema} color={colors.logrado} />
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
                    <View
                      style={[
                        estilos.barra,
                        {
                          left: adorno.margen,
                          right: adorno.margen,
                          bottom: adorno.margen * 0.8,
                          height: adorno.barra,
                          borderRadius: adorno.barra / 2,
                        },
                      ]}
                    >
                      <View
                        style={[
                          estilos.barraLlena,
                          {
                            height: adorno.barra,
                            borderRadius: adorno.barra / 2,
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
        </View>
      </View>

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
   * LA PANTALLA NO SCROLLEA. Nunca, ni un milímetro.
   *
   * Era un `ScrollView` y en una tablet —bastante más cuadrada que un
   * teléfono— la última fila quedaba abajo del borde y había que arrastrar. Una
   * colección que no se ve entera deja de ser una colección: lo que la hace
   * funcionar es mirar los huecos y saber cuánto falta de un vistazo.
   *
   * Siendo un `View` con `flex: 1`, el alto es el que hay y no puede crecer. Lo
   * que se adapta es la ficha —ver `medida`—, que es lo correcto: manda la
   * pantalla, no el contenido.
   */
  hoja: {
    flex: 1,
    // Márgenes chicos: cada punto que se le saca al aire se lo gana la
    // criatura, que es lo único que hay que mirar acá. Y como la ficha sale de
    // dividir lo que sobra por tres, un punto de relleno vertical le saca un
    // tercio de punto de alto a cada fila.
    paddingHorizontal: 10,
    paddingVertical: 10,
    // Este no se toca: el botón de buscar sobresale por encima de la barra de
    // abajo, y sin este aire la última fila le queda debajo.
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },

  /**
   * Lo que queda para la grilla, después de la pastilla de la vuelta.
   *
   * Se mide con `onLayout` en vez de restar a mano el header, la barra de abajo
   * y los márgenes: esas medidas viven en otros archivos y copiarlas acá es
   * garantía de que un retoque en cualquiera de ellos devuelva el scroll sin
   * que nadie se entere.
   *
   * Centrada en los dos ejes: cuando la ficha topa con el alto, lo que sobra a
   * los costados se reparte parejo en vez de amontonarse a la izquierda.
   */
  zona: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
    justifyContent: 'center',
    gap: HUECO,
  },
  celda: {},

  marco: {
    // El alto lo pone quien la dibuja, con la cuenta de `medida`. Era un
    // `aspectRatio` fijo, y una proporción fija es justamente lo que no entra
    // en una pantalla más cuadrada: la ficha tiene que poder achatarse.
    borderWidth: 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
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
  /** La posición y el tamaño los pone quien la dibuja: escalan con la ficha. */
  sello: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barraLlena: {},
});
