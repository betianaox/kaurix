import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { porId, type Criatura } from '../art';
import { cardDe } from '../album/cards';
import { ACCIONES } from '../album/casillas';
import type { Premio } from '../album/sorteo';
import { Conseguido } from '../components/Conseguido';

import { useT } from '../i18n';
import { Receta as AyudaReceta } from '../inventario/Receta';
import { TRAMOS, listoParaAdulto, progreso } from '../juego/crianza';
import { colorDeNivel, ORDEN_DE_VUELTAS } from '../juego/datos';
import { multiplicadorDe } from '../juego/ruleta';
import { faltanDe, menuDe, pocionDe, type Pedido } from '../juego/menu';
import { claveDe, type Receta as TReceta } from '../juego/recetas';
import { useJuego } from '../juego/store';
import type { Rutas } from '../navegacion/rutas';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';

/**
 * La ficha de una criatura: acá se la cría.
 *
 * El bebé va animado —flotando— porque es la pantalla donde se lo mira; en la
 * colección va quieto, que son ocho animaciones a la vez y ahí sí molesta.
 *
 * **Los tres tramos se muestran completos desde el principio**, y todos cuentan
 * lo que ya tenés, no solo el que toca.
 *
 * Saber que el último va a pedir una pizza deja juntar harina mientras se hace
 * otra cosa; revelarlo recién al llegar obliga a empezar cada tramo con una
 * salida a buscar desde cero, y eso es lo que hace que criar se sienta a
 * trámite.
 */

type Props = NativeStackScreenProps<Rutas, 'Bicho'>;

