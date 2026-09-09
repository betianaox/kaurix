import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { porId } from '../art';
import { useT } from '../i18n';
import { TUTORIAL } from '../juego/datos';
import { colors, radius, spacing } from '../theme';

/**
 * El logo del juego.
 *
 * El archivo es **blanco**, dibujado para fondo oscuro, y esta tarjeta es de
 * papel claro: sin teñir no se ve nada. Se pinta con `tintColor` en vez de
 * guardar una segunda copia oscura, que sería el mismo dibujo dos veces y una
 * de las dos quedaría sin actualizar el día que cambie.
 */
const LOGO = require('../../assets/logo.png');

/**
 * El mismo dibujo que el botón del header.
 *
 * El saludo dice dónde está la ayuda; mostrando su icono se la presenta en vez
 * de contarla, y después se reconoce arriba a la derecha sin tener que buscarla.
 * Si en cambio llevara un icono cualquiera, cerrar el saludo dejaría al jugador
 * sin saber adónde volver.
 */
const AYUDA = require('../../assets/ui/ayuda.webp');

/**
 * Los piecitos: el botón con el que se sale a buscar.
 *
 * Va al lado de la frase que dice qué se hace con la cámara, por lo mismo que el
 * icono de ayuda va en su botón: el saludo presenta las dos cosas que hay que
 * saber —dónde se busca y dónde se pregunta— mostrando sus dibujos, así que
 * después se reconocen sin leer.
 */
const BUSCAR = require('../../assets/ui/buscar.webp');

/**
 * EL SALUDO DE LA PRIMERA VEZ, Y ES CHICO A PROPÓSITO.
 *
 * No es un tutorial ni una pantalla: es un diálogo encima de la colección, para
 * que la primera impresión siga siendo el juego y no un manual. Quien acaba de
 * instalar quiere ver de qué se trata, no leer instrucciones sobre algo que
 * todavía no vio.
 *
 * Dice DOS cosas y ninguna más:
 *
 * 1. De qué va el juego, en una frase: hay bichos escondidos en el mundo real.
 * 2. Dónde está la ayuda, que es lo único que hace falta saber para arrancar.
 *
 * **Lo que no hace es explicar las reglas.** Que los ingredientes salgan de lo
 * que apuntás, los cuatro tramos de crianza, las hojas del álbum: todo eso está
 * en Ayuda, con su título y su espacio. Una cosa es que esté; otra es recibir a
 * alguien con el reglamento en la puerta.
 *
 * Las dos salidas lo dan por visto: la que entra a la ayuda y la que empieza a
 * jugar. El flag se escribe al CERRARLO y no al abrirlo, así que si la app se
 * muere mientras está en pantalla, la próxima vez se vuelve a ofrecer en lugar
 * de perderse.
 *
 * ## Y tiene que parecerse al juego
 *
 * Lleva al dragón turquesa, que es la cara de Kaurix y la primera criatura que
 * a cualquiera le toca buscar. Un diálogo de sistema con dos botones sería
 * correcto en cualquier app y equivocado en esta: lo primero que se ve tiene que
 * ser un bicho, no una tarjeta gris.
 */

export function Bienvenida({
  visible,
  onAyuda,
  onCerrar,
}: {
  visible: boolean;
  onAyuda: () => void;
  onCerrar: () => void;
}) {
  const t = useT();
  const criatura = porId(TUTORIAL);

  /**
   * La frase, partida donde va el dibujo.
   *
   * El texto trae un `{icono}` y acá se corta en dos para meter la imagen en el
   * medio. Anidada dentro del `<Text>`, fluye con el renglón como una palabra
   * más: al costado, en una fila aparte, se leía como un adorno del párrafo.
   */
  const [antes, despues] = t('bienvenida.texto').split('{icono}');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          {/* El bebé del tutorial, en grande y sin marco: se asoma, no se
              explica. Es el mismo que va a aparecer primero cuando salga a
              buscar, así que cuando lo encuentre ya lo va a haber visto. */}
          {criatura ? (
            <Image
              source={criatura.bebe.arte}
              style={estilos.bicho}
              resizeMode="contain"
              fadeDuration={0}
            />
          ) : null}

          {/* El logo y no el nombre escrito: es la marca del juego, y la
              persona acaba de tocarlo en el lanzador. */}
          <Image
            source={LOGO}
            style={estilos.logo}
            resizeMode="contain"
            fadeDuration={0}
            accessibilityLabel={t('bienvenida.titulo')}
          />
          <Text style={estilos.texto}>
            {antes}
            <Image source={BUSCAR} style={estilos.iconoBuscar} resizeMode="contain" />
            {despues}
          </Text>

          <View style={estilos.acciones}>
            <Pressable
              onPress={onAyuda}
              style={({ pressed }) => [estilos.boton, pressed && estilos.apretado]}
              accessibilityRole="button"
            >
              <Image
                source={AYUDA}
                style={estilos.iconoAyuda}
                resizeMode="contain"
                fadeDuration={0}
              />
              <Text style={estilos.secundario}>{t('bienvenida.ayuda')}</Text>
            </Pressable>

            <Pressable
              onPress={onCerrar}
              style={({ pressed }) => [
                estilos.boton,
                estilos.principal,
                pressed && estilos.apretado,
              ]}
              accessibilityRole="button"
            >
              <Text style={estilos.principalTexto}>{t('bienvenida.empezar')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.velo,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  bicho: { width: 132, height: 132 },
  /** La proporción sale del archivo: 1793 × 518. */
  logo: {
    width: 150,
    height: Math.round((150 * 518) / 1793),
    tintColor: colors.text,
  },
  /**
   * El texto, liviano.
   *
   * Es lo primero que se lee de la app y no tiene que pesar: un párrafo en gris
   * suave y sin negrita se lee de un saque, y lo que queda mirándose es el
   * bicho. Con más cuerpo competía con el logo.
   */
  /**
   * Los piecitos, metidos en el renglón.
   *
   * **Más grandes que la letra y con el renglón más alto para que entren.** Del
   * tamaño exacto del texto se leía como un manchón y no como el botón; y sin
   * subirle el interlineado al párrafo, un dibujo más alto que la línea la
   * empuja y se nota el escalón entre renglones.
   *
   * El `translateY` es lo que lo apoya en la línea: Android alinea las imágenes
   * de un texto por abajo del todo, así que sin corregirlo el dibujo queda
   * colgado por encima de las letras.
   */
  iconoBuscar: { width: 31, height: 31, transform: [{ translateY: 9 }] },
  texto: {
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 14.5,
    lineHeight: 30,
    fontWeight: '400',
  },

  /**
   * Empezar a la derecha y la ayuda a la izquierda.
   *
   * El pulgar cae más cómodo a la derecha y ahí va lo que la mayoría quiere
   * hacer: entrar. La ayuda queda a mano para quien la busca, sin ponerse
   * delante de quien no.
   */
  acciones: {
    flexDirection: 'row',
    // Del mismo alto los dos: uno lleva icono y el otro no, y sin esto el de la
    // ayuda quedaba más alto y los dos parecían puestos a distinta altura.
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // El alto lo fija el botón y no su contenido, así los dos miden igual
    // aunque uno tenga dibujo y el otro solo texto.
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  /** Del tamaño en que se ve arriba a la derecha, para que sea el mismo objeto. */
  iconoAyuda: { width: 30, height: 30 },
  principal: { backgroundColor: colors.text },
  principalTexto: { color: colors.surface, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  secundario: { color: colors.textMuted, fontSize: 16, fontWeight: '500' },
  apretado: { opacity: 0.7 },
});
