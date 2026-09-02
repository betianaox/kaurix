import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, radius } from '../theme';

/**
 * Una cajita del inventario.
 *
 * Todo lo que se guarda se ve igual: un cuadrado con su marca, el nombre debajo
 * y cuántos tenés en la esquina. Ingredientes, comidas y pociones comparten la
 * misma caja para que las tres pestañas se lean como el mismo mueble con
 * cajones distintos.
 *
 * El color del marco y del fondo sale del lugar donde se encuentra la cosa, así
 * que el cajón se lee agrupado aunque el orden sea otro.
 */

type Props = {
  nombre: string;
  arte: ImageSourcePropType;
  color: string;
  /** Cuántos tenés. En cero, la caja se ve vacía. */
  cuantos: number;
  lado: number;
  /** Debajo del nombre, en chico. Para decir dónde aparece. */
  nota?: string;
  onPress?: () => void;
};

export function Caja({ nombre, arte, color, cuantos, lado, nota, onPress }: Props) {
  const vacia = cuantos <= 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [{ width: lado }, pressed && { opacity: 0.7 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={vacia ? `${nombre}, no tenés` : `${nombre}, ${cuantos}`}
    >
      <View
        style={[
          estilos.caja,
          { height: lado, borderColor: vacia ? colors.border : `${color}88` },
        ]}
      >
        <View style={[estilos.fondo, { backgroundColor: color, opacity: vacia ? 0.04 : 0.14 }]} />

        <Image
          source={arte}
          style={[
            { width: lado * 0.78, height: lado * 0.78 },
            // Lo que no tenés se ve como una silueta apagada: la forma alcanza
            // para reconocerlo, y el color es de lo que conseguiste.
            vacia && estilos.apagado,
          ]}
          resizeMode="contain"
          fadeDuration={0}
        />

        {!vacia ? (
          <View style={[estilos.cuenta, { backgroundColor: color }]}>
            <Text style={estilos.cuentaTexto}>{cuantos > 99 ? '99+' : cuantos}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[estilos.nombre, vacia && estilos.nombreVacio]} numberOfLines={1}>
        {nombre}
      </Text>
      {nota ? (
        <Text style={estilos.nota} numberOfLines={1}>
          {nota}
        </Text>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fondo: { ...StyleSheet.absoluteFill },
  apagado: { opacity: 0.28 },

  cuenta: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    minWidth: 20,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuentaTexto: { color: '#14110C', fontSize: 11, fontWeight: '700' },

  nombre: { color: colors.text, fontSize: 11.5, textAlign: 'center', marginTop: 4 },
  nombreVacio: { color: colors.textFaint },
  nota: { color: colors.textFaint, fontSize: 9.5, textAlign: 'center' },
});
