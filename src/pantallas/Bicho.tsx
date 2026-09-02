import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { porId } from '../art';
import { useT } from '../i18n';
import { Receta as AyudaReceta } from '../inventario/Receta';
import { GRACIA_HORAS, TRAMOS, horasHastaPerder, listoParaAdulto, progreso } from '../juego/crianza';
import { colorDeNivel, TUTORIAL } from '../juego/datos';
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
  const t = useT();
  const criatura = porId(route.params.criatura);
  const crianza = juego.crianza.find((c) => c.criatura === route.params.criatura);
  const tinte = colorDeNivel(juego.nivel);

  /** La receta abierta encima, para ver qué le falta. */
  const [receta, setReceta] = useState<TReceta | null>(null);
  const preparadas = { ...juego.inventario.comidas, ...juego.inventario.pociones };

  if (!criatura || !crianza) {
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

  const esTutorial = criatura.id === TUTORIAL;
  const faltan = horasHastaPerder(crianza);
  const pocion = pocionDe(criatura.id, juego.nivel);

  return (
    <Pantalla titulo={t(`criaturas.${criatura.id}`).toUpperCase()} encima>
      <ScrollView contentContainerStyle={estilos.hoja}>
        <View style={[estilos.retrato, { borderColor: `${tinte}55` }]}>
          <Image source={criatura.bebe.arte} style={estilos.arte} resizeMode="contain" fadeDuration={0} />
        </View>

        {/* La barra por tramos, no una barra lisa: hay que ver cuántas
            preparaciones faltan, no un porcentaje abstracto. */}
        <View style={estilos.tramos}>
          {Array.from({ length: TRAMOS }, (_, i) => {
            const completo = i < crianza.tramo;
            const enCurso = i === crianza.tramo;
            return (
              <View key={i} style={estilos.tramo}>
                <View
                  style={[
                    estilos.tramoLleno,
                    {
                      backgroundColor: tinte,
                      width: completo ? '100%' : enCurso ? `${Math.round(crianza.avance * 100)}%` : '0%',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <Text style={estilos.dato}>
          Tramo {Math.min(crianza.tramo + 1, TRAMOS)} de {TRAMOS} ·{' '}
          {Math.round(progreso(crianza) * 100)}%
        </Text>

        {Array.from({ length: TRAMOS }, (_, i) => (
          <Tramo
            key={i}
            numero={i}
            actual={crianza.tramo}
            pedidos={menuDe(criatura.id, i, juego.nivel)}
            entregado={crianza.entregado}
            morral={preparadas}
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
            morral={preparadas}
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
          quieto, que es como se puede mirar.
        */}
        {criatura.huevo ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.titulo}>{t('bicho.deDondeSalio')}</Text>
            <View style={estilos.huevoCaja}>
              <Image source={criatura.huevo.arte} style={estilos.huevo} resizeMode="contain" fadeDuration={0} />
            </View>
          </View>
        ) : null}

        {listoParaAdulto(crianza) ? (
          <Pressable style={[estilos.boton, { backgroundColor: tinte }]}>
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
    </Pantalla>
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
  morral,
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
  morral: Record<string, number>;
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
   * Podés terminar este tramo ahora mismo con lo que hay en el morral.
   *
   * Se mide contra el morral y no contra lo entregado, y por eso sirve también
   * en los tramos que todavía no tocan: ahí dice que ya juntaste lo que van a
   * pedir. Es el premio de acumular, y esconderlo hasta que llegue el turno de
   * ese tramo sería no reconocer algo que la persona hizo a propósito.
   */
  const alcanza = pedidos.every((p) => (morral[p.receta.id] ?? 0) >= faltanDe(p, dado));

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
          Tres estados distintos, y las palabras importan.

          Un tramo futuro puede estar cubierto mientras al de ahora le falta:
          los pedidos son independientes, y para armar algo de nivel 2 hay que
          armar antes *una* de nivel 1, no necesariamente las que este bicho
          pide. Que se vea está bien —es el premio de acumular— pero decirle
          "tenés todo" a un tramo que todavía no toca se lee como "este ya
          está", y entonces no se entiende por qué no avanza.
        */}
        {hecho ? (
          <Text style={estilos.listo}>{t('bicho.listo')}</Text>
        ) : alcanza ? (
          <Text style={[estilos.listo, { color: tinte }]}>
            {enCurso ? t('bicho.podesTerminarlo') : t('bicho.yaLoTenes')}
          </Text>
        ) : null}
      </View>

      {nota ? <Text style={estilos.texto}>{nota}</Text> : null}

      {pedidos.map((p) => {
        const guardadas = morral[p.receta.id] ?? 0;
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
                    morral, que es lo que podés darle ahora. */}
                <Text style={estilos.renglonNota} numberOfLines={1}>
                  {guardadas ? `tenés ${guardadas}` : 'no tenés'} · ver receta
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
  darTexto: { color: '#14110C', fontSize: 13, fontWeight: '700' },
  miniatura: { width: 42, height: 42 },
  sinTener: { opacity: 0.3 },
  textos: { flex: 1, gap: 1 },
  renglonNombre: { color: colors.text, fontSize: 14 },
  renglonNota: { color: colors.textFaint, fontSize: 11 },
  cuenta: { fontSize: 13, minWidth: 46, textAlign: 'right' },
  falta: { color: '#E0784A' },

  huevoCaja: { height: 150, alignItems: 'center', justifyContent: 'center' },
  huevo: { width: '100%', height: '100%' },

  boton: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  botonFuerte: { color: '#14110C', fontSize: 16, fontWeight: '700' },
});
