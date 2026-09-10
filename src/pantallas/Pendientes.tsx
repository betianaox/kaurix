import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { useAnuncioRecompensado } from '../anuncios/useAnuncioRecompensado';
import { Conseguido } from '../components/Conseguido';
import { juegoTerminado } from '../juego/avisos';
import { useT } from '../i18n';
import { COLOR_NIVEL, colorDeNivel } from '../juego/datos';
import { ingredientePorId } from '../juego/ingredientes';
import { claveDe, recetaPorId } from '../juego/recetas';
import {
  abrirElDia,
  diasVisibles,
  gratisCobrado,
  gratisDisponible,
  MULTIPLICADOR,
  premioDe,
  primerDiaVisible,
  videoCobrado,
  videoDisponible,
  type Premio,
  type Reclamo,
} from '../juego/sendero';
import { useJuego } from '../juego/store';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL CAMINO DE LOS DÍAS
 * ───────────────────────────────────────────────────────────────────────────
 * Siete escalones, uno por día, cada uno con el dibujo de lo que da y un color
 * propio. Se sube de a uno: el de hoy se reclama tocándolo, los de atrás quedan
 * marcados y los de adelante se ven desde el primer día.
 *
 * ## Es una escalera y no una lista
 *
 * Los siete van del mismo ancho. Estuvieron armados como una pirámide, con cada
 * escalón más angosto que el de abajo, y el de arriba quedaba tan corto que no
 * entraban el dibujo, el nombre y el check: lo que se ganaba en forma se perdía
 * en que no se leía nada. El color y el número ya ordenan la escalera.
 *
 * ## Los que faltan se muestran, no se esconden
 *
 * Un camino que va apareciendo a medida que se recorre no le dice a nadie por
 * qué vale la pena volver. Lo que trae de vuelta es **ver la poción del séptimo
 * día** desde el primero.
 *
 * ## Cada día tiene su color
 *
 * Los siete salen de la paleta de las vueltas, que son los colores de los
 * bichos. No es un degradé inventado: es la misma escala con la que el juego ya
 * cambia de piel, así que la escalera se siente parte de él y no un widget
 * pegado encima.
 *
 * Y no hay racha que perder: quien falta una semana encuentra su escalón donde
 * lo dejó. El porqué está en `sendero.ts`.
 */
