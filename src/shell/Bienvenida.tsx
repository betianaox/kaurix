import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { porId } from '../art';
import { useT } from '../i18n';
import { colorDeNivel, TUTORIAL } from '../juego/datos';
import { useJuego } from '../juego/store';
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
   * El color de la vuelta, que en el saludo es siempre el primero.
   *
   * Se lee del juego igual que en el resto de la app en vez de clavar el color
   * uno: si algún día el saludo se vuelve a ofrecer con la partida empezada
   * —hoy pasa con la herramienta de desarrollo—, se tiñe de la vuelta en la que
   * está y no de una que ya quedó atrás.
   */
  const tinte = colorDeNivel(useJuego((e) => e.juego.nivel));

  /**
   * La frase, partida donde va el dibujo.
   *
   * El texto trae un `{icono}` y acá se corta en dos para meter la imagen en el
   * medio. Anidada dentro del `<Text>`, fluye con el renglón como una palabra
   * más: al costado, en una fila aparte, se leía como un adorno del párrafo.
   *
   * ## El dibujo va pegado a la palabra que lo precede
   *
   * El espacio de antes se cambia por uno **duro**. Sin eso, el corte de línea
   * puede caer justo ahí y el dibujo arranca un renglón solo, con el punto
   * detrás: deja de leerse como una palabra de la frase y pasa a parecer una
   * viñeta. Pasaba en la tablet y no en el teléfono, porque la caja es más
   * ancha y la frase corta en otro lado.
   *
   * Se hace acá y no en el diccionario para que valga en los cuatro idiomas y
   * para que no se pierda al retocar una traducción: un espacio duro es
   * invisible y nadie lo repone si lo borra sin querer.
   */
  const [crudoAntes, despues] = t('bienvenida.texto').split('{icono}');
  const antes = crudoAntes.replace(/ $/, '\u00A0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      {/* La tarjeta va adentro de un scroll que la centra.

          Centrada a secas, en un teléfono bajo o con la letra del sistema en
          grande, lo que sobra se corta por arriba y por abajo: se pierden el
          bicho y los dos botones, que son la única salida. Con
          `justifyContent: center` en el contenido, mientras entra se ve igual
          que antes —centrada— y cuando no entra rueda en vez de recortarse.

          Es la primera pantalla de la app: si algo se va a romper en un
          teléfono raro, que no sea esta. */}
      <ScrollView
        style={estilos.fondo}
        contentContainerStyle={estilos.centrado}
        showsVerticalScrollIndicator={false}
      >
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
              onPress={onCerrar}
              style={({ pressed }) => [
                estilos.boton,
                { backgroundColor: tinte },
                pressed && estilos.apretado,
              ]}
              accessibilityRole="button"
            >
              <Text style={estilos.principalTexto}>{t('bienvenida.empezar')}</Text>
            </Pressable>

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
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.velo },
  /**
   * Centra la tarjeta mientras entra, y la deja rodar cuando no.
   *
   * `flexGrow` y no `flex`: con `flex: 1` el contenido queda clavado al alto
   * de la ventana y el scroll no tiene adónde ir, que es justamente el caso
   * que hay que resolver.
   */
  centrado: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
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
    /**
     * Alto de renglón: **lo que necesitan los piecitos**, no lo que necesita
     * la letra.
     *
     * El dibujo va metido en el párrafo y mide 31, así que el renglón tiene
     * que darle lugar o se nota el escalón entre líneas. Estuvo en 30 —casi el
     * doble del cuerpo— y con eso el párrafo se estiraba tanto que la tarjeta
     * llegaba al borde de la pantalla. 26 sigue conteniendo al dibujo y
     * devuelve un párrafo que se lee como un párrafo.
     */
    lineHeight: 26,
    fontWeight: '400',
  },

  /**
   * Uno debajo del otro, y Empezar arriba.
   *
   * Estuvieron en fila, con la ayuda a la izquierda y Empezar a la derecha
   * porque el pulgar cae más cómodo de ese lado. **No entraban.** En un teléfono
   * de 360 puntos, a la tarjeta le quedan 232 de ancho útil y los dos botones
   * con su separación piden 314: se desbordaban 82 y "Empezar" quedaba cortado
   * contra el borde. No era cuestión de apretarlos un poco, faltaba un tercio.
   *
   * En columna cada uno usa el ancho entero, así que no hay largo de texto ni
   * idioma que los pueda romper. Y arriba va el que la mayoría quiere tocar,
   * igual que en los carteles del juego: primero la acción, después la salida.
   */
  acciones: {
    alignSelf: 'stretch',
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
  /**
   * El botón de entrar, del color de la vuelta.
   *
   * Era marrón tinta, el color del texto. Se leía como un botón de sistema
   * pegado en una tarjeta del juego: el único negro de una pantalla que es toda
   * marfil, dragón y colores. El color de la vuelta es el que tiñe el resto de
   * la app, así que el saludo termina pareciéndose a lo que hay detrás.
   *
   * El texto va en marfil, que es el token de lo que se apoya encima de un
   * tinte: los ocho colores de vuelta son medios y saturados, y sobre ellos la
   * tinta oscura se empasta.
   */
  principalTexto: { color: colors.sobreTinte, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  secundario: { color: colors.textMuted, fontSize: 16, fontWeight: '500' },
  apretado: { opacity: 0.7 },
});
