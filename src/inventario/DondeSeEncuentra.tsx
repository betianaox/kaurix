import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { LUGARES, type Ingrediente } from '../juego/ingredientes';
import { RECETAS, claveDe, type Receta } from '../juego/recetas';
import { colors, radius, spacing } from '../theme';
import { Cerrar } from '../shell/Cerrar';

/**
 * Dónde se consigue un ingrediente, y para qué sirve.
 *
 * Es la contraparte de la ayuda de una receta: aquella se lee de arriba hacia
 * abajo —qué necesito para esto— y esta al revés —esto que tengo, ¿para qué
 * me sirve y dónde consigo más—. Entre las dos se puede recorrer el sistema de
 * combinación en los dos sentidos sin salir del bolso.
 *
 * Lo que importa que se lea primero es **dónde buscarlo**, porque es lo único
 * accionable: el resto es información, eso es una instrucción.
 */

type Props = {
  ingrediente: Ingrediente | null;
  cuantos: number;
  tinte: string;
  onCerrar: () => void;
};

/** Qué se puede armar con esto. Se calcula al abrir, no antes: son 52 recetas. */
const usadoEn = (id: string): Receta[] => RECETAS.filter((r) => r.lleva.includes(id));

/**
 * Dónde apuntar la cámara, dicho como se lo diría una persona.
 *
 * Los nombres de los lugares sirven para agrupar en una grilla, pero no para
 * decirle a alguien qué hacer: "piedras" no es una instrucción, "apunta a
 * piedras, tierra o una pared" sí.
 *
 * Acá viven las claves y no los textos: la frase de cada lugar cambia con el
 * idioma y vive en el diccionario, como todo lo demás que se lee.
 */
const COMO_BUSCARLO: Record<string, string> = {
  planta: 'pistas.planta',
  flor: 'pistas.flor',
  tierra: 'pistas.tierra',
  piedra: 'pistas.piedra',
  fruta: 'pistas.fruta',
  verdura: 'pistas.verdura',
  despensa: 'pistas.despensa',
  proteina: 'pistas.proteina',
};

export function DondeSeEncuentra({ ingrediente, cuantos, tinte, onCerrar }: Props) {
  const t = useT();
  if (!ingrediente) return null;

  const lugar = LUGARES[ingrediente.lugar];
  const recetas = usadoEn(ingrediente.id);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={estilos.fondo} onPress={onCerrar}>
        <Pressable style={estilos.tarjeta} onPress={() => {}}>
          {/* La X pegada arriba a la derecha, como en cualquier caja. */}
          <Pressable onPress={onCerrar} hitSlop={14} style={estilos.cerrar}>
            <Cerrar />
          </Pressable>

          <View style={estilos.encabezado}>
            <Image
              source={ingrediente.arte}
              style={estilos.retrato}
              resizeMode="contain"
              fadeDuration={0}
            />
            <View style={estilos.titulos}>
              <Text style={estilos.nombre}>{t(`ingredientes.${ingrediente.id}`)}</Text>
              <Text style={[estilos.bajada, { color: lugar.color }]}>{t(`lugares.${ingrediente.lugar}`)}</Text>
              <Text style={[estilos.bajada, cuantos ? { color: tinte } : null]}>
                {cuantos ? t('ingrediente.tenes', { cantidad: cuantos }) : t('ingrediente.noTenesNinguno')}
              </Text>
            </View>
          </View>

          <View style={estilos.separador} />

          <Text style={estilos.titulo}>{t('ingrediente.dondeSeEncuentra')}</Text>
          <Text style={estilos.instruccion}>{t(COMO_BUSCARLO[ingrediente.lugar])}</Text>
          <Text style={estilos.pendiente}>
            Por ahora aparece en cualquier lado: la cámara todavía no distingue qué está
            mirando.
          </Text>

          <View style={estilos.separador} />

          <Text style={estilos.titulo}>{t('ingrediente.paraQueSirve')}</Text>
          {recetas.length ? (
            <Text style={estilos.sirve}>
              {recetas.map((r) => r.nombre).join(' · ')}
            </Text>
          ) : (
            <Text style={estilos.sirve}>Todavía no lo pide ninguna receta.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },

  cerrar: { position: 'absolute', top: 6, right: 6, padding: 2, zIndex: 1 },

  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: 30 },
  retrato: { width: 62, height: 62 },
  titulos: { flex: 1, gap: 1 },
  nombre: { color: colors.text, fontSize: 17, letterSpacing: 0.3 },
  bajada: { color: colors.textFaint, fontSize: 11.5 },

  separador: { height: 1, backgroundColor: colors.border },

  titulo: { color: colors.textFaint, fontSize: 10.5, letterSpacing: 2 },
  instruccion: { color: colors.text, fontSize: 14, lineHeight: 20 },
  sirve: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  pendiente: { color: colors.textFaint, fontSize: 11, fontStyle: 'italic' },
});
