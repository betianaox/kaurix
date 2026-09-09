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

import { Conseguido } from '../components/Conseguido';
import { useT } from '../i18n';
import { COLOR_NIVEL, colorDeNivel } from '../juego/datos';
import { ingredientePorId } from '../juego/ingredientes';
import { claveDe, recetaPorId } from '../juego/recetas';
import {
  escalonDe,
  hayPremio,
  PASOS,
  premioDe,
  primerDiaDeLaVuelta,
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
  const sendero = useJuego((e) => e.juego.sendero);
  const nivel = useJuego((e) => e.juego.nivel);
  const reclamarDelDia = useJuego((e) => e.reclamarDelDia);
  const tinte = colorDeNivel(nivel);

  /** Lo que salió al reclamar, mientras se anuncia. */
  const [salio, setSalio] = useState<Reclamo>(null);

  const puede = hayPremio(sendero);
  /** En qué escalón está y con qué número arranca esta vuelta. */
  const escalon = escalonDe(sendero.dias);
  const desde = primerDiaDeLaVuelta(sendero.dias);

  return (
    <Pantalla titulo={t('avisos.titulo')} encima>
      <ScrollView contentContainerStyle={estilos.hoja}>
        <Text style={estilos.rotulo}>{t('avisos.camino')}</Text>

        {/* Del primer día al último, de arriba para abajo: se lee como se lee
            todo lo demás, y el escalón de hoy queda cerca de donde se empezó a
            mirar en vez de al final de una cuenta regresiva. */}
        <View style={estilos.escalera}>
          {Array.from({ length: PASOS }, (_, i) => i).map((i) => {
            // Los escalones de más abajo de donde está ya se cobraron en esta
            // vuelta. El de hoy solo cuenta como tal si de verdad hay premio.
            const dado = i < escalon;
            const hoy = i === escalon;

            return (
              <Escalon
                key={i}
                // El número no vuelve a empezar: la segunda vuelta va del 8 al
                // 14, la tercera del 15 al 21. La pirámide es siempre de siete,
                // pero los días que muestra son los que de verdad se llevan.
                numero={desde + i}
                premio={premioDe(i)}
                color={COLOR_NIVEL[i % COLOR_NIVEL.length]}
                dado={dado}
                hoy={hoy}
                puede={hoy && puede}
                onReclamar={() => {
                  const salida = reclamarDelDia();
                  if (salida) setSalio(salida);
                }}
              />
            );
          })}
        </View>

        {/* Cuando ya se reclamó se dice cuándo vuelve a haber algo: sin esto la
            pantalla queda igual que antes de tocar y parece que no pasó nada. */}
        {!puede ? <Text style={estilos.nota}>{t('avisos.vuelveManana')}</Text> : null}
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

/** El dibujo de lo que da un escalón, sea ingrediente o preparación. */
function arteDe(premio: Premio): ImageSourcePropType | null {
  const ingrediente = ingredientePorId(premio.muestra);
  if (ingrediente) return ingrediente.arte;
  return recetaPorId(premio.muestra)?.arte ?? null;
}

/**
 * Un día del camino.
 *
 * El dibujo manda: es lo que se mira. El número y el nombre lo acompañan, y el
 * botón solo existe el día que se puede tocar — el resto del tiempo el escalón
 * es información, no un botón apagado que invita a insistir.
 */
function Escalon({
  numero,
  premio,
  color,
  dado,
  hoy,
  puede,
  onReclamar,
}: {
  /** El día que se muestra: 1..7 la primera vuelta, 8..14 la segunda. */
  numero: number;
  premio: Premio;
  color: string;
  /** Ya se reclamó en esta vuelta. */
  dado: boolean;
  /** Es el escalón que toca. */
  hoy: boolean;
  /** Es el que toca **y** hay premio esperando. */
  puede: boolean;
  onReclamar: () => void;
}) {
  const t = useT();
  const arte = arteDe(premio);

  const nombre =
    premio.tipo === 'ingredientes'
      ? t('avisos.ingredientes', { cuantos: premio.cuantos })
      : premio.tipo === 'comida'
        ? t('avisos.comida')
        : t('avisos.pocion');

  return (
    <Pressable
      onPress={onReclamar}
      disabled={!puede}
      style={({ pressed }) => [
        estilos.escalon,
        { borderColor: `${color}66`, backgroundColor: `${color}14` },
        hoy && { borderColor: color, backgroundColor: `${color}26`, borderWidth: 2 },
        dado && estilos.hecho,
        pressed && puede && estilos.apretado,
      ]}
      accessibilityRole={puede ? 'button' : 'text'}
      accessibilityState={{ disabled: !puede }}
      accessibilityLabel={`${t('avisos.dia', { n: numero })}: ${nombre}`}
    >
      {/* El dibujo, sobre un disco del color del día. */}
      <View style={[estilos.disco, { backgroundColor: `${color}33`, borderColor: color }]}>
        {arte ? (
          <Image source={arte} style={estilos.arte} resizeMode="contain" fadeDuration={0} />
        ) : null}
      </View>

      <View style={estilos.dicho}>
        <Text style={[estilos.dia, { color }]}>{t('avisos.dia', { n: numero })}</Text>
        <Text style={estilos.premio} numberOfLines={1}>
          {nombre}
        </Text>
      </View>

      {puede ? (
        /*
         * Un regalo y no el check verde: el check dice "hecho", que es lo
         * contrario de lo que hay que decir acá, y encima era el mismo dibujo
         * que marca los días ya cobrados. Los dos estados se leían igual.
         */
        <Image source={REGALO} style={estilos.regalo} resizeMode="contain" fadeDuration={0} />
      ) : dado ? (
        <View style={[estilos.tilde, { backgroundColor: color }]}>
          <Text style={estilos.tildeTexto}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

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
    const ingrediente = ingredientePorId(salio.id);
    if (!ingrediente) return null;
    return (
      <Conseguido
        arte={ingrediente.arte}
        texto={t('avisos.ganaste')}
        // El nombre de lo que salió y cuántas, no "3 ingredientes": lo que se
        // ganó es frutilla, y eso es lo que hay que poder leer.
        detalle={t('avisos.cuantas', {
          cuantos: salio.cuantos,
          cosa: t(`ingredientes.${salio.id}`),
        })}
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
      detalle={t(claveDe(receta))}
      tinte={tinte}
      aceptar={t('conseguido.aceptar')}
      onAceptar={onCerrar}
    />
  );
}

const estilos = StyleSheet.create({
  hoja: { padding: spacing.md, paddingBottom: spacing.xl },

  rotulo: {
    color: colors.textFaint,
    fontSize: 10.5,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },

  /** Los escalones, del primer día al séptimo. */
  escalera: { gap: 8 },

  escalon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    // Todos del mismo alto. Sin esto, el más angosto —el primero— envolvía su
    // texto y crecía, y una pirámide con un escalón el doble de alto que los
    // otros deja de leerse como pirámide.
    height: 74,
  },
  /** Lo ya cobrado se apaga: está, pero ya no es lo que hay que mirar. */
  hecho: { opacity: 0.55 },
  apretado: { opacity: 0.75, transform: [{ scale: 0.99 }] },

  /** El disco con el dibujo del premio. */
  disco: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /**
   * El dibujo, con aire de sobra contra el disco.
   *
   * Los ingredientes no tienen la misma silueta: la manzana es redonda y llena
   * poco su cuadrado, pero la zanahoria va en diagonal y lo llena entero, así
   * que al mismo tamaño tocaba el borde del disco. La medida la manda el más
   * largo, no el promedio.
   */
  arte: { width: 34, height: 34 },

  dicho: { flex: 1, flexShrink: 1, gap: 1 },
  dia: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 },
  premio: { color: colors.text, fontSize: 15, fontWeight: '600' },

  /** La ficha del regalo. No la aprieta el texto de al lado. */
  regalo: { width: 42, height: 42, flexShrink: 0 },

  /** El tilde de los días ya cobrados. */

  tilde: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tildeTexto: { color: colors.sobreTinte, fontSize: 13, fontWeight: '700' },

  nota: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