export function PendientesScreen() {
  const t = useT();
  const juego = useJuego((e) => e.juego);
  const sendero = juego.sendero;
  const nivel = juego.nivel;
  const reclamarDelDia = useJuego((e) => e.reclamarDelDia);
  const reclamarVideo = useJuego((e) => e.reclamarVideo);
  const volverAEmpezar = useJuego((e) => e.volverAEmpezar);
  const tinte = colorDeNivel(nivel);

  /** El álbum está lleno: es el único aviso que queda. Ver `avisos.ts`. */
  const terminado = juegoTerminado(juego);

  /**
   * El video que multiplica el premio del día.
   *
   * Se pide al abrir la pantalla y no al tocar el botón: un anuncio tarda en
   * cargar, y pedirlo recién al tocarlo deja esperando delante de un premio ya
   * ofrecido. Es lo mismo que hace la cámara con su oferta de multiplicar.
   *
   * Si no llegó, la columna del video no se dibuja. Ofrecer un video que
   * después no está es peor que no ofrecerlo.
   */
  const anuncio = useAnuncioRecompensado();


  /** Lo que salió al reclamar, mientras se anuncia. */
  const [salio, setSalio] = useState<Reclamo>(null);

  /**
   * El camino con el día de hoy ya abierto.
   *
   * Se abre acá también y no solo al arrancar la app: quien la deja abierta
   * pasada la medianoche tiene que ver el premio de hoy sin reiniciar. No
   * escribe nada —eso lo hace el store al cobrar—, solo mira.
   */
  const camino = abrirElDia(sendero);

  /**
   * Qué días se dibujan: la vuelta entera, con los ya cobrados incluidos.
   *
   * El porqué de las dos cuentas está en `sendero.ts`.
   */
  const desde = primerDiaVisible(camino);
  const cuantosDias = diasVisibles(camino);


  return (
    <Pantalla titulo={t('avisos.titulo')} encima>
      <ScrollView contentContainerStyle={estilos.hoja}>
        <Text style={estilos.rotulo}>{t(terminado ? 'avisos.final' : 'avisos.camino')}</Text>

        {/* Con el juego terminado la escalera no se dibuja. No es que sobre:
            contradice. La escalera empuja a seguir criando, y a quien ya crió
            las sesenta y cuatro no le queda nada que empujar; unas frutillas al
            lado del cartel del final le bajan el final a un ítem de lista.

            No se pierde nada: al empezar de nuevo el camino vuelve a estar ahí,
            en el escalón donde había quedado. */}
        {terminado ? (
          <Final onPress={volverAEmpezar} />
        ) : (
        <>
        {/* Del primer día al último, de arriba para abajo: se lee como se lee
            todo lo demás, y el escalón de hoy queda cerca de donde se empezó a
            mirar en vez de al final de una cuenta regresiva. */}
        <View style={estilos.escalera}>
          {Array.from({ length: cuantosDias }, (_, i) => i).map((i) => {
            const numero = desde + i;

            /*
             * Tres estados, y no dos.
             *
             * - `abierto`: el día ya llegó. Se ve entero, a color, haya algo para
             *   cobrar o no. Los de atrás sin cobrar siguen ahí y no se apagan.
             * - `puedeGratis` / `puedeVideo`: es el que le toca a esa cola. Solo
             *   ese responde al tocarlo — las colas se cobran en orden.
             * - `hoy`: el día del calendario, el último que abrió. Es el único que
             *   lleva el borde grueso.
             *
             * Que se vean a color los que no son su turno es a propósito: lo que
             * el color dice es "esto ya pasó y es tuyo", no "tocá acá". Lo que
             * todavía no llegó es lo único apagado.
             */
            const abierto = numero <= camino.abiertos;
            const puedeGratis = gratisDisponible(camino, numero);
            const puedeVideo = videoDisponible(camino, numero);
            const hoy = numero === camino.abiertos;

            return (
              <Escalon
                key={i}
                // El número no vuelve a empezar: la segunda vuelta va del 8 al
                // 14, la tercera del 15 al 21. La pirámide es siempre de siete,
                // pero los días que muestra son los que de verdad se llevan.
                numero={numero}
                premio={premioDe(numero)}
                color={COLOR_NIVEL[i % COLOR_NIVEL.length]}
                // El de al lado, para que los dos bloques del día no sean del
                // mismo color. Con ocho colores y siete días, cada escalón toma
                // dos vecinos de la misma paleta y ninguno repite pareja.
                colorVideo={COLOR_NIVEL[(i + 1) % COLOR_NIVEL.length]}
                dado={gratisCobrado(camino, numero)}
                hoy={hoy}
                abierto={abierto}
                puede={puedeGratis}
                onReclamar={() => {
                  const salida = reclamarDelDia(numero);
                  if (salida) setSalio(salida);
                }}
                // La otra cola. Sin anuncio cargado no se ofrece, pero lo ya
                // cobrado se sigue marcando: eso no depende de que haya video.
                hayVideo={anuncio.listo && puedeVideo}
                videoDado={videoCobrado(camino, numero)}
                onVideo={() => {
                  anuncio.mostrar(() => {
                    const salida = reclamarVideo(numero);
                    if (salida) setSalio(salida);
                  });
                }}
              />
            );
          })}
        </View>

        {/* Cuando ya se reclamó se dice cuándo vuelve a haber algo: sin esto la
            pantalla queda igual que antes de tocar y parece que no pasó nada. */}
        </>
        )}
      </ScrollView>

      {salio ? <Anuncio salio={salio} tinte={tinte} onCerrar={() => setSalio(null)} /> : null}

    </Pantalla>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * El botón de cobrar: la ficha rosa de `assets/mas buttons.png`.
 *
 * Del mismo material que los de la olla y los del cartel —volumen, borde blanco
 * y un dibujo adentro—, así que se lee como un botón del juego y no como un
 * icono pegado encima.
 */
const REGALO = require('../../assets/ui/regalo.webp');

/** La ficha del video, la misma con la que se paga en la ruleta y la cámara. */
const VIDEO = require('../../assets/ui/video.webp');

/**
 * El dibujo de una muestra, sea ingrediente o preparación.
 *
 * Recibe el id y no el premio entero porque cada escalón tiene **dos**: la de
 * la columna gratis y la del video.
 */
function arteDe(muestra: string): ImageSourcePropType | null {
  const ingrediente = ingredientePorId(muestra);
  if (ingrediente) return ingrediente.arte;
  return recetaPorId(muestra)?.arte ?? null;
}

/**
 * Un día del camino, con sus dos formas de cobrarlo.
 *
 * ## Dos columnas y no un botón con una oferta encima
 *
 * A la izquierda el premio del día, gratis. A la derecha **el mismo premio por
 * tres**, a cambio de un video. Las dos columnas se dibujan iguales —mismo
 * dibujo, misma forma, misma medida— y lo único que cambia entre ellas es la
 * cuenta y la ficha de abajo.
 *
 * Que sean iguales es el punto: así se leen como **una elección entre dos**, y
 * no como un premio con una tentación pegada al costado. La gratis no es la
 * versión pobre de nada; es la de siempre, y al lado está la misma cosa por más.
 *
 * ## Y la del video puede no estar
 *
 * Si el anuncio no cargó, esa columna no se dibuja y el escalón queda como
 * estaba, con la del regalo ocupando el ancho. Ofrecer un video que después no
 * aparece es peor que no ofrecerlo, y es la misma regla que sigue el cartel de
 * lo que encontrás con la cámara.
 *
 * El día se cobra una sola vez, se haya cobrado con cuál de las dos: el video
 * multiplica lo que sale, no adelanta el camino.
 */
function Escalon({
  numero,
  premio,
  color,
  colorVideo,
  dado,
  hoy,
  abierto,
  puede,
  onReclamar,
  hayVideo,
  videoDado,
  onVideo,
}: {
  /** El día que se muestra: 1..7 la primera vuelta, 8..14 la segunda. */
  numero: number;
  premio: Premio;
  color: string;
  /** El color del segundo bloque: el de la vuelta siguiente. */
  colorVideo: string;
  /** Ya se reclamó en esta vuelta. */
  dado: boolean;
  /** Es el día de hoy: el último que abrió. Lleva el borde grueso. */
  hoy: boolean;
  /** El día ya llegó. Lo que no llegó es lo único que se dibuja apagado. */
  abierto: boolean;
  /** Es el que toca **y** hay premio esperando. */
  puede: boolean;
  onReclamar: () => void;
  /** Hay anuncio cargado **y** ese día todavía no cobró su video. */
  hayVideo: boolean;
  /** Ese día ya cobró su video: el bloque queda, marcado como hecho. */
  videoDado: boolean;
  onVideo: () => void;
}) {
  const t = useT();
  const arte = arteDe(premio.muestra);
  const arteVideo = arteDe(premio.otra);

  /** Cuántas cosas da la columna gratis. Las preparaciones vienen de a una. */
  const cuantas = premio.tipo === 'ingredientes' ? premio.cuantos : 1;

  /**
   * Qué da el día, en una palabra.
   *
   * Para los ingredientes es **el lugar** —Fruta, Flores, Verdura, Despensa— y
   * no la palabra "ingredientes": el día 2 es el de las flores y eso es lo que
   * hay que poder leer de un vistazo. Es el mismo nombre que usa el bolso para
   * esa familia, así que quien vio una pantalla entiende la otra.
   *
   * Y sin el número: las dos cuentas están abajo, en cada bloque, y son
   * distintas entre sí. Un '4 ingredientes' arriba de un ×4 y un ×8 contradice
   * a uno de los dos.
   */
  const nombre =
    premio.tipo === 'ingredientes'
      ? t(`lugares.${premio.lugar}`)
      : premio.tipo === 'comida'
        ? t('avisos.comida')
        : t('avisos.pocion');

  return (
    <View
      style={[
        estilos.escalon,
        { borderColor: `${color}66`, backgroundColor: `${color}14` },
        hoy && { borderColor: color, backgroundColor: `${color}26`, borderWidth: 2 },
      ]}
      accessibilityLabel={`${t('avisos.dia', { n: numero })}: ${nombre}`}
    >
      {/* El día y qué da, arriba y a todo el ancho: es el encabezado de las dos
          columnas, no de una. */}
      {/* El día y qué da, en la misma línea.

          Estuvieron uno debajo del otro. Son dos datos cortos que no compiten
          —el día ordena, el premio informa— y en dos renglones se llevaban
          dieciséis puntos por escalón: ciento doce en los siete, que es
          justo lo que faltaba para que el camino entrara sin scroll. */}
      <View style={estilos.dicho}>
        <Text style={[estilos.dia, { color }]}>{t('avisos.dia', { n: numero })}</Text>
        <Text style={estilos.premio} numberOfLines={1}>
          {nombre}
        </Text>
      </View>

      {/*
       * Cada bloque con su estado, no el escalón entero con uno solo.
       *
       * Cobrar el del día apagaba los dos y encima dejaba al de hoy resaltado y
       * gris a la vez: elegido y deshabilitado en la misma tarjeta. Ahora el que
       * se cobró muestra su tilde a pleno color y el otro sigue vivo.
       */}
      <View style={estilos.columnas}>
        <Oferta
          arte={arte}
          color={color}
          cuantas={cuantas}
          ficha={REGALO}
          puede={puede}
          cobrado={dado}
          apagado={!abierto}
          onPress={onReclamar}
          etiqueta={t('avisos.dia', { n: numero })}
        />

        {/*
         * **Los dos bloques van siempre**, en los siete días.
         *
         * El del video estuvo apareciendo y desapareciendo según le tocara o
         * según hubiera anuncio cargado, y con eso la escalera cambiaba de
         * forma sola: unos días con dos columnas y otros con una, que además
         * se ensanchaba para ocupar el hueco. Lo que hay cada día son dos
         * premios; que uno no se pueda tocar todavía es su estado, no su
         * ausencia.
         *
         * Apagado abarca los dos casos que no se pueden tocar: que no sea su
         * turno —hay uno anterior sin cobrar— y que el anuncio no haya
         * llegado. Los dos se ven igual porque para quien mira son lo mismo:
         * ahora no.
         */}
        <Oferta
          arte={arteVideo}
          color={colorVideo}
          cuantas={cuantas * MULTIPLICADOR}
          ficha={VIDEO}
          puede={hayVideo}
          cobrado={videoDado}
          apagado={!abierto}
          onPress={onVideo}
          etiqueta={t('conseguido.multiplicar')}
        />
      </View>
    </View>
  );
}


/**
 * Una de las dos formas de cobrar el día./**
 * Una de las dos formas de cobrar el día.
 *
 * El dibujo con su cuenta, y debajo la ficha con la que se paga: el regalo, que
 * no cuesta nada, o el video. La cuenta va **sobre el dibujo** y no al lado,
 * como en las cajitas del bolso: es el mismo objeto contado de la misma forma en
 * las dos pantallas.
 *
 * Apagada cuando el día ya no se puede cobrar —el de mañana, el de pasado— y no
 * escondida: la escalera entera se ve desde el primer día, que es lo que hace
 * que valga la pena volver.
 */
function Oferta({
  arte,
  color,
  cuantas,
  ficha,
  puede,
  cobrado,
  apagado,
  onPress,
  etiqueta,
}: {
  arte: ImageSourcePropType | null;
  color: string;
  cuantas: number;
  ficha: ImageSourcePropType;
  puede: boolean;
  /** Ya se cobró: en lugar de la ficha va el tilde, y a pleno color. */
  cobrado: boolean;
  /**
   * El día todavía no llegó.
   *
   * Es lo **único** que se dibuja a media tinta. No alcanza con `!puede`: un día
   * de atrás sin cobrar tampoco se puede tocar todavía —hay uno anterior
   * pendiente— pero ya pasó y es suyo, así que se ve entero.
   */
  apagado: boolean;
  onPress: () => void;
  etiqueta: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!puede}
      style={({ pressed }) => [
        estilos.oferta,
        // Cada bloque con su color, solo relleno. Tuvo borde del mismo tono y
        // era una raya de más: adentro de un escalón que ya tiene su propio
        // borde, dos rectángulos enmarcados hacen una reja. El relleno teñido
        // alcanza para que se lean como dos cosas y no como dos mitades.
        { backgroundColor: `${color}26` },
        // Apagado solo lo que todavía no llegó. Ver `apagado`.
        apagado && estilos.apagada,
        pressed && puede && estilos.apretado,
      ]}
      accessibilityRole={puede ? 'button' : 'text'}
      accessibilityState={{ disabled: !puede }}
      accessibilityLabel={`${etiqueta} ×${cuantas}`}
    >
      <View style={[estilos.disco, { backgroundColor: `${color}33`, borderColor: color }]}>
        {arte ? (
          <Image source={arte} style={estilos.arte} resizeMode="contain" fadeDuration={0} />
        ) : null}

        <View style={[estilos.cuenta, { backgroundColor: color }]}>
          <Text style={estilos.cuentaTexto}>×{cuantas}</Text>
        </View>
      </View>

      {cobrado ? (
        <View style={[estilos.tilde, { backgroundColor: color }]}>
          <Text style={estilos.tildeTexto}>✓</Text>
        </View>
      ) : (
        <Image source={ficha} style={estilos.regalo} resizeMode="contain" fadeDuration={0} />
      )}
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** El icono del álbum, el mismo del footer y el mismo del festejo del final. */
const ICONO_ALBUM = require('../../assets/ui/album.webp');
/** La ficha de aceptar, la misma de todos los carteles. */
const ACEPTAR = require('../../assets/ui/aceptar.webp');

/**
 * El aviso de que el juego está terminado.
 *
 * Ocupa el lugar entero de la escalera, y no un renglón arriba de ella: es el
 * único aviso que hay, y compartir la hoja con siete escalones de frutillas lo
 * dejaría leyéndose como uno más de la lista.
 *
 * ## Reinicia de un toque, sin cartel de por medio
 *
 * Es el motivo de que el aviso exista: quien cerró el festejo del álbum con
 * "ahora no" tiene que poder terminar el juego después, y la campana es donde
 * uno mira qué le quedó pendiente. Un cartel intermedio acá sería preguntar dos
 * veces lo mismo — el festejo del álbum ya es esa pregunta.
 *
 * Por eso el renglón grande dice **la acción** y no el logro: lo que se ganó ya
 * se festejó en el álbum, y este es el botón. El logro queda arriba, chico, como
 * el porqué de que el botón esté ahí. Y dice "felicitaciones" y no "fin del
 * juego", que es lo que ya dice el rótulo de arriba: repetirlo gastaba el
 * único renglón chico que hay en decir dos veces lo mismo.
 */
/**
 * El final no lleva el color de la vuelta: lleva oro.
 *
 * El resto de la app se tiñe del ciclo en el que estás, pero acá **no hay ciclo**
 * — están los ocho terminados. Cuál de los ocho colores pintaría esta pantalla
 * sería una respuesta arbitraria, y encima la haría verse distinta según en qué
 * vuelta te agarró el final, cuando es el mismo logro.
 *
 * El oro ya es el color de lo que se gana una vez cada muchas: es el de las
 * doradas y el de la estrella del festejo.
 */
function Final({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <View style={estilos.finalCaja}>
      {/* Lo que pasó. No se toca: es el cartel, no el botón. */}
      <View style={[estilos.escalon, estilos.final]}>
        <View style={estilos.discoFinal}>
          <Image source={ICONO_ALBUM} style={estilos.arte} resizeMode="contain" fadeDuration={0} />
        </View>

        <View style={estilos.dicho}>
          <Text style={estilos.felicitaciones}>{t('album.felicitaciones')}</Text>
          <Text style={estilos.premio} numberOfLines={2}>
            {t('album.completaste')}
          </Text>
        </View>
      </View>

      {/* Y el botón, aparte y abajo.

          Estuvo adentro del cartel, como una fila más de la escalera con la
          ficha de aceptar a la derecha. Ahí no se leía como un botón: la hoja
          entera está hecha de filas con un dibujo a cada lado, y esta parecía
          una más. Que sea lo único que se toca no alcanza si se ve igual que lo
          que no se toca.

          Relleno del color de la vuelta y no un contorno: es la acción de la
          pantalla y la única, así que va sólida. */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [estilos.boton, pressed && estilos.apretado]}
        accessibilityRole="button"
        accessibilityLabel={t('album.volverAEmpezar')}
      >
        <Image source={ACEPTAR} style={estilos.botonFicha} resizeMode="contain" fadeDuration={0} />
        <Text style={estilos.botonTexto}>{t('album.volverAEmpezar')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Lo que salió, con el mismo cartel que el resto del juego.
 *
 * Los ingredientes vienen todos del mismo, así que el cartel puede dibujarlo y
 * nombrarlo: "Frutilla ×3".
 */
function Anuncio({
  salio,
  tinte,
  onCerrar,
}: {
  salio: NonNullable<Reclamo>;
  tinte: string;
  onCerrar: () => void;
}) {
  const t = useT();

  if (salio.tipo === 'ingredientes') {
    /**
     * Varias clases distintas, cada una con su dibujo.
     *
     * Ya no se nombra lo que salió: con tres, cuatro o seis clases, una lista
     * de nombres es más larga que el cartel y se lee peor que los dibujos.
     * Los dibujos ya dicen qué es cada cosa, que es para lo que están.
     */
    const cosas = salio.cosas
      .map((x) => ({ arte: ingredientePorId(x.id)?.arte, cuantos: x.cuantos }))
      .filter((x): x is { arte: ImageSourcePropType; cuantos: number } => !!x.arte);
    if (!cosas.length) return null;

    return (
      <Conseguido
        // El primero es el respaldo por si la fila no se pudiera dibujar.
        arte={cosas[0].arte}
        varios={cosas}
        texto={t('avisos.ganaste')}
        tinte={tinte}
        aceptar={t('conseguido.aceptar')}
        onAceptar={onCerrar}
      />
    );
  }

  const receta = recetaPorId(salio.id);
  if (!receta) return null;

  return (
    <Conseguido
      arte={receta.arte}
      texto={t('avisos.ganaste')}
      // Con la cuenta, igual que los ingredientes: por video salen tres de la
      // misma preparación, y un cartel que diga solo el nombre haría pensar que
      // el video no dio nada.
      detalle={t('avisos.cuantas', {
        cuantos: salio.cuantos,
        cosa: t(claveDe(receta)),
      })}
      tinte={tinte}
      aceptar={t('conseguido.aceptar')}
      onAceptar={onCerrar}
    />
  );
}

const estilos = StyleSheet.create({
  /**
   * La hoja.
   *
   * Los siete escalones entran sin scroll a propósito: el camino es una
   * escalera y una escalera que hay que arrastrar para ver adónde llega no
   * cuenta lo que tiene para contar, que es cuánto falta para la poción.
   */
  hoja: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },

  rotulo: {
    color: colors.textFaint,
    fontSize: 10.5,
    letterSpacing: 2,
    marginBottom: 8,
  },

  /** Los escalones, del primer día al séptimo. */
  escalera: { gap: 3 },

  /**
   * Un día del camino.
   *
   * Fue una fila —dibujo, texto y botón en línea— mientras había una sola forma
   * de cobrarlo. Con dos ofertas al lado no entra: en un teléfono de 360 puntos
   * quedan poco más de trescientos de ancho útil, y dos columnas con su dibujo y
   * su ficha piden todo eso. Así que el día y qué da suben a un encabezado, y
   * las columnas van debajo con el ancho entero para las dos.
   *
   * Sin alto fijo: lo mide su contenido, y todos tienen el mismo contenido. El
   * alto clavado estaba para que un texto que envolvía no agrandara un escalón
   * más que los otros, y eso ahora lo resuelve el encabezado, que es de una sola
   * línea.
   */
  escalon: {
    gap: 3,
    padding: 5,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  /** Las dos ofertas, del mismo ancho. */
  columnas: { flexDirection: 'row', gap: 8 },
  /**
   * Una oferta: el dibujo y, al lado, la ficha con la que se paga.
   *
   * En fila y no apilados. Apilados, cada bloque medía más de cien de alto y la
   * escalera entera no entraba en una pantalla: siete días de dos pisos son
   * catorce cosas mirándose de arriba abajo. Al lado, el escalón mide la mitad y
   * el camino se ve de un vistazo, que es para lo que está.
   *
   * `flex: 1` en las dos, así que se reparten el ancho por la mitad.
   */
  oferta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radius.md,
  },
  /**
   * El día que todavía no llegó: se ve, no se toca.
   *
   * A 0,45 la pantalla entera se veía apagada —seis de los siete días están
   * siempre por venir— y parecía rota más que futura. Lo que tiene que quedar
   * claro es cuál se puede tocar, y para eso alcanza con que los otros pesen
   * menos, no con que casi no estén.
   */
  apagada: { opacity: 0.62 },


  /**
   * Cuántas cosas da, sobre el dibujo.
   *
   * En la esquina del disco y no al lado, igual que en las cajitas del bolso: es
   * el mismo objeto contado de la misma forma en las dos pantallas, y quien vio
   * una entiende la otra sin leer.
   */
  cuenta: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    minWidth: 22,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuentaTexto: {
    color: colors.sobreTinte,
    fontSize: 10,
    fontWeight: '700',
  },
  /** El cartel y su botón, juntos. */
  finalCaja: { gap: spacing.sm },
  /**
   * El aviso del final.
   *
   * Más alto que un escalón, y del papel de las demás tarjetas del juego con su
   * borde tenue. Tuvo relleno y borde marcados, del color de la vuelta, y con el
   * botón macizo debajo eran dos cosas gritando a la vez: el cartel cuenta lo
   * que pasó, el que tiene que llamar es el botón.
   */
  final: {
    // En fila, que es como estaba el escalón cuando este cartel se dibujó
    // encima suyo. Ahora el escalón apila encabezado y columnas, así que la
    // fila la tiene que pedir este.
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 92,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  /** El disco del icono, con un dorado apenas insinuado. */
  discoFinal: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: `${colors.dorado}1F`,
    borderColor: `${colors.dorado}66`,
  },
  felicitaciones: {
    color: colors.doradoTinta,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.2,
    // En versales, como los demás rótulos chicos de la app. Se hace acá y no
    // en el diccionario para que valga en los cuatro idiomas sin repetir el
    // texto, y porque en mayúsculas es una decisión de cómo se ve, no de qué
    // dice: la misma clave se usa en otros lados en caja normal.
    textTransform: "uppercase",
  },

  /**
   * El botón de empezar de nuevo.
   *
   * Oro sólido con la tinta oscura encima, no marfil: sobre un dorado medio el
   * texto claro se empasta, y la tinta marrón es la del resto de la app.
   *
   * Es lo único relleno de la hoja, y con eso alcanza para que se lea como lo
   * único que se toca. Estuvo del color de la vuelta y en 58 de alto, y a esa
   * altura y con ese contraste tapaba al cartel en vez de acompañarlo.
   */
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dorado,
  },
  /** La ficha de aceptar, del alto del renglón. */
  botonFicha: { width: 30, height: 30 },
  botonTexto: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /** Lo ya cobrado se apaga: está, pero ya no es lo que hay que mirar. */
  hecho: { opacity: 0.55 },
  apretado: { opacity: 0.75, transform: [{ scale: 0.99 }] },

  /**
   * El disco con el dibujo del premio.
   *
   * **Sin `overflow: hidden`**, que sí tenía: la cuenta va apoyada en la esquina
   * de abajo y tiene que asomar fuera del círculo. Recortada contra el borde se
   * veía media pastilla.
   */
  disco: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * El dibujo, con aire de sobra contra el disco.
   *
   * Los ingredientes no tienen la misma silueta: la manzana es redonda y llena
   * poco su cuadrado, pero la zanahoria va en diagonal y lo llena entero, así
   * que al mismo tamaño tocaba el borde del disco. La medida la manda el más
   * largo, no el promedio.
   */
  arte: { width: 22, height: 22 },

  dicho: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  dia: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 },
  premio: { color: colors.text, fontSize: 14, fontWeight: '600' },

  /** La ficha con la que se paga: el regalo o el video. */
  regalo: { width: 28, height: 28, flexShrink: 0 },

  /**
   * El tilde de los días ya cobrados.
   *
   * Centrado y solo: donde estaban las dos ofertas no queda nada que elegir, y
   * dos columnas apagadas al lado de una marca de hecho serían dos botones que
   * invitan a insistir con algo que ya pasó.
   */
  tilde: {
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tildeTexto: { color: colors.sobreTinte, fontSize: 13, fontWeight: '700' },

});
