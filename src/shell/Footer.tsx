import React from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { Canto } from './Canto';
import { armazon, colors, radius } from '../theme';

/**
 * La barra de abajo: una placa apoyada contra el borde inferior, con las
 * esquinas de afuera redondeadas, y **Buscar** como ficha redonda que sobresale
 * por arriba en el medio.
 *
 * Buscar no es un item más de una fila de items iguales. Es *la* acción del
 * juego y las otras cuatro son mirar lo que tenés, así que va grande, al centro
 * y bajo el pulgar.
 *
 * Los cinco son fichas dibujadas, no íconos de sistema. Antes eran Ionicons de
 * línea, y al lado de las criaturas —que son volumen y color— se leían como los
 * controles de otra app pegados abajo. Las fichas están dibujadas con el mismo
 * material que todo lo demás, y esa continuidad es lo que hace que la barra
 * pertenezca al juego.
 *
 * Van sin etiqueta. Son cuatro, dos de cada lado, y siempre los mismos: se
 * aprenden en dos usos y el texto solo hace ruido abajo de todo.
 */

export type Seccion = 'coleccion' | 'inventario' | 'cocina' | 'album';

type Props = {
  activa: Seccion | null;
  onSeccion: (s: Seccion) => void;
  onBuscar: () => void;
  /** El color de la vuelta en curso. Tiñe el relleno de la placa, nunca las fichas. */
  tinte: string;
};

const ALTO = 86;

/** Diámetro de la ficha de buscar. */
const BUSCAR = 90;

/** Diámetro de las otras cuatro. */
const FICHA = 52;

type Item = {
  seccion: Seccion;
  arte: ImageSourcePropType;
  /** Clave del diccionario. Solo para lectores de pantalla: en la barra no
   *  se dibuja texto. */
  clave: string;
};

/**
 * El inventario no lleva el matraz: adentro tiene tres pestañas —ingredientes,
 * comidas y pociones— y el matraz es el de las pociones. Si estuviera también
 * acá afuera, el ícono de la sección y el de una de sus pestañas serían el
 * mismo y no se entendería dónde estás parado.
 */
const IZQUIERDA: Item[] = [
  {
    seccion: 'coleccion',
    arte: require('../../assets/ui/coleccion.webp'),
    clave: 'secciones.coleccion',
  },
  {
    seccion: 'inventario',
    arte: require('../../assets/ui/inventario.webp'),
    clave: 'secciones.inventario',
  },
];

const DERECHA: Item[] = [
  { seccion: 'cocina', arte: require('../../assets/ui/cocina.webp'), clave: 'secciones.cocina' },
  { seccion: 'album', arte: require('../../assets/ui/album.webp'), clave: 'secciones.album' },
];

const BUSCAR_ARTE = require('../../assets/ui/buscar.webp');

export function Footer({ activa, onSeccion, onBuscar, tinte }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const item = (it: Item) => {
    const puesta = activa === it.seccion;
    return (
      <Pressable
        key={it.seccion}
        onPress={() => onSeccion(it.seccion)}
        hitSlop={8}
        style={({ pressed }) => [estilos.item, pressed && estilos.presionado]}
        accessibilityRole="button"
        accessibilityState={{ selected: puesta }}
        accessibilityLabel={t(it.clave)}
      >
        {/* Las cinco fichas van siempre a todo color. La abierta se marca con
            el halo del color de la vuelta y creciendo un poco: apagar las
            otras cuatro era marcarla dos veces, y dejaba la barra entera
            viéndose a media luz. */}
        {puesta ? <View style={[estilos.halo, { backgroundColor: `${tinte}33` }]} /> : null}
        <Image
          source={it.arte}
          style={[estilos.ficha, puesta && estilos.puesta]}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Pressable>
    );
  };

  return (
    <View style={[estilos.placa, { paddingBottom: insets.bottom, height: ALTO + insets.bottom }]}>
      <Canto lado="abajo" />

      <View style={estilos.fila}>
        <View style={estilos.grupo}>
          {item(IZQUIERDA[0])}
          {item(IZQUIERDA[1])}
        </View>

        {/* El hueco de la ficha de buscar, que va absoluta y sobresale. */}
        <View style={{ width: BUSCAR + 18 }} />

        <View style={estilos.grupo}>{DERECHA.map((d) => item(d))}</View>
      </View>

      <Pressable
        onPress={onBuscar}
        style={({ pressed }) => [estilos.buscar, pressed && { transform: [{ scale: 0.93 }] }]}
        accessibilityRole="button"
        accessibilityLabel={t('footer.buscar')}
      >
        <Image source={BUSCAR_ARTE} style={estilos.buscarArte} resizeMode="contain" fadeDuration={0} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  /**
   * La placa: un plano gris y nada más.
   *
   * Antes llevaba encima el color de la vuelta al 10% y un filo dorado. Con las
   * fichas puestas —que ya son color y volumen— esas dos capas competían con
   * ellas y ensuciaban el plano. El color de la vuelta sigue estando donde se
   * lee sin estorbar: el halo de la sección abierta.
   *
   * El grosor lo pone el canto, que se dibuja aparte.
   */
  placa: {
    backgroundColor: armazon.plano,
    // Las esquinas de afuera: las que dan al borde de la pantalla.
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },

  fila: {
    height: ALTO,
    flexDirection: 'row',
    alignItems: 'center',
    // Centrada, no repartida: las cuatro fichas y el hueco del botón de buscar
    // forman un solo bloque en el medio de la barra. Repartidas a lo ancho, con
    // fichas de este tamaño, quedaban dos en cada punta y la barra se leía como
    // cuatro cosas sueltas en vez de una fila.
    justifyContent: 'center',
  },
  /**
   * Las dos de cada lado van juntas y centradas en su mitad.
   *
   * Repartidas a lo ancho quedaban una en cada punta de la barra, tan separadas
   * que dejaban de leerse como un grupo de cuatro y parecían cuatro cosas
   * sueltas alrededor del botón de buscar.
   */
  grupo: { flexDirection: 'row' },

  item: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, height: ALTO },
  presionado: { opacity: 0.55 },

  ficha: { width: FICHA, height: FICHA },
  /** La abierta, apenas más grande. No hay estado apagado: las otras cuatro
   *  se ven exactamente igual de encendidas que esta. */
  puesta: { transform: [{ scale: 1.12 }] },
  halo: {
    position: 'absolute',
    width: FICHA + 10,
    height: FICHA + 10,
    borderRadius: (FICHA + 10) / 2,
  },

  buscar: {
    position: 'absolute',
    alignSelf: 'center',
    // Sobresale por arriba de la placa: es lo que la separa de las otras cuatro.
    // Cuanto más asoma, más se lee como el botón de la barra y no como uno más.
    top: -BUSCAR / 3.6,
    width: BUSCAR,
    height: BUSCAR,
    borderRadius: BUSCAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    /**
     * El disco del fondo de la app detrás de la ficha.
     *
     * La ficha sobresale por arriba de la placa y sin esto su borde de abajo se
     * apoya sobre la línea del armazón, que la corta. El disco la recorta del
     * fondo y la deja entera.
     */
    backgroundColor: colors.bg,
  },
  buscarArte: { width: BUSCAR, height: BUSCAR },
});