export function BichoScreen({ route, navigation }: Props) {
  const juego = useJuego((e) => e.juego);
  const dar = useJuego((e) => e.dar);
  const volverAdulto = useJuego((e) => e.volverAdulto);

  /**
   * Lo que salió al hacerlo crecer, mientras se anuncia.
   *
   * `mostrando` es cuál de los dos carteles está en pantalla. Cuando la carta
   * cierra una hoja son **dos, uno detrás del otro**: primero la que salió y
   * después la dorada. Juntarlos en uno solo escondería el momento que importa
   * —completar una hoja pasa ocho veces en todo el juego— detrás de la carta
   * número sesenta y cuatro.
   */
  const [ganado, setGanado] = useState<{
    premio: NonNullable<Premio>;
    mostrando: 'carta' | 'dorada';
  } | null>(null);

  /** Hacer crecer y anunciar lo que salió. Los dos botones pasan por acá. */
  function crecer() {
    // La ficha se dibuja sin criatura mientras se resuelve la ruta; los botones
    // que llaman acá no existen todavía, pero el tipo no lo sabe.
    if (!criatura) return;
    const premio = volverAdulto(criatura.id);
    // Sin premio el álbum ya está completo: nada que anunciar, la criatura
    // creció igual.
    if (premio) setGanado({ premio, mostrando: 'carta' });
  }
  const t = useT();

  /**
   * Cuánto multiplica cada entrega ahora mismo. 1 si no está impulsado.
   *
   * Se recalcula cada segundo mientras el impulso dure, para que la marca
   * desaparezca sola al vencerse en vez de quedar mintiendo hasta que alguien
   * salga de la pantalla y vuelva.
   */
  const [, refrescar] = useState(0);
  const multiplicador = multiplicadorDe(juego.impulso, route.params.criatura);
  useEffect(() => {
    if (multiplicador <= 1) return;
    const id = setInterval(() => refrescar((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [multiplicador]);

  /**
   * El anuncio de que ya puede crecer, encima de todo.
   *
   * Se cierra y no vuelve hasta la próxima vez que se abra la ficha: es un
   * aviso, no una traba. Quien lo cierra porque quiere mirar los tramos otra
   * vez tiene el botón abajo de todo esperándolo.
   */
  const [anuncio, setAnuncio] = useState(true);
  const entrada = useRef(new Animated.Value(0)).current;

  const criatura = porId(route.params.criatura);
  const crianza = juego.crianza.find((c) => c.criatura === route.params.criatura);

  /**
   * El rebote del anuncio.
   *
   * Con resorte y no con un desvanecido, igual que el premio de la ruleta: lo
   * que aparece despacio no se siente como algo que pasó.
   */
  const listo = !!crianza && listoParaAdulto(crianza);
  useEffect(() => {
    if (!listo || !anuncio) return;
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [listo, anuncio, entrada]);

  const tinte = colorDeNivel(juego.nivel);

  /** La receta abierta encima, para ver qué le falta. */
  const [receta, setReceta] = useState<TReceta | null>(null);

  const preparadas = { ...juego.inventario.comidas, ...juego.inventario.pociones };

  const terminada = juego.completadas.includes(route.params.criatura);

  if (!criatura || (!crianza && !terminada)) {
    return (
      <Pantalla titulo={t('bicho.sinTitulo')} encima>
        <View style={estilos.centro}>
          <Text style={estilos.texto}>{t('bicho.yaNoEsta')}</Text>
          <Pressable onPress={() => navigation.navigate('Coleccion')} style={estilos.boton}>
            <Text style={estilos.texto}>{t('bicho.volver')}</Text>
          </Pressable>
        </View>
      </Pantalla>
    );
  }

  /**
   * La ficha de la que ya está criada.
   *
   * No es la misma pantalla con la barra llena: cuando no queda nada que darle,
   * los tres tramos, las recetas y el aviso de que la vas a perder no dicen
   * nada. Lo que queda por mirar es en qué se convirtió, y para eso están las
   * tres etapas juntas —huevo, bebé, crecido—, que es lo único que muestra el
   * camino completo de una sola mirada.
   */
  /**
   * El cartel de lo que salió al hacerlo crecer.
   *
   * Se arma acá y se dibuja en las **dos** fichas. Hacer crecer un bicho lo saca
   * de la crianza, así que en cuanto se toca el botón esta pantalla deja de ser
   * la ficha de crianza y pasa a ser la del crecido: si el cartel viviera solo
   * en la primera, se montaría y desaparecería en el mismo instante. Es
   * exactamente lo que pasaba —el premio no se veía nunca.
   */
  /**
   * Va adentro de un Modal y no suelto en la hoja.
   *
   * `Pantalla` dibuja el header arriba y mete los children en el cuerpo, así que
   * un absoluto acá adentro tapa la hoja pero **no el header**: quedaba el
   * nombre del bicho y la X de cerrar encima del premio, y con la X se podía
   * salir sin haberlo visto. El Modal se dibuja sobre la ventana entera.
   */
  const reparto = ganado ? (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Reparto ganado={ganado} onSeguir={setGanado} />
    </Modal>
  ) : null;

  if (!crianza) {
    return (
      <Pantalla titulo={t(`criaturas.${criatura.id}`).toUpperCase()} encima>
        <ScrollView contentContainerStyle={estilos.hoja}>
          {/* Acá el retrato va grande y no comparte estilo con la ficha de
              crianza: esta pantalla no tiene header fijo ni una lista larga que
              leer debajo, así que el bicho crecido puede ocupar lo que quiera.
              Es lo que se vino a mirar. */}
          <View style={[estilos.retratoGrande, { borderColor: `${tinte}55` }]}>
            <Image
              source={criatura.crecido}
              style={estilos.arteGrande}
              resizeMode="contain"
              fadeDuration={0}
            />
          </View>

          {/* La barra llena. Es la misma de la crianza y va en el mismo lugar:
              la ficha de la criada no es otra pantalla, es esta terminada, y
              sin la barra el camino que se recorrió no queda dibujado en
              ningún lado. */}
          <Barra tramo={TRAMOS} avance={0} tinte={tinte} />

          <Text style={estilos.dato}>{t('bicho.yaCriada')}</Text>

          <Etapas criatura={criatura} tinte={tinte} t={t} />
        </ScrollView>
        {reparto}
      </Pantalla>
    );
  }

  const pocion = pocionDe(criatura.id, juego.nivel);

  return (
    <Pantalla titulo={t(`criaturas.${criatura.id}`).toUpperCase()} encima>
      {/*
        EL BICHO Y SU BARRA NO SE VAN CON EL SCROLL.

        Debajo hay cuatro tramos de recetas y una lista larga, y dar de comer es
        ir y venir entre lo que falta y cuánto se avanzó. Con todo en el mismo
        scroll, entregar algo movía la barra donde no se estaba mirando: se veía
        desaparecer una comida del bolso y nada más.

        Por eso el retrato y la barra quedan fijos y solo scrollea lo de abajo.
        El bicho va bastante más chato que cuando ocupaba la hoja entera —si no,
        el header se come media pantalla y no queda lugar para lo que hay que
        leer.
      */}
      <View style={estilos.fijo}>
        <View style={[estilos.retrato, { borderColor: `${tinte}55` }]}>
          <Image source={criatura.bebe.arte} style={estilos.arte} resizeMode="contain" fadeDuration={0} />

          {/* La marca del impulso, sobre el bicho y no en un renglón aparte: lo
              que está multiplicado es él, y acá es donde se lo mira mientras se
              le da de comer. */}
          {multiplicador > 1 ? (
            <View style={[estilos.impulso, { backgroundColor: tinte }]}>
              <Text style={estilos.impulsoTexto}>{multiplicador}x</Text>
            </View>
          ) : null}
        </View>

        <Barra tramo={crianza.tramo} avance={crianza.avance} tinte={tinte} />

        {/* La lectura de la barra va con la barra: sola, la barra dice cuánto
            falta pero no de qué tramo. */}
        <Text style={estilos.dato}>
          {t('bicho.tramo', {
            actual: Math.min(crianza.tramo + 1, TRAMOS),
            total: TRAMOS,
            porcentaje: Math.round(progreso(crianza) * 100),
          })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={estilos.hoja}>
        {Array.from({ length: TRAMOS }, (_, i) => (
          <Tramo
            key={i}
            numero={i}
            actual={crianza.tramo}
            pedidos={menuDe(criatura.id, i, juego.nivel)}
            entregado={crianza.entregado}
            bolso={preparadas}
            tinte={tinte}
            onVer={setReceta}
            onDar={(r) => dar(criatura.id, r)}
          />
        ))}

        {pocion ? (
          <Tramo
            numero={TRAMOS}
            actual={crianza.tramo}
            pedidos={[pocion]}
            entregado={crianza.entregado}
            bolso={preparadas}
            tinte={tinte}
            onVer={setReceta}
            onDar={(r) => dar(criatura.id, r)}
            titulo={t('bicho.paraCrecer')}
            nota={t('bicho.notaPocion')}
          />
        ) : null}

        {/*
          El huevo del que salió.
          Es de las mejores piezas de arte del juego y durante la búsqueda se ve
          unos segundos y nunca más. Acá queda como recuerdo, en grande y
          en grande, que es como se puede mirar. **Volando**, como se lo
          encontró: es la pieza que se está recordando, no una foto de ella.
        */}
        {criatura.huevo ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.titulo}>{t('bicho.deDondeSalio')}</Text>
            <View style={estilos.huevoCaja}>
              <Image source={criatura.huevo.arte} style={estilos.huevo} resizeMode="contain" fadeDuration={0} />
            </View>
          </View>
        ) : null}

        {/* El botón que cierra la crianza: la criatura pasa a crecida, su carta
            entra al álbum y esta ficha se convierte en la de las tres etapas.

            Queda al pie, después de todo lo que hubo que hacer para llegar, y
            es el camino de quien cerró el anuncio. **El momento** lo da el
            anuncio de abajo, encima de la pantalla: acá, al final de un scroll
            largo, el paso más importante del juego pasaba desapercibido. */}
        {listo ? (
          <Pressable
            onPress={crecer}
            style={({ pressed }) => [
              estilos.boton,
              { backgroundColor: tinte },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
          >
            <Text style={estilos.botonFuerte}>{t('bicho.queCrezca')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <AyudaReceta
        receta={receta}
        ingredientes={juego.inventario.ingredientes}
        preparadas={preparadas}
        tinte={tinte}
        onVer={setReceta}
        onCerrar={() => setReceta(null)}
      />

      {/* Ya puede crecer.

          Es el final de todo el trabajo de criarla, así que se anuncia como se
          anuncia un premio en la ruleta: tapando la pantalla, con el bicho en
          grande sobre un resplandor y entrando de un rebote. Un botón al pie de
          un scroll largo no es un final, es un trámite.

          Se cierra a mano —tocando "ahora no" o el fondo— y no solo: la mitad
          de la gracia es quedarse mirando al bicho que criaste. */}
      <Modal
        visible={listo && anuncio}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAnuncio(false)}
      >
        <Pressable style={estilos.anuncio} onPress={() => setAnuncio(false)}>
          <Animated.View
            style={[
              estilos.anuncioCuerpo,
              {
                opacity: entrada,
                transform: [
                  { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
              },
            ]}
          >
            {/* El resplandor va adentro de la misma caja que el dibujo y no
                suelto sobre la pantalla: suelto queda centrado en la pantalla y
                no en el bicho, y se lee como un fondo en vez de como un halo.
                Es la misma pieza que usa el anuncio de la ruleta. */}
            <View style={estilos.retratoAnuncio}>
              <View style={[estilos.resplandor, { backgroundColor: `${tinte}33` }]} />
              <Image
                source={criatura.bebe.arte}
                style={estilos.bichoAnuncio}
                resizeMode="contain"
                fadeDuration={0}
              />
            </View>

            <Text style={[estilos.anuncioTexto, { color: tinte }]}>
              {t('bicho.yaPuedeCrecer', { nombre: t(`criaturas.${criatura.id}`) })}
            </Text>

            <Pressable
              onPress={() => {
                setAnuncio(false);
                crecer();
              }}
              style={({ pressed }) => [
                estilos.crecer,
                { backgroundColor: tinte },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
            >
              <Text style={estilos.crecerTexto}>{t('bicho.queCrezca')}</Text>
            </Pressable>

            <Pressable onPress={() => setAnuncio(false)} accessibilityRole="button">
              <Text style={estilos.ahoraNo}>{t('bicho.ahoraNo')}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Va al final de todo y fuera del Modal del anuncio: se muestra después
          de cerrarlo, y tiene que quedar por encima de la ficha entera. */}
      {reparto}
    </Pantalla>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Los carteles de lo que salió: la carta y, si cerró una hoja, la dorada.
 *
 * Van encadenados y no a la vez. Al cerrar la carta, si hay dorada, se cambia lo
 * que se muestra en lugar de cerrar: el segundo cartel entra con su propia
 * animación y se lee como una segunda cosa que pasó, no como una continuación
 * de la primera.
 */
function Reparto({
  ganado,
  onSeguir,
}: {
  ganado: { premio: NonNullable<Premio>; mostrando: 'carta' | 'dorada' };
  onSeguir: (siguiente: { premio: NonNullable<Premio>; mostrando: 'carta' | 'dorada' } | null) => void;
}) {
  const t = useT();
  const { premio, mostrando } = ganado;

  /** El número de serie de un bicho: su lugar en el orden de las vueltas. */
  const serieDe = (criatura: string) => ORDEN_DE_VUELTAS.indexOf(criatura) + 1;
  const nombreDe = (criatura: string) => t(`criaturas.${criatura}`);

  if (mostrando === 'dorada' && premio.dorada) {
    const bicho = premio.dorada;
    return (
      <Conseguido
        // La novena de la serie: el bicho crecido, en dorado.
        arte={cardDe(serieDe(bicho), 8)!}
        texto={t('album.ganasteLegendaria')}
        // El nombre en caja alta, igual que la acción en la carta común: las dos
        // líneas de abajo son rótulos de la carta, no frases.
        detalle={t('album.porCompletar', { bicho: nombreDe(bicho).toUpperCase() })}
        tinte={colorDeNivel(serieDe(bicho))}
        formato="carta"
        festejo
        aceptar={t('conseguido.aceptar')}
        onAceptar={() => onSeguir(null)}
      />
    );
  }

  const bicho = premio.carta.criatura;
  return (
    <Conseguido
      arte={cardDe(serieDe(bicho), ACCIONES.indexOf(premio.carta.accion as never))!}
      texto={t('album.cartaNueva')}
      detalle={t('album.deQuien', {
        bicho: nombreDe(bicho),
        // Solo la acción va en caja alta: el nombre del bicho se lee como
        // nombre, y la acción como el rótulo de la carta.
        accion: t(`acciones.${premio.carta.accion}`).toUpperCase(),
      })}
      tinte={colorDeNivel(serieDe(bicho))}
      formato="carta"
      aceptar={t('conseguido.aceptar')}
      // Si esta carta cerró una hoja, el cartel no se va: da lugar a la dorada.
      onAceptar={() => onSeguir(premio.dorada ? { premio, mostrando: 'dorada' } : null)}
    />
  );
}

/**
 * La barra de la crianza: tres tramos, no una barra lisa.
 *
 * Hay que ver cuántas preparaciones faltan, no un porcentaje abstracto. Tres
 * cajas dicen "te falta una"; una barra al 66% no dice nada de eso.
 *
 * A media tinta: el color de la vuelta a full es lo más saturado de la pantalla
 * y le ganaba a la criatura, que es lo que hay que mirar. Diluido sigue
 * diciendo cuánto llevás sin gritarlo. Lo mismo en la colección.
 *
 * `tramo` en `TRAMOS` la deja llena, que es como la muestra la ficha de la que
 * ya está criada.
 */
function Barra({ tramo, avance, tinte }: { tramo: number; avance: number; tinte: string }) {
  return (
    <View style={estilos.tramos}>
      {Array.from({ length: TRAMOS }, (_, i) => {
        const completo = i < tramo;
        const enCurso = i === tramo;
        return (
          <View key={i} style={estilos.tramo}>
            <View
              style={[
                estilos.tramoLleno,
                {
                  backgroundColor: `${tinte}80`,
                  width: completo ? '100%' : enCurso ? `${Math.round(avance * 100)}%` : '0%',
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

/**
 * Lo que pide un tramo.
 *
 * El que está en curso va destacado con un borde; los demás se ven normales y
 * cuentan igual lo que ya tenés.
 */
function Tramo({
  numero,
  actual,
  pedidos,
  entregado,
  bolso,
  tinte,
  onVer,
  onDar,
  titulo,
  nota,
}: {
  numero: number;
  actual: number;
  pedidos: Pedido[];
  /** Cuánto se le dio ya de cada cosa. Solo cuenta para el tramo en curso. */
  entregado: Record<string, number>;
  /** Cuánto hay guardado de cada preparación. */
  bolso: Record<string, number>;
  tinte: string;
  onVer: (r: TReceta) => void;
  onDar: (receta: string) => void;
  titulo?: string;
  nota?: string;
}) {
  const t = useT();
  const enCurso = numero === actual;
  const hecho = numero < actual;
  // Lo entregado es del tramo en curso: en los otros la cuenta arranca en cero.
  const dado = enCurso ? entregado : {};

  /**
   * Podés terminar este tramo ahora mismo con lo que hay en el bolso.
   *
   * Se mide contra el bolso y no contra lo entregado, y por eso sirve también
   * en los tramos que todavía no tocan: ahí dice que ya juntaste lo que van a
   * pedir. Es el premio de acumular, y esconderlo hasta que llegue el turno de
   * ese tramo sería no reconocer algo que la persona hizo a propósito.
   */
  const alcanza = pedidos.every((p) => (bolso[p.receta.id] ?? 0) >= faltanDe(p, dado));

  return (
    // El de ahora va destacado con un borde; los otros quedan normales, no
    // apagados. Apagarlos escondía algo que importa: lo que ya juntaste para más
    // adelante. Adelantarse es una forma de jugar, y el juego tiene que
    // reconocerla en el momento, no cuando le toca el turno a ese tramo.
    <View style={[estilos.tarjeta, enCurso && { borderWidth: 1, borderColor: `${tinte}88` }]}>
      <View style={estilos.encabezado}>
        <Text style={[estilos.titulo, enCurso && { color: tinte }]}>
          {titulo ?? `TRAMO ${numero + 1}`}
        </Text>
        {/*
          Dos estados, y las palabras importan.

          Un tramo futuro puede estar cubierto mientras al de ahora le falta:
          los pedidos son independientes, y para armar algo de nivel 2 hay que
          armar antes *una* de nivel 1, no necesariamente las que este bicho
          pide. Que se vea está bien —es el premio de acumular— pero decirle
          "tenés todo" a un tramo que todavía no toca se lee como "este ya
          está", y entonces no se entiende por qué no avanza. De ahí que sea
          "ya lo tienes" y no "listo".

          **El tramo en curso no dice nada.** Tenía un "puedes terminarlo" que
          no informaba: los botones de Dar debajo ya lo dicen, y uno por uno.
          Un cartel que repite lo que se ve un renglón más abajo se lee como
          otra cosa, y la persona se queda buscando qué es.
        */}
        {hecho ? (
          <Text style={estilos.listo}>{t('bicho.listo')}</Text>
        ) : alcanza && !enCurso ? (
          <Text style={[estilos.listo, { color: tinte }]}>{t('bicho.yaLoTenes')}</Text>
        ) : null}
      </View>

      {nota ? <Text style={estilos.texto}>{nota}</Text> : null}

      {pedidos.map((p) => {
        const guardadas = bolso[p.receta.id] ?? 0;
        const entregadas = dado[p.receta.id] ?? 0;
        const falta = faltanDe(p, dado);
        // Solo se puede dar en el tramo que toca, teniendo la preparación y
        // faltando alguna. Las tres cosas juntas.
        const puedeDar = enCurso && falta > 0 && guardadas > 0;

        return (
          <View key={p.receta.id} style={estilos.renglon}>
            <Pressable
              onPress={() => onVer(p.receta)}
              style={({ pressed }) => [estilos.ficha, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('bicho.entrega', {
        receta: t(claveDe(p.receta)),
        dadas: entregadas,
        piden: p.cantidad,
        guardadas,
      })}
            >
              <Image
                source={p.receta.arte}
                // Apagada mientras no tengas ninguna: la forma se ve, el color
                // se gana.
                style={[estilos.miniatura, !guardadas && !entregadas && estilos.sinTener]}
                resizeMode="contain"
                fadeDuration={0}
              />
              <View style={estilos.textos}>
                <Text style={estilos.renglonNombre} numberOfLines={1}>
                  {t(claveDe(p.receta))}
                </Text>
                {/* Dos números distintos y hacen falta los dos: lo que ya le
                    diste —que es lo que mueve la barra— y lo que te queda en el
                    bolso, que es lo que podés darle ahora. */}
                <Text style={estilos.renglonNota} numberOfLines={1}>
                  {guardadas ? t('bicho.tenes', { cantidad: guardadas }) : t('bicho.noTenes')} · {t('bicho.verReceta')}
                </Text>
              </View>
              <Text style={[estilos.cuenta, falta ? estilos.falta : { color: tinte }]}>
                {entregadas}/{p.cantidad}
              </Text>
            </Pressable>

            {puedeDar ? (
              <Pressable
                onPress={() => onDar(p.receta.id)}
                style={({ pressed }) => [
                  estilos.dar,
                  { backgroundColor: tinte },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('bicho.darA', { receta: t(claveDe(p.receta)) })}
              >
                <Text style={estilos.darTexto}>{t('bicho.dar')}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Las tres etapas, en fila: huevo, bebé, crecido.
 *
 * Van del mismo alto pero **de distinto tamaño**, creciendo hacia la derecha.
 * Puestas todas iguales se leen como tres retratos sueltos; creciendo, se leen
 * como una sola cosa que pasó. Es lo mismo que hace cualquier lámina de
 * metamorfosis, y por el mismo motivo.
 *
 * Las tres van quietas. El huevo y el bebé existen animados, pero dos
 * animaciones al lado de una imagen fija hacen que la fija se lea como rota, y
 * las tres moviéndose no dejan comparar nada.
 */
function Etapas({
  criatura,
  tinte,
  t,
}: {
  criatura: Criatura;
  tinte: string;
  /** El traductor de la pantalla, para no volver a pedirlo acá. */
  t: (clave: string, datos?: Record<string, string | number>) => string;
}) {
  const etapas = [
    // El huevo es opcional: una criatura sin arte de huevo muestra las otras dos
    // en vez de dejar un hueco.
    // El quieto y no el animado: acá el huevo es una etapa de un camino
    // terminado, y aleteando entre dos imágenes fijas se lleva toda la mirada.
    // En la ficha de la que se está criando sí vuela. Ver `huevoQuieto`.
    criatura.huevo
      ? {
          arte: criatura.huevoQuieto ?? criatura.huevo.arte,
          nombre: t('bicho.etapaHuevo'),
          parte: 0.86,
        }
      : null,
    { arte: criatura.quieto, nombre: t('bicho.etapaBebe'), parte: 0.92 },
    { arte: criatura.crecido, nombre: t('bicho.etapaCrecido'), parte: 1 },
  ].filter(Boolean) as { arte: ImageSourcePropType; nombre: string; parte: number }[];

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>{t('bicho.comoCrecio')}</Text>
      <View style={estilos.etapas}>
        {etapas.map((e, i) => (
          <View key={e.nombre} style={estilos.etapa}>
            <View style={estilos.etapaCaja}>
              <Image
                source={e.arte}
                style={{ width: `${e.parte * 100}%`, height: `${e.parte * 100}%` }}
                resizeMode="contain"
                fadeDuration={0}
              />
            </View>
            {/* La última va marcada con el color de la vuelta: es dónde terminó,
                y sin eso las tres se leen como tres momentos igual de válidos. */}
            <Text
              style={[estilos.etapaNombre, i === etapas.length - 1 && { color: tinte }]}
              numberOfLines={1}
            >
              {e.nombre}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  hoja: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  /**
   * El header que no scrollea: el bicho, la barra y su lectura.
   *
   * Lleva fondo propio y no transparente: sin él, la lista de tramos se ve pasar
   * por debajo del bicho al scrollear. Y la línea de abajo es lo que lo separa
   * de lo que sí se mueve — sin ella los dos bloques se leen como uno solo y el
   * corte parece un error.
   *
   * La línea va del crema oscuro de siempre y **no del color de la vuelta**: es
   * parte del papel, como cualquier otro filo del juego, no una decoración de
   * este bicho. Teñida cambiaba de color ocho veces y se leía como si quisiera
   * decir algo.
   */
  fijo: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  /**
   * La caja del bicho.
   *
   * Achatada —casi el doble de ancha que alta— porque va en un header fijo y
   * tiene que dejar sitio a los cuatro tramos de abajo. Cuando ocupaba la hoja
   * entera podía permitirse ser casi cuadrada.
   */
  retrato: {
    aspectRatio: 1.75,
    // El tope es lo que lo salva en pantallas anchas. Con solo la proporción,
    // en una tablet de 900 puntos el header medía más de quinientos de alto y
    // se comía la hoja entera. Va por ancho y no por alto para que la caja no
    // se deforme: el alto sale de la proporción.
    maxWidth: 332,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arte: { width: '76%', height: '88%' },

  /** El mismo marco, pero para una pantalla donde el bicho es el asunto. */
  retratoGrande: {
    aspectRatio: 1.05,
    // Casi cuadrado: sin tope, en una tablet el bicho ocupaba una pantalla
    // entera y había que scrollear para llegar a las etapas.
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arteGrande: { width: '86%', height: '86%' },

  tramos: { flexDirection: 'row', gap: 4 },
  tramo: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  tramoLleno: { height: 10 },

  dato: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },

  // Arriba a la derecha del retrato, donde no tapa la cara del bicho.
  impulso: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impulsoTexto: {
    color: colors.sobreTinte,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },

  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: colors.text, fontSize: 11, letterSpacing: 2 },
  listo: { color: colors.textFaint, fontSize: 11 },

  texto: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  renglon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  ficha: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dar: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  darTexto: { color: colors.sobreTinte, fontSize: 13, fontWeight: '700' },
  miniatura: { width: 42, height: 42 },
  sinTener: { opacity: 0.3 },
  textos: { flex: 1, gap: 1 },
  renglonNombre: { color: colors.text, fontSize: 14 },
  renglonNota: { color: colors.textFaint, fontSize: 11 },
  cuenta: { fontSize: 13, minWidth: 46, textAlign: 'right' },
  falta: { color: '#E0784A' },

  /** El anuncio de que ya puede crecer. Tapa la pantalla entera. */
  anuncio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.velo,
  },
  anuncioCuerpo: { alignItems: 'center', gap: spacing.lg },
  /** La caja del bicho: el halo y el dibujo, centrados uno sobre el otro. */
  retratoAnuncio: { alignItems: 'center', justifyContent: 'center' },
  /**
   * El halo, apenas más grande que el dibujo: la proporción es lo que importa.
   * Muy por encima deja de leerse como el brillo de la cosa y pasa a ser una
   * mancha de fondo.
   */
  resplandor: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  bichoAnuncio: { width: 180, height: 180 },
  anuncioTexto: { fontSize: 21, textAlign: 'center', lineHeight: 29, fontWeight: '600' },
  crecer: { paddingVertical: 13, paddingHorizontal: 44, borderRadius: 999 },
  crecerTexto: { color: colors.sobreTinte, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  /** La salida discreta: es un aviso, no una traba. */
  ahoraNo: { color: colors.textMuted, fontSize: 14 },

  etapas: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: 4 },
  etapa: { flex: 1, alignItems: 'center', gap: 6 },
  /** Alto igual para las tres: lo que cambia adentro es cuánto ocupa cada una. */
  etapaCaja: { height: 110, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  etapaNombre: { color: colors.textFaint, fontSize: 11, letterSpacing: 0.4 },

  /**
   * El huevo, deliberadamente más chico que el bicho.
   *
   * Con el header fijo los dos se ven a la vez, y del mismo tamaño competían: el
   * huevo es un recuerdo de dónde salió, no la otra mitad de la pantalla. A 118
   * contra los ~165 del bicho, la jerarquía se lee sola.
   *
   * Si cambia el alto del retrato, este número va detrás.
   */
  huevoCaja: { height: 118, alignItems: 'center', justifyContent: 'center' },
  huevo: { width: '100%', height: '100%' },

  boton: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  botonFuerte: { color: colors.sobreTinte, fontSize: 16, fontWeight: '700' },
});
