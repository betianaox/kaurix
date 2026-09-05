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
import { useT } from '../i18n';
import { Receta as AyudaReceta } from '../inventario/Receta';
import { GRACIA_HORAS, TRAMOS, horasHastaPerder, listoParaAdulto, progreso } from '../juego/crianza';
import { colorDeNivel, TUTORIAL } from '../juego/datos';
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
  if (!crianza) {
    return (
      <Pantalla titulo={t(`criaturas.${criatura.id}`).toUpperCase()} encima>
        <ScrollView contentContainerStyle={estilos.hoja}>
          <View style={[estilos.retrato, { borderColor: `${tinte}55` }]}>
            <Image
              source={criatura.crecido}
              style={estilos.arte}
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
      </Pantalla>
    );
  }

  const esTutorial = criatura.id === TUTORIAL;
  const faltan = horasHastaPerder(crianza);
  const pocion = pocionDe(criatura.id, juego.nivel);

  return (
    <Pantalla titulo={t(`criaturas.${criatura.id}`).toUpperCase()} encima>
      <ScrollView contentContainerStyle={estilos.hoja}>
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

        <Text style={estilos.dato}>
          {t('bicho.tramo', {
            actual: Math.min(crianza.tramo + 1, TRAMOS),
            total: TRAMOS,
            porcentaje: Math.round(progreso(crianza) * 100),
          })}
        </Text>

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

        <View style={estilos.tarjeta}>
          <Text style={estilos.titulo}>Atención</Text>
          {esTutorial ? (
            <Text style={estilos.texto}>
              Esta criatura nunca decae. Es con la que se aprende, y nadie tiene que aprender
              perdiendo.
            </Text>
          ) : faltan > 0 ? (
            <Text style={estilos.texto}>
              Está bien por {Math.ceil(faltan)} horas más. Después empieza a perder lo avanzado de
              este tramo — nunca los tramos que ya ganó.
            </Text>
          ) : (
            <Text style={[estilos.texto, { color: '#E0784A' }]}>
              Te está extrañando: lleva más de {GRACIA_HORAS} horas sin atención y está perdiendo
              avance.
            </Text>
          )}
        </View>

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
            onPress={() => volverAdulto(criatura.id)}
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
                volverAdulto(criatura.id);
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
    </Pantalla>
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
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  retrato: {
    aspectRatio: 1.2,
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arte: { width: '80%', height: '80%' },

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
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impulsoTexto: { color: colors.sobreTinte, fontSize: 13, fontWeight: '700' },

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

  huevoCaja: { height: 150, alignItems: 'center', justifyContent: 'center' },
  huevo: { width: '100%', height: '100%' },

  boton: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  botonFuerte: { color: colors.sobreTinte, fontSize: 16, fontWeight: '700' },
});
