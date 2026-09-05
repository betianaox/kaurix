import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import {
  claveDe,
  costoTotal,
  faltantesDe,
  sePuede,
  type Falta,
  type Receta as TReceta,
} from '../juego/recetas';
import { colors, radius, spacing } from '../theme';
import { Cerrar } from '../shell/Cerrar';

/**
 * La ayuda de una receta, encima de todo.
 *
 * Va en vertical y no en fila, como la lámina. En la lámina la cuenta entra
 * porque es apaisada y enorme; en un teléfono, cuatro cosas al hilo con sus
 * carteles se salen de cuadro apenas la receta tiene una base. Así que el
 * resultado sube al encabezado, al lado del nombre —que es donde ya estabas
 * mirando— y lo que lleva se lista abajo.
 *
 * De cada renglón se lee de un tirón qué es, dónde conseguirlo y cuántos tenés.
 * Lo que falta va marcado; lo que ya tenés queda en segundo plano, porque lo
 * único que importa saber es **cuál te está frenando**.
 *
 * En las de nivel 2 y 3 el primer renglón es otra preparación, y se puede tocar
 * para abrir su propia receta: así se baja la escalera hasta llegar a algo que
 * se arma con lo que hay en el bolso.
 */

type Props = {
  receta: TReceta | null;
  ingredientes: Record<string, number>;
  /** Cuántas tenés de cada preparación, de las dos clases. */
  preparadas: Record<string, number>;
  tinte: string;
  /** Abre la receta de la base, para bajar un escalón. */
  onVer: (r: TReceta) => void;
  onCerrar: () => void;
};

export function Receta({ receta, ingredientes, preparadas, tinte, onVer, onCerrar }: Props) {
  // El hook va antes del corte por `receta` nula: los hooks no pueden quedar
  // detrás de un return, o React pierde la cuenta entre un dibujado y el otro.
  const t = useT();
  if (!receta) return null;

  const partes = faltantesDe(receta, ingredientes, preparadas);
  const lista = sePuede(receta, ingredientes, preparadas);
  const tenes = preparadas[receta.id] ?? 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={estilos.fondo} onPress={onCerrar}>
        {/* El toque no atraviesa la tarjeta: solo se cierra tocando afuera. */}
        <Pressable style={estilos.tarjeta} onPress={() => {}}>
          {/* La X va pegada arriba a la derecha, como en cualquier caja, y no
              alineada con el título: ahí es donde el pulgar la busca. */}
          <Pressable onPress={onCerrar} hitSlop={14} style={estilos.cerrar}>
            <Cerrar />
          </Pressable>

          <View style={estilos.encabezado}>
            <Image source={receta.arte} style={estilos.retrato} resizeMode="contain" fadeDuration={0} />

            <View style={estilos.titulos}>
              <Text style={estilos.nombre} numberOfLines={2}>
                {t(claveDe(receta))}
              </Text>
              <Text style={estilos.bajada}>
                {t('receta.nivelYCosto', { nivel: receta.nivel, costo: costoTotal(receta) })}
              </Text>
              <Text style={[estilos.bajada, tenes ? { color: tinte } : null]}>
                {tenes ? t('receta.tenes', { cantidad: tenes }) : t('receta.noTenesNinguna')}
              </Text>
            </View>
          </View>

          <View style={estilos.separador} />

          {/* Un encabezado y una lista, sin los `+` entre medio: puestos en
              vertical no se leen como una suma, quedan como símbolos sueltos.
              La suma se entiende porque la palabra ya lo dice. */}
          <Text style={estilos.lleva}>{t('receta.lleva')}</Text>

          <ScrollView style={estilos.lista} contentContainerStyle={{ gap: 2 }}>
            {partes.map((p) => (
              <Renglon key={llave(p)} parte={p} tinte={tinte} onVer={onVer} />
            ))}
          </ScrollView>

          <Text style={[estilos.estado, lista && { color: tinte }]}>
            {lista ? t('receta.tenesTodo') : t('receta.teFaltaAlgo')}
          </Text>

          <Text style={estilos.pendiente}>{t('receta.pendiente')}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const llave = (p: Falta) => (p.tipo === 'base' ? p.receta.id : p.ingrediente.id);

function Renglon({
  parte,
  tinte,
  onVer,
}: {
  parte: Falta;
  tinte: string;
  onVer: (r: TReceta) => void;
}) {
  const t = useT();
  const esBase = parte.tipo === 'base';
  /** Cubierto: tiene al menos lo que pide, no "tiene alguno". */
  const cubre = parte.tenes >= parte.pide;
  const nombre =
    parte.tipo === 'base' ? t(claveDe(parte.receta)) : t(`ingredientes.${parte.ingrediente.id}`);
  const donde =
    parte.tipo === 'base'
      ? t('receta.seArma', { nivel: parte.receta.nivel })
      : t(`lugares.${parte.ingrediente.lugar}`).toLowerCase();

  return (
    <Pressable
      style={({ pressed }) => [estilos.renglon, pressed && esBase && { opacity: 0.6 }]}
      disabled={!esBase}
      onPress={() => parte.tipo === 'base' && onVer(parte.receta)}
      accessibilityRole={esBase ? 'button' : undefined}
      accessibilityLabel={t('receta.renglon', { nombre, tenes: parte.tenes, pide: parte.pide })}
    >
      <Image
        source={parte.tipo === 'base' ? parte.receta.arte : parte.ingrediente.arte}
        // Apagada solo cuando no tenés ninguno. Tener 1 de 2 no es lo mismo que
        // no tener nada, y apagar las dos por igual borra justo esa diferencia.
        style={[estilos.miniatura, !parte.tenes && estilos.apagado]}
        resizeMode="contain"
        fadeDuration={0}
      />

      <View style={estilos.textos}>
        <Text style={estilos.renglonNombre} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={estilos.renglonDonde} numberOfLines={1}>
          {donde}
          {/* La base se puede abrir; se avisa, porque nada más en la tarjeta se
              toca. */}
          {esBase ? '  ·  ' + t('receta.verReceta') : ''}
        </Text>
      </View>

      {/* Los dos números, siempre: cuánto tenés sobre cuánto pide. Un `×2` solo
          no dice si es lo que hace falta o lo que te sobra. */}
      <Text style={[estilos.tenes, cubre ? { color: tinte } : estilos.falta]}>
        {parte.tenes}/{parte.pide}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.veloTenue,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },

  cerrar: { position: 'absolute', top: 6, right: 6, padding: 2, zIndex: 1 },

  // Deja lugar a la derecha para que el título no pase por debajo de la X.
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: 30 },
  retrato: { width: 62, height: 62 },
  titulos: { flex: 1, gap: 1 },
  nombre: { color: colors.text, fontSize: 17, letterSpacing: 0.3 },
  bajada: { color: colors.textFaint, fontSize: 11.5 },

  separador: { height: 1, backgroundColor: colors.border },

  lista: { flexGrow: 0 },
  lleva: { color: colors.textFaint, fontSize: 10.5, letterSpacing: 2 },

  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
  },
  miniatura: { width: 40, height: 40 },
  apagado: { opacity: 0.3 },
  textos: { flex: 1, gap: 1 },
  renglonNombre: { color: colors.text, fontSize: 14 },
  renglonDonde: { color: colors.textFaint, fontSize: 11 },
  tenes: { fontSize: 13, minWidth: 42, textAlign: 'right' },
  falta: { color: '#E0784A' },

  estado: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },


  pendiente: { color: colors.textFaint, fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});
